import { Check, Copy, Download, Terminal } from 'lucide-react';
import { useState } from 'react';
import { STREAMLIT_APP_CODE } from '../data/streamlitSource';

export function PythonExportView() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const installAndRunCmd = `pip install streamlit pandas altair\nstreamlit run app.py`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(STREAMLIT_APP_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handleCopyCmd = async () => {
    try {
      await navigator.clipboard.writeText(installAndRunCmd);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handleDownloadPython = () => {
    const blob = new Blob([STREAMLIT_APP_CODE], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#E2E7E2] rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#141A16]">
              Local Python &amp; Streamlit Execution Guide
            </h2>
            <p className="text-xs text-[#5A655D] mt-1 max-w-2xl">
              Run the standalone single-file Python version of SylvaClime locally using Streamlit, Pandas, and Altair. Save the script below as <code className="font-mono text-[#141A16] bg-[#F2F4F2] px-1.5 py-0.5 rounded">app.py</code> and run these terminal commands:
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyCmd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#141A16] bg-white border border-[#DCE2DD] rounded-md hover:bg-[#F2F4F2] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-[#166534]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd ? 'Commands Copied' : 'Copy Commands'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPython}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1B5E3F] rounded-md hover:bg-[#154A31] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download app.py</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#141A16] text-[#E6ECE7] rounded-md p-4 font-mono text-xs leading-relaxed">
            <div className="flex items-center gap-2 text-[#8DA093] mb-2">
              <Terminal className="w-3.5 h-3.5" />
              <span>1. Install Python dependencies</span>
            </div>
            <div>pip install streamlit pandas altair</div>
          </div>

          <div className="bg-[#141A16] text-[#E6ECE7] rounded-md p-4 font-mono text-xs leading-relaxed">
            <div className="flex items-center gap-2 text-[#8DA093] mb-2">
              <Terminal className="w-3.5 h-3.5" />
              <span>2. Launch the Streamlit web app</span>
            </div>
            <div>streamlit run app.py</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E2E7E2] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E7E2] bg-[#F7F9F7]">
          <div className="text-xs font-mono font-medium text-[#141A16]">
            app.py · Single-File Streamlit &amp; Pandas Application
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#141A16] bg-white border border-[#DCE2DD] rounded hover:bg-[#F2F4F2] transition-colors cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-[#166534]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied Python Code' : 'Copy app.py'}</span>
          </button>
        </div>

        <pre className="p-5 overflow-x-auto bg-[#141A16] text-[#E3EBE5] font-mono text-xs leading-relaxed max-h-[560px]">
          <code>{STREAMLIT_APP_CODE}</code>
        </pre>
      </div>
    </div>
  );
}
