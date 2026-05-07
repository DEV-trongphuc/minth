import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search, ChevronRight, RefreshCw, AlertTriangle, PackageX, X } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useNavigate } from 'react-router-dom';

const Header = ({ toggleSidebar, pageName }) => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    try {
      const [bRes, sRes] = await Promise.all([
        fetch(`${API_BASE_URL}/batches.php`),
        fetch(`${API_BASE_URL}/settings.php`)
      ]);
      
      if (bRes.ok) {
        const data = await bRes.json();
        let lowStockThreshold = 5;
        if (sRes.ok) {
          const settings = await sRes.json();
          if (settings.low_stock_threshold !== undefined) lowStockThreshold = Number(settings.low_stock_threshold);
        }

        const alerts = [];
        data.forEach(b => {
          if (b.current_qty > 0 && b.current_qty <= lowStockThreshold) {
            alerts.push({
              id: `stock_${b.id}`,
              type: 'stock',
              title: 'Sắp hết hàng',
              message: `${b.product_name} (Lô: ${b.batch_code}) - Tồn: ${b.current_qty} ${b.unit === 'chai' ? 'chai' : (b.unit === 'tuyp' ? 'tuýp' : 'đơn vị')}`,
              color: 'var(--warning)',
              icon: <PackageX size={16} />
            });
          }
          if (b.expiry_date && b.expiry_date !== '0000-00-00') {
            const exp = new Date(b.expiry_date);
            if (!isNaN(exp.getTime())) {
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
          }
        });
        
        let dismissed = [];
        try { dismissed = JSON.parse(localStorage.getItem('dismissed_alerts') || '[]'); } catch {}
        setNotifications(alerts.filter(a => !dismissed.includes(a.id)));
      }
    } catch (e) {}
  };

  const dismissAlert = (e, id) => {
    e.stopPropagation();
    let dismissed = [];
    try { dismissed = JSON.parse(localStorage.getItem('dismissed_alerts') || '[]'); } catch {}
    dismissed.push(id);
    localStorage.setItem('dismissed_alerts', JSON.stringify(dismissed));
    setNotifications(prev => prev.filter(n => n.id !== id));
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
                      <div key={n.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', transition: 'background .2s', position: 'relative' }} className="hover-bg" onClick={() => { setShowDropdown(false); navigate('/inventory'); }}>
                        <div style={{ color: n.color, marginTop: '0.1rem' }}>{n.icon}</div>
                        <div style={{ flex: 1, paddingRight: '1rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: n.color }}>{n.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{n.message}</div>
                        </div>
                        <button className="icon-btn" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', opacity: 0.5, padding: '0.25rem' }} onClick={(e) => dismissAlert(e, n.id)} title="Xóa thông báo này">
                          <X size={14} />
                        </button>
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
          {(() => {
            const u = JSON.parse(localStorage.getItem('luccy_user') || '{}');
            return (
              <>
                {u.avatar ? (
                  <img src={u.avatar} alt="Avatar" className="user-avatar" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="user-avatar">AD</div>
                )}
                <span className="user-chip-name desktop-only">{(u.username === 'admin' || u.username === 'hamien_luccy') ? 'Hà Miên' : (u.name || u.username || 'Hà Miên')}</span>
              </>
            );
          })()}
        </div>
      </div>
    </header>
  );
};

export default Header;
