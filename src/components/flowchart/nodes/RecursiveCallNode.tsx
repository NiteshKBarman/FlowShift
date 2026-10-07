import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { RotateCw, Sparkles } from 'lucide-react';

export const RecursiveCallNode: React.FC<NodeProps> = ({ data, selected }) => {
  const label = (data.label as string) || '';
  const isExecuting = Boolean(data.isExecuting);

  return (
    <div
      className={`relative px-4 py-3 rounded-xl bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-rose-950/80 border transition-all duration-200 shadow-xl backdrop-blur-md min-w-[190px] max-w-[300px] cursor-grab active:cursor-grabbing ${
        isExecuting
          ? 'border-emerald-400 ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-slate-950 scale-110 shadow-emerald-500/30'
          : selected
            ? 'border-amber-400 ring-2 ring-amber-400/50 ring-offset-2 ring-offset-slate-950 scale-105'
            : 'border-amber-500/70 hover:border-amber-400'
      }`}
    >
      {/* Side double border lines highlighting subroutine nature */}
      <div className="absolute left-2.5 top-0 bottom-0 w-[1px] bg-amber-400/50" />
      <div className="absolute right-2.5 top-0 bottom-0 w-[1px] bg-rose-400/50" />

      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-amber-400 border border-slate-900 rounded-full"
      />

      <div className="flex items-center gap-2 pl-2 pr-2">
        <div className="p-1 rounded bg-amber-500/20 text-amber-300 shrink-0">
          <RotateCw className="w-3.5 h-3.5 animate-[spin_10s_linear_infinite]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block font-mono">
              ↻ Recursive Call
            </span>
            <Sparkles className="w-2.5 h-2.5 text-amber-400 opacity-80" />
          </div>
          <p className="font-mono text-xs font-semibold text-amber-100 break-words leading-relaxed select-none mt-0.5">
            {label}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-amber-400 border border-slate-900 rounded-full"
      />
    </div>
  );
};
