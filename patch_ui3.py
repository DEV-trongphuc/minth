import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add whiteSpace nowrap to Products.jsx th
content = re.sub(r'<th>(ẢNH|TÊN SẢN PHẨM|TỒN KHO|ĐƠN VỊ NHẬP|QUY ĐỔI BÁN LẺ|THAO TÁC)</th>', r'<th style={{ whiteSpace: "nowrap" }}>\1</th>', content)

# td nowrap
content = content.replace(
    '<td>\n                        <div style={{ fontWeight: 600',
    '<td style={{ whiteSpace: "nowrap" }}>\n                        <div style={{ fontWeight: 600'
)
content = content.replace('<td><span className="badge"', '<td style={{ whiteSpace: "nowrap" }}><span className="badge"')
content = content.replace('<td>\n                        <span className="badge badge-primary"', '<td style={{ whiteSpace: "nowrap" }}>\n                        <span className="badge badge-primary"')

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed Products UI")
