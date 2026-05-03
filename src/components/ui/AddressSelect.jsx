import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ChevronRight, Check, Search } from 'lucide-react';
import cityData from '../../assets/ctiy.json';

export default function AddressSelect({ value, onChange, placeholder = "Chọn địa chỉ giao hàng..." }) {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1); // 1: City, 2: Ward, 3: Specific
  const [selections, setSelections] = useState({ city: null, ward: null, specific: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const cities = cityData.cities || [];
  const wardsData = cityData.wards || [];
  const [wards, setWards] = useState([]);

  const getCleanCityName = (name) => {
    const match = name.match(/\[(.*?)\]/);
    return match ? match[1] : name;
  };

  const selectCity = (city) => {
    setSelections({ ...selections, city, ward: null });
    setStep(2);
    setSearchQuery('');
    const cleanName = getCleanCityName(city.name);
    const filteredWards = wardsData.filter(w => w.city === cleanName);
    setWards(filteredWards);
  };

  const selectWard = (ward) => {
    setSelections({ ...selections, ward });
    setStep(3);
    setSearchQuery('');
  };

  const handleOpen = () => {
    setStep(1);
    setSearchQuery('');
    setShowModal(true);
  };

  const handleComplete = () => {
    const fullAddress = `${selections.specific ? selections.specific + ', ' : ''}${selections.ward?.wnew ? selections.ward.wnew + ', ' : ''}${getCleanCityName(selections.city?.name || '')}`.replace(/^, | ,/g, '');
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
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }} style={{ zIndex: 1060 }}>
          <div className="modal" style={{ width: '400px', height: '550px', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div>
                <h2 className="modal-title">Chọn địa chỉ</h2>
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: step >= 1 ? 700 : 400, color: step >= 1 ? 'var(--primary)' : '', cursor: 'pointer' }} onClick={() => { setStep(1); setSearchQuery(''); }}>Tỉnh/Thành</span>
                  <ChevronRight size={12} />
                  <span style={{ fontWeight: step >= 2 ? 700 : 400, color: step >= 2 ? 'var(--primary)' : '', cursor: step >= 2 ? 'pointer' : 'default' }} onClick={() => { if (step >= 2) { setStep(2); setSearchQuery(''); } }}>Huyện/Xã</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0', position: 'relative' }}>
              {step < 3 && (
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)', flexShrink: 0, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Tìm nhanh..." 
                      style={{ paddingLeft: '2.2rem', paddingRight: '0.5rem', paddingTop: '0.6rem', paddingBottom: '0.6rem', width: '100%', fontSize: '0.9rem' }} 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)} 
                    />
                  </div>
                </div>
              )}
              <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {cities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
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
                  {wards.filter(w => w.wnew.toLowerCase().includes(searchQuery.toLowerCase()) || w.wold.toLowerCase().includes(searchQuery.toLowerCase())).map((w, idx) => (
                    <div key={idx} style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                         className="hover-bg" onClick={() => selectWard(w)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{w.wnew}</span>
                        {selections.ward?.wnew === w.wnew && <Check size={16} color="var(--primary)" />}
                      </div>
                      <div className="text-xs text-muted">Gồm: {w.wold}</div>
                    </div>
                  ))}
                  {wards.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                      <p className="text-muted mb-3">Không có dữ liệu.</p>
                      <button className="btn btn-primary" onClick={() => {setStep(3); setSearchQuery('');}}>Nhập địa chỉ cụ thể ngay</button>
                    </div>
                  )}
                </div>
              )}
              </div>
              {step === 3 && (
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: 'var(--r-sm)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    <strong>Đã chọn: </strong> 
                    {[selections.ward?.wnew, getCleanCityName(selections.city?.name || '')].filter(Boolean).join(', ')}
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
