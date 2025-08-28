import React, { useState, useMemo } from 'react';

interface DecodedJwt {
    header: object;
    payload: object;
    signature: string;
    isExpired: boolean;
    expiresAt?: string;
    issuedAt?: string;
}

export const JwtAnalyzer: React.FC = () => {
    const [jwt, setJwt] = useState('');
    
    const decodedToken: DecodedJwt | null = useMemo(() => {
        if (!jwt.trim()) return null;
        try {
            const parts = jwt.split('.');
            if (parts.length !== 3) throw new Error('Invalid JWT structure');

            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));
            const signature = parts[2];
            
            let isExpired = false;
            let expiresAt, issuedAt;

            if (payload.exp) {
                const expirationDate = new Date(payload.exp * 1000);
                isExpired = expirationDate < new Date();
                expiresAt = expirationDate.toLocaleString();
            }

            if(payload.iat) {
                issuedAt = new Date(payload.iat * 1000).toLocaleString();
            }

            return { header, payload, signature, isExpired, expiresAt, issuedAt };
        } catch (error) {
            return null; // Invalid token format
        }
    }, [jwt]);

    return (
        <div className="p-4 border border-purple-700 rounded-lg bg-gray-900/40 space-y-4 h-full flex flex-col">
            <h2 className="text-lg font-bold text-purple-400">JWT Analyzer</h2>
            <textarea
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
                placeholder="Paste your JSON Web Token here..."
                className="w-full h-24 bg-black/50 border border-purple-700 rounded-md px-3 py-2 text-green-300 focus:ring-2 focus:ring-purple-400 focus:outline-none resize-none font-mono text-xs"
            />
            <div className="overflow-y-auto flex-grow text-xs">
                {decodedToken ? (
                    <div className="space-y-4">
                        <div className="p-2 rounded bg-green-900/20">
                           <p className="font-bold text-green-300">Token Status: 
                                <span className={decodedToken.isExpired ? 'text-red-400' : 'text-yellow-400'}>
                                    {decodedToken.isExpired ? ' EXPIRED' : ' VALID'}
                                </span>
                           </p>
                           {decodedToken.expiresAt && <p className="text-gray-400">Expires at: {decodedToken.expiresAt}</p>}
                           {decodedToken.issuedAt && <p className="text-gray-400">Issued at: {decodedToken.issuedAt}</p>}
                        </div>
                        <div>
                            <h3 className="font-bold text-purple-300 mb-1">Header</h3>
                            <pre className="p-2 bg-black/50 rounded overflow-x-auto text-gray-300">{JSON.stringify(decodedToken.header, null, 2)}</pre>
                        </div>
                        <div>
                            <h3 className="font-bold text-purple-300 mb-1">Payload</h3>
                            <pre className="p-2 bg-black/50 rounded overflow-x-auto text-gray-300">{JSON.stringify(decodedToken.payload, null, 2)}</pre>
                        </div>
                        <div>
                            <h3 className="font-bold text-purple-300 mb-1">Signature</h3>
                            <p className="p-2 bg-black/50 rounded break-all text-gray-400">{decodedToken.signature}</p>
                        </div>
                    </div>
                ) : (
                    jwt.trim() && <p className="text-red-400">Invalid JWT format.</p>
                )}
            </div>
        </div>
    );
};