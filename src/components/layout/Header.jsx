import React from 'react';
import { Menu, Bell, Search, ChevronRight, RefreshCw } from 'lucide-react';

const Header = ({ toggleSidebar, pageName }) => {
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
        <button className="icon-btn" title="Làm mới dữ liệu">
          <RefreshCw size={16} />
        </button>

        {/* Notification - Hidden per request */}
        {/* <button className="icon-btn" title="Thông báo">
          <Bell size={18} />
          <span className="badge-dot" />
        </button> */}

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
