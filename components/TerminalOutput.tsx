import React, { useEffect, useRef } from 'react';
import { ReportEntry } from '../types';

interface TerminalOutputProps {
  logs: ReportEntry[];
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({ logs }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogStyle = (log: ReportEntry) => {
    const output = log.output.toUpperCase();
    if (output.startsWith('[ERROR]')) return { icon: '✖', color: 'text-red-400', bg: 'bg-red-900/20' };
    if (output.startsWith('[SUCCESS]')) return { icon: '✔', color: 'text-yellow-400', bg: 'bg-yellow-900/20' };
    if (output.startsWith('[WARN]')) return { icon: '⚠', color: 'text-orange-400', bg: 'bg-orange-900/20' };
    if (output.startsWith('[INFO]')) return { icon: 'ℹ', color: 'text-blue-400', bg: 'bg-blue-900/20' };
    return { icon: '»', color: 'text-green-400', bg: '' };
  };

  const renderLogLine = (log: ReportEntry, index: number) => {
    const { icon, color, bg } = getLogStyle(log);
    return (
      <div key={index} className={`flex items-start p-1 -mx-1 rounded ${bg}`}>
        <span className="text-gray-600 mr-3 select-none font-sans">{new Date(log.timestamp).toLocaleTimeString()}</span>
        <span className={`mr-2 font-bold ${color}`}>{icon}</span>
        <span className={`${color} flex-1 whitespace-pre-wrap break-all`}>{log.output}</span>
      </div>
    );
  };

  return (
    <div className="w-full h-96 bg-gray-900/70 border border-green-700 rounded-lg p-3 overflow-y-auto text-sm shadow-inner shadow-green-900/50 font-mono">
      {logs.map(renderLogLine)}
      <div ref={terminalEndRef} />
    </div>
  );
};

export default TerminalOutput;
