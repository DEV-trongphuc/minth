import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, Plus, Star, MessageCircle, Gift, Eye, LayoutGrid, List, Edit, Trash2, TrendingUp, ShoppingBag, Calendar, MapPin, MessageSquare } from 'lucide-react';
import { API_BASE_URL } from '../config';
import AddressSelect from '../components/ui/AddressSelect';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../components/ui/DialogContext';

const TIERS = [
  { label: 'Tất cả', value: '' },
  { label: 'VIP', value: 'VIP' },
  { label: 'Loyal', value: 'Loyal' },
  { label: 'New', value: 'New' },
];

const tierConfig = {
  VIP: { cls: 'badge-warning', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: <Star size={11} fill="currentColor" /> },
  Loyal: { cls: 'badge-primary', bg: 'linear-gradient(135deg, var(--primary), #7c3aed)', icon: null },
  New: { cls: 'badge-success', bg: 'linear-gradient(135deg, #10b981, #059669)', icon: null },
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const { showConfirm, showAlert } = useDialog();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({ tier_loyal: 5000000, tier_vip: 20000000 });

  const handleCreateOrder = (c) => {
    localStorage.setItem('luccy_pos_customer_draft', JSON.stringify({ phone: c.phone, name: c.name, address: c.address, note: c.note, id: c.id }));
    navigate('/pos');
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/settings.php`).then(r => r.json()).then(d => {
      setSettings({ tier_loyal: Number(d.tier_loyal || 5000000), tier_vip: Number(d.tier_vip || 20000000) });
    }).catch(() => {});
    fetch(`${API_BASE_URL}/customers.php`).then(r => r.json()).then(d => { if (Array.isArray(d) && d.length) setCustomers(d); }).catch(() => {});
  }, []);

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchTier = tierFilter === '' || c.tier === tierFilter;
    return matchSearch && matchTier;
  });

  const openAdd = () => { setEditItem(null); setForm({ name: '', phone: '', address: '', note: '' }); setShowModal(true); };
  const openEdit = (c) => { setEditItem(c); setForm({ name: c.name, phone: c.phone, address: c.address || '', note: c.note || '' }); setShowModal(true); };

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
        <div className="customer-avatar" style={{ background: tierConfig[c.tier]?.bg || 'var(--primary)' }}>
          {c.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div className="text-sm text-muted">{c.phone}</div>
          {c.address && <div className="text-xs text-muted" style={{ marginTop: '.15rem', display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}><MapPin size={12} style={{ marginTop: '0.1rem', flexShrink: 0 }} /> <span>{c.address}</span></div>}
        </div>
        <span className={`badge ${tierConfig[c.tier]?.cls}`} style={{ display: 'flex', alignItems: 'center', gap: '.25rem', flexShrink: 0 }}>
          {tierConfig[c.tier]?.icon} {c.tier}
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
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); handleCreateOrder(c); }}><ShoppingBag size={13} /> Tạo đơn</button>
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
          <p className="page-sub" style={{ marginTop: '0.25rem' }}>{customers.length} khách hàng · Phân loại hạng VIP tự động theo chi tiêu.</p>
          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', background: 'var(--surface2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--r-sm)' }}>
            <strong style={{ color: 'var(--text)' }}>Hướng dẫn phân hạng:</strong>
            <span><span className="badge badge-success" style={{ padding: '0.1rem 0.3rem' }}>New</span> Khách mới</span>
            <span><span className="badge badge-primary" style={{ padding: '0.1rem 0.3rem' }}>Loyal</span> Chi tiêu {'>'} {settings.tier_loyal.toLocaleString('vi-VN')}đ</span>
            <span><span className="badge badge-warning" style={{ padding: '0.1rem 0.3rem' }}>VIP</span> Chi tiêu {'>'} {settings.tier_vip.toLocaleString('vi-VN')}đ</span>
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
          {TIERS.map(t => (
            <button key={t.value} onClick={() => setTierFilter(t.value)} style={{ padding: '.45rem .875rem', border: 'none', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '.825rem', fontWeight: 600, transition: 'all .2s', background: tierFilter === t.value ? 'var(--primary)' : 'transparent', color: tierFilter === t.value ? '#fff' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Mobile Filter Dropdown */}
        <div className="mobile-only" style={{ width: '100%' }}>
          <select className="form-control" value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={{ width: '100%', padding: '0.65rem 1rem', fontWeight: 600, background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
            {TIERS.map(t => <option key={t.value} value={t.value}>Lọc hạng: {t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Stats mini - Clean Premium Design */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Khách VIP', count: customers.filter(c => c.tier === 'VIP').length, color: '#f59e0b' },
          { label: 'Khách Loyal', count: customers.filter(c => c.tier === 'Loyal').length, color: 'var(--primary)' },
          { label: 'Doanh thu từ CRM', count: customers.reduce((s, c) => s + Number(c.total_spent || 0), 0).toLocaleString('vi-VN') + ' đ', color: '#ec4899' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ 
            background: 'var(--surface)', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
            padding: '1.25rem',
            borderRadius: 'var(--r-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', fontFamily: 'Outfit' }}>{s.count}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: s.color, opacity: 0.8 }} />
          </div>
        ))}
      </div>

      {/* Content */}
      {viewMode === 'card' ? (
        <div className="grid-3-cards">
          {filtered.length === 0 && <div className="text-muted text-sm" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}>Chưa có khách hàng nào</div>}
          {filtered.map(c => <CustomerCard key={c.id} c={c} />)}
        </div>
      ) : (
        <>
        <div className="card card-no-pad desktop-only">
          <div className="table-wrap">
            <table className="data-table">
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
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => setDetailItem(c)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div className="customer-avatar" style={{ width: 36, height: 36, background: tierConfig[c.tier]?.bg, fontSize: '.875rem', borderRadius: 8 }}>{c.name.charAt(0)}</div>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{c.phone}</div>
                      {c.address && <div className="text-xs text-muted">{c.address}</div>}
                    </td>
                    <td><span className={`badge ${tierConfig[c.tier]?.cls}`}>{c.tier}</span></td>
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
        </div>
        
        {/* MOBILE CARD VIEW */}
        <div className="mobile-only">
          <div className="grid-3-cards">
            {filtered.map(c => <CustomerCard key={c.id} c={c} />)}
          </div>
        </div>
        </>
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
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="customer-avatar" style={{ width: 52, height: 52, borderRadius: 14, fontSize: '1.5rem', background: tierConfig[detailItem.tier]?.bg }}>{detailItem.name.charAt(0)}</div>
                <div>
                  <h2 className="modal-title">{detailItem.name}</h2>
                  <span className={`badge ${tierConfig[detailItem.tier]?.cls}`}>{detailItem.tier}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetailItem(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem' }}>
                {[
                  { label: 'Tổng chi tiêu', val: `${(detailItem.total_spent || 0).toLocaleString('vi-VN')} đ`, icon: <TrendingUp size={16} color="var(--primary)" /> },
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
                {[['SĐT', detailItem.phone], ['Địa chỉ', detailItem.address || 'Chưa có'], ['Ghi chú', detailItem.note || 'Trống']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: '1rem', padding: '.625rem 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span className="text-sm text-muted" style={{ minWidth: 80 }}>{k}:</span>
                    <span className="text-sm" style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setDetailItem(null); openEdit(detailItem); }}><Edit size={15} /> Chỉnh sửa</button>
              <button className="btn btn-primary" onClick={() => handleCreateOrder(detailItem)}><ShoppingBag size={15} /> Bán đơn tiếp</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
