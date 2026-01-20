import React, { useState, useRef, useEffect } from 'react';
import './ButtonSelect.scss';

const statusClass = (val) => {
  switch (val) {
    case 'pending': return 'pending';
    case 'accepted': return 'accepted';
    case 'awaiting_payment': return 'awaiting-payment';
    case 'paid': return 'paid';
    case 'in_progress': return 'in-progress';
    case 'shipped': return 'shipped';
    case 'delivered': return 'delivered';
    case 'cancelled': return 'cancelled';
    default: return '';
  }
};

export default function ButtonSelect({ value, options = [], onChange, ariaLabel = 'Status' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const current = options.find(o => o.value === value) || options[0] || { label: '', value: '' };

  return (
    <div className={`btn-select-root ${open ? 'open' : ''}`} ref={ref}>
      <button
        className={`btn-select-toggle ${statusClass(current.value)}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <span className="btn-select-label">{current.label}</span>
        <span className="btn-select-caret">▾</span>
      </button>

      {open && (
        <ul className="btn-select-menu" role="listbox">
          {options.map(opt => (
            <li key={opt.value} role="option" aria-selected={value === opt.value}>
              <button
                type="button"
                className={`btn-select-item ${statusClass(opt.value)}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
