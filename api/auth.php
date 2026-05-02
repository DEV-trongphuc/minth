<?php
require_once 'db.php';
header("Content-Type: application/json; charset=UTF-8");

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'login') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    try {
        $stmt = $pdo->prepare("SELECT id, username, password, role, avatar FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
    } catch (\PDOException $e) {
        // Auto-migrate if avatar column is missing
        if (strpos($e->getMessage(), "Unknown column 'avatar'") !== false) {
            $pdo->exec("ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL");
            $stmt = $pdo->prepare("SELECT id, username, password, role, avatar FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Database error: " . $e->getMessage()]);
            exit();
        }
    } catch (\Throwable $e) {
        http_response_code(500);
        echo json_encode(["error" => "Server error: " . $e->getMessage()]);
        exit();
    }

    if ($user && password_verify($password, $user['password'])) {
        // Return a simple mock token for frontend state
        $token = base64_encode(json_encode(['id' => $user['id'], 'username' => $user['username'], 'role' => $user['role']]));
        echo json_encode(["success" => true, "token" => $token, "user" => ["username" => $user['username'], "role" => $user['role'], "avatar" => $user['avatar'] ?? '']]);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Sai tài khoản hoặc mật khẩu!"]);
    }
} elseif ($method === 'POST' && $action === 'change_password') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = $data['username'];
    $newPassword = password_hash($data['new_password'], PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = ?");
    if ($stmt->execute([$newPassword, $username])) {
        echo json_encode(["success" => true]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Lỗi đổi mật khẩu"]);
    }
}
?>
