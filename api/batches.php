<?php
require_once 'db.php';

header("Content-Type: application/json; charset=UTF-8");
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("
            SELECT b.*, p.name as product_name, p.ml_per_unit 
            FROM batches b
            JOIN products p ON b.product_id = p.id
            WHERE b.status != 'archived' OR b.status IS NULL
            ORDER BY b.import_date DESC
        ");
        echo json_encode($stmt->fetchAll());
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    if (!$data || !isset($data->product_id) || !isset($data->initial_qty)) {
        http_response_code(400);
        echo json_encode(["error" => "Thiếu thông tin lô hàng"]);
        exit();
    }
    
    try {
        // Lấy dung tích
        $stmtProd = $pdo->prepare("SELECT ml_per_unit FROM products WHERE id = ?");
        $stmtProd->execute([$data->product_id]);
        $product = $stmtProd->fetch();
        
        $initial_ml = ($product && $product['ml_per_unit']) ? ($data->initial_qty * $product['ml_per_unit']) : 0;
        
        $stmt = $pdo->prepare("
            INSERT INTO batches (product_id, batch_code, import_date, expiry_date, import_price, initial_qty, current_qty, initial_ml, current_ml) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data->product_id,
            $data->batch_code ?? 'MINTH-'.rand(10000, 99999),
            $data->import_date,
            empty($data->expiry_date) ? null : $data->expiry_date,
            $data->import_price,
            $data->initial_qty,
            $data->initial_qty, // current = initial
            $initial_ml,
            $initial_ml
        ]);
        
        $batchId = $pdo->lastInsertId();
        
        $logStmt = $pdo->prepare("
            INSERT INTO inventory_logs (batch_id, action_type, qty_change, ml_change, reason)
            VALUES (?, 'IMPORT', ?, ?, ?)
        ");
        $logStmt->execute([$batchId, $data->initial_qty, $initial_ml, "Nhập kho ban đầu"]);
        
        echo json_encode([
            "message" => "Thêm lô hàng thành công",
            "id" => $batchId
        ]);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents("php://input"));
    if (!$data || empty($data->id)) {
        http_response_code(400);
        echo json_encode(["error" => "Thiếu ID lô hàng"]);
        exit();
    }
    try {
        $pdo->prepare("UPDATE batches SET status = 'archived' WHERE id = ?")->execute([$data->id]);
        echo json_encode(["message" => "Đã xóa lô hàng"]);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} else {
    http_response_code(405);
}
?>
