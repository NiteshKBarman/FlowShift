import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Cpu } from 'lucide-react';

export const ProcessNode: React.FC<NodeProps> = ({ data, selected }) => {
  const label = (data.label as string) || '';

  return (
    <div
      className={`relative px-4 py-3 rounded-xl bg-slate-900/90 border transition-all duration-200 shadow-xl backdrop-blur-md min-w-[170px] max-w-[280px] cursor-grab active:cursor-grabbing ${
        selected
          ? 'border-cyan-400 ring-2 ring-cyan-400/40 ring-offset-2 ring-offset-slate-950 scale-105'
          : 'border-slate-700/80 hover:border-cyan-500/50'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-cyan-400 border border-slate-900 rounded-full"
      />

      <div className="flex items-start gap-2.5">
        <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
          <Cpu className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-slate-200 break-words leading-relaxed select-none">
            {label}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-cyan-400 border border-slate-900 rounded-full"
      />
    </div>
  );
};
