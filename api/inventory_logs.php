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
        
        $stmtBatch = $pdo->prepare("SELECT b.current_qty, b.current_ml, b.product_id, p.ml_per_unit FROM batches b JOIN products p ON b.product_id = p.id WHERE b.id = ? FOR UPDATE");
        $stmtBatch->execute([$data->batch_id]);
        $batch = $stmtBatch->fetch();
        
        if (!$batch) throw new Exception("Không tìm thấy lô hàng");
        
        $exportType = $data->export_type ?? 'chai';
        $qty = (int)$data->qty;
        
        $qtyChange = 0;
        $mlChange = 0;
        
        $newQty = $batch['current_qty'];
        $newMl = $batch['current_ml'];
        
        if ($exportType === 'ml' && $batch['ml_per_unit'] > 0) {
            if ($newMl < $qty) throw new Exception("Không đủ dung tích ml để xuất");
            $mlChange = -$qty;
            $newMl -= $qty;
            $newQty = floor($newMl / $batch['ml_per_unit']);
        } else {
            if ($newQty < $qty) throw new Exception("Không đủ số lượng chai để xuất");
            $qtyChange = -$qty;
            $newQty -= $qty;
            
            if ($batch['ml_per_unit'] > 0) {
                $mlDeduct = $qty * $batch['ml_per_unit'];
                if ($newMl < $mlDeduct) throw new Exception("Không đủ dung tích ml chiết tương ứng để xuất");
                $mlChange = -$mlDeduct;
                $newMl -= $mlDeduct;
            }
        }
        
        $stmtUpdate = $pdo->prepare("UPDATE batches SET current_qty = ?, current_ml = ? WHERE id = ?");
        $stmtUpdate->execute([$newQty, $newMl, $data->batch_id]);
        
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
