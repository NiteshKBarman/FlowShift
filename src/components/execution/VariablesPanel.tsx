import React from 'react';
import { useEditorStore } from '../../store/editor-store';
import { Variable, Sparkles } from 'lucide-react';

export const VariablesPanel: React.FC = () => {
  const { executionState } = useEditorStore();

  const variables = executionState?.variables || {};
  const changedVars = new Set(executionState?.changedVariables || []);
  const varEntries = Object.entries(variables);

  return (
    <div className="flex flex-col h-full bg-slate-950/70 border-b border-slate-800/80 overflow-hidden">
      {/* Header */}
      <div className="h-9 px-3.5 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Variable className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Variables
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-800/80 text-cyan-300 border border-slate-700/60">
          {varEntries.length} {varEntries.length === 1 ? 'var' : 'vars'}
        </span>
      </div>

      {/* Variables List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 font-mono text-xs">
        {varEntries.length === 0 ? (
          <div className="h-full min-h-[90px] flex flex-col items-center justify-center text-slate-500 text-xs italic p-4 text-center">
            <span>No active variables declared yet</span>
          </div>
        ) : (
          varEntries.map(([name, value]) => {
            const isChanged = changedVars.has(name);
            let displayVal: string;

            if (typeof value === 'object' && value !== null) {
              displayVal = JSON.stringify(value);
            } else if (typeof value === 'string') {
              displayVal = `"${value}"`;
            } else {
              displayVal = String(value);
            }

            return (
              <div
                key={name}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-300 ${
                  isChanged
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{name}</span>
                  <span className="text-slate-500">=</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold transition-colors ${
                      isChanged
                        ? 'text-amber-300 drop-shadow-sm'
                        : typeof value === 'number'
                          ? 'text-amber-400'
                          : typeof value === 'string'
                            ? 'text-emerald-400'
                            : 'text-cyan-400'
                    }`}
                  >
                    {displayVal}
                  </span>

                  {isChanged && (
                    <span className="flex items-center gap-0.5 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      <Sparkles className="w-2.5 h-2.5" />
                      Changed
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
