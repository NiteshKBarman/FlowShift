import React, { useState } from 'react';
import { useEditorStore, type SupportedLanguage } from '../../store/editor-store';
import { SAMPLE_PROGRAMS } from '../../data/samples';
import {
  Play,
  RotateCw,
  Columns,
  Layers,
  Languages,
  BookOpen,
  ChevronDown,
  AlertCircle,
  Code2,
  FileCode,
  X,
  Terminal,
  Loader2,
} from 'lucide-react';

export const HeaderToolbar: React.FC = () => {
  const {
    sourceLanguage,
    setSourceLanguage,
    activeView,
    setActiveView,
    autoSync,
    setAutoSync,
    runCode,
    isExecuting,
    terminalOpen,
    toggleTerminal,
    loadSample,
    isProcessing,
    diagnostics,
  } = useEditorStore();

  const [showSamplesMenu, setShowSamplesMenu] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  const languages: Array<{ id: SupportedLanguage; label: string }> = [
    { id: 'c', label: 'C' },
    { id: 'cpp', label: 'C++' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
  ];

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between z-30 select-none shadow-sm">
      {/* Brand & Title */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div
          onClick={() => setShowAboutModal(true)}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group"
          title="Click to learn more about FlowShift"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/90 border border-slate-700/60 p-1 flex items-center justify-center shadow-lg shadow-cyan-500/10 shrink-0 transition-transform group-hover:scale-105 overflow-hidden">
            <img src="/logo-icon.png" alt="FlowShift Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-base tracking-tight text-white font-sans bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                FlowShift
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
                Studio
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              Code &rarr; Flowchart &rarr; Code
            </p>
          </div>
        </div>

        {/* Desktop View Mode Switcher */}
        <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveView('split')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeView === 'split'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Dual Studio</span>
          </button>

          <button
            onClick={() => setActiveView('code')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeView === 'code'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Code Only</span>
          </button>

          <button
            onClick={() => setActiveView('flowchart')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeView === 'flowchart'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flowchart</span>
          </button>

          <button
            onClick={() => setActiveView('translate')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeView === 'translate'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Translate</span>
          </button>
        </div>
      </div>

      {/* Middle & Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Source Language Picker */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 sm:px-2.5 py-1 text-xs">
          <Code2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400 font-medium hidden sm:inline">Source:</span>
          <select
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value as SupportedLanguage)}
            className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer text-xs"
          >
            {languages.map((l) => (
              <option key={l.id} value={l.id} className="bg-slate-900 text-slate-200">
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Samples Library Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSamplesMenu(!showSamplesMenu)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-colors"
            title="Sample Programs"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden md:inline">Sample Programs</span>
            <span className="inline md:hidden text-[11px]">Samples</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {showSamplesMenu && (
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select Educational Example
              </div>
              <div className="py-1 max-h-72 overflow-y-auto">
                {SAMPLE_PROGRAMS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => {
                      loadSample(sample.id);
                      setShowSamplesMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">
                        {sample.title}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          sample.category === 'Recursion'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {sample.category === 'Recursion' ? '↻ Recursion' : sample.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      {sample.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Prominent Run Button (Compile, Execute & Open Terminal) */}
        <button
          onClick={() => runCode()}
          disabled={isExecuting || isProcessing}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:from-emerald-600 active:to-green-700 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-50 border border-emerald-400/40 cursor-pointer"
          title="Compile & Run Code to Terminal (Shift+Enter)"
        >
          {isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950 shrink-0" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
          )}
          <span>{isExecuting ? 'Running...' : 'Run'}</span>
        </button>

        {/* Terminal Toggle Button */}
        <button
          onClick={toggleTerminal}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            terminalOpen
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Terminal Drawer"
        >
          <Terminal className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Terminal</span>
        </button>

        {/* Live Auto-sync Toggle */}
        <button
          onClick={() => setAutoSync(!autoSync)}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            autoSync
              ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
          title="Automatic real-time flowchart re-generation on code changes"
        >
          <RotateCw className={`w-3.5 h-3.5 shrink-0 ${autoSync ? 'animate-spin-slow' : ''}`} />
          <span className="hidden sm:inline">Live Sync</span>
        </button>

        {/* Diagnostics Badge */}
        {(errorCount > 0 || warningCount > 0) && (
          <div className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>
              {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
            </span>
          </div>
        )}
      </div>

      {/* Brand About Modal */}
      {showAboutModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto mb-3 bg-white rounded-2xl p-2 shadow-2xl shadow-cyan-500/10 overflow-hidden flex items-center justify-center border border-slate-700/50">
              <img src="/logo.png" alt="FlowShift Full Logo" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">FlowShift</h3>
            <p className="text-xs font-semibold text-cyan-400 mt-1">Code &rarr; Flowchart &rarr; Code</p>
            <p className="text-xs text-slate-400 mt-0.5 italic">Visualize. Convert. Build.</p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-400 border border-blue-800/50 font-mono font-semibold">C</span>
              <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-400 border border-purple-800/50 font-mono font-semibold">C++</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 font-mono font-semibold">Python</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-400 border border-amber-800/50 font-mono font-semibold">Java</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              100% Client-Side In-Browser Studio • Zero Server Latency • Total Privacy
            </p>
          </div>
        </div>
      )}
    </header>
  );
};
