import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix table-wrap overflow
content = content.replace(
    '<div className="table-wrap desktop-only" style={{ overflow: \'visible\' }}>',
    '<div className="table-wrap desktop-only" style={{ overflowX: \'auto\', paddingBottom: \'20px\' }}>'
)

# Add whiteSpace nowrap to th and td in Orders
content = re.sub(r'<th>(Mã Đơn|Khách hàng|Tổng tiền|Thanh toán|Trạng thái|Ngày tạo)</th>', r'<th style={{ whiteSpace: "nowrap" }}>\1</th>', content)
content = re.sub(r'<td style={{ fontWeight: 700, color: \'var\(--primary\)\' }}>', r'<td style={{ fontWeight: 700, color: \'var(--primary)\', whiteSpace: "nowrap" }}>', content)
content = content.replace('<td style={{ fontWeight: 700 }}>{Number(o.total_amount).toLocaleString', '<td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{Number(o.total_amount).toLocaleString')
content = content.replace('<td className="text-sm text-muted">{new Date(o.created_at).toLocaleString(\'vi-VN\')}</td>', '<td className="text-sm text-muted" style={{ whiteSpace: "nowrap" }}>{new Date(o.created_at).toLocaleString(\'vi-VN\')}</td>')
content = content.replace('<td>\n                          <span style={{ display: \'flex\', alignItems: \'center\', gap: \'.25rem\', fontSize: \'.8rem\', color: payInfo.color, fontWeight: 500 }}>', '<td style={{ whiteSpace: "nowrap" }}>\n                          <span style={{ display: \'flex\', alignItems: \'center\', gap: \'.25rem\', fontSize: \'.8rem\', color: payInfo.color, fontWeight: 500 }}>')
content = content.replace('<td>\n                          <span className="badge"', '<td style={{ whiteSpace: "nowrap" }}>\n                          <span className="badge"')

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed Orders UI")
