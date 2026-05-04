import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Pos.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add Layers icon
imports_replacement = "import { ShoppingCart, Search, Trash2, CreditCard, Printer, UserPlus, CheckCircle, Package, Plus, ChevronDown, Truck, Layers } from 'lucide-react';"
content = re.sub(r"import \{ ShoppingCart.*?\} from 'lucide-react';", imports_replacement, content)

# Group logic
grouped_logic = """  const groupedBatches = filteredBatches.reduce((acc, b) => {
    const cat = b.category || 'Khác (Chưa phân loại)';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});"""
  
if "const groupedBatches" not in content:
    content = content.replace("const addToCart =", grouped_logic + "\n\n  const addToCart =")

# Replace the map
old_map = """          {filteredBatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Package size={40} opacity={0.3} />
              <p style={{ margin: 0 }}>Chưa có sản phẩm nào trong kho để bán.</p>
              <button className="btn btn-primary btn-sm" onClick={() => { if (onClose) onClose(); navigate('/inventory'); }}>
                <Plus size={14} /> Đến trang Nhập kho
              </button>
            </div>
          ) : filteredBatches.map(batch => ("""

new_map = """          {filteredBatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Package size={40} opacity={0.3} />
              <p style={{ margin: 0 }}>Chưa có sản phẩm nào trong kho để bán.</p>
              <button className="btn btn-primary btn-sm" onClick={() => { if (onClose) onClose(); navigate('/inventory'); }}>
                <Plus size={14} /> Đến trang Nhập kho
              </button>
            </div>
          ) : Object.entries(groupedBatches).map(([cat, batchesInCat]) => (
            <div key={cat} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
                <Layers size={16} color={cat.includes('Khác') ? 'var(--text-muted)' : 'var(--primary)'} />
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>{cat}</span>
                <span className="badge badge-muted" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>{batchesInCat.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {batchesInCat.map(batch => ("""
content = content.replace(old_map, new_map)

# Close the new map
old_close = """              </div>
            </div>
          ))}
        </div>"""
new_close = """              </div>
            </div>
          ))}
              </div>
            </div>
          ))}
        </div>"""
content = content.replace(old_close, new_close)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Pos.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Pos.jsx updated")
