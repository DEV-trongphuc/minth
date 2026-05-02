import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Orders from './pages/Orders';
import { DialogProvider } from './components/ui/DialogContext';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('luccy_auth');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <DialogProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </DialogProvider>
  );
}

export default App;
