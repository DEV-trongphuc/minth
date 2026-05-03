import React, { createContext, useContext, useState, useCallback } from 'react';

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
  const [dialogs, setDialogs] = useState([]);

  const showConfirm = useCallback((title, message, onConfirm, type = 'warning') => {
    const id = Date.now();
    setDialogs(prev => [...prev, { id, type: 'confirm', title, message, onConfirm, uiType: type }]);
  }, []);

  const showAlert = useCallback((title, message, type = 'info') => {
    const id = Date.now();
    setDialogs(prev => [...prev, { id, type: 'alert', title, message, uiType: type }]);
  }, []);

  const closeDialog = (id) => {
    setDialogs(prev => prev.filter(d => d.id !== id));
  };

  return (
    <DialogContext.Provider value={{ showConfirm, showAlert }}>
      {children}
      {dialogs.map(dialog => (
        <div key={dialog.id} className="custom-dialog-overlay animate-fade-in" onClick={() => closeDialog(dialog.id)}>
          <div className="custom-dialog animate-pop" onClick={e => e.stopPropagation()}>
            <div className={`dialog-icon ${dialog.uiType}`}>
              {dialog.uiType === 'warning' && '⚠️'}
              {dialog.uiType === 'danger' && '🛑'}
              {dialog.uiType === 'success' && '✅'}
              {dialog.uiType === 'info' && 'ℹ️'}
            </div>
            <h3 className="dialog-title">{dialog.title}</h3>
            <div className="dialog-message">{dialog.message}</div>
            <div className="dialog-actions">
              {dialog.type === 'confirm' && (
                <button className="btn btn-secondary" onClick={() => closeDialog(dialog.id)}>Hủy</button>
              )}
              <button 
                className={`btn btn-${dialog.uiType === 'danger' ? 'danger' : 'primary'}`} 
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  closeDialog(dialog.id);
                }}
              >
                {dialog.type === 'confirm' ? 'Đồng ý' : 'Đóng'}
              </button>
            </div>
          </div>
        </div>
      ))}
      <style>{`
        .custom-dialog-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px);
          z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;
        }
        .custom-dialog {
          background: var(--surface); border-radius: var(--r-lg); width: 100%; max-width: 400px;
          padding: 2rem; box-shadow: var(--shadow-lg); text-align: center;
        }
        .dialog-icon { font-size: 3rem; margin-bottom: 1rem; }
        .dialog-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text); }
        .dialog-message { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; }
        .dialog-actions { display: flex; gap: 1rem; justify-content: center; }
        .dialog-actions .btn { min-width: 120px; }
        .animate-pop { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </DialogContext.Provider>
  );
};
