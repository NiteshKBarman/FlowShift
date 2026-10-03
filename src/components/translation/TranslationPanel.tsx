import React, { useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { useEditorStore, type SupportedLanguage } from '../../store/editor-store';
import {
  ArrowRight,
  Copy,
  Check,
  Download,
  GitCompare,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const TranslationPanel: React.FC = () => {
  const {
    sourceCode,
    sourceLanguage,
    targetLanguage,
    setTargetLanguage,
    convertedCode,
    conversionStatus,
    runConversion,
  } = useEditorStore();

  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const languages: Array<{ id: SupportedLanguage; label: string }> = [
    { id: 'c', label: 'C' },
    { id: 'cpp', label: 'C++' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(convertedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extensions: Record<SupportedLanguage, string> = {
      c: 'c',
      cpp: 'cpp',
      python: 'py',
      java: 'java',
    };
    const blob = new Blob([convertedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted.${extensions[targetLanguage]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Target Sub-header */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between z-10 select-none">
        {/* Language Selection & Direction */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span className="font-mono uppercase text-slate-400">{sourceLanguage}</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Target:</span>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setTargetLanguage(lang.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  targetLanguage === lang.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Status Badge */}
          {conversionStatus === 'success' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="w-3 h-3" />
              <span>Converted</span>
            </span>
          )}
          {conversionStatus === 'partial_success' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-400 border border-amber-500/40">
              <AlertTriangle className="w-3 h-3" />
              <span>Partial</span>
            </span>
          )}
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* Diff View Toggle */}
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`p-1.5 px-2.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              showDiff
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
            }`}
            title="Toggle Diff View"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Diff View</span>
          </button>

          {/* Refresh Conversion */}
          <button
            onClick={runConversion}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            title="Re-run Translation"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Translate</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!convertedCode}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={!convertedCode}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Editor or Diff Container */}
      <div className="flex-1 w-full h-full relative">
        {showDiff ? (
          <DiffEditor
            height="100%"
            original={sourceCode}
            modified={convertedCode}
            language={targetLanguage}
            theme="flowshift-dark"
            options={{
              readOnly: true,
              fontSize: 13,
              lineHeight: 22,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderSideBySide: true,
            }}
          />
        ) : (
          <Editor
            height="100%"
            language={targetLanguage}
            value={convertedCode}
            theme="flowshift-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineHeight: 22,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
            }}
          />
        )}
      </div>
    </div>
  );
};
