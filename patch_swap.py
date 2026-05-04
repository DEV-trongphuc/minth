import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update state from hourly_sales to weekday_sales
content = content.replace("hourly_sales: []", "weekday_sales: {}")

# 2. Update Bar Chart logic to Weekday
old_bar_logic = """  // Hourly Bar Chart (Giờ vàng)
  const hourlyLabels = Array.from({length: 24}, (_, i) => `${i}h`);
  const hourlyData = report.hourly_sales || Array(24).fill(0);
  
  const barData = {
    labels: hourlyLabels,
    datasets: [{
      label: 'Đơn hàng',
      data: hourlyData,
      backgroundColor: hourlyData.map(val => val > Math.max(...hourlyData) * 0.7 ? '#f59e0b' : '#e5e7eb'),
      borderRadius: 4,
    }]
  };"""

new_bar_logic = """  // Weekday Bar Chart (Ngày vàng)
  const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const weekdayDataObj = report.weekday_sales || {};
  // MySQL DAYOFWEEK: 1=Sun, 2=Mon ... 7=Sat
  const weekdayData = [
    weekdayDataObj["1"] || 0,
    weekdayDataObj["2"] || 0,
    weekdayDataObj["3"] || 0,
    weekdayDataObj["4"] || 0,
    weekdayDataObj["5"] || 0,
    weekdayDataObj["6"] || 0,
    weekdayDataObj["7"] || 0
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

content = content.replace(old_bar_logic, new_bar_logic)

# 3. Fix badge color bug in Top Products
old_badge = "background: i < 3 ? `var(--primary-${i===0?'dark':(i===1?'DEFAULT':'light')})` : 'var(--surface2)'"
new_badge = "background: i < 3 ? `var(--primary${i===0?'-dark':(i===2?'-light':'')})` : 'var(--surface2)'"
content = content.replace(old_badge, new_badge)

# 4. Swap Cards
# We need to swap the "Heatmap/Bar Chart" card and "Donut & Geo" card.
heatmap_card_regex = r'\{\/\* Heatmap/Bar Chart \(Span 4 cols\) \*\/\}.*?(?=\{\/\* Top Products)'
donut_card_regex = r'\{\/\* Donut & Geo \(Span 4 cols\) \*\/\}.*?(?=\{\/\* Inventory Tabs)'

heatmap_match = re.search(heatmap_card_regex, content, re.DOTALL)
donut_match = re.search(donut_card_regex, content, re.DOTALL)

if heatmap_match and donut_match:
    heatmap_str = heatmap_match.group(0)
    donut_str = donut_match.group(0)
    
    # Also we need to change the titles of the heatmap string to "Ngày Vàng"
    heatmap_str = heatmap_str.replace("Giờ Vàng", "Ngày Vàng").replace("khung giờ", "ngày trong tuần")

    content = content.replace(heatmap_match.group(0), "___DONUT_PLACEHOLDER___")
    content = content.replace(donut_match.group(0), "___HEATMAP_PLACEHOLDER___")
    
    content = content.replace("___DONUT_PLACEHOLDER___", donut_str)
    content = content.replace("___HEATMAP_PLACEHOLDER___", heatmap_str)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Dashboard patched")
