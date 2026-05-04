import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. ADD categories STATE, fetchCategories, selectedIds
if "const [categories, setCategories] = useState([]);" not in content:
    content = content.replace("const [products, setProducts] = useState([]);", "const [products, setProducts] = useState([]);\n  const [categories, setCategories] = useState([]);\n  const [selectedIds, setSelectedIds] = useState([]);")

    fetch_cats = """
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories.php`);
      if (res.ok) setCategories(await res.json());
    } catch {}
  };
"""
    content = content.replace("const fetchData = async () => {", fetch_cats + "\n  const fetchData = async () => {")
    content = content.replace("if (res.ok) setProducts(await res.json());", "if (res.ok) { setProducts(await res.json()); fetchCategories(); }")
    content = content.replace("useEffect(() => { fetchData(); }, []);", "useEffect(() => { fetchData(); fetchCategories(); }, []);")

# 2. GROUPED PRODUCTS LOGIC
grouped_logic = """
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const groupedProducts = filtered.reduce((acc, p) => {
    const cat = p.category || 'Chưa phân loại';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});
"""
content = re.sub(r"const filtered = products.filter\(.*?\);\n", grouped_logic, content)
if "groupedProducts" not in content:
    content = content.replace("const filtered =", grouped_logic.strip() + "\n  // ")

# 3. BUTTONS (Quản lý Danh mục)
btn_orig = """<button className="btn btn-primary" onClick={openAdd}><Plus size={17} /> Thêm Sản phẩm</button>"""
btn_new = """<button className="btn btn-secondary" onClick={() => setShowManageCategoryModal(true)}><Layers size={17} /> Quản lý Danh mục</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={17} /> Thêm Sản phẩm</button>"""
content = content.replace(btn_orig, btn_new)

# 4. MODALS LOGIC
modals_logic = """
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
    } catch {}
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
    } catch {}
  };

  const handleDeleteCategory = (catName) => {
    showConfirm('Xóa danh mục?', `Tất cả sản phẩm trong "${catName}" sẽ trở thành Mồ côi.`, async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories.php`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: catName })
        });
        if (res.ok) { fetchCategories(); fetchData(); showAlert('Đã xóa', 'Xóa thành công.', 'success'); }
      } catch {}
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
      } catch {}
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/products.php`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, category: bulkCategory.trim() })
      });
      if (res.ok) {
        setShowBulkModal(false); setSelectedIds([]); fetchData(); fetchCategories();
        showAlert('Thành công', 'Đã chuyển danh mục thành công!', 'success');
      }
    } catch { showAlert('Lỗi', 'Lỗi kết nối', 'danger'); }
  };
"""
if "handleRenameCategory" not in content:
    content = content.replace("const handleSave =", modals_logic + "\n  const handleSave =")

# 5. RENDER BULK BAR, MODALS
render_modals = """
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
                      <option value="">— Mồ côi (Gỡ danh mục) —</option>
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
"""
content = content.replace('<div className="card card-no-pad desktop-only">', render_modals + '\n      <div className="card card-no-pad desktop-only">')

# 6. FIX TABLE RENDERING TO USE GROUPED AND CHECKBOXES
old_table = r"<thead>.*?<tbody>.*?</tbody>"
new_table = """<thead>
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
                  <tr style={{ background: 'var(--surface2)' }}>
                    <td colSpan="7" style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={16} /> {cat} <span className="badge badge-muted">{items.length}</span>
                    </td>
                  </tr>
                  {items.map(p => (
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
                        {(!['cai', 'hop'].includes(p.unit) && p.ml_per_unit > 0) ? (
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
            </tbody>"""
content = re.sub(old_table, new_table, content, flags=re.DOTALL)

# 7. ADD CATEGORY FIELD TO PRODUCT FORM
if '<label className="form-label">Danh mục' not in content:
    cat_field = """<div className="form-group">
                  <label className="form-label">Danh mục (Không bắt buộc)</label>
                  <input className="form-control" list="category-list" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="VD: Nước hoa nam, Skincare..." />
                  <datalist id="category-list">
                    {categories.map((c, i) => <option key={i} value={c} />)}
                  </datalist>
                </div>"""
    content = content.replace("""<div className="form-row">\n                  <div className="form-group">""", cat_field + """\n                <div className="form-row">\n                  <div className="form-group">""")

# 8. UPDATE openEdit/openAdd form state
content = content.replace("setForm({ name: '', unit: 'chai', ml_per_unit: 0 });", "setForm({ name: '', category: '', unit: 'chai', ml_per_unit: 0 });")
content = content.replace("setForm({ name: p.name, unit: p.unit, ml_per_unit: p.ml_per_unit });", "setForm({ name: p.name, category: p.category || '', unit: p.unit, ml_per_unit: p.ml_per_unit });")

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Restored and injected logic into Products.jsx")
