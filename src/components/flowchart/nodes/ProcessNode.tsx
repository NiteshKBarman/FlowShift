import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Cpu } from 'lucide-react';

export const ProcessNode: React.FC<NodeProps> = ({ data, selected }) => {
  const label = (data.label as string) || '';
  const isExecuting = Boolean(data.isExecuting);

  return (
    <div
      className={`relative px-4 py-3 rounded-xl bg-slate-900/95 border transition-all duration-200 shadow-xl backdrop-blur-md min-w-[170px] max-w-[280px] cursor-grab active:cursor-grabbing ${
        isExecuting
          ? 'border-emerald-400 ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-slate-950 shadow-emerald-500/30 shadow-2xl scale-110'
          : selected
            ? 'border-cyan-400 ring-2 ring-cyan-400/40 ring-offset-2 ring-offset-slate-950 scale-105'
            : 'border-slate-700/80 hover:border-cyan-500/50'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`w-2.5 h-2.5 border border-slate-900 rounded-full ${
          isExecuting ? 'bg-emerald-400' : 'bg-cyan-400'
        }`}
      />

      <div className="flex items-start gap-2.5">
        <div
          className={`p-1 rounded-md shrink-0 mt-0.5 ${
            isExecuting
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-cyan-500/10 text-cyan-400'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          {isExecuting && (
            <span className="inline-flex items-center gap-1 text-[9px] uppercase font-mono font-bold text-emerald-300 tracking-wider mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Executing
            </span>
          )}
          <p className="font-mono text-xs text-slate-200 break-words leading-relaxed select-none">
            {label}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-2.5 h-2.5 border border-slate-900 rounded-full ${
          isExecuting ? 'bg-emerald-400' : 'bg-cyan-400'
        }`}
      />
    </div>
  );
};
