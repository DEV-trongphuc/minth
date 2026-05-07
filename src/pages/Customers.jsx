import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, Plus, Star, MessageCircle, Gift, Eye, LayoutGrid, List, Edit, Trash2, TrendingUp, ShoppingBag, Calendar, MapPin, MessageSquare } from 'lucide-react';
import { API_BASE_URL } from '../config';
import AddressSelect from '../components/ui/AddressSelect';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../components/ui/DialogContext';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [viewMode, setViewMode] = useState('card');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', gender: '', birthday: '', address: '', note: '', tags: [] });
  const { showConfirm, showAlert } = useDialog();
  const navigate = useNavigate();

  const [crmTiers, setCrmTiers] = useState([{ name: 'New', color: 'success' }, { name: 'Loyal', color: 'primary' }, { name: 'VIP', color: 'warning' }]);
  const [crmTags, setCrmTags] = useState([]);

  const getTierConfig = (tierName) => {
    const t = crmTiers.find(x => x.name === tierName);
    if (!t) return { cls: 'badge-secondary', bg: 'var(--border)' };
    return { cls: `badge-${t.color}`, bg: `var(--${t.color})` };
  };

  const handleCreateOrder = (c) => {
    localStorage.setItem('luccy_pos_customer_draft', JSON.stringify(c));
    window.dispatchEvent(new Event('open-pos'));
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/settings.php`).then(r => r.json()).then(d => {
      if (d.crm_tiers) {
        try { setCrmTiers(JSON.parse(d.crm_tiers)); } catch(e){}
      }
      if (d.crm_tags) {
        try { setCrmTags(JSON.parse(d.crm_tags)); } catch(e){}
      }
    }).catch(() => {});
    fetch(`${API_BASE_URL}/customers.php`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length) setCustomers(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (detailItem) {
      setLoadingOrders(true);
      fetch(`${API_BASE_URL}/orders.php?customer_id=${detailItem.id}`)
        .then(res => res.json())
        .then(data => setCustomerOrders(data))
        .catch(() => {})
        .finally(() => setLoadingOrders(false));
    } else {
      setCustomerOrders([]);
    }
  }, [detailItem]);

  const viewOrderDetails = async (order) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders.php?action=get_items&order_id=${order.id}`);
      if (res.ok) {
        setOrderItems(await res.json());
      }
    } catch {}
    setLoadingItems(false);
  };

  useEffect(() => { setCurrentPage(1); }, [search, tierFilter]);

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchTier = tierFilter === '' || c.tier === tierFilter;
    return matchSearch && matchTier;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedCustomers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAdd = () => { setEditItem(null); setForm({ name: '', phone: '', email: '', gender: '', birthday: '', address: '', note: '', tags: [] }); setShowModal(true); };
  const openEdit = (c) => { 
    let tags = [];
    try { tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : (c.tags || []); } catch(e){}
    setEditItem(c); 
    setForm({ name: c.name, phone: c.phone, email: c.email || '', gender: c.gender || '', birthday: c.birthday || '', address: c.address || '', note: c.note || '', tags }); 
    setShowModal(true); 
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { ...form, id: editItem.id } : form;
      const res = await fetch(`${API_BASE_URL}/customers.php`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (res.ok) {
        setShowModal(false);
        // Reload customers
        const newData = await fetch(`${API_BASE_URL}/customers.php`).then(r => r.json());
        if (Array.isArray(newData)) setCustomers(newData);
        showAlert('Thành công', editItem ? 'Cập nhật thành công!' : 'Thêm mới thành công!', 'success');
      } else {
        const errorData = await res.json();
        showAlert('Lỗi', errorData.error || 'Có lỗi xảy ra', 'danger');
      }
    } catch(err) {
      showAlert('Lỗi', 'Không thể kết nối đến máy chủ', 'danger');
    }
  };

  const handleDelete = (id) => {
    showConfirm('Xóa Khách hàng?', 'Bạn có chắc chắn muốn xóa khách hàng này? Mọi lịch sử đơn hàng sẽ bị mất.', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/customers.php`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
        });
        if (res.ok) {
          setCustomers(prev => prev.filter(c => c.id !== id));
          showAlert('Đã xóa', 'Xóa khách hàng thành công.', 'success');
        } else {
          const errorData = await res.json();
          showAlert('Lỗi', errorData.error || 'Có lỗi xảy ra', 'danger');
        }
      } catch(err) {
        showAlert('Lỗi', 'Không thể kết nối đến máy chủ', 'danger');
      }
    }, 'danger');
  };

  const CustomerCard = ({ c }) => (
    <div className="customer-card" onClick={() => setDetailItem(c)}>
      {c.tier === 'VIP' && (
        <div style={{ position: 'absolute', top: 0, right: 0, background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', padding: '.2rem .875rem', fontSize: '.7rem', fontWeight: 700, borderBottomLeftRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <Star size={10} fill="currentColor" /> VIP
        </div>
      )}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div className="customer-avatar" style={{ background: getTierConfig(c.tier).bg || 'var(--primary)' }}>
          {c.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div className="text-sm text-muted">{c.phone}</div>
          {c.address && <div className="text-xs text-muted" style={{ marginTop: '.15rem', display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}><MapPin size={12} style={{ marginTop: '0.1rem', flexShrink: 0 }} /> <span>{c.address}</span></div>}
        </div>
        <span className={`badge ${getTierConfig(c.tier).cls}`} style={{ display: 'flex', alignItems: 'center', gap: '.25rem', flexShrink: 0 }}>
           {c.tier}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem' }}>
        {[
          { label: 'Tổng chi tiêu', val: `${(Number(c.total_spent) || 0).toLocaleString('vi-VN')} đ`, color: 'var(--primary)' },
          { label: 'Số đơn', val: `${c.order_count || 0} đơn`, color: 'var(--success)' },
          { label: 'Lần mua cuối', val: c.last_order || '—', color: 'var(--text)' },
        ].map(info => (
          <div key={info.label} style={{ background: 'var(--surface2)', padding: '.6rem .75rem', borderRadius: 'var(--r-sm)' }}>
            <div className="text-xs text-muted">{info.label}</div>
            <div style={{ fontWeight: 700, fontSize: '.8rem', color: info.color, marginTop: '.2rem' }}>{info.val}</div>
          </div>
        ))}
      </div>

      {c.note && <div className="text-xs text-muted" style={{ fontStyle: 'italic', padding: '.5rem .75rem', background: 'var(--warning-bg)', borderRadius: 'var(--r-xs)', borderLeft: '3px solid var(--warning)', display: 'flex', gap: '0.35rem', alignItems: 'flex-start' }}><MessageSquare size={12} style={{ marginTop: '0.1rem', flexShrink: 0 }} /> <span>{c.note}</span></div>}

      <div style={{ display: 'flex', gap: '.5rem', marginTop: 'auto' }}>
        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); setDetailItem(c); }}><Eye size={13} /> Chi tiết</button>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); handleCreateOrder(c); }}><ShoppingBag size={13} /> Bán tiếp</button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); openEdit(c); }}><Edit size={13} /></button>
      </div>
    </div>
  );

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
        </div>
        <div className="page-actions">
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={16} /></button>
            <button className={`view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')}><LayoutGrid size={16} /></button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--text-light)" />
          <input className="form-control" placeholder="Tìm theo tên hoặc số điện thoại..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Desktop Filter */}
        <div className="desktop-only" style={{ display: 'flex', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden', flexShrink: 0 }}>
          {([{ label: 'Tất cả', value: '' }, ...crmTiers.map(t => ({ label: t.name, value: t.name }))]).map(t => (
            <button key={t.value} onClick={() => setTierFilter(t.value)} style={{ padding: '.45rem .875rem', border: 'none', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '.825rem', fontWeight: 600, transition: 'all .2s', background: tierFilter === t.value ? 'var(--primary)' : 'transparent', color: tierFilter === t.value ? '#fff' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Mobile Filter Dropdown */}
        <div className="mobile-only" style={{ width: '100%' }}>
          <select className="form-control" value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={{ width: '100%', padding: '0.65rem 1rem', fontWeight: 600, background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
            {([{ label: 'Tất cả', value: '' }, ...crmTiers.map(t => ({ label: t.name, value: t.name }))]).map(t => <option key={t.value} value={t.value}>Lọc hạng: {t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Stats mini - Clean Premium Design */}
      <div className="grid-stats">
        {[
          { label: 'Khách VIP', count: customers.filter(c => c.tier === 'VIP').length, color: '#f59e0b' },
          { label: 'Khách Loyal', count: customers.filter(c => c.tier === 'Loyal').length, color: 'var(--primary)' },
          { label: 'Doanh thu từ CRM', count: customers.reduce((s, c) => s + Number(c.total_spent || 0), 0).toLocaleString('vi-VN') + ' đ', color: '#ec4899' },
          { label: 'Tổng khách', count: customers.length, color: '#ec4899' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
            <div className="text-xs text-muted">{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{s.count}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 'var(--r-md)', border: '1px dashed var(--border)' }}>
          <Users size={48} opacity={0.2} color="var(--primary)" />
          <h3 style={{ margin: '1rem 0 0.5rem 0' }}>Chưa có Khách hàng nào</h3>
          <p>Hệ thống sẽ tự động lưu thông tin khách hàng mới khi bạn tạo đơn hàng thành công.</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid-3-cards">
          {paginatedCustomers.map(c => <CustomerCard key={c.id} c={c} />)}
        </div>
      ) : (
        <>
          <div className="table-wrap desktop-only" style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1.5px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>SĐT & Địa chỉ</th>
                  <th>Hạng</th>
                  <th>Tổng chi tiêu</th>
                  <th>Số đơn</th>
                  <th>Lần mua cuối</th>
                  <th style={{ width: 120 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>Chưa có khách hàng nào</td>
                  </tr>
                )}
                {paginatedCustomers.map(c => (
                  <tr key={c.id} onClick={() => setDetailItem(c)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div className="customer-avatar" style={{ width: 36, height: 36, background: getTierConfig(c.tier).bg, fontSize: '.875rem', borderRadius: 8 }}>{c.name.charAt(0)}</div>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{c.phone}</div>
                      {c.address && <div className="text-xs text-muted">{c.address}</div>}
                    </td>
                    <td><span className={`badge ${getTierConfig(c.tier).cls}`}>{c.tier}</span></td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{(Number(c.total_spent) || 0).toLocaleString('vi-VN')} đ</td>
                    <td>{c.order_count || 0}</td>
                    <td className="text-sm text-muted">{c.last_order}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '.375rem' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)}><Edit size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        
        {/* MOBILE CARD VIEW */}
        <div className="mobile-only">
          <div className="grid-3-cards">
            {paginatedCustomers.map(c => <CustomerCard key={c.id} c={c} />)}
          </div>
        </div>
        </>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Trang trước
          </button>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Trang {currentPage} / {totalPages}
          </span>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Trang sau
          </button>
        </div>
      )}

      {showModal && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{editItem ? 'Sửa thông tin Khách hàng' : 'Thêm Khách hàng mới'}</h2>
                <p className="text-sm text-muted" style={{ marginTop: '.2rem' }}>Hạng thành viên sẽ tự động cập nhật theo chi tiêu</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Họ & Tên <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input className="form-control" placeholder="Nguyễn Văn A" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input className="form-control" placeholder="09xxxxxxxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Giới tính</label>
                    <select className="form-control" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                      <option value="">Chưa cập nhật</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" placeholder="nguyenvana@gmail.com" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày sinh</label>
                    <input type="date" className="form-control" value={form.birthday || ''} onChange={e => setForm({ ...form, birthday: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Địa chỉ giao hàng</label>
                  <AddressSelect 
                    value={form.address} 
                    onChange={addr => setForm({ ...form, address: addr })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú (Sở thích, lưu ý...)</label>
                  <textarea className="form-control" placeholder="VD: Thích nước hoa Chanel, nhạy cảm với mùi hương mạnh..." rows={3} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--pink)', borderColor: 'var(--pink)' }}>{editItem ? 'Cập nhật' : 'Thêm khách hàng'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Detail Drawer */}
      {detailItem && createPortal(
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
      )}

      {/* Chi tiết đơn hàng con */}
      {selectedOrder && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setSelectedOrder(null)}>
          <div className="modal anim-scale-in" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết Đơn #{selectedOrder.id}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1rem' }}>
              {loadingItems ? (
                <div className="text-center text-muted" style={{ padding: '2rem' }}>Đang tải chi tiết...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {orderItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface2)', borderRadius: 'var(--r-sm)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.quantity}x {item.product_name}</div>
                        <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>Lô: {item.batch_code} ({item.sell_type === 'chai' ? 'Nguyên' : 'Lẻ'})</div>
                      </div>
                      <div style={{ fontWeight: 700 }}>
                        {(item.price_per_unit * item.quantity).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  ))}
                  
                  <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span className="text-muted">Tổng tiền hàng:</span>
                      <span style={{ fontWeight: 600 }}>{Number(selectedOrder.total_amount).toLocaleString('vi-VN')} đ</span>
                    </div>
                    {Number(selectedOrder.shipping_fee) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span className="text-muted">Phí ship:</span>
                        <span style={{ fontWeight: 600 }}>{Number(selectedOrder.shipping_fee).toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', marginTop: '0.5rem', background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--r-sm)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>Tổng cộng:</span>
                      <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{Number(selectedOrder.final_amount).toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setSelectedOrder(null)}>Đóng</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
