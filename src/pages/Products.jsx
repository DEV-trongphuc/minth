import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, Plus, Edit, Trash2, Search, Droplets, Box, Layers, AlertTriangle, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useDialog } from '../components/ui/DialogContext';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const { showConfirm, showAlert } = useDialog();

  const unitLabels = { chai: 'Chai', cai: 'Cái', hop: 'Hộp', set: 'Set', tuyp: 'Tuýp', gam: 'Gam (g)' };

  const [form, setForm] = useState({ name: '', unit: 'chai', ml_per_unit: 0 });


  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories.php`);
      if (res.ok) setCategories(await res.json());
    } catch { }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products.php?t=${Date.now()}`);
      if (res.ok) { setProducts(await res.json()); fetchCategories(); }
    } catch {
      setProducts([
        { id: 1, name: 'Nước hoa Chanel No.5', unit: 'chai', ml_per_unit: 100 },
        { id: 2, name: 'Sữa rửa mặt Cetaphil', unit: 'chai', ml_per_unit: 0 },
      ]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); fetchCategories(); }, []);

  const openAdd = () => { setEditItem(null); setForm({ name: '', category: '', unit: 'chai', ml_per_unit: 0 }); setShowModal(true); };
  const openEdit = (p) => { setEditItem(p); setForm({ name: p.name, category: p.category || '', unit: p.unit, ml_per_unit: p.ml_per_unit }); setShowModal(true); };


  const [showManageCategoryModal, setShowManageCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState({ old: '', new: '' });
  const [newCatName, setNewCatName] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkOption, setBulkOption] = useState('existing');
  const [bulkCategory, setBulkCategory] = useState('');

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/categories.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCatName.trim() })
      });
      if (res.ok) { setNewCatName(''); fetchCategories(); }
    } catch { }
  };

  const handleRenameCategory = async (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return setEditingCategory({ old: '', new: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/categories.php`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_name: oldName, new_name: newName.trim() })
      });
      if (res.ok) {
        setEditingCategory({ old: '', new: '' }); fetchCategories(); fetchData();
        showAlert('Thành công', `Đã đổi tên thành ${newName.trim()}`, 'success');
      }
    } catch { }
  };

  const handleDeleteCategory = (catName) => {
    showConfirm('Xóa danh mục?', `Tất cả sản phẩm trong "${catName}" sẽ trở thành Mồ côi.`, async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories.php`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: catName })
        });
        if (res.ok) { fetchCategories(); fetchData(); showAlert('Đã xóa', 'Xóa thành công.', 'success'); }
      } catch { }
    }, 'danger');
  };

  const handleBulkSave = async (e) => {
    e.preventDefault();
    if (!bulkCategory.trim() && bulkOption === 'new') return showAlert('Lỗi', 'Vui lòng nhập tên danh mục', 'warning');

    if (bulkOption === 'new') {
      try {
        await fetch(`${API_BASE_URL}/categories.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: bulkCategory.trim() })
        });
      } catch { }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/products.php`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, category: bulkCategory.trim() })
      });
      if (res.ok) {
        setShowBulkModal(false); setSelectedIds([]); fetchData(); fetchCategories();
        showAlert('Thành công', 'Đã chuyển danh mục thành công!', 'success');
      } else {
        const data = await res.json();
        showAlert('Lỗi', data.error || 'Lỗi xử lý máy chủ', 'danger');
      }
    } catch { showAlert('Lỗi', 'Lỗi kết nối', 'danger'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const nameTrimmed = form.name.trim();
    const isDuplicate = products.some(p =>
      p.name.toLowerCase() === nameTrimmed.toLowerCase() &&
      (!editItem || p.id !== editItem.id)
    );

    if (isDuplicate) {
      return showAlert('Trùng lặp', 'Tên sản phẩm này đã tồn tại trong danh mục!', 'warning');
    }

    try {
      const method = editItem ? 'PUT' : 'POST';
      const bodyToSave = { ...form, ml_per_unit: ['cai', 'hop', 'gam'].includes(form.unit) ? 0 : form.ml_per_unit };
      const body = editItem ? { id: editItem.id, ...bodyToSave } : bodyToSave;
      const res = await fetch(`${API_BASE_URL}/products.php`, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setShowModal(false);
        fetchData();
        showAlert('Thành công', editItem ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!', 'success');
      }
    } catch {
      showAlert('Lỗi kết nối', 'Không thể lưu dữ liệu (Offline Mode)', 'danger');
      setShowModal(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm('Xóa sản phẩm?', 'Hành động này sẽ không thể hoàn tác.', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products.php`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const data = await res.json();

        if (res.ok) {
          setProducts(prev => prev.filter(p => p.id !== id));
          showAlert('Đã xóa', 'Xóa sản phẩm thành công.', 'success');
        } else {
          showAlert('Lỗi', data.error || 'Không thể xóa sản phẩm.', 'danger');
        }
      } catch (e) {
        showAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ.', 'danger');
      }
    }, 'danger');
  };


  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const groupedProducts = filtered.reduce((acc, p) => {
    const cat = p.category || 'Chưa phân loại';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Package size={24} color="var(--primary)" /> Danh mục Sản phẩm Gốc
          </h1>
          <p className="page-sub">Quản lý các loại sản phẩm, đơn vị tính và dung tích chiết trước khi nhập Lô.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setShowManageCategoryModal(true)}><Layers size={17} /> Quản lý Danh mục</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={17} /> Thêm Sản phẩm</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.2rem' }}>Tổng sản phẩm</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{products.length}</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.2rem' }}>Hết sạch hàng</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>
              {products.filter(p => !(Number(p.total_qty || 0) > 0 || Number(p.total_ml || 0) > 0)).length} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {products.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 220 }}>
          <Search size={16} color="var(--text-light)" />
          <input className="form-control" placeholder="Tìm tên sản phẩm..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>


      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="anim-fade-up" style={{ background: 'var(--text)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 600 }}>Đã chọn {selectedIds.length} sản phẩm</span>
          <button className="btn btn-primary btn-sm" onClick={() => { setBulkOption('existing'); setBulkCategory(categories[0] || ''); setShowBulkModal(true); }}>Gộp danh mục</button>
          <button className="btn btn-ghost btn-sm" style={{ color: '#fff' }} onClick={() => setSelectedIds([])}>Hủy</button>
        </div>
      )}

      {/* MANAGE CATEGORY MODAL */}
      {showManageCategoryModal && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowManageCategoryModal(false); }}>
          <div className="modal" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Quản lý Danh mục</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowManageCategoryModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '1rem' }}>
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input className="form-control" style={{ flex: 1 }} value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Tên danh mục mới..." required />
                <button type="submit" className="btn btn-primary"><Plus size={16} /> Thêm</button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {categories.length === 0 && <div className="text-center text-muted py-4">Chưa có danh mục nào.</div>}
                {categories.map(cat => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--surface2)', borderRadius: 'var(--r-sm)' }}>
                    {editingCategory.old === cat ? (
                      <input className="form-control form-control-sm" style={{ flex: 1, marginRight: '0.5rem' }} value={editingCategory.new} autoFocus onBlur={() => handleRenameCategory(cat, editingCategory.new)} onKeyDown={e => { if (e.key === 'Enter') handleRenameCategory(cat, editingCategory.new); if (e.key === 'Escape') setEditingCategory({ old: '', new: '' }); }} onChange={e => setEditingCategory({ ...editingCategory, new: e.target.value })} />
                    ) : (
                      <span style={{ fontWeight: 600 }}>{cat}</span>
                    )}
                    {editingCategory.old !== cat && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingCategory({ old: cat, new: cat })}><Edit size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => handleDeleteCategory(cat)}><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* BULK MODAL */}
      {showBulkModal && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBulkModal(false); }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header"><h2 className="modal-title">Gộp Danh Mục</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowBulkModal(false)}>✕</button></div>
            <form onSubmit={handleBulkSave}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="radio" checked={bulkOption === 'existing'} onChange={() => { setBulkOption('existing'); setBulkCategory(categories[0] || ''); }} />
                    <span style={{ fontWeight: 600 }}>Chuyển sang danh mục hiện có</span>
                  </label>
                  {bulkOption === 'existing' && (
                    <select className="form-control" style={{ marginLeft: '1.5rem', width: 'calc(100% - 1.5rem)' }} value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}>
                      <option value="">— Không có danh mục —</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                    <input type="radio" checked={bulkOption === 'new'} onChange={() => { setBulkOption('new'); setBulkCategory(''); }} />
                    <span style={{ fontWeight: 600 }}>Tạo và thêm vào danh mục mới</span>
                  </label>
                  {bulkOption === 'new' && (
                    <input className="form-control" style={{ marginLeft: '1.5rem', width: 'calc(100% - 1.5rem)' }} value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} placeholder="Tên danh mục mới..." required autoFocus />
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Áp dụng</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      <div className="card card-no-pad desktop-only">
        <div className="table-wrap desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: '1rem' }}>
                  <input type="checkbox" className="custom-check" onChange={e => setSelectedIds(e.target.checked ? filtered.map(p => p.id) : [])} checked={selectedIds.length === filtered.length && filtered.length > 0} />
                </th>
                <th style={{ width: 60 }}>Ảnh</th>
                <th>Tên sản phẩm</th>
                <th>Tồn kho</th>
                <th>Đơn vị nhập</th>
                <th>Quy đổi bán lẻ</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedProducts).map(([cat, items]) => (
                <React.Fragment key={cat}>
                  <tr style={{ background: 'var(--surface2)', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))} onMouseEnter={e => e.currentTarget.style.background='var(--surface)'} onMouseLeave={e => e.currentTarget.style.background='var(--surface2)'}>
                    <td colSpan="7" style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: collapsedCategories[cat] ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                        <Layers size={16} /> {cat} <span className="badge badge-muted">{items.length}</span>
                      </div>
                    </td>
                  </tr>
                  {!collapsedCategories[cat] && items.map(p => (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: '1rem' }}>
                        <input type="checkbox" className="custom-check" checked={selectedIds.includes(p.id)} onChange={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} />
                      </td>
                      <td>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>
                          {p.unit === 'chai' ? <Droplets size={16} color="var(--primary)" /> : p.unit === 'hop' ? <Package size={16} color="var(--warning)" /> : p.unit === 'set' ? <Layers size={16} color="var(--success)" /> : <Box size={16} color="var(--info)" />}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>
                        {Number(p.total_qty || 0) > 0 || Number(p.total_ml || 0) > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{p.total_qty || 0} {unitLabels[p.unit] || p.unit}</span>
                            {p.ml_per_unit > 0 && <span className="text-xs text-muted">Còn {p.total_ml || 0} ml</span>}
                          </div>
                        ) : (
                          <span className="badge badge-danger">Hết sạch hàng</span>
                        )}
                      </td>
                      <td><span className="badge badge-muted">{unitLabels[p.unit] || p.unit}</span></td>
                      <td>
                        {(!['cai', 'hop', 'gam'].includes(p.unit) && p.ml_per_unit > 0) ? (
                          <span className="badge badge-primary">1 {unitLabels[p.unit] || p.unit} = {p.ml_per_unit} {p.unit === 'chai' ? 'ml' : 'đơn vị nhỏ'}</span>
                        ) : (
                          <span className="badge badge-muted">1 {unitLabels[p.unit] || p.unit}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '.375rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}><Edit size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="mobile-only">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(p => (
            <div key={p.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--r-sm)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', flexShrink: 0 }}>
                  {p.unit === 'chai' ? <Droplets size={20} color="var(--primary)" /> :
                    p.unit === 'hop' ? <Package size={20} color="var(--warning)" /> :
                      p.unit === 'set' ? <Layers size={20} color="var(--success)" /> :
                        <Box size={20} color="var(--info)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.25rem' }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-muted">Đơn vị: {unitLabels[p.unit] || p.unit}</span>
                    {(!['cai', 'hop', 'gam'].includes(p.unit) && p.ml_per_unit > 0) ? (
                      <span className="badge badge-primary">Quy đổi: 1 {unitLabels[p.unit] || p.unit} = {p.ml_per_unit} {p.unit === 'chai' ? 'ml' : 'đơn vị nhỏ'}</span>
                    ) : (
                      <span className="badge badge-muted">1 {unitLabels[p.unit] || p.unit} (Không xé lẻ)</span>
                    )}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    {Number(p.total_qty || 0) > 0 || Number(p.total_ml || 0) > 0 ? (
                      <span className="badge badge-success" style={{ fontWeight: 600 }}>Tồn: {p.total_qty || 0} {unitLabels[p.unit] || p.unit} {p.ml_per_unit > 0 ? `| ${p.total_ml || 0} ml` : ''}</span>
                    ) : (
                      <span className="badge badge-danger">Hết sạch hàng</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(p)}><Edit size={14} /> Sửa</button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }} onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên Sản phẩm <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Danh mục (Không bắt buộc)</label>
                  <input className="form-control" list="category-list" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="VD: Nước hoa nam, Skincare..." />
                  <datalist id="category-list">
                    {categories.map((c, i) => <option key={i} value={c} />)}
                  </datalist>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Đơn vị nhập kho</label>
                    <select className="form-control" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      <option value="chai">Chai</option>
                      <option value="tuyp">Tuýp</option>
                      <option value="cai">Cái</option>
                      <option value="set">Set / Combo</option>
                      <option value="hop">Hộp</option>
                      <option value="gam">Gam (g)</option>
                    </select>
                  </div>
                  {!['cai', 'hop', 'gam'].includes(form.unit) && (
                    <div className="form-group">
                      <label className="form-label">
                        {form.unit === 'chai' ? 'Tổng thể tích 1 Đơn vị (ml)' : 
                         form.unit === 'tuyp' ? 'Tổng trọng lượng 1 Tuýp (g)' :
                         `Số lượng xé lẻ / 1 Set`}
                      </label>
                      <input type="number" className="form-control" placeholder={form.unit === 'chai' ? "VD: 100" : form.unit === 'tuyp' ? "VD: 50" : "VD: 10"} min="0" value={form.ml_per_unit} onChange={e => setForm({ ...form, ml_per_unit: Number(e.target.value) })} />
                      <div className="form-hint">
                        {form.unit === 'chai' || form.unit === 'tuyp'
                          ? `Dung tích/Trọng lượng của 1 đơn vị nguyên gốc. Lúc bán hàng, bạn có thể linh hoạt chọn chiết ra các mức tùy ý (VD: 10ml, 5g). Để 0 nếu không bán lẻ.`
                          : 'Số lượng đơn vị nhỏ nằm trong 1 đơn vị gốc để có thể xé lẻ ra bán. Nhập 0 nếu không bán lẻ.'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Cập nhật' : 'Thêm Sản Phẩm'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
