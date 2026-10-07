import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';

export const DecisionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const label = (data.label as string) || 'Condition?';
  const isExecuting = Boolean(data.isExecuting);

  return (
    <div
      className={`relative flex items-center justify-center min-w-[210px] max-w-[320px] min-h-[96px] cursor-grab active:cursor-grabbing transition-transform duration-200 ${
        isExecuting
          ? 'scale-110 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]'
          : selected
            ? 'scale-105'
            : 'hover:scale-[1.02]'
      }`}
    >
      {/* SVG Diamond (Rhombus) Symbol */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible drop-shadow-xl"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="decisionDiamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isExecuting ? '#064e3b' : '#451a03'} stopOpacity="0.9" />
            <stop offset="50%" stopColor="#0f172a" stopOpacity="0.96" />
            <stop offset="100%" stopColor={isExecuting ? '#064e3b' : '#451a03'} stopOpacity="0.88" />
          </linearGradient>
          {(selected || isExecuting) && (
            <filter id="decisionSelectedGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="4"
                floodColor={isExecuting ? '#34d399' : '#fbbf24'}
                floodOpacity="0.8"
              />
            </filter>
          )}
        </defs>
        <polygon
          points="50,2 98,50 50,98 2,50"
          fill="url(#decisionDiamondGradient)"
          stroke={isExecuting ? '#34d399' : selected ? '#fbbf24' : 'rgba(245, 158, 11, 0.7)'}
          strokeWidth={isExecuting ? '3' : selected ? '2.5' : '1.5'}
          strokeLinejoin="round"
          filter={selected || isExecuting ? 'url(#decisionSelectedGlow)' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Target handle at Top Apex */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 bg-amber-400 border border-slate-900 rounded-full"
      />

      {/* Content centered in diamond's inscribed area */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 py-3 text-center pointer-events-none select-none">
        <div className="flex items-center gap-1.5 mb-1 justify-center">
          <HelpCircle className={`w-3.5 h-3.5 shrink-0 ${isExecuting ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${isExecuting ? 'text-emerald-300' : 'text-amber-400/90'}`}>
            Decision
          </span>
        </div>

        <p className="font-mono text-xs font-semibold text-amber-100 break-words leading-relaxed max-w-[170px]">
          {label}
        </p>

        {isExecuting && (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 animate-pulse mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Executing
          </span>
        )}
      </div>

      {/* Primary Source handle at Bottom Apex */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-2.5 h-2.5 bg-amber-400 border border-slate-900 rounded-full"
      />

      {/* Alternative Source handle at Right Apex */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-2.5 h-2.5 bg-rose-400 border border-slate-900 rounded-full"
      />

      {/* Alternative Source handle at Left Apex */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="w-2.5 h-2.5 bg-rose-400 border border-slate-900 rounded-full"
      />
    </div>
  );
};
