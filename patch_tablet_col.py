import re

with open("F:\\HAMIEN_LUCCY\\src\\index.css", "r", encoding="utf-8") as f:
    content = f.read()

if ".hide-on-tablet" not in content:
    content += "\n@media (max-width: 1024px) {\n  .hide-on-tablet {\n    display: none !important;\n  }\n}\n"
    with open("F:\\HAMIEN_LUCCY\\src\\index.css", "w", encoding="utf-8") as f:
        f.write(content)
    print("Added .hide-on-tablet to index.css")

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('<th style={{ whiteSpace: "nowrap" }}>Thanh toán</th>', '<th style={{ whiteSpace: "nowrap" }} className="hide-on-tablet">Thanh toán</th>')
content = content.replace('<td style={{ whiteSpace: "nowrap" }}>\n                          <span style={{ display: \'flex\', alignItems: \'center\', gap: \'.25rem\', fontSize: \'.8rem\', color: payInfo.color, fontWeight: 500 }}>', '<td style={{ whiteSpace: "nowrap" }} className="hide-on-tablet">\n                          <span style={{ display: \'flex\', alignItems: \'center\', gap: \'.25rem\', fontSize: \'.8rem\', color: payInfo.color, fontWeight: 500 }}>')

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Applied hide-on-tablet in Orders.jsx")
