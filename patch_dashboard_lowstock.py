import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix low_stock rendering in Dashboard.jsx
old_render = """<div className="text-xs text-muted">Đơn vị: {item.unit}</div>
                       </div>
                       <span style={{ fontWeight: 700, color: 'var(--warning-dark)', background: 'var(--warning-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>Còn {item.qty}</span>"""

new_render = """<div className="text-xs text-muted">Lô: {item.batch_code}</div>
                       </div>
                       <span style={{ fontWeight: 700, color: 'var(--warning-dark)', background: 'var(--warning-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Còn {item.qty} {item.unit === 'chai' ? 'Chai' : item.unit === 'hop' ? 'Hộp' : item.unit === 'set' ? 'Set' : 'Cái'} {Number(item.ml) > 0 ? `- ${item.ml} ml` : ''}</span>"""

content = content.replace(old_render, new_render)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed low_stock UI rendering in Dashboard.jsx")
