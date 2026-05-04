import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. ADD categories STATE and fetchCategories
if "const [categories, setCategories] = useState([]);" not in content:
    content = content.replace("const [products, setProducts] = useState([]);", "const [products, setProducts] = useState([]);\n  const [categories, setCategories] = useState([]);")
    
    fetch_cats = """
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories.php`);
      if (res.ok) setCategories(await res.json());
    } catch {}
  };
"""
    content = content.replace("const fetchData = async () => {", fetch_cats + "\n  const fetchData = async () => {")
    content = content.replace("setProducts(await res.json());", "setProducts(await res.json()); fetchCategories();")
    content = content.replace("useEffect(() => { fetchData(); }, []);", "useEffect(() => { fetchData(); fetchCategories(); }, []);")

# 2. REMOVE old customCategories logic
content = re.sub(r"const \[customCategories.*?\}\);", "", content, flags=re.DOTALL)
content = re.sub(r"const existingCategories = \[.*?\n", "", content)

# Replace existingCategories usage with categories
content = content.replace("existingCategories", "categories")

# 3. MANAGE CATEGORIES MODAL (Replaces Add Category Modal)
old_add_cat_handler = r"const handleAddCategory.*?showAlert\('Thành công'.*?\n  \};\n"
new_manage_cat_logic = """
  const [showManageCategoryModal, setShowManageCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState({ old: '', new: '' });
  const [newCatName, setNewCatName] = useState('');

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/categories.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCatName.trim() })
      });
      if (res.ok) {
        setNewCatName('');
        fetchCategories();
      }
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
        setEditingCategory({ old: '', new: '' });
        fetchCategories();
        fetchData(); // reload products since their cat changed
        showAlert('Thành công', `Đã đổi tên thành ${newName.trim()}`, 'success');
      }
    } catch {}
  };

  const handleDeleteCategory = (catName) => {
    showConfirm('Xóa danh mục?', `Tất cả sản phẩm trong "${catName}" sẽ trở thành Chưa phân loại.`, async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories.php`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: catName })
        });
        if (res.ok) {
          fetchCategories();
          fetchData(); // reload products
          showAlert('Đã xóa', 'Xóa danh mục thành công.', 'success');
        }
      } catch {}
    }, 'danger');
  };
"""
content = re.sub(old_add_cat_handler, new_manage_cat_logic, content, flags=re.DOTALL)

# Update Button
content = content.replace("""<button className="btn btn-secondary" onClick={() => setShowAddCategoryModal(true)}><Layers size={17} /> Thêm Danh mục</button>""", """<button className="btn btn-secondary" onClick={() => setShowManageCategoryModal(true)}><Layers size={17} /> Quản lý Danh mục</button>""")

# Replace Add Category Modal UI with Manage Category Modal UI
old_modal_ui = r"\{/\* ADD CATEGORY MODAL \*/\}.*?\{/\* BULK CATEGORY MODAL \*/\}"
new_modal_ui = """{/* MANAGE CATEGORY MODAL */}
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
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
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
        </div>,
        document.body
      )}

      {/* BULK CATEGORY MODAL */}"""
content = re.sub(old_modal_ui, new_modal_ui, content, flags=re.DOTALL)

# 4. FIX BULK CATEGORY MODAL TO HAVE 2 OPTIONS
# Replace bulkCategory state with bulkOption state
if "const [bulkOption, setBulkOption]" not in content:
    content = content.replace("const [bulkCategory, setBulkCategory] = useState('');", """const [bulkCategory, setBulkCategory] = useState('');
  const [bulkOption, setBulkOption] = useState('existing'); // 'existing' | 'new'""")

# Replace Bulk Save Handler
old_bulk_save = r"const handleBulkSave = async \(e\) => \{.*?setBulkCategory\(''\);\n"
new_bulk_save = """const handleBulkSave = async (e) => {
    e.preventDefault();
    if (!bulkCategory.trim()) return showAlert('Lỗi', 'Vui lòng nhập/chọn danh mục', 'warning');
    
    // Nếu tạo mới, post lên api/categories trước
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
      } else {
        const data = await res.json();
        showAlert('Lỗi', data.error || 'Có lỗi xảy ra', 'danger');
      }
    } catch {
      showAlert('Lỗi', 'Không thể kết nối đến máy chủ.', 'danger');
    }
  };
"""
if "bulkOption === 'new'" not in content:
    content = re.sub(r"const handleBulkSave = async \(e\) => \{.*?\};\n", new_bulk_save, content, flags=re.DOTALL, count=1)

# Replace Bulk UI
old_bulk_ui = r"\{/\* BULK CATEGORY MODAL \*/\}.*?</form>"
new_bulk_ui = """{/* BULK CATEGORY MODAL */}
      {showBulkModal && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBulkModal(false); }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Gộp Danh Mục</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowBulkModal(false)}>✕</button>
            </div>
            <form onSubmit={handleBulkSave}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="radio" name="bulkOpt" checked={bulkOption === 'existing'} onChange={() => { setBulkOption('existing'); setBulkCategory(categories[0] || ''); }} />
                    <span style={{ fontWeight: 600 }}>Chuyển sang danh mục hiện có</span>
                  </label>
                  {bulkOption === 'existing' && (
                    <select className="form-control" style={{ marginLeft: '1.5rem', width: 'calc(100% - 1.5rem)' }} value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}>
                      <option value="">— Mồ côi (Gỡ danh mục) —</option>
                      {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  )}
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                    <input type="radio" name="bulkOpt" checked={bulkOption === 'new'} onChange={() => { setBulkOption('new'); setBulkCategory(''); }} />
                    <span style={{ fontWeight: 600 }}>Tạo và thêm vào danh mục mới</span>
                  </label>
                  {bulkOption === 'new' && (
                    <input className="form-control" style={{ marginLeft: '1.5rem', width: 'calc(100% - 1.5rem)' }} value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} placeholder="Nhập tên danh mục mới..." required autoFocus />
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Áp dụng</button>
              </div>
            </form>"""
content = re.sub(old_bulk_ui, new_bulk_ui, content, flags=re.DOTALL)

# Ensure setBulkCategory state clear on opening bulk modal
content = content.replace("setBulkCategory(''); setShowBulkModal(true);", "setBulkOption('existing'); setBulkCategory(categories[0] || ''); setShowBulkModal(true);")

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched Products.jsx successfully")
