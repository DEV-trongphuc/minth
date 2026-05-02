<?php
require_once 'db.php';

header("Content-Type: application/json; charset=UTF-8");
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $filter = $_GET['filter'] ?? '7days';
    $startDate = '';
    $endDate = date('Y-m-d 23:59:59');

    switch ($filter) {
        case '7days':
            $startDate = date('Y-m-d 00:00:00', strtotime('-6 days')); // Tính cả hôm nay là 7 ngày
            break;
        case '30days':
            $startDate = date('Y-m-d 00:00:00', strtotime('-29 days'));
            break;
        case 'thismonth':
            $startDate = date('Y-m-01 00:00:00');
            break;
        case 'lastmonth':
            $startDate = date('Y-m-01 00:00:00', strtotime('first day of last month'));
            $endDate = date('Y-m-t 23:59:59', strtotime('last day of last month'));
            break;
        case 'custom':
            $startDate = ($_GET['start'] ?? date('Y-m-d')) . ' 00:00:00';
            $endDate = ($_GET['end'] ?? date('Y-m-d')) . ' 23:59:59';
            break;
        default:
            $startDate = date('Y-m-d 00:00:00', strtotime('-6 days'));
    }

    try {
        // Query Doanh thu & Lợi nhuận (Chỉ tính các đơn Đã thanh toán và Không bị hủy)
        // Query Tổng đơn (Tính tất cả trừ đơn bị hủy)
        $stmt = $pdo->prepare("
            SELECT 
                SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
                SUM(
                  CASE WHEN payment_status = 'paid' THEN 
                    total_amount - COALESCE((SELECT SUM(cost_per_unit * quantity) FROM order_items WHERE order_id = orders.id), 0)
                  ELSE 0 END
                ) as gross_profit,
                COUNT(id) as total_orders
            FROM orders 
            WHERE created_at BETWEEN :start AND :end AND status != 'cancelled'
        ");
        $stmt->execute([':start' => $startDate, ':end' => $endDate]);
        $stats = $stmt->fetch();

        // 1. Chart Data (Group by date)
        $stmtChart = $pdo->prepare("
            SELECT 
                DATE(created_at) as date,
                SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as revenue,
                SUM(
                    CASE WHEN payment_status = 'paid' THEN 
                        total_amount - COALESCE((SELECT SUM(cost_per_unit * quantity) FROM order_items WHERE order_id = orders.id), 0)
                    ELSE 0 END
                ) as profit
            FROM orders 
            WHERE created_at BETWEEN :start AND :end AND status != 'cancelled'
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        ");
        $stmtChart->execute([':start' => $startDate, ':end' => $endDate]);
        $chartData = $stmtChart->fetchAll();

        // 2. Donut Data (Sell type breakdown)
        $stmtDonut = $pdo->prepare("
            SELECT sell_type, SUM(subtotal) as total_revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at BETWEEN :start AND :end AND o.status != 'cancelled' AND o.payment_status = 'paid'
            GROUP BY sell_type
        ");
        $stmtDonut->execute([':start' => $startDate, ':end' => $endDate]);
        $donutData = $stmtDonut->fetchAll();

        // 3. Top Products
        $stmtTop = $pdo->prepare("
            SELECT p.name, SUM(oi.quantity) as sales, SUM(oi.subtotal) as revenue
            FROM order_items oi
            JOIN batches b ON oi.batch_id = b.id
            JOIN products p ON b.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at BETWEEN :start AND :end AND o.status != 'cancelled' AND o.payment_status = 'paid'
            GROUP BY p.id
            ORDER BY revenue DESC
            LIMIT 5
        ");
        $stmtTop->execute([':start' => $startDate, ':end' => $endDate]);
        $topProducts = $stmtTop->fetchAll();

        // 4. Low Stock
        $stmtLowStock = $pdo->query("
            SELECT p.name, b.current_qty as qty, b.batch_code as unit 
            FROM batches b
            JOIN products p ON b.product_id = p.id
            WHERE b.current_qty <= 5
            ORDER BY b.current_qty ASC
            LIMIT 5
        ");
        $lowStock = $stmtLowStock->fetchAll();

        echo json_encode([
            "revenue" => (float)($stats['total_revenue'] ?? 0),
            "profit" => (float)($stats['gross_profit'] ?? 0),
            "orders" => (int)($stats['total_orders'] ?? 0),
            "chart_data" => $chartData,
            "donut_data" => $donutData,
            "top_products" => $topProducts,
            "low_stock" => $lowStock,
            "filter" => $filter,
            "period" => "$startDate to $endDate"
        ]);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
