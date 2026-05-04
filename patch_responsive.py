import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.25rem' }}>
content = content.replace("style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.25rem' }}", "className=\"bento-grid\"")

# Replace style={{ gridColumn: 'span 8', minHeight: '320px', display: 'flex', flexDirection: 'column' }}
content = content.replace("className=\"card\" style={{ gridColumn: 'span 8'", "className=\"card bento-span-8\" style={{ ")

# Replace style={{ gridColumn: 'span 4', minHeight: '320px', display: 'flex', flexDirection: 'column' }}
content = content.replace("className=\"card\" style={{ gridColumn: 'span 4'", "className=\"card bento-span-4\" style={{ ")

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Dashboard responsive classes applied")
