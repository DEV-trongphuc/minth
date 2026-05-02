<?php
require_once 'db.php';

header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM products ORDER BY created_at DESC");
        $products = $stmt->fetchAll();
        echo json_encode($products);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    if (!$data || !isset($data->name)) {
        http_response_code(400);
        echo json_encode(["error" => "Dữ liệu không hợp lệ"]);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO products (name, category, unit, ml_per_unit, image) VALUES (:name, :category, :unit, :ml, :img)");
        $stmt->execute([
            ':name' => $data->name,
            ':category' => $data->category ?? null,
            ':unit' => $data->unit ?? 'chai',
            ':ml' => $data->ml_per_unit ?? 0,
            ':img' => $data->image ?? null
        ]);
        
        echo json_encode([
            "message" => "Thêm sản phẩm thành công",
            "id" => $pdo->lastInsertId()
        ]);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"));
    if (!$data || empty($data->id) || !isset($data->name)) {
        http_response_code(400);
        echo json_encode(["error" => "Dữ liệu không hợp lệ"]);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE products SET name = :name, category = :category, unit = :unit, ml_per_unit = :ml, image = :img WHERE id = :id");
        $stmt->execute([
            ':id' => $data->id,
            ':name' => $data->name,
            ':category' => $data->category ?? null,
            ':unit' => $data->unit ?? 'chai',
            ':ml' => $data->ml_per_unit ?? 0,
            ':img' => $data->image ?? null
        ]);
        
        echo json_encode(["message" => "Cập nhật sản phẩm thành công"]);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents("php://input"));
    if (!$data || empty($data->id)) {
        http_response_code(400);
        echo json_encode(["error" => "Thiếu ID"]);
        exit();
    }
    try {
        $pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$data->id]);
        echo json_encode(["message" => "Đã xóa sản phẩm"]);
    } catch (\PDOException $e) {
        http_response_code(400); // Bad Request for constraint violation
        if ($e->getCode() == 23000) {
            echo json_encode(["error" => "Không thể xóa sản phẩm này vì đã có dữ liệu lô hàng hoặc đơn hàng liên quan. Xin vui lòng không xóa để đảm bảo toàn vẹn dữ liệu."]);
        } else {
            echo json_encode(["error" => $e->getMessage()]);
        }
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>
