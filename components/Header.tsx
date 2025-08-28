
import React from 'react';
import { ASCII_LOGO, APP_MOTTO } from '../constants';

const Header: React.FC = () => {
  return (
    <header className="text-center mb-8">
      <pre className="text-yellow-400 text-xs sm:text-sm md:text-base leading-tight">
        {ASCII_LOGO}
      </pre>
      <p className="text-green-500 mt-2 text-sm md:text-base animate-pulse">{APP_MOTTO}</p>
    </header>
  );
};

export default Header;
