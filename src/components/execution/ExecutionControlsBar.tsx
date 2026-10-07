import React from 'react';
import { useEditorStore } from '../../store/editor-store';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Gauge,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const ExecutionControlsBar: React.FC = () => {
  const {
    visualEngine,
    executionState,
    isAutoStepping,
    executionSpeedMs,
    stepExecutionForward,
    stepExecutionBackward,
    playExecution,
    pauseExecution,
    resetExecution,
    setExecutionSpeed,
    goToExecutionStep,
  } = useEditorStore();

  const totalSteps = visualEngine?.getTotalSteps() || 1;
  const currentStep = executionState?.stepIndex ?? 0;
  const status = executionState?.status || 'idle';

  const speeds = [
    { label: '0.5x', ms: 1600 },
    { label: '1x', ms: 800 },
    { label: '2x', ms: 400 },
    { label: '4x', ms: 150 },
  ];

  return (
    <div className="h-14 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 flex items-center justify-between z-20 select-none shadow-lg">
      {/* Left: Step Controls (Reset, Step Back, Play/Pause, Step Forward) */}
      <div className="flex items-center gap-2">
        {/* Reset */}
        <button
          onClick={resetExecution}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          title="Reset to beginning"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Step Backward */}
        <button
          onClick={stepExecutionBackward}
          disabled={currentStep <= 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
          title="Step Backward (Prev Step)"
        >
          <SkipBack className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Step Back</span>
        </button>

        {/* Run / Pause Button */}
        <button
          onClick={isAutoStepping ? pauseExecution : playExecution}
          disabled={status === 'completed' || status === 'error'}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-40 ${
            isAutoStepping
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 shadow-emerald-500/20'
          }`}
          title={isAutoStepping ? 'Pause auto-execution' : 'Run / Auto Step'}
        >
          {isAutoStepping ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-slate-950" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Run</span>
            </>
          )}
        </button>

        {/* Step Forward */}
        <button
          onClick={stepExecutionForward}
          disabled={currentStep >= totalSteps - 1 || status === 'waiting-for-input'}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-40"
          title="Step Forward (Next Step)"
        >
          <SkipForward className="w-3.5 h-3.5" />
          <span>Step</span>
        </button>
      </div>

      {/* Middle: Step Progress Scrubber & Step Counter */}
      <div className="hidden md:flex items-center gap-3 flex-1 max-w-xs mx-4">
        <span className="text-[11px] font-mono font-medium text-slate-400 whitespace-nowrap">
          Step {currentStep + 1} / {totalSteps}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSteps - 1)}
          value={currentStep}
          onChange={(e) => goToExecutionStep(Number(e.target.value))}
          className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
      </div>

      {/* Right: Execution Speed & Status Indicator */}
      <div className="flex items-center gap-3">
        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
          <div className="px-1.5 text-slate-400 flex items-center" title="Execution Speed">
            <Gauge className="w-3 h-3" />
          </div>
          {speeds.map((s) => (
            <button
              key={s.label}
              onClick={() => setExecutionSpeed(s.ms)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                executionSpeedMs === s.ms
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-medium">
          {status === 'running' && isAutoStepping && (
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Running
            </span>
          )}
          {status === 'paused' && !isAutoStepping && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Paused
            </span>
          )}
          {status === 'waiting-for-input' && (
            <span className="flex items-center gap-1 text-cyan-400 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Input Needed
            </span>
          )}
          {status === 'completed' && (
            <span className="flex items-center gap-1 text-blue-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Completed
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 text-rose-400 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Limit / Error
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
