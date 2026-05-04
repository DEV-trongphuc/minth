<?php
require_once 'db.php';
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Lấy danh sách khách hàng và tự động đếm số đơn hàng + ngày mua cuối
        $stmt = $pdo->query("
            SELECT 
                c.id, c.name, c.phone, c.gender, c.birthday, c.address, c.note, c.total_spent, c.customer_tier as tier,
                COUNT(o.id) as order_count,
                MAX(o.created_at) as last_order
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'cancelled'
            GROUP BY c.id
            ORDER BY c.total_spent DESC
        ");
        
        $customers = $stmt->fetchAll();
        
        // Format lại ngày cho đẹp
        foreach ($customers as &$c) {
            if ($c['last_order']) {
                $c['last_order'] = date('Y-m-d', strtotime($c['last_order']));
            } else {
                $c['last_order'] = '—';
            }
        }
        
        echo json_encode($customers);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (empty($data['name']) || empty($data['phone'])) {
        http_response_code(400); echo json_encode(["error" => "Thiếu tên hoặc SĐT"]); exit();
    }
    try {
        $stmt = $pdo->prepare("INSERT INTO customers (name, phone, gender, birthday, address, note) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$data['name'], $data['phone'], $data['gender'] ?? null, $data['birthday'] ?? null, $data['address'] ?? '', $data['note'] ?? '']);
        echo json_encode(["message" => "Thêm khách hàng thành công", "id" => $pdo->lastInsertId()]);
    } catch (\PDOException $e) {
        http_response_code(500); echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (empty($data['id']) || empty($data['name'])) {
        http_response_code(400); echo json_encode(["error" => "Thiếu ID hoặc Tên"]); exit();
    }
    try {
        $stmt = $pdo->prepare("UPDATE customers SET name = ?, phone = ?, gender = ?, birthday = ?, address = ?, note = ? WHERE id = ?");
        $stmt->execute([$data['name'], $data['phone'] ?? '', $data['gender'] ?? null, $data['birthday'] ?? null, $data['address'] ?? '', $data['note'] ?? '', $data['id']]);
        echo json_encode(["message" => "Cập nhật thành công"]);
    } catch (\PDOException $e) {
        http_response_code(500); echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (empty($data['id'])) {
        http_response_code(400); echo json_encode(["error" => "Thiếu ID"]); exit();
    }
    try {
        $pdo->prepare("DELETE FROM customers WHERE id = ?")->execute([$data['id']]);
        echo json_encode(["message" => "Đã xóa khách hàng"]);
    } catch (\PDOException $e) {
        http_response_code(400);
        if ($e->getCode() == 23000) {
            echo json_encode(["error" => "Khách hàng này đã có đơn hàng, không thể xóa để bảo toàn dữ liệu."]);
        } else {
            echo json_encode(["error" => $e->getMessage()]);
        }
    }
}
?>
