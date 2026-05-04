import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add states and functions
imports_replacement = "import { Package, Plus, Edit, Trash2, Search, Droplets, Box, Layers, AlertTriangle, CheckSquare } from 'lucide-react';"
content = re.sub(r"import \{ Package.*?\} from 'lucide-react';", imports_replacement, content)

states_addition = """
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  
  const existingCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = (ids) => {
    const allSelected = ids.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };
  
  const handleBulkSave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/products.php`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, category: bulkCategory })
      });
      if (res.ok) {
        setShowBulkModal(false); setSelectedIds([]); fetchData();
        showAlert('Thành công', 'Đã chuyển danh mục thành công!', 'success');
      } else {
        const data = await res.json();
        showAlert('Lỗi', data.error || 'Có lỗi xảy ra', 'danger');
      }
    } catch {
      showAlert('Lỗi', 'Không thể kết nối đến máy chủ.', 'danger');
    }
  };
"""

# form state
content = content.replace("const [form, setForm] = useState({ name: '', unit: 'chai', ml_per_unit: 0 });", 
    "const [form, setForm] = useState({ name: '', category: '', unit: 'chai', ml_per_unit: 0 });" + states_addition)

# openAdd and openEdit
content = content.replace("setForm({ name: '', unit: 'chai', ml_per_unit: 0 });", "setForm({ name: '', category: '', unit: 'chai', ml_per_unit: 0 });")
content = content.replace("setForm({ name: p.name, unit: p.unit, ml_per_unit: p.ml_per_unit });", "setForm({ name: p.name, category: p.category || '', unit: p.unit, ml_per_unit: p.ml_per_unit });")

# Grouped logic
grouped_logic = """
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  
  const groupedProducts = filtered.reduce((acc, p) => {
    const cat = p.category || 'Mồ côi (Chưa phân loại)';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});
"""
content = content.replace("const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));", grouped_logic)

# Replace table body
table_orig = """            <thead>
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
                  <td>"""

table_new = """            <thead>
              <tr>
                <th style={{ width: 40 }}><CheckSquare size={16} color="var(--text-muted)"/></th>
                <th style={{ width: 60 }}>Ảnh</th>
                <th>Tên sản phẩm</th>
                <th>Tồn kho</th>
                <th>Đơn vị nhập</th>
                <th>Quy đổi bán lẻ</th>
                <th style={{ width: 100 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedProducts).map(([cat, items]) => (
                <React.Fragment key={cat}>
                  <tr>
                    <td colSpan={7} style={{ background: 'var(--surface2)', fontWeight: 800, color: 'var(--text)', padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input type="checkbox" style={{ transform: 'scale(1.2)' }} onChange={() => toggleSelectAll(items.map(i => i.id))} checked={items.length > 0 && items.every(i => selectedIds.includes(i.id))} />
                        <Layers size={18} color={cat.includes('Mồ côi') ? 'var(--danger)' : 'var(--primary)'} />
                        {cat} <span className="badge badge-muted">{items.length}</span>
                      </div>
                    </td>
                  </tr>
                  {items.map(p => (
                    <tr key={p.id} style={{ background: selectedIds.includes(p.id) ? 'var(--primary-bg)' : 'transparent' }}>
                      <td><input type="checkbox" style={{ transform: 'scale(1.2)' }} checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                      <td>"""
content = content.replace(table_orig, table_new)

# Close the new maps in table
content = content.replace("""                  </td>
                </tr>
              ))}
            </tbody>""", """                  </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>""")

# Replace mobile view similarly
mobile_orig = """      {/* MOBILE CARD VIEW */}
      <div className="mobile-only">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(p => (
            <div key={p.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>"""

mobile_new = """      {/* MOBILE CARD VIEW */}
      <div className="mobile-only">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(groupedProducts).map(([cat, items]) => (
            <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: 'var(--surface2)', borderRadius: 'var(--r-sm)', fontWeight: 800 }}>
                <input type="checkbox" style={{ transform: 'scale(1.3)' }} onChange={() => toggleSelectAll(items.map(i => i.id))} checked={items.length > 0 && items.every(i => selectedIds.includes(i.id))} />
                <Layers size={18} color={cat.includes('Mồ côi') ? 'var(--danger)' : 'var(--primary)'} />
                {cat} <span className="badge badge-muted">{items.length}</span>
              </div>
              {items.map(p => (
                <div key={p.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: selectedIds.includes(p.id) ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ paddingTop: '0.5rem' }}>
                      <input type="checkbox" style={{ transform: 'scale(1.3)' }} checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                    </div>"""
content = content.replace(mobile_orig, mobile_new)

# Close mobile view map
content = content.replace("""              </div>
            </div>
          ))}
        </div>
      </div>""", """              </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>""")

# Add Category Field to form
category_field = """                <div className="form-group">
                  <label className="form-label">Danh mục (Không bắt buộc)</label>
                  <input className="form-control" list="category-list" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="VD: Nước hoa nam, Skincare..." />
                  <datalist id="category-list">
                    {existingCategories.map((c, i) => <option key={i} value={c} />)}
                  </datalist>
                </div>
                <div className="form-row">"""
content = content.replace("""                <div className="form-row">""", category_field)

# Add Bulk Action Bar and Bulk Modal
bulk_ui = """      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="anim-fade-up" style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--text)', color: '#fff', padding: '1rem 2rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 100 }}>
          <span style={{ fontWeight: 600 }}>Đã chọn {selectedIds.length} sản phẩm</span>
          <button className="btn btn-primary btn-sm" onClick={() => { setBulkCategory(''); setShowBulkModal(true); }}>Gộp danh mục</button>
          <button className="btn btn-ghost btn-sm" style={{ color: '#fff' }} onClick={() => setSelectedIds([])}>Hủy</button>
        </div>
      )}

      {/* BULK CATEGORY MODAL */}
      {showBulkModal && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBulkModal(false); }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Chuyển Danh Mục</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowBulkModal(false)}>✕</button>
            </div>
            <form onSubmit={handleBulkSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Chọn hoặc nhập tên danh mục</label>
                  <input className="form-control" list="bulk-category-list" required value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} placeholder="VD: Nước hoa nam, Skincare..." />
                  <datalist id="bulk-category-list">
                    {existingCategories.map((c, i) => <option key={i} value={c} />)}
                  </datalist>
                  <div className="form-hint" style={{ marginTop: '0.5rem' }}>Để trống nếu muốn bỏ phân loại (thành Mồ côi).</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Áp dụng</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showModal"""

content = content.replace("{showModal", bulk_ui)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Products.jsx updated successfully!")
