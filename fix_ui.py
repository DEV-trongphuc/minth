import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the broken td flex
old_td = """<td colSpan="7" style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={16} /> {cat} <span className="badge badge-muted">{items.length}</span>
                    </td>"""

new_td = """<td colSpan="7" style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={16} /> {cat} <span className="badge badge-muted">{items.length}</span>
                      </div>
                    </td>"""

content = content.replace(old_td, new_td)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed UI error in Products.jsx")
