import React from 'react';
import { useEditorStore } from '../../store/editor-store';
import { Layers, CheckCircle2, CornerDownRight } from 'lucide-react';

export const CallStackPanel: React.FC = () => {
  const { executionState } = useEditorStore();
  const stack = executionState?.callStack || [];

  // Show frames from top of stack (newest) to bottom (oldest)
  const reversedStack = [...stack].reverse();

  return (
    <div className="flex flex-col h-full bg-slate-950/70 overflow-hidden">
      {/* Header */}
      <div className="h-9 px-3.5 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Call Stack
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-800/80 text-cyan-300 border border-slate-700/60">
          Depth: {stack.length}
        </span>
      </div>

      {/* Call Stack Breadcrumb Trail */}
      {stack.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono shrink-0">
          {stack.map((frame, idx) => (
            <React.Fragment key={frame.id}>
              {idx > 0 && <span className="text-slate-600">→</span>}
              <span
                className={`truncate max-w-[110px] ${
                  idx === stack.length - 1
                    ? 'text-cyan-300 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30'
                    : 'text-slate-400'
                }`}
                title={frame.functionName}
              >
                {frame.functionName}()
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Frames List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {reversedStack.length === 0 ? (
          <div className="h-full min-h-[90px] flex flex-col items-center justify-center text-slate-500 text-xs italic p-4 text-center">
            <span>Stack empty (program halted or at top level)</span>
          </div>
        ) : (
          reversedStack.map((frame, index) => {
            const isTop = index === 0;
            const paramEntries = Object.entries(frame.parameters || {});

            return (
              <div
                key={frame.id}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  isTop
                    ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/50 border-slate-800/70 hover:border-slate-700'
                }`}
              >
                {/* Frame Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-bold font-mono truncate ${
                        isTop ? 'text-cyan-300' : 'text-slate-300'
                      }`}
                    >
                      {frame.callExpression || `${frame.functionName}()`}
                    </span>
                    {isTop && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  {frame.isBaseCase && (
                    <span className="flex items-center gap-1 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 shadow-sm animate-pulse">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                      Base Case
                    </span>
                  )}
                </div>

                {/* Parameters & Scope */}
                {paramEntries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-800/60 font-mono text-[11px]">
                    <span className="text-[10px] text-slate-500 font-sans uppercase font-medium self-center mr-1">
                      Params:
                    </span>
                    {paramEntries.map(([pName, pVal]) => (
                      <span
                        key={pName}
                        className="px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-slate-800"
                      >
                        {pName} = <span className="text-amber-400 font-semibold">{String(pVal)}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Return Value Preview if available */}
                {frame.returnValue !== undefined && (
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-semibold">
                    <CornerDownRight className="w-3 h-3 text-emerald-400" />
                    <span>Returns {String(frame.returnValue)}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
