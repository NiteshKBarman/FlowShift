import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play, CircleCheck } from 'lucide-react';

export const TerminalNode: React.FC<NodeProps> = ({ data, selected }) => {
  const isStart = data.type === 'start' || (data.label as string)?.toLowerCase().includes('start') || (data.label as string)?.toLowerCase().includes('entry');
  const label = (data.label as string) || (isStart ? 'Start' : 'End');
  const isExecuting = Boolean(data.isExecuting);

  return (
    <div
      className={`relative px-6 py-2.5 rounded-full flex items-center gap-2.5 transition-all duration-200 shadow-lg ${
        isStart
          ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-500/60 text-emerald-200 shadow-emerald-950/40'
          : 'bg-gradient-to-r from-rose-950/80 to-red-950/80 border-rose-500/60 text-rose-200 shadow-rose-950/40'
      } border ${
        isExecuting
          ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-110 shadow-emerald-500/40'
          : selected
            ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-105'
            : 'hover:border-opacity-100'
      } backdrop-blur-md min-w-[130px] justify-center cursor-grab active:cursor-grabbing`}
    >
      {/* Target handle on top/left (only for end) */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-2.5 h-2.5 bg-rose-400 border border-slate-900 rounded-full"
        />
      )}

      {isStart ? (
        <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 shrink-0" />
      ) : (
        <CircleCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      )}

      <span className="font-semibold text-xs tracking-wider uppercase font-mono">{label}</span>

      {/* Source handle on bottom/right (only for start) */}
      {isStart && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-2.5 h-2.5 bg-emerald-400 border border-slate-900 rounded-full"
        />
      )}
    </div>
  );
};
