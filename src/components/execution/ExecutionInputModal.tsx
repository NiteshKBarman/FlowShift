import React, { useState } from 'react';
import { useEditorStore } from '../../store/editor-store';
import { Keyboard, ArrowRight } from 'lucide-react';

export const ExecutionInputModal: React.FC = () => {
  const { executionState, provideExecutionInput } = useEditorStore();
  const inputPrompt = executionState?.inputPrompt;
  const isWaiting = executionState?.status === 'waiting-for-input';

  const [inputValue, setInputValue] = useState(inputPrompt?.defaultValue || '5');

  if (!isWaiting || !inputPrompt) {
    return null;
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    provideExecutionInput(inputValue);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-sm w-full p-5 shadow-2xl shadow-cyan-500/10 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Keyboard className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">Input Required</h4>
            <p className="text-[11px] text-slate-400">
              {inputPrompt.promptText || `Provide standard input for variable "${inputPrompt.variable}"`}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-700/80 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20">
            <span className="font-mono text-sm font-bold text-cyan-300">
              {inputPrompt.variable}:
            </span>
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-transparent text-sm font-mono text-white focus:outline-none"
              placeholder="Enter value..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
