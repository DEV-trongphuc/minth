<?php
require_once 'db.php';

header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];

// Helper function to get custom categories from settings
function getCustomCategories($pdo) {
    $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'custom_categories'");
    $stmt->execute();
    $val = $stmt->fetchColumn();
    return $val ? json_decode($val, true) : [];
}

// Helper function to save custom categories
function saveCustomCategories($pdo, $cats) {
    $json = json_encode(array_values(array_unique($cats)), JSON_UNESCAPED_UNICODE);
    $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('custom_categories', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
    $stmt->execute([$json, $json]);
}

if ($method === 'GET') {
    try {
        // Get categories from products table
        $stmt = $pdo->query("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' AND (status != 'archived' OR status IS NULL)");
        $dbCats = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Get categories from settings
        $customCats = getCustomCategories($pdo);
        
        // Merge and unique
        $allCats = array_values(array_unique(array_merge($dbCats, $customCats)));
        
        echo json_encode($allCats);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Thêm mới 1 category trống vào settings
    $data = json_decode(file_get_contents("php://input"));
    if (!$data || empty($data->category)) {
        http_response_code(400);
        echo json_encode(["error" => "Thiếu tên danh mục"]);
        exit();
    }
    
    $newCat = trim($data->category);
    try {
        $customCats = getCustomCategories($pdo);
        if (!in_array($newCat, $customCats)) {
            $customCats[] = $newCat;
            saveCustomCategories($pdo, $customCats);
        }
        echo json_encode(["message" => "Đã thêm danh mục mới", "category" => $newCat]);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    // Đổi tên category (cả trong db và settings)
    $data = json_decode(file_get_contents("php://input"));
    if (!$data || empty($data->old_name) || empty($data->new_name)) {
        http_response_code(400);
        echo json_encode(["error" => "Thiếu thông tin đổi tên"]);
        exit();
    }
    
    $oldCat = trim($data->old_name);
    $newCat = trim($data->new_name);
    
    try {
        $pdo->beginTransaction();
        
        // Cập nhật bảng products
        $stmt = $pdo->prepare("UPDATE products SET category = ? WHERE category = ?");
        $stmt->execute([$newCat, $oldCat]);
        
        // Cập nhật settings
        $customCats = getCustomCategories($pdo);
        $updatedCats = [];
        foreach ($customCats as $c) {
            $updatedCats[] = ($c === $oldCat) ? $newCat : $c;
        }
        if (!in_array($newCat, $updatedCats)) {
            $updatedCats[] = $newCat;
        }
        saveCustomCategories($pdo, $updatedCats);
        
        $pdo->commit();
        echo json_encode(["message" => "Đã đổi tên danh mục thành công"]);
    } catch (\PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    // Xóa category (đặt products category thành NULL, xóa khỏi settings)
    $data = json_decode(file_get_contents("php://input"));
    if (!$data || empty($data->category)) {
        http_response_code(400);
        echo json_encode(["error" => "Thiếu tên danh mục"]);
        exit();
    }
    
    $cat = trim($data->category);
    
    try {
        $pdo->beginTransaction();
        
        // Xóa khỏi bảng products (chuyển về NULL - Mồ côi)
        $stmt = $pdo->prepare("UPDATE products SET category = NULL WHERE category = ?");
        $stmt->execute([$cat]);
        
        // Xóa khỏi settings
        $customCats = getCustomCategories($pdo);
        $customCats = array_filter($customCats, function($c) use ($cat) { return $c !== $cat; });
        saveCustomCategories($pdo, $customCats);
        
        $pdo->commit();
        echo json_encode(["message" => "Đã xóa danh mục thành công"]);
    } catch (\PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>