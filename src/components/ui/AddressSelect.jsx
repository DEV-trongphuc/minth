import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ChevronRight, Check, Loader2 } from 'lucide-react';

export default function AddressSelect({ value, onChange, placeholder = "Chọn địa chỉ giao hàng..." }) {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1); // 1: City, 2: District, 3: Ward, 4: Specific
  const [selections, setSelections] = useState({ city: null, district: null, ward: null, specific: '' });
  
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showModal && cities.length === 0) {
      setLoading(true);
      fetch('https://provinces.open-api.vn/api/p/')
        .then(r => r.json())
        .then(d => { setCities(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [showModal]);

  const selectCity = (city) => {
    setSelections({ ...selections, city, district: null, ward: null });
    setStep(2);
    setLoading(true);
    fetch(`https://provinces.open-api.vn/api/p/${city.code}?depth=2`)
      .then(r => r.json())
      .then(d => { setDistricts(d.districts || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const selectDistrict = (district) => {
    setSelections({ ...selections, district, ward: null });
    setStep(3);
    setLoading(true);
    fetch(`https://provinces.open-api.vn/api/d/${district.code}?depth=2`)
      .then(r => r.json())
      .then(d => { setWards(d.wards || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const handleOpen = () => {
    setStep(1);
    setShowModal(true);
  };

  const handleComplete = () => {
    const fullAddress = `${selections.specific ? selections.specific + ', ' : ''}${selections.ward?.name || ''}, ${selections.district?.name || ''}, ${selections.city?.name || ''}`.replace(/^, | ,/g, '');
    onChange(fullAddress);
    setShowModal(false);
  };

  return (
    <>
      <div 
        className="form-control" 
        onClick={handleOpen}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: value ? 'var(--surface)' : 'var(--surface2)' }}
      >
        <MapPin size={16} color={value ? 'var(--primary)' : 'var(--text-muted)'} />
        <span style={{ color: value ? 'var(--text)' : 'var(--text-light)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value || placeholder}
        </span>
      </div>

      {showModal && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal" style={{ width: '400px', height: '550px', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div>
                <h2 className="modal-title">Chọn địa chỉ</h2>
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: step >= 1 ? 700 : 400, color: step >= 1 ? 'var(--primary)' : '', cursor: 'pointer' }} onClick={() => setStep(1)}>Tỉnh/Thành</span>
                  <ChevronRight size={12} />
                  <span style={{ fontWeight: step >= 2 ? 700 : 400, color: step >= 2 ? 'var(--primary)' : '', cursor: step >= 2 ? 'pointer' : 'default' }} onClick={() => step >= 2 && setStep(2)}>Quận/Huyện</span>
                  <ChevronRight size={12} />
                  <span style={{ fontWeight: step >= 3 ? 700 : 400, color: step >= 3 ? 'var(--primary)' : '', cursor: step >= 3 ? 'pointer' : 'default' }} onClick={() => step >= 3 && setStep(3)}>Phường/Xã</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '0', position: 'relative' }}>
              {loading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <Loader2 className="animate-spin" color="var(--primary)" size={24} />
                </div>
              )}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {cities.map(c => (
                    <div key={c.code} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                         className="hover-bg" onClick={() => selectCity(c)}>
                      <span>{c.name}</span>
                      {selections.city?.code === c.code && <Check size={16} color="var(--primary)" />}
                    </div>
                  ))}
                </div>
              )}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {districts.map(d => (
                    <div key={d.code} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                         className="hover-bg" onClick={() => selectDistrict(d)}>
                      <span>{d.name}</span>
                      {selections.district?.code === d.code && <Check size={16} color="var(--primary)" />}
                    </div>
                  ))}
                  {!loading && districts.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu quận/huyện</div>}
                </div>
              )}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {wards.map(w => (
                    <div key={w.code} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                         className="hover-bg" onClick={() => { setSelections({ ...selections, ward: w }); setStep(4); }}>
                      <span>{w.name}</span>
                      {selections.ward?.code === w.code && <Check size={16} color="var(--primary)" />}
                    </div>
                  ))}
                  {!loading && wards.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                      <p className="text-muted mb-3">Không có dữ liệu phường/xã.</p>
                      <button className="btn btn-primary" onClick={() => setStep(4)}>Nhập địa chỉ cụ thể ngay</button>
                    </div>
                  )}
                </div>
              )}
              {step === 4 && (
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: 'var(--r-sm)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    <strong>Đã chọn: </strong> 
                    {[selections.ward?.name, selections.district?.name, selections.city?.name].filter(Boolean).join(', ')}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số nhà, Tên đường</label>
                    <input 
                      type="text" className="form-control" placeholder="VD: 123 Đường Lê Lợi..." 
                      value={selections.specific} onChange={e => setSelections({ ...selections, specific: e.target.value })} 
                      autoFocus
                    />
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleComplete}>Xác nhận & Lưu địa chỉ</button>
                </div>
              )}
            </div>
            
            {step > 1 && (
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Quay lại</button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      <style>{`
        .hover-bg:hover { background-color: var(--surface2); }
      `}</style>
    </>
  );
}
