import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix the broken react component opening tag and the header logic
header_str = """    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Users size={24} color="var(--pink)" /> Quản lý Khách hàng (CRM)
          </h1>
          <p className="page-sub" style={{ marginTop: '0.25rem' }}>{customers.length} khách hàng • Phân loại hạng tự động theo chi tiêu.</p>
          <div className="desktop-only" style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '1rem', background: 'var(--surface2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--r-sm)', alignItems: 'center' }}>
            <strong style={{ color: 'var(--text)' }}>Hướng dẫn phân hạng:</strong>
            {crmTiers.map(t => (
              <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className={`badge badge-${t.color}`} style={{ padding: '0.1rem 0.3rem' }}>{t.name}</span>
                {t.min_spend > 0 ? `> ${(t.min_spend).toLocaleString('vi-VN')}đ` : 'Mặc định'}
              </span>
            ))}
          </div>
        </div>"""

content = re.sub(r'<div className="anim-fade-up".*?</div>\s*</div>\s*style=\{\{ padding: \'0\.1rem 0\.3rem\' \}\}>VIP.*?</div>\s*</div>', header_str, content, flags=re.DOTALL)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
