import React from 'react';
import './Logo.scss';

const Logo = ({ size = 40 }) => {
  const s = typeof size === 'number' ? `${size}px` : size;
  return (
    <div className="bkh-logo" style={{ width: s, height: s }} aria-hidden="true">
      <img src="/favicon.svg" alt="BKH" style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
};

export default Logo;
