import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add states
if "const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);" not in content:
    content = content.replace("const [bulkCategory, setBulkCategory] = useState('');", """const [bulkCategory, setBulkCategory] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('luccy_custom_categories') || '[]'); } catch { return []; }
  });""")

# Combine existing categories
content = content.replace("const existingCategories = [...new Set(products.map(p => p.category).filter(Boolean))];",
    "const existingCategories = [...new Set([...products.map(p => p.category).filter(Boolean), ...customCategories])];")

# Add Category handler
add_cat_handler = """
  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const newCats = [...new Set([...customCategories, newCategoryName.trim()])];
    setCustomCategories(newCats);
    localStorage.setItem('luccy_custom_categories', JSON.stringify(newCats));
    setShowAddCategoryModal(false);
    setNewCategoryName('');
    showAlert('Thành công', 'Đã thêm danh mục mới. Bạn có thể chọn danh mục này khi thêm sản phẩm.', 'success');
  };
"""
if "const handleAddCategory" not in content:
    content = content.replace("const handleBulkSave", add_cat_handler + "\n  const handleBulkSave")

# Add the button
btn_orig = """<button className="btn btn-primary" onClick={openAdd}><Plus size={17} /> Thêm Sản phẩm</button>"""
btn_new = """<button className="btn btn-secondary" onClick={() => setShowAddCategoryModal(true)}><Layers size={17} /> Thêm Danh mục</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={17} /> Thêm Sản phẩm</button>"""
content = content.replace(btn_orig, btn_new)

# Add the modal
modal_ui = """      {/* ADD CATEGORY MODAL */}
      {showAddCategoryModal && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddCategoryModal(false); }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Thêm Danh Mục Mới</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddCategoryModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên danh mục <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-control" required value={newCategoryName} autoFocus onChange={e => setNewCategoryName(e.target.value)} placeholder="VD: Nước hoa nữ, Chăm sóc tóc..." />
                  <div className="form-hint" style={{ marginTop: '0.5rem' }}>Danh mục mới sẽ xuất hiện trong danh sách chọn khi bạn thêm hoặc gộp sản phẩm.</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCategoryModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo Danh Mục</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}"""

if "{/* ADD CATEGORY MODAL */}" not in content:
    content = content.replace("{/* BULK CATEGORY MODAL */}", modal_ui + "\n\n      {/* BULK CATEGORY MODAL */}")

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Added Thêm Danh Mục button")
