import React, { useState, useEffect } from 'react';
import { useEditorStore, type SupportedLanguage, type AppViewMode } from '../../store/editor-store';
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
  Terminal,
  Loader2,
  GraduationCap,
  Info,
} from 'lucide-react';

export const HeaderToolbar: React.FC = () => {
  const {
    sourceLanguage,
    setSourceLanguage,
    activeView,
    autoSync,
    setAutoSync,
    runCode,
    isExecuting,
    terminalOpen,
    toggleTerminal,
    loadSample,
    isProcessing,
    diagnostics,
    setAboutModalOpen,
  } = useEditorStore();

  const [showSamplesMenu, setShowSamplesMenu] = useState(false);

  useEffect(() => {
    setShowSamplesMenu(false);
  }, [activeView]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSamplesMenu(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  const languages: Array<{ id: SupportedLanguage; label: string; ext: string }> = [
    { id: 'c', label: 'C', ext: '.c' },
    { id: 'cpp', label: 'C++', ext: '.cpp' },
    { id: 'python', label: 'Python', ext: '.py' },
    { id: 'java', label: 'Java', ext: '.java' },
  ];

  const viewModeMeta: Record<AppViewMode, { title: string; icon: React.FC<{ className?: string }>; badgeColor: string }> = {
    split: { title: 'Dual Studio', icon: Columns, badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
    code: { title: 'Code Editor', icon: FileCode, badgeColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
    flowchart: { title: 'Interactive Flowchart', icon: Layers, badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/30' },
    translate: { title: 'Cross-Language Conversion', icon: Languages, badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
    execute: { title: 'Visual Execution Studio', icon: Play, badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
    practice: { title: 'Practice & Quiz Arena', icon: GraduationCap, badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  };

  const currentMode = viewModeMeta[activeView] || viewModeMeta.split;
  const ModeIcon = currentMode.icon;

  return (
    <header className="h-13 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between z-30 select-none shadow-sm">
      {/* Brand & Mode Identification */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div
          onClick={() => setAboutModalOpen(true)}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="About FlowShift Educational Studio"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/60 p-1 flex items-center justify-center shadow-lg shadow-cyan-500/10 shrink-0 transition-transform group-hover:scale-105 overflow-hidden">
            <img src="/logo-icon.png" alt="FlowShift Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-white font-sans bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              FlowShift
            </span>
            <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
              IDE
            </span>
          </div>
        </div>

        {/* Current Active Mode Breadcrumb Badge */}
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
          <div className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 shadow-sm ${currentMode.badgeColor}`}>
            <ModeIcon className="w-3.5 h-3.5" />
            <span className="font-medium text-xs">{currentMode.title}</span>
          </div>
        </div>
      </div>

      {/* Middle & Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Source Language Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs shadow-inner">
          <Code2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400 font-medium hidden sm:inline text-[11px]">Lang:</span>
          <select
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value as SupportedLanguage)}
            className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer text-xs"
          >
            {languages.map((l) => (
              <option key={l.id} value={l.id} className="bg-slate-900 text-slate-200">
                {l.label} ({l.ext})
              </option>
            ))}
          </select>
        </div>

        {/* Educational Examples Library Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSamplesMenu(!showSamplesMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 text-slate-300 text-xs font-medium transition-colors"
            title="Educational Examples Library"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden lg:inline text-xs">Examples</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
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

        {/* Primary Run Code Action (With Hotkey Hint) */}
        <button
          onClick={() => runCode()}
          disabled={isExecuting || isProcessing}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:from-emerald-600 active:to-green-700 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 border border-emerald-400/40 cursor-pointer"
          title="Run Code in Integrated Terminal (Ctrl+Enter / Shift+Enter)"
        >
          {isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950 shrink-0" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
          )}
          <span>{isExecuting ? 'Running...' : 'Run'}</span>
          <kbd className="hidden md:inline-block ml-0.5 px-1 py-0.2 text-[9px] bg-emerald-950/20 text-slate-950/80 rounded font-mono">
            ⌘↵
          </kbd>
        </button>

        {/* Terminal Toggle Button */}
        <button
          onClick={toggleTerminal}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            terminalOpen
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Terminal Drawer"
        >
          <Terminal className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline text-xs">Terminal</span>
        </button>

        {/* Live Auto-Sync Indicator Toggle */}
        <button
          onClick={() => setAutoSync(!autoSync)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            autoSync
              ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Automatic real-time flowchart synchronization on code edits"
        >
          <RotateCw className={`w-3.5 h-3.5 shrink-0 ${autoSync ? 'animate-spin-slow text-cyan-400' : ''}`} />
          <span className="hidden sm:inline text-xs">Live Sync</span>
        </button>

        {/* Diagnostics Error/Warning Pill */}
        {(errorCount > 0 || warningCount > 0) && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>
              {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
            </span>
          </div>
        )}

        {/* Info / About Modal Button */}
        <button
          onClick={() => setAboutModalOpen(true)}
          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="About FlowShift Platform"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
