import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace all occurrences of Number(expr).toLocaleString('vi-VN') with Math.round(Number(expr)).toLocaleString('vi-VN')
# but we need to be careful with parentheses. 
# A safer way: replace `toLocaleString('vi-VN')` calls where it's used for money.
# Actually, the user specifically mentioned "tiền lợi nhuận làm tròn ko có phẩy" (profit money rounded no decimals).
# I'll round gross_profit, total_revenue, aov, total_shipping, op_cost, p.revenue, p.profit, g.revenue, c.total_spent.

def replacer(match):
    # match.group(1) is the Number(...) part
    return "Math.round(" + match.group(1) + ").toLocaleString('vi-VN')"

content = re.sub(r"(Number\([^)]+\))\.toLocaleString\('vi-VN'\)", replacer, content)

# But wait, what if there are nested parentheses like Number((report.total_shipping || 0) + (report.op_cost || 0)) ?
# regex `Number\([^)]+\)` won't match `Number((...))` correctly because of `[^)]+`.
content = content.replace("Number(report.total_revenue || 0).toLocaleString('vi-VN')", "Math.round(Number(report.total_revenue || 0)).toLocaleString('vi-VN')")
content = content.replace("Number(report.gross_profit || 0).toLocaleString('vi-VN')", "Math.round(Number(report.gross_profit || 0)).toLocaleString('vi-VN')")
content = content.replace("Number(report.aov || 0).toLocaleString('vi-VN')", "Math.round(Number(report.aov || 0)).toLocaleString('vi-VN')")
content = content.replace("Number((report.total_shipping || 0) + (report.op_cost || 0)).toLocaleString('vi-VN')", "Math.round(Number((report.total_shipping || 0) + (report.op_cost || 0))).toLocaleString('vi-VN')")
content = content.replace("Number((report.gross_profit || 0) - ((report.total_shipping || 0) + (report.op_cost || 0))).toLocaleString('vi-VN')", "Math.round(Number((report.gross_profit || 0) - ((report.total_shipping || 0) + (report.op_cost || 0)))).toLocaleString('vi-VN')")
content = content.replace("Number(p.revenue).toLocaleString('vi-VN')", "Math.round(Number(p.revenue)).toLocaleString('vi-VN')")
content = content.replace("Number(p.profit).toLocaleString('vi-VN')", "Math.round(Number(p.profit)).toLocaleString('vi-VN')")
content = content.replace("Number(g.revenue).toLocaleString('vi-VN')", "Math.round(Number(g.revenue)).toLocaleString('vi-VN')")
content = content.replace("Number(c.total_spent).toLocaleString('vi-VN')", "Math.round(Number(c.total_spent)).toLocaleString('vi-VN')")
content = content.replace("Number(c.raw).toLocaleString('vi-VN')", "Math.round(Number(c.raw)).toLocaleString('vi-VN')")

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Rounded profit and money values")
