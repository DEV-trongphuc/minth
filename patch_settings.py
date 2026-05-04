import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Settings.jsx", "r", encoding="utf-8") as f:
    content = f.read()

select_str = """                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          {['success', 'primary', 'warning', 'danger', 'info', 'dark'].map(c => (
                            <div 
                              key={c}
                              onClick={() => updateTier(index, 'color', c)}
                              style={{ 
                                width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer',
                                background: `var(--${c})`,
                                border: tier.color === c ? '2px solid var(--text-main)' : '2px solid transparent',
                                opacity: tier.color === c ? 1 : 0.4,
                                transform: tier.color === c ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.2s'
                              }}
                              title={c}
                            />
                          ))}
                        </div>"""

content = re.sub(r'<select value=\{tier\.color\} onChange=\{e => updateTier\(index, \'color\', e\.target\.value\)\} className="form-control">.*?</select>', select_str, content, flags=re.DOTALL)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Settings.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
