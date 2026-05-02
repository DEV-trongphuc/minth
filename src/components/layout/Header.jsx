import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search, ChevronRight, RefreshCw, AlertTriangle, PackageX } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useNavigate } from 'react-router-dom';

const Header = ({ toggleSidebar, pageName }) => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/batches.php`);
      if (res.ok) {
        const data = await res.json();
        const alerts = [];
        data.forEach(b => {
          if (b.current_qty <= 5) {
            alerts.push({
              id: `stock_${b.id}`,
              type: 'stock',
              title: b.current_qty === 0 ? 'Hết hàng' : 'Sắp hết hàng',
              message: `${b.product_name} (Lô: ${b.batch_code}) - Tồn: ${b.current_qty} chai`,
              color: b.current_qty === 0 ? 'var(--danger)' : 'var(--warning)',
              icon: <PackageX size={16} />
            });
          }
          if (b.expiry_date) {
            const exp = new Date(b.expiry_date);
            const now = new Date();
            const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            if (diffDays <= 90) {
              alerts.push({
                id: `exp_${b.id}`,
                type: 'expiry',
                title: diffDays < 0 ? 'Đã hết hạn' : 'Sắp hết hạn',
                message: `${b.product_name} (Lô: ${b.batch_code}) - Còn ${diffDays} ngày`,
                color: diffDays < 0 ? 'var(--danger)' : 'var(--warning)',
                icon: <AlertTriangle size={16} />
              });
            }
          }
        });
        setNotifications(alerts);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-btn" onClick={toggleSidebar}>
          <Menu size={22} />
        </button>

        {/* Breadcrumb */}
        <div className="topbar-breadcrumb">
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>MINTH</span>
          <ChevronRight size={14} color="var(--text-light)" />
          <span>{pageName}</span>
        </div>

        {/* Search */}
        <div className="topbar-search">
          <Search size={16} />
          <input type="text" placeholder="Tìm kiếm toàn hệ thống..." />
        </div>
      </div>

      <div className="topbar-right">
        {/* Refresh */}
        <button className="icon-btn" title="Làm mới dữ liệu" onClick={() => window.location.reload()}>
          <RefreshCw size={16} />
        </button>

        {/* Notification */}
        <div style={{ position: 'relative' }}>
          <button className="icon-btn" title="Thông báo" onClick={() => setShowDropdown(!showDropdown)}>
            <Bell size={18} />
            {notifications.length > 0 && <span className="badge-dot" />}
          </button>
          
          {showDropdown && (
            <>
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setShowDropdown(false)} />
              <div style={{ position: 'absolute', top: '120%', right: 0, width: '320px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Cảnh báo hệ thống</span>
                  <span className="badge badge-danger">{notifications.length}</span>
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Không có cảnh báo nào
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', transition: 'background .2s' }} className="hover-bg" onClick={() => { setShowDropdown(false); navigate('/inventory'); }}>
                        <div style={{ color: n.color, marginTop: '0.1rem' }}>{n.icon}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: n.color }}>{n.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{n.message}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User chip */}
        <div className="user-chip">
          <div className="user-avatar">AD</div>
          <span className="user-chip-name desktop-only">Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
