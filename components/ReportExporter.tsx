
import React from 'react';
import { ReportEntry } from '../types';

interface ReportExporterProps {
  data: ReportEntry[];
}

const downloadFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const ReportExporter: React.FC<ReportExporterProps> = ({ data }) => {
  const handleExportJSON = () => {
    if (data.length === 0) {
      alert('No data to export.');
      return;
    }
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, 'casino-tester-report.json', 'application/json');
  };

  const handleExportCSV = () => {
    if (data.length === 0) {
      alert('No data to export.');
      return;
    }
    const headers = ['timestamp', 'test', 'output'];
    const csvRows = [
      headers.join(','),
      ...data.map(row => {
        const values = headers.map(header => {
          const escaped = ('' + row[header as keyof ReportEntry]).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        return values.join(',');
      })
    ];
    downloadFile(csvRows.join('\n'), 'casino-tester-report.csv', 'text/csv');
  };

  return (
    <div className="flex space-x-4 mt-4">
      <button
        onClick={handleExportJSON}
        className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md font-bold transition hover:bg-blue-500/10 active:bg-blue-500/20 disabled:opacity-50"
        disabled={data.length === 0}
      >
        Export JSON
      </button>
      <button
        onClick={handleExportCSV}
        className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md font-bold transition hover:bg-blue-500/10 active:bg-blue-500/20 disabled:opacity-50"
        disabled={data.length === 0}
      >
        Export CSV
      </button>
    </div>
  );
};

export default ReportExporter;
