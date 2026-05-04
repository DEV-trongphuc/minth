import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Inventory.jsx", "r", encoding="utf-8") as f:
    content = f.read()

grouped_logic = """
  const groupedProducts = products.reduce((acc, p) => {
    const cat = p.category || 'Chưa phân loại';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});
"""

if "const groupedProducts" not in content:
    content = content.replace("const filtered = batches", grouped_logic + "\n  const filtered = batches")

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Inventory.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed Inventory.jsx")
