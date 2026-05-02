import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Package, Users, DollarSign, Calendar, ArrowUpRight, AlertTriangle, ShoppingBag, Percent, Settings, CheckCircle, Clock, Truck } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Filler, Legend, ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { API_BASE_URL } from '../config';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Filler, Legend, ArcElement);

const FILTERS = [
  { value: '7days', label: '7 Ngày' },
  { value: '30days', label: '30 Ngày' },
  { value: 'thismonth', label: 'Tháng này' },
  { value: 'lastmonth', label: 'Tháng trước' },
  { value: 'custom', label: 'Tùy chỉnh' },
];

export default function Dashboard() {
  const [filter, setFilter] = useState('7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [report, setReport] = useState({ revenue: 0, profit: 0, orders: 0, customers: 0, chart_data: [], donut_data: [], top_products: [], low_stock: [], expiring_soon: [], shipping_fee: 0, operational_cost: 0 });
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    fetchReport();
    // Check if onboarding setup is needed
    fetch(`${API_BASE_URL}/settings.php`)
      .then(res => res.json())
      .then(data => {
        if (data.setup_completed === '0') setShowSetupModal(true);
      })
      .catch(console.error);
  }, [filter]);

  const finishSetup = async () => {
    try {
      await fetch(`${API_BASE_URL}/settings.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_completed: '1' })
      });
      setShowSetupModal(false);
    } catch (e) {
      setShowSetupModal(false);
    }
  };

  const fetchReport = async () => {
    try {
      let url = `${API_BASE_URL}/reports.php?filter=${filter}`;
      if (filter === 'custom' && customStart && customEnd) url += `&start=${customStart}&end=${customEnd}`;
      const res = await fetch(url);
      if (res.ok) setReport(await res.json());
    } catch (e) {
      setReport({ revenue: 0, profit: 0, orders: 0, customers: 0, chart_data: [], donut_data: [], top_products: [], low_stock: [], expiring_soon: [], shipping_fee: 0, operational_cost: 0 });
    }
  };

  const stats = [
    { label: 'Doanh thu', value: report.revenue, format: 'currency', icon: DollarSign, color: '#5b4fcf', trend: '', up: true },
    { label: 'Lợi nhuận gộp', value: report.profit, format: 'currency', icon: TrendingUp, color: '#10b981', trend: '', up: true },
    { label: 'Đơn hàng', value: report.orders || 0, format: 'number', unit: 'đơn', icon: ShoppingBag, color: '#f59e0b', trend: '', up: true },
    { label: 'Biên lợi nhuận', value: report.revenue > 0 ? ((report.profit / report.revenue) * 100).toFixed(1) : 0, format: 'percent', icon: Percent, color: '#ec4899', trend: '', up: true },
  ];

  // Chart Data
  const chartLabels = (report.chart_data || []).map(d => {
    const parts = d.date.split('-');
    return `${parts[2]}/${parts[1]}`;
  });
  const revenueData = (report.chart_data || []).map(d => d.revenue / 1000000); // in millions
  const profitData = (report.chart_data || []).map(d => d.profit / 1000000);

  const lineData = {
    labels: chartLabels.length ? chartLabels : ['Không có dữ liệu'],
    datasets: [
      { label: 'Doanh thu (Tr)', data: revenueData.length ? revenueData : [0], borderColor: '#5b4fcf', backgroundColor: 'rgba(91,79,207,.1)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 },
      { label: 'Lợi nhuận (Tr)', data: profitData.length ? profitData : [0], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.08)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 },
    ],
  };

  // Donut Data
  const donutLabels = [];
  const donutValues = [];
  const donutBg = [];
  (report.donut_data || []).forEach(d => {
    if (d.sell_type === 'chai') { donutLabels.push('Chai nguyên'); donutValues.push(d.total_revenue); donutBg.push('#5b4fcf'); }
    else if (d.sell_type === 'ml') { donutLabels.push('Chiết ml'); donutValues.push(d.total_revenue); donutBg.push('#ec4899'); }
    else { donutLabels.push(d.sell_type); donutValues.push(d.total_revenue); donutBg.push('#f59e0b'); }
  });

  const donutData = {
    labels: donutLabels.length ? donutLabels : ['Trống'],
    datasets: [{ data: donutValues.length ? donutValues : [1], backgroundColor: donutBg.length ? donutBg : ['#e5e7eb'], borderWidth: 0 }],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + Number(context.raw).toLocaleString('vi-VN') + ' đ';
          }
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        suggestedMax: 100000,
        grid: { color: 'rgba(0,0,0,0.04)' }, 
        ticks: { 
          font: { family: 'Roboto' },
          precision: 0,
          callback: function(value) {
            if (value >= 1000000) return (value / 1000000).toLocaleString('vi-VN') + ' Tr';
            if (value >= 1000) return (value / 1000).toLocaleString('vi-VN') + ' K';
            return value.toLocaleString('vi-VN') + ' đ';
          }
        } 
      },
      x: { grid: { display: false }, ticks: { font: { family: 'Roboto' } } },
    },
  };

  const formatVal = (stat) => {
    if (stat.format === 'currency') return `${(stat.value || 0).toLocaleString('vi-VN')} đ`;
    if (stat.format === 'percent') return `${stat.value}%`;
    return `${(stat.value || 0).toLocaleString('vi-VN')} ${stat.unit || ''}`;
  };

  const lowStockItems = report.low_stock || [];
  const topProducts = report.top_products || [];

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan kinh doanh</h1>
          <p className="page-sub">Báo cáo dữ liệu thực từ hệ thống — cập nhật mỗi lần tải trang.</p>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          {/* Desktop Filter */}
          <div className="desktop-only" style={{ display: 'flex', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden', flexShrink: 0 }}>
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => { setFilter(f.value); }}
                style={{ padding: '.5rem .875rem', border: 'none', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '.825rem', fontWeight: 600, transition: 'all .2s', background: filter === f.value ? 'var(--primary)' : 'transparent', color: filter === f.value ? '#fff' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Mobile Filter Dropdown */}
          <div className="mobile-only" style={{ width: '100%' }}>
            <select className="form-control" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '100%', padding: '0.65rem 1rem', fontWeight: 600, background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
              {FILTERS.map(f => <option key={f.value} value={f.value}>Thời gian: {f.label}</option>)}
            </select>
          </div>

          {filter === 'custom' && (
            <div className="anim-slide-in" style={{ display: 'flex', gap: '.5rem', alignItems: 'center', background: 'var(--surface)', padding: '.3rem .5rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border)' }}>
              <input type="date" className="form-control" style={{ padding: '.4rem .75rem', border: 'none', width: '150px' }} value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <span className="text-muted">→</span>
              <input type="date" className="form-control" style={{ padding: '.4rem .75rem', border: 'none', width: '150px' }} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={fetchReport}>Lọc</button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row - Clean Premium Design */}
      <div className="grid-stats" style={{ gap: '1.25rem' }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card" style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
              borderRadius: 'var(--r-md)',
              padding: '1.25rem 1.5rem',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{stat.label}</p>
                <div style={{
                  background: `${stat.color}15`,
                  color: stat.color,
                  width: '32px', height: '32px',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={16} />
                </div>
              </div>
              <div style={{ fontSize: 'clamp(1.1rem, 4vw, 1.85rem)', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem', wordBreak: 'break-word', lineHeight: 1.2 }}>
                {formatVal(stat)}
              </div>
              {stat.trend && (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: stat.up ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  <ArrowUpRight size={14} style={{ marginRight: '0.2rem' }} />
                  {stat.trend} <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.35rem' }}>so với kỳ trước</span>
                </div>
              )}
              {/* Very subtle bottom border accent */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: stat.color, opacity: 0.8 }} />
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {/* Line chart */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.5rem' }}>
            <div>
              <h3 style={{ fontWeight: 700 }}>Doanh thu & Lợi nhuận</h3>
              <p className="text-sm text-muted">Biểu đồ xu hướng theo thời gian</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '.8rem' }}>
              {['Doanh thu', 'Lợi nhuận'].map((l, i) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? '#5b4fcf' : '#10b981', display: 'inline-block' }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div style={{ height: 260 }}><Line options={chartOpts} data={lineData} /></div>
        </div>

        {/* Donut */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '.25rem' }}>Cơ cấu bán hàng</h3>
          <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>Phân bổ theo hình thức bán</p>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut data={donutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Outfit', size: 12 } } } } }} />
          </div>
        </div>
      </div>

      {/* Products & Costs Row */}
      <div className="dashboard-products-row">
        {/* Top Products (70%) */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Sản phẩm bán chạy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {topProducts.length === 0 && <div className="text-muted text-sm" style={{ padding: '1rem', textAlign: 'center' }}>Chưa có dữ liệu</div>}
            {topProducts.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '.75rem', borderBottom: i < topProducts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: ['var(--primary-light)', 'var(--success-bg)', 'var(--warning-bg)'][i % 3] || 'var(--surface2)', color: ['var(--primary)', 'var(--success)', 'var(--warning)'][i % 3] || 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.8rem', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div className="text-xs text-muted">{p.sales} lần bán</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--text)' }}>
                    {(Number(p.revenue)).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs" style={{ color: 'var(--success)', fontWeight: 600 }}>
                    +{(Number(p.profit)).toLocaleString('vi-VN')} đ lãi
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Costs (30%) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Chi phí & Dòng tiền khác</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--info-bg, #eff6ff)', borderRadius: 'var(--r-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--info, #3b82f6)' }}>
                <Truck size={18} />
                <span style={{ fontWeight: 600, fontSize: '.875rem' }}>Thu hộ Phí Ship</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--info, #3b82f6)' }}>{(report.shipping_fee || 0).toLocaleString('vi-VN')} đ</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--danger-bg)', borderRadius: 'var(--r-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--danger)' }}>
                <AlertTriangle size={18} />
                <span style={{ fontWeight: 600, fontSize: '.875rem' }}>Phát sinh / Hao hụt</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--danger)' }}>-{(report.operational_cost || 0).toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 'auto' }}>*Hao hụt tính dựa trên giá vốn của hàng xuất nội bộ (hỏng, tester, v.v.)</div>
          </div>
        </div>
      </div>

      {/* Alerts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Low Stock Alert */}
        <div className="card" style={{ borderLeft: `4px solid ${(report.low_stock || []).length === 0 ? 'var(--success)' : 'var(--warning)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem', marginBottom: '1rem' }}>
            <Package size={20} color={(report.low_stock || []).length === 0 ? 'var(--success)' : 'var(--warning-dark)'} />
            <h3 style={{ fontWeight: 700, color: (report.low_stock || []).length === 0 ? 'var(--success)' : 'var(--warning-dark)' }}>Sắp hết hàng ({report.low_stock?.length || 0})</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {(report.low_stock || []).length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem', background: 'var(--success-bg)', borderRadius: 'var(--r-sm)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <CheckCircle size={32} />
                <span style={{ fontWeight: 600 }}>Hàng hóa đang ổn định</span>
              </div>
            ) : (report.low_stock || []).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.75rem', background: 'var(--warning-bg)', borderRadius: 'var(--r-sm)' }}>
                <span style={{ fontWeight: 600, fontSize: '.875rem' }}>{item.name} <span className="text-xs text-muted">({item.unit})</span></span>
                <span className="badge badge-warning">Còn {item.qty} chai</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expiring Soon Alert */}
        <div className="card" style={{ borderLeft: `4px solid ${(report.expiring_soon || []).length === 0 ? 'var(--success)' : 'var(--danger)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem', marginBottom: '1rem' }}>
            <Clock size={20} color={(report.expiring_soon || []).length === 0 ? 'var(--success)' : 'var(--danger)'} />
            <h3 style={{ fontWeight: 700, color: (report.expiring_soon || []).length === 0 ? 'var(--success)' : 'var(--danger)' }}>Sắp hết hạn ({report.expiring_soon?.length || 0})</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {(report.expiring_soon || []).length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem', background: 'var(--success-bg)', borderRadius: 'var(--r-sm)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <CheckCircle size={32} />
                <span style={{ fontWeight: 600 }}>Hàng hóa đang khỏe mạnh</span>
              </div>
            ) : (report.expiring_soon || []).map((item, idx) => {
              const expDate = new Date(item.expiry_date);
              if (isNaN(expDate.getTime())) return null;
              const daysLeft = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
              const isExpired = daysLeft < 0;
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--r-sm)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{item.name} <span className="text-xs text-muted">({item.batch_code})</span></div>
                    <div className="text-xs" style={{ color: 'var(--danger)', marginTop: '0.15rem' }}>
                      HSD: {expDate.toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <span className="badge badge-danger">
                    {isExpired ? 'Đã hết hạn' : `Còn ${daysLeft} ngày`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showSetupModal && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget) setShowSetupModal(false); }}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                🎉 Chào mừng đến với MINTH!
              </h2>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Hệ thống quản lý bán hàng của bạn đã sẵn sàng. Để bắt đầu sử dụng, hãy làm theo các bước cơ bản sau:</p>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--surface2)', padding: '1rem', borderRadius: 'var(--r-sm)' }}>
                <Settings size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>1. Thiết lập chung</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vào mục <b>Cài đặt</b> để đổi mật khẩu quản trị mặc định và thiết lập các thông số phân hạng Khách hàng.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--surface2)', padding: '1rem', borderRadius: 'var(--r-sm)' }}>
                <Package size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>2. Khởi tạo Sản phẩm</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vào mục <b>Sản phẩm</b> để khai báo các mặt hàng bạn kinh doanh và thiết lập đơn vị tính, quy đổi bán lẻ.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--surface2)', padding: '1rem', borderRadius: 'var(--r-sm)' }}>
                <CheckCircle size={20} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>3. Nhập Lô hàng & Bán hàng</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vào <b>Quản lý Kho</b> để tạo Lô nhập hàng. Sau đó bạn có thể lập Đơn hàng tại <b>Bán hàng POS</b>!</div>
                </div>
              </div>

            </div>
            <div className="modal-footer" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={finishSetup}>Đã hiểu, bắt đầu thôi!</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
