<?php
require_once 'db.php';

try {
    // Bảng Settings
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $stmt = $pdo->prepare("INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)");
    $stmt->execute(['tier_loyal', '5000000']);
    $stmt->execute(['tier_vip', '20000000']);
    $stmt->execute(['setup_completed', '0']);

    echo json_encode(["message" => "Migration: Settings table initialized successfully!"]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error migrating settings: " . $e->getMessage()]);
}
?>
