import re

with open("F:\\HAMIEN_LUCCY\\api\\reports.php", "r", encoding="utf-8") as f:
    content = f.read()

old_low_stock = """$stmtLowStock = $pdo->query("
            SELECT p.name, b.current_qty as qty, b.batch_code as unit 
            FROM batches b
            JOIN products p ON b.product_id = p.id
            WHERE b.current_qty <= 5
            ORDER BY b.current_qty ASC
            LIMIT 5
        ");"""

new_low_stock = """$stmtLowStock = $pdo->query("
            SELECT p.name, p.unit, b.batch_code, b.current_qty as qty, b.current_ml as ml 
            FROM batches b
            JOIN products p ON b.product_id = p.id
            WHERE b.status != 'archived' AND (b.current_qty <= 5)
            ORDER BY b.current_qty ASC, b.current_ml ASC
            LIMIT 5
        ");"""

content = content.replace(old_low_stock, new_low_stock)

with open("F:\\HAMIEN_LUCCY\\api\\reports.php", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed low_stock query in reports.php")
