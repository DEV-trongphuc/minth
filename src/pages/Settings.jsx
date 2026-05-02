import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Star } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useDialog } from '../components/ui/DialogContext';

export default function Settings() {
  const [settings, setSettings] = useState({ 
    tier_loyal: 5000000, 
    tier_vip: 20000000,
    theme_mode: 'light',
    sound_notification: 1,
    low_stock_threshold: 5
  });
  const { showAlert } = useDialog();
  
  useEffect(() => {
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

  const handleSaveTiers = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE_URL}/settings.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier_loyal: settings.tier_loyal, tier_vip: settings.tier_vip })
      });
      alert('Cập nhật phân hạng thành công!');
    } catch (e) {
      alert('Lỗi cập nhật');
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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <SettingsIcon size={24} color="var(--primary)" /> Cài đặt Hệ thống
          </h1>
          <p className="page-sub">Cấu hình thông tin cửa hàng, phân quyền và giao diện.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        <section>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            <User size={18} color="var(--primary)" /> Thông tin Tài khoản
          </h3>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Tên hiển thị</label>
              <input type="text" className="form-control" defaultValue="Admin Minth" autoComplete="username" />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Đổi Mật khẩu</label>
              <input type="password" className="form-control" placeholder="Nhập mật khẩu mới..." autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Cập nhật Tài khoản</button>
          </form>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

        <section>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            <Star size={18} color="var(--warning)" /> Phân hạng Khách hàng (CRM)
          </h3>
          <form onSubmit={handleSaveTiers}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Chi tiêu tối thiểu hạng Loyal (đ)</label>
              <input type="number" className="form-control" value={settings.tier_loyal} onChange={e => setSettings({...settings, tier_loyal: Number(e.target.value)})} />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Chi tiêu tối thiểu hạng VIP (đ)</label>
              <input type="number" className="form-control" value={settings.tier_vip} onChange={e => setSettings({...settings, tier_vip: Number(e.target.value)})} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', background: 'var(--warning)', borderColor: 'var(--warning)' }}>Lưu Phân hạng</button>
          </form>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

        <section>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            <Palette size={18} color="var(--pink)" /> Giao diện & Hiển thị
          </h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 150px', color: 'var(--text-muted)' }}>Chế độ hiển thị mặc định</span>
            <select className="form-control" style={{ flex: '1 1 200px' }} value={settings.theme_mode} onChange={e => setSettings({...settings, theme_mode: e.target.value})}>
              <option value="light">Sáng (Light Mode)</option>
              <option value="dark" disabled>Tối (Dark Mode) - Sắp ra mắt</option>
            </select>
          </div>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

        <section>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            <Bell size={18} color="var(--warning)" /> Thông báo Hệ thống
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.sound_notification === 1} onChange={e => setSettings({...settings, sound_notification: e.target.checked ? 1 : 0})} />
              <span>Bật âm thanh báo đơn hàng mới</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.low_stock_threshold > 0} onChange={e => setSettings({...settings, low_stock_threshold: e.target.checked ? 5 : 0})} />
                <span>Cảnh báo khi lô hàng sắp hết (dưới</span>
              </label>
              <input type="number" className="form-control" value={settings.low_stock_threshold || 5} min={1} onChange={e => setSettings({...settings, low_stock_threshold: Number(e.target.value)})} disabled={settings.low_stock_threshold === 0} style={{ width: '60px', padding: '0.3rem 0.5rem', textAlign: 'center' }} />
              <span>chai)</span>
            </div>
          </div>
        </section>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSaveSystemSettings}>
            Lưu Cài đặt Hệ thống
          </button>
        </div>

      </div>
    </div>
  );
}
