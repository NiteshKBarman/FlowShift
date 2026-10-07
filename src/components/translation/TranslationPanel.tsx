import React, { useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { useEditorStore, type SupportedLanguage } from '../../store/editor-store';
import {
  ArrowLeftRight,
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
    setSourceLanguage,
    setSourceCode,
    targetLanguage,
    setTargetLanguage,
    convertedCode,
    conversionStatus,
    runConversion,
    runPipeline,
  } = useEditorStore();

  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const languages: Array<{ id: SupportedLanguage; label: string }> = [
    { id: 'c', label: 'C' },
    { id: 'cpp', label: 'C++' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
  ];

  const handleSwapLanguages = () => {
    const curSource = sourceLanguage;
    const curTarget = targetLanguage;
    if (convertedCode && convertedCode.trim().length > 0) {
      setSourceCode(convertedCode);
    }
    setSourceLanguage(curTarget);
    setTargetLanguage(curSource);
    setTimeout(() => {
      runPipeline();
    }, 50);
  };

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
      <div className="min-h-12 border-b border-slate-800 bg-slate-900/80 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-10 select-none">
        {/* Language Selection & Direction */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <span className="font-mono uppercase text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
              {sourceLanguage}
            </span>
            <button
              onClick={handleSwapLanguages}
              className="p-1 rounded-md bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/40 transition-all cursor-pointer"
              title="Swap source and target languages"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-400 hidden xs:inline">Target:</span>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setTargetLanguage(lang.id)}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
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
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 shadow-sm">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>Converted</span>
            </span>
          )}
          {conversionStatus === 'partial_success' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-400 border border-amber-500/40 shadow-sm">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>Partial</span>
            </span>
          )}
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Main Convert Action Button */}
          <button
            onClick={runConversion}
            className="p-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs border border-cyan-400/40 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Convert Code"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              Convert {sourceLanguage.toUpperCase()} → {targetLanguage.toUpperCase()}
            </span>
            <span className="sm:hidden">Convert</span>
          </button>

          {/* Diff View Toggle */}
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`p-1.5 px-2 sm:px-2.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              showDiff
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
            }`}
            title="Toggle Diff View"
          >
            <GitCompare className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Diff</span>
          </button>


          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!convertedCode}
            className="p-1.5 px-2 sm:px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            title="Copy Converted Code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={!convertedCode}
            className="p-1.5 px-2 sm:px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            title="Download Converted File"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Export</span>
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
              fontSize: window.innerWidth < 640 ? 12 : 13,
              lineHeight: window.innerWidth < 640 ? 20 : 22,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              renderSideBySide: window.innerWidth >= 768,
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
              fontSize: window.innerWidth < 640 ? 12 : 13,
              lineHeight: window.innerWidth < 640 ? 20 : 22,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 12, bottom: 12 },
            }}
          />
        )}
      </div>
    </div>
  );
};
