<?php
require_once 'api/db.php';
\ = date('Y-m-d 00:00:00', strtotime('-30 days'));
\ = date('Y-m-d 23:59:59');

\ = \->prepare("
    SELECT 
        DAYOFWEEK(created_at) as weekday, 
        COUNT(id) as order_count 
    FROM orders 
    WHERE created_at BETWEEN :start AND :end AND status != 'cancelled'
    GROUP BY DAYOFWEEK(created_at)
    ORDER BY weekday ASC
");
\->execute([':start' => \, ':end' => \]);
\ = \->fetchAll();

\ = array_fill(1, 7, 0); // 1 = Sunday, 7 = Saturday
foreach (\ as \) {
    \[(int)\['weekday']] = (int)\['order_count'];
}
echo json_encode(\);
?>
