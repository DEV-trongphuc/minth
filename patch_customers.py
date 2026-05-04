import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add pagination state
state_injection = """  const [tierFilter, setTierFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;"""
content = content.replace("  const [tierFilter, setTierFilter] = useState('');", state_injection)

# 2. Reset page on filter changes
effect_injection = """  useEffect(() => { setCurrentPage(1); }, [search, tierFilter]);

  const filtered ="""
content = content.replace("  const filtered =", effect_injection)

# 3. Calculate paginated data
paginated_logic = """  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedCustomers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAdd ="""
content = content.replace("  const openAdd =", paginated_logic)

# 4. Replace filtered.map with paginatedCustomers.map
# We have multiple places: card view desktop, list view desktop, and card view mobile
# Wait, let's carefully replace only where we map the data for display.

# Card View (Desktop)
# {filtered.map(c => <CustomerCard key={c.id} c={c} />)}
content = content.replace("filtered.map(c => <CustomerCard key={c.id} c={c} />)", "paginatedCustomers.map(c => <CustomerCard key={c.id} c={c} />)")

# List View (Desktop)
# {filtered.map(c => (
content = content.replace("{filtered.map(c => (", "{paginatedCustomers.map(c => (")

# 5. Add Pagination UI Component
# Needs to be added right after the card view / table view closing div
pagination_ui = """
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Trang trước
          </button>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Trang {currentPage} / {totalPages}
          </span>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Trang sau
          </button>
        </div>
      )}
"""

# Insert after mobile card view
# The mobile card view ends with:
#         </div>
#         </>
#       )}
# Let's insert it before the showModal block

content = content.replace("        </>\n      )}\n      {showModal && createPortal(", "        </>\n      )}\n" + pagination_ui + "\n      {showModal && createPortal(")


with open("F:\\HAMIEN_LUCCY\\src\\pages\\Customers.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Added pagination to Customers.jsx")
