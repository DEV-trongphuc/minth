import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the hardcoded unit map with dynamic capitalization
old_str = "{item.unit === 'chai' ? 'Chai' : item.unit === 'hop' ? 'Hộp' : item.unit === 'set' ? 'Set' : 'Cái'}"
new_str = "{item.unit ? item.unit.charAt(0).toUpperCase() + item.unit.slice(1) : 'Sản phẩm'}"

content = content.replace(old_str, new_str)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated unit rendering to be dynamic")
