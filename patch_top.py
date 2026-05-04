import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Top Products to show Quantity and Profit
top_products_regex = r'\{\/\* Top Products \(Span 4 cols\) \*\/\}.*?\{\/\* Heatmap'
top_products_match = re.search(top_products_regex, content, re.DOTALL)

if top_products_match:
    old_top_products = top_products_match.group(0)
    new_top_products = old_top_products.replace(
        '<div className="text-xs text-muted" style={{ marginTop: \'0.1rem\' }}>{Number(p.revenue).toLocaleString(\'vi-VN\')} đ</div>',
        '<div className="text-xs text-muted" style={{ marginTop: \'0.2rem\', display: \'flex\', flexDirection: \'column\', gap: \'0.1rem\' }}><span>Doanh thu: <b style={{color:"var(--primary)"}}>{Number(p.revenue).toLocaleString(\'vi-VN\')} đ</b></span><span>Lãi: <b style={{color:"var(--success)"}}>{Number(p.profit).toLocaleString(\'vi-VN\')} đ</b></span><span>SL: {(p.chai_sales > 0 ? p.chai_sales + " chai " : "") + (p.ml_sales > 0 ? p.ml_sales + " ml" : "") + (p.other_sales > 0 ? p.other_sales + " " + p.unit : "")}</span></div>'
    )
    content = content.replace(old_top_products, new_top_products)

# 2. Update Bar Chart y-axis and dataset
bar_chart_regex = r'// Weekday Bar Chart \(Ngày vàng\).*?const barData = \{.*?\};'
bar_chart_match = re.search(bar_chart_regex, content, re.DOTALL)

if bar_chart_match:
    old_bar = bar_chart_match.group(0)
    new_bar = """// Weekday Bar Chart (Ngày vàng)
  const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const wd = report.weekday_sales || {};
  const weekdayData = [
    Number(wd[1] || wd["1"] || 0),
    Number(wd[2] || wd["2"] || 0),
    Number(wd[3] || wd["3"] || 0),
    Number(wd[4] || wd["4"] || 0),
    Number(wd[5] || wd["5"] || 0),
    Number(wd[6] || wd["6"] || 0),
    Number(wd[7] || wd["7"] || 0)
  ];
  
  const barData = {
    labels: weekdayLabels,
    datasets: [{
      label: 'Đơn hàng',
      data: weekdayData,
      backgroundColor: weekdayData.map(val => (val > 0 && val >= Math.max(...weekdayData) * 0.7) ? '#f59e0b' : '#e5e7eb'),
      borderRadius: 4,
    }]
  };"""
    content = content.replace(old_bar, new_bar)

# 3. Bar Chart options: show y-axis
content = content.replace(
    'scales: { x: { grid: { display: false }, ticks: { font: { size: 9 }, maxTicksLimit: 12 } }, y: { display: false } }',
    'scales: { x: { grid: { display: false }, ticks: { font: { size: 9 }, maxTicksLimit: 12 } }, y: { display: true, beginAtZero: true, ticks: { precision: 0 } } }'
)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated dashboard with Top Products stats and Bar chart data fixes.")
