import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, Plus, Edit, Trash2, LayoutGrid, List, Search, Filter, History, Share, Clock, CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useDialog } from '../components/ui/DialogContext';
import { useNavigate } from 'react-router-dom';

export default function Inventory() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [exportForm, setExportForm] = useState({ batch_id: '', qty: '', reason: 'Hàng Tester', export_type: 'chai' });
  const [editItem, setEditItem] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'card'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [isSortByOpen, setIsSortByOpen] = useState(false);
  const { showConfirm, showAlert } = useDialog();

  const [form, setForm] = useState({ product_id: '', import_date: new Date().toISOString().split('T')[0], expiry_date: '', import_price: '', initial_qty: '' });
  const [totalValue, setTotalValue] = useState('');
  const [priceInputMode, setPriceInputMode] = useState('unit'); // 'unit' | 'total'

  useEffect(() => { fetchData(); }, []);



  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, bRes, sRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products.php`), 
        fetch(`${API_BASE_URL}/batches.php`),
        fetch(`${API_BASE_URL}/settings.php`)
      ]);
      if (pRes.ok && bRes.ok) { 
        setProducts(await pRes.json()); 
        setBatches(await bRes.json()); 
      } else throw new Error();
      if (sRes.ok) {
        const settings = await sRes.json();
        if (settings.low_stock_threshold) setLowStockThreshold(Number(settings.low_stock_threshold));
      }
    } catch {
      showAlert('Lỗi kết nối', 'Không thể tải dữ liệu từ máy chủ', 'danger');
    } finally { setLoading(false); }
  };

  const openAddModal = () => { 
    setEditItem(null); 
    setForm({ product_id: '', import_date: new Date().toISOString().split('T')[0], expiry_date: '', import_price: '', initial_qty: '' }); 
    setTotalValue('');
    setPriceInputMode('unit');
    setShowModal(true); 
  };
  const openEditModal = (batch) => { 
    setEditItem(batch); 
    setForm({ product_id: batch.product_id || '', import_date: batch.import_date, expiry_date: batch.expiry_date || '', import_price: batch.import_price, initial_qty: batch.initial_qty }); 
    setTotalValue(batch.import_price * batch.initial_qty || '');
    setShowModal(true); 
  };

  const handleQtyChange = (e) => {
    const qty = e.target.value;
    setForm(prev => ({ ...prev, initial_qty: qty }));
    if (qty > 0 && totalValue) {
      setForm(prev => ({ ...prev, import_price: Number(totalValue) / Number(qty) }));
    } else if (qty > 0 && form.import_price) {
      setTotalValue(Number(form.import_price) * Number(qty));
    }
  };

  const handleTotalChange = (e) => {
    const total = e.target.value;
    setTotalValue(total);
    if (form.initial_qty > 0 && total) {
      setForm(prev => ({ ...prev, import_price: Number(total) / Number(form.initial_qty) }));
    }
  };

  const handlePriceChange = (e) => {
    const price = e.target.value;
    setForm(prev => ({ ...prev, import_price: price }));
    if (form.initial_qty > 0 && price) {
      setTotalValue(Number(price) * Number(form.initial_qty));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const endpoint = `${API_BASE_URL}/batches.php`;
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { 
        setShowModal(false); 
        fetchData(); 
        showAlert('Thành công', 'Lưu dữ liệu thành công', 'success');
      }
      else showAlert('Lỗi', 'Lỗi lưu dữ liệu!', 'danger');
    } catch { 
      setShowModal(false); 
      fetchData(); 
    }
  };

  const handleDelete = (ids) => {
    showConfirm('Xóa Lô hàng?', `Bạn có chắc muốn xóa ${ids.length} lô hàng? Hành động này không thể hoàn tác.`, async () => {
      let successCount = 0;
      let errorMsg = '';
      for (const id of ids) {
        try {
          const res = await fetch(`${API_BASE_URL}/batches.php`, {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
          });
          if (res.ok) successCount++;
          else {
            const data = await res.json();
            errorMsg = data.error;
            break;
          }
        } catch (e) {
          errorMsg = 'Lỗi kết nối'; break;
        }
      }
      
      if (successCount > 0) {
        setBatches(prev => prev.filter(b => !ids.slice(0, successCount).includes(b.id)));
        setSelectedIds([]);
        if (successCount === ids.length) {
          showAlert('Thành công', `Đã xóa ${successCount} lô hàng.`, 'success');
        } else {
          showAlert('Xóa một phần', `Đã xóa ${successCount} lô. Các lô còn lại bị lỗi: ${errorMsg}`, 'warning');
        }
      } else if (errorMsg) {
        showAlert('Không thể xóa', errorMsg, 'danger');
      }
    }, 'danger');
  };

  const stockStatus = (b) => {
    if (b.current_qty === 0 && b.current_ml === 0) return { id: 'out_of_stock', label: 'Hết hàng', cls: 'badge-danger' };
    if (b.current_qty <= lowStockThreshold) return { id: 'low_stock', label: 'Sắp hết', cls: 'badge-warning' };
    return { id: 'in_stock', label: 'Còn hàng', cls: 'badge-success' };
  };

  const filtered = batches
    .filter(b => b.product_name?.toLowerCase().includes(search.toLowerCase()) || b.batch_code?.toLowerCase().includes(search.toLowerCase()))
    .filter(b => {
      if (statusFilter === 'all') return true;
      return stockStatus(b).id === statusFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.import_date) - new Date(a.import_date);
      if (sortBy === 'date_asc') return new Date(a.import_date) - new Date(b.import_date);
      if (sortBy === 'status_asc') {
        const order = { 'out_of_stock': 1, 'low_stock': 2, 'in_stock': 3 };
        return order[stockStatus(a).id] - order[stockStatus(b).id];
      }
      if (sortBy === 'status_desc') {
        const order = { 'in_stock': 1, 'low_stock': 2, 'out_of_stock': 3 };
        return order[stockStatus(a).id] - order[stockStatus(b).id];
      }
      return 0;
    });

  const getExpiryWarning = (dateStr) => {
    if (!dateStr || dateStr === '0000-00-00') return null;
    const exp = new Date(dateStr);
    const now = new Date();
    const diffTime = exp - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Đã hết hạn', color: 'var(--danger)' };
    if (diffDays <= 90) return { label: `Còn ${diffDays} ngày`, color: 'var(--warning)' };
    return null;
  };

  const handleExportSubmit = async (e) => {
    e.preventDefault();
    if (!exportForm.qty || exportForm.qty <= 0) return showAlert('Lỗi', 'Số lượng không hợp lệ', 'warning');
    try {
      const u = JSON.parse(localStorage.getItem('luccy_user') || '{}');
      const uName = (u.username === 'admin' || u.username === 'hamien_luccy') ? 'Hà Miên' : (u.username || 'Hà Miên');
      const res = await fetch(`${API_BASE_URL}/inventory_logs.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...exportForm, user_name: uName})
      });
      if (res.ok) {
        setShowExportModal(false);
        fetchData();
        showAlert('Thành công', 'Xuất kho nội bộ thành công!', 'success');
      } else {
        const d = await res.json();
        showAlert('Lỗi', d.error || 'Lỗi xuất kho', 'danger');
      }
    } catch { showAlert('Lỗi', 'Lỗi kết nối', 'danger'); }
  };

  const openHistory = async (batch) => {
    setEditItem(batch);
    setLogs([]);
    setShowHistoryModal(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory_logs.php?batch_id=${batch.id}`);
      if (res.ok) setLogs(await res.json());
    } catch {}
  };

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Package size={24} color="var(--primary)" /> Quản lý Kho & Lô hàng
          </h1>
          <p className="page-sub">Theo dõi tồn kho theo lô, giá vốn thực tế từng lô nhập.</p>
        </div>
        <div className="page-actions">
          {selectedIds.length > 0 && (
            <button className="btn btn-danger btn-sm anim-slide-in" onClick={() => handleDelete(selectedIds)}>
              <Trash2 size={15} /> Xóa {selectedIds.length} lô
            </button>
          )}
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Xem dạng danh sách"><List size={16} /></button>
            <button className={`view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} title="Xem dạng card"><LayoutGrid size={16} /></button>
          </div>
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={17} /> Nhập Lô mới</button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 220 }}>
          <Search size={16} color="var(--text-light)" />
          <input className="form-control" placeholder="Tìm sản phẩm hoặc mã lô..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ position: 'relative', minWidth: '180px', flex: '0 1 auto' }} tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsStatusFilterOpen(false); }}>
          <div onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)} className="form-control" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', fontWeight: 600 }}>
            <span>{
              statusFilter === 'all' ? 'Tất cả trạng thái' :
              statusFilter === 'in_stock' ? 'Còn hàng' :
              statusFilter === 'low_stock' ? 'Sắp hết' : 'Hết hàng'
            }</span>
            <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isStatusFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </div>
          {isStatusFilterOpen && (
            <div className="anim-fade-up" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: '100%', background: 'var(--surface)', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 50, padding: '0.4rem', width: 'max-content' }}>
              {[{v:'all', l:'Tất cả trạng thái'}, {v:'in_stock', l:'Còn hàng'}, {v:'low_stock', l:'Sắp hết'}, {v:'out_of_stock', l:'Hết hàng'}].map(o => (
                <button key={o.v} onClick={() => { setStatusFilter(o.v); setIsStatusFilterOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '0.6rem 1rem', background: statusFilter === o.v ? 'var(--primary-bg)' : 'transparent', color: statusFilter === o.v ? 'var(--primary-dark)' : 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: statusFilter === o.v ? 600 : 500, fontSize: '0.9rem' }} onMouseEnter={e => { if (statusFilter !== o.v) e.target.style.background = 'var(--surface2)' }} onMouseLeave={e => { if (statusFilter !== o.v) e.target.style.background = 'transparent' }}>{o.l}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative', minWidth: '200px', flex: '0 1 auto' }} tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsSortByOpen(false); }}>
          <div onClick={() => setIsSortByOpen(!isSortByOpen)} className="form-control" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', fontWeight: 600 }}>
            <span>{
              sortBy === 'date_desc' ? 'Mới nhất trước' :
              sortBy === 'date_asc' ? 'Cũ nhất trước' :
              sortBy === 'status_asc' ? 'Ưu tiên Hết/Sắp hết' : 'Ưu tiên Còn hàng'
            }</span>
            <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isSortByOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </div>
          {isSortByOpen && (
            <div className="anim-fade-up" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: '100%', background: 'var(--surface)', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 50, padding: '0.4rem', width: 'max-content' }}>
              {[{v:'date_desc', l:'Mới nhất trước'}, {v:'date_asc', l:'Cũ nhất trước'}, {v:'status_asc', l:'Ưu tiên Hết/Sắp hết'}, {v:'status_desc', l:'Ưu tiên Còn hàng'}].map(o => (
                <button key={o.v} onClick={() => { setSortBy(o.v); setIsSortByOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '0.6rem 1rem', background: sortBy === o.v ? 'var(--primary-bg)' : 'transparent', color: sortBy === o.v ? 'var(--primary-dark)' : 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: sortBy === o.v ? 600 : 500, fontSize: '0.9rem' }} onMouseEnter={e => { if (sortBy !== o.v) e.target.style.background = 'var(--surface2)' }} onMouseLeave={e => { if (sortBy !== o.v) e.target.style.background = 'transparent' }}>{o.l}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
      ) : viewMode === 'list' ? (
        /* ─── LIST VIEW ─── */
        <>
        <div className="card card-no-pad desktop-only">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" className="custom-check" onChange={e => setSelectedIds(e.target.checked ? filtered.map(b => b.id) : [])} checked={selectedIds.length === filtered.length && filtered.length > 0} />
                  </th>
                  <th>Sản phẩm & Mã lô</th>
                  <th>Ngày nhập / HSD</th>
                  <th>Giá vốn</th>
                  <th>Tồn kho</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 140 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const s = stockStatus(b);
                  return (
                    <tr key={b.id} style={{ opacity: b.current_qty <= 0 && b.current_ml <= 0 ? 0.5 : 1 }} className={selectedIds.includes(b.id) ? 'row-selected' : ''}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="custom-check" checked={selectedIds.includes(b.id)} onChange={() => setSelectedIds(prev => prev.includes(b.id) ? prev.filter(i => i !== b.id) : [...prev, b.id])} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.product_name}</div>
                        <div className="text-xs text-muted">{b.batch_code}</div>
                      </td>
                      <td>
                        <div className="text-sm text-muted">Nhập: {b.import_date}</div>
                        {b.expiry_date && b.expiry_date !== '0000-00-00' && (
                          <div className="text-xs" style={{ display: 'flex', gap: '.3rem', marginTop: '.2rem' }}>
                            <span className="text-muted">HSD: {b.expiry_date}</span>
                            {getExpiryWarning(b.expiry_date) && <span style={{ color: getExpiryWarning(b.expiry_date).color, fontWeight: 700 }}>({getExpiryWarning(b.expiry_date).label})</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 700 }}>{Number(b.import_price).toLocaleString('vi-VN')} đ</td>
                      <td>
                        <div style={{ fontWeight: 600, color: b.current_qty <= lowStockThreshold ? 'var(--danger)' : 'var(--text)' }}>
                          {b.current_qty} / {b.initial_qty} chai
                        </div>
                        {b.ml_per_unit > 0 && <div className="text-muted text-xs mt-1">Còn {b.current_ml} ml</div>}
                      </td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '.375rem' }}>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => { setExportForm({ batch_id: b.id, qty: '', reason: 'Hàng Tester', export_type: 'chai' }); setEditItem(b); setShowExportModal(true); }} title="Xuất nội bộ"><Share size={14} /></button>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openHistory(b)} title="Lịch sử lô"><History size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditModal(b)} title="Sửa"><Edit size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE CARD VIEW FOR INVENTORY (FALLBACK FOR LIST MODE) */}
        <div className="mobile-only">
          <div className="grid-auto">
            {filtered.map(b => renderCard(b))}
          </div>
        </div>
        </>
      ) : (
        /* ─── CARD VIEW ─── */
        <div className="grid-auto">
          {filtered.map(b => renderCard(b))}
        </div>
      )}

      {/* Modal Add/Edit */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{editItem ? 'Sửa Lô Hàng' : 'Nhập Lô Hàng Mới'}</h2>
                <p className="text-sm text-muted" style={{ marginTop: '.2rem' }}>Điền đầy đủ thông tin lô nhập hàng</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Sản phẩm <span style={{ color: 'var(--danger)' }}>*</span></label>
                  {products.length === 0 ? (
                    <div style={{ padding: '1rem', background: 'var(--warning-bg)', borderRadius: 'var(--r-sm)', border: '1px dashed var(--warning)', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <p className="text-sm" style={{ color: 'var(--warning-dark, #b45309)', margin: 0, fontWeight: 500 }}>Chưa có danh mục sản phẩm nào, vui lòng tạo sản phẩm trước khi nhập kho!</p>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => { setShowModal(false); navigate('/products'); }}>
                        <Plus size={14} /> Đến trang Tạo Sản phẩm
                      </button>
                    </div>
                  ) : (
                    <select className="form-control" required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
                      <option value="">— Chọn sản phẩm —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Ngày nhập <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="date" className="form-control" required value={form.import_date} onChange={e => setForm({ ...form, import_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày hết hạn (HSD)</label>
                    <input type="date" className="form-control" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số lượng <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="number" className="form-control" placeholder="VD: 50" required min="1" value={form.initial_qty} onChange={handleQtyChange} />
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                    <div 
                      onClick={() => setPriceInputMode('unit')} 
                      style={{ paddingBottom: '.5rem', cursor: 'pointer', borderBottom: priceInputMode === 'unit' ? '2px solid var(--primary)' : '2px solid transparent', color: priceInputMode === 'unit' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: priceInputMode === 'unit' ? 600 : 400, fontSize: '0.95rem' }}
                    >
                      Nhập Giá vốn đơn vị
                    </div>
                    <div 
                      onClick={() => setPriceInputMode('total')} 
                      style={{ paddingBottom: '.5rem', cursor: 'pointer', borderBottom: priceInputMode === 'total' ? '2px solid var(--primary)' : '2px solid transparent', color: priceInputMode === 'total' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: priceInputMode === 'total' ? 600 : 400, fontSize: '0.95rem' }}
                    >
                      Nhập Tổng giá trị lô
                    </div>
                  </div>

                  {priceInputMode === 'total' ? (
                    <div className="form-group anim-fade-up">
                      <label className="form-label">Tổng giá trị lô hàng (VND) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" className="form-control" placeholder="VD: 5.000.000" required value={totalValue ? Number(totalValue).toLocaleString('vi-VN') : ''} onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        handleTotalChange({ target: { value: val } });
                      }} />
                      {(form.initial_qty > 0 && totalValue) ? (
                        <div className="form-hint" style={{ color: 'var(--primary)', fontWeight: 600 }}>Tự động chia ra: ≈ {Number(form.import_price || 0).toLocaleString('vi-VN')} đ / 1 đơn vị</div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="form-group anim-fade-up">
                      <label className="form-label">Giá vốn / 1 đơn vị (VND) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" className="form-control" placeholder="VD: 100.000" required value={form.import_price ? Number(form.import_price).toLocaleString('vi-VN') : ''} onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        handlePriceChange({ target: { value: val } });
                      }} />
                      {(form.initial_qty > 0 && form.import_price) ? (
                        <div className="form-hint" style={{ color: 'var(--primary)', fontWeight: 600 }}>Tổng giá trị lô hàng: ≈ {Number(totalValue || 0).toLocaleString('vi-VN')} đ</div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Cập nhật' : 'Lưu Lô Hàng'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Xuất nội bộ */}
      {showExportModal && editItem && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowExportModal(false); }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Xuất kho Nội bộ</h2>
                <p className="text-sm text-muted">Lô: {editItem.batch_code}</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowExportModal(false)}>✕</button>
            </div>
            <form onSubmit={handleExportSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: 'var(--r-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                    <span className="text-sm">Tồn kho nguyên chai:</span>
                    <strong>{editItem.current_qty} chai</strong>
                  </div>
                  {editItem.ml_per_unit > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-sm">Tồn kho dung tích:</span>
                      <strong>{editItem.current_ml} ml</strong>
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Loại xuất</label>
                  <select className="form-control" value={exportForm.export_type} onChange={e => setExportForm({...exportForm, export_type: e.target.value})}>
                    <option value="chai">Nguyên chai</option>
                    {editItem.ml_per_unit > 0 && <option value="ml">Chiết ml</option>}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Số lượng xuất <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" className="form-control" required min="1" max={exportForm.export_type === 'chai' ? editItem.current_qty : editItem.current_ml} value={exportForm.qty} onChange={e => setExportForm({...exportForm, qty: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lý do xuất</label>
                  <select className="form-control" value={exportForm.reason} onChange={e => setExportForm({...exportForm, reason: e.target.value})}>
                    <option value="Làm hàng Tester">Làm hàng Tester</option>
                    <option value="Hư hỏng, bể vỡ">Hư hỏng, bể vỡ</option>
                    <option value="Hao hụt chiết rót">Hao hụt chiết rót</option>
                    <option value="Hàng tặng, quà tặng">Hàng tặng, quà tặng</option>
                    <option value="Tiêu dùng nội bộ">Tiêu dùng nội bộ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                {exportForm.reason === 'Khác' && (
                  <div className="form-group">
                    <input type="text" className="form-control" placeholder="Ghi rõ lý do..." onChange={e => setExportForm({...exportForm, reason: e.target.value})} />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary">Xác nhận Xuất</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Lịch sử Lô */}
      {showHistoryModal && editItem && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowHistoryModal(false); }}>
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Lịch sử Lô hàng</h2>
                <p className="text-sm text-muted">{editItem.product_name} ({editItem.batch_code})</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Chưa có lịch sử giao dịch</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid var(--border)' }}>
                  {logs.map(log => {
                    let icon, color, bg;
                    if (log.action_type === 'IMPORT') { icon = <Plus size={14} />; color = 'var(--success)'; bg = 'var(--success-bg)'; }
                    else if (log.action_type === 'SALE') { icon = <CheckCircle size={14} />; color = 'var(--primary)'; bg = 'var(--primary-light)'; }
                    else if (log.action_type === 'EXPORT_INTERNAL') { icon = <Share size={14} />; color = 'var(--warning)'; bg = 'var(--warning-bg)'; }
                    else if (log.action_type === 'CANCEL_ORDER' || log.action_type === 'ADJUST') { icon = <AlertTriangle size={14} />; color = 'var(--danger)'; bg = 'var(--danger-bg)'; }
                    
                    return (
                      <div key={log.id} style={{ position: 'relative', padding: '0.75rem', background: 'var(--surface2)', borderRadius: 'var(--r-sm)' }}>
                        <div style={{ position: 'absolute', left: '-1.5rem', top: '1rem', width: '1rem', height: '2px', background: 'var(--border)' }}></div>
                        <div style={{ position: 'absolute', left: '-2rem', top: '0.5rem', width: '24px', height: '24px', borderRadius: '50%', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>
                          {icon}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.25rem' }}>
                          <span style={{ fontWeight: 600 }}>{log.reason}</span>
                          <span className="text-xs text-muted">{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="text-sm" style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
                          <span>Thực hiện: <strong style={{ color: 'var(--text)' }}>{log.user_name?.toLowerCase() === 'admin' ? 'Hà Miên' : log.user_name}</strong></span>
                          <span>Thay đổi: <strong style={{ color: log.qty_change > 0 || log.ml_change > 0 ? 'var(--success)' : (log.qty_change < 0 || log.ml_change < 0 ? 'var(--danger)' : 'var(--text)') }}>{log.qty_change !== 0 ? `${log.qty_change > 0 ? '+' : ''}${log.qty_change} chai` : ''} {log.ml_change !== 0 ? `(${log.ml_change > 0 ? '+' : ''}${log.ml_change} ml)` : ''}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
