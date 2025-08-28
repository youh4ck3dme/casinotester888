import { AddLogFn, TestId, TargetScope, HeaderResult, SecurityHeaderAnalysis } from '../types';

const log = (addLog: AddLogFn, testId: TestId | 'SYSTEM') => (message: string) => addLog(message, testId);

// Helper to check for abort signal
const checkAborted = (signal: AbortSignal) => {
  if (signal.aborted) {
    throw new DOMException('Test aborted by user', 'AbortError');
  }
};

export const checkIpAddress = async (addLog: AddLogFn, scope: TargetScope, signal: AbortSignal) => {
  const logger = log(addLog, TestId.IP_CHECK);
  logger('Fetching public IP address...');
  checkAborted(signal);
  try {
    const res = await fetch('https://api64.ipify.org?format=json', { signal });
    if (!res.ok) throw new Error(`API returned status: ${res.status}`);
    const data = await res.json();
    logger(`Public IP Address: ${data.ip}`);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    const msg = e instanceof Error ? e.message : String(e);
    logger(`[ERROR] Could not fetch IP address: ${msg}`);
  }
};

export const testApiAccess = async (addLog: AddLogFn, scope: TargetScope, signal: AbortSignal) => {
  const logger = log(addLog, TestId.API_ACCESS);
  const targetUrl = `${scope.baseUrl.replace(/\/$/, '')}/api/game/results`;
  logger(`Attempting unauthorized access to: ${targetUrl}`);
  checkAborted(signal);
  try {
    const res = await fetch(targetUrl, { signal });
    logger(`Received HTTP Status: ${res.status}`);
    if (res.status === 200) {
      logger('[WARN] VULNERABILITY DETECTED: Unauthorized access was successful (HTTP 200).');
      try {
        const data = await res.json();
        logger(`Response JSON (first 200 chars): ${JSON.stringify(data).substring(0, 200)}...`);
      } catch {
        logger('Response was not valid JSON.');
      }
    } else if (res.status === 401 || res.status === 403) {
      logger('[SUCCESS] API correctly denied access (HTTP 401/403). This is secure.');
    } else {
      logger(`[INFO] Received an unexpected status code. Further investigation may be needed.`);
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    const msg = e instanceof Error ? e.message : String(e);
    logger(`[ERROR] Network error during API test: ${msg}`);
  }
};

export const testRng = async (addLog: AddLogFn) => {
  const logger = log(addLog, TestId.RNG);
  const iterations = 10000;
  logger(`Generating ${iterations} random numbers to check for predictability...`);
  const values = new Set<string>();
  let duplicates = 0;
  for (let i = 0; i < iterations; i++) {
    const val = Math.random().toString().substring(2, 10);
    if (values.has(val)) {
      duplicates++;
    }
    values.add(val);
  }
  logger(`Found ${duplicates} duplicates in ${iterations} iterations.`);
  if (duplicates > 2) { // Allow for a small number of random collisions
    logger(`[WARN] ${duplicates} duplicates found. This could indicate a weak or predictable RNG.`);
  } else {
    logger('[SUCCESS] No significant duplicates found. RNG appears to have sufficient entropy for this simple test.');
  }
};

export const checkFingerprint = async (addLog: AddLogFn) => {
  const logger = log(addLog, TestId.FINGERPRINT);
  logger('Checking browser fingerprinting vectors...');
  logger(`User Agent: ${navigator.userAgent}`);
  
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.fillText('CasinoTester888, (c) 2024', 2, 2);
      const dataUrl = canvas.toDataURL();
      logger(`Canvas Fingerprint Hash (first 64 chars): ${dataUrl.substring(0,64)}...`);
    } else {
      logger('[WARN] Could not get 2D context for canvas.');
    }
  } catch (e) {
    logger('[ERROR] Canvas fingerprinting failed.');
  }

  logger(`WebRTC available: ${!!window.RTCPeerConnection}`);
  logger('Note: User agent spoofing must be done manually via browser extensions or developer tools.');
};

export const interceptWebSocket = (addLog: AddLogFn, scope: TargetScope, signal: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
        const logger = log(addLog, TestId.WEBSOCKET);
        const wsUrl = scope.websocketUrl;
        if (!wsUrl) {
            logger('[ERROR] WebSocket URL is not set in the target scope.');
            resolve();
            return;
        }

        checkAborted(signal);

        try {
            logger(`Attempting to connect to ${wsUrl}...`);
            const ws = new WebSocket(wsUrl);
            
            const cleanup = () => {
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
                clearTimeout(timeout);
                signal.removeEventListener('abort', abortHandler);
            };

            const abortHandler = () => {
                cleanup();
                if(ws.readyState < 2) ws.close(); // 0=CONNECTING, 1=OPEN
                reject(new DOMException('Test aborted by user', 'AbortError'));
            };
            signal.addEventListener('abort', abortHandler, { once: true });
            
            const timeout = setTimeout(() => {
                cleanup();
                ws.close();
                reject(new Error('Connection timed out after 15 seconds.'));
            }, 15000);

            ws.onopen = () => {
                clearTimeout(timeout);
                logger('[SUCCESS] WebSocket connection established.');
                logger('Sending test message...');
                ws.send('CasinoTester888 WebSocket Test');
            };

            ws.onmessage = (event) => {
                logger(`Received message: ${event.data}`);
                ws.close();
            };

            ws.onclose = () => {
                cleanup();
                logger('[INFO] WebSocket connection closed.');
                resolve();
            };

            ws.onerror = () => {
                cleanup();
                logger(`[ERROR] WebSocket error occurred.`);
                reject(new Error('WebSocket connection failed'));
            };
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logger(`[ERROR] Failed to create WebSocket: ${msg}`);
            reject(e);
        }
    });
};

