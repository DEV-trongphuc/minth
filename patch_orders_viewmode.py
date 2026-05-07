import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix imports
content = content.replace(
    "from 'lucide-react';",
    ", List, LayoutGrid } from 'lucide-react';"
)
content = content.replace("ChevronDown, List, LayoutGrid }", "ChevronDown, List, LayoutGrid }")
content = re.sub(r'import \{ ([^}]+) \} from \'lucide-react\';', lambda m: 'import { ' + m.group(1).replace(', List, LayoutGrid', '') + ', List, LayoutGrid } from \'lucide-react\';', content)

# Add viewMode state
if "const [viewMode, setViewMode] = useState('list');" not in content:
    content = content.replace(
        "const [statusFilter, setStatusFilter] = useState('all');",
        "const [statusFilter, setStatusFilter] = useState('all');\n  const [viewMode, setViewMode] = useState('list');"
    )

# Add toggle to header
old_header = """        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Package size={24} color="var(--primary)" /> Quản lý Đơn hàng
          </h1>
          <p className="page-sub" style={{ marginTop: '.25rem' }}>Theo dõi hành trình đơn hàng và cập nhật trạng thái giao hàng.</p>
        </div>
      </div>"""

new_header = """        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Package size={24} color="var(--primary)" /> Quản lý Đơn hàng
          </h1>
          <p className="page-sub" style={{ marginTop: '.25rem' }}>Theo dõi hành trình đơn hàng và cập nhật trạng thái giao hàng.</p>
        </div>
        <div className="page-actions">
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Xem dạng danh sách"><List size={16} /></button>
            <button className={`view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} title="Xem dạng card"><LayoutGrid size={16} /></button>
          </div>
        </div>
      </div>"""

content = content.replace(old_header, new_header)

# Extract card content logic
card_logic_start = content.find('{filteredOrders.map(o => {')
card_logic_end = content.find('</div>\n            </div>\n          </>', card_logic_start)
if card_logic_end == -1:
    card_logic_end = content.find('</div>\n            </div>\n\n            {/* Edit Order Modal */}', card_logic_start)

# We need to restructure the JSX carefully.
# The structure right now:
# <>
#   <div className="table-wrap desktop-only" ...> <table...> </div>
#   <div className="mobile-only">
#     <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
#       {filteredOrders.map...}
#     </div>
#   </div>
# </>

# Let's replace the whole section starting from <div className="table-wrap desktop-only" to the end of <div className="mobile-only">
start_tag = '<div className="table-wrap desktop-only"'
end_tag = '</div>\n            </div>\n          </>'
start_idx = content.find(start_tag)
end_idx = content.find(end_tag, start_idx) + len(end_tag) - 5 # Keep the </>

if start_idx != -1 and end_idx != -1:
    section = content[start_idx:end_idx]
    
    # We want to extract the card mapping part
    card_start = section.find('{filteredOrders.map(o => {')
    card_end = section.rfind('</div>\n            </div>') # End of mobile-only
    card_mapping = section[card_start:card_end]
    
    table_part = section[:section.find('<!-- MOBILE CARD VIEW -->') if '<!-- MOBILE CARD VIEW -->' in section else section.find('{/* MOBILE CARD VIEW */}')]
    
    new_section = f"""{{viewMode === 'list' ? (
              <>
                {table_part}
                <div className="mobile-only">
                  <div className="grid-3-cards" style={{ padding: '1rem' }}>
                    {card_mapping}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid-3-cards" style={{ padding: '1rem' }}>
                {card_mapping}
              </div>
            )}}"""
            
    content = content[:start_idx] + new_section + content[end_idx:]

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Applied viewMode toggle to Orders.jsx")
