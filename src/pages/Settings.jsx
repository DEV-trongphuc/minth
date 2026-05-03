import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Star, Camera, Lock, CheckCircle, Smartphone } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useDialog } from '../components/ui/DialogContext';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('account');
  const [user, setUser] = useState({});
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [settings, setSettings] = useState({ 
    tier_loyal: 5000000, 
    tier_vip: 20000000,
    theme_mode: 'light',
    sound_notification: 1,
    low_stock_threshold: 5
  });
  
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const { showAlert } = useDialog();
  
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('luccy_user') || '{}');
      setUser(u);
      setAvatarUrl(u.avatar || '');
    } catch(e) {}

    fetch(`${API_BASE_URL}/settings.php`)
      .then(res => res.json())
      .then(data => {
        setSettings(s => ({ 
          ...s, 
          tier_loyal: data.tier_loyal ? Number(data.tier_loyal) : s.tier_loyal,
          tier_vip: data.tier_vip ? Number(data.tier_vip) : s.tier_vip,
          theme_mode: data.theme_mode || 'light',
          sound_notification: data.sound_notification !== undefined ? Number(data.sound_notification) : 1,
          low_stock_threshold: data.low_stock_threshold !== undefined ? Number(data.low_stock_threshold) : 5
        }));
      })
      .catch(console.error);
  }, []);

  const handleUpdateAvatar = async (e) => {
    e.preventDefault();
    if (!avatarUrl) return showAlert('Cảnh báo', 'Vui lòng nhập đường dẫn ảnh hợp lệ!', 'warning');
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth.php?action=update_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, avatar: avatarUrl })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedUser = { ...user, avatar: avatarUrl };
        localStorage.setItem('luccy_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        showAlert('Thành công', 'Đã cập nhật ảnh đại diện!', 'success');
        window.dispatchEvent(new Event('user-updated')); // Dispatch event to update sidebar
      } else {
        showAlert('Lỗi', 'Lỗi cập nhật ảnh đại diện', 'error');
      }
    } catch (err) {
      showAlert('Lỗi', 'Không thể kết nối máy chủ', 'error');
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return showAlert('Lỗi', 'Mật khẩu xác nhận không khớp!', 'danger');
    }
    if (passwordForm.new_password.length < 6) {
      return showAlert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự!', 'warning');
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth.php?action=change_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username || 'hamien_luccy',
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('Thành công', 'Đổi mật khẩu thành công! Bạn sẽ được đăng xuất để đăng nhập lại.', 'success');
        setTimeout(() => {
          localStorage.removeItem('luccy_auth');
          localStorage.removeItem('luccy_user');
          window.location.href = '/login';
        }, 2000);
      } else {
        showAlert('Thất bại', data.error || 'Mật khẩu cũ không chính xác', 'danger');
      }
    } catch (err) {
      showAlert('Lỗi', 'Không thể kết nối máy chủ', 'danger');
    }
  };

  const handleSaveTiers = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE_URL}/settings.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier_loyal: settings.tier_loyal, tier_vip: settings.tier_vip })
      });
      showAlert('Thành công', 'Đã lưu cấu hình phân hạng Khách hàng!', 'success');
    } catch (e) {
      showAlert('Lỗi', 'Không thể lưu cài đặt', 'error');
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      await fetch(`${API_BASE_URL}/settings.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          theme_mode: settings.theme_mode,
          sound_notification: settings.sound_notification,
          low_stock_threshold: settings.low_stock_threshold
        })
      });
      showAlert('Thành công', 'Đã lưu các cài đặt giao diện và hệ thống!', 'success');
    } catch (e) {
      showAlert('Lỗi', 'Không thể lưu cài đặt. Vui lòng thử lại!', 'error');
    }
  };

  const TABS = [
    { id: 'account', label: 'Tài khoản', icon: User },
    { id: 'security', label: 'Bảo mật', icon: Shield },
    { id: 'crm', label: 'Hạng Khách hàng', icon: Star },
    { id: 'system', label: 'Hệ thống', icon: Smartphone }
  ];

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <SettingsIcon size={26} color="var(--primary)" /> Cài đặt Hệ thống
          </h1>
          <p className="page-sub">Quản lý hồ sơ, bảo mật, và tinh chỉnh hệ thống Minth POS.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Sidebar Nav */}
        <div className="card" style={{ flex: '1 1 250px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: isActive ? 'var(--primary-light)' : 'transparent', color: isActive ? 'var(--primary)' : 'var(--text-main)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left', fontWeight: isActive ? 700 : 500, transition: 'all 0.2s', fontSize: '0.95rem' }} className="hover-bg">
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="card" style={{ flex: '3 1 500px', padding: '2rem', minHeight: '400px' }}>
          
          {activeTab === 'account' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Hồ sơ Cá nhân</h2>
                <p className="text-muted text-sm">Cập nhật thông tin hiển thị và ảnh đại diện của bạn.</p>
              </div>

              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--surface2)', border: '4px solid var(--surface)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = ''; setAvatarUrl(''); }} />
                    ) : (
                      <User size={48} color="var(--border-dark)" />
                    )}
                  </div>
                </div>
                
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Tài khoản đăng nhập</label>
                    <input type="text" className="form-control" value={user.username || 'admin'} disabled style={{ background: 'var(--surface2)', cursor: 'not-allowed', opacity: 0.8 }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Chức vụ</label>
                    <input type="text" className="form-control" value={user.role === 'admin' ? 'Quản trị viên (Admin)' : 'Nhân viên'} disabled style={{ background: 'var(--surface2)', cursor: 'not-allowed', opacity: 0.8 }} />
                  </div>
                  
                  <form onSubmit={handleUpdateAvatar} style={{ background: 'var(--surface)', border: '1px dashed var(--border)', padding: '1.5rem', borderRadius: 'var(--r-md)', marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Camera size={16} /> Cập nhật Ảnh đại diện
                    </h4>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="text-xs text-muted">Đường dẫn ảnh (URL) hoặc Base64</label>
                      <input type="text" className="form-control" placeholder="https://example.com/avatar.jpg" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-secondary btn-sm">Lưu Ảnh đại diện</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Bảo mật & Mật khẩu</h2>
                <p className="text-muted text-sm">Đảm bảo tài khoản của bạn luôn được an toàn.</p>
              </div>

              <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '400px' }}>
                <div className="form-group">
                  <label className="form-label">Mật khẩu hiện tại <span className="text-danger">*</span></label>
                  <input type="password" className="form-control" placeholder="Nhập mật khẩu cũ..." required value={passwordForm.old_password} onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})} autoComplete="current-password" />
                </div>
                
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0.5rem 0' }} />
                
                <div className="form-group">
                  <label className="form-label">Mật khẩu mới <span className="text-danger">*</span></label>
                  <input type="password" className="form-control" placeholder="Ít nhất 6 ký tự..." required minLength="6" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label className="form-label">Xác nhận mật khẩu mới <span className="text-danger">*</span></label>
                  <input type="password" className="form-control" placeholder="Nhập lại mật khẩu mới..." required minLength="6" value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} autoComplete="new-password" />
                </div>
                
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={16} /> Đổi Mật Khẩu
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Hạng Khách hàng (CRM)</h2>
                <p className="text-muted text-sm">Thiết lập điều kiện để khách hàng thăng hạng tự động.</p>
              </div>

              <form onSubmit={handleSaveTiers} style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tổng chi tiêu tối thiểu - Hạng LOYAL</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{settings.tier_loyal.toLocaleString('vi-VN')} đ</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" className="form-control" value={settings.tier_loyal} onChange={e => setSettings({...settings, tier_loyal: Number(e.target.value)})} style={{ paddingRight: '2rem' }} />
                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>đ</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tổng chi tiêu tối thiểu - Hạng VIP</span>
                    <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{settings.tier_vip.toLocaleString('vi-VN')} đ</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" className="form-control" value={settings.tier_vip} onChange={e => setSettings({...settings, tier_vip: Number(e.target.value)})} style={{ paddingRight: '2rem' }} />
                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>đ</span>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-warning" style={{ color: '#000', fontWeight: 600 }}>Lưu Phân hạng CRM</button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Hệ thống & Giao diện</h2>
                <p className="text-muted text-sm">Tùy chỉnh trải nghiệm sử dụng hệ thống.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', background: 'var(--surface2)', padding: '1.25rem', borderRadius: 'var(--r-md)' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Palette size={18} color="var(--primary)" /> Chế độ hiển thị</h4>
                    <p className="text-xs text-muted">Chọn giao diện sáng hoặc tối cho toàn bộ hệ thống.</p>
                  </div>
                  <select className="form-control" style={{ width: '200px' }} value={settings.theme_mode} onChange={e => setSettings({...settings, theme_mode: e.target.value})}>
                    <option value="light">Sáng (Light Mode)</option>
                    <option value="dark" disabled>Tối (Dark Mode) - Sắp ra mắt</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', background: 'var(--surface2)', padding: '1.25rem', borderRadius: 'var(--r-md)' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bell size={18} color="var(--warning)" /> Thông báo Hệ thống</h4>
                    <p className="text-xs text-muted">Cấu hình các cảnh báo tự động từ hệ thống.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '280px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem' }} checked={settings.sound_notification === 1} onChange={e => setSettings({...settings, sound_notification: e.target.checked ? 1 : 0})} />
                      <span style={{ fontWeight: 500 }}>Bật âm thanh cảnh báo lỗi</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem' }} checked={settings.low_stock_threshold > 0} onChange={e => setSettings({...settings, low_stock_threshold: e.target.checked ? 5 : 0})} />
                        <span style={{ fontWeight: 500 }}>Báo hết hàng khi tồn kho dưới</span>
                      </label>
                      <input type="number" className="form-control" value={settings.low_stock_threshold || 5} min={1} onChange={e => setSettings({...settings, low_stock_threshold: Number(e.target.value)})} disabled={settings.low_stock_threshold === 0} style={{ width: '60px', padding: '0.3rem 0.5rem', textAlign: 'center' }} />
                      <span className="text-muted text-sm">sản phẩm</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button className="btn btn-primary" onClick={handleSaveSystemSettings} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={18} /> Lưu Cài đặt Hệ thống
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
