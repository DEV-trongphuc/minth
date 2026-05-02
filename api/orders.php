<?php
require_once 'db.php';
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("
            SELECT o.*, c.name as customer_name, c.phone as customer_phone
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC
        ");
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
            
            // Cập nhật trạng thái
            $pdo->prepare("UPDATE orders SET status = ?, payment_status = ? WHERE id = ?")
                ->execute([$data['status'], $data['payment_status'], $data['id']]);
                
            // NẾU HỦY ĐƠN VÀ TRẠNG THÁI CŨ KHÁC HỦY -> HOÀN KHO VÀ TRỪ TIỀN KHÁCH
            if ($data['status'] === 'cancelled' && $order['status'] !== 'cancelled') {
                // 1. Hoàn Kho
                $items = $pdo->prepare("
                    SELECT oi.*, p.ml_per_unit 
                    FROM order_items oi
                    JOIN batches b ON oi.batch_id = b.id
                    JOIN products p ON b.product_id = p.id
                    WHERE oi.order_id = ?
                ");
                $items->execute([$data['id']]);
                
                $stmtAddBatchChai = $pdo->prepare("UPDATE batches SET current_qty = current_qty + ? WHERE id = ?");
                $stmtAddBatchMl = $pdo->prepare("UPDATE batches SET current_ml = current_ml + ? WHERE id = ?");
                $stmtSyncQty = $pdo->prepare("UPDATE batches SET current_qty = FLOOR(current_ml / ?) WHERE id = ?");
                
                $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (batch_id, action_type, qty_change, ml_change, reason) VALUES (?, 'CANCEL_ORDER', ?, ?, ?)");
                
                foreach ($items->fetchAll() as $item) {
                    if ($item['sell_type'] === 'ml' && $item['ml_per_unit'] > 0) {
                        $stmtAddBatchMl->execute([$item['quantity'], $item['batch_id']]);
                        $stmtSyncQty->execute([$item['ml_per_unit'], $item['batch_id']]);
                        $stmtLog->execute([$item['batch_id'], 0, $item['quantity'], "Hủy đơn hàng #{$data['id']}"]);
                    } else {
                        $stmtAddBatchChai->execute([$item['quantity'], $item['batch_id']]);
                        $mlDeduct = 0;
                        if ($item['ml_per_unit'] > 0) {
                            $mlDeduct = $item['quantity'] * $item['ml_per_unit'];
                            $stmtAddBatchMl->execute([$mlDeduct, $item['batch_id']]);
                        }
                        $stmtLog->execute([$item['batch_id'], $item['quantity'], $mlDeduct, "Hủy đơn hàng #{$data['id']}"]);
                    }
                }
                
                // 2. Trừ CRM (Moved to end)
            } else if ($order['status'] === 'cancelled' && $data['status'] !== 'cancelled') {
                // PHỤC HỒI TỪ ĐƠN HỦY -> TRỪ LẠI KHO
                $items = $pdo->prepare("
                    SELECT oi.*, p.ml_per_unit 
                    FROM order_items oi
                    JOIN batches b ON oi.batch_id = b.id
                    JOIN products p ON b.product_id = p.id
                    WHERE oi.order_id = ?
                ");
                $items->execute([$data['id']]);
                
                $stmtSubBatchChai = $pdo->prepare("UPDATE batches SET current_qty = current_qty - ? WHERE id = ?");
                $stmtSubBatchMl = $pdo->prepare("UPDATE batches SET current_ml = current_ml - ? WHERE id = ?");
                $stmtSyncQty = $pdo->prepare("UPDATE batches SET current_qty = FLOOR(current_ml / ?) WHERE id = ?");
                $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (batch_id, action_type, qty_change, ml_change, reason) VALUES (?, 'ADJUST', ?, ?, ?)");
                
                foreach ($items->fetchAll() as $item) {
                    if ($item['sell_type'] === 'ml' && $item['ml_per_unit'] > 0) {
                        $stmtSubBatchMl->execute([$item['quantity'], $item['batch_id']]);
                        $stmtSyncQty->execute([$item['ml_per_unit'], $item['batch_id']]);
                        $stmtLog->execute([$item['batch_id'], 0, -$item['quantity'], "Phục hồi đơn hàng #{$data['id']}"]);
                    } else {
                        $stmtSubBatchChai->execute([$item['quantity'], $item['batch_id']]);
                        $mlDeduct = 0;
                        if ($item['ml_per_unit'] > 0) {
                            $mlDeduct = $item['quantity'] * $item['ml_per_unit'];
                            $stmtSubBatchMl->execute([$mlDeduct, $item['batch_id']]);
                        }
                        $stmtLog->execute([$item['batch_id'], -$item['quantity'], -$mlDeduct, "Phục hồi đơn hàng #{$data['id']}"]);
                    }
                }
            }
            
            // Luôn tính lại tổng chi tiêu của Khách hàng sau khi có thay đổi trạng thái
            if ($order['customer_id']) {
                $pdo->exec("
                    UPDATE customers 
                    SET total_spent = COALESCE((
                        SELECT SUM(total_amount) FROM orders 
                        WHERE customer_id = {$order['customer_id']} 
                        AND status != 'cancelled' 
                        AND payment_status = 'paid'
                    ), 0)
                    WHERE id = {$order['customer_id']}
                ");
                $settings = $pdo->query("SELECT setting_key, setting_value FROM settings")->fetchAll(PDO::FETCH_KEY_PAIR);
                $tierLoyal = (int)($settings['tier_loyal'] ?? 5000000);
                $tierVip = (int)($settings['tier_vip'] ?? 20000000);
                $pdo->exec("UPDATE customers SET customer_tier = CASE WHEN total_spent >= $tierVip THEN 'VIP' WHEN total_spent >= $tierLoyal THEN 'Loyal' ELSE 'New' END WHERE id = {$order['customer_id']}");
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
        $status = $data['status'] ?? 'completed';
        $paymentStatus = $data['payment_status'] ?? 'paid';
        
        $stmt = $pdo->prepare("INSERT INTO orders (customer_id, total_amount, final_amount, status, payment_status) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$customerId, $data['total_amount'], $data['total_amount'], $status, $paymentStatus]);
        $orderId = $pdo->lastInsertId();
        
        // Thêm chi tiết và trừ tồn kho
        $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, batch_id, sell_type, quantity, price_per_unit, subtotal, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        $stmtUpdateBatchChai = $pdo->prepare("UPDATE batches SET current_qty = current_qty - ? WHERE id = ? AND current_qty >= ?");
        $stmtUpdateBatchMl = $pdo->prepare("UPDATE batches SET current_ml = current_ml - ? WHERE id = ? AND current_ml >= ?");
        
        foreach ($data['cart'] as $item) {
            $stmtBatch = $pdo->prepare("SELECT b.import_price, p.ml_per_unit FROM batches b JOIN products p ON b.product_id = p.id WHERE b.id = ?");
            $stmtBatch->execute([$item['batch_id']]);
            $batch = $stmtBatch->fetch();
            
            if (!$batch) throw new Exception("Không tìm thấy lô hàng ID " . $item['batch_id']);

            $costPerUnit = $batch['import_price'];
            if ($item['sell_type'] === 'ml' && $batch['ml_per_unit'] > 0) {
                $costPerUnit = $batch['import_price'] / $batch['ml_per_unit'];
                // Trừ ml
                $stmtUpdateBatchMl->execute([$item['quantity'], $item['batch_id'], $item['quantity']]);
                if ($stmtUpdateBatchMl->rowCount() === 0) throw new Exception("Lô hàng ID " . $item['batch_id'] . " không đủ dung tích chiết (ml) trong kho.");
                
                // Cập nhật lại số chai nguyên (chai nguyên = tổng ml còn lại chia cho dung tích 1 chai)
                $pdo->prepare("UPDATE batches SET current_qty = FLOOR(current_ml / ?) WHERE id = ?")->execute([$batch['ml_per_unit'], $item['batch_id']]);
            } else {
                // Trừ chai
                $stmtUpdateBatchChai->execute([$item['quantity'], $item['batch_id'], $item['quantity']]);
                if ($stmtUpdateBatchChai->rowCount() === 0) throw new Exception("Lô hàng ID " . $item['batch_id'] . " không đủ số chai nguyên trong kho.");
                
                // Nếu sản phẩm này có chiết, phải trừ song song số ml tương ứng
                if ($batch['ml_per_unit'] > 0) {
                    $mlDeduct = $item['quantity'] * $batch['ml_per_unit'];
                    $stmtUpdateBatchMl->execute([$mlDeduct, $item['batch_id'], $mlDeduct]);
                }
            }
            
            $subtotal = $item['price'] * $item['quantity'];
            $stmtItem->execute([
                $orderId, $item['batch_id'], $item['sell_type'], $item['quantity'], $item['price'], $subtotal, $costPerUnit
            ]);
            
            $logQtyChange = ($item['sell_type'] === 'chai') ? -$item['quantity'] : 0;
            $logMlChange = ($item['sell_type'] === 'ml') ? -$item['quantity'] : (isset($mlDeduct) ? -$mlDeduct : 0);
            $pdo->prepare("INSERT INTO inventory_logs (batch_id, action_type, qty_change, ml_change, reason) VALUES (?, 'SALE', ?, ?, ?)")
                ->execute([$item['batch_id'], $logQtyChange, $logMlChange, "Bán hàng Đơn #{$orderId}"]);
        }
        
        // Cập nhật hạng thành viên CRM tự động (Recalculate)
        if ($customerId) {
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
            $settings = $pdo->query("SELECT setting_key, setting_value FROM settings")->fetchAll(PDO::FETCH_KEY_PAIR);
            $tierLoyal = (int)($settings['tier_loyal'] ?? 5000000);
            $tierVip = (int)($settings['tier_vip'] ?? 20000000);
            $pdo->exec("UPDATE customers SET customer_tier = CASE WHEN total_spent >= $tierVip THEN 'VIP' WHEN total_spent >= $tierLoyal THEN 'Loyal' ELSE 'New' END WHERE id = $customerId");
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
