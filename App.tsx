
import React from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';

const App: React.FC = () => {

  return (
    <div className="min-h-screen bg-black font-mono flex flex-col items-center p-4 selection:bg-green-500 selection:text-black">
      <div 
        className="w-full max-w-7xl mx-auto"
      >
        <Header />
        <main>
          <Dashboard />
        </main>
        <footer className="text-center text-xs text-gray-600 mt-8 pb-4">
          <p>Casino Tester 888 by Jakub Varga (@jakubvarga)</p>
          <p className="text-yellow-500 mt-1">Disclaimer: Use this tool responsibly and only on systems you have explicit permission to test.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;