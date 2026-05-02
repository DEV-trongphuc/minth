<?php
require_once 'db.php';

header("Content-Type: application/json; charset=UTF-8");
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (!isset($_GET['batch_id'])) {
        http_response_code(400);
        echo json_encode(["error" => "Thiếu batch_id"]);
        exit();
    }
    try {
        $stmt = $pdo->prepare("SELECT * FROM inventory_logs WHERE batch_id = ? ORDER BY created_at DESC");
        $stmt->execute([$_GET['batch_id']]);
        echo json_encode($stmt->fetchAll());
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Xuất kho nội bộ
    $data = json_decode(file_get_contents("php://input"));
    if (!$data || !isset($data->batch_id) || !isset($data->qty) || !isset($data->reason)) {
        http_response_code(400);
        echo json_encode(["error" => "Thiếu thông tin xuất kho"]);
        exit();
    }
    
    try {
        $pdo->beginTransaction();
        
        $stmtBatch = $pdo->prepare("SELECT current_qty, current_ml, product_id FROM batches WHERE id = ?");
        $stmtBatch->execute([$data->batch_id]);
        $batch = $stmtBatch->fetch();
        
        if (!$batch) throw new Exception("Không tìm thấy lô hàng");
        
        $stmtProd = $pdo->prepare("SELECT ml_per_unit FROM products WHERE id = ?");
        $stmtProd->execute([$batch['product_id']]);
        $product = $stmtProd->fetch();
        
        $exportType = $data->export_type ?? 'chai';
        $qty = (int)$data->qty;
        
        $qtyChange = 0;
        $mlChange = 0;
        
        if ($exportType === 'ml' && $product['ml_per_unit'] > 0) {
            if ($batch['current_ml'] < $qty) throw new Exception("Không đủ dung tích ml để xuất");
            $mlChange = -$qty;
            
            // Cập nhật lô
            $stmtUpdate = $pdo->prepare("UPDATE batches SET current_ml = current_ml - ? WHERE id = ?");
            $stmtUpdate->execute([$qty, $data->batch_id]);
            
            // Đồng bộ chai
            $pdo->prepare("UPDATE batches SET current_qty = FLOOR(current_ml / ?) WHERE id = ?")->execute([$product['ml_per_unit'], $data->batch_id]);
        } else {
            if ($batch['current_qty'] < $qty) throw new Exception("Không đủ số lượng chai để xuất");
            $qtyChange = -$qty;
            
            // Cập nhật lô
            $stmtUpdate = $pdo->prepare("UPDATE batches SET current_qty = current_qty - ? WHERE id = ?");
            $stmtUpdate->execute([$qty, $data->batch_id]);
            
            if ($product['ml_per_unit'] > 0) {
                $mlDeduct = $qty * $product['ml_per_unit'];
                $mlChange = -$mlDeduct;
                $pdo->prepare("UPDATE batches SET current_ml = current_ml - ? WHERE id = ?")->execute([$mlDeduct, $data->batch_id]);
            }
        }
        
        $logStmt = $pdo->prepare("
            INSERT INTO inventory_logs (batch_id, action_type, qty_change, ml_change, reason, user_name)
            VALUES (?, 'EXPORT_INTERNAL', ?, ?, ?, ?)
        ");
        $logStmt->execute([$data->batch_id, $qtyChange, $mlChange, $data->reason, $data->user_name ?? 'System']);
        
        $pdo->commit();
        echo json_encode(["message" => "Xuất kho nội bộ thành công"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} else {
    http_response_code(405);
}
?>
