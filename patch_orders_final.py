with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { Package, Search, Filter, Edit, Eye, Clock, CheckCircle, Truck, DollarSign, XCircle, ShoppingCart, ChevronDown } from 'lucide-react';",
    "import { Package, Search, Filter, Edit, Eye, Clock, CheckCircle, Truck, DollarSign, XCircle, ShoppingCart, ChevronDown, List, LayoutGrid } from 'lucide-react';"
)

# 2. State
content = content.replace(
    "const [statusFilter, setStatusFilter] = useState('all');",
    "const [statusFilter, setStatusFilter] = useState('all');\n  const [viewMode, setViewMode] = useState('list');"
)

# 3. Header toggle
old_header = """        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Package size={24} color="var(--primary)" /> Quản lý Đơn hàng
          </h1>
          <p className="page-sub" style={{ marginTop: '.25rem' }}>Theo dõi hành trình đơn hàng và cập nhật trạng thái giao hàng.</p>
        </div>
      </div>"""

new_header = """        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Package size={24} color="var(--primary)" /> Quản lý Đơn hàng
          </h1>
          <p className="page-sub" style={{ marginTop: '.25rem' }}>Theo dõi hành trình đơn hàng và cập nhật trạng thái giao hàng.</p>
        </div>
        <div className="page-actions">
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Xem dạng danh sách"><List size={16} /></button>
            <button className={`view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} title="Xem dạng card"><LayoutGrid size={16} /></button>
          </div>
        </div>
      </div>"""
content = content.replace(old_header, new_header)

# 4. View Mode render logic
content = content.replace(
    '<div className="table-wrap desktop-only" style={{ overflowX: \'auto\', paddingBottom: \'20px\' }}>',
    '{viewMode === \'list\' ? (\n              <>\n                <div className="table-wrap desktop-only" style={{ overflowX: \'auto\', paddingBottom: \'20px\' }}>'
)

# Replace the closing of the table + opening of mobile-only
content = content.replace(
    """              </table>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="mobile-only">
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredOrders.map(o => {""",
    """              </table>
            </div>

            {/* MOBILE CARD VIEW FOR LIST MODE (FALLBACK) */}
            <div className="mobile-only">
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredOrders.map(o => {"""
)

# Replace the closing of mobile-only
content = content.replace(
    """                })}
              </div>
            </div>
          </>""",
    """                })}
              </div>
            </div>
          </>
            ) : (
              <div className="grid-3-cards" style={{ padding: '1rem' }}>
                {filteredOrders.map(o => {
                  const statusInfo = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                  const payInfo = PAYMENT_CONFIG[o.payment_status] || PAYMENT_CONFIG.unpaid;
                  return (
                    <div key={o.id} className="card hover-card-premium" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          #{o.id}
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditModal(o)} title="Sửa thông tin">
                            <Edit size={16} />
                          </button>
                        </span>
                        <span className="text-xs text-muted">{new Date(o.created_at).toLocaleString('vi-VN')}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div
                          style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '1rem' }}
                          onClick={() => openEditModal(o)}
                          title="Sửa thông tin"
                        >
                          {o.customer_name}
                        </div>
                        <div className="text-sm text-muted">{o.customer_phone}</div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-light)' }}>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Tổng tiền</span>
                        <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1.1rem' }}>{Number(o.total_amount).toLocaleString('vi-VN')} đ</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.75rem', color: payInfo.color, fontWeight: 600, background: 'var(--surface2)', padding: '0.2rem 0.6rem', borderRadius: 'var(--r-full)' }}>
                          {payInfo.icon} {payInfo.label}
                        </span>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px dashed var(--border-light)', display: 'flex', gap: '0.5rem' }}>
                        {o.status === 'pending' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => updateOrderStatus(o.id, 'shipping', o.payment_status)} style={{ flex: 1, padding: '.6rem' }}>
                              <Truck size={14} /> Giao Shiper
                            </button>
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }} onClick={() => updateOrderStatus(o.id, 'cancelled', o.payment_status)}>
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {o.status === 'shipping' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => updateOrderStatus(o.id, 'completed', o.payment_status)} style={{ flex: 1, padding: '.6rem', background: 'var(--success)', borderColor: 'var(--success)' }}>
                              <CheckCircle size={14} /> Hoàn Thành
                            </button>
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }} onClick={() => updateOrderStatus(o.id, 'cancelled', o.payment_status)}>
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {o.status === 'completed' && (
                          <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)', width: '100%', fontSize: '0.8rem', padding: '0.6rem', color: 'var(--text-muted)' }} onClick={() => setActiveDropdown(activeDropdown === o.id ? null : o.id)}>
                              Sửa trạng thái <ChevronDown size={14} style={{ marginLeft: 4 }} />
                            </button>
                            {activeDropdown === o.id && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)}></div>
                                <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '150px', overflow: 'hidden', padding: '0.25rem 0' }} className="anim-scale-in">
                                  <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Chờ xử lý</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Đang giao</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'cancelled', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--danger)' }} className="hover-bg">Hủy đơn</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {o.status === 'cancelled' && (
                          <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)', width: '100%', fontSize: '0.8rem', padding: '0.6rem', color: 'var(--danger)' }} onClick={() => setActiveDropdown(activeDropdown === o.id ? null : o.id)}>
                              Phục hồi đơn <ChevronDown size={14} style={{ marginLeft: 4 }} />
                            </button>
                            {activeDropdown === o.id && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)}></div>
                                <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '150px', overflow: 'hidden', padding: '0.25rem 0' }} className="anim-scale-in">
                                  <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Chờ xử lý</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Đang giao</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'completed', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--success)' }} className="hover-bg">Hoàn thành</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>"""
)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Applied viewMode toggle reliably")
