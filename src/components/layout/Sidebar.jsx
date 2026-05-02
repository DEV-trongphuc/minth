import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart2, Settings, LogOut, Store, PlusCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config';

const navItems = [
  { path: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/products', label: 'Danh mục Sản phẩm', icon: Package },
  { path: '/inventory', label: 'Quản lý Kho', icon: Package },
  { path: '/orders', label: 'Quản lý đơn hàng', icon: ShoppingCart, badge: 'orders' },
  { path: '/customers', label: 'Khách hàng', icon: Users },
];

const Sidebar = ({ isOpen, setIsOpen }) => {
  const [pendingOrders, setPendingOrders] = useState(0);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('luccy_auth');
    navigate('/login');
  };

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders.php`);
        if (res.ok) {
          const data = await res.json();
          setPendingOrders(data.filter(o => o.status === 'pending').length);
        }
      } catch (e) { }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Store size={22} />
        </div>
        <div>
          <div className="sidebar-brand-name">MINTH</div>
          <div className="sidebar-brand-sub">Quản lý bán hàng</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => { window.dispatchEvent(new Event('open-pos')); if (window.innerWidth < 1024) setIsOpen(false); }}
            style={{ 
              width: '100%', 
              background: 'var(--primary)', 
              color: '#fff', 
              border: 'none', 
              padding: '0.75rem', 
              borderRadius: 'var(--r-sm)', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem', 
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <PlusCircle size={18} /> Tạo Đơn Nhanh
          </button>
        </div>

        <div className="nav-section-label">Chức năng chính</div>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => { if (window.innerWidth < 1024) setIsOpen(false); }}
            >
              <span className="nav-icon-wrap"><Icon size={17} /></span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge === 'orders' && pendingOrders > 0 && (
                <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '10px', marginLeft: 'auto' }}>
                  {pendingOrders}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className="nav-section-label" style={{ marginTop: '1.5rem' }}>Hệ thống</div>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon-wrap"><Settings size={17} /></span>
          Cài đặt
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-avatar">HM</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-footer-name">Hà Miên</div>
          <div className="sidebar-footer-role">Chủ cửa hàng</div>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', padding: '.25rem' }}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
