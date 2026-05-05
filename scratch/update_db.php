<?php
require 'api/db.php';
try {
    $pdo->exec("ALTER TABLE orders ADD COLUMN shipping_customer_pay TINYINT(1) DEFAULT 1 AFTER shipping_fee");
    echo "Successfully added shipping_customer_pay column to orders table.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
