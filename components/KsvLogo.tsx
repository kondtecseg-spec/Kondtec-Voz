import React from 'react';

export const KsvLogo: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Background: Blue Rounded Square */}
    <rect width="100" height="100" rx="18" fill="#1d72b8" />
    
    <g transform="translate(50, 42)" fill="white">
      {/* Mic Body */}
      <path d="M-9 -18 C-9 -23, -5 -27, 0 -27 C5 -27, 9 -23, 9 -18 V2 C9 7, 5 11, 0 11 C-5 11, -9 7, -9 2 Z" />
      <path d="M-1.5 11 V18 M-6 18 H6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      
      {/* Mic Cup/Holder (The U shape) */}
      <path d="M-13 0 V2 A13 13 0 0 0 13 2 V0" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />

      {/* Sound Waves (Curves) */}
      {/* Left */}
      <path d="M-20 -10 A 20 20 0 0 0 -20 10" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M-26 -15 A 28 28 0 0 0 -26 15" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      
      {/* Right */}
      <path d="M20 -10 A 20 20 0 0 1 20 10" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 -15 A 28 28 0 0 1 26 15" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </g>

    {/* Text KSV */}
    <text x="50" y="85" textAnchor="middle" fill="white" fontSize="22" fontFamily="Arial, sans-serif" fontWeight="900" letterSpacing="1">KSV</text>
  </svg>
);

export default KsvLogo;