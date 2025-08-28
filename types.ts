export enum TestId {
  IP_CHECK = 'IP Check',
  API_ACCESS = 'API Access Test',
  RNG = 'RNG Test',
  FINGERPRINT = 'Fingerprint Spoofing',
  WEBSOCKET = 'WebSocket Intercept',
  INJECTION = 'SQL/NoSQL Injection',
  LIVE_MODE = 'LIVE Mode',
  HTTP_HEADERS = 'HTTP Headers',
  JWT_ANALYZER = 'JWT Analyzer'
}

export interface ReportEntry {
  test: TestId | 'SYSTEM';
  timestamp: string;
  output: string;
}

export type AddLogFn = (text: string, testId: TestId | 'SYSTEM') => void;

export interface TargetScope {
  baseUrl: string;
  websocketUrl: string;
  injectionParameter: string;
}

export interface HeaderResult {
  name: string;
  value: string;
}

export interface SecurityHeaderAnalysis {
  name: string;
  status: 'present' | 'missing' | 'warning';
  value: string;
  description: string;
}
