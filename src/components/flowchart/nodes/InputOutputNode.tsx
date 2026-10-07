import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { LogIn, LogOut } from 'lucide-react';

export const InputOutputNode: React.FC<NodeProps> = ({ data, selected }) => {
  const isInput = data.type === 'input' || (data.label as string)?.toLowerCase().startsWith('input') || (data.label as string)?.toLowerCase().includes('scanf') || (data.label as string)?.toLowerCase().includes('cin');
  const label = (data.label as string) || '';
  const isExecuting = Boolean(data.isExecuting);

  return (
    <div
      className={`relative px-5 py-3 rounded-xl bg-gradient-to-r ${
        isExecuting
          ? 'from-emerald-950/90 to-teal-950/90 border-emerald-400 ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-slate-950 scale-110 shadow-emerald-500/30'
          : isInput
            ? 'from-blue-950/80 to-indigo-950/80 border-blue-500/60'
            : 'from-purple-950/80 to-violet-950/80 border-purple-500/60'
      } border transition-all duration-200 shadow-xl backdrop-blur-md min-w-[170px] max-w-[280px] cursor-grab active:cursor-grabbing ${
        selected && !isExecuting
          ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-950 scale-105'
          : 'hover:border-opacity-100'
      }`}
      style={{
        transform: 'skewX(-6deg)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-purple-400 border border-slate-900 rounded-full"
      />

      <div className="flex items-start gap-2.5" style={{ transform: 'skewX(6deg)' }}>
        <div
          className={`p-1 rounded-md shrink-0 mt-0.5 ${
            isInput ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
          }`}
        >
          {isInput ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300/80 block font-mono">
            {isInput ? 'Input' : 'Output'}
          </span>
          <p className="font-mono text-xs text-slate-100 break-words leading-relaxed select-none">
            {label}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 bg-purple-400 border border-slate-900 rounded-full"
      />
    </div>
  );
};
