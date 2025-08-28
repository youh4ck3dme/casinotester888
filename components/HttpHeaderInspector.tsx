import React, { useState } from 'react';
import { inspectHttpHeaders } from '../services/securityTests';
import { HeaderResult, SecurityHeaderAnalysis } from '../types';

export const HttpHeaderInspector: React.FC = () => {
    const [targetUrl, setTargetUrl] = useState('https://google.com');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<{ rawHeaders: HeaderResult[], analysis: SecurityHeaderAnalysis[] } | null>(null);
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    const handleInspect = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setResults(null);
        setIsLoading(true);

        const controller = new AbortController();
        setAbortController(controller);

        try {
            const fetchedResults = await inspectHttpHeaders(targetUrl, controller.signal);
            setResults(fetchedResults);
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
            setAbortController(null);
        }
    };
    
    const getStatusColor = (status: SecurityHeaderAnalysis['status']) => {
        switch (status) {
            case 'present': return 'text-green-400';
            case 'missing': return 'text-red-400';
            case 'warning': return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="p-4 border border-blue-700 rounded-lg bg-gray-900/40 space-y-4 h-full flex flex-col">
            <h2 className="text-lg font-bold text-blue-400">HTTP Headers Inspector</h2>
            <form onSubmit={handleInspect} className="flex space-x-2">
                <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com"
                    disabled={isLoading}
                    className="w-full bg-black/50 border border-blue-700 rounded-md px-3 py-2 text-green-300 focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:opacity-60"
                    required
                />
                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md font-bold transition hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap">
                    {isLoading ? '...' : 'Inspect'}
                </button>
                 {isLoading && (
                    <button type="button" onClick={() => abortController?.abort()} className="px-4 py-2 bg-red-600 text-white rounded-md font-bold transition hover:bg-red-500">
                        Cancel
                    </button>
                )}
            </form>
            
            <div className="overflow-y-auto flex-grow">
                {error && <p className="text-red-400 bg-red-900/30 p-2 rounded">Error: {error}</p>}
                {results && (
                    <div className="space-y-4 text-xs">
                        <div>
                            <h3 className="font-bold text-blue-300 mb-2">Security Analysis</h3>
                            <div className="space-y-1">
                                {results.analysis.map(item => (
                                    <div key={item.name} className={`p-2 rounded ${item.status === 'missing' ? 'bg-red-900/20' : 'bg-green-900/10'}`}>
                                        <p className="font-bold"><span className={getStatusColor(item.status)}>●</span> {item.name}</p>
                                        <p className="pl-4 text-gray-400">{item.description}</p>
                                        <p className="pl-4 text-gray-300 font-mono">Value: {item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div>
                            <h3 className="font-bold text-blue-300 mb-2 mt-4">Raw Headers</h3>
                             <table className="w-full font-mono text-left">
                                <thead>
                                    <tr className="border-b border-blue-800">
                                        <th className="py-1">Header</th>
                                        <th className="py-1">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.rawHeaders.map((header, i) => (
                                        <tr key={i} className="border-b border-gray-800">
                                            <td className="py-1 pr-2 align-top text-blue-400 break-all">{header.name}</td>
                                            <td className="py-1 text-gray-300 break-all">{header.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
