import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Layers } from 'lucide-react';

export const SubroutineNode: React.FC<NodeProps> = ({ data, selected }) => {
  const label = (data.label as string) || '';
  const isExecuting = Boolean(data.isExecuting);

  return (
    <div
      className={`relative px-4 py-3 rounded-xl bg-slate-900/90 border transition-all duration-200 shadow-xl backdrop-blur-md min-w-[170px] max-w-[280px] cursor-grab active:cursor-grabbing ${
        isExecuting
          ? 'border-emerald-400 ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-slate-950 scale-110 shadow-emerald-500/30'
          : selected
            ? 'border-indigo-400 ring-2 ring-indigo-400/40 ring-offset-2 ring-offset-slate-950 scale-105'
            : 'border-indigo-500/60 hover:border-indigo-400'
      }`}
    >
      {/* Side double vertical lines characteristic of subroutine symbol */}
      <div className="absolute left-2.5 top-0 bottom-0 w-[1px] bg-indigo-500/40" />
      <div className="absolute right-2.5 top-0 bottom-0 w-[1px] bg-indigo-500/40" />

      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-indigo-400 border border-slate-900 rounded-full"
      />

      <div className="flex items-center gap-2 pl-2 pr-2">
        <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/80 block font-mono">
            Function Call
          </span>
          <p className="font-mono text-xs text-indigo-100 break-words leading-relaxed select-none">
            {label}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-indigo-400 border border-slate-900 rounded-full"
      />
    </div>
  );
};
