import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

old_str = '<div className="text-xs text-muted" style={{ marginTop: \'0.2rem\', display: \'flex\', flexDirection: \'column\', gap: \'0.1rem\' }}><span>Doanh thu: <b style={{color:"var(--primary)"}}>{Number(p.revenue).toLocaleString(\'vi-VN\')} đ</b></span><span>Lãi: <b style={{color:"var(--success)"}}>{Number(p.profit).toLocaleString(\'vi-VN\')} đ</b></span><span>SL: {(p.chai_sales > 0 ? p.chai_sales + " chai " : "") + (p.ml_sales > 0 ? p.ml_sales + " ml" : "") + (p.other_sales > 0 ? p.other_sales + " " + p.unit : "")}</span></div>'

new_str = '<div className="text-xs text-muted" style={{ marginTop: \'0.25rem\', lineHeight: \'1.4\' }}><span style={{color:"var(--primary)", fontWeight: 700}}>{Number(p.revenue).toLocaleString(\'vi-VN\')} đ</span> &bull; Lãi: <span style={{color:"var(--success)", fontWeight: 600}}>{Number(p.profit).toLocaleString(\'vi-VN\')} đ</span><br/>SL: <span style={{fontWeight: 600, color: "var(--text)"}}>{(p.chai_sales > 0 ? p.chai_sales + " chai " : "") + (p.ml_sales > 0 ? p.ml_sales + " ml" : "") + (p.other_sales > 0 ? p.other_sales + " " + p.unit : "")}</span></div>'

content = content.replace(old_str, new_str)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated top products UI")
