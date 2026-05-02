import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const routeNames = {
  '/dashboard': 'Tổng quan',
  '/inventory': 'Quản lý Kho',
  '/pos': 'Bán hàng (POS)',
  '/customers': 'Khách hàng',
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageName = routeNames[location.pathname] || 'Trang';

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="main-wrapper">
        <Header toggleSidebar={() => setSidebarOpen(true)} pageName={pageName} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
