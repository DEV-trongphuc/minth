import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, Search, Filter, Edit, Eye, Clock, CheckCircle, Truck, DollarSign, XCircle, ShoppingCart, ChevronDown, List, LayoutGrid } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useDialog } from '../components/ui/DialogContext';
import AddressSelect from '../components/ui/AddressSelect';
import POS from './POS';

const STATUS_CONFIG = {
  pending: { label: 'Chờ xử lý', color: 'var(--warning)', bg: 'var(--warning-bg)', icon: <Clock size={14} /> },
  shipping: { label: 'Đang giao', color: 'var(--primary)', bg: 'var(--primary-light)', icon: <Truck size={14} /> },
  completed: { label: 'Hoàn thành', color: 'var(--success)', bg: 'var(--success-bg)', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'Đã hủy', color: 'var(--danger)', bg: 'var(--danger-bg)', icon: <XCircle size={14} /> }
};

const PAYMENT_CONFIG = {
  paid: { label: 'Đã thanh toán', color: 'var(--success)', icon: <DollarSign size={14} /> },
  unpaid: { label: 'Chưa thanh toán (COD)', color: 'var(--warning)', icon: <Clock size={14} /> }
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [showPOS, setShowPOS] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({ customer_name: '', customer_phone: '', customer_address: '', total_amount: 0, shipping_fee: 0, final_amount: 0, shipping_customer_pay: 1 });
  const [cart, setCart] = useState([]);
  const [originalCart, setOriginalCart] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [batches, setBatches] = useState([]);
  const [searchBatch, setSearchBatch] = useState('');
  const { showConfirm, showAlert } = useDialog();

  useEffect(() => {
    fetchOrders();
    fetchBatches();

    // Check for draft customer passed from Customers page
    try {
      const draft = localStorage.getItem('luccy_pos_customer_draft');
      if (draft) {
        setShowPOS(true);
      }
    } catch (e) { }
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders.php`);
      if (res.ok) setOrders(await res.json());
    } catch { }
    setLoading(false);
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/batches.php`);
      if (res.ok) setBatches(await res.json());
    } catch { }
  };

  const openEditModal = async (order) => {
    setEditingOrder(order);
    setEditForm({
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      customer_address: order.customer_address || '',
      shipping_fee: Number(order.shipping_fee) || 0,
      total_amount: Number(order.total_amount) || 0,
      final_amount: Number(order.final_amount) || Number(order.total_amount) || 0,
      shipping_customer_pay: order.shipping_customer_pay !== undefined ? Number(order.shipping_customer_pay) : 1
    });
    setCart([]);
    setLoadingItems(true);
    setSearchBatch('');
    try {
      const res = await fetch(`${API_BASE_URL}/orders.php?action=get_items&order_id=${order.id}`);
      if (res.ok) {
        const items = await res.json();
        const parsedItems = items.map(i => ({
          id: Math.random(),
          batch_id: i.batch_id,
          product_name: i.product_name,
          batch_code: i.batch_code,
          sell_type: i.sell_type,
          quantity: Number(i.quantity),
          price: Number(i.price_per_unit),
          ml_per_unit: Number(i.ml_per_unit)
        }));
        setCart(parsedItems);
        setOriginalCart(parsedItems.map(item => ({...item})));
      } else {
        showAlert('Lỗi', 'Không thể tải danh sách sản phẩm', 'danger');
      }
    } catch {
      showAlert('Lỗi', 'Lỗi kết nối khi tải sản phẩm', 'danger');
    }
    setLoadingItems(false);
  };

  const handleUpdateInfo = async () => {
    if (!editForm.customer_name || !editForm.customer_phone) {
      return showAlert('Lỗi', 'Vui lòng nhập tên và số điện thoại khách hàng', 'danger');
    }
    if (cart.length === 0) {
      return showAlert('Lỗi', 'Đơn hàng phải có ít nhất 1 sản phẩm', 'warning');
    }

    const total_amount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping_fee = Number(editForm.shipping_fee) || 0;
    const shipping_customer_pay = Number(editForm.shipping_customer_pay);
    const final_amount = total_amount + (shipping_customer_pay ? shipping_fee : 0);

    // Calculate diffs
    const diffs = [];
    originalCart.forEach(orig => {
      const current = cart.find(c => c.batch_id === orig.batch_id && c.sell_type === orig.sell_type);
      if (!current) {
        diffs.push({ name: orig.product_name, type: orig.sell_type, diff: -orig.quantity });
      } else if (current.quantity !== orig.quantity) {
        diffs.push({ name: orig.product_name, type: orig.sell_type, diff: current.quantity - orig.quantity });
      }
    });
    cart.forEach(curr => {
      const existed = originalCart.find(o => o.batch_id === curr.batch_id && o.sell_type === curr.sell_type);
      if (!existed) {
        diffs.push({ name: curr.product_name, type: curr.sell_type, diff: curr.quantity });
      }
    });

    const execSave = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingOrder.id,
            action: 'update_info',
            customer_name: editForm.customer_name,
            customer_phone: editForm.customer_phone,
            customer_address: editForm.customer_address,
            total_amount,
            shipping_fee,
            final_amount,
            shipping_customer_pay,
            cart
          })
        });
        if (res.ok) {
          showAlert('Thành công', 'Cập nhật thông tin đơn hàng thành công!', 'success');
          setEditingOrder(null);
          fetchOrders();
        } else {
          showAlert('Lỗi', 'Không thể cập nhật thông tin', 'danger');
        }
      } catch {
        showAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'danger');
      }
    };

    if (diffs.length === 0) {
      execSave();
    } else {
      const summaryMsg = (
        <div style={{ textAlign: 'left', marginTop: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>Tóm tắt thay đổi số lượng:</p>
          <ul style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
            {diffs.map((d, i) => (
              <li key={i} style={{ color: d.diff > 0 ? 'var(--danger)' : 'var(--success)', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>
                <span style={{ color: 'var(--text)' }}>{d.name} ({d.type}):</span> 
                <span style={{ marginLeft: '0.5rem', display: 'inline-block', minWidth: '40px' }}>
                  {d.diff > 0 ? '+' : ''}{d.diff}
                </span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '0.2rem', color: 'var(--text-muted)' }}>
                  {d.diff > 0 ? '(Sẽ trừ vào kho)' : '(Sẽ hoàn lại kho)'}
                </span>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tiếp tục lưu và tự động xử lý tồn kho?</p>
        </div>
      );
      showConfirm('Xác nhận thay đổi', summaryMsg, execSave, 'primary');
    }
  };

  const updateCartItem = (idx, field, value) => {
    const newCart = [...cart];
    let parsedValue = Number(value);
    if (field === 'quantity') {
      parsedValue = Math.max(1, parsedValue || 1); // Prevent 0 or negative
    }
    newCart[idx][field] = parsedValue;
    setCart(newCart);
  };

  const removeFromCart = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const addToCart = (batch, sellType) => {
    if (sellType === 'chai' && batch.current_qty <= 0 && editingOrder.status !== 'cancelled') return showAlert('Hết hàng', 'Lô này đã hết chai nguyên!', 'warning');
    if (sellType === 'ml' && batch.current_ml <= 0 && editingOrder.status !== 'cancelled') return showAlert('Hết hàng', 'Lô này đã hết dung tích chiết!', 'warning');

    const existing = cart.find(c => c.batch_id === batch.id && c.sell_type === sellType);
    if (existing) {
      setCart(cart.map(c => c === existing ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      const baseCost = sellType === 'chai' ? batch.import_price : (batch.import_price / batch.ml_per_unit);
      const suggestedPrice = sellType === 'chai' ? batch.import_price * 1.5 : baseCost * 2;
      setCart([...cart, {
        id: Math.random(),
        batch_id: batch.id,
        product_name: batch.product_name,
        batch_code: batch.batch_code,
        sell_type: sellType,
        quantity: 1,
        price: Math.round(suggestedPrice / 1000) * 1000,
        ml_per_unit: batch.ml_per_unit
      }]);
    }
    setSearchBatch('');
  };

  const filteredBatchesForCart = batches.filter(b => b.product_name.toLowerCase().includes(searchBatch.toLowerCase()) || b.batch_code.toLowerCase().includes(searchBatch.toLowerCase()));

  const updateOrderStatus = async (id, newStatus, currentPaymentStatus) => {
    const isCompleted = newStatus === 'completed';
    const isCancelled = newStatus === 'cancelled';
    const paymentStatus = isCompleted ? 'paid' : currentPaymentStatus;

    let title = '';
    let message = '';

    if (isCompleted) {
      title = 'Xác nhận Giao Thành công';
      message = 'Đơn hàng này sẽ được chuyển sang Hoàn thành. Hệ thống sẽ tự động cập nhật Trạng thái thanh toán thành Đã thu tiền (nếu trước đó là COD).';
    } else if (isCancelled) {
      title = 'Cảnh báo: Hủy đơn hàng';
      message = 'Lưu ý cực kỳ quan trọng: Hành động này sẽ hoàn trả lại toàn bộ số lượng/ml vào Kho, và trừ lại Doanh thu của khách hàng này. Bạn có chắc chắn muốn hủy?';
    } else if (newStatus === 'shipping') {
      title = 'Chuyển cho Shipper';
      message = 'Đơn hàng sẽ được cập nhật thành Đang giao. Số lượng trong kho đã được cấn trừ từ lúc tạo đơn nên sẽ không thay đổi.';
    }

    showConfirm(title, message, async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus, payment_status: paymentStatus })
        });
        if (res.ok) {
          showAlert('Thành công', 'Cập nhật trạng thái đơn hàng thành công!', 'success');
          fetchOrders();
        } else {
          showAlert('Lỗi', 'Không thể cập nhật trạng thái', 'danger');
        }
      } catch {
        showAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'danger');
      }
    }, isCancelled ? 'danger' : 'primary');
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch = (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone || '').includes(search) ||
      o.id.toString() === search;
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Package size={24} color="var(--primary)" /> Quản lý Đơn hàng
          </h1>
          <p className="page-sub" style={{ marginTop: '.25rem' }}>Theo dõi hành trình đơn hàng và cập nhật trạng thái giao hàng.</p>
        </div>
        <div className="page-actions">
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Xem dạng danh sách"><List size={16} /></button>
            <button className={`view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} title="Xem dạng card"><LayoutGrid size={16} /></button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--text-light)" />
          <input className="form-control" placeholder="Tìm theo mã đơn, SĐT hoặc Tên khách..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Premium Segmented Control Tabs */}
        <div className="mobile-scroll-x hide-scrollbar" style={{ display: 'flex', background: 'var(--surface2)', padding: '0.35rem', borderRadius: '10px', overflowX: 'auto', flexShrink: 0, maxWidth: '100%', gap: '0.25rem', border: '1px solid var(--border-light)' }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ xử lý' },
            { id: 'shipping', label: 'Đang giao' },
            { id: 'completed', label: 'Hoàn thành' }
          ].map(t => (
            <button key={t.id} onClick={() => setStatusFilter(t.id)} style={{ padding: '.45rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '.85rem', fontWeight: 600, transition: 'all .2s', background: statusFilter === t.id ? 'var(--surface)' : 'transparent', color: statusFilter === t.id ? 'var(--primary)' : 'var(--text-muted)', boxShadow: statusFilter === t.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card card-no-pad" style={{ overflow: 'visible' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'var(--surface2)', borderRadius: 'var(--r-md)', border: '1px dashed var(--border)' }}>
            <ShoppingCart size={48} opacity={0.2} color="var(--primary)" />
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>Chưa có đơn hàng nào</h3>
              <p style={{ margin: 0 }}>Hãy bắt đầu bán hàng và tạo đơn hàng đầu tiên của bạn!</p>
            </div>
            <button className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', fontSize: '1rem' }} onClick={() => setShowPOS(true)}>
              Tạo đơn hàng ngay
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <>
                <div className="table-wrap desktop-only" style={{ overflowX: 'auto', paddingBottom: '20px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: "nowrap" }}>Mã Đơn</th>
                    <th style={{ whiteSpace: "nowrap" }}>Khách hàng</th>
                    <th style={{ whiteSpace: "nowrap" }}>Tổng tiền</th>
                    <th style={{ whiteSpace: "nowrap" }} className="hide-on-tablet">Thanh toán</th>
                    <th style={{ whiteSpace: "nowrap" }}>Trạng thái</th>
                    <th style={{ whiteSpace: "nowrap" }}>Ngày tạo</th>
                    <th style={{ width: 140 }}>Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => {
                    const statusInfo = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                    const payInfo = PAYMENT_CONFIG[o.payment_status] || PAYMENT_CONFIG.unpaid;

                    return (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)', whiteSpace: "nowrap" }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            #{o.id}
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditModal(o)} title="Sửa thông tin">
                              <Edit size={14} />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => openEditModal(o)}
                            title="Sửa thông tin"
                          >
                            {o.customer_name} <Edit size={12} style={{ opacity: 0.5 }} />
                          </div>
                          <div className="text-xs text-muted">{o.customer_phone}</div>
                        </td>
                        <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{Number(o.total_amount).toLocaleString('vi-VN')} đ</td>
                        <td style={{ whiteSpace: "nowrap" }} className="hide-on-tablet">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.8rem', color: payInfo.color, fontWeight: 500 }}>
                            {payInfo.icon} {payInfo.label}
                          </span>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, display: 'flex', alignItems: 'center', gap: '.25rem', width: 'fit-content' }}>
                            {statusInfo.icon} {statusInfo.label}
                          </span>
                        </td>
                        <td className="text-sm text-muted" style={{ whiteSpace: "nowrap" }}>{new Date(o.created_at).toLocaleString('vi-VN')}</td>
                        <td>
                          {o.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '.25rem' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => updateOrderStatus(o.id, 'shipping', o.payment_status)} style={{ flex: 1, fontSize: '.75rem', padding: '.4rem' }}>
                                <Truck size={12} /> Giao Shiper
                              </button>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => updateOrderStatus(o.id, 'cancelled', o.payment_status)} title="Hủy đơn">
                                <XCircle size={14} />
                              </button>
                            </div>
                          )}
                          {o.status === 'shipping' && (
                            <div style={{ display: 'flex', gap: '.25rem' }}>
                              <button className="btn btn-success btn-sm" onClick={() => updateOrderStatus(o.id, 'completed', o.payment_status)} style={{ flex: 1, fontSize: '.75rem', padding: '.4rem', background: 'var(--success)', borderColor: 'var(--success)' }}>
                                <CheckCircle size={12} /> Hoàn Thành
                              </button>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => updateOrderStatus(o.id, 'cancelled', o.payment_status)} title="Hủy đơn">
                                <XCircle size={14} />
                              </button>
                            </div>
                          )}
                          {o.status === 'completed' && (
                            <div style={{ position: 'relative' }}>
                              <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)', fontSize: '0.75rem', padding: '0.35rem 0.6rem', color: 'var(--text-muted)' }} onClick={() => setActiveDropdown(activeDropdown === o.id ? null : o.id)}>
                                Sửa trạng thái <ChevronDown size={14} style={{ marginLeft: 4 }} />
                              </button>
                              {activeDropdown === o.id && (
                                <>
                                  <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)}></div>
                                  <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '130px', overflow: 'hidden', padding: '0.25rem 0' }} className="anim-scale-in">
                                    <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Chờ xử lý</button>
                                    <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Đang giao</button>
                                    <button onClick={() => { updateOrderStatus(o.id, 'cancelled', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--danger)' }} className="hover-bg">Hủy đơn</button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                          {o.status === 'cancelled' && (
                            <div style={{ position: 'relative' }}>
                              <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)', fontSize: '0.75rem', padding: '0.35rem 0.6rem', color: 'var(--danger)' }} onClick={() => setActiveDropdown(activeDropdown === o.id ? null : o.id)}>
                                Phục hồi đơn <ChevronDown size={14} style={{ marginLeft: 4 }} />
                              </button>
                              {activeDropdown === o.id && (
                                <>
                                  <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)}></div>
                                  <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '130px', overflow: 'hidden', padding: '0.25rem 0' }} className="anim-scale-in">
                                    <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Chờ xử lý</button>
                                    <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Đang giao</button>
                                    <button onClick={() => { updateOrderStatus(o.id, 'completed', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--success)' }} className="hover-bg">Hoàn thành</button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW FOR LIST MODE (FALLBACK) */}
            <div className="mobile-only">
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredOrders.map(o => {
                  const statusInfo = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                  const payInfo = PAYMENT_CONFIG[o.payment_status] || PAYMENT_CONFIG.unpaid;
                  return (
                    <div key={o.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          #{o.id}
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditModal(o)} title="Sửa thông tin">
                            <Edit size={16} />
                          </button>
                        </span>
                        <span className="text-xs text-muted">{new Date(o.created_at).toLocaleString('vi-VN')}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div
                          style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => openEditModal(o)}
                          title="Sửa thông tin"
                        >
                          {o.customer_name} <Edit size={14} style={{ opacity: 0.5 }} />
                        </div>
                        <div className="text-sm text-muted">{o.customer_phone}</div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--r-sm)' }}>
                        <span className="text-sm font-semibold">Tổng tiền:</span>
                        <span style={{ fontWeight: 800, color: 'var(--text)' }}>{Number(o.total_amount).toLocaleString('vi-VN')} đ</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.75rem', color: payInfo.color, fontWeight: 600, background: 'var(--surface2)', padding: '0.2rem 0.5rem', borderRadius: 'var(--r-full)' }}>
                          {payInfo.icon} {payInfo.label}
                        </span>
                      </div>

                      <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-light)', display: 'flex', gap: '0.5rem' }}>
                        {o.status === 'pending' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => updateOrderStatus(o.id, 'shipping', o.payment_status)} style={{ flex: 1, padding: '.6rem' }}>
                              <Truck size={14} /> Giao Shiper
                            </button>
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }} onClick={() => updateOrderStatus(o.id, 'cancelled', o.payment_status)}>
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {o.status === 'shipping' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => updateOrderStatus(o.id, 'completed', o.payment_status)} style={{ flex: 1, padding: '.6rem', background: 'var(--success)', borderColor: 'var(--success)' }}>
                              <CheckCircle size={14} /> Hoàn Thành
                            </button>
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }} onClick={() => updateOrderStatus(o.id, 'cancelled', o.payment_status)}>
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {o.status === 'completed' && (
                          <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)', width: '100%', fontSize: '0.8rem', padding: '0.6rem', color: 'var(--text-muted)' }} onClick={() => setActiveDropdown(activeDropdown === o.id ? null : o.id)}>
                              Sửa trạng thái <ChevronDown size={14} style={{ marginLeft: 4 }} />
                            </button>
                            {activeDropdown === o.id && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)}></div>
                                <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '150px', overflow: 'hidden', padding: '0.25rem 0' }} className="anim-scale-in">
                                  <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Chờ xử lý</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Đang giao</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'cancelled', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--danger)' }} className="hover-bg">Hủy đơn</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {o.status === 'cancelled' && (
                          <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)', width: '100%', fontSize: '0.8rem', padding: '0.6rem', color: 'var(--danger)' }} onClick={() => setActiveDropdown(activeDropdown === o.id ? null : o.id)}>
                              Phục hồi đơn <ChevronDown size={14} style={{ marginLeft: 4 }} />
                            </button>
                            {activeDropdown === o.id && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)}></div>
                                <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '150px', overflow: 'hidden', padding: '0.25rem 0' }} className="anim-scale-in">
                                  <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Chờ xử lý</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Đang giao</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'completed', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--success)' }} className="hover-bg">Hoàn thành</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
            ) : (
              <div className="grid-3-cards" style={{ padding: '1rem' }}>
                {filteredOrders.map(o => {
                  const statusInfo = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                  const payInfo = PAYMENT_CONFIG[o.payment_status] || PAYMENT_CONFIG.unpaid;
                  return (
                    <div key={o.id} className="card hover-card-premium" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          #{o.id}
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditModal(o)} title="Sửa thông tin">
                            <Edit size={16} />
                          </button>
                        </span>
                        <span className="text-xs text-muted">{new Date(o.created_at).toLocaleString('vi-VN')}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div
                          style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '1rem' }}
                          onClick={() => openEditModal(o)}
                          title="Sửa thông tin"
                        >
                          {o.customer_name}
                        </div>
                        <div className="text-sm text-muted">{o.customer_phone}</div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-light)' }}>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Tổng tiền</span>
                        <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1.1rem' }}>{Number(o.total_amount).toLocaleString('vi-VN')} đ</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.75rem', color: payInfo.color, fontWeight: 600, background: 'var(--surface2)', padding: '0.2rem 0.6rem', borderRadius: 'var(--r-full)' }}>
                          {payInfo.icon} {payInfo.label}
                        </span>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px dashed var(--border-light)', display: 'flex', gap: '0.5rem' }}>
                        {o.status === 'pending' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => updateOrderStatus(o.id, 'shipping', o.payment_status)} style={{ flex: 1, padding: '.6rem' }}>
                              <Truck size={14} /> Giao Shiper
                            </button>
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }} onClick={() => updateOrderStatus(o.id, 'cancelled', o.payment_status)}>
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {o.status === 'shipping' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => updateOrderStatus(o.id, 'completed', o.payment_status)} style={{ flex: 1, padding: '.6rem', background: 'var(--success)', borderColor: 'var(--success)' }}>
                              <CheckCircle size={14} /> Hoàn Thành
                            </button>
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }} onClick={() => updateOrderStatus(o.id, 'cancelled', o.payment_status)}>
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {o.status === 'completed' && (
                          <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)', width: '100%', fontSize: '0.8rem', padding: '0.6rem', color: 'var(--text-muted)' }} onClick={() => setActiveDropdown(activeDropdown === o.id ? null : o.id)}>
                              Sửa trạng thái <ChevronDown size={14} style={{ marginLeft: 4 }} />
                            </button>
                            {activeDropdown === o.id && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)}></div>
                                <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '150px', overflow: 'hidden', padding: '0.25rem 0' }} className="anim-scale-in">
                                  <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Chờ xử lý</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Đang giao</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'cancelled', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--danger)' }} className="hover-bg">Hủy đơn</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {o.status === 'cancelled' && (
                          <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)', width: '100%', fontSize: '0.8rem', padding: '0.6rem', color: 'var(--danger)' }} onClick={() => setActiveDropdown(activeDropdown === o.id ? null : o.id)}>
                              Phục hồi đơn <ChevronDown size={14} style={{ marginLeft: 4 }} />
                            </button>
                            {activeDropdown === o.id && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)}></div>
                                <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '150px', overflow: 'hidden', padding: '0.25rem 0' }} className="anim-scale-in">
                                  <button onClick={() => { updateOrderStatus(o.id, 'pending', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Chờ xử lý</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'shipping', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }} className="hover-bg">Đang giao</button>
                                  <button onClick={() => { updateOrderStatus(o.id, 'completed', o.payment_status); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--success)' }} className="hover-bg">Hoàn thành</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Order Modal */}
      {editingOrder && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditingOrder(null); }}>
          <div className="modal anim-scale-in" style={{ width: '900px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h2 className="modal-title">Chi tiết Đơn hàng #{editingOrder.id}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditingOrder(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '1.5rem' }}>
              {/* Cột trái: Khách hàng */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', color: 'var(--primary)', margin: 0 }}>Thông tin Khách hàng</h3>
                <div className="form-group">
                  <label className="form-label">Tên khách hàng <span className="text-danger">*</span></label>
                  <input className="form-control" value={editForm.customer_name} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại <span className="text-danger">*</span></label>
                  <input
                    type="tel"
                    className="form-control"
                    value={editForm.customer_phone}
                    onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    style={{ borderColor: !editForm.customer_phone ? 'var(--danger)' : undefined }}
                    placeholder="Bắt buộc nhập số điện thoại..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Địa chỉ giao hàng</label>
                  <AddressSelect
                    value={editForm.customer_address}
                    onChange={addr => setEditForm({ ...editForm, customer_address: addr })}
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Phí giao hàng (VNĐ)</label>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button 
                        type="button" 
                        className={`btn btn-xs ${Number(editForm.shipping_customer_pay) === 1 ? 'btn-primary' : 'btn-ghost'}`} 
                        style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', height: 'auto', minHeight: 0 }} 
                        onClick={() => setEditForm({...editForm, shipping_customer_pay: 1})}
                      >
                        Thu khách
                      </button>
                      <button 
                        type="button" 
                        className={`btn btn-xs ${Number(editForm.shipping_customer_pay) === 0 ? 'btn-danger' : 'btn-ghost'}`} 
                        style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', height: 'auto', minHeight: 0 }} 
                        onClick={() => setEditForm({...editForm, shipping_customer_pay: 0})}
                      >
                        Shop trả
                      </button>
                    </div>
                  </div>
                  <input 
                    className="form-control" 
                    type="number" 
                    value={editForm.shipping_fee} 
                    onChange={e => setEditForm({ ...editForm, shipping_fee: e.target.value })} 
                    style={{ color: Number(editForm.shipping_customer_pay) === 0 ? 'var(--danger)' : 'inherit', fontWeight: Number(editForm.shipping_customer_pay) === 0 ? 600 : 400 }}
                  />
                  {Number(editForm.shipping_customer_pay) === 0 && Number(editForm.shipping_fee) > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.35rem', fontWeight: 600 }}>
                      * Shop chịu phí vận chuyển {Number(editForm.shipping_fee).toLocaleString()}đ
                    </div>
                  )}
                </div>
              </div>

              {/* Cột phải: Sản phẩm */}
              <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', color: 'var(--primary)', margin: 0 }}>Chi tiết Sản phẩm</h3>

                {loadingItems ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Đang tải sản phẩm...</div>
                ) : (
                  <>
                    {/* Thêm sản phẩm */}
                    <div style={{ position: 'relative' }}>
                      <input type="text" className="form-control" placeholder="Gõ tên hoặc lô để thêm sản phẩm..." value={searchBatch} onChange={e => setSearchBatch(e.target.value)} />
                      {searchBatch && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
                          {filteredBatchesForCart.slice(0, 5).map(b => (
                            <div key={b.id} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="hover-bg">
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.product_name}</div>
                                <div className="text-xs text-muted">Lô: {b.batch_code} (Tồn: {b.current_qty} chai)</div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => addToCart(b, 'chai')}>Chai</button>
                                {b.ml_per_unit > 0 && <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => addToCart(b, 'ml')}>ML</button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Danh sách giỏ hàng */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {cart.length === 0 ? <div className="text-muted text-center" style={{ padding: '1rem' }}>Đơn hàng trống</div> : cart.map((item, idx) => (
                        <div key={item.id} style={{ background: 'var(--surface2)', padding: '0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-light)', position: 'relative' }}>
                          <button className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', color: 'var(--danger)', padding: '0.25rem' }} onClick={() => removeFromCart(idx)}>✕</button>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', paddingRight: '1.5rem', marginBottom: '0.25rem' }}>{item.product_name}</div>
                          <div className="text-xs text-muted" style={{ marginBottom: '0.5rem' }}>Lô: {item.batch_code} ({item.sell_type === 'chai' ? 'Nguyên chai' : 'Chiết ml'})</div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div style={{ width: '60px' }}>
                              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>SL</label>
                              <input type="number" className="form-control" style={{ padding: '0.35rem' }} value={item.quantity} min="1" onChange={e => updateCartItem(idx, 'quantity', e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Đơn giá (đ)</label>
                              <input type="text" className="form-control" style={{ padding: '0.35rem' }} value={item.price ? item.price.toLocaleString('vi-VN') : ''} onChange={e => updateCartItem(idx, 'price', e.target.value.replace(/\D/g, ''))} />
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--primary)', flexShrink: 0, paddingBottom: '0.35rem' }}>
                              = {(item.price * item.quantity).toLocaleString()} đ
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 'auto', background: 'var(--primary-light)', padding: '1rem', borderRadius: 'var(--r-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>Tổng thu khách:</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {(cart.reduce((s, c) => s + (c.price * c.quantity), 0) + (Number(editForm.shipping_customer_pay) === 1 ? Number(editForm.shipping_fee) || 0 : 0)).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={() => setEditingOrder(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleUpdateInfo} disabled={loadingItems}>Lưu thay đổi</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
