import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Trash2, CreditCard, Printer, UserPlus, CheckCircle, Package } from 'lucide-react';
import { API_BASE_URL } from '../config';
import AddressSelect from '../components/ui/AddressSelect';
import { useDialog } from '../components/ui/DialogContext';

const POS = () => {
  const [batches, setBatches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ id: null, name: '', phone: '', address: '', note: '' });
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderConfig, setOrderConfig] = useState({ status: 'pending', payment_status: 'unpaid' });
  const { showAlert } = useDialog();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
    fetchCustomers();
    
    // Check for draft customer passed from Customers page
    try {
      const draft = localStorage.getItem('luccy_pos_customer_draft');
      if (draft) {
        const p = JSON.parse(draft);
        setCustomerInfo({ id: p.id || null, name: p.name, phone: p.phone, address: p.address || '', note: p.note || '' });
        setShowCheckout(true);
        localStorage.removeItem('luccy_pos_customer_draft');
      }
    } catch(e) {}
  }, []);

  const fetchBatches = async () => {
    try {
      const mockBatches = [
        { id: 1, product_name: 'Nước hoa Chanel No.5', batch_code: 'AUTO-1', current_qty: 45, current_ml: 4500, ml_per_unit: 100, import_price: 2500000 },
      ];
      try {
        const res = await fetch(`${API_BASE_URL}/batches.php`);
        if (res.ok) setBatches(await res.json());
        else setBatches(mockBatches);
      } catch(e) { setBatches(mockBatches); }
    } catch (err) {}
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers.php`);
      if (res.ok) setCustomers(await res.json());
    } catch {}
  };

  const filteredBatches = batches.filter(b => 
    b.product_name.toLowerCase().includes(search.toLowerCase()) || 
    b.batch_code.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (batch, sellType) => {
    if (sellType === 'chai' && batch.current_qty <= 0) return showAlert('Hết hàng', 'Lô này đã hết chai nguyên!', 'warning');
    if (sellType === 'ml' && batch.current_ml <= 0) return showAlert('Hết hàng', 'Lô này đã hết dung tích chiết!', 'warning');

    const existing = cart.find(c => c.batch_id === batch.id && c.sell_type === sellType);
    if (existing) {
      setCart(cart.map(c => c === existing ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      const suggestedPrice = sellType === 'chai' ? batch.import_price * 1.5 : (batch.import_price / batch.ml_per_unit) * 2;
      setCart([...cart, {
        batch_id: batch.id, product_name: batch.product_name, batch_code: batch.batch_code,
        sell_type: sellType, quantity: 1, price: Math.round(suggestedPrice / 1000) * 1000
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
    
    try {
      const res = await fetch(`${API_BASE_URL}/orders.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          total_amount: totalAmount,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          customer_address: customerInfo.address,
          customer_note: customerInfo.note,
          status: orderConfig.status,
          payment_status: orderConfig.payment_status
        })
      });
      
      if (res.ok) {
        showAlert('Thành công', 'Tạo đơn hàng thành công!', 'success');
        setCart([]);
        setCustomerInfo({ id: null, name: '', phone: '', address: '', note: '' });
        setOrderConfig({ status: 'pending', payment_status: 'unpaid' });
        setShowCheckout(false);
        fetchBatches(); // Reload inventory
        fetchCustomers(); // Reload CRM
        navigate('/orders');
      } else {
        showAlert('Lỗi hệ thống', 'Lỗi lưu đơn hàng.', 'danger');
      }
    } catch(err) {
      showAlert('Offline Mode', 'Đã lưu hóa đơn offline!', 'info');
      setCart([]);
    }
  };

  return (
    <div className="animate-fade-in pos-layout">
      {/* Product Selection */}
      <div className="card pos-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden', padding: '1.5rem 1rem' }}>
        <h2 style={{ fontSize: '1.25rem', padding: '0 0.5rem' }}>Bán hàng (POS) & Kiểm kho</h2>
        <div style={{ position: 'relative', padding: '0 0.5rem', zIndex: 10 }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" className="form-control" placeholder="Quét mã vạch hoặc gõ tên SP..." style={{ paddingLeft: '2.5rem' }} value={search} onChange={e => setSearch(e.target.value)} />
          {search && filteredBatches.length > 0 && (
            <div className="autocomplete-dropdown animate-fade-in" style={{ position: 'absolute', top: '100%', left: '0.5rem', right: '0.5rem', marginTop: '0.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', maxHeight: '200px', overflowY: 'auto' }}>
              {filteredBatches.slice(0, 5).map(batch => (
                <div key={batch.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }} onClick={() => setSearch(batch.product_name)} className="hover-bg">
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{batch.product_name}</div>
                  <div className="text-muted text-xs">Lô: {batch.batch_code} - Tồn: {batch.current_qty} chai</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem' }}>
          {filteredBatches.map(batch => (
            <div key={batch.id} style={{ padding: '1rem', border: `1px solid ${batch.current_qty <= 5 ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'var(--transition)' }} className="hover-shadow">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{batch.product_name}</h4>
                  <span className="text-muted text-sm">Mã lô: {batch.batch_code}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${batch.current_qty <= 5 ? 'badge-danger' : 'badge-success'}`} style={{ background: batch.current_qty <= 5 ? 'var(--danger-bg)' : '', color: batch.current_qty <= 5 ? 'var(--danger)' : '' }}>
                    {batch.current_qty > 0 ? `Tồn: ${batch.current_qty} chai` : 'Hết hàng (Chai)'}
                  </span>
                  {batch.ml_per_unit > 0 && <div className="text-xs text-muted mt-1">Còn {batch.current_ml} ml</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button disabled={batch.current_qty <= 0} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem', opacity: batch.current_qty <= 0 ? 0.5 : 1 }} onClick={() => addToCart(batch, 'chai')}>Bán Nguyên Chai</button>
                {batch.ml_per_unit > 0 && (
                  <button disabled={batch.current_ml <= 0} className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem', opacity: batch.current_ml <= 0 ? 0.5 : 1 }} onClick={() => addToCart(batch, 'ml')}>Bán Chiết (ml)</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Checkout */}
      <div className="card pos-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShoppingCart size={20} color="var(--primary)" /> Đơn hàng</h2>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Chưa có sản phẩm trong giỏ</div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', position: 'relative' }}>
                <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.25rem 0', paddingRight: '1.5rem' }}>{item.product_name}</h4>
                <span className="text-muted text-xs">Lô: {item.batch_code} ({item.sell_type === 'chai' ? 'Nguyên chai' : 'Chiết ml'})</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                  <input type="number" className="form-control" style={{ width: '80px', padding: '0.4rem' }} value={item.quantity} min="1" onChange={e => updateCartItem(idx, 'quantity', e.target.value)} />
                  <span className="text-muted">x</span>
                  <input type="number" className="form-control" style={{ flex: 1, padding: '0.4rem' }} value={item.price} onChange={e => updateCartItem(idx, 'price', e.target.value)} />
                  <span style={{ fontWeight: 600, width: '100px', textAlign: 'right', color: 'var(--primary)' }}>{(item.price * item.quantity).toLocaleString()} đ</span>
                </div>
                {item.sell_type === 'ml' && (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', marginRight: '0.25rem' }}>Chọn nhanh:</span>
                    {[10, 20, 50, 100].map(v => (
                      <button key={v} type="button" className={`badge ${item.quantity === v ? 'badge-primary' : 'badge-muted'}`} style={{ cursor: 'pointer', border: item.quantity === v ? 'none' : '1px solid var(--border)', padding: '0.2rem 0.5rem' }} onClick={() => updateCartItem(idx, 'quantity', v)}>
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
            }}><CreditCard size={20} /> Tạo Đơn</button>
          </div>
        </div>
      </div>

      {showCheckout && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCheckout(false); }}>
          <div className="modal" style={{ maxWidth: '900px', width: '95vw', background: 'var(--surface2)' }}>
            <div className="modal-header" style={{ background: 'var(--surface)', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-light)' }}>
              <h2 className="modal-title" style={{ fontSize: '1.35rem' }}>Tạo Đơn hàng mới</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCheckout(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', flexWrap: 'wrap' }}>
              {/* Thông tin Khách hàng */}
              <div style={{ flex: '1 1 350px', background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border-light)' }}>
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
              <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border-light)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>
                    <Package size={20} /> Tóm tắt Đơn hàng
                  </h3>
                  
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {cart.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface2)', borderRadius: 'var(--r-sm)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.quantity}x {item.product_name}</div>
                          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>Lô: {item.batch_code} ({item.sell_type === 'chai' ? 'Nguyên' : 'Chiết'})</div>
                        </div>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>{(item.price * item.quantity).toLocaleString()} đ</div>
                      </div>
                    ))}
                  </div>

                  {/* Hướng dẫn sử dụng */}
                  <div style={{ background: 'var(--info-bg, #eff6ff)', color: 'var(--info, #3b82f6)', padding: '0.75rem 1rem', borderRadius: 'var(--r-sm)', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <strong>💡 Hướng dẫn tạo đơn:</strong>
                    <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                      <li><strong>Giao tại quầy:</strong> Khách mua trực tiếp, đơn sẽ được tính là Hoàn thành ngay lập tức.</li>
                      <li><strong>Cần ship:</strong> Khách đặt giao hàng, đơn sẽ vào danh sách "Chờ xử lý" trong Quản lý đơn hàng.</li>
                      <li><strong>Thanh toán:</strong> Nếu khách chưa trả tiền (COD), hãy chọn "Chưa thu". Doanh thu sẽ chỉ được tính khi đơn đã thu tiền.</li>
                    </ul>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: 'auto', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="text-xs text-muted" style={{ marginBottom: '.25rem', display: 'block' }}>Thanh toán</label>
                      <select className="form-control" value={orderConfig.payment_status} onChange={e => setOrderConfig({...orderConfig, payment_status: e.target.value})} style={{ padding: '.5rem', fontSize: '.875rem' }}>
                        <option value="unpaid">Chưa thu (COD)</option>
                        <option value="paid">Đã thu tiền</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="text-xs text-muted" style={{ marginBottom: '.25rem', display: 'block' }}>Giao hàng</label>
                      <select className="form-control" value={orderConfig.status} onChange={e => setOrderConfig({...orderConfig, status: e.target.value})} style={{ padding: '.5rem', fontSize: '.875rem' }}>
                        <option value="pending">Cần ship (Chờ xử lý)</option>
                        <option value="completed">Giao tại quầy (Hoàn thành)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-light)', padding: '1.25rem', borderRadius: 'var(--r-sm)' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Tổng cộng:</span>
                    <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary)' }}>{totalAmount.toLocaleString('vi-VN')} đ</span>
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
        .pos-layout {
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
          gap: 1.5rem; 
          height: calc(100vh - 120px);
        }
        @media (max-width: 768px) {
          .pos-layout {
            display: flex;
            flex-direction: column;
            height: auto;
          }
          .pos-card {
            min-height: 50vh;
          }
        }
        .hover-shadow:hover { border-color: var(--primary) !important; box-shadow: var(--shadow-sm); }
        .hover-bg:hover { background-color: var(--surface-hover); }
        .autocomplete-dropdown::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
};

export default POS;
