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

        // 3. Top Products (with Profit)
        $stmtTop = $pdo->prepare("
            SELECT 
                p.name, 
                p.unit,
                SUM(CASE WHEN oi.sell_type = 'chai' THEN oi.quantity ELSE 0 END) as chai_sales,
                SUM(CASE WHEN oi.sell_type = 'ml' THEN oi.quantity ELSE 0 END) as ml_sales,
                SUM(CASE WHEN oi.sell_type NOT IN ('chai', 'ml') THEN oi.quantity ELSE 0 END) as other_sales,
                SUM(oi.subtotal) as revenue,
                SUM(oi.subtotal - (oi.cost_per_unit * oi.quantity)) as profit
            FROM order_items oi
            JOIN batches b ON oi.batch_id = b.id
            JOIN products p ON b.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at BETWEEN :start AND :end AND o.status != 'cancelled' AND o.payment_status = 'paid'
            GROUP BY p.id, p.name, p.unit
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

        // 5. Expiring Soon (<= 30 days)
        $stmtExpiring = $pdo->query("
            SELECT p.name, b.batch_code, b.expiry_date, b.current_qty as qty, b.current_ml as ml, p.unit
            FROM batches b
            JOIN products p ON b.product_id = p.id
            WHERE b.status = 'active' AND b.expiry_date IS NOT NULL AND b.expiry_date != '0000-00-00' AND b.expiry_date != ''
            AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            AND (b.current_qty > 0 OR b.current_ml > 0)
            ORDER BY b.expiry_date ASC
            LIMIT 5
        ");
        $expiringSoon = $stmtExpiring->fetchAll();

        // 6. Shipping Fees
        $stmtShipping = $pdo->prepare("
            SELECT SUM(shipping_fee) as total_shipping 
            FROM orders 
            WHERE payment_status = 'paid' AND status != 'cancelled' AND created_at BETWEEN :start AND :end
        ");
        $stmtShipping->execute([':start' => $startDate, ':end' => $endDate]);
        $totalShipping = $stmtShipping->fetchColumn() ?: 0;

        // 7. Operational Costs (Export Internal Loss)
        $stmtCost = $pdo->prepare("
            SELECT SUM(
                CASE WHEN i.qty_change < 0 THEN ABS(i.qty_change) * b.import_price 
                ELSE ABS(i.ml_change) * (b.import_price / CASE WHEN p.ml_per_unit > 0 THEN p.ml_per_unit ELSE 1 END) END
            ) as op_cost
            FROM inventory_logs i
            JOIN batches b ON i.batch_id = b.id
            JOIN products p ON b.product_id = p.id
            WHERE i.action_type = 'EXPORT_INTERNAL' AND i.created_at BETWEEN :start AND :end
        ");
        $stmtCost->execute([':start' => $startDate, ':end' => $endDate]);
        $opCost = $stmtCost->fetchColumn() ?: 0;

        // 8. Top Customers
        $stmtTopCustomers = $pdo->prepare("
            SELECT 
                c.name, 
                c.customer_tier,
                SUM(o.total_amount) as total_spent,
                COUNT(o.id) as total_orders
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.created_at BETWEEN :start AND :end AND o.status != 'cancelled' AND o.payment_status = 'paid'
            GROUP BY c.id
            ORDER BY total_spent DESC
            LIMIT 5
        ");
        $stmtTopCustomers->execute([':start' => $startDate, ':end' => $endDate]);
        $topCustomers = $stmtTopCustomers->fetchAll();

        // 9. Recent Orders
        $stmtRecent = $pdo->prepare("
            SELECT o.id, c.name as customer_name, o.final_amount, o.status, o.created_at, o.payment_status
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.created_at BETWEEN :start AND :end
            ORDER BY o.created_at DESC
            LIMIT 5
        ");
        $stmtRecent->execute([':start' => $startDate, ':end' => $endDate]);
        $recentOrders = $stmtRecent->fetchAll();

        // 10. Geographic Sales
        $stmtGeo = $pdo->prepare("
            SELECT 
                CASE 
                    WHEN c.address IS NULL OR TRIM(c.address) = '' THEN 'Chưa cập nhật'
                    ELSE TRIM(SUBSTRING_INDEX(c.address, ',', -1))
                END as region,
                SUM(o.total_amount) as revenue,
                COUNT(o.id) as order_count
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.created_at BETWEEN :start AND :end AND o.status != 'cancelled' AND o.payment_status = 'paid'
            GROUP BY region
            ORDER BY revenue DESC
        ");
        $stmtGeo->execute([':start' => $startDate, ':end' => $endDate]);
        $geoSales = $stmtGeo->fetchAll();

        // 11. Pending Orders Count
        $stmtPending = $pdo->prepare("SELECT COUNT(id) FROM orders WHERE status = 'pending'");
        $stmtPending->execute();
        $pendingOrders = (int)$stmtPending->fetchColumn();

        // 12. Total Expenses
        $stmtExp = $pdo->prepare("SELECT SUM(amount) FROM expenses WHERE expense_date BETWEEN DATE(:start) AND DATE(:end)");
        $stmtExp->execute([':start' => $startDate, ':end' => $endDate]);
        $totalExpenses = (float)$stmtExp->fetchColumn();

        // Calculations
        $totalRev = (float)$stats['total_revenue'];
        $totalOrd = (int)$stats['total_orders'];
        $grossProfit = (float)$stats['gross_profit'];
        $netProfit = $grossProfit - $totalExpenses - (float)$opCost;
        
        $aov = $totalOrd > 0 ? ($totalRev / $totalOrd) : 0;
        $profitMargin = $totalRev > 0 ? ($netProfit / $totalRev) * 100 : 0;

        // 13. Weekday Sales (Ngày vàng mua sắm)
        $stmtWeekday = $pdo->prepare("
            SELECT 
                DAYOFWEEK(created_at) as weekday, 
                COUNT(id) as order_count 
            FROM orders 
            WHERE created_at BETWEEN :start AND :end AND status != 'cancelled'
            GROUP BY DAYOFWEEK(created_at)
            ORDER BY weekday ASC
        ");
        $stmtWeekday->execute([':start' => $startDate, ':end' => $endDate]);
        $weekdaySalesRaw = $stmtWeekday->fetchAll();
        
        $weekdaySales = array_fill(1, 7, 0); // 1 = Sunday, 7 = Saturday
        foreach ($weekdaySalesRaw as $row) {
            $weekdaySales[(int)$row['weekday']] = (int)$row['order_count'];
        }

        echo json_encode([
            "total_revenue" => $totalRev,
            "gross_profit" => $grossProfit,
            "total_expenses" => $totalExpenses,
            "net_profit" => $netProfit,
            "total_orders" => $totalOrd,
            "pending_orders" => $pendingOrders,
            "total_shipping" => (float)$totalShipping,
            "op_cost" => (float)$opCost,
            "aov" => $aov,
            "profit_margin" => $profitMargin,
            "chart_data" => $chartData,
            "donut_data" => $donutData,
            "top_products" => $topProducts,
            "low_stock" => $lowStock,
            "expiring_soon" => $expiringSoon,
            "top_customers" => $topCustomers,
            "recent_orders" => $recentOrders,
            "geo_sales" => $geoSales,
            "weekday_sales" => $weekdaySales,
            "filter" => $filter,
            "period" => "$startDate to $endDate"
        ]);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
