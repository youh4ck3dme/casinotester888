
import { useState, useCallback } from 'react';
import { ReportEntry, TestId } from '../types';

export const useTerminal = () => {
  const [logs, setLogs] = useState<ReportEntry[]>([{ test: 'SYSTEM', timestamp: new Date().toISOString(), output: "Welcome to Casino Tester 888. Select a test to begin." }]);
  const [reportData, setReportData] = useState<ReportEntry[]>([]);

  const addLog = useCallback((text: string, testId: TestId | 'SYSTEM') => {
    const newEntry: ReportEntry = {
      test: testId,
      timestamp: new Date().toISOString(),
      output: text,
    };
    setLogs(prevLogs => [...prevLogs, newEntry]);
    if (testId !== 'SYSTEM') {
        setReportData(prevData => [...prevData, newEntry]);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setReportData([]);
  }, []);

  return { logs, reportData, addLog, clearLogs };
};
