import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';

export const DecisionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const label = (data.label as string) || 'Condition?';

  return (
    <div
      className={`relative px-5 py-3.5 rounded-2xl bg-gradient-to-br from-amber-950/80 via-slate-900/90 to-amber-950/70 border transition-all duration-200 shadow-xl backdrop-blur-md min-w-[190px] max-w-[280px] cursor-grab active:cursor-grabbing ${
        selected
          ? 'border-amber-400 ring-2 ring-amber-400/40 ring-offset-2 ring-offset-slate-950 scale-105'
          : 'border-amber-500/50 hover:border-amber-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-amber-400 border border-slate-900 rounded-full"
      />

      <div className="flex items-center gap-2 mb-1.5 justify-center">
        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 font-mono">
          Decision / Branch
        </span>
      </div>

      <div className="text-center">
        <p className="font-mono text-xs font-semibold text-amber-100 break-words leading-relaxed select-none">
          {label}
        </p>
      </div>

      {/* Main bottom handle (True / primary branch) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-2.5 h-2.5 bg-amber-400 border border-slate-900 rounded-full"
      />

      {/* Side handle for False / alternative branch */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-2.5 h-2.5 bg-rose-400 border border-slate-900 rounded-full"
      />
    </div>
  );
};
