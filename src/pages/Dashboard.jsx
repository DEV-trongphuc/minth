import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Package, Users, DollarSign, Calendar, ArrowUpRight, AlertTriangle, ShoppingBag, Percent, Settings, CheckCircle, Clock, Truck, ChevronDown, Activity, MapPin } from 'lucide-react';
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
  const [filter, setFilter] = useState('thismonth');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [inventoryTab, setInventoryTab] = useState('low_stock'); // 'low_stock' | 'expiring'
  const [report, setReport] = useState({
    total_revenue: 0, gross_profit: 0, total_orders: 0, aov: 0, profit_margin: 0,
    chart_data: [], donut_data: [], top_products: [], low_stock: [], expiring_soon: [],
    total_shipping: 0, op_cost: 0, top_customers: [], recent_orders: [], geo_sales: [], weekday_sales: {}
  });
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    fetchReport();
    fetch(`${API_BASE_URL}/settings.php`)
      .then(res => res.json())
      .then(data => { if (data.setup_completed === '0') setShowSetupModal(true); })
      .catch(console.error);
  }, [filter]);

  const finishSetup = async () => {
    try {
      await fetch(`${API_BASE_URL}/settings.php`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setup_completed: '1' }) });
      setShowSetupModal(false);
    } catch (e) { setShowSetupModal(false); }
  };

  const fetchReport = async () => {
    try {
      let url = `${API_BASE_URL}/reports.php?filter=${filter}`;
      if (filter === 'custom' && customStart && customEnd) url += `&start=${customStart}&end=${customEnd}`;
      const res = await fetch(url);
      if (res.ok) setReport(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // ─── DATA PREPARATION ───
  // Line Chart
  const chartLabels = (report.chart_data || []).map(d => { const p = d.date.split('-'); return `${p[2]}/${p[1]}`; });
  const revenueData = (report.chart_data || []).map(d => Number(d.revenue) || 0);
  const profitData = (report.chart_data || []).map(d => Number(d.profit) || 0);
  
  const lineData = {
    labels: chartLabels.length ? chartLabels : ['Trống'],
    datasets: [
      { label: 'Doanh thu', data: revenueData.length ? revenueData : [0], borderColor: '#7c3aed', backgroundColor: 'rgba(124, 58, 237, 0.1)', tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6, borderWidth: 3 },
      { label: 'Lợi nhuận', data: profitData.length ? profitData : [0], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.05)', tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6, borderWidth: 2, borderDash: [5, 5] },
    ],
  };

  // Weekday Bar Chart (Ngày vàng)
  const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const wd = report.weekday_sales || {};
  const weekdayData = [
    Number(wd[1] || wd["1"] || 0),
    Number(wd[2] || wd["2"] || 0),
    Number(wd[3] || wd["3"] || 0),
    Number(wd[4] || wd["4"] || 0),
    Number(wd[5] || wd["5"] || 0),
    Number(wd[6] || wd["6"] || 0),
    Number(wd[7] || wd["7"] || 0)
  ];
  
  const barData = {
    labels: weekdayLabels,
    datasets: [{
      label: 'Đơn hàng',
      data: weekdayData,
      backgroundColor: weekdayData.map(val => (val > 0 && val >= Math.max(...weekdayData) * 0.7) ? '#f59e0b' : '#e5e7eb'),
      borderRadius: 4,
    }]
  };

  // Donut Chart
  const donutLabels = [];
  const donutValues = [];
  const donutBg = [];
  (report.donut_data || []).forEach(d => {
    if (d.sell_type === 'chai') { donutLabels.push('Chai nguyên'); donutValues.push(d.total_revenue); donutBg.push('#7c3aed'); }
    else if (d.sell_type === 'ml') { donutLabels.push('Chiết ml'); donutValues.push(d.total_revenue); donutBg.push('#f43f5e'); }
    else { donutLabels.push(d.sell_type); donutValues.push(d.total_revenue); donutBg.push('#f59e0b'); }
  });
  const donutChartData = {
    labels: donutLabels.length ? donutLabels : ['Trống'],
    datasets: [{ data: donutValues.length ? donutValues : [1], backgroundColor: donutBg.length ? donutBg : ['#e5e7eb'], borderWidth: 0, hoverOffset: 4 }],
  };

  // Chart Options
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { family: 'Outfit' }, bodyFont: { family: 'Outfit' }, padding: 12, cornerRadius: 8, callbacks: { label: function(c) { return c.dataset.label + ': ' + Number(c.raw).toLocaleString('vi-VN') + (c.dataset.label==='Đơn hàng'?'':' đ'); } } }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }, ticks: { font: { family: 'Outfit', size: 11 }, callback: function(v) { if(v>=1000000) return (v/1000000).toLocaleString('vi-VN')+'Tr'; if(v>=1000) return (v/1000).toLocaleString('vi-VN')+'K'; return v; } } },
      x: { grid: { display: false }, ticks: { font: { family: 'Outfit', size: 10 }, maxRotation: 0 } },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. GREETING BAR (Slim Hero) */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
        borderRadius: 'var(--r-lg)', padding: '1.25rem 2rem', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
        boxShadow: '0 8px 20px -6px rgba(124, 58, 237, 0.3)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', right: '-5%', top: '-50%', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        
        <div style={{ zIndex: 1 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Tổng quan Hệ thống</h1>
          <p style={{ fontSize: '0.9rem', opacity: 0.85, margin: '0.25rem 0 0 0' }}>Có <b style={{ color: '#fcd34d' }}>{report.pending_orders || 0}</b> đơn chờ xử lý và <b style={{ color: '#fcd34d' }}>{(report.low_stock || []).length}</b> sản phẩm sắp hết hàng.</p>
        </div>

        <div style={{ zIndex: 1, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {filter === 'custom' && (
            <div className="anim-slide-in" style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
              <input type="date" style={{ padding: '0.2rem 0.5rem', border: 'none', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }} value={customStart} onChange={e=>setCustomStart(e.target.value)} />
              <input type="date" style={{ padding: '0.2rem 0.5rem', border: 'none', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }} value={customEnd} onChange={e=>setCustomEnd(e.target.value)} />
              <button onClick={fetchReport} style={{ background: '#fff', color: 'var(--primary)', padding: '0.2rem 0.75rem', borderRadius: '4px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>Lọc</button>
            </div>
          )}
          <div style={{ position: 'relative' }} tabIndex={0} onBlur={(e) => { if(!e.currentTarget.contains(e.relatedTarget)) setIsFilterOpen(false); }}>
            <div onClick={() => setIsFilterOpen(!isFilterOpen)} style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#fff', fontWeight: 600, fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Calendar size={14} /> {FILTERS.find(f => f.value === filter)?.label} <ChevronDown size={14} />
            </div>
            {isFilterOpen && (
              <div className="anim-scale-in" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--surface)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 50, minWidth: '160px', border: '1px solid var(--border)' }}>
                {FILTERS.map(f => (
                  <button key={f.value} onClick={() => { setFilter(f.value); setIsFilterOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '0.6rem 1rem', background: filter === f.value ? 'var(--primary-bg)' : 'transparent', color: filter === f.value ? 'var(--primary)' : 'var(--text)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>{f.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. BENTO GRID - KEY METRICS */}
      <div className="grid-stats">
        
        {/* Doanh thu */}
        <div className="card hover-shadow" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'linear-gradient(to bottom right, var(--surface), var(--surface2))', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.03, transform: 'rotate(15deg)' }}><DollarSign size={100} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}><DollarSign size={18} color="var(--primary)" /><span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doanh thu</span></div>
          <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{Number(report.total_revenue || 0).toLocaleString('vi-VN')} đ</div>
          <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}><ArrowUpRight size={14} /> Tăng trưởng ổn định</div>
        </div>

        {/* Lợi nhuận gộp */}
        <div className="card hover-shadow" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}><TrendingUp size={18} color="var(--success)" /><span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lợi nhuận gộp</span></div>
          <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{Number(report.gross_profit || 0).toLocaleString('vi-VN')} đ</div>
          <div style={{ marginTop: 'auto', paddingTop: '1rem', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 600 }}><span className="text-muted">Biên lợi nhuận</span><span style={{ color: 'var(--success)' }}>{Number(report.profit_margin || 0).toFixed(1)}%</span></div>
            <div style={{ width: '100%', height: '4px', background: 'var(--surface2)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: `${Math.min(report.profit_margin || 0, 100)}%`, height: '100%', background: 'var(--success)', borderRadius: '4px' }}/></div>
          </div>
        </div>

        {/* AOV */}
        <div className="card hover-shadow" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}><ShoppingBag size={18} color="var(--info)" /><span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Đơn & AOV</span></div>
          <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{report.total_orders || 0} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>đơn</span></div>
          <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}><span className="text-muted">TB/Đơn:</span> {Number(report.aov || 0).toLocaleString('vi-VN')} đ</div>
        </div>

        {/* Chi phí */}
        <div className="card hover-shadow" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}><AlertTriangle size={18} color="var(--danger)" /><span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chi phí & Hao hụt</span></div>
          <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 800, color: 'var(--danger)', lineHeight: 1 }}>- {Number((report.total_expenses || 0) + (report.op_cost || 0)).toLocaleString('vi-VN')} đ</div>
          <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Bao gồm: Hao hụt kho & Phí vận hành</div>
        </div>

      </div>

      {/* 3. BENTO GRID - CHARTS & WIDGETS */}
      <div className="bento-grid">
        
        {/* Main Line Chart (Span 8 cols on desktop) */}
        <div className="card bento-span-8" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>Hiệu suất Kinh doanh</h3>
              <p className="text-sm text-muted">Biểu đồ doanh thu và lợi nhuận theo thời gian</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 10, height: 10, borderRadius: '2px', background: '#7c3aed' }} /> Doanh thu</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 10, height: 10, borderRadius: '2px', background: '#10b981' }} /> Lợi nhuận</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '240px' }}><Line options={chartOpts} data={lineData} /></div>
        </div>

        {/* Donut & Geo (Span 4 cols) */}
        <div className="card bento-span-4" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>Cơ cấu Bán hàng</h3>
          <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Doughnut data={donutChartData} options={{ maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Outfit', size: 11 } } } } }} />
          </div>
          </div>
        </div>

        {/* Top Products (Span 4 cols) */}
        <div className="card bento-span-4" style={{ minHeight: '350px' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.25rem' }}>Sản phẩm Bán chạy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(!report.top_products || report.top_products.length === 0) && <div className="text-center text-muted" style={{ padding: '2rem' }}>Chưa có dữ liệu</div>}
            {(report.top_products || []).slice(0, 5).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: i < 3 ? `var(--primary${i===0?'-dark':(i===2?'-light':'')})` : 'var(--surface2)', color: i < 3 ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>{i+1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{p.name}</div>
                  <div className="text-xs text-muted" style={{ marginTop: '0.25rem', lineHeight: '1.4' }}><span style={{color:"var(--primary)", fontWeight: 700}}>{Number(p.revenue).toLocaleString('vi-VN')} đ</span> &bull; Lãi: <span style={{color:"var(--success)", fontWeight: 600}}>{Number(p.profit).toLocaleString('vi-VN')} đ</span><br/>SL: <span style={{fontWeight: 600, color: "var(--text)"}}>{(p.chai_sales > 0 ? p.chai_sales + " chai " : "") + (p.ml_sales > 0 ? p.ml_sales + " ml" : "") + (p.other_sales > 0 ? p.other_sales + " " + p.unit : "")}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap/Bar Chart (Span 4 cols) */}
        <div className="card bento-span-4" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} color="var(--warning)" /> Ngày Vàng Mua Sắm</h3>
            <p className="text-sm text-muted">Tần suất chốt đơn theo ngày trong tuần</p>
          </div>
          <div style={{ flex: 1, minHeight: '200px' }}><Bar options={{...chartOpts, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 }, maxTicksLimit: 12 } }, y: { display: false }}}} data={barData} /></div>
        </div>

        {/* Inventory Tabs & Recent Orders (Span 4 cols) */}
        <div className="card bento-span-4" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <button onClick={() => setInventoryTab('low_stock')} style={{ flex: 1, padding: '1rem', border: 'none', background: inventoryTab === 'low_stock' ? 'var(--surface)' : 'transparent', fontWeight: 700, fontSize: '0.85rem', color: inventoryTab === 'low_stock' ? 'var(--warning-dark)' : 'var(--text-muted)', cursor: 'pointer', borderTop: inventoryTab === 'low_stock' ? '2px solid var(--warning)' : '2px solid transparent', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Package size={14}/> Sắp hết hàng ({(report.low_stock||[]).length})</button>
            <button onClick={() => setInventoryTab('expiring')} style={{ flex: 1, padding: '1rem', border: 'none', background: inventoryTab === 'expiring' ? 'var(--surface)' : 'transparent', fontWeight: 700, fontSize: '0.85rem', color: inventoryTab === 'expiring' ? 'var(--danger)' : 'var(--text-muted)', cursor: 'pointer', borderTop: inventoryTab === 'expiring' ? '2px solid var(--danger)' : '2px solid transparent', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Clock size={14}/> Sắp hết hạn ({(report.expiring_soon||[]).length})</button>
          </div>
          <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto', maxHeight: '290px' }}>
            {inventoryTab === 'low_stock' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(!report.low_stock || report.low_stock.length === 0) ? <div className="text-center text-muted text-sm" style={{ padding: '2rem' }}>Kho hàng ổn định</div> : 
                 report.low_stock.map((item, i) => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                       <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                       <div className="text-xs text-muted">Đơn vị: {item.unit}</div>
                     </div>
                     <span style={{ fontWeight: 700, color: 'var(--warning-dark)', background: 'var(--warning-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>Còn {item.qty}</span>
                   </div>
                 ))
                }
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(!report.expiring_soon || report.expiring_soon.length === 0) ? <div className="text-center text-muted text-sm" style={{ padding: '2rem' }}>Hàng hóa an toàn</div> : 
                 report.expiring_soon.map((item, i) => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                       <div style={{ fontWeight: 600, fontSize: '0.9rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                       <div className="text-xs text-muted">Lô: {item.batch_code}</div>
                     </div>
                     <span style={{ fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>Còn {Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))} ngày</span>
                   </div>
                 ))
                }
              </div>
            )}
          </div>
        </div>


        {/* Top Regions & Customers (Span 12 cols on desktop/mobile) */}
        <div className="card bento-span-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', padding: '1.5rem' }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><MapPin size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', color: 'var(--primary)' }}/> Khu vực Mua nhiều nhất</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(!report.geo_sales || report.geo_sales.length === 0) && <div className="text-muted text-sm">Chưa có dữ liệu</div>}
              {(report.geo_sales || []).slice(0, 5).map((g, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{g.region || 'Không xác định'}</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{Number(g.revenue).toLocaleString('vi-VN')} đ</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><Users size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', color: 'var(--success)' }}/> Top Khách hàng VIP</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(!report.top_customers || report.top_customers.length === 0) && <div className="text-muted text-sm">Chưa có dữ liệu</div>}
              {(report.top_customers || []).slice(0, 5).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</span>
                    <span className="text-xs text-muted">{c.phone || c.email || 'Chưa cập nhật'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>{Number(c.total_spent).toLocaleString('vi-VN')} đ</span>
                    <span className="text-xs text-muted">{c.order_count} đơn</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      {/* SETUP MODAL */}
      {showSetupModal && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget) setShowSetupModal(false); }}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>🎉 Chào mừng đến với MINTH!</h2>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Hệ thống quản lý bán hàng của bạn đã sẵn sàng. Để bắt đầu sử dụng, hãy làm theo các bước cơ bản sau:</p>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--surface2)', padding: '1rem', borderRadius: 'var(--r-sm)' }}>
                <Settings size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>1. Thiết lập chung</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vào mục <b>Cài đặt</b> để đổi mật khẩu và thiết lập phân hạng Khách hàng.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--surface2)', padding: '1rem', borderRadius: 'var(--r-sm)' }}>
                <Package size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>2. Khởi tạo Sản phẩm</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vào mục <b>Sản phẩm</b> để khai báo các mặt hàng bạn kinh doanh.</div>
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
