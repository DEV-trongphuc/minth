<?php
require_once 'db.php';
header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // Hỗ trợ thống kê hoặc lấy danh sách
        $type = $_GET['type'] ?? 'list';
        $month = $_GET['month'] ?? date('Y-m'); // format YYYY-MM

        if ($type === 'stats') {
            // Thống kê theo danh mục trong tháng
            $stmt = $pdo->prepare("
                SELECT category, SUM(amount) as total 
                FROM expenses 
                WHERE DATE_FORMAT(expense_date, '%Y-%m') = ?
                GROUP BY category
            ");
            $stmt->execute([$month]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } else {
            // Lấy danh sách
            $sql = "SELECT * FROM expenses ";
            $params = [];
            
            if (isset($_GET['months']) && !empty($_GET['months']) && $_GET['months'] !== 'all') {
                $months = explode(',', $_GET['months']);
                $placeholders = implode(',', array_fill(0, count($months), '?'));
                $sql .= "WHERE DATE_FORMAT(expense_date, '%Y-%m') IN ($placeholders) ";
                $params = array_merge($params, $months);
            }
            
            $sql .= "ORDER BY expense_date DESC, created_at DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
    } 
    elseif ($method === 'POST') {
        // Thêm mới
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['category']) || !isset($data['amount']) || !isset($data['expense_date'])) {
            http_response_code(400);
            echo json_encode(["error" => "Thiếu thông tin bắt buộc"]);
            exit();
        }

        $stmt = $pdo->prepare("INSERT INTO expenses (category, amount, description, expense_date) VALUES (?, ?, ?, ?)");
        if ($stmt->execute([
            $data['category'], 
            $data['amount'], 
            $data['description'] ?? '', 
            $data['expense_date']
        ])) {
            echo json_encode(["success" => true, "id" => $pdo->lastInsertId()]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Lỗi lưu dữ liệu"]);
        }
    } 
    elseif ($method === 'PUT') {
        // Cập nhật
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Thiếu ID"]);
            exit();
        }

        $stmt = $pdo->prepare("UPDATE expenses SET category = ?, amount = ?, description = ?, expense_date = ? WHERE id = ?");
        if ($stmt->execute([
            $data['category'], 
            $data['amount'], 
            $data['description'] ?? '', 
            $data['expense_date'],
            $data['id']
        ])) {
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Lỗi cập nhật dữ liệu"]);
        }
    } 
    elseif ($method === 'DELETE') {
        // Xóa (hỗ trợ xóa mảng IDs)
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (isset($data['id'])) {
            // Xóa 1
            $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ?");
            if ($stmt->execute([$data['id']])) {
                echo json_encode(["success" => true]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Lỗi xóa dữ liệu"]);
            }
        } elseif (isset($data['ids']) && is_array($data['ids'])) {
            // Xóa nhiều
            $ids = implode(',', array_map('intval', $data['ids']));
            $stmt = $pdo->prepare("DELETE FROM expenses WHERE id IN ($ids)");
            if ($stmt->execute()) {
                echo json_encode(["success" => true]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Lỗi xóa dữ liệu"]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "Thiếu ID"]);
        }
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "Server error: " . $e->getMessage()]);
}
?>
