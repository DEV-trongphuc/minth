<?php
require_once 'db.php';

try {
    $username = 'turniodev';
    $password = '123456';
    $role = 'admin';
    $avatar = '/imgs/avatar.jpg';

    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // Kiểm tra tài khoản đã tồn tại chưa
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    
    if ($stmt->rowCount() > 0) {
        // Cập nhật tài khoản nếu đã tồn tại
        $updateStmt = $pdo->prepare("UPDATE users SET password = ?, role = ? WHERE username = ?");
        $updateStmt->execute([$hashedPassword, $role, $username]);
        echo json_encode(["message" => "Đã cập nhật mật khẩu và vai trò cho tài khoản '$username' thành công!"]);
    } else {
        // Tạo mới tài khoản
        $insertStmt = $pdo->prepare("INSERT INTO users (username, password, role, avatar) VALUES (?, ?, ?, ?)");
        $insertStmt->execute([$username, $hashedPassword, $role, $avatar]);
        echo json_encode(["message" => "Đã tạo tài khoản '$username' thành công!"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Lỗi database: " . $e->getMessage()]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "Lỗi hệ thống: " . $e->getMessage()]);
}
?>
