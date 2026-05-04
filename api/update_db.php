<?php
require_once 'db.php';

try {
    // Thêm cột gender
    $pdo->exec("ALTER TABLE customers ADD COLUMN gender VARCHAR(20) DEFAULT NULL AFTER phone");
    echo "Thêm cột gender thành công.\n";
} catch (PDOException $e) {
    echo "Cột gender có thể đã tồn tại: " . $e->getMessage() . "\n";
}

try {
    // Thêm cột birthday
    $pdo->exec("ALTER TABLE customers ADD COLUMN birthday DATE DEFAULT NULL AFTER gender");
    echo "Thêm cột birthday thành công.\n";
} catch (PDOException $e) {
    echo "Cột birthday có thể đã tồn tại: " . $e->getMessage() . "\n";
}
?>
