import json
import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove TIERS and tierConfig
content = re.sub(r'const TIERS = \[\s*\{ label: \'Tất cả\', value: \'\' \},\s*\{ label: \'VIP\', value: \'VIP\' \},\s*\{ label: \'Loyal\', value: \'Loyal\' \},\s*\{ label: \'New\', value: \'New\' \},\s*\];\s*', '', content)
content = re.sub(r'const tierConfig = \{[\s\S]*?\};\s*', '', content)

# Add states
content = content.replace("const [settings, setSettings] = useState({ tier_loyal: 5000000, tier_vip: 20000000 });", "const [crmTiers, setCrmTiers] = useState([{ name: 'New', color: 'success' }, { name: 'Loyal', color: 'primary' }, { name: 'VIP', color: 'warning' }]);\n  const [crmTags, setCrmTags] = useState([]);")

# Form tags
content = content.replace("const [form, setForm] = useState({ name: '', phone: '', gender: '', birthday: '', address: '', note: '' });", "const [form, setForm] = useState({ name: '', phone: '', gender: '', birthday: '', address: '', note: '', tags: [] });")

# Fetch settings
content = content.replace("""    fetch(`${API_BASE_URL}/settings.php`).then(r => r.json()).then(d => {
      setSettings({ tier_loyal: Number(d.tier_loyal || 5000000), tier_vip: Number(d.tier_vip || 20000000) });
    }).catch(() => {});""", """    fetch(`${API_BASE_URL}/settings.php`).then(r => r.json()).then(d => {
      if (d.crm_tiers) {
        try { setCrmTiers(JSON.parse(d.crm_tiers)); } catch(e){}
      }
      if (d.crm_tags) {
        try { setCrmTags(JSON.parse(d.crm_tags)); } catch(e){}
      }
    }).catch(() => {});""")

# getTierConfig
content = content.replace("const handleCreateOrder = (c) => {", """const getTierConfig = (tierName) => {
    const t = crmTiers.find(x => x.name === tierName);
    if (!t) return { cls: 'badge-secondary', bg: 'var(--border)' };
    return { cls: `badge-${t.color}`, bg: `var(--${t.color})` };
  };

  const handleCreateOrder = (c) => {""")

# Filter UI replacements
content = content.replace("TIERS.map", "([{ label: 'Tất cả', value: '' }, ...crmTiers.map(t => ({ label: t.name, value: t.name }))]).map")
content = content.replace("{tierConfig[c.tier]?.icon}", "")
content = content.replace("tierConfig[c.tier]?.bg", "getTierConfig(c.tier).bg")
content = content.replace("tierConfig[c.tier]?.cls", "getTierConfig(c.tier).cls")
content = content.replace("tierConfig[detailItem.tier]?.bg", "getTierConfig(detailItem.tier).bg")
content = content.replace("tierConfig[detailItem.tier]?.cls", "getTierConfig(detailItem.tier).cls")

# Header Replacement
header_target = """        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Users size={24} color="var(--pink)" /> Quản lý Khách hàng (CRM)
          </h1>
          <p className="page-sub" style={{ marginTop: '0.25rem' }}>{customers.length} khách hàng • Phân loại hạng VIP tự động theo chi tiêu.</p>
          <div className="desktop-only" style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', background: 'var(--surface2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--r-sm)' }}>
            <strong style={{ color: 'var(--text)' }}>Hướng dẫn phân hạng:</strong>
            <span><span className="badge badge-success" style={{ padding: '0.1rem 0.3rem' }}>New</span> Khách mới</span>
            <span><span className="badge badge-primary" style={{ padding: '0.1rem 0.3rem' }}>Loyal</span> Chi tiêu {'>'} {settings.tier_loyal.toLocaleString('vi-VN')}đ</span>
            <span><span className="badge badge-warning" style={{ padding: '0.1rem 0.3rem' }}>VIP</span> Chi tiêu {'>'} {settings.tier_vip.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>"""

header_str = """        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Users size={24} color="var(--pink)" /> Quản lý Khách hàng (CRM)
          </h1>
          <p className="page-sub" style={{ marginTop: '0.25rem' }}>{customers.length} khách hàng • Phân loại hạng tự động theo chi tiêu.</p>
          <div className="desktop-only" style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '1rem', background: 'var(--surface2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--r-sm)', alignItems: 'center' }}>
            <strong style={{ color: 'var(--text)' }}>Hướng dẫn phân hạng:</strong>
            {crmTiers.map(t => (
              <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className={`badge badge-${t.color}`} style={{ padding: '0.1rem 0.3rem' }}>{t.name}</span>
                {t.min_spend > 0 ? `> ${(t.min_spend).toLocaleString('vi-VN')}đ` : 'Mặc định'}
              </span>
            ))}
          </div>
        </div>"""
content = content.replace(header_target, header_str)

# openAdd / openEdit
open_methods = """  const openAdd = () => { setEditItem(null); setForm({ name: '', phone: '', gender: '', birthday: '', address: '', note: '' }); setShowModal(true); };
  const openEdit = (c) => { setEditItem(c); setForm({ name: c.name, phone: c.phone, gender: c.gender || '', birthday: c.birthday || '', address: c.address || '', note: c.note || '' }); setShowModal(true); };"""
