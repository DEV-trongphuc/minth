import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, Edit, Eye, Clock, CheckCircle, Truck, DollarSign, XCircle, ShoppingCart, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useDialog } from '../components/ui/DialogContext';
import POS from './POS';

const STATUS_CONFIG = {
  pending: { label: 'Chờ xử lý', color: 'var(--warning)', bg: 'var(--warning-bg)', icon: <Clock size={14} /> },
  shipping: { label: 'Đang giao', color: 'var(--primary)', bg: 'var(--primary-light)', icon: <Truck size={14} /> },
  completed: { label: 'Hoàn thành', color: 'var(--success)', bg: 'var(--success-bg)', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'Đã hủy', color: 'var(--danger)', bg: 'var(--danger-bg)', icon: <XCircle size={14} /> }
};

const PAYMENT_CONFIG = {
  paid: { label: 'Đã thanh toán', color: 'var(--success)', icon: <DollarSign size={14} /> },
  unpaid: { label: 'Chưa thanh toán (COD)', color: 'var(--warning)', icon: <Clock size={14} /> }
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPOS, setShowPOS] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const { showConfirm, showAlert } = useDialog();

  useEffect(() => {
    fetchOrders();
    
    // Check for draft customer passed from Customers page
    try {
      const draft = localStorage.getItem('luccy_pos_customer_draft');
      if (draft) {
        setShowPOS(true);
      }
    } catch(e) {}
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders.php`);
      if (res.ok) setOrders(await res.json());
    } catch {}
    setLoading(false);
  };

  const updateOrderStatus = async (id, newStatus, currentPaymentStatus) => {
    const isCompleted = newStatus === 'completed';
    const isCancelled = newStatus === 'cancelled';
    const paymentStatus = isCompleted ? 'paid' : currentPaymentStatus;

    let title = '';
    let message = '';
    
    if (isCompleted) {
      title = 'Xác nhận Giao Thành công';
      message = 'Đơn hàng này sẽ được chuyển sang Hoàn thành. Hệ thống sẽ tự động cập nhật Trạng thái thanh toán thành Đã thu tiền (nếu trước đó là COD).';
    } else if (isCancelled) {
      title = 'Cảnh báo: Hủy đơn hàng';
      message = 'Lưu ý cực kỳ quan trọng: Hành động này sẽ hoàn trả lại toàn bộ số lượng/ml vào Kho, và trừ lại Doanh thu của khách hàng này. Bạn có chắc chắn muốn hủy?';
    } else if (newStatus === 'shipping') {
      title = 'Chuyển cho Shipper';
      message = 'Đơn hàng sẽ được cập nhật thành Đang giao. Số lượng trong kho đã được cấn trừ từ lúc tạo đơn nên sẽ không thay đổi.';
    }

    showConfirm(title, message, async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus, payment_status: paymentStatus })
        });
        if (res.ok) {
          showAlert('Thành công', 'Cập nhật trạng thái đơn hàng thành công!', 'success');
          fetchOrders();
        } else {
          showAlert('Lỗi', 'Không thể cập nhật trạng thái', 'danger');
        }
      } catch {
        showAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'danger');
      }
    }, isCancelled ? 'danger' : 'primary');
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch = (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) || 
                        (o.customer_phone || '').includes(search) || 
                        o.id.toString() === search;
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Package size={24} color="var(--primary)" /> Quản lý Đơn hàng
          </h1>
          <p className="page-sub" style={{ marginTop: '.25rem' }}>Theo dõi hành trình đơn hàng và cập nhật trạng thái giao hàng.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--text-light)" />
          <input className="form-control" placeholder="Tìm theo mã đơn, SĐT hoặc Tên khách..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Desktop Filter */}
        <div className="desktop-only" style={{ display: 'flex', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden', flexShrink: 0 }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ xử lý' },
            { id: 'shipping', label: 'Đang giao' },
            { id: 'completed', label: 'Hoàn thành' }
          ].map(t => (
            <button key={t.id} onClick={() => setStatusFilter(t.id)} style={{ padding: '.45rem .875rem', border: 'none', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '.825rem', fontWeight: 600, transition: 'all .2s', background: statusFilter === t.id ? 'var(--primary)' : 'transparent', color: statusFilter === t.id ? '#fff' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
        
        {/* Mobile Filter Dropdown */}
        <div className="mobile-only" style={{ width: '100%' }}>
          <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '0.65rem 1rem', fontWeight: 600, background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'pending', label: 'Chờ xử lý' },
              { id: 'shipping', label: 'Đang giao' },
              { id: 'completed', label: 'Hoàn thành' }
            ].map(t => <option key={t.id} value={t.id}>Trạng thái: {t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card card-no-pad" style={{ overflow: 'visible' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'var(--surface2)', borderRadius: 'var(--r-md)', border: '1px dashed var(--border)' }}>
            <ShoppingCart size={48} opacity={0.2} color="var(--primary)" />
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>Chưa có đơn hàng nào</h3>
              <p style={{ margin: 0 }}>Hãy bắt đầu bán hàng và tạo đơn hàng đầu tiên của bạn!</p>
            </div>
            <button className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', fontSize: '1rem' }} onClick={() => setShowPOS(true)}>
              Tạo đơn hàng ngay
            </button>
          </div>
        ) : (
          <>
          <div className="table-wrap desktop-only" style={{ overflow: 'visible' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Đơn</th>
                  <th>Khách hàng</th>
                  <th>Tổng tiền</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th style={{ width: 140 }}>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => {
                  const statusInfo = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                  const payInfo = PAYMENT_CONFIG[o.payment_status] || PAYMENT_CONFIG.unpaid;
                  
                  return (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>#{o.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                        <div className="text-xs text-muted">{o.customer_phone}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{Number(o.total_amount).toLocaleString('vi-VN')} đ</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.8rem', color: payInfo.color, fontWeight: 500 }}>
                          {payInfo.icon} {payInfo.label}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, display: 'flex', alignItems: 'center', gap: '.25rem', width: 'fit-content' }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </td>
                      <td className="text-sm text-muted">{new Date(o.created_at).toLocaleString('vi-VN')}</td>
                      <td>
                        {o.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '.25rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => updateOrderStatus(o.id, 'shipping', o.payment_status)} style={{ flex: 1, fontSize: '.75rem', padding: '.4rem' }}>
                              <Truck size={12} /> Giao Shiper
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => updateOrderStatus(o.id, 'cancelled', o.payment_status)} title="Hủy đơn">
                              <XCircle size={14} />
                            </button>
                          </div>
                        )}
                        {o.status === 'shipping' && (
                          <div style={{ display: 'flex', gap: '.25rem' }}>
                            <button className="btn btn-success btn-sm" onClick={() => updateOrderStatus(o.id, 'completed', o.payment_status)} style={{ flex: 1, fontSize: '.75rem', padding: '.4rem', background: 'var(--success)', borderColor: 'var(--success)' }}>
                              <CheckCircle size={12} /> Hoàn Thành
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => updateOrderStatus(o.id, 'cancelled', o.payment_status)} title="Hủy đơn">
                              <XCircle size={14} />
                            </button>
                          </div>
                        )}
                        {o.status === 'completed' && (
                          <div style={{ position: 'relative' }}>
                            <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)', fontSize: '0.75rem', padding: '0.35rem 0.6rem', color: 'var(--text-muted)' }} onClick={() => setActiveDropdown(activeDropdown === o.id ? null : o.id)}>
                              Sửa trạng thái <ChevronDown size={14} style={{ marginLeft: 4 }} />
                            </button>
                            {activeDropdown === o.id && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)}></div>
                                <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '130px', overflow: 'hidden', padding: '0.25rem 0' }} className="anim-scale-in">
                                  <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Về Chờ xử lý</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Về Đang giao</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'cancelled', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--danger)' }} className="hover-bg">Hủy đơn</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {o.status === 'cancelled' && (
                          <div style={{ position: 'relative' }}>
                            <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)', fontSize: '0.75rem', padding: '0.35rem 0.6rem', color: 'var(--danger)' }} onClick={() => setActiveDropdown(activeDropdown === o.id ? null : o.id)}>
                              Phục hồi đơn <ChevronDown size={14} style={{ marginLeft: 4 }} />
                            </button>
                            {activeDropdown === o.id && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)}></div>
                                <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '130px', overflow: 'hidden', padding: '0.25rem 0' }} className="anim-scale-in">
                                  <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Về Chờ xử lý</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Về Đang giao</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'completed', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--success)' }} className="hover-bg">Về Hoàn thành</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="mobile-only">
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredOrders.map(o => {
                const statusInfo = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                const payInfo = PAYMENT_CONFIG[o.payment_status] || PAYMENT_CONFIG.unpaid;
                return (
                  <div key={o.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>#{o.id}</span>
                      <span className="text-xs text-muted">{new Date(o.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontWeight: 700 }}>{o.customer_name}</div>
                      <div className="text-sm text-muted">{o.customer_phone}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--r-sm)' }}>
                      <span className="text-sm font-semibold">Tổng tiền:</span>
                      <span style={{ fontWeight: 800, color: 'var(--text)' }}>{Number(o.total_amount).toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.75rem', color: payInfo.color, fontWeight: 600, background: 'var(--surface2)', padding: '0.2rem 0.5rem', borderRadius: 'var(--r-full)' }}>
                        {payInfo.icon} {payInfo.label}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-light)', display: 'flex', gap: '0.5rem' }}>
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
                                <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Về Chờ xử lý</button>
                                <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Về Đang giao</button>
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
                                <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Về Chờ xử lý</button>
                                <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Về Đang giao</button>
                                <button onClick={() => { updateOrderStatus(o.id, 'completed', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--success)' }} className="hover-bg">Về Hoàn thành</button>
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
          </div>
          </>
        )}
      </div>
    </div>
  );
}
