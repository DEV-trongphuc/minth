<?php
require_once 'db.php';

try {
    // Bảng Users
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Tạo user admin mặc định nếu chưa có
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    if ($stmt->fetchColumn() == 0) {
        $defaultPassword = password_hash('admin123', PASSWORD_DEFAULT);
        $pdo->exec("INSERT INTO users (username, password, role) VALUES ('admin', '$defaultPassword', 'admin')");
    }

    // Bảng Sản phẩm
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        unit VARCHAR(50) DEFAULT 'chai',
        ml_per_unit INT DEFAULT 0,
        image TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Bảng Lô hàng
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT,
        batch_code VARCHAR(100),
        import_date DATE NOT NULL,
        expiry_date DATE,
        import_price DECIMAL(15, 2) NOT NULL,
        initial_qty INT NOT NULL,
        current_qty INT NOT NULL,
        initial_ml INT DEFAULT 0,
        current_ml INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    
    // Fix cho bảng batches nếu thiếu cột expiry_date
    try { $pdo->exec("ALTER TABLE batches ADD COLUMN expiry_date DATE"); } catch (\PDOException $e) {}

    // Bảng Lịch sử & Xuất kho nội bộ
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL, /* IMPORT, SALE, ADJUST, EXPORT_INTERNAL, CANCEL_ORDER */
        qty_change INT DEFAULT 0,
        ml_change INT DEFAULT 0,
        reason VARCHAR(255),
        user_name VARCHAR(100) DEFAULT 'System',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
        INDEX idx_inventory_logs_created (created_at),
        INDEX idx_inventory_logs_action (action_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Bảng Khách hàng
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        note TEXT,
        total_spent DECIMAL(15, 2) DEFAULT 0,
        customer_tier VARCHAR(50) DEFAULT 'New',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Bảng Đơn hàng
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        total_amount DECIMAL(15, 2) NOT NULL,
        shipping_fee DECIMAL(15, 2) DEFAULT 0,
        discount DECIMAL(15, 2) DEFAULT 0,
        final_amount DECIMAL(15, 2) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'paid',
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        INDEX idx_orders_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Bảng Chi tiết Đơn hàng
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT,
        batch_id INT,
        sell_type VARCHAR(50) DEFAULT 'chai',
        quantity INT NOT NULL,
        price_per_unit DECIMAL(15, 2) NOT NULL,
        subtotal DECIMAL(15, 2) NOT NULL,
        cost_per_unit DECIMAL(15, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES batches(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    // Fix cho bảng customers nếu thiếu cột note (sẽ bỏ qua nếu đã có)
    try { $pdo->exec("ALTER TABLE customers ADD COLUMN note TEXT"); } catch (\PDOException $e) {}
    
    // Fix cho bảng orders nếu thiếu cột payment_status
    try { $pdo->exec("ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'paid'"); } catch (\PDOException $e) {}

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

    // Tối ưu Database (Indexes)
    try { $pdo->exec("CREATE INDEX idx_customers_phone ON customers(phone)"); } catch (\PDOException $e) {}
    try { $pdo->exec("CREATE INDEX idx_orders_status ON orders(status)"); } catch (\PDOException $e) {}
    try { $pdo->exec("CREATE INDEX idx_orders_payment_status ON orders(payment_status)"); } catch (\PDOException $e) {}
    try { $pdo->exec("CREATE INDEX idx_batches_product ON batches(product_id)"); } catch (\PDOException $e) {}

    echo json_encode(["message" => "Database schema & indexes initialized successfully!"]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error initializing schema: " . $e->getMessage()]);
}
?>
