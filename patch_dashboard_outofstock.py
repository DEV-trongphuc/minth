import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix "Còn 0 Chai" to "Hết hàng"
old_render = r"<span style={{ fontWeight: 700, color: 'var\(--warning-dark\)', background: 'var\(--warning-bg\)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Còn \{item.qty\} \{item.unit === 'chai' \? 'Chai' : item.unit === 'hop' \? 'Hộp' : item.unit === 'set' \? 'Set' : 'Cái'\} \{Number\(item.ml\) > 0 \? `- \$\{item.ml\} ml` : ''\}</span>"

new_render = """{Number(item.qty) === 0 && Number(item.ml) === 0 ? (
                         <span style={{ fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Hết hàng</span>
                       ) : (
                         <span style={{ fontWeight: 700, color: 'var(--warning-dark)', background: 'var(--warning-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Còn {item.qty} {item.unit === 'chai' ? 'Chai' : item.unit === 'hop' ? 'Hộp' : item.unit === 'set' ? 'Set' : 'Cái'} {Number(item.ml) > 0 ? `- ${item.ml} ml` : ''}</span>
                       )}"""

content = re.sub(old_render, new_render, content)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed out of stock UI rendering in Dashboard.jsx")
