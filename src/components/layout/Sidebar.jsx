import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart2, Settings, LogOut, Store, PlusCircle, ClipboardList, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { API_BASE_URL } from '../../config';

const navItems = [
  { path: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/products', label: 'Danh mục Sản phẩm', icon: ClipboardList },
  { path: '/inventory', label: 'Quản lý Kho', icon: Package },
  { path: '/orders', label: 'Quản lý đơn hàng', icon: ShoppingCart, badge: 'orders' },
  { path: '/customers', label: 'Khách hàng', icon: Users },
  { path: '/expenses', label: 'Chi phí & Đầu tư', icon: Wallet },
];

const Sidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const [pendingOrders, setPendingOrders] = useState(0);
  const [currentUser, setCurrentUser] = useState({});
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('luccy_auth');
    navigate('/login');
  };

  useEffect(() => {
    setCurrentUser(JSON.parse(localStorage.getItem('luccy_user') || '{}'));
    
    const handleUserUpdated = () => {
      setCurrentUser(JSON.parse(localStorage.getItem('luccy_user') || '{}'));
    };
    window.addEventListener('user-updated', handleUserUpdated);
    return () => window.removeEventListener('user-updated', handleUserUpdated);
  }, []);

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
        <button 
          className="desktop-only"
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ position: 'absolute', right: '-12px', top: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, color: 'var(--text-muted)' }}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
          <button 
            className="sidebar-create-btn"
            onClick={() => { window.dispatchEvent(new Event('open-pos')); if (window.innerWidth < 1024) setIsOpen(false); }}
          >
            <PlusCircle size={18} /> <span>Tạo Đơn Nhanh</span>
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
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => { if (window.innerWidth < 1024) setIsOpen(false); }}>
          <span className="nav-icon-wrap"><Settings size={17} /></span>
          <span style={{ flex: 1 }}>Cài đặt</span>
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {currentUser.avatar ? (
          <img src={currentUser.avatar} alt="Avatar" className="sidebar-footer-avatar" style={{ objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div className="sidebar-footer-avatar" style={{ display: currentUser.avatar ? 'none' : 'flex' }}>
          AD
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-footer-name">{currentUser.username === 'admin' ? 'Hà Miên' : (currentUser.username || 'Admin')}</div>
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
