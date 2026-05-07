import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Inventory.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add whiteSpace nowrap to Inventory.jsx th
content = re.sub(r'<th>(Sản phẩm & Mã lô|Ngày nhập / HSD|Giá vốn|Tồn kho|Trạng thái)</th>', r'<th style={{ whiteSpace: "nowrap" }}>\1</th>', content)

# Add whiteSpace nowrap to td in Inventory.jsx
content = content.replace(
    '<td>\n                        <div className="text-sm text-muted">Nhập: {b.import_date}</div>',
    '<td style={{ whiteSpace: "nowrap" }}>\n                        <div className="text-sm text-muted">Nhập: {b.import_date}</div>'
)
content = content.replace('<td style={{ fontWeight: 700 }}>{Number(b.import_price).toLocaleString(\'vi-VN\')} đ</td>', '<td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{Number(b.import_price).toLocaleString(\'vi-VN\')} đ</td>')
content = content.replace(
    '<td>\n                        <div style={{ fontWeight: 600, color: b.current_qty <= lowStockThreshold ? \'var(--danger)\' : \'var(--text)\' }}>',
    '<td style={{ whiteSpace: "nowrap" }}>\n                        <div style={{ fontWeight: 600, color: b.current_qty <= lowStockThreshold ? \'var(--danger)\' : \'var(--text)\' }}>'
)
content = content.replace('<td><span className={`badge ${s.cls}`}>{s.label}</span></td>', '<td style={{ whiteSpace: "nowrap" }}><span className={`badge ${s.cls}`}>{s.label}</span></td>')

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Inventory.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed Inventory UI")
