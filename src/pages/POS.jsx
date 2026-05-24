import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, Search, Trash2, CreditCard, Printer, UserPlus, CheckCircle, Package, Plus, ChevronDown, Truck, Layers } from 'lucide-react';
import { API_BASE_URL } from '../config';
import AddressSelect from '../components/ui/AddressSelect';
import { useDialog } from '../components/ui/DialogContext';
import { useNavigate } from 'react-router-dom';

const POS = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ id: null, name: '', phone: '', address: '', note: '' });
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderConfig, setOrderConfig] = useState({ status: 'pending', payment_status: 'paid', shipping_customer_pay: true });
  const [shippingFee, setShippingFee] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const { showAlert } = useDialog();
  
  const unitLabels = { chai: 'Chai', cai: 'Cái', hop: 'Hộp', set: 'Set', tuyp: 'Tuýp', gam: 'Gam (g)' };

  useEffect(() => {
    fetchBatches();
    fetchCustomers();
    
    // Check for draft customer passed from Customers page
    try {
      const draft = localStorage.getItem('luccy_pos_customer_draft');
      if (draft) {
        const p = JSON.parse(draft);
        setCustomerInfo({ id: p.id || null, name: p.name, phone: p.phone, address: p.address || '', note: p.note || '' });
        localStorage.removeItem('luccy_pos_customer_draft');
      }
    } catch(e) {}
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/batches.php`);
      if (res.ok) setBatches(await res.json());
    } catch (err) {}
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers.php`);
      if (res.ok) setCustomers(await res.json());
    } catch {}
  };

  const filteredBatches = batches.filter(b => {
    const matchSearch = b.product_name.toLowerCase().includes(search.toLowerCase()) || 
                        b.batch_code.toLowerCase().includes(search.toLowerCase());
    
    // Hide empty batches by default, only show if specifically searched
    if (!search && b.current_qty <= 0 && b.current_ml <= 0) return false;
    
    return matchSearch;
  });

    const groupedBatches = filteredBatches.reduce((acc, b) => {
    const cat = b.category || 'Khác (Chưa phân loại)';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  const addToCart = (batch, sellType) => {
    if (sellType === 'chai' && batch.current_qty <= 0) return showAlert('Hết hàng', `Lô này đã hết ${unitLabels[batch.unit]?.toLowerCase() || 'hàng'} nguyên!`, 'warning');
    if (sellType === 'ml' && batch.current_ml <= 0) return showAlert('Hết hàng', `Lô này đã hết ${batch.unit === 'chai' ? 'dung tích chiết' : 'số lượng xé lẻ'}!`, 'warning');

    const existing = cart.find(c => c.batch_id === batch.id && c.sell_type === sellType);
    if (existing) {
      setCart(cart.map(c => c === existing ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      const baseCost = sellType === 'chai' ? batch.import_price : (batch.import_price / batch.ml_per_unit);
      let suggestedPrice = 0;
      let isExplicitPrice = false;
      if (batch.selling_price && Number(batch.selling_price) > 0) {
        isExplicitPrice = true;
        if (sellType === 'chai') {
          suggestedPrice = Number(batch.selling_price);
        } else {
          suggestedPrice = Number(batch.ml_per_unit) > 0 ? (Number(batch.selling_price) / Number(batch.ml_per_unit)) : (baseCost * 2);
        }
      } else {
        suggestedPrice = sellType === 'chai' ? batch.import_price * 1.5 : baseCost * 2;
      }
      setCart([...cart, {
        batch_id: batch.id, product_name: batch.product_name, batch_code: batch.batch_code,
        sell_type: sellType, quantity: 1, 
        price: isExplicitPrice ? Math.round(suggestedPrice) : Math.round(suggestedPrice / 1000) * 1000,
        base_cost: baseCost
      }]);
    }
  };

  const updateCartItem = (index, field, value) => {
    const newCart = [...cart];
    newCart[index][field] = Number(value);
    setCart(newCart);
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    const existing = customers.find(c => c.phone === val);
    if (existing) {
      setCustomerInfo({ id: existing.id, name: existing.name, phone: val, address: existing.address || '', note: existing.note || '' });
    } else {
      setCustomerInfo({ ...customerInfo, phone: val, id: null });
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return showAlert('Giỏ hàng trống', 'Vui lòng chọn ít nhất 1 sản phẩm vào giỏ.', 'warning');
    if (!customerInfo.name || !customerInfo.name.trim()) return showAlert('Thiếu thông tin', 'Vui lòng nhập Họ tên khách hàng.', 'warning');
    if (!customerInfo.phone || !customerInfo.phone.trim()) return showAlert('Thiếu thông tin', 'Vui lòng nhập Số điện thoại khách hàng.', 'warning');
    
    try {
      const res = await fetch(`${API_BASE_URL}/orders.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          total_amount: totalAmount,
          shipping_fee: shippingFee,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          customer_address: customerInfo.address,
          customer_note: customerInfo.note,
          status: orderConfig.status,
          payment_status: orderConfig.payment_status,
          shipping_customer_pay: orderConfig.shipping_customer_pay ? 1 : 0
        })
      });
      
      if (res.ok) {
        showAlert('Thành công', 'Tạo đơn hàng thành công!', 'success');
        setCart([]);
        setCustomerInfo({ id: null, name: '', phone: '', address: '', note: '' });
        setOrderConfig({ status: 'pending', payment_status: 'paid' });
        setShippingFee(0);
        setShowCheckout(false);
        fetchBatches(); // Reload inventory
        fetchCustomers(); // Reload CRM
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        showAlert('Lỗi hệ thống', 'Lỗi lưu đơn hàng.', 'danger');
      }
    } catch(err) {
      showAlert('Offline Mode', 'Đã lưu hóa đơn offline!', 'info');
      setCart([]);
    }
  };

  return createPortal(
    <div className="modal-overlay pos-overlay" style={{ zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className="modal pos-modal" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', flexShrink: 0, background: 'var(--surface)' }}>
          <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>Tạo Đơn Hàng Mới (POS)</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ flex: 1, padding: '1rem', overflowY: 'auto', background: 'var(--bg)' }}>
          {/* Tabs for mobile */}
          <div className="pos-mobile-tabs">
            <button className={`pos-tab-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
              <Package size={16} /> <span>Sản phẩm ({filteredBatches.length})</span>
            </button>
            <button className={`pos-tab-btn ${activeTab === 'cart' ? 'active' : ''}`} onClick={() => setActiveTab('cart')}>
              <ShoppingCart size={16} /> <span>Giỏ hàng ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
            </button>
          </div>

          <div className="animate-fade-in pos-layout">
      {/* Product Selection */}
      <div className={`card pos-card products-column ${activeTab === 'products' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden', padding: '1.5rem 1rem' }}>
        <h2 style={{ fontSize: '1.25rem', padding: '0 0.5rem' }}>Bán hàng (POS) & Kiểm kho</h2>
        <div style={{ position: 'relative', padding: '0 0.5rem', zIndex: 10 }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" className="form-control" placeholder="Quét mã vạch hoặc gõ tên SP..." style={{ paddingLeft: '2.5rem' }} value={search} onChange={e => setSearch(e.target.value)} />
          {search && filteredBatches.length > 0 && (
            <div className="autocomplete-dropdown animate-fade-in" style={{ position: 'absolute', top: '100%', left: '0.5rem', right: '0.5rem', marginTop: '0.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', maxHeight: '200px', overflowY: 'auto' }}>
              {filteredBatches.slice(0, 5).map(batch => (
                <div key={batch.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }} onClick={() => setSearch(batch.product_name)} className="hover-bg">
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{batch.product_name}</div>
                  <div className="text-muted text-xs">Lô: {batch.batch_code} - Tồn: {batch.current_qty} {unitLabels[batch.unit] || 'đơn vị'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem' }}>
          {filteredBatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Package size={40} opacity={0.3} />
              <p style={{ margin: 0 }}>Chưa có sản phẩm nào trong kho để bán.</p>
              <button className="btn btn-primary btn-sm" onClick={() => { if (onClose) onClose(); navigate('/inventory'); }}>
                <Plus size={14} /> Đến trang Nhập kho
              </button>
            </div>
          ) : Object.entries(groupedBatches).map(([cat, batchesInCat]) => (
            <div key={cat} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
                <Layers size={16} color={cat.includes('Khác') ? 'var(--text-muted)' : 'var(--primary)'} />
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>{cat}</span>
                <span className="badge badge-muted" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>{batchesInCat.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {batchesInCat.map(batch => (
            <div key={batch.id} style={{ padding: '0.85rem', background: 'var(--surface)', border: `1px solid var(--border-light)`, borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.85rem', transition: 'all 0.2s', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }} className="hover-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{batch.product_name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: 'var(--surface2)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>{batch.batch_code}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{batch.import_date ? new Date(batch.import_date).toLocaleDateString('vi-VN') : ''}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vốn: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{batch.import_price ? Number(batch.import_price).toLocaleString('vi-VN') : 0}đ</span></span>
                    {batch.selling_price && Number(batch.selling_price) > 0 && (
                      <>
                        <span style={{ color: 'var(--border-dark)', fontSize: '0.75rem' }}>•</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Giá bán: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{Number(batch.selling_price).toLocaleString('vi-VN')}đ</span></span>
                      </>
                    )}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span style={{ padding: '0.25rem 0.5rem', background: batch.current_qty <= 5 ? 'var(--danger-bg)' : 'var(--primary-bg)', color: batch.current_qty <= 5 ? 'var(--danger)' : 'var(--primary)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {batch.current_qty > 0 ? `Tồn: ${batch.current_qty}` : 'Hết hàng'}
                  </span>
                  {batch.ml_per_unit > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{batch.current_ml} {batch.unit === 'chai' ? 'ml' : batch.unit === 'tuyp' ? 'g' : 'đv lẻ'}</span>}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button disabled={batch.current_qty <= 0} onClick={() => addToCart(batch, 'chai')} style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--primary)', background: 'var(--primary)', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: batch.current_qty <= 0 ? 'not-allowed' : 'pointer', opacity: batch.current_qty <= 0 ? 0.5 : 1, transition: '0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  Bán {unitLabels[batch.unit] || 'Nguyên'}
                </button>
                {batch.ml_per_unit > 0 && (
                  <button disabled={batch.current_ml <= 0} onClick={() => addToCart(batch, 'ml')} style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--primary)', background: 'var(--primary-bg)', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, cursor: batch.current_ml <= 0 ? 'not-allowed' : 'pointer', opacity: batch.current_ml <= 0 ? 0.5 : 1, transition: '0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    Bán {batch.unit === 'chai' ? 'Chiết' : 'Xé lẻ'}
                  </button>
                )}
              </div>
            </div>
          ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Checkout */}
      <div className={`card pos-card cart-column ${activeTab === 'cart' ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShoppingCart size={20} color="var(--primary)" /> Đơn hàng</h2>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Chưa có sản phẩm trong giỏ</div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', position: 'relative' }}>
                <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.25rem 0', paddingRight: '1.5rem' }}>{item.product_name}</h4>
                <span className="text-muted text-xs">Lô: {item.batch_code} ({item.sell_type === 'chai' ? 'Nguyên' : (item.sell_type === 'ml' ? 'Lẻ' : item.sell_type)})</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ width: '70px', flexShrink: 0 }}>
                    <label className="text-xs text-muted" style={{display: 'block', marginBottom: '0.2rem'}}>SL</label>
                    <input type="number" className="form-control" style={{ width: '100%', padding: '0.4rem' }} value={item.quantity} min="1" onChange={e => updateCartItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div style={{ paddingBottom: '0.4rem', color: 'var(--text-muted)' }}>x</div>
                  <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
                    <label className="text-xs text-muted" style={{display: 'block', marginBottom: '0.2rem', whiteSpace: 'nowrap'}}>Đơn giá (đ)</label>
                    <input type="text" className="form-control" style={{ width: '100%', padding: '0.4rem' }} value={item.price ? item.price.toLocaleString('vi-VN') : ''} onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      updateCartItem(idx, 'price', val);
                    }} />
                  </div>
                  <div style={{ fontWeight: 700, flex: '1 1 100%', textAlign: 'right', color: 'var(--primary)', fontSize: '1.05rem', paddingTop: '0.25rem' }}>
                    = {(item.price * item.quantity).toLocaleString()} đ
                  </div>
                </div>
                {item.price < item.base_cost && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ⚠️ Giá bán đang thấp hơn giá vốn ({Math.round(item.base_cost).toLocaleString('vi-VN')} đ)
                  </div>
                )}
                {item.sell_type === 'ml' && (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', marginRight: '0.25rem' }}>Chọn nhanh:</span>
                    {[10, 20, 50, 100].map(v => (
                      <button key={v} type="button" className={`badge ${item.quantity === v ? 'badge-primary' : 'badge-muted'}`} style={{ cursor: 'pointer', border: item.quantity === v ? 'none' : '1px solid var(--border)', padding: '0.35rem 0.75rem', fontSize: '0.8rem', minHeight: '32px', minWidth: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => updateCartItem(idx, 'quantity', v)}>
                        {v}ml
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: '2px dashed var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>Tổng tạm tính:</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalAmount.toLocaleString('vi-VN')} đ</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '1rem' }} onClick={() => alert('In bill...')}><Printer size={20} /></button>
            <button className="btn btn-primary" style={{ flex: 3, padding: '1rem', fontSize: '1.125rem' }} onClick={() => {
              if (cart.length === 0) return showAlert('Giỏ hàng trống', 'Vui lòng chọn ít nhất 1 sản phẩm vào giỏ.', 'warning');
              setShowCheckout(true);
            }}><Plus size={20} /> Tạo Đơn</button>
          </div>
        </div>
      </div>

      {showCheckout && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={e => { if (e.target === e.currentTarget) setShowCheckout(false); }}>
          <div className="modal" style={{ maxWidth: '900px', width: '95vw', background: 'var(--surface2)' }}>
            <div className="modal-header" style={{ background: 'var(--surface)', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-light)' }}>
              <h2 className="modal-title" style={{ fontSize: '1.35rem' }}>Tạo Đơn hàng mới</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCheckout(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', flexWrap: 'wrap' }}>
              {/* Thông tin Khách hàng */}
              <div className="checkout-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>
                  <UserPlus size={20} /> Thông tin Khách hàng
                </h3>
                <div className="form-group">
                  <label className="form-label">Số điện thoại <span style={{color:'var(--danger)'}}>*</span></label>
                  <input type="text" className="form-control" placeholder="Nhập để tìm khách cũ hoặc tạo mới..." value={customerInfo.phone} onChange={handlePhoneChange} autoFocus />
                  {customerInfo.id && <div className="text-xs mt-1 text-muted" style={{ color: 'var(--success)' }}>✓ Đã tìm thấy khách hàng cũ</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Họ & Tên <span style={{color:'var(--danger)'}}>*</span></label>
                  <input type="text" className="form-control" placeholder="Nguyễn Văn A" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Địa chỉ giao hàng</label>
                  <AddressSelect value={customerInfo.address} onChange={addr => setCustomerInfo({...customerInfo, address: addr})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú (Sở thích, yêu cầu)</label>
                  <textarea className="form-control" rows={2} style={{ resize: 'vertical' }} value={customerInfo.note} onChange={e => setCustomerInfo({...customerInfo, note: e.target.value})}></textarea>
                </div>
              </div>

              {/* Tóm tắt Đơn hàng */}
              <div style={{ flex: '1 1 290px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="checkout-panel-inner">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>
                    <Package size={20} /> Tóm tắt Đơn hàng
                  </h3>
                  
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {cart.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface2)', borderRadius: 'var(--r-sm)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.quantity}x {item.product_name}</div>
                          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>Lô: {item.batch_code} ({item.sell_type === 'chai' ? 'Nguyên' : 'Lẻ'})</div>
                        </div>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>{(item.price * item.quantity).toLocaleString()} đ</div>
                      </div>
                    ))}
                  </div>

                  {/* Hướng dẫn sử dụng */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: 'var(--primary)', padding: '0.25rem 0' }} onClick={() => setShowGuide(!showGuide)}>
                      <strong style={{ fontSize: '0.875rem' }}>💡 Hướng dẫn tạo đơn</strong>
                      <ChevronDown size={16} style={{ transform: showGuide ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: '0.25rem' }} />
                    </div>
                    {showGuide && (
                      <div className="anim-slide-in" style={{ background: 'var(--info-bg, #eff6ff)', color: 'var(--info, #3b82f6)', padding: '0.75rem 1rem', borderRadius: 'var(--r-sm)', fontSize: '0.85rem', marginTop: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <ul style={{ margin: '0', paddingLeft: '1.25rem' }}>
                          <li style={{ marginBottom: '0.25rem' }}><strong>Tự giao:</strong> Bạn tự giao cho khách hoặc khách mua trực tiếp, đơn sẽ được tính là Hoàn thành ngay lập tức.</li>
                          <li style={{ marginBottom: '0.25rem' }}><strong>Cần ship:</strong> Khách đặt giao hàng, đơn sẽ vào danh sách "Chờ xử lý" trong Quản lý đơn hàng.</li>
                          <li><strong>Thanh toán:</strong> Nếu khách chưa trả tiền (COD), hãy chọn "Chưa thu". Doanh thu sẽ chỉ được tính khi đơn đã thu tiền.</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="form-row" style={{ gap: '0.75rem', marginTop: 'auto', marginBottom: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="text-xs text-muted" style={{ marginBottom: '.25rem', display: 'block' }}>Thanh toán</label>
                      <div style={{ position: 'relative' }}>
                        <select className="form-control" value={orderConfig.payment_status} onChange={e => setOrderConfig({...orderConfig, payment_status: e.target.value})} style={{ padding: '.65rem 1rem', paddingRight: '2.5rem', fontSize: '.875rem', appearance: 'none', cursor: 'pointer', fontWeight: 600, background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                          <option value="unpaid">Chưa thu (COD)</option>
                          <option value="paid">Đã thu tiền</option>
                        </select>
                        <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="text-xs text-muted" style={{ marginBottom: '.25rem', display: 'block' }}>Giao hàng</label>
                      <div style={{ position: 'relative' }}>
                        <select className="form-control" value={orderConfig.status} onChange={e => setOrderConfig({...orderConfig, status: e.target.value})} style={{ padding: '.65rem 1rem', paddingRight: '2.5rem', fontSize: '.875rem', appearance: 'none', cursor: 'pointer', fontWeight: 600, background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                          <option value="pending">Cần ship (Chờ xử lý)</option>
                          <option value="shipping">Đang giao hàng</option>
                          <option value="completed">Tự giao (Hoàn thành)</option>
                        </select>
                        <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  </div>
                  
                  {orderConfig.status !== 'completed' && (
                    <div className="form-group" style={{ marginBottom: '1rem', padding: '0.5rem 0', borderBottom: '1px dashed var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label className="text-sm text-muted" style={{ fontWeight: 500, margin: 0 }}>Phí ship (nếu có)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            type="button" 
                            className={`btn btn-xs ${orderConfig.shipping_customer_pay ? 'btn-primary' : 'btn-ghost'}`} 
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', height: 'auto', minHeight: 0 }} 
                            onClick={() => setOrderConfig({...orderConfig, shipping_customer_pay: true})}
                          >
                            Thu khách
                          </button>
                          <button 
                            type="button" 
                            className={`btn btn-xs ${!orderConfig.shipping_customer_pay ? 'btn-danger' : 'btn-ghost'}`} 
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', height: 'auto', minHeight: 0 }} 
                            onClick={() => setOrderConfig({...orderConfig, shipping_customer_pay: false})}
                          >
                            Shop trả
                          </button>
                        </div>
                      </div>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <Truck size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input type="text" className="form-control" style={{ width: '100%', textAlign: 'right', padding: '0.6rem 2.2rem 0.6rem 2.2rem', fontWeight: 600, color: orderConfig.shipping_customer_pay ? 'inherit' : 'var(--danger)' }} value={shippingFee > 0 ? shippingFee.toLocaleString('vi-VN') : ''} placeholder="0" onChange={e => {
                          const val = Number(e.target.value.replace(/\D/g, ''));
                          setShippingFee(val);
                        }} />
                        <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>đ</span>
                      </div>
                      {!orderConfig.shipping_customer_pay && shippingFee > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', fontWeight: 600 }}>
                          * Shop chịu phí vận chuyển
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-light)', padding: '1.25rem', borderRadius: 'var(--r-sm)' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Tổng thu khách:</span>
                    <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary)' }}>{(totalAmount + (orderConfig.status !== 'completed' && orderConfig.shipping_customer_pay ? shippingFee : 0)).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
                
                <button className="btn btn-primary" style={{ width: '100%', padding: '1.35rem', fontSize: '1.15rem', boxShadow: 'var(--shadow-md)' }} onClick={handleCheckout}>
                  <CheckCircle size={22} /> TẠO ĐƠN & TRỪ KHO
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
      <style>{`
        .pos-modal {
          width: 98vw;
          max-width: 1400px;
          height: 95vh;
          background: var(--surface);
          border-radius: var(--r-lg);
          box-shadow: var(--shadow-lg);
          animation: modal-pop .25s cubic-bezier(.34, 1.56, .64, 1);
        }
        .pos-layout {
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
          gap: 1.5rem; 
          height: calc(100vh - 120px);
        }
        @media (max-width: 1023px) {
          .pos-overlay {
            padding: 0 !important;
          }
          .pos-modal {
            width: 100vw !important;
            max-width: none !important;
            height: 100vh !important;
            max-height: none !important;
            border-radius: 0 !important;
          }
          .pos-layout {
            display: flex;
            flex-direction: column;
            height: auto;
          }
          .pos-card {
            min-height: 50vh;
            padding: 1rem 0.5rem !important;
          }
        }
        @media (max-width: 768px) {
          .pos-layout {
            display: flex;
            flex-direction: column;
            height: auto;
          }
          .pos-card {
            min-height: 50vh;
            padding: 1rem 0.5rem !important;
          }
        }
        .hover-shadow:hover { border-color: var(--primary) !important; box-shadow: var(--shadow-sm); }
        .hover-bg:hover { background-color: var(--surface-hover); }
        .autocomplete-dropdown::-webkit-scrollbar { width: 4px; }
            `}</style>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default POS;
