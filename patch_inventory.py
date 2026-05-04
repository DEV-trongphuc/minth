import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Inventory.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Group products by category
grouped_logic = """
  const groupedProducts = products.reduce((acc, p) => {
    const cat = p.category || 'Chưa phân loại';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});
"""

# Find where products is defined or just before the return
if "const groupedProducts" not in content:
    content = content.replace("const filtered = batches.filter", grouped_logic + "\n  const filtered = batches.filter")

# Replace the select options
old_select = """                    <select className="form-control" required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
                      <option value="">— Chọn sản phẩm —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>"""

new_select = """                    <select className="form-control" required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
                      <option value="">— Chọn sản phẩm —</option>
                      {Object.entries(groupedProducts).map(([cat, items]) => (
                        <optgroup key={cat} label={cat}>
                          {items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                      ))}
                    </select>"""

content = content.replace(old_select, new_select)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Inventory.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Inventory.jsx updated")