interface InjectionPayload {
    name: string;
    type: 'error' | 'time' | 'boolean';
    // For boolean, value is TRUE condition. For others, it's the only payload.
    value: string;
    // For boolean, falseValue is FALSE condition.
    falseValue?: string;
    // For time-based, in seconds
    sleepTime?: number;
}

export const testSqlInjection = async (addLog: AddLogFn, scope: TargetScope, signal: AbortSignal) => {
    const logger = log(addLog, TestId.INJECTION);
    if (!scope.baseUrl || !scope.injectionParameter) {
        logger('[ERROR] Target URL or Injection Parameter is not set. Cannot perform test.');
        return;
    }
    
    const buildUrl = (payload: string) => {
        const url = new URL(scope.baseUrl);
        url.searchParams.set(scope.injectionParameter, payload);
        return url.toString();
    }

    logger(`Targeting URL: ${scope.baseUrl} with parameter '${scope.injectionParameter}'`);

    const payloads: InjectionPayload[] = [
        // Error-based
        { name: 'Classic Error', type: 'error', value: "'"},
        { name: 'Numeric Error', type: 'error', value: "1 OR 1=1"},
        // Boolean-based
        { name: 'Boolean Logic (AND)', type: 'boolean', value: "' AND '1'='1", falseValue: "' AND '1'='2" },
        // Time-based
        { name: 'Time-Based MySQL (5s)', type: 'time', value: "' AND SLEEP(5)--", sleepTime: 5 },
        { name: 'Time-Based PostgreSQL (5s)', type: 'time', value: "'||pg_sleep(5)--", sleepTime: 5 },
        { name: 'Time-Based MSSQL (5s)', type: 'time', value: "'; WAITFOR DELAY '0:0:5'--", sleepTime: 5 },
    ];
    
    let vulnerabilitiesFound = 0;
    const sqlErrorStrings = ['syntax error', 'sql error', 'mysql', 'unclosed quotation mark', 'invalid input', 'ora-'];

    // Establish a baseline for boolean and time-based attacks
    logger('[INFO] Establishing baseline response...');
    const baselineStartTime = Date.now();
    const baselineResponse = await fetch(buildUrl(`baselineTest${Math.random()}`), { signal });
    const baselineDuration = Date.now() - baselineStartTime;
    const baselineContentLength = (await baselineResponse.text()).length;
    logger(`[INFO] Baseline established: ${baselineDuration}ms, ${baselineContentLength} bytes.`);

    for (const payload of payloads) {
        checkAborted(signal);
        logger(`\n[INFO] Testing Payload: [${payload.name}]...`);
        
        try {
            if (payload.type === 'error') {
                const res = await fetch(buildUrl(payload.value), { signal });
                const text = await res.text();
                const foundError = sqlErrorStrings.some(err => text.toLowerCase().includes(err));
                if (foundError) {
                    vulnerabilitiesFound++;
                    logger(`  -> [WARN] VULNERABILITY DETECTED: Response for payload '${payload.value}' contains common SQL error strings.`);
                } else {
                    logger(`  -> [SUCCESS] No obvious error strings found.`);
                }
            } else if (payload.type === 'time' && payload.sleepTime) {
                const startTime = Date.now();
                await fetch(buildUrl(payload.value), { signal });
                const duration = Date.now() - startTime;
                logger(`  -> Response time: ${duration}ms`);
                if (duration > (payload.sleepTime * 1000 - 500) && duration > baselineDuration * 2) {
                    vulnerabilitiesFound++;
                    logger(`  -> [WARN] VULNERABILITY DETECTED: Response took significantly longer than baseline, indicating a time-based vulnerability.`);
                } else {
                    logger(`  -> [SUCCESS] Response time is within normal limits.`);
                }
            } else if (payload.type === 'boolean' && payload.falseValue) {
                const trueResponse = await fetch(buildUrl(payload.value), { signal });
                const trueContentLength = (await trueResponse.text()).length;

                const falseResponse = await fetch(buildUrl(payload.falseValue), { signal });
                const falseContentLength = (await falseResponse.text()).length;
                
                logger(`  -> True Response Length: ${trueContentLength}, False Response Length: ${falseContentLength}`);
                if (Math.abs(trueContentLength - falseContentLength) > 100) { // Significant difference
                     vulnerabilitiesFound++;
                     logger(`  -> [WARN] VULNERABILITY DETECTED: True and False conditions produced significantly different responses.`);
                } else {
                     logger(`  -> [SUCCESS] No significant content length difference found between True/False conditions.`);
                }
            }
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') throw e;
            const msg = e instanceof Error ? e.message : String(e);
            logger(`  -> [ERROR] Network error during test: ${msg}`);
        }
        await new Promise(r => setTimeout(r, 300)); // small delay between tests
    }
    
    if (vulnerabilitiesFound > 0) {
        logger(`\n[WARN] Injection test complete. Found ${vulnerabilitiesFound} potential vulnerabilities.`);
    } else {
        logger('\n[SUCCESS] Injection test complete. No obvious vulnerabilities found with the tested payloads.');
    }
};


