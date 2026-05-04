import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

donut_regex = r'\{\/\* Donut & Geo \(Span 4 cols\) \*\/\}.*?\{\/\* Top Products'
donut_match = re.search(donut_regex, content, re.DOTALL)

if donut_match:
    donut_str = donut_match.group(0)
    # Remove the borderTop and everything below it inside Donut card
    donut_str = re.sub(r'<div style={{ borderTop: \'1px solid var\(--border-light\)\'.*?</div>\s*</div>', '</div>', donut_str, flags=re.DOTALL)
    content = content.replace(donut_match.group(0), donut_str)

# Now, we want to append a new card at the bottom of the grid
# Find the end of the bento-grid
bento_end_regex = r'\{\/\* SETUP MODAL \*\/\}'
bento_end_match = re.search(bento_end_regex, content)

if bento_end_match:
    new_card = """
        {/* Top Regions & Customers (Span 12 cols on desktop/mobile) */}
        <div className="card bento-span-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', padding: '1.5rem' }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><MapPin size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', color: 'var(--primary)' }}/> Khu vực Mua nhiều nhất</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(!report.geo_sales || report.geo_sales.length === 0) && <div className="text-muted text-sm">Chưa có dữ liệu</div>}
              {(report.geo_sales || []).slice(0, 5).map((g, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{g.region || 'Không xác định'}</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{Number(g.revenue).toLocaleString('vi-VN')} đ</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><Users size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', color: 'var(--success)' }}/> Top Khách hàng VIP</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(!report.top_customers || report.top_customers.length === 0) && <div className="text-muted text-sm">Chưa có dữ liệu</div>}
              {(report.top_customers || []).slice(0, 5).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</span>
                    <span className="text-xs text-muted">{c.phone || c.email || 'Chưa cập nhật'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>{Number(c.total_spent).toLocaleString('vi-VN')} đ</span>
                    <span className="text-xs text-muted">{c.order_count} đơn</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
"""
    # Replace the closing div of the bento-grid with the new card and then the closing div
    content = content.replace('      </div>\n\n      {/* SETUP MODAL */}', new_card + '\n      {/* SETUP MODAL */}')

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Added new card for Top Regions and Customers.")
