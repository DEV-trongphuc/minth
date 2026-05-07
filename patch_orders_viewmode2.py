with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix imports
content = content.replace(
    "from 'lucide-react';",
    ", List, LayoutGrid } from 'lucide-react';"
)

# Add viewMode state
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

# Find the start of the table block and the end of the mobile block
# It looks like:
#           <>
#             <div className="table-wrap desktop-only" style={{ overflowX: 'auto', paddingBottom: '20px' }}>
# ...
#               </table>
#             </div>
#
#             {/* MOBILE CARD VIEW */}
#             <div className="mobile-only">
#               <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
#                 {filteredOrders.map(o => {

start_table = '<div className="table-wrap desktop-only" style={{ overflowX: \'auto\', paddingBottom: \'20px\' }}>'
start_mobile = '{/* MOBILE CARD VIEW */}'
end_mobile = '              </div>\n            </div>\n          </>'

idx1 = content.find(start_table)
idx2 = content.find(start_mobile)
idx3 = content.find(end_mobile, idx2)

if idx1 != -1 and idx2 != -1 and idx3 != -1:
    # table_part is everything from `<div className="table-wrap` to just before ` {/* MOBILE CARD VIEW */}`
    table_part = content[idx1:idx2]
    
    # mobile_part is everything from ` {/* MOBILE CARD VIEW */}` to just before ` </>\n`
    mobile_part = content[idx2:idx3]
    
    # Now we need to extract ONLY the `{filteredOrders.map(o => { ... })}` part from mobile_part.
    # The structure of mobile_part is:
    #             {/* MOBILE CARD VIEW */}
    #             <div className="mobile-only">
    #               <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    #                 {filteredOrders.map(o => { ... })}
    #               </div>
    #             </div>
    
    map_start = mobile_part.find('{filteredOrders.map(o => {')
    # The map ends where the `</div>` of the flex column starts.
    # We can just extract everything from map_start to the end minus the last two closing divs
    # Let's find the second to last `</div>`
    map_end = mobile_part.rfind('</div>\n            </div>')
    
    mapping_code = mobile_part[map_start:map_end]
    
    # Construct the new logic
    new_logic = f"""{{viewMode === 'list' ? (
              <>
                {table_part}
                {/* MOBILE CARD VIEW FOR LIST MODE (FALLBACK) */}
                <div className="mobile-only">
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {mapping_code}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid-3-cards" style={{ padding: '1.5rem' }}>
                {mapping_code}
              </div>
            )}}"""
            
    content = content[:idx1] + new_logic + content[idx3:]

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Applied viewMode toggle safely")
