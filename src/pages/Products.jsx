import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, Plus, Edit, Trash2, Search, Droplets, Box, Layers, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useDialog } from '../components/ui/DialogContext';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const { showConfirm, showAlert } = useDialog();

  const unitLabels = { chai: 'Chai', cai: 'Cái', hop: 'Hộp', set: 'Set' };

  const [form, setForm] = useState({ name: '', unit: 'chai', ml_per_unit: 0 });

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products.php?t=${Date.now()}`);
      if (res.ok) setProducts(await res.json());
    } catch {
      setProducts([
        { id: 1, name: 'Nước hoa Chanel No.5', unit: 'chai', ml_per_unit: 100 },
        { id: 2, name: 'Sữa rửa mặt Cetaphil', unit: 'chai', ml_per_unit: 0 },
      ]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditItem(null); setForm({ name: '', unit: 'chai', ml_per_unit: 0 }); setShowModal(true); };
  const openEdit = (p) => { setEditItem(p); setForm({ name: p.name, unit: p.unit, ml_per_unit: p.ml_per_unit }); setShowModal(true); };

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
      const bodyToSave = { ...form, ml_per_unit: ['cai', 'hop'].includes(form.unit) ? 0 : form.ml_per_unit };
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

      <div className="card card-no-pad desktop-only">
        <div className="table-wrap desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Ảnh</th>
                <th>Tên sản phẩm</th>
                <th>Tồn kho</th>
                <th>Đơn vị nhập</th>
                <th>Quy đổi bán lẻ</th>
                <th style={{ width: 100 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>
                      {p.unit === 'chai' ? <Droplets size={18} color="var(--primary)" /> :
                        p.unit === 'hop' ? <Package size={18} color="var(--warning)" /> :
                          p.unit === 'set' ? <Layers size={18} color="var(--success)" /> :
                            <Box size={18} color="var(--info)" />}
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
                    {(!['cai', 'hop'].includes(p.unit) && p.ml_per_unit > 0) ? (
                      <span className="badge badge-primary">1 {unitLabels[p.unit] || p.unit} = {p.ml_per_unit} {p.unit === 'chai' ? 'ml' : 'đơn vị nhỏ'}</span>
                    ) : (
                      <span className="badge badge-muted">1 {unitLabels[p.unit] || p.unit}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '.375rem' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
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
                    {(!['cai', 'hop'].includes(p.unit) && p.ml_per_unit > 0) ? (
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
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Đơn vị nhập kho</label>
                    <select className="form-control" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      <option value="chai">Chai</option>
                      <option value="cai">Cái</option>
                      <option value="set">Set / Combo</option>
                      <option value="hop">Hộp</option>
                    </select>
                  </div>
                  {!['cai', 'hop'].includes(form.unit) && (
                    <div className="form-group">
                      <label className="form-label">
                        {form.unit === 'chai' ? 'Tổng thể tích 1 Đơn vị (ml)' : `Số lượng xé lẻ / 1 Set`}
                      </label>
                      <input type="number" className="form-control" placeholder={form.unit === 'chai' ? "VD: 100" : "VD: 10"} min="0" value={form.ml_per_unit} onChange={e => setForm({ ...form, ml_per_unit: Number(e.target.value) })} />
                      <div className="form-hint">
                        {form.unit === 'chai'
                          ? 'Thể tích của 1 đơn vị nguyên gốc. Lúc bán hàng, bạn có thể linh hoạt chọn chiết ra lọ 10ml, 50ml tùy ý. Để 0 nếu không bán chiết.'
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
