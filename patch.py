import json
import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add tags checkboxes to the form
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
                  </div>
                </div>
                <div className="modal-footer">"""

content = re.sub(r'<div className="form-group">\s*<label className="form-label">Ghi ch.*? rows=\{3\}.*?</div>\s*</div>\s*<div className="modal-footer">', form_str, content, flags=re.DOTALL)

# 2. Add tags to CustomerCard
card_tags = """            {c.address && <div className="text-xs text-muted" style={{ marginTop: '.15rem', display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}><MapPin size={12} style={{ marginTop: '0.1rem', flexShrink: 0 }} /> <span>{c.address}</span></div>}
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

content = re.sub(r'\{c\.address && <div.*?MapPin size=\{12\}.*?</div>\}\s*</div>', card_tags, content, flags=re.DOTALL)

# 3. Add tags to List View
list_tags = """                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
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

content = re.sub(r'<span style={{ fontWeight: 600 }}>\{c\.name\}</span>\s*</div>', list_tags, content, flags=re.DOTALL)

# 4. Detail modal tags
modal_tags = """                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
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

content = re.sub(r'<div>\s*<h2 className="modal-title">\{detailItem\.name\}</h2>\s*<span className={`badge \$\{getTierConfig\(detailItem\.tier\)\.cls\}`\}>(.*?)</span>\s*</div>', modal_tags, content, flags=re.DOTALL)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
