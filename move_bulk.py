import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Find the bulk action bar code
bulk_start = content.find("{/* BULK ACTION BAR */}")
bulk_end = content.find("{/* BULK CATEGORY MODAL */}")

if bulk_start != -1 and bulk_end != -1:
    bulk_code = content[bulk_start:bulk_end]
    # Remove from old position
    content = content[:bulk_start] + content[bulk_end:]
    
    # Modify the CSS of the bulk bar to make it fit in the flow
    old_css = "position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--text)', color: '#fff', padding: '1rem 2rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 100"
    new_css = "background: 'var(--text)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'"
    
    bulk_code = bulk_code.replace(old_css, new_css)
    
    # Insert it near the search wrap
    search_wrap_pos = content.find("<div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>")
    
    if search_wrap_pos != -1:
        content = content[:search_wrap_pos] + bulk_code + "\n      " + content[search_wrap_pos:]

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Moved bulk bar")
