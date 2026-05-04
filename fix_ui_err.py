import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "r", encoding="utf-8") as f:
    content = f.read()

old_res = """if (res.ok) {
        setShowBulkModal(false); setSelectedIds([]); fetchData(); fetchCategories();
        showAlert('Thành công', 'Đã chuyển danh mục thành công!', 'success');
      }"""

new_res = """if (res.ok) {
        setShowBulkModal(false); setSelectedIds([]); fetchData(); fetchCategories();
        showAlert('Thành công', 'Đã chuyển danh mục thành công!', 'success');
      } else {
        const data = await res.json();
        showAlert('Lỗi', data.error || 'Lỗi xử lý máy chủ', 'danger');
      }"""

content = content.replace(old_res, new_res)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Added error handling to Products.jsx")
