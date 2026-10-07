import React from 'react';
import { useEditorStore } from '../../store/editor-store';
import { Terminal } from 'lucide-react';

export const ExecutionConsole: React.FC = () => {
  const { executionState } = useEditorStore();
  const output = executionState?.output || [];

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800/80 overflow-hidden">
      {/* Header */}
      <div className="h-9 px-3.5 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Console Output
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          stdout ({output.length} {output.length === 1 ? 'line' : 'lines'})
        </span>
      </div>

      {/* Output Console Body */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-200 bg-slate-950 select-text whitespace-pre-wrap leading-relaxed">
        {output.length === 0 ? (
          <span className="text-slate-600 italic select-none">
            [No output produced yet. Step or run the program to see stdout.]
          </span>
        ) : (
          output.join('')
        )}
      </div>
    </div>
  );
};
