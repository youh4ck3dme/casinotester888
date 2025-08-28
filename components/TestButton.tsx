import React from 'react';

interface TestButtonProps {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  color?: 'green' | 'yellow' | 'red';
  className?: string;
  isLoading?: boolean;
}

const TestButton: React.FC<TestButtonProps> = ({ onClick, disabled, children, color = 'green', className = '', isLoading = false }) => {
  const colorClasses = {
    green: 'border-green-500 text-green-500 hover:bg-green-500/10 active:bg-green-500/20',
    yellow: 'border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 active:bg-yellow-400/20',
    red: 'border-red-500 text-red-500 hover:bg-red-500/10 active:bg-red-500/20',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        px-4 py-2 border rounded-md font-bold transition-all duration-200 flex items-center justify-center
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black 
        disabled:opacity-40 disabled:cursor-not-allowed
        ${colorClasses[color]} 
        ${className}
      `}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};

export default TestButton;
