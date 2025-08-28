import React, { useState } from 'react';
import { TargetScope, AddLogFn } from '../types';
import { discoverWebSocketUrl } from '../services/securityTests';

interface TargetScopeEditorProps {
    onScopeSet: (scope: TargetScope) => void;
    disabled: boolean;
    addLog: AddLogFn;
}

export const TargetScopeEditor: React.FC<TargetScopeEditorProps> = ({ onScopeSet, disabled, addLog }) => {
    const [baseUrl, setBaseUrl] = useState('https://casino.example.com/api/search');
    const [websocketUrl, setWebsocketUrl] = useState('wss://casino.example.com/socket');
    const [injectionParameter, setInjectionParameter] = useState('q');
    const [isLocked, setIsLocked] = useState(false);
    const [isDiscovering, setIsDiscovering] = useState(false);

    const handleSetScope = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            new URL(baseUrl);
            if(websocketUrl) new URL(websocketUrl);
        } catch (error) {
            alert('Invalid URL format. Please check your inputs.');
            return;
        }

        onScopeSet({ baseUrl, websocketUrl, injectionParameter });
        setIsLocked(true);
    };

    const handleEdit = () => {
        setIsLocked(false);
    }

    const handleDiscover = async () => {
        setIsDiscovering(true);
        const controller = new AbortController();
        const foundUrl = await discoverWebSocketUrl(baseUrl, addLog, controller.signal);
        if (foundUrl) {
            setWebsocketUrl(foundUrl);
        } else {
            addLog('[ERROR] Automatic discovery failed. Please enter the WebSocket URL manually.', 'SYSTEM');
        }
        setIsDiscovering(false);
    };
    
    return (
        <div className="p-4 border border-yellow-600 rounded-lg bg-yellow-900/10 space-y-4">
            <h2 className="text-lg font-bold text-yellow-400">Target Scope</h2>
            <form onSubmit={handleSetScope} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="baseUrl" className="block text-sm font-medium text-yellow-200 mb-1">Target URL (for API & Injection)</label>
                        <input
                            type="text"
                            id="baseUrl"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://casino.example.com/api/search"
                            disabled={isLocked || disabled}
                            className="w-full bg-black/50 border border-yellow-700 rounded-md px-3 py-2 text-green-300 focus:ring-2 focus:ring-yellow-400 focus:outline-none disabled:opacity-60"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="injectionParameter" className="block text-sm font-medium text-yellow-200 mb-1">Injection Parameter Name</label>
                        <input
                            type="text"
                            id="injectionParameter"
                            value={injectionParameter}
                            onChange={(e) => setInjectionParameter(e.target.value)}
                            placeholder="e.g., id, q, category"
                            disabled={isLocked || disabled}
                            className="w-full bg-black/50 border border-yellow-700 rounded-md px-3 py-2 text-green-300 focus:ring-2 focus:ring-yellow-400 focus:outline-none disabled:opacity-60"
                            required
                        />
                    </div>
                </div>
                 <div>
                    <label htmlFor="websocketUrl" className="block text-sm font-medium text-yellow-200 mb-1">WebSocket URL</label>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            id="websocketUrl"
                            value={websocketUrl}
                            onChange={(e) => setWebsocketUrl(e.target.value)}
                            placeholder="wss://casino.example.com/socket"
                            disabled={isLocked || disabled || isDiscovering}
                            className="w-full bg-black/50 border border-yellow-700 rounded-md px-3 py-2 text-green-300 focus:ring-2 focus:ring-yellow-400 focus:outline-none disabled:opacity-60"
                        />
                        <button type="button" onClick={handleDiscover} disabled={isLocked || disabled || isDiscovering} className="px-4 py-2 border border-purple-500 text-purple-400 rounded-md font-bold text-sm transition hover:bg-purple-500/10 active:bg-purple-500/20 disabled:opacity-50 whitespace-nowrap">
                            {isDiscovering ? '...' : 'Discover'}
                        </button>
                    </div>
                </div>
                <div className="flex justify-end">
                    {isLocked ? (
                        <button type="button" onClick={handleEdit} disabled={disabled} className="px-4 py-2 border border-yellow-500 text-yellow-500 rounded-md font-bold transition hover:bg-yellow-500/10 active:bg-yellow-500/20 disabled:opacity-50 w-full sm:w-auto">
                            Edit Scope
                        </button>
                    ) : (
                        <button type="submit" disabled={disabled} className="px-4 py-2 bg-yellow-600 text-black rounded-md font-bold transition hover:bg-yellow-500 disabled:opacity-50 w-full sm:w-auto">
                            Set Target
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};