import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editor-store';
import { History } from 'lucide-react';
import type { ExecutionAction } from '../../core/execution/visual-engine';

const ACTION_COLORS: Record<ExecutionAction, { bg: string; text: string; border: string }> = {
  start: { bg: 'bg-slate-800/80', text: 'text-slate-300', border: 'border-slate-700' },
  declare: { bg: 'bg-blue-950/80', text: 'text-blue-300', border: 'border-blue-700/60' },
  assign: { bg: 'bg-amber-950/80', text: 'text-amber-300', border: 'border-amber-700/60' },
  condition: { bg: 'bg-purple-950/80', text: 'text-purple-300', border: 'border-purple-700/60' },
  loop: { bg: 'bg-indigo-950/80', text: 'text-indigo-300', border: 'border-indigo-700/60' },
  call: { bg: 'bg-cyan-950/80', text: 'text-cyan-300', border: 'border-cyan-700/60' },
  return: { bg: 'bg-teal-950/80', text: 'text-teal-300', border: 'border-teal-700/60' },
  'base-case': { bg: 'bg-emerald-950/90', text: 'text-emerald-300', border: 'border-emerald-500/70' },
  output: { bg: 'bg-green-950/80', text: 'text-green-300', border: 'border-green-700/60' },
  input: { bg: 'bg-yellow-950/80', text: 'text-yellow-300', border: 'border-yellow-700/60' },
  end: { bg: 'bg-slate-800/80', text: 'text-slate-300', border: 'border-slate-600' },
  error: { bg: 'bg-rose-950/80', text: 'text-rose-300', border: 'border-rose-700/60' },
};

export const ExecutionHistoryPanel: React.FC = () => {
  const { executionState, goToExecutionStep } = useEditorStore();
  const history = executionState?.history || [];
  const currentStep = executionState?.stepIndex ?? 0;
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="h-9 px-3.5 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Execution History
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          Step {currentStep + 1} of {history.length}
        </span>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {history.length === 0 ? (
          <div className="h-full min-h-[90px] flex items-center justify-center text-slate-600 text-xs italic">
            No history recorded yet
          </div>
        ) : (
          history.map((entry, index) => {
            const isCurrent = index === currentStep;
            const style = ACTION_COLORS[entry.action] || ACTION_COLORS.start;

            return (
              <div
                key={`${entry.stepIndex}-${index}`}
                ref={isCurrent ? activeItemRef : null}
                onClick={() => goToExecutionStep(index)}
                className={`group px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-xs font-mono cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-cyan-950/60 border border-cyan-500/50 shadow-md shadow-cyan-500/10 text-cyan-200 font-semibold ring-1 ring-cyan-500/30'
                    : 'hover:bg-slate-900/80 text-slate-300 border border-transparent'
                }`}
              >
                {/* Step Index Badge */}
                <span className="text-[10px] font-bold text-slate-500 w-6 shrink-0">
                  #{index + 1}
                </span>

                {/* Action Tag */}
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${style.bg} ${style.text} ${style.border}`}
                >
                  {entry.action}
                </span>

                {/* Description */}
                <span className="flex-1 truncate text-xs text-slate-200 group-hover:text-white">
                  {entry.description}
                </span>

                {/* Line badge if available */}
                {entry.sourceLocation?.startLine && (
                  <span className="text-[10px] text-slate-500 shrink-0 font-sans">
                    L{entry.sourceLocation.startLine}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
