import React, { useState } from 'react';
import { useEditorStore } from '../../store/editor-store';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronUp,
  ChevronDown,
  Terminal,
} from 'lucide-react';

export const DiagnosticsDrawer: React.FC = () => {
  const { diagnostics } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');
  const infos = diagnostics.filter((d) => d.severity === 'info' || d.severity === 'hint');

  if (diagnostics.length === 0) {
    return (
      <div className="h-7 border-t border-slate-800 bg-slate-950 px-4 flex items-center justify-between text-[11px] text-slate-500 font-mono select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-slate-600" />
          <span>Pipeline: Clean • No syntax or semantic diagnostics</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Client-side AST Engine</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-800 bg-slate-950 flex flex-col z-20 transition-all duration-200">
      {/* Drawer Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-4 flex items-center justify-between bg-slate-900/90 hover:bg-slate-900 text-xs text-slate-300 font-medium cursor-pointer transition-colors border-b border-slate-800/60"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-400">Diagnostics:</span>
          {errors.length > 0 && (
            <span className="flex items-center gap-1 text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.length} Errors</span>
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{warnings.length} Warnings</span>
            </span>
          )}
          {infos.length > 0 && (
            <span className="flex items-center gap-1 text-cyan-400">
              <Info className="w-3.5 h-3.5" />
              <span>{infos.length} Notes</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-400 text-xs">
          <span>{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Drawer Content */}
      {isOpen && (
        <div className="max-h-48 overflow-y-auto p-2 flex flex-col gap-1.5 font-mono text-xs bg-slate-950/95">
          {diagnostics.map((diag, index) => {
            let color = 'text-cyan-300 bg-cyan-950/20 border-cyan-800/40';
            let Icon = Info;

            if (diag.severity === 'error') {
              color = 'text-rose-300 bg-rose-950/20 border-rose-800/40';
              Icon = AlertCircle;
            } else if (diag.severity === 'warning') {
              color = 'text-amber-300 bg-amber-950/20 border-amber-800/40';
              Icon = AlertTriangle;
            }

            return (
              <div
                key={index}
                className={`p-2 rounded-lg border flex items-start gap-2.5 ${color}`}
              >
                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      [{diag.category}]
                    </span>
                    {diag.sourceLocation && (
                      <span className="text-[10px] opacity-75 font-mono">
                        Line {diag.sourceLocation.startLine}:{diag.sourceLocation.startColumn}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs break-words">{diag.message}</p>
                  {diag.suggestion && (
                    <p className="mt-1 text-[11px] opacity-80 italic">
                      Suggestion: {diag.suggestion}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
