import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/editor-store';
import {
  RotateCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Code,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  simulateStaticRecursion,
  type SimulationResult,
  type SimulationStep,
} from '../../core/analysis/recursion-analyzer';

export const RecursionDetailPanel: React.FC = () => {
  const { programIR, activeGraph, highlightLines } = useEditorStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'analysis' | 'simulation'>('analysis');

  // Simulation State
  const [initialN, setInitialN] = useState<number>(4);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const playTimerRef = useRef<number | null>(null);

  // Find active function in programIR
  const currentFn = programIR?.functions.find(
    (f) => f.name === activeGraph?.name
  );

  const recursion = currentFn?.recursion;

  // Re-run simulation when function or initialN changes
  useEffect(() => {
    if (currentFn && recursion?.isRecursive) {
      const paramName = currentFn.parameters[0]?.name ?? 'n';
      const initialArgs: Record<string, number> = { [paramName]: initialN };
      if (currentFn.parameters.length > 1) {
        currentFn.parameters.slice(1).forEach((p, idx) => {
          initialArgs[p.name] = idx === 0 ? 0 : 1;
        });
      }
      try {
        const res = simulateStaticRecursion(currentFn, initialArgs, 100);
        setSimResult(res);
        setCurrentStepIdx(0);
        setIsPlaying(false);
      } catch (err) {
        console.error('Simulation error', err);
      }
    } else {
      setSimResult(null);
    }
  }, [currentFn, recursion, initialN]);

  // Handle Play/Pause timer
  useEffect(() => {
    if (isPlaying && simResult && simResult.steps.length > 0) {
      playTimerRef.current = window.setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= simResult.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, simResult]);

  if (!recursion || !recursion.isRecursive || !currentFn) {
    return null;
  }

  const handleHighlight = (line?: number) => {
    if (line !== undefined) {
      highlightLines([line]);
    }
  };

  const currentStep: SimulationStep | undefined = simResult?.steps[currentStepIdx];

  return (
    <div className="absolute right-4 top-16 z-20 w-80 sm:w-96 max-h-[85%] flex flex-col bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden transition-all duration-200">
      {/* Header Banner */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-rose-950/70 border-b border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
            <RotateCw className="w-3.5 h-3.5 animate-[spin_8s_linear_infinite]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-300 font-mono">
                {currentFn.name}()
              </span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ↻ Recursive
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'analysis'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Analysis</span>
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'simulation'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Call Stack Simulation</span>
            </button>
          </div>

          {/* Tab 1: Analysis Content */}
          {activeTab === 'analysis' && (
            <div className="p-4 space-y-3.5 overflow-y-auto max-h-[460px] text-xs font-sans">
              {/* Type */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <span className="text-slate-400">Recursion Type</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  Direct Recursion
                </span>
              </div>

              {/* Base Case(s) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Likely Base Case
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    (heuristic detection)
                  </span>
                </div>
                {recursion.baseCases.length > 0 ? (
                  recursion.baseCases.map((bc, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleHighlight(bc.sourceLocation?.startLine)}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-400 cursor-pointer group transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-emerald-300 font-medium">
                          {bc.conditionText}
                        </span>
                        {bc.sourceLocation && (
                          <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 flex items-center gap-1">
                            <Code className="w-3 h-3" />
                            line {bc.sourceLocation.startLine}
                          </span>
                        )}
                      </div>
                      {bc.returnText && (
                        <div className="mt-1 text-slate-400 text-[11px] font-mono">
                          return <span className="text-emerald-200">{bc.returnText}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>No obvious base case detected. Ensure termination condition exists.</span>
                  </div>
                )}
              </div>

              {/* Recursive Case(s) */}
              <div className="space-y-1.5">
                <span className="text-slate-400 flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-amber-400" />
                  Recursive Case
                </span>
                {recursion.recursiveCases.length > 0 ? (
                  recursion.recursiveCases.map((rc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30"
                    >
                      <div className="font-mono text-amber-300 font-medium">
                        {rc.conditionText}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="font-mono text-slate-400 text-[11px]">
                    Unconditional recursive body
                  </div>
                )}
              </div>

              {/* Recursive Calls */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Recursive Calls</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 font-mono text-[10px]">
                    {recursion.recursiveCallCount} call site{recursion.recursiveCallCount > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1">
                  {recursion.recursiveCalls.map((call, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleHighlight(call.sourceLocation?.startLine)}
                      className="w-full p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between text-left transition-all group"
                    >
                      <span className="font-mono text-amber-300 text-xs font-semibold">
                        {call.functionName}({call.argumentStrings.join(', ')})
                      </span>
                      {call.sourceLocation && (
                        <span className="text-[10px] text-slate-500 group-hover:text-amber-400 flex items-center gap-1">
                          <Code className="w-3 h-3" />
                          line {call.sourceLocation.startLine}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Educational Simulation */}
          {activeTab === 'simulation' && (
            <div className="p-4 space-y-3 overflow-y-auto max-h-[460px] text-xs">
              {/* Simulation Configuration */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <label className="text-slate-400 font-medium">Initial Argument (n):</label>
                <div className="flex items-center gap-1">
                  {[2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        setInitialN(val);
                        setIsPlaying(false);
                      }}
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all ${
                        initialN === val
                          ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIdx((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={currentStepIdx === 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                    title="Step backward"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center gap-1 shadow-sm"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Play</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIdx((prev) =>
                        simResult ? Math.min(simResult.steps.length - 1, prev + 1) : prev
                      );
                    }}
                    disabled={!simResult || currentStepIdx >= simResult.steps.length - 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                    title="Step forward"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Step {currentStepIdx + 1} / {simResult?.steps.length ?? 0}
                  </span>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIdx(0);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Reset simulation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Current Step Description */}
              {currentStep && (
                <div className="p-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-cyan-200 font-mono text-[11px] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{currentStep.description}</span>
                </div>
              )}

              {/* Call Stack Visualizer */}
              <div className="space-y-1.5">
                <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                  Call Stack (Depth: {currentStep?.frame.depth ?? 1})
                </span>
                <div className="space-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800 min-h-[120px] max-h-[180px] overflow-y-auto flex flex-col-reverse justify-end">
                  {simResult?.steps.slice(0, currentStepIdx + 1).map((step, idx) => {
                    const isCurrent = idx === currentStepIdx;
                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg font-mono text-xs flex items-center justify-between transition-all ${
                          isCurrent
                            ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 font-bold scale-[1.01]'
                            : 'bg-slate-900/80 border border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">#{step.frame.id}</span>
                          <span>{step.frame.argsString}</span>
                          {step.frame.isBaseCase && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              BASE CASE
                            </span>
                          )}
                        </div>
                        {step.frame.result !== undefined && (
                          <span className="text-emerald-400 font-bold font-mono">
                            → {step.frame.result}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Final Result / Termination Notice */}
              {simResult && currentStepIdx === simResult.steps.length - 1 && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center justify-between">
                  <span className="font-semibold">Unwinding Complete!</span>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    Result = {simResult.finalResult}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
