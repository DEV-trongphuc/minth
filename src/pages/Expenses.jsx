import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Plus, Edit, Trash2, Search, CalendarDays, DollarSign, Tag, ChevronDown, Check } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useDialog } from '../components/ui/DialogContext';

// --- Custom Multi-Select Dropdown ---
const MultiSelectDropdown = ({ options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const toggle = (val) => {
    if (val === 'all') {
      onChange(['all']);
    } else {
      let newSel = selected.includes('all') ? [] : [...selected];
      if (newSel.includes(val)) {
        newSel = newSel.filter(v => v !== val);
      } else {
        newSel.push(val);
      }
      if (newSel.length === 0) newSel = ['all'];
      onChange(newSel);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div 
        className="form-control" 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--surface)', minHeight: '42px', padding: '0.5rem 1rem' }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>
          {selected.includes('all') ? 'Tất cả các tháng' : `${selected.length} tháng được chọn`}
        </span>
        <ChevronDown size={15} color="var(--text-muted)" />
      </div>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '280px', overflowY: 'auto', padding: '0.5rem 0' }}>
            {options.map(opt => (
              <div 
                key={opt.value} 
                onClick={() => toggle(opt.value)}
                style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.85rem', fontWeight: selected.includes(opt.value) ? 600 : 500, background: selected.includes(opt.value) ? 'var(--primary-bg)' : 'transparent', color: selected.includes(opt.value) ? 'var(--primary)' : 'var(--text)', transition: 'background 0.2s' }}
                onMouseEnter={e => { if(!selected.includes(opt.value)) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { if(!selected.includes(opt.value)) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
                {selected.includes(opt.value) && <Check size={16} strokeWidth={3} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- Custom Single Select Dropdown ---
const SingleSelectDropdown = ({ options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === selected)?.label || 'Chọn...';
  
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div 
        className="form-control" 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--surface)', minHeight: '42px', padding: '0.5rem 1rem' }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>{selectedLabel}</span>
        <ChevronDown size={15} color="var(--text-muted)" />
      </div>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '280px', overflowY: 'auto', padding: '0.5rem 0' }}>
            {options.map(opt => (
              <div 
                key={opt.value} 
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.85rem', fontWeight: selected === opt.value ? 600 : 500, background: selected === opt.value ? 'var(--primary-bg)' : 'transparent', color: selected === opt.value ? 'var(--primary)' : 'var(--text)', transition: 'background 0.2s' }}
                onMouseEnter={e => { if(selected !== opt.value) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { if(selected !== opt.value) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
                {selected === opt.value && <Check size={16} strokeWidth={3} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [search, setSearch] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(['all']);
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const { showConfirm, showAlert } = useDialog();

  const [form, setForm] = useState({
    category: 'In ấn & Bao bì',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
  });

  const EXPENSE_CATEGORIES = [
    'In ấn & Bao bì',
    'Vận chuyển',
    'Marketing',
    'Công cụ dụng cụ',
    'Phần mềm & Dịch vụ',
    'Khác'
  ];

  useEffect(() => {
    fetchData();
  }, [selectedMonths]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/expenses.php`;
      if (!selectedMonths.includes('all') && selectedMonths.length > 0) {
        url += `?months=${selectedMonths.join(',')}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        setExpenses(await res.json());
      }
    } catch {
      showAlert('Lỗi', 'Không thể tải dữ liệu chi phí', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditItem(null);
    setForm({
      category: 'In ấn & Bao bì',
      amount: '',
      description: '',
      expense_date: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setForm({
      id: item.id,
      category: item.category,
      amount: item.amount,
      description: item.description,
      expense_date: item.expense_date
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) {
      showAlert('Lỗi', 'Số tiền không hợp lệ', 'warning');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/expenses.php`, {
        method: editItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        fetchData();
        showAlert('Thành công', editItem ? 'Đã cập nhật chi phí' : 'Đã thêm khoản chi phí mới', 'success');
      } else {
        const data = await res.json();
        showAlert('Lỗi', data.error || 'Lỗi lưu dữ liệu', 'danger');
      }
    } catch {
      showAlert('Lỗi', 'Lỗi kết nối máy chủ', 'danger');
    }
  };

  const handleDelete = (ids) => {
    showConfirm('Xóa khoản chi?', `Bạn có chắc muốn xóa ${ids.length} khoản chi phí này? Thao tác không thể hoàn tác.`, async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/expenses.php`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ids.length === 1 ? { id: ids[0] } : { ids })
        });
        if (res.ok) {
          fetchData();
          setSelectedIds([]);
          showAlert('Thành công', 'Đã xóa dữ liệu thành công', 'success');
        } else {
          showAlert('Lỗi', 'Không thể xóa dữ liệu', 'danger');
        }
      } catch {
        showAlert('Lỗi', 'Lỗi kết nối', 'danger');
      }
    });
  };

  // Filter Data
  const filtered = expenses.filter(e => {
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase()) || 
                        e.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalAmount = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

  // Generate Options
  const monthOptions = [{ value: 'all', label: 'Tất cả các tháng' }];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const mStr = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    monthOptions.push({ value: mStr, label: `Tháng ${m.getMonth() + 1}/${m.getFullYear()}` });
  }

  const categoryOptions = [
    { value: 'all', label: 'Tất cả danh mục' },
    ...EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))
  ];

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Wallet size={24} color="var(--primary)" /> Quản lý Chi phí
          </h1>
          <p className="page-sub">Theo dõi các khoản chi phí phát sinh, marketing, vận chuyển...</p>
        </div>
        <div className="page-actions" style={{ flexWrap: 'wrap' }}>
          {selectedIds.length > 0 && (
            <button className="btn btn-danger btn-sm anim-slide-in" onClick={() => handleDelete(selectedIds)}>
              <Trash2 size={15} /> Xóa {selectedIds.length} mục
            </button>
          )}
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={17} /> Thêm Chi phí</button>
        </div>
      </div>

      {/* Top Section: Stat & Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        
        {/* Total Stat Card */}
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={28} color="var(--danger)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-card-label">Tổng chi phí hiển thị</div>
            <div className="stat-card-value" style={{ color: 'var(--danger)', fontSize: '1.65rem', margin: '0.2rem 0' }}>
              {totalAmount.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs text-muted">Từ {filtered.length} giao dịch được lọc</div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
             <div>
               <label className="form-label text-xs mb-1" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                 <CalendarDays size={12} color="var(--primary)" /> Lọc theo tháng
               </label>
               <MultiSelectDropdown 
                 options={monthOptions} 
                 selected={selectedMonths} 
                 onChange={setSelectedMonths} 
               />
             </div>
             <div>
               <label className="form-label text-xs mb-1" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                 <Tag size={12} color="var(--primary)" /> Lọc danh mục
               </label>
               <SingleSelectDropdown 
                 options={categoryOptions} 
                 selected={categoryFilter} 
                 onChange={setCategoryFilter} 
               />
             </div>
           </div>
           <div className="search-wrap">
              <Search size={16} color="var(--text-light)" />
              <input 
                className="form-control" 
                placeholder="Tìm kiếm nội dung chi..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ paddingLeft: '2.5rem', borderRadius: '8px' }}
              />
           </div>
        </div>

      </div>

      {/* Table */}
      <div className="card card-no-pad" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: '1.5rem' }}>
                  <input type="checkbox" className="custom-check" onChange={e => setSelectedIds(e.target.checked ? filtered.map(x => x.id) : [])} checked={selectedIds.length === filtered.length && filtered.length > 0} />
                </th>
                <th>Ngày chi</th>
                <th>Danh mục</th>
                <th>Nội dung / Ghi chú</th>
                <th>Số tiền (VNĐ)</th>
                <th style={{ width: 100, paddingRight: '1.5rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>Đang tải dữ liệu chi phí...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      <Wallet size={36} opacity={0.3} />
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-light)' }}>Chưa có khoản chi phí nào</div>
                  </td>
                </tr>
              ) : filtered.map(item => (
                <tr key={item.id} className={selectedIds.includes(item.id) ? 'row-selected' : ''}>
                  <td onClick={e => e.stopPropagation()} style={{ paddingLeft: '1.5rem' }}>
                    <input type="checkbox" className="custom-check" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{new Date(item.expense_date).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td>
                    <span className="badge badge-muted" style={{ fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--border-light)', color: 'var(--text)' }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{ minWidth: '200px' }}>
                    <div style={{ color: 'var(--text)', lineHeight: 1.4 }}>{item.description || <span className="text-muted italic">--</span>}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                      -{Number(item.amount).toLocaleString('vi-VN')} đ
                    </div>
                  </td>
                  <td style={{ paddingRight: '1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEditModal(item)} title="Sửa"><Edit size={14} /></button>
                      <button className="btn btn-secondary btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete([item.id])} title="Xóa"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal" style={{ maxWidth: '420px', borderRadius: '16px' }}>
            <div className="modal-header" style={{ paddingBottom: '0.5rem' }}>
              <div>
                <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>{editItem ? 'Chỉnh sửa Chi Phí' : 'Thêm Chi Phí Mới'}</h2>
                <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Nhập thông tin khoản chi để theo dõi lợi nhuận chính xác hơn.</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: '0.4rem' }}>Danh mục chi phí <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <SingleSelectDropdown 
                    options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} 
                    selected={form.category} 
                    onChange={v => setForm({ ...form, category: v })} 
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: '0.4rem' }}>Số tiền chi (VNĐ) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" className="form-control" placeholder="VD: 500.000" required value={form.amount ? Number(form.amount).toLocaleString('vi-VN') : ''} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm({ ...form, amount: val });
                  }} style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-bg)', borderColor: 'transparent' }} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: '0.4rem' }}>Ngày chi <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="date" className="form-control" required value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: '0.4rem' }}>Nội dung / Ghi chú</label>
                  <textarea className="form-control" placeholder="In túi giấy, chạy Ads..." rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'none' }}></textarea>
                </div>
              </div>
              <div className="modal-footer" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editItem ? 'Lưu thay đổi' : 'Thêm chi phí'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
