import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import POS from '../../pages/POS';

const routeNames = {
  '/dashboard': 'Tổng quan',
  '/inventory': 'Quản lý Kho',
  '/customers': 'Khách hàng',
  '/orders': 'Quản lý Đơn hàng',
  '/products': 'Sản phẩm'
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const location = useLocation();
  const pageName = routeNames[location.pathname] || 'Trang';

  useEffect(() => {
    const handleOpenPos = () => setPosOpen(true);
    window.addEventListener('open-pos', handleOpenPos);
    return () => window.removeEventListener('open-pos', handleOpenPos);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} onOpenPos={() => setPosOpen(true)} />
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="main-wrapper">
        <Header toggleSidebar={() => setSidebarOpen(true)} pageName={pageName} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {posOpen && <POS onClose={() => setPosOpen(false)} onSuccess={() => window.dispatchEvent(new Event('pos-success'))} />}
    </div>
  );
};

export default Layout;
