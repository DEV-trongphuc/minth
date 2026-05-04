import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the detail modal completely
modal_target_regex = r'\{detailItem && createPortal\(.*?document\.body\s*\)\}'

modal_replacement = """{detailItem && createPortal(
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal" style={{ maxWidth: 850, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="customer-avatar" style={{ width: 52, height: 52, borderRadius: 14, fontSize: '1.5rem', background: getTierConfig(detailItem.tier).bg }}>{detailItem.name.charAt(0)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h2 className="modal-title">{detailItem.name}</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge ${getTierConfig(detailItem.tier).cls}`}>{detailItem.tier}</span>
                    {detailItem.tags && (() => {
                      try {
                        const tags = typeof detailItem.tags === 'string' ? JSON.parse(detailItem.tags) : detailItem.tags;
                        if (!tags || tags.length === 0) return null;
                        return tags.map((t, i) => {
                          const tagConfig = crmTags.find(x => x.name === t);
                          return <span key={i} style={{ background: tagConfig?.color || '#ec4899', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 600 }}>{t}</span>;
                        });
                      } catch(e) { return null; }
                    })()}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetailItem(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                
                {/* Left Column: Personal Info & Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem' }}>
                    {[
                      { label: 'Tổng chi tiêu', val: `${Number(detailItem.total_spent || 0).toLocaleString('vi-VN')} đ`, icon: <TrendingUp size={16} color="var(--primary)" /> },
                      { label: 'Số đơn hàng', val: `${detailItem.order_count || 0} đơn`, icon: <ShoppingBag size={16} color="var(--success)" /> },
                      { label: 'Mua lần cuối', val: detailItem.last_order || '—', icon: <Calendar size={16} color="var(--warning)" /> },
                    ].map(info => (
                      <div key={info.label} style={{ background: 'var(--surface2)', padding: '.75rem', borderRadius: 'var(--r-sm)', textAlign: 'center' }}>
                        <div style={{ marginBottom: '.35rem' }}>{info.icon}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.2rem' }}>{info.label}</div>
                        <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{info.val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {[
                      ['SĐT', detailItem.phone], 
                      ['Email', detailItem.email || 'Chưa cập nhật'],
                      ['Giới tính', detailItem.gender || 'Chưa cập nhật'], 
                      ['Ngày sinh', detailItem.birthday && !isNaN(new Date(detailItem.birthday)) ? new Date(detailItem.birthday).toLocaleDateString('vi-VN') : 'Chưa cập nhật'], 
                      ['Địa chỉ', detailItem.address || 'Chưa có'], 
                      ['Ghi chú', detailItem.note || 'Trống']
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: '1rem', padding: '.625rem 0', borderBottom: '1px solid var(--border-light)' }}>
                        <span className="text-sm text-muted" style={{ minWidth: 80 }}>{k}:</span>
                        <span className="text-sm" style={{ fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Order History */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>Lịch sử Đơn hàng</h3>
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px', paddingRight: '0.5rem' }}>
                    {loadingOrders ? (
                      <div className="text-center text-muted" style={{ padding: '2rem' }}>Đang tải...</div>
                    ) : customerOrders.length === 0 ? (
                      <div className="text-center text-muted" style={{ padding: '2rem', background: 'var(--surface2)', borderRadius: '8px' }}>Khách hàng chưa có đơn hàng nào</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {customerOrders.map(o => (
                          <div key={o.id} onClick={() => viewOrderDetails(o)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'all 0.2s' }} className="hover-shadow">
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem', color: 'var(--text)' }}>Đơn #{o.id}</div>
                              <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Calendar size={12} /> {o.created_at}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '0.35rem', fontSize: '1.05rem' }}>{Number(o.final_amount).toLocaleString('vi-VN')} đ</div>
                              <span className={`badge ${o.status === 'completed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                                {o.status === 'completed' ? 'Hoàn thành' : o.status === 'cancelled' ? 'Đã hủy' : 'Đang xử lý'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => { setDetailItem(null); openEdit(detailItem); }}><Edit size={15} /> Chỉnh sửa Thông tin</button>
              <button className="btn btn-primary" onClick={() => handleCreateOrder(detailItem)}><ShoppingBag size={15} /> Tạo đơn mới</button>
            </div>
          </div>
        </div>,
        document.body
      )}"""

content = re.sub(modal_target_regex, modal_replacement, content, flags=re.DOTALL)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done modal")