open_str = """  const openAdd = () => { setEditItem(null); setForm({ name: '', phone: '', gender: '', birthday: '', address: '', note: '', tags: [] }); setShowModal(true); };
  const openEdit = (c) => { 
    let tags = [];
    try { tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : (c.tags || []); } catch(e){}
    setEditItem(c); 
    setForm({ name: c.name, phone: c.phone, gender: c.gender || '', birthday: c.birthday || '', address: c.address || '', note: c.note || '', tags }); 
    setShowModal(true); 
  };"""
content = content.replace(open_methods, open_str)

# Form Checkboxes
form_target = """                  <div className="form-group">
                    <label className="form-label">Ghi chú (Sở thích, lưu ý...)</label>
                    <textarea className="form-control" placeholder="VD: Thích nước hoa Chanel, nhạy cảm với mùi hương mạnh..." rows={3} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>"""
form_str = """                  <div className="form-group">
                    <label className="form-label">Ghi chú (Sở thích, lưu ý...)</label>
                    <textarea className="form-control" placeholder="VD: Thích nước hoa Chanel, nhạy cảm với mùi hương mạnh..." rows={3} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Thẻ Phân loại (Tags)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: 'var(--surface2)', padding: '0.75rem', borderRadius: 'var(--r-sm)' }}>
                      {crmTags.length === 0 && <span className="text-muted text-sm">Chưa có Thẻ nào.</span>}
                      {crmTags.map(tag => (
                        <label key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={(form.tags || []).includes(tag.name)} onChange={e => {
                            const tags = form.tags || [];
                            if (e.target.checked) setForm({ ...form, tags: [...tags, tag.name] });
                            else setForm({ ...form, tags: tags.filter(t => t !== tag.name) });
                          }} style={{ width: 'auto', margin: 0 }} />
                          <span style={{ background: tag.color, color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{tag.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>"""
content = content.replace(form_target, form_str)

# Card Tags
card_target = """            {c.address && <div className="text-xs text-muted" style={{ marginTop: '.15rem', display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}><MapPin size={12} style={{ marginTop: '0.1rem', flexShrink: 0 }} /> <span>{c.address}</span></div>}
          </div>"""
card_str = """            {c.address && <div className="text-xs text-muted" style={{ marginTop: '.15rem', display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}><MapPin size={12} style={{ marginTop: '0.1rem', flexShrink: 0 }} /> <span>{c.address}</span></div>}
            {c.tags && (() => {
              try {
                const tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags;
                if (!tags || tags.length === 0) return null;
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.35rem' }}>
                    {tags.map((t, i) => {
                      const tagConfig = crmTags.find(x => x.name === t);
                      return <span key={i} style={{ background: tagConfig?.color || '#ec4899', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 600 }}>{t}</span>;
                    })}
                  </div>
                );
              } catch(e) { return null; }
            })()}
          </div>"""
content = content.replace(card_target, card_str)

# List Tags
list_target = """                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                          <div className="customer-avatar" style={{ width: 36, height: 36, background: getTierConfig(c.tier).bg, fontSize: '.875rem', borderRadius: 8 }}>{c.name.charAt(0)}</div>
                          <span style={{ fontWeight: 600 }}>{c.name}</span>
                        </div>"""
list_str = """                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                          <div className="customer-avatar" style={{ width: 36, height: 36, background: getTierConfig(c.tier).bg, fontSize: '.875rem', borderRadius: 8 }}>{c.name.charAt(0)}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                            {c.tags && (() => {
                              try {
                                const tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags;
                                if (!tags || tags.length === 0) return null;
                                return (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {tags.map((t, i) => {
                                      const tagConfig = crmTags.find(x => x.name === t);
                                      return <span key={i} style={{ background: tagConfig?.color || '#ec4899', color: '#fff', fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 600 }}>{t}</span>;
                                    })}
                                  </div>
                                );
                              } catch(e) { return null; }
                            })()}
                          </div>
                        </div>"""
content = content.replace(list_target, list_str)

# Modal Tags
modal_target = """                  <div>
                    <h2 className="modal-title">{detailItem.name}</h2>
                    <span className={`badge ${getTierConfig(detailItem.tier).cls}`}>{detailItem.tier}</span>
                  </div>"""
modal_str = """                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h2 className="modal-title">{detailItem.name}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge ${getTierConfig(detailItem.tier).cls}`}>{detailItem.tier}</span>
                      {detailItem.tags && (() => {
                        try {
                          const tags = typeof detailItem.tags === 'string' ? JSON.parse(detailItem.tags) : detailItem.tags;
                          if (!tags || tags.length === 0) return null;
                          return tags.map((t, i) => {
                            const tagConfig = crmTags.find(x => x.name === t);
                            return <span key={i} style={{ background: tagConfig?.color || '#ec4899', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 600 }}>{t}</span>;
                          });
                        } catch(e) { return null; }
                      })()}
                    </div>
                  </div>"""
content = content.replace(modal_target, modal_str)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
