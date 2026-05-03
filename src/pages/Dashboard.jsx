import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Package, Users, DollarSign, Calendar, ArrowUpRight, AlertTriangle, ShoppingBag, Percent, Settings, CheckCircle, Clock, Truck, ChevronDown } from 'lucide-react';
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [report, setReport] = useState({
    total_revenue: 0, gross_profit: 0, total_orders: 0, aov: 0, profit_margin: 0,
    chart_data: [], donut_data: [], top_products: [], low_stock: [], expiring_soon: [],
    total_shipping: 0, op_cost: 0, top_customers: [], recent_orders: [], geo_sales: []
  });
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
    { label: 'Doanh thu', value: report.total_revenue, format: 'currency', icon: DollarSign, color: '#5b4fcf', trend: '', up: true },
    { label: 'Lợi nhuận gộp', value: report.gross_profit, format: 'currency', icon: TrendingUp, color: '#10b981', trend: '', up: true },
    { label: 'Trị giá Đơn (AOV)', value: report.aov, format: 'currency', icon: ShoppingBag, color: '#f59e0b', trend: '', up: true },
    { label: 'Biên lợi nhuận', value: (report.profit_margin || 0).toFixed(1), format: 'percent', icon: Percent, color: '#ec4899', trend: '', up: true },
  ];

  // Chart Data
  const chartLabels = (report.chart_data || []).map(d => {
    const parts = d.date.split('-');
    return `${parts[2]}/${parts[1]}`;
  });
  const revenueData = (report.chart_data || []).map(d => Number(d.revenue) || 0);
  const profitData = (report.chart_data || []).map(d => Number(d.profit) || 0);

  const lineData = {
    labels: chartLabels.length ? chartLabels : ['Không có dữ liệu'],
    datasets: [
      { label: 'Doanh thu', data: revenueData.length ? revenueData : [0], borderColor: '#5b4fcf', backgroundColor: 'rgba(91,79,207,.1)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 },
      { label: 'Lợi nhuận', data: profitData.length ? profitData : [0], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.08)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 },
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
          label: function (context) {
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
          callback: function (value) {
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

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', // Deep purple gradient
        borderRadius: '16px',
        padding: '2.5rem',
        color: '#fff',
        position: 'relative',
        boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        zIndex: 20
      }}>
        {/* Background Layer with Overflow Hidden */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '16px', overflow: 'hidden', pointerEvents: 'none' }}>
          {/* Decorative elements */}
          <div style={{ position: 'absolute', right: '-5%', top: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', left: '15%', bottom: '-50%', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
          
          {/* Decorative stars/shapes */}
          <svg style={{ position: 'absolute', right: '15%', top: '20%', opacity: 0.2 }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <svg style={{ position: 'absolute', left: '5%', top: '15%', opacity: 0.1 }} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.02em' }}>
                Hệ thống quản lý MINTH STORE
              </h1>
              <p style={{ fontSize: '1.05rem', opacity: 0.9, maxWidth: '650px', lineHeight: 1.6, fontWeight: 400 }}>
                Quản lý kho thông minh <b>MINTH</b> đã sẵn sàng. <br /> Bạn hiện có <b style={{ color: '#fcd34d', fontSize: '1.15rem' }}>{(report.pending_orders || 0)}</b> đơn hàng chờ xử lý và <b style={{ color: '#fcd34d', fontSize: '1.15rem' }}>{(report.low_stock || []).length}</b> lô sắp hết hàng cần nhập.
              </p>
            </div>

            {/* Filter Dropdown */}
            <div 
              style={{ position: 'relative', minWidth: '180px' }} 
              tabIndex={0} 
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsFilterOpen(false);
                }
              }}
            >
              <div 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontFamily: 'Outfit',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <span>Hiển thị: {FILTERS.find(f => f.value === filter)?.label}</span>
                <ChevronDown size={18} color="#fff" style={{ transition: 'transform 0.2s', transform: isFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </div>

              {/* Custom Dropdown Menu */}
              {isFilterOpen && (
                <div 
                  className="anim-fade-up"
                  style={{ 
                    position: 'absolute', 
                    top: 'calc(100% + 8px)', 
                    right: 0, 
                    width: 'max-content',
                    minWidth: '100%',
                    background: 'var(--surface)', 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    zIndex: 50,
                    padding: '0.5rem'
                  }}
                >
                  {FILTERS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => {
                        setFilter(f.value);
                        setIsFilterOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.6rem 1rem',
                        background: filter === f.value ? 'var(--primary-bg)' : 'transparent',
                        color: filter === f.value ? 'var(--primary-dark)' : 'var(--text)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: filter === f.value ? 700 : 500,
                        fontSize: '0.9rem',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        if (filter !== f.value) e.target.style.background = 'var(--surface2)';
                      }}
                      onMouseLeave={(e) => {
                        if (filter !== f.value) e.target.style.background = 'transparent';
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {filter === 'custom' && (
            <div className="anim-slide-in" style={{ display: 'flex', gap: '.5rem', alignItems: 'center', background: 'rgba(255, 255, 255, 0.15)', padding: '.5rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.3)', marginTop: '1.25rem', width: 'fit-content', backdropFilter: 'blur(12px)' }}>
              <input type="date" style={{ padding: '.4rem .75rem', border: 'none', background: '#fff', color: '#1f2937', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }} value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <span style={{ color: '#fff', fontWeight: 600 }}>→</span>
              <input type="date" style={{ padding: '.4rem .75rem', border: 'none', background: '#fff', color: '#1f2937', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              <button onClick={fetchReport} style={{ background: '#fff', color: '#7c3aed', padding: '0.4rem 1.25rem', borderRadius: '4px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Lọc dữ liệu</button>
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {/* Line chart */}
        <div className="card" style={{ flex: '2 1 500px' }}>
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
        <div className="card" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '.25rem' }}>Cơ cấu bán hàng</h3>
          <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>Phân bổ theo hình thức bán</p>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut data={donutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Outfit', size: 12 } } } } }} />
          </div>
        </div>
      </div>

      {/* Products & Costs Row */}
      {/* Products, Customers & Geo Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {/* Top Products */}
        <div className="card" style={{ flex: '1 1 350px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Sản phẩm bán chạy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {topProducts.length === 0 && <div className="text-muted text-sm" style={{ padding: '1rem', textAlign: 'center' }}>Chưa có dữ liệu</div>}
            {topProducts.map((p, i) => {
              let salesText = [];
              const chaiSales = Number(p.chai_sales) || 0;
              const mlSales = Number(p.ml_sales) || 0;
              const otherSales = Number(p.other_sales) || 0;
              const unit = p.unit || 'chai';

              if (chaiSales > 0) salesText.push(`${chaiSales} ${unit}`);
              if (otherSales > 0) salesText.push(`${otherSales} ${unit}`);
              if (mlSales > 0) salesText.push(`${mlSales} ml`);

              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '.85rem', borderBottom: i < topProducts.length - 1 ? '1px dashed var(--border-light)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '8px',
                      background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : (i === 1 ? 'linear-gradient(135deg, #9ca3af, #d1d5db)' : (i === 2 ? 'linear-gradient(135deg, #d97706, #fcd34d)' : 'var(--surface2)')),
                      color: i < 3 ? '#fff' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', fontWeight: 800,
                      boxShadow: i < 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.95rem', color: 'var(--text)' }}>{p.name}</div>
                      <div className="text-xs text-muted" style={{ marginTop: 3 }}>{salesText.join(' + ')} đã bán</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text)' }}>{Number(p.revenue).toLocaleString('vi-VN')} đ</div>
                    <div className="text-xs" style={{ color: 'var(--success)', marginTop: 3, fontWeight: 600 }}>+{Number(p.profit).toLocaleString('vi-VN')} đ lãi</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Customers */}
        <div className="card" style={{ flex: '1 1 350px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Top Khách Hàng</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {(report.top_customers || []).length === 0 && <div className="text-muted text-sm" style={{ padding: '1rem', textAlign: 'center' }}>Chưa có dữ liệu</div>}
            {(report.top_customers || []).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '.75rem', borderBottom: i < (report.top_customers || []).length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'var(--warning)' : 'var(--surface2)', color: i === 0 ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 700 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{c.name}</div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>{c.total_orders} đơn hàng</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--primary-dark)' }}>{Number(c.total_spent).toLocaleString('vi-VN')} đ</div>
                  <div className="text-xs" style={{ color: 'var(--warning-dark)', marginTop: 2, fontWeight: 600 }}>{c.customer_tier}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Sales */}
        <div className="card" style={{ flex: '1 1 350px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Doanh số theo Khu vực</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
            {(report.geo_sales || []).length === 0 && <div className="text-muted text-sm" style={{ padding: '1rem', textAlign: 'center' }}>Chưa có dữ liệu</div>}
            {(report.geo_sales || []).map((g, i) => {
              const maxRev = Math.max(...(report.geo_sales || []).map(x => Number(x.revenue)));
              const pct = maxRev > 0 ? (Number(g.revenue) / maxRev) * 100 : 0;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{g.region} <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.2rem' }}>({g.order_count})</span></span>
                    <span style={{ fontWeight: 700 }}>{Number(g.revenue).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--surface2)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: i === 0 ? 'var(--primary)' : (i === 1 ? 'var(--info)' : 'var(--text-light)'), borderRadius: 'var(--r-full)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operational & Orders Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {/* Operational Costs */}
        <div className="card" style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Chi phí & Dòng tiền khác</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px dashed var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={18} />
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>Thu hộ Phí Ship</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>{(report.total_shipping || 0).toLocaleString('vi-VN')} đ</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={18} />
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>Phát sinh / Hao hụt</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--danger)' }}>-{(report.operational_cost || 0).toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '.5rem' }}>
              *Hao hụt tính dựa trên giá vốn của hàng xuất nội bộ (hỏng, tester, v.v.)
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ flex: '1 1 350px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Đơn hàng Gần đây</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(report.recent_orders || []).length === 0 && <div className="text-muted text-sm" style={{ padding: '1rem', textAlign: 'center' }}>Chưa có dữ liệu</div>}
            {(report.recent_orders || []).map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', position: 'relative' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: o.status === 'completed' ? 'var(--success)' : (o.status === 'shipping' ? 'var(--info)' : (o.status === 'cancelled' ? 'var(--danger)' : 'var(--warning)')), marginTop: '0.45rem', flexShrink: 0 }} />
                <div style={{ flex: 1, paddingBottom: '.85rem', borderBottom: i < (report.recent_orders || []).length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{o.customer_name || 'Khách lẻ'} <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', fontWeight: 400, marginLeft: '0.2rem' }}>#{o.id}</span></span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{Number(o.final_amount).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: o.payment_status === 'paid' ? 'var(--success-bg)' : 'var(--warning-bg)', color: o.payment_status === 'paid' ? 'var(--success)' : 'var(--warning-dark)', fontWeight: 600 }}>{o.payment_status === 'paid' ? 'Đã thanh toán' : 'COD'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock & Expiring Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {/* Low Stock */}
        <div className="card" style={{ flex: '1 1 350px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: (report.low_stock || []).length === 0 ? 'var(--success-bg)' : 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} color={(report.low_stock || []).length === 0 ? 'var(--success)' : 'var(--warning-dark)'} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>Sắp hết hàng <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({report.low_stock?.length || 0})</span></h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(report.low_stock || []).length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--surface2)', borderRadius: '12px' }}>
                <CheckCircle size={32} color="var(--success)" style={{ marginBottom: '.5rem' }} />
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>Tồn kho ổn định</span>
              </div>
            ) : (report.low_stock || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.85rem', borderBottom: i < (report.low_stock || []).length - 1 ? '1px dashed var(--border-light)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>
                    {item.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400, marginLeft: 4 }}>({item.unit})</span>
                  </span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--warning-dark)', background: 'var(--warning-bg)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>Còn {item.qty}</span>
              </div>
            )
            )}
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="card" style={{ flex: '1 1 350px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: (report.expiring_soon || []).length === 0 ? 'var(--success-bg)' : 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color={(report.expiring_soon || []).length === 0 ? 'var(--success)' : 'var(--danger)'} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>Sắp hết hạn <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({report.expiring_soon?.length || 0})</span></h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(report.expiring_soon || []).length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--surface2)', borderRadius: '12px' }}>
                <CheckCircle size={32} color="var(--success)" style={{ marginBottom: '.5rem' }} />
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>Hàng hóa đang khỏe mạnh</span>
              </div>
            ) : (
              (report.expiring_soon || []).map((item, i) => {
                const days = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.85rem', borderBottom: i < (report.expiring_soon || []).length - 1 ? '1px dashed var(--border-light)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.batch_code} ({item.unit})</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-bg)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>Còn {days} ngày</span>
                    </div>
                  </div>
                );
              })
            )}
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
