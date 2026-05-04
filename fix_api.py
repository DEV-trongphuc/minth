php_code = """<?php
require_once 'db.php';

header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("
            SELECT 
                p.*, 
                COALESCE(SUM(CASE WHEN b.status != 'archived' THEN b.current_qty ELSE 0 END), 0) as total_qty, 
                COALESCE(SUM(CASE WHEN b.status != 'archived' THEN b.current_ml ELSE 0 END), 0) as total_ml
            FROM products p
            LEFT JOIN batches b ON p.id = b.product_id
            WHERE p.status != 'archived' OR p.status IS NULL
            GROUP BY p.id
            ORDER BY p.created_at DESC
        ");
        $products = $stmt->fetchAll();
        echo json_encode($products);
    } catch (\\PDOException $e) {
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

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE LOWER(name) = LOWER(:name) AND (status != 'archived' OR status IS NULL)");
    $stmt->execute([':name' => trim($data->name)]);
    if ($stmt->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(["error" => "Tên sản phẩm này đã tồn tại"]);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO products (name, category, unit, ml_per_unit, image, status) VALUES (:name, :category, :unit, :ml, :img, 'active')");
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
    } catch (\\PDOException $e) {
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

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE LOWER(name) = LOWER(:name) AND id != :id AND (status != 'archived' OR status IS NULL)");
    $stmt->execute([':name' => trim($data->name), ':id' => $data->id]);
    if ($stmt->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(["error" => "Tên sản phẩm này đã tồn tại"]);
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
    } catch (\\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'PATCH') {
    $data = json_decode(file_get_contents("php://input"));
    if (!$data || empty($data->ids) || !is_array($data->ids)) {
        http_response_code(400);
        echo json_encode(["error" => "Thiếu danh sách ID sản phẩm"]);
        exit();
    }
    
    try {
        $inQuery = implode(',', array_fill(0, count($data->ids), '?'));
        $category = $data->category ?? null;
        if ($category === '') $category = null;
        
        $sql = "UPDATE products SET category = ? WHERE id IN ($inQuery)";
        $stmt = $pdo->prepare($sql);
        $params = array_merge([$category], $data->ids);
        $stmt->execute($params);
        
        echo json_encode(["message" => "Đã chuyển danh mục cho " . count($data->ids) . " sản phẩm"]);
    } catch (\\PDOException $e) {
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
        $pdo->prepare("UPDATE products SET status = 'archived' WHERE id = ?")->execute([$data->id]);
        echo json_encode(["message" => "Đã xóa sản phẩm"]);
    } catch (\\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>"""

with open("F:\\HAMIEN_LUCCY\\api\\products.php", "w", encoding="utf-8") as f:
    f.write(php_code)
