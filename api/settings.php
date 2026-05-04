<?php
require_once 'db.php';
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $settings = [];
        while ($row = $stmt->fetch()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        // Cấu hình mặc định nếu rỗng
        if (!isset($settings['tier_loyal'])) $settings['tier_loyal'] = '5000000';
        if (!isset($settings['tier_vip'])) $settings['tier_vip'] = '20000000';
        if (!isset($settings['setup_completed'])) $settings['setup_completed'] = '0';
        
        echo json_encode($settings);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    if ($data) {
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)");
            foreach ($data as $key => $value) {
                $stmt->execute([$key, (string)$value]);
            }
            $pdo->commit();
            
            // Recalculate customer tiers if crm_tiers is updated
            if (isset($data['crm_tiers'])) {
                try {
                    $tiers = json_decode($data['crm_tiers'], true);
                    if (is_array($tiers) && !empty($tiers)) {
                        usort($tiers, function($a, $b) { return $b['min_spend'] <=> $a['min_spend']; });
                        $caseSql = "CASE ";
                        foreach ($tiers as $t) {
                            $minSpend = (float)$t['min_spend'];
                            $name = $pdo->quote($t['name']);
                            $caseSql .= "WHEN total_spent >= $minSpend THEN $name ";
                        }
                        $caseSql .= "ELSE 'New' END";
                        $pdo->exec("UPDATE customers SET customer_tier = $caseSql");
                    }
                } catch(Exception $ex) {}
            }
            
            echo json_encode(["message" => "Cập nhật cài đặt thành công"]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Dữ liệu không hợp lệ"]);
    }
    exit();
}
?>
