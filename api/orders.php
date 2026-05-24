<?php
require_once 'db.php';
header("Content-Type: application/json; charset=UTF-8");

function updateCustomerTier($pdo, $customerId) {
    $pdo->exec("
        UPDATE customers 
        SET total_spent = COALESCE((
            SELECT SUM(total_amount) FROM orders 
            WHERE customer_id = $customerId 
            AND status != 'cancelled' 
            AND payment_status = 'paid'
        ), 0)
        WHERE id = $customerId
    ");
    
    $stmt = $pdo->prepare("SELECT total_spent FROM customers WHERE id = ?");
    $stmt->execute([$customerId]);
    $totalSpent = (float) $stmt->fetchColumn();
    
    $stmt = $pdo->query("SELECT setting_value FROM settings WHERE setting_key = 'crm_tiers'");
    $tiersJson = $stmt->fetchColumn();
    $tierName = 'New';
    
    if ($tiersJson) {
        $tiers = json_decode($tiersJson, true);
        if (is_array($tiers)) {
            usort($tiers, function($a, $b) { return $b['min_spend'] <=> $a['min_spend']; });
            foreach ($tiers as $t) {
                if ($totalSpent >= (float)$t['min_spend']) {
                    $tierName = $t['name'];
                    break;
                }
            }
        }
    } else {
        $settings = $pdo->query("SELECT setting_key, setting_value FROM settings")->fetchAll(PDO::FETCH_KEY_PAIR);
        $tierLoyal = (int)($settings['tier_loyal'] ?? 5000000);
        $tierVip = (int)($settings['tier_vip'] ?? 20000000);
        if ($totalSpent >= $tierVip) $tierName = 'VIP';
        elseif ($totalSpent >= $tierLoyal) $tierName = 'Loyal';
    }
    
    $stmt = $pdo->prepare("UPDATE customers SET customer_tier = ? WHERE id = ?");
    $stmt->execute([$tierName, $customerId]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['action']) && $_GET['action'] === 'get_items') {
        try {
            $stmt = $pdo->prepare("
                SELECT oi.*, p.name as product_name, p.image as product_image, b.batch_code, b.current_qty, b.current_ml, b.selling_price, p.ml_per_unit 
                FROM order_items oi 
                JOIN batches b ON oi.batch_id = b.id 
                JOIN products p ON b.product_id = p.id 
                WHERE oi.order_id = ?
            ");
            $stmt->execute([$_GET['order_id']]);
            echo json_encode($stmt->fetchAll());
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        exit();
    }

    try {
        $query = "
            SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
            COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN oi.sell_type = 'chai' AND b.selling_price > oi.price_per_unit THEN (b.selling_price - oi.price_per_unit) * oi.quantity
                        WHEN oi.sell_type = 'ml' AND p.ml_per_unit > 0 AND (b.selling_price / p.ml_per_unit) > oi.price_per_unit THEN ((b.selling_price / p.ml_per_unit) - oi.price_per_unit) * oi.quantity
                        ELSE 0
                    END
                )
                FROM order_items oi
                JOIN batches b ON oi.batch_id = b.id
                JOIN products p ON b.product_id = p.id
                WHERE oi.order_id = o.id
            ), 0) as total_discount
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
        ";
        $params = [];
        if (!empty($_GET['customer_id'])) {
            $query .= " WHERE o.customer_id = ?";
            $params[] = $_GET['customer_id'];
        }
        $query .= " ORDER BY o.created_at DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!empty($data['id'])) {
        try {
            $pdo->beginTransaction();
            
            // Lấy thông tin đơn hàng hiện tại
            $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
            $stmt->execute([$data['id']]);
            $order = $stmt->fetch();
            
            if (!$order) throw new Exception("Không tìm thấy đơn hàng");
            
            if (isset($data['action']) && $data['action'] === 'update_info') {
                $notes = [];
                if ($order['customer_id']) {
                    $pdo->prepare("UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?")
                        ->execute([$data['customer_name'] ?? '', $data['customer_phone'] ?? '', $data['customer_address'] ?? '', $order['customer_id']]);
                }
                
                $shippingFee = $data['shipping_fee'] ?? $order['shipping_fee'];
                $totalAmount = $data['total_amount'] ?? $order['total_amount'];
                $shipping_customer_pay = $data['shipping_customer_pay'] ?? $order['shipping_customer_pay'] ?? 1;
                $finalAmount = $data['final_amount'] ?? ($totalAmount + ($shipping_customer_pay ? $shippingFee : 0));

                if (isset($data['cart'])) {
                    // Cập nhật chi tiết đơn hàng
                    
                    // 1. Phục hồi tồn kho của đơn hàng cũ (nếu đơn chưa hủy)
                    if ($order['status'] !== 'cancelled') {
                        $oldItems = $pdo->prepare("SELECT oi.*, p.ml_per_unit FROM order_items oi JOIN batches b ON oi.batch_id = b.id JOIN products p ON b.product_id = p.id WHERE oi.order_id = ?");
                        $oldItems->execute([$data['id']]);
                        
                        $stmtUpdateBatch = $pdo->prepare("UPDATE batches SET current_qty = ?, current_ml = ? WHERE id = ?");
                        $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (batch_id, action_type, qty_change, ml_change, reason) VALUES (?, 'ADJUST', ?, ?, ?)");
                        
                        foreach ($oldItems->fetchAll() as $item) {
                            $stmtBatch = $pdo->prepare("SELECT current_qty, current_ml FROM batches WHERE id = ? FOR UPDATE");
                            $stmtBatch->execute([$item['batch_id']]);
                            $batch = $stmtBatch->fetch();
                            if (!$batch) continue;
                            
                            $newQty = $batch['current_qty'];
                            $newMl = $batch['current_ml'];
                            
                            if ($item['sell_type'] === 'ml' && $item['ml_per_unit'] > 0) {
                                $newMl += $item['quantity'];
                                $newQty = floor($newMl / $item['ml_per_unit']);
                                $stmtUpdateBatch->execute([$newQty, $newMl, $item['batch_id']]);
                                $stmtLog->execute([$item['batch_id'], 0, $item['quantity'], "Sửa đơn hàng #{$data['id']} (Hoàn trả cũ)"]);
                            } else {
                                $newQty += $item['quantity'];
                                $mlDeduct = 0;
                                if ($item['ml_per_unit'] > 0) {
                                    $mlDeduct = $item['quantity'] * $item['ml_per_unit'];
                                    $newMl += $mlDeduct;
                                }
                                $stmtUpdateBatch->execute([$newQty, $newMl, $item['batch_id']]);
                                $stmtLog->execute([$item['batch_id'], $item['quantity'], $mlDeduct, "Sửa đơn hàng #{$data['id']} (Hoàn trả cũ)"]);
                            }
                        }
                    }
                    
                    // 2. Xóa items cũ
                    $pdo->prepare("DELETE FROM order_items WHERE order_id = ?")->execute([$data['id']]);
                    
                    // 3. Trừ tồn kho mới (nếu đơn không phải trạng thái cancelled)
                    $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, batch_id, sell_type, quantity, price_per_unit, subtotal, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    $stmtUpdateBatch = $pdo->prepare("UPDATE batches SET current_qty = ?, current_ml = ? WHERE id = ?");
                    
                    foreach ($data['cart'] as $item) {
                        $stmtBatch = $pdo->prepare("SELECT b.current_qty, b.current_ml, b.import_price, b.selling_price, b.batch_code, p.name as product_name, p.ml_per_unit FROM batches b JOIN products p ON b.product_id = p.id WHERE b.id = ? FOR UPDATE");
                        $stmtBatch->execute([$item['batch_id']]);
                        $batch = $stmtBatch->fetch();
                        
                        if (!$batch) throw new Exception("Không tìm thấy lô hàng ID " . $item['batch_id']);

                        $costPerUnit = $batch['import_price'];
                        $newQty = $batch['current_qty'];
                        $newMl = $batch['current_ml'];

                        if ($order['status'] !== 'cancelled') {
                            if ($item['sell_type'] === 'ml' && $batch['ml_per_unit'] > 0) {
                                $costPerUnit = $batch['import_price'] / $batch['ml_per_unit'];
                                
                                if ($newMl < $item['quantity']) throw new Exception("Lô hàng ID " . $item['batch_id'] . " không đủ dung tích chiết (ml).");
                                $newMl -= $item['quantity'];
                                $newQty = floor($newMl / $batch['ml_per_unit']);
                            } else {
                                if ($newQty < $item['quantity']) throw new Exception("Lô hàng ID " . $item['batch_id'] . " không đủ số chai nguyên.");
                                $newQty -= $item['quantity'];
                                
                                if ($batch['ml_per_unit'] > 0) {
                                    $mlDeduct = $item['quantity'] * $batch['ml_per_unit'];
                                    if ($newMl < $mlDeduct) throw new Exception("Lô hàng ID " . $item['batch_id'] . " bị bất đồng bộ dung tích (không đủ ml tương ứng).");
                                    $newMl -= $mlDeduct;
                                }
                            }
                            
                            $stmtUpdateBatch->execute([$newQty, $newMl, $item['batch_id']]);
                            
                            $logQtyChange = ($item['sell_type'] === 'chai') ? -$item['quantity'] : 0;
                            $logMlChange = ($item['sell_type'] === 'ml') ? -$item['quantity'] : (isset($mlDeduct) ? -$mlDeduct : 0);
                            $pdo->prepare("INSERT INTO inventory_logs (batch_id, action_type, qty_change, ml_change, reason) VALUES (?, 'SALE', ?, ?, ?)")
                                ->execute([$item['batch_id'], $logQtyChange, $logMlChange, "Sửa đơn hàng #{$data['id']} (Trừ kho mới)"]);
                        }

                        $subtotal = $item['price'] * $item['quantity'];
                        $stmtItem->execute([
                            $data['id'], $item['batch_id'], $item['sell_type'], $item['quantity'], $item['price'], $subtotal, $costPerUnit
                        ]);

                        // Tính chênh lệch giá bán niêm yết
                        if (isset($batch['selling_price']) && (float)$batch['selling_price'] > 0) {
                            $targetPrice = 0;
                            if ($item['sell_type'] === 'chai') {
                                $targetPrice = (float)$batch['selling_price'];
                            } elseif ($item['sell_type'] === 'ml' && (float)$batch['ml_per_unit'] > 0) {
                                $targetPrice = (float)$batch['selling_price'] / (float)$batch['ml_per_unit'];
                            }
                            
                            if ($targetPrice > 0) {
                                $soldPrice = (float)$item['price'];
                                $diff = $soldPrice - $targetPrice;
                                if (abs($diff) > 0.01) {
                                    $diffTotal = abs($diff) * (float)$item['quantity'];
                                    $formattedDiff = number_format($diffTotal, 0, ',', '.') . "đ";
                                    $prodInfo = $batch['product_name'] . " (Lô " . $batch['batch_code'] . ")";
                                    if ($diff < 0) {
                                        $notes[] = "Đã bán " . $prodInfo . " thấp hơn giá niêm yết " . $formattedDiff;
                                    } else {
                                        $notes[] = "Đã bán " . $prodInfo . " cao hơn giá niêm yết " . $formattedDiff;
                                    }
                                }
                            }
                        }
                    }
                }

                $pdo->prepare("UPDATE orders SET total_amount = ?, shipping_fee = ?, shipping_customer_pay = ?, final_amount = ? WHERE id = ?")
                    ->execute([$totalAmount, $shippingFee, $shipping_customer_pay, $finalAmount, $data['id']]);

                // Recalculate customer tier if paid
                if ($order['customer_id']) {
                    updateCustomerTier($pdo, $order['customer_id']);

                    // Cập nhật ghi chú của khách hàng nếu có sai lệch giá
                    if (!empty($notes)) {
                        $stmtCust = $pdo->prepare("SELECT note FROM customers WHERE id = ?");
                        $stmtCust->execute([$order['customer_id']]);
                        $currentNote = $stmtCust->fetchColumn() ?: '';
                        
                        $systemNotes = implode("\n", $notes);
                        $newNote = empty($currentNote) ? $systemNotes : $currentNote . "\n" . $systemNotes;
                        
                        $pdo->prepare("UPDATE customers SET note = ? WHERE id = ?")
                            ->execute([$newNote, $order['customer_id']]);
                    }
                }

                $pdo->commit();
                echo json_encode(["message" => "Cập nhật thông tin thành công"]);
                exit();
            }
            
            // Cập nhật trạng thái
            $pdo->prepare("UPDATE orders SET status = ?, payment_status = ? WHERE id = ?")
                ->execute([$data['status'], $data['payment_status'], $data['id']]);
                
            // NẾU HỦY ĐƠN VÀ TRẠNG THÁI CŨ KHÁC HỦY -> HOÀN KHO
            if ($data['status'] === 'cancelled' && $order['status'] !== 'cancelled') {
                $items = $pdo->prepare("SELECT oi.*, p.ml_per_unit FROM order_items oi JOIN batches b ON oi.batch_id = b.id JOIN products p ON b.product_id = p.id WHERE oi.order_id = ?");
                $items->execute([$data['id']]);
                
                $stmtUpdateBatch = $pdo->prepare("UPDATE batches SET current_qty = ?, current_ml = ? WHERE id = ?");
                $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (batch_id, action_type, qty_change, ml_change, reason) VALUES (?, 'CANCEL_ORDER', ?, ?, ?)");
                
                foreach ($items->fetchAll() as $item) {
                    $stmtBatch = $pdo->prepare("SELECT current_qty, current_ml FROM batches WHERE id = ? FOR UPDATE");
                    $stmtBatch->execute([$item['batch_id']]);
                    $batch = $stmtBatch->fetch();
                    if (!$batch) continue;
                    
                    $newQty = $batch['current_qty'];
                    $newMl = $batch['current_ml'];
                    
                    if ($item['sell_type'] === 'ml' && $item['ml_per_unit'] > 0) {
                        $newMl += $item['quantity'];
                        $newQty = floor($newMl / $item['ml_per_unit']);
                        $stmtUpdateBatch->execute([$newQty, $newMl, $item['batch_id']]);
                        $stmtLog->execute([$item['batch_id'], 0, $item['quantity'], "Hủy đơn hàng #{$data['id']}"]);
                    } else {
                        $newQty += $item['quantity'];
                        $mlDeduct = 0;
                        if ($item['ml_per_unit'] > 0) {
                            $mlDeduct = $item['quantity'] * $item['ml_per_unit'];
                            $newMl += $mlDeduct;
                        }
                        $stmtUpdateBatch->execute([$newQty, $newMl, $item['batch_id']]);
                        $stmtLog->execute([$item['batch_id'], $item['quantity'], $mlDeduct, "Hủy đơn hàng #{$data['id']}"]);
                    }
                }
            } else if ($order['status'] === 'cancelled' && $data['status'] !== 'cancelled') {
                // PHỤC HỒI TỪ ĐƠN HỦY -> TRỪ LẠI KHO
                $items = $pdo->prepare("SELECT oi.*, p.ml_per_unit FROM order_items oi JOIN batches b ON oi.batch_id = b.id JOIN products p ON b.product_id = p.id WHERE oi.order_id = ?");
                $items->execute([$data['id']]);
                
                $stmtUpdateBatch = $pdo->prepare("UPDATE batches SET current_qty = ?, current_ml = ? WHERE id = ?");
                $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (batch_id, action_type, qty_change, ml_change, reason) VALUES (?, 'ADJUST', ?, ?, ?)");
                
                foreach ($items->fetchAll() as $item) {
                    $stmtBatch = $pdo->prepare("SELECT current_qty, current_ml FROM batches WHERE id = ? FOR UPDATE");
                    $stmtBatch->execute([$item['batch_id']]);
                    $batch = $stmtBatch->fetch();
                    if (!$batch) throw new Exception("Không tìm thấy lô hàng ID " . $item['batch_id'] . " để phục hồi");
                    
                    $newQty = $batch['current_qty'];
                    $newMl = $batch['current_ml'];
                    
                    if ($item['sell_type'] === 'ml' && $item['ml_per_unit'] > 0) {
                        if ($newMl < $item['quantity']) throw new Exception("Không đủ tồn kho (ml) để phục hồi đơn hàng này.");
                        $newMl -= $item['quantity'];
                        $newQty = floor($newMl / $item['ml_per_unit']);
                        $stmtUpdateBatch->execute([$newQty, $newMl, $item['batch_id']]);
                        $stmtLog->execute([$item['batch_id'], 0, -$item['quantity'], "Phục hồi đơn hàng #{$data['id']}"]);
                    } else {
                        if ($newQty < $item['quantity']) throw new Exception("Không đủ tồn kho (chai) để phục hồi đơn hàng này.");
                        $newQty -= $item['quantity'];
                        $mlDeduct = 0;
                        if ($item['ml_per_unit'] > 0) {
                            $mlDeduct = $item['quantity'] * $item['ml_per_unit'];
                            if ($newMl < $mlDeduct) throw new Exception("Không đủ tồn kho (ml chiết) để phục hồi đơn hàng này.");
                            $newMl -= $mlDeduct;
                        }
                        $stmtUpdateBatch->execute([$newQty, $newMl, $item['batch_id']]);
                        $stmtLog->execute([$item['batch_id'], -$item['quantity'], -$mlDeduct, "Phục hồi đơn hàng #{$data['id']}"]);
                    }
                }
            }
            
            // Luôn tính lại tổng chi tiêu của Khách hàng sau khi có thay đổi trạng thái
            if ($order['customer_id']) {
                updateCustomerTier($pdo, $order['customer_id']);
            }

            $pdo->commit();
            echo json_encode(["message" => "Cập nhật trạng thái thành công"]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!$data || empty($data['cart'])) {
        http_response_code(400);
        echo json_encode(["error" => "Giỏ hàng trống"]);
        exit();
    }

    try {
        $pdo->beginTransaction();
        $notes = [];
        
        // Xử lý khách hàng
        $customerId = null;
        if (!empty($data['customer_name'])) {
            $stmt = $pdo->prepare("SELECT id FROM customers WHERE phone = ?");
            $stmt->execute([$data['customer_phone']]);
            $customer = $stmt->fetch();
            if ($customer) {
                $customerId = $customer['id'];
                if (!empty($data['customer_address']) || !empty($data['customer_note'])) {
                    $pdo->prepare("UPDATE customers SET address = ?, note = ? WHERE id = ?")
                        ->execute([$data['customer_address'] ?? '', $data['customer_note'] ?? '', $customerId]);
                }
            } else {
                $stmt = $pdo->prepare("INSERT INTO customers (name, phone, address, note) VALUES (?, ?, ?, ?)");
                $stmt->execute([$data['customer_name'], $data['customer_phone'], $data['customer_address'] ?? '', $data['customer_note'] ?? '']);
                $customerId = $pdo->lastInsertId();
            }
        }
        
        // Tạo Đơn hàng
        $status = $data['status'] ?? 'pending';
        $paymentStatus = $data['payment_status'] ?? 'paid';
        $shippingFee = $data['shipping_fee'] ?? 0;
        $shipping_customer_pay = $data['shipping_customer_pay'] ?? 1;
        $finalAmount = $data['final_amount'] ?? ($data['total_amount'] + ($shipping_customer_pay ? $shippingFee : 0));
        
        $stmt = $pdo->prepare("INSERT INTO orders (customer_id, total_amount, shipping_fee, shipping_customer_pay, final_amount, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$customerId, $data['total_amount'], $shippingFee, $shipping_customer_pay, $finalAmount, $status, $paymentStatus]);
        $orderId = $pdo->lastInsertId();
        
        $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, batch_id, sell_type, quantity, price_per_unit, subtotal, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        $stmtUpdateBatch = $pdo->prepare("UPDATE batches SET current_qty = ?, current_ml = ? WHERE id = ?");
        
        foreach ($data['cart'] as $item) {
            $stmtBatch = $pdo->prepare("SELECT b.current_qty, b.current_ml, b.import_price, b.selling_price, b.batch_code, p.name as product_name, p.ml_per_unit FROM batches b JOIN products p ON b.product_id = p.id WHERE b.id = ? FOR UPDATE");
            $stmtBatch->execute([$item['batch_id']]);
            $batch = $stmtBatch->fetch();
            
            if (!$batch) throw new Exception("Không tìm thấy lô hàng ID " . $item['batch_id']);

            $costPerUnit = $batch['import_price'];
            $newQty = $batch['current_qty'];
            $newMl = $batch['current_ml'];

            if ($item['sell_type'] === 'ml' && $batch['ml_per_unit'] > 0) {
                $costPerUnit = $batch['import_price'] / $batch['ml_per_unit'];
                
                if ($newMl < $item['quantity']) throw new Exception("Lô hàng ID " . $item['batch_id'] . " không đủ dung tích chiết (ml).");
                $newMl -= $item['quantity'];
                $newQty = floor($newMl / $batch['ml_per_unit']);
            } else {
                if ($newQty < $item['quantity']) throw new Exception("Lô hàng ID " . $item['batch_id'] . " không đủ số chai nguyên.");
                $newQty -= $item['quantity'];
                
                if ($batch['ml_per_unit'] > 0) {
                    $mlDeduct = $item['quantity'] * $batch['ml_per_unit'];
                    if ($newMl < $mlDeduct) throw new Exception("Lô hàng ID " . $item['batch_id'] . " bị bất đồng bộ dung tích (không đủ ml tương ứng).");
                    $newMl -= $mlDeduct;
                }
            }
            
            $stmtUpdateBatch->execute([$newQty, $newMl, $item['batch_id']]);
            
            $subtotal = $item['price'] * $item['quantity'];
            $stmtItem->execute([
                $orderId, $item['batch_id'], $item['sell_type'], $item['quantity'], $item['price'], $subtotal, $costPerUnit
            ]);
            
            $logQtyChange = ($item['sell_type'] === 'chai') ? -$item['quantity'] : 0;
            $logMlChange = ($item['sell_type'] === 'ml') ? -$item['quantity'] : (isset($mlDeduct) ? -$mlDeduct : 0);
            $pdo->prepare("INSERT INTO inventory_logs (batch_id, action_type, qty_change, ml_change, reason) VALUES (?, 'SALE', ?, ?, ?)")
                ->execute([$item['batch_id'], $logQtyChange, $logMlChange, "Bán hàng Đơn #{$orderId}"]);

            // Tính chênh lệch giá bán niêm yết
            if (isset($batch['selling_price']) && (float)$batch['selling_price'] > 0) {
                $targetPrice = 0;
                if ($item['sell_type'] === 'chai') {
                    $targetPrice = (float)$batch['selling_price'];
                } elseif ($item['sell_type'] === 'ml' && (float)$batch['ml_per_unit'] > 0) {
                    $targetPrice = (float)$batch['selling_price'] / (float)$batch['ml_per_unit'];
                }
                
                if ($targetPrice > 0) {
                    $soldPrice = (float)$item['price'];
                    $diff = $soldPrice - $targetPrice;
                    if (abs($diff) > 0.01) {
                        $diffTotal = abs($diff) * (float)$item['quantity'];
                        $formattedDiff = number_format($diffTotal, 0, ',', '.') . "đ";
                        $prodInfo = $batch['product_name'] . " (Lô " . $batch['batch_code'] . ")";
                        if ($diff < 0) {
                            $notes[] = "Đã bán " . $prodInfo . " thấp hơn giá niêm yết " . $formattedDiff;
                        } else {
                            $notes[] = "Đã bán " . $prodInfo . " cao hơn giá niêm yết " . $formattedDiff;
                        }
                    }
                }
            }
        }
        
        // Cập nhật hạng thành viên CRM tự động (Recalculate)
        if ($customerId) {
            updateCustomerTier($pdo, $customerId);

            // Cập nhật ghi chú của khách hàng nếu có sai lệch giá
            if (!empty($notes)) {
                $stmtCust = $pdo->prepare("SELECT note FROM customers WHERE id = ?");
                $stmtCust->execute([$customerId]);
                $currentNote = $stmtCust->fetchColumn() ?: '';
                
                $systemNotes = implode("\n", $notes);
                $newNote = empty($currentNote) ? $systemNotes : $currentNote . "\n" . $systemNotes;
                
                $pdo->prepare("UPDATE customers SET note = ? WHERE id = ?")
                    ->execute([$newNote, $customerId]);
            }
        }
        
        $pdo->commit();
        echo json_encode(["message" => "Thanh toán thành công", "order_id" => $orderId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
