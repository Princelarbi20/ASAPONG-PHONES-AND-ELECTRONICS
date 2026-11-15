import React from 'react';
import { NavLink } from 'react-router-dom';
import shopLogo from '../assets/phoneLogo.png';

export const Logo = ({ size = 'md' }) => {
  // Mapping sizes using a mix of fluid widths/heights and max-height limits
  const sizeMap = {
    sm: 'h-8 sm:h-10 w-auto',
    md: 'h-10 sm:h-12 md:h-14 lg:h-16 w-auto', 
    lg: 'h-14 sm:h-20 md:h-24 lg:h-28 w-auto',
  };

  const classes = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex w-full items-center justify-center p-2 sm:justify-start">
      <NavLink
        to="/"
        aria-label="Go to home"
        className="inline-flex overflow-hidden rounded-lg transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <img
          src={shopLogo}
          alt="Our Shop Logo"
          // Removed conflicting 'h-auto' so the sizeMap heights can take effect properly
          className={`block object-contain max-w-full transition-all duration-300 ${classes}`}
        />
      </NavLink>
    </div>
  );
};

export default Logo;