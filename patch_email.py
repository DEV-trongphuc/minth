import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Update openAdd / openEdit to include email
open_target = """  const openAdd = () => { setEditItem(null); setForm({ name: '', phone: '', gender: '', birthday: '', address: '', note: '', tags: [] }); setShowModal(true); };
  const openEdit = (c) => { 
    let tags = [];
    try { tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : (c.tags || []); } catch(e){}
    setEditItem(c); 
    setForm({ name: c.name, phone: c.phone, gender: c.gender || '', birthday: c.birthday || '', address: c.address || '', note: c.note || '', tags }); 
    setShowModal(true); 
  };"""
open_str = """  const openAdd = () => { setEditItem(null); setForm({ name: '', phone: '', email: '', gender: '', birthday: '', address: '', note: '', tags: [] }); setShowModal(true); };
  const openEdit = (c) => { 
    let tags = [];
    try { tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : (c.tags || []); } catch(e){}
    setEditItem(c); 
    setForm({ name: c.name, phone: c.phone, email: c.email || '', gender: c.gender || '', birthday: c.birthday || '', address: c.address || '', note: c.note || '', tags }); 
    setShowModal(true); 
  };"""
content = content.replace(open_target, open_str)

# Add Email field to form UI
form_target = """                  <div className="form-group">
                    <label className="form-label">Ngày sinh</label>
                    <input type="date" className="form-control" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} />
                  </div>"""
form_str = """                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" placeholder="nguyenvana@gmail.com" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày sinh</label>
                    <input type="date" className="form-control" value={form.birthday || ''} onChange={e => setForm({ ...form, birthday: e.target.value })} />
                  </div>"""
content = content.replace(form_target, form_str)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done email form")
