import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add collapsedCategories state
if "const [collapsedCategories, setCollapsedCategories] = useState({});" not in content:
    content = content.replace("const [selectedIds, setSelectedIds] = useState([]);", "const [selectedIds, setSelectedIds] = useState([]);\n  const [collapsedCategories, setCollapsedCategories] = useState({});")

# 2. Update table rendering for categories
old_tr = """<tr style={{ background: 'var(--surface2)' }}>
                    <td colSpan="7" style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={16} /> {cat} <span className="badge badge-muted">{items.length}</span>
                      </div>
                    </td>
                  </tr>
                  {items.map(p => ("""

new_tr = """<tr style={{ background: 'var(--surface2)', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))} onMouseEnter={e => e.currentTarget.style.background='var(--surface)'} onMouseLeave={e => e.currentTarget.style.background='var(--surface2)'}>
                    <td colSpan="7" style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: collapsedCategories[cat] ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                        <Layers size={16} /> {cat} <span className="badge badge-muted">{items.length}</span>
                      </div>
                    </td>
                  </tr>
                  {!collapsedCategories[cat] && items.map(p => ("""

content = content.replace(old_tr, new_tr)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Products.jsx for collapsible categories")
