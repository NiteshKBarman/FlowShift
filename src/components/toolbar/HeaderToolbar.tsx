import React, { useState } from 'react';
import { useEditorStore, type SupportedLanguage } from '../../store/editor-store';
import { SAMPLE_PROGRAMS } from '../../data/samples';
import {
  Workflow,
  Play,
  RotateCw,
  Columns,
  Layers,
  Languages,
  BookOpen,
  ChevronDown,
  AlertCircle,
  Code2,
} from 'lucide-react';

export const HeaderToolbar: React.FC = () => {
  const {
    sourceLanguage,
    setSourceLanguage,
    activeView,
    setActiveView,
    autoSync,
    setAutoSync,
    runPipeline,
    loadSample,
    isProcessing,
    diagnostics,
  } = useEditorStore();

  const [showSamplesMenu, setShowSamplesMenu] = useState(false);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  const languages: Array<{ id: SupportedLanguage; label: string }> = [
    { id: 'c', label: 'C' },
    { id: 'cpp', label: 'C++' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
  ];

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 flex items-center justify-between z-30 select-none shadow-sm">
      {/* Brand & Title */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Workflow className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white font-sans bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                FlowShift
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveView('split')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeView === 'split'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Dual Studio</span>
          </button>

          <button
            onClick={() => setActiveView('flowchart')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeView === 'flowchart'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flowchart Only</span>
          </button>

          <button
            onClick={() => setActiveView('translate')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeView === 'translate'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Translation Studio</span>
          </button>
        </div>
      </div>

      {/* Middle & Right Controls */}
      <div className="flex items-center gap-3">
        {/* Source Language Picker */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
          <Code2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">Source:</span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sample Programs</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showSamplesMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select Educational Example
              </div>
              <div className="py-1">
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {sample.category}
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

        {/* Live Auto-sync Toggle */}
        <button
          onClick={() => setAutoSync(!autoSync)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            autoSync
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
          title="Automatic real-time re-generation on code changes"
        >
          <RotateCw className={`w-3.5 h-3.5 ${autoSync ? 'animate-spin-slow' : ''}`} />
          <span>Live Sync</span>
        </button>

        {/* Synthesize Button */}
        <button
          onClick={() => runPipeline()}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-slate-950" />
          <span>{isProcessing ? 'Generating...' : 'Synthesize'}</span>
        </button>

        {/* Diagnostics Badge */}
        {(errorCount > 0 || warningCount > 0) && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>
              {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
