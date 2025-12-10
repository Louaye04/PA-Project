import React from 'react';
import './Logo.scss';

const Logo = ({ size = 40 }) => {
  const s = typeof size === 'number' ? `${size}px` : size;

  return (
    <div className="bkh-logo" style={{ width: s, height: s }}>
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Background circle */}
        <circle cx="100" cy="100" r="95" fill="url(#grad1)" />

        {/* Gradient definitions */}
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b35" />
            <stop offset="100%" stopColor="#ff8a5b" />
          </linearGradient>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f5f5f5" />
          </linearGradient>
        </defs>

        {/* Modern swoosh-like shape */}
        <path
          d="M 60 80 Q 100 60, 130 85 Q 140 95, 130 105 Q 100 120, 60 110 Z"
          fill="url(#grad2)"
          opacity="0.95"
        />

        {/* Modern letter design - stylized "S" */}
        <path
          d="M 70 75 Q 80 70, 90 75 L 85 90 Q 75 88, 70 85 Z"
          fill="#ffffff"
          opacity="0.9"
        />

        {/* Accent lines for modern look */}
        <line x1="50" y1="100" x2="70" y2="100" stroke="#ffffff" strokeWidth="3" opacity="0.8" />
        <line x1="130" y1="100" x2="150" y2="100" stroke="#ffffff" strokeWidth="3" opacity="0.8" />
      </svg>
    </div>
  );
};

export default Logo;