export const discoverWebSocketUrl = async (baseUrl: string, addLog: AddLogFn, signal: AbortSignal): Promise<string | null> => {
    const logger = log(addLog, 'SYSTEM');
    logger('[INFO] Starting WebSocket URL discovery...');
    logger('[WARN] This process is limited by target server CORS policy. It may fail if the target does not allow cross-origin requests.');

    const wsRegex = /(wss?:\/\/[^\s"'`<>]+)/g;
    const scriptRegex = /<script.*?src=["'](.*?)["']/g;
    
    const findUrlInText = (text: string): string | null => {
        const match = text.match(wsRegex);
        return match ? match[0] : null;
    };

    try {
        // 1. Fetch and analyze the main HTML page
        checkAborted(signal);
        logger(`[INFO] Fetching HTML from ${baseUrl}`);
        const response = await fetch(baseUrl, { signal });
        const htmlText = await response.text();
        
        let foundUrl = findUrlInText(htmlText);
        if (foundUrl) {
            logger(`[SUCCESS] Found WebSocket URL in HTML: ${foundUrl}`);
            return foundUrl;
        }
        logger('[INFO] No URL found in HTML. Searching linked scripts...');

        // 2. Find and analyze linked JavaScript files
        const scriptSrcs = [...htmlText.matchAll(scriptRegex)].map(match => match[1]);
        if (scriptSrcs.length === 0) {
            logger('[INFO] No linked JavaScript files found.');
            return null;
        }

        for (const src of scriptSrcs) {
            checkAborted(signal);
            const scriptUrl = new URL(src, baseUrl).href;
            logger(`[INFO] Analyzing script: ${scriptUrl}`);
            try {
                const scriptResponse = await fetch(scriptUrl, { signal });
                const scriptText = await scriptResponse.text();
                foundUrl = findUrlInText(scriptText);
                if (foundUrl) {
                    logger(`[SUCCESS] Found WebSocket URL in ${scriptUrl}: ${foundUrl}`);
                    return foundUrl;
                }
            } catch (scriptError) {
                logger(`[WARN] Could not fetch or analyze script ${scriptUrl}. It might be blocked by CORS.`);
            }
        }

        logger('[INFO] Discovery finished. No WebSocket URL found.');
        return null;

    } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
            logger('[WARN] Discovery aborted by user.');
        } else if (e instanceof TypeError) {
             logger(`[ERROR] Discovery failed. This is likely due to a CORS policy on the target server preventing access.`);
        } else {
            const msg = e instanceof Error ? e.message : String(e);
            logger(`[ERROR] An unexpected error occurred during discovery: ${msg}`);
        }
        return null;
    }
};

const SECURITY_HEADERS_TO_CHECK: { name: string, description: string }[] = [
    { name: 'content-security-policy', description: 'Mitigates XSS attacks by restricting resource loading.' },
    { name: 'strict-transport-security', description: 'Enforces HTTPS to prevent man-in-the-middle attacks.' },
    { name: 'x-content-type-options', description: 'Prevents MIME-sniffing attacks. Should be "nosniff".' },
    { name: 'x-frame-options', description: 'Prevents clickjacking attacks. Should be "DENY" or "SAMEORIGIN".' },
    { name: 'referrer-policy', description: 'Controls how much referrer information is sent with requests.' },
    { name: 'permissions-policy', description: 'Controls which browser features can be used.' },
];

export const inspectHttpHeaders = async (url: string, signal: AbortSignal): Promise<{ rawHeaders: HeaderResult[], analysis: SecurityHeaderAnalysis[] }> => {
    // NOTE: This fetch is subject to CORS. For a full analysis, a server-side proxy would be needed.
    // We'll catch the error and provide a helpful message.
    try {
        const response = await fetch(url, { signal, mode: 'cors' });
        
        const rawHeaders: HeaderResult[] = [];
        response.headers.forEach((value, name) => {
            rawHeaders.push({ name, value });
        });

        const analysis: SecurityHeaderAnalysis[] = SECURITY_HEADERS_TO_CHECK.map(headerInfo => {
            const headerValue = response.headers.get(headerInfo.name);
            return {
                name: headerInfo.name,
                value: headerValue || 'Not Found',
                status: headerValue ? 'present' : 'missing',
                description: headerInfo.description
            };
        });

        return { rawHeaders, analysis };
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error("CORS policy blocked the request. The target server does not allow this tool to inspect its headers from the browser. Try testing a specific API endpoint that might have a more permissive CORS policy.");
        }
        throw error;
    }
};
