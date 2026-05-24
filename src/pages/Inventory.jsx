import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, Plus, Edit, Trash2, LayoutGrid, List, Search, Filter, History, Share, Clock, CheckCircle, AlertTriangle, ChevronDown, DollarSign, CalendarDays, Droplets, TrendingUp, Layers } from 'lucide-react';
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
  const [groupBy, setGroupBy] = useState('date'); // 'date' | 'product' | 'none'
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [invFilter, setInvFilter] = useState('thismonth');
  const [isInvFilterOpen, setIsInvFilterOpen] = useState(false);
  const { showConfirm, showAlert } = useDialog();

  const [form, setForm] = useState({ product_id: '', import_date: new Date().toISOString().split('T')[0], expiry_date: '', import_price: '', initial_qty: '', selling_price: '' });
  const [totalValue, setTotalValue] = useState('');
  const [priceInputMode, setPriceInputMode] = useState('unit'); // 'unit' | 'total'
  
  const unitLabels = { chai: 'Chai', cai: 'Cái', hop: 'Hộp', set: 'Set', tuyp: 'Tuýp', gam: 'Gam (g)' };

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
    setForm({ product_id: '', import_date: new Date().toISOString().split('T')[0], expiry_date: '', import_price: '', initial_qty: '', selling_price: '' }); 
    setTotalValue('');
    setPriceInputMode('unit');
    setShowModal(true); 
  };
  const openEditModal = (batch) => { 
    setEditItem(batch); 
    setForm({ product_id: batch.product_id || '', import_date: batch.import_date, expiry_date: batch.expiry_date || '', import_price: batch.import_price, initial_qty: batch.initial_qty, selling_price: batch.selling_price || '' }); 
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
    const payload = editItem ? { ...form, id: editItem.id } : form;
    const method = editItem ? 'PUT' : 'POST';
    try {
      const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { 
        setShowModal(false); 
        fetchData(); 
        showAlert('Thành công', editItem ? 'Cập nhật lô hàng thành công' : 'Thêm lô hàng mới thành công', 'success');
      }
      else {
        const err = await res.json().catch(() => ({}));
        showAlert('Lỗi', err.error || 'Lỗi lưu dữ liệu!', 'danger');
      }
    } catch { 
      showAlert('Lỗi', 'Không thể kết nối đến máy chủ', 'danger');
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

  
  const groupedProducts = products.reduce((acc, p) => {
    const cat = p.category || 'Chưa phân loại';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const filtered = batches
    .filter(b => b.product_name?.toLowerCase().includes(search.toLowerCase()) || b.batch_code?.toLowerCase().includes(search.toLowerCase()))
    .filter(b => {
      if (statusFilter === 'all') return true;
      return stockStatus(b).id === statusFilter;
    })
    .sort((a, b) => {
      if (groupBy === 'date') {
        const dateA = new Date(a.import_date);
        const dateB = new Date(b.import_date);
        const isAsc = sortBy === 'date_asc';
        if (dateA - dateB !== 0) {
          return isAsc ? dateA - dateB : dateB - dateA;
        }
        if (sortBy === 'status_asc') {
          const order = { 'out_of_stock': 1, 'low_stock': 2, 'in_stock': 3 };
          return order[stockStatus(a).id] - order[stockStatus(b).id];
        }
        if (sortBy === 'status_desc') {
          const order = { 'in_stock': 1, 'low_stock': 2, 'out_of_stock': 3 };
          return order[stockStatus(a).id] - order[stockStatus(b).id];
        }
        return 0;
      } else if (groupBy === 'product') {
        const nameA = a.product_name || '';
        const nameB = b.product_name || '';
        const nameComp = nameA.localeCompare(nameB, 'vi');
        if (nameComp !== 0) return nameComp;
        
        if (sortBy === 'date_asc') return new Date(a.import_date) - new Date(b.import_date);
        if (sortBy === 'status_asc') {
          const order = { 'out_of_stock': 1, 'low_stock': 2, 'in_stock': 3 };
          return order[stockStatus(a).id] - order[stockStatus(b).id];
        }
        if (sortBy === 'status_desc') {
          const order = { 'in_stock': 1, 'low_stock': 2, 'out_of_stock': 3 };
          return order[stockStatus(a).id] - order[stockStatus(b).id];
        }
        return new Date(b.import_date) - new Date(a.import_date); // default date_desc
      } else {
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
      }
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

  const now = new Date();
  const invFilteredBatches = batches.filter(b => {
    if (!b.import_date) return false;
    const d = new Date(b.import_date);
    if (invFilter === 'thismonth') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (invFilter === 'lastmonth') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    }
    if (invFilter === '30days') return (now - d) / 86400000 <= 30;
    if (invFilter === '7days') return (now - d) / 86400000 <= 7;
    return true; // all
  });
  const invTotalBatches = invFilteredBatches.length;
  const invTotalCapital = invFilteredBatches.reduce((s, b) => s + (Number(b.import_price) * Number(b.initial_qty)), 0);
  const invOutOfStock = invFilteredBatches.filter(b => b.current_qty <= 0 && b.current_ml <= 0).length;

  const INV_FILTERS = [
    { v: 'thismonth', l: 'Tháng này' },
    { v: 'lastmonth', l: 'Tháng trước' },
    { v: '30days', l: '30 ngày' },
    { v: '7days', l: '7 ngày' },
    { v: 'all', l: 'Tất cả' },
  ];

  const renderCard = (b) => {
    const s = stockStatus(b);
    const isOutOfStock = b.current_qty <= 0 && b.current_ml <= 0;
    const isLowStock = b.current_qty <= lowStockThreshold;
    const pct = Math.min(Math.round((b.current_qty / b.initial_qty) * 100), 100);
    const accentColor = isLowStock ? 'var(--danger)' : 'var(--primary)';
    
    return (
      <div key={b.id} style={{
        background: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        opacity: isOutOfStock ? 0.6 : 1,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        position: 'relative'
      }} className="hover-card-premium"
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}>

        {/* Card Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

          {/* Header: name + badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.product_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={14} /> {b.batch_code}
              </div>
            </div>
            <span style={{ 
              flexShrink: 0, fontSize: '0.75rem', padding: '0.35rem 0.65rem', borderRadius: '20px', 
              background: isOutOfStock ? '#fee2e2' : (isLowStock ? '#fef3c7' : '#d1fae5'),
              color: isOutOfStock ? '#dc2626' : (isLowStock ? '#d97706' : '#059669'),
              fontWeight: 700, border: `1px solid ${isOutOfStock ? '#fca5a5' : (isLowStock ? '#fde68a' : '#a7f3d0')}`
            }}>{s.label}</span>
          </div>

          {/* Stats row: 3-col grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg)', padding: '0.6rem 0.5rem', borderRadius: '10px', border: '1px solid var(--border-light)', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Giá vốn</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>{Number(b.import_price).toLocaleString('vi-VN')}đ</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg)', padding: '0.6rem 0.5rem', borderRadius: '10px', border: '1px solid var(--border-light)', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Giá bán</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>{b.selling_price && Number(b.selling_price) > 0 ? `${Number(b.selling_price).toLocaleString('vi-VN')}đ` : '-'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg)', padding: '0.6rem 0.5rem', borderRadius: '10px', border: '1px solid var(--border-light)', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ngày nhập</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{b.import_date}</div>
            </div>
          </div>

          {/* Stock progress */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tồn kho hiện tại</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: isOutOfStock ? 'var(--danger)' : 'var(--text)' }}>{b.current_qty} <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500}}>/ {b.initial_qty} {unitLabels[b.unit] || 'đơn vị'}</span></span>
            </div>
            <div style={{ height: '8px', borderRadius: 99, background: 'var(--bg)', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: isLowStock ? 'var(--danger)' : 'linear-gradient(90deg, var(--primary), #a78bfa)', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>
            {b.ml_per_unit > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                <Droplets size={14} color="var(--primary)" />
                Còn {b.current_ml.toLocaleString()} {b.unit === 'chai' ? 'ml' : b.unit === 'tuyp' ? 'g' : 'đơn vị nhỏ'} chờ chiết
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <button onClick={() => { setExportForm({ batch_id: b.id, qty: '', reason: 'Hàng Tester', export_type: 'chai' }); setEditItem(b); setShowExportModal(true); }} style={{ padding: '0.6rem', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s' }} title="Xuất kho nội bộ" onMouseEnter={e => {e.currentTarget.style.color='var(--primary)'; e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.background='var(--primary-bg)';}} onMouseLeave={e => {e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.borderColor='var(--border-light)'; e.currentTarget.style.background='var(--surface)';}}>
              <Share size={18} />
            </button>
            <button onClick={() => openHistory(b)} style={{ padding: '0.6rem', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s' }} title="Lịch sử lô hàng" onMouseEnter={e => {e.currentTarget.style.color='#10b981'; e.currentTarget.style.borderColor='#10b981'; e.currentTarget.style.background='#d1fae5';}} onMouseLeave={e => {e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.borderColor='var(--border-light)'; e.currentTarget.style.background='var(--surface)';}}>
              <History size={18} />
            </button>
            <button onClick={() => openEditModal(b)} style={{ padding: '0.6rem', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s' }} title="Sửa thông tin" onMouseEnter={e => {e.currentTarget.style.color='#f59e0b'; e.currentTarget.style.borderColor='#f59e0b'; e.currentTarget.style.background='#fef3c7';}} onMouseLeave={e => {e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.borderColor='var(--border-light)'; e.currentTarget.style.background='var(--surface)';}}>
              <Edit size={18} />
            </button>
            <button onClick={() => handleDelete([b.id])} style={{ padding: '0.6rem', borderRadius: '10px', border: '1px solid #fee2e2', background: '#fff0f0', color: 'var(--danger)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s' }} title="Xóa lô" onMouseEnter={e => {e.currentTarget.style.background='#fecaca';}} onMouseLeave={e => {e.currentTarget.style.background='#fff0f0';}}>
              <Trash2 size={18} />
            </button>
          </div>

        </div>
      </div>
    );
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
          {/* Inv Date Filter */}
          <div style={{ position: 'relative', flexShrink: 0 }} tabIndex={0} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsInvFilterOpen(false); }}>
            <div onClick={() => setIsInvFilterOpen(!isInvFilterOpen)} className="form-control" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', fontWeight: 600, fontSize: '0.85rem', padding: '0.45rem 0.875rem', height: '100%', minHeight: '36px' }}>
              <CalendarDays size={14} color="var(--primary)" />
              <span>{INV_FILTERS.find(f => f.v === invFilter)?.l}</span>
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isInvFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </div>
            {isInvFilterOpen && (
              <div className="anim-fade-up" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'var(--surface)', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 50, padding: '0.4rem', width: 'max-content' }}>
                {INV_FILTERS.map(o => (
                  <button key={o.v} onClick={() => { setInvFilter(o.v); setIsInvFilterOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem', background: invFilter === o.v ? 'var(--primary-bg)' : 'transparent', color: invFilter === o.v ? 'var(--primary-dark)' : 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: invFilter === o.v ? 600 : 500, fontSize: '0.85rem' }}>{o.l}</button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={17} /> Nhập Lô mới</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="inventory-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
          {[{
            icon: <Layers size={20} color="var(--primary)" />,
            label: 'Lô nhập',
            value: invTotalBatches,
            bg: 'var(--primary-bg)',
            suffix: 'lô'
          }, {
            icon: <DollarSign size={20} color="#10b981" />,
            label: 'Tổng vốn',
            value: invTotalCapital.toLocaleString('vi-VN'),
            bg: '#d1fae5',
            suffix: 'đ'
          }, {
            icon: <AlertTriangle size={20} color="var(--danger)" />,
            label: 'Hết hàng',
            value: invOutOfStock,
            bg: '#fee2e2',
            suffix: 'lô'
          }].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '0.75rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '10px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>{s.suffix}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: '1 1 250px', minWidth: '250px' }}>
          <Search size={16} color="var(--text-light)" />
          <input className="form-control" placeholder="Tìm sản phẩm hoặc mã lô..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flex: '1 1 auto', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 120px' }} tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsStatusFilterOpen(false); }}>
            <div onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)} className="form-control" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', fontWeight: 600, fontSize: '0.85rem' }}>
              <span>{
                statusFilter === 'all' ? 'Trạng thái' :
                statusFilter === 'in_stock' ? 'Còn hàng' :
                statusFilter === 'low_stock' ? 'Sắp hết' : 'Hết hàng'
              }</span>
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isStatusFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
            </div>
            {isStatusFilterOpen && (
              <div className="anim-fade-up" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'var(--surface)', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 50, padding: '0.4rem', width: 'max-content', minWidth: '100%' }}>
                {[{v:'all', l:'Tất cả'}, {v:'in_stock', l:'Còn hàng'}, {v:'low_stock', l:'Sắp hết'}, {v:'out_of_stock', l:'Hết hàng'}].map(o => (
                  <button key={o.v} onClick={() => { setStatusFilter(o.v); setIsStatusFilterOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem', background: statusFilter === o.v ? 'var(--primary-bg)' : 'transparent', color: statusFilter === o.v ? 'var(--primary-dark)' : 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: statusFilter === o.v ? 600 : 500, fontSize: '0.85rem' }}>{o.l}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: 'relative', flex: '1 1 120px' }} tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsGroupByOpen(false); }}>
            <div onClick={() => setIsGroupByOpen(!isGroupByOpen)} className="form-control" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', fontWeight: 600, fontSize: '0.85rem' }}>
              <span>{
                groupBy === 'date' ? 'Nhóm theo ngày' :
                groupBy === 'product' ? 'Nhóm theo SP' : 'Không nhóm'
              }</span>
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isGroupByOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
            </div>
            {isGroupByOpen && (
              <div className="anim-fade-up" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'var(--surface)', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 50, padding: '0.4rem', width: 'max-content', minWidth: '100%' }}>
                {[{v:'date', l:'Nhóm theo ngày'}, {v:'product', l:'Nhóm theo sản phẩm'}, {v:'none', l:'Không nhóm'}].map(o => (
                  <button key={o.v} onClick={() => { setGroupBy(o.v); setIsGroupByOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem', background: groupBy === o.v ? 'var(--primary-bg)' : 'transparent', color: groupBy === o.v ? 'var(--primary-dark)' : 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: groupBy === o.v ? 600 : 500, fontSize: '0.85rem' }}>{o.l}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: 'relative', flex: '1 1 120px' }} tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsSortByOpen(false); }}>
            <div onClick={() => setIsSortByOpen(!isSortByOpen)} className="form-control" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', fontWeight: 600, fontSize: '0.85rem' }}>
              <span>{
                sortBy === 'date_desc' ? 'Mới nhất' :
                sortBy === 'date_asc' ? 'Cũ nhất' :
                sortBy === 'status_asc' ? 'Hết trước' : 'Còn trước'
              }</span>
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isSortByOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
            </div>
            {isSortByOpen && (
              <div className="anim-fade-up" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'var(--surface)', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 50, padding: '0.4rem', width: 'max-content', minWidth: '100%' }}>
                {[{v:'date_desc', l:'Mới nhất trước'}, {v:'date_asc', l:'Cũ nhất trước'}, {v:'status_asc', l:'Ưu tiên Hết/Sắp hết'}, {v:'status_desc', l:'Ưu tiên Còn hàng'}].map(o => (
                  <button key={o.v} onClick={() => { setSortBy(o.v); setIsSortByOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem', background: sortBy === o.v ? 'var(--primary-bg)' : 'transparent', color: sortBy === o.v ? 'var(--primary-dark)' : 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: sortBy === o.v ? 600 : 500, fontSize: '0.85rem' }}>{o.l}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
      ) : viewMode === 'list' ? (
        /* ─── LIST VIEW ─── */
        <>
        <div className="card card-no-pad tablet-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" className="custom-check" onChange={e => setSelectedIds(e.target.checked ? filtered.map(b => b.id) : [])} checked={selectedIds.length === filtered.length && filtered.length > 0} />
                  </th>
                  <th style={{ whiteSpace: "nowrap" }}>Sản phẩm & Mã lô</th>
                  <th style={{ whiteSpace: "nowrap" }}>Ngày nhập / HSD</th>
                  <th style={{ whiteSpace: "nowrap" }}>Giá vốn / Giá bán</th>
                  <th style={{ whiteSpace: "nowrap" }}>Tồn kho</th>
                  <th style={{ whiteSpace: "nowrap" }}>Trạng thái</th>
                  <th style={{ width: 140 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const s = stockStatus(b);
                  const showDateHeader = groupBy === 'date' && (i === 0 || b.import_date !== filtered[i - 1].import_date);
                  const showProductHeader = groupBy === 'product' && (i === 0 || b.product_name !== filtered[i - 1].product_name);
                  return (
                    <React.Fragment key={b.id}>
                      {showDateHeader && (
                        <tr>
                          <td colSpan="7" style={{ background: 'var(--surface2)', fontWeight: 600, padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <CalendarDays size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.4rem', marginTop: '-2px' }}/>
                            Ngày nhập lô: <span style={{ color: 'var(--text)' }}>{b.import_date}</span>
                          </td>
                        </tr>
                      )}
                      {showProductHeader && (
                        <tr>
                          <td colSpan="7" style={{ background: 'var(--surface2)', fontWeight: 600, padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <Package size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.4rem', marginTop: '-2px' }}/>
                            Sản phẩm: <span style={{ color: 'var(--text)' }}>{b.product_name}</span>
                          </td>
                        </tr>
                      )}
                      <tr style={{ opacity: b.current_qty <= 0 && b.current_ml <= 0 ? 0.5 : 1 }} className={selectedIds.includes(b.id) ? 'row-selected' : ''}>
                        <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="custom-check" checked={selectedIds.includes(b.id)} onChange={() => setSelectedIds(prev => prev.includes(b.id) ? prev.filter(i => i !== b.id) : [...prev, b.id])} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.product_name}</div>
                        <div className="text-xs text-muted">{b.batch_code}</div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div className="text-sm text-muted">Nhập: {b.import_date}</div>
                        {b.expiry_date && b.expiry_date !== '0000-00-00' && (
                          <div className="text-xs" style={{ display: 'flex', gap: '.3rem', marginTop: '.2rem' }}>
                            <span className="text-muted">HSD: {b.expiry_date}</span>
                            {getExpiryWarning(b.expiry_date) && <span style={{ color: getExpiryWarning(b.expiry_date).color, fontWeight: 700 }}>({getExpiryWarning(b.expiry_date).label})</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 700 }}>{Number(b.import_price).toLocaleString('vi-VN')} đ</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Giá bán: {b.selling_price && Number(b.selling_price) > 0 ? `${Number(b.selling_price).toLocaleString('vi-VN')} đ` : 'Chưa thiết lập'}</div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, color: b.current_qty <= lowStockThreshold ? 'var(--danger)' : 'var(--text)' }}>
                          {b.current_qty} / {b.initial_qty} {unitLabels[b.unit] || 'đơn vị'}
                        </div>
                        {b.ml_per_unit > 0 && <div className="text-muted text-xs mt-1">Còn {b.current_ml} {b.unit === 'chai' ? 'ml' : b.unit === 'tuyp' ? 'g' : 'đơn vị nhỏ'}</div>}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '.375rem' }}>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => { setExportForm({ batch_id: b.id, qty: '', reason: 'Hàng Tester', export_type: 'chai' }); setEditItem(b); setShowExportModal(true); }} title="Xuất nội bộ"><Share size={14} /></button>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openHistory(b)} title="Lịch sử lô"><History size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditModal(b)} title="Sửa"><Edit size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{color: 'var(--danger)'}} onClick={() => handleDelete([b.id])} title="Xóa lô"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE CARD VIEW FOR INVENTORY (FALLBACK FOR LIST MODE) */}
        <div className="tablet-visible">
          <div className="grid-3-cards">
            {filtered.map((b, i) => {
              const showDateHeader = groupBy === 'date' && (i === 0 || b.import_date !== filtered[i - 1].import_date);
              const showProductHeader = groupBy === 'product' && (i === 0 || b.product_name !== filtered[i - 1].product_name);
              return (
                <React.Fragment key={b.id}>
                  {showDateHeader && (
                    <div style={{ gridColumn: '1 / -1', background: 'var(--surface2)', padding: '0.6rem 1rem', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-light)' }}>
                      <CalendarDays size={14} /> Ngày nhập lô: <span style={{ color: 'var(--text)' }}>{b.import_date}</span>
                    </div>
                  )}
                  {showProductHeader && (
                    <div style={{ gridColumn: '1 / -1', background: 'var(--surface2)', padding: '0.6rem 1rem', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-light)' }}>
                      <Package size={14} /> Sản phẩm: <span style={{ color: 'var(--text)' }}>{b.product_name}</span>
                    </div>
                  )}
                  {renderCard(b)}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        </>
      ) : (
        /* ─── CARD VIEW ─── */
        <div className="grid-3-cards">
          {filtered.map((b, i) => {
            const showDateHeader = groupBy === 'date' && (i === 0 || b.import_date !== filtered[i - 1].import_date);
            const showProductHeader = groupBy === 'product' && (i === 0 || b.product_name !== filtered[i - 1].product_name);
            return (
              <React.Fragment key={b.id}>
                {showDateHeader && (
                  <div style={{ gridColumn: '1 / -1', background: 'var(--surface2)', padding: '0.6rem 1rem', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-light)' }}>
                    <CalendarDays size={14} /> Ngày nhập lô: <span style={{ color: 'var(--text)' }}>{b.import_date}</span>
                  </div>
                )}
                {showProductHeader && (
                  <div style={{ gridColumn: '1 / -1', background: 'var(--surface2)', padding: '0.6rem 1rem', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-light)' }}>
                    <Package size={14} /> Sản phẩm: <span style={{ color: 'var(--text)' }}>{b.product_name}</span>
                  </div>
                )}
                {renderCard(b)}
              </React.Fragment>
            );
          })}
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
                      {Object.entries(groupedProducts).map(([cat, items]) => (
                        <optgroup key={cat} label={cat}>
                          {items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                      ))}
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
                <div className="form-group">
                  <label className="form-label">Giá bán niêm yết / 1 đơn vị (VND)</label>
                  <input type="text" className="form-control" placeholder="VD: 150.000" value={form.selling_price ? Number(form.selling_price).toLocaleString('vi-VN') : ''} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm(prev => ({ ...prev, selling_price: val }));
                  }} />
                  <div className="form-hint" style={{ color: 'var(--text-muted)' }}>Giá bán mặc định được gợi ý khi bán sản phẩm từ lô hàng này.</div>
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
                    <span className="text-sm">Tồn kho nguyên đơn vị:</span>
                    <strong>{editItem.current_qty} {unitLabels[editItem.unit] || 'đơn vị'}</strong>
                  </div>
                  {editItem.ml_per_unit > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-sm">Tồn kho dung tích:</span>
                      <strong>{editItem.current_ml} {editItem.unit === 'chai' ? 'ml' : editItem.unit === 'tuyp' ? 'g' : 'đơn vị nhỏ'}</strong>
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Loại xuất</label>
                  <select className="form-control" value={exportForm.export_type} onChange={e => setExportForm({...exportForm, export_type: e.target.value})}>
                    <option value="chai">{unitLabels[editItem.unit] || 'Nguyên đơn vị'}</option>
                    {editItem.ml_per_unit > 0 && <option value="ml">{editItem.unit === 'chai' ? 'Chiết ml' : 'Chiết lẻ'}</option>}
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
                          <span>Thay đổi: <strong style={{ color: log.qty_change > 0 || log.ml_change > 0 ? 'var(--success)' : (log.qty_change < 0 || log.ml_change < 0 ? 'var(--danger)' : 'var(--text)') }}>{log.qty_change !== 0 ? `${log.qty_change > 0 ? '+' : ''}${log.qty_change} đơn vị` : ''} {log.ml_change !== 0 ? `(${log.ml_change > 0 ? '+' : ''}${log.ml_change} ${log.sell_type === 'ml' ? 'ml' : 'đơn vị lẻ'})` : ''}</strong></span>
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
