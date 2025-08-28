import React, { useState, useCallback } from 'react';
import TestButton from './TestButton';
import TerminalOutput from './TerminalOutput';
import ReportExporter from './ReportExporter';
import { TargetScopeEditor } from './TargetScopeEditor';
import { useTerminal } from '../hooks/useTerminal';
import { TestId, AddLogFn, TargetScope } from '../types';
import { 
  checkIpAddress, 
  testApiAccess, 
  testRng, 
  checkFingerprint, 
  interceptWebSocket, 
  testSqlInjection 
} from '../services/securityTests';
import { LIVE_MODE_PASSWORD } from '../constants';
import { HttpHeaderInspector } from './HttpHeaderInspector';
import { JwtAnalyzer } from './JwtAnalyzer';

const Dashboard: React.FC = () => {
  const [runningTest, setRunningTest] = useState<TestId | null>(null);
  const [scope, setScope] = useState<TargetScope | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const { logs, reportData, addLog, clearLogs } = useTerminal();

  const runTest = useCallback(async <T,>(
    testId: TestId, 
    testFn: (addLog: AddLogFn, scope: TargetScope, signal: AbortSignal) => Promise<T>,
    requiresScope: boolean = true
  ) => {
    if (requiresScope && !scope) {
      addLog('[WARN] Please set a target scope before running this test.', 'SYSTEM');
      return;
    }
    
    const controller = new AbortController();
    setAbortController(controller);
    setRunningTest(testId);
    clearLogs();
    addLog(`[INFO] Starting test: ${testId}...`, 'SYSTEM');
    
    try {
      await testFn(addLog, scope!, controller.signal);
      addLog(`[SUCCESS] Test completed: ${testId}`, 'SYSTEM');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        addLog(`[WARN] Test aborted by user: ${testId}`, 'SYSTEM');
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLog(`[ERROR] Test failed: ${testId}. Reason: ${errorMessage}`, 'SYSTEM');
      }
    } finally {
      setRunningTest(null);
      setAbortController(null);
    }
  }, [addLog, clearLogs, scope]);

  const handleLiveMode = async () => {
    if (!scope) {
      addLog('[WARN] Please set a target scope before running LIVE Mode.', 'SYSTEM');
      return;
    }
    const pass = prompt('Enter password for LIVE Mode:');
    if (pass !== LIVE_MODE_PASSWORD) {
      if(pass !== null) alert('Incorrect password!');
      return;
    }
    
    const controller = new AbortController();
    setAbortController(controller);
    setRunningTest(TestId.LIVE_MODE);
    clearLogs();
    addLog(`[INFO] Starting ${TestId.LIVE_MODE}...`, 'SYSTEM');

    const tests: [TestId, (addLog: AddLogFn, scope: TargetScope, signal: AbortSignal) => Promise<void>][] = [
      [TestId.IP_CHECK, checkIpAddress],
      [TestId.API_ACCESS, testApiAccess],
      [TestId.RNG, testRng],
      [TestId.FINGERPRINT, checkFingerprint],
      [TestId.WEBSOCKET, interceptWebSocket],
      [TestId.INJECTION, testSqlInjection]
    ];

    for (const [id, fn] of tests) {
      if (controller.signal.aborted) {
        addLog(`[WARN] LIVE Mode aborted by user.`, 'SYSTEM');
        break;
      }
      addLog(`\n[INFO] Running sub-test: ${id}`, 'SYSTEM');
      try {
          await fn(addLog, scope, controller.signal);
          addLog(`[SUCCESS] Sub-test completed: ${id}`, 'SYSTEM');
      } catch(e) {
          if (e instanceof Error && e.name === 'AbortError') {
            addLog(`[WARN] LIVE Mode aborted by user.`, 'SYSTEM');
            break;
          }
          const msg = e instanceof Error ? e.message : String(e);
          addLog(`[ERROR] Sub-test failed: ${id}. Reason: ${msg}`, 'SYSTEM');
      }
      await new Promise(res => setTimeout(res, 500));
    }

    addLog(`\n[SUCCESS] ${TestId.LIVE_MODE} completed.`, 'SYSTEM');
    setRunningTest(null);
    setAbortController(null);
  };
  
  const tests = [
    { id: TestId.IP_CHECK, fn: () => runTest(TestId.IP_CHECK, checkIpAddress, false), requiresScope: false },
    { id: TestId.API_ACCESS, fn: () => runTest(TestId.API_ACCESS, testApiAccess), requiresScope: true },
    { id: TestId.RNG, fn: () => runTest(TestId.RNG, testRng, false), requiresScope: false },
    { id: TestId.FINGERPRINT, fn: () => runTest(TestId.FINGERPRINT, checkFingerprint, false), requiresScope: false },
    { id: TestId.WEBSOCKET, fn: () => runTest(TestId.WEBSOCKET, interceptWebSocket), requiresScope: true },
    { id: TestId.INJECTION, fn: () => runTest(TestId.INJECTION, testSqlInjection), requiresScope: true },
  ];

  return (
    <div className="space-y-6">
      <TargetScopeEditor onScopeSet={setScope} disabled={runningTest !== null} addLog={addLog} />
      
      <div className="p-4 border border-green-700 rounded-lg bg-gray-900/40 space-y-4">
        <h2 className="text-lg font-bold text-green-400">Active Tests</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tests.map(test => (
            <TestButton 
              key={test.id} 
              onClick={test.fn} 
              disabled={runningTest !== null || (test.requiresScope && !scope)}
              isLoading={runningTest === test.id}
            >
              {test.id}
            </TestButton>
          ))}
          <TestButton 
              onClick={handleLiveMode} 
              disabled={runningTest !== null || !scope}
              isLoading={runningTest === TestId.LIVE_MODE}
              color="yellow"
              className="col-span-2 md:col-span-2"
            >
              {TestId.LIVE_MODE}
            </TestButton>
            <TestButton 
              onClick={() => { clearLogs(); addLog("Terminal cleared.", "SYSTEM"); }}
              disabled={runningTest !== null}
              color="red"
              className="col-span-2 md:col-span-2"
            >
              Clear Terminal
            </TestButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HttpHeaderInspector />
        <JwtAnalyzer />
      </div>


      {runningTest && (
        <div className="flex justify-center">
            <button
                onClick={() => abortController?.abort()}
                className="px-6 py-2 bg-red-600/80 text-white font-bold rounded-lg hover:bg-red-500 transition animate-pulse"
            >
                Cancel Test: {runningTest}
            </button>
        </div>
      )}

      <TerminalOutput logs={logs} />
      <ReportExporter data={reportData} />
    </div>
  );
};

export default Dashboard;