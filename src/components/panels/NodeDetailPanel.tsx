import React from 'react';
import { useEditorStore } from '../../store/editor-store';
import { X, MapPin } from 'lucide-react';

export const NodeDetailPanel: React.FC = () => {
  const { selectedNode, selectNode } = useEditorStore();

  if (!selectedNode) return null;

  const meta = selectedNode.metadata;

  return (
    <div className="fixed inset-x-3 bottom-16 sm:inset-x-auto sm:right-4 sm:top-16 sm:bottom-auto w-auto sm:w-80 max-h-[50vh] sm:max-h-none overflow-y-auto rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-4 z-40 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-150 flex flex-col gap-3 font-sans select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Node Inspector
          </span>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Node Type:</span>
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 font-mono font-semibold uppercase text-[11px] border border-cyan-500/30">
            {selectedNode.type}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Node ID:</span>
          <span className="font-mono text-slate-300 text-xs">{selectedNode.id}</span>
        </div>

        {meta?.statementKind && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">IR Construct:</span>
            <span className="font-mono text-slate-300 text-xs">{meta.statementKind}</span>
          </div>
        )}

        {meta?.sourceLocation && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Source Range:</span>
            <span className="flex items-center gap-1 font-mono text-emerald-400 text-xs">
              <MapPin className="w-3 h-3" />
              <span>
                Lines {meta.sourceLocation.startLine}–{meta.sourceLocation.endLine}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Code Label
        </span>
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 break-words leading-relaxed">
          {selectedNode.label}
        </div>
      </div>
    </div>
  );
};
