/**
 * Editor Store — Zustand state store for FlowShift.
 * Manages source code, intermediate representation, flowchart graph, and code conversion.
 */

import { create } from 'zustand';
import type { FlowProgram, FlowGraph, FlowNode } from '../core/flow/flow-types';
import type { LayoutResult } from '../core/flow/flow-layout';
import { computeLayout } from '../core/flow/flow-layout';
import type { Diagnostic } from '../core/conversion/diagnostics';
import type { ConversionStatus } from '../core/conversion/conversion-result';
import type { ProgramIR } from '../core/ir/program-ir';
import { sourceToFlowchart, convert } from '../core/conversion/converter';
import { executeProgramIR } from '../core/execution/interpreter';
import {
  createVisualExecutionEngine,
  type VisualExecutionEngine,
  type ExecutionStepSnapshot,
} from '../core/execution/visual-engine';
import { SAMPLE_PROGRAMS } from '../data/samples';
import '../languages'; // Initialize language adapters

export type SupportedLanguage = 'c' | 'cpp' | 'python' | 'java';
export type AppViewMode = 'split' | 'flowchart' | 'translate' | 'code' | 'execute' | 'practice';

interface EditorState {
  // Source State
  sourceCode: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;

  // Flowchart & IR State
  programIR: ProgramIR | null;
  flowProgram: FlowProgram | null;
  activeGraphId: string | null;
  activeGraph: FlowGraph | null;
  layoutResult: LayoutResult | null;
  layoutDirection: 'DOWN' | 'RIGHT';
  selectedNodeId: string | null;
  selectedNode: FlowNode | null;

  // Conversion State
  convertedCode: string;
  conversionStatus: ConversionStatus | 'idle';

  // Diagnostics & Status
  diagnostics: Diagnostic[];
  highlightedLines: number[];
  isProcessing: boolean;
  activeView: AppViewMode;
  autoSync: boolean;

  // Terminal State
  terminalOpen: boolean;
  terminalOutput: string[];
  terminalInput: string;
  isExecuting: boolean;
  isWaitingForInput: boolean;
  inputPrompt: string;
  lastExecutionStatus: 'idle' | 'success' | 'error';
  lastExecutionTimeMs: number | null;
  lastExitCode: number | null;

  // Visual Execution State
  visualEngine: VisualExecutionEngine | null;
  executionState: ExecutionStepSnapshot | null;
  executionSpeedMs: number;
  isAutoStepping: boolean;

  // Actions
  highlightLines: (lines: number[]) => void;
  setSourceCode: (code: string) => void;
  setSourceLanguage: (lang: SupportedLanguage) => void;
  setTargetLanguage: (lang: SupportedLanguage) => void;
  setLayoutDirection: (dir: 'DOWN' | 'RIGHT') => void;
  setActiveView: (view: AppViewMode) => void;
  setActiveGraphId: (id: string) => void;
  selectNode: (nodeId: string | null) => void;
  setAutoSync: (enabled: boolean) => void;
  loadSample: (sampleId: string) => void;
  runPipeline: () => Promise<void>;
  runConversion: () => void;
  setTerminalOpen: (open: boolean) => void;
  toggleTerminal: () => void;
  setTerminalInput: (input: string) => void;
  clearTerminal: () => void;
  sendTerminalInput: (val: string) => void;
  killExecution: () => void;
  handleTerminalCommand: (cmd: string) => void;
  runCode: (inputOverride?: string) => Promise<void>;

  // Visual Execution Actions
  initVisualExecution: () => void;
  stepExecutionForward: () => void;
  stepExecutionBackward: () => void;
  playExecution: () => void;
  pauseExecution: () => void;
  resetExecution: () => void;
  setExecutionSpeed: (speedMs: number) => void;
  goToExecutionStep: (stepIndex: number) => void;
  provideExecutionInput: (val: string) => void;
  syncExecutionUI: (state: ExecutionStepSnapshot) => void;

  // UI Shell State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  aboutModalOpen: boolean;
  setAboutModalOpen: (open: boolean) => void;
  samplesMenuOpen: boolean;
  setSamplesMenuOpen: (open: boolean) => void;
}

let activeInputResolver: ((val: string) => void) | null = null;
let executionTimer: number | null = null;

export const useEditorStore = create<EditorState>((set, get) => {
  const initialSample = SAMPLE_PROGRAMS[0];
  const initialLang: SupportedLanguage = 'c';
  const initialCode = initialSample.code[initialLang];

  return {
    sourceCode: initialCode,
    sourceLanguage: initialLang,
    targetLanguage: 'python',

    programIR: null,
    flowProgram: null,
    activeGraphId: null,
    activeGraph: null,
    layoutResult: null,
    layoutDirection: 'DOWN',
    selectedNodeId: null,
    selectedNode: null,

    convertedCode: '',
    conversionStatus: 'idle',

    diagnostics: [],
    highlightedLines: [],
    isProcessing: false,
    activeView: 'split',
    autoSync: true,

    terminalOpen: false,
    terminalOutput: [

      'Type "run" to compile & execute, "help" for commands, or click Run.',
    ],
    terminalInput: '',
    isExecuting: false,
    isWaitingForInput: false,
    inputPrompt: '',
    lastExecutionStatus: 'idle',
    lastExecutionTimeMs: null,
    lastExitCode: null,

    // Visual Execution State
    visualEngine: null,
    executionState: null,
    executionSpeedMs: 800,
    isAutoStepping: false,

    // UI Shell State
    sidebarCollapsed: false,
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    aboutModalOpen: false,
    setAboutModalOpen: (open: boolean) => set({ aboutModalOpen: open }),
    samplesMenuOpen: false,
    setSamplesMenuOpen: (open: boolean) => set({ samplesMenuOpen: open }),

    highlightLines: (lines: number[]) => {
      set({ highlightedLines: lines });
    },

    setSourceCode: (code: string) => {
      set({ sourceCode: code });
      if (get().autoSync) {
        get().runPipeline();
      }
    },

    setSourceLanguage: (lang: SupportedLanguage) => {
      set({ sourceLanguage: lang });
      get().runPipeline();
    },

    setTargetLanguage: (lang: SupportedLanguage) => {
      set({ targetLanguage: lang });
      get().runConversion();
    },

    setLayoutDirection: async (dir: 'DOWN' | 'RIGHT') => {
      set({ layoutDirection: dir });
      const { activeGraph } = get();
      if (activeGraph) {
        const layout = await computeLayout(activeGraph, { direction: dir });
        set({ layoutResult: layout });
      }
    },

    setActiveView: (view: AppViewMode) => {
      set({ activeView: view });
      if (view === 'execute') {
        get().initVisualExecution();
      } else if (get().isAutoStepping) {
        get().pauseExecution();
      }
    },

    setActiveGraphId: async (id: string) => {
      const { flowProgram, layoutDirection } = get();
      if (!flowProgram) return;

      const graph = flowProgram.graphs.find((g) => g.id === id) ?? flowProgram.graphs[0] ?? null;
      if (graph) {
        const layout = await computeLayout(graph, { direction: layoutDirection });
        set({
          activeGraphId: graph.id,
          activeGraph: graph,
          layoutResult: layout,
          selectedNodeId: null,
          selectedNode: null,
          highlightedLines: [],
        });
      }
    },

    selectNode: (nodeId: string | null) => {
      if (!nodeId) {
        set({ selectedNodeId: null, selectedNode: null, highlightedLines: [] });
        return;
      }

      const { activeGraph } = get();
      if (!activeGraph) return;

      const node = activeGraph.nodes.find((n) => n.id === nodeId) ?? null;
      const lines: number[] = [];

      if (node?.metadata?.sourceLocation) {
        const loc = node.metadata.sourceLocation;
        for (let l = loc.startLine; l <= loc.endLine; l++) {
          lines.push(l);
        }
      }

      set({
        selectedNodeId: nodeId,
        selectedNode: node,
        highlightedLines: lines,
      });
    },

    setAutoSync: (enabled: boolean) => {
      set({ autoSync: enabled });
      if (enabled) {
        get().runPipeline();
      }
    },

    loadSample: (sampleId: string) => {
      const sample = SAMPLE_PROGRAMS.find((s) => s.id === sampleId);
      if (!sample) return;

      const lang = get().sourceLanguage;
      const code = sample.code[lang];
      set({ sourceCode: code });
      get().runPipeline();
    },

    runPipeline: async () => {
      const { sourceCode, sourceLanguage, targetLanguage, layoutDirection } = get();
      set({ isProcessing: true });

      try {
        // Step 1: Flowchart generation
        const flowResult = sourceToFlowchart(sourceCode, sourceLanguage);
        let activeGraph: FlowGraph | null = null;
        let layout: LayoutResult | null = null;
        let activeGraphId: string | null = null;

        if (flowResult.success && flowResult.flowProgram && flowResult.flowProgram.graphs.length > 0) {
          activeGraph = flowResult.flowProgram.graphs[0];
          activeGraphId = activeGraph.id;
          layout = await computeLayout(activeGraph, { direction: layoutDirection });
        }

        // Step 2: Automatic target conversion
        const convResult = convert(sourceCode, sourceLanguage, targetLanguage);

        set({
          programIR: flowResult.ir ?? null,
          flowProgram: flowResult.flowProgram,
          activeGraph,
          activeGraphId,
          layoutResult: layout,
          convertedCode: convResult.generatedCode,
          conversionStatus: convResult.status,
          diagnostics: [...flowResult.diagnostics, ...convResult.diagnostics],
          isProcessing: false,
        });

        if (get().activeView === 'execute' && flowResult.ir) {
          get().initVisualExecution();
        }
      } catch (err) {
        set({
          isProcessing: false,
          diagnostics: [
            {
              severity: 'error',
              category: 'internal',
              message: err instanceof Error ? err.message : 'Pipeline execution failed',
            },
          ],
        });
      }
    },

    runConversion: () => {
      const { sourceCode, sourceLanguage, targetLanguage } = get();
      const convResult = convert(sourceCode, sourceLanguage, targetLanguage);
      set({
        convertedCode: convResult.generatedCode,
        conversionStatus: convResult.status,
      });
    },

    setTerminalOpen: (open: boolean) => set({ terminalOpen: open }),
    toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),
    setTerminalInput: (input: string) => set({ terminalInput: input }),
    clearTerminal: () => set({ terminalOutput: [] }),

    sendTerminalInput: (val: string) => {
      if (activeInputResolver) {
        // Paused at an interactive input statement (scanf, cin, input, etc.)
        const lines = [...get().terminalOutput];
        if (lines.length > 0) {
          lines[lines.length - 1] += val;
        } else {
          lines.push(val);
        }
        // User pressed Enter, advance to a fresh line for subsequent program stdout
        lines.push('');
        set({ terminalOutput: lines });
        activeInputResolver(val);
      } else {
        // Not executing: handle as interactive shell command!
        get().handleTerminalCommand(val);
      }
    },

    killExecution: () => {
      if (activeInputResolver) {
        activeInputResolver('0');
      }
      set({
        isExecuting: false,
        isWaitingForInput: false,
        inputPrompt: '',
        terminalOutput: [...get().terminalOutput, '^C', '[Process terminated by user]'],
        lastExecutionStatus: 'error',
        lastExitCode: 130,
      });
    },

    handleTerminalCommand: (cmd: string) => {
      const trimmed = cmd.trim();
      const lines = [...get().terminalOutput, `guest@flowshift:~$ ${cmd}`];

      if (!trimmed) {
        set({ terminalOutput: lines });
        return;
      }

      const [primary, ...args] = trimmed.split(/\s+/);
      const lower = primary.toLowerCase();

      if (lower === 'clear' || lower === 'cls') {
        set({ terminalOutput: [] });
        return;
      }

      if (lower === 'run' || lower === './main' || lower === './a.out') {
        set({ terminalOutput: lines });
        get().runCode();
        return;
      }

      if (lower === 'help') {
        lines.push(
          'FlowShift Shell Commands:',
          '  run, ./main       Compile and execute current program',
          '  clear, cls        Clear terminal screen',
          '  lang <c|cpp|python|java>  Switch current source language',
          '  samples           List available sample programs',
          '  sample <id>       Load sample program (e.g. sample factorial)',
          '  echo <text>       Print text to terminal'
        );
        set({ terminalOutput: lines });
        return;
      }

      if (lower === 'echo') {
        lines.push(args.join(' '));
        set({ terminalOutput: lines });
        return;
      }

      if (lower === 'lang') {
        const target = args[0]?.toLowerCase() as SupportedLanguage;
        if (['c', 'cpp', 'python', 'java'].includes(target)) {
          get().setSourceLanguage(target);
          lines.push(`Switched source language to ${target.toUpperCase()}`);
        } else {
          lines.push(`Unknown language. Options: c, cpp, python, java`);
        }
        set({ terminalOutput: lines });
        return;
      }

      if (lower === 'samples') {
        lines.push('Available Samples:');
        SAMPLE_PROGRAMS.forEach((s) => {
          lines.push(`  - ${s.id.padEnd(20)} [${s.category}] ${s.title}`);
        });
        lines.push("Type 'sample <id>' to load an example.");
        set({ terminalOutput: lines });
        return;
      }

      if (lower === 'sample') {
        const id = args[0]?.toLowerCase();
        const found = SAMPLE_PROGRAMS.find((s) => s.id === id || s.id.includes(id));
        if (found) {
          get().loadSample(found.id);
          lines.push(`Loaded sample: ${found.title}`);
        } else {
          lines.push(`Sample '${id}' not found. Type 'samples' to list available programs.`);
        }
        set({ terminalOutput: lines });
        return;
      }

      lines.push(`bash: ${primary}: command not found. Type 'help' or 'run'.`);
      set({ terminalOutput: lines });
    },

    runCode: async (inputOverride?: string) => {
      set({
        isExecuting: true,
        terminalOpen: true,
        isWaitingForInput: false,
        inputPrompt: '',
      });

      // Synchronize pipeline first
      await get().runPipeline();

      const { programIR, sourceLanguage, diagnostics, terminalInput } = get();
      const inputToUse = inputOverride !== undefined ? inputOverride : terminalInput;

      const fileNames: Record<SupportedLanguage, string> = {
        c: 'main.c',
        cpp: 'main.cpp',
        python: 'script.py',
        java: 'Main.java',
      };
      const langNames: Record<SupportedLanguage, string> = {
        c: 'C (Clang AST / GCC)',
        cpp: 'C++ (G++ AST / Clang)',
        python: 'Python 3 (AST IR)',
        java: 'Java (OpenJDK IR)',
      };

      const fileName = fileNames[sourceLanguage] || 'main';
      const langName = langNames[sourceLanguage] || sourceLanguage;

      const errors = diagnostics.filter((d) => d.severity === 'error');
      if (errors.length > 0) {
        const errorLines = [
          ...get().terminalOutput,
          `$ run ${fileName}`,
          ` Building ${langName}...`,
          `[Compilation Error] Build failed with ${errors.length} error(s):`,
          ...errors.map((e) => `  ✗ Line ${e.sourceLocation?.startLine ?? '?'}: ${e.message}`),
          `[Process terminated with exit code 1]`,
        ];
        set({
          terminalOutput: errorLines,
          isExecuting: false,
          lastExecutionStatus: 'error',
          lastExitCode: 1,
          lastExecutionTimeMs: 0,
        });
        return;
      }

      if (!programIR) {
        set({
          terminalOutput: [
            ...get().terminalOutput,
            `$ run ${fileName}`,
            `[Error] No executable Program IR AST generated. Check your syntax.`,
            `[Process terminated with exit code 1]`,
          ],
          isExecuting: false,
          lastExecutionStatus: 'error',
          lastExitCode: 1,
          lastExecutionTimeMs: 0,
        });
        return;
      }

      // Initial run banner
      const runLines = [
        ...get().terminalOutput,
        `$ run ${fileName}`,
        `Executing....`,
        '',
      ];
      set({ terminalOutput: runLines });

      try {
        const result = await executeProgramIR(
          programIR,
          inputToUse.trim()
            ? inputToUse
            : {
              onOutput: (chunk: string) => {
                const lines = [...get().terminalOutput];
                const cleanChunk = chunk.replace(/\r\n/g, '\n');
                const split = cleanChunk.split('\n');

                if (lines.length > 0 && split.length > 0) {
                  lines[lines.length - 1] += split[0];
                  for (let i = 1; i < split.length; i++) {
                    lines.push(split[i]);
                  }
                } else {
                  lines.push(...split);
                }
                set({ terminalOutput: lines });
              },
              onInput: async (prompt: string): Promise<string> => {
                set({ isWaitingForInput: true, inputPrompt: prompt });
                return new Promise<string>((resolve) => {
                  activeInputResolver = (val: string) => {
                    activeInputResolver = null;
                    set({ isWaitingForInput: false, inputPrompt: '' });
                    resolve(val);
                  };
                });
              },
            }
        );

        const finalLines = [...get().terminalOutput];
        if (finalLines.length > 0 && finalLines[finalLines.length - 1] === '') {
          finalLines.pop();
        }

        if (result.stderr) {
          finalLines.push(`[Runtime Stderr] ${result.stderr}`);
        }

        finalLines.push(
          `[Process completed with exit code ${result.exitCode} in ${result.executionTimeMs}ms]`
        );

        set({
          terminalOutput: finalLines,
          isExecuting: false,
          isWaitingForInput: false,
          lastExecutionStatus: result.exitCode === 0 ? 'success' : 'error',
          lastExitCode: result.exitCode,
          lastExecutionTimeMs: result.executionTimeMs,
        });
      } catch (err: any) {
        set({
          terminalOutput: [
            ...get().terminalOutput,
            `$ run ${fileName}`,
            `[Runtime Exception] ${err.message || String(err)}`,
            `[Process terminated with exit code 1]`,
          ],
          isExecuting: false,
          isWaitingForInput: false,
          lastExecutionStatus: 'error',
          lastExitCode: 1,
          lastExecutionTimeMs: 0,
        });
      }
    },

    syncExecutionUI: (state: ExecutionStepSnapshot) => {
      const lines = state.currentLocation?.startLine ? [state.currentLocation.startLine] : [];
      set({
        highlightedLines: lines,
        selectedNodeId: state.currentFlowNodeId || null,
      });

      if (state.activeGraphId && state.activeGraphId !== get().activeGraphId) {
        get().setActiveGraphId(state.activeGraphId);
      }
    },

    initVisualExecution: () => {
      get().pauseExecution();
      const { programIR, flowProgram } = get();
      if (!programIR) return;

      const engine = createVisualExecutionEngine(programIR, flowProgram || undefined);
      const initial = engine.start();

      set({
        visualEngine: engine,
        executionState: initial,
        isAutoStepping: false,
      });
      get().syncExecutionUI(initial);
    },

    stepExecutionForward: () => {
      const { visualEngine } = get();
      if (!visualEngine) {
        get().initVisualExecution();
        return;
      }

      const nextState = visualEngine.stepForward();
      set({ executionState: nextState });
      get().syncExecutionUI(nextState);

      if (
        nextState.status === 'completed' ||
        nextState.status === 'error' ||
        nextState.status === 'waiting-for-input'
      ) {
        get().pauseExecution();
      }
    },

    stepExecutionBackward: () => {
      const { visualEngine } = get();
      if (!visualEngine) return;

      get().pauseExecution();
      const prevState = visualEngine.stepBackward();
      set({ executionState: prevState });
      get().syncExecutionUI(prevState);
    },

    playExecution: () => {
      if (get().isAutoStepping) return;

      if (!get().visualEngine) {
        get().initVisualExecution();
      }

      const state = get().executionState;
      if (state && (state.status === 'completed' || state.status === 'error')) {
        get().resetExecution();
      }

      set({ isAutoStepping: true });

      if (executionTimer) {
        clearInterval(executionTimer);
      }

      executionTimer = window.setInterval(() => {
        const current = get().executionState;
        const engine = get().visualEngine;

        if (
          !current ||
          current.status === 'completed' ||
          current.status === 'error' ||
          current.status === 'waiting-for-input'
        ) {
          get().pauseExecution();
          return;
        }

        if (engine && engine.getCurrentStepIndex() >= engine.getTotalSteps() - 1) {
          get().pauseExecution();
          return;
        }

        get().stepExecutionForward();
      }, get().executionSpeedMs);
    },

    pauseExecution: () => {
      if (executionTimer) {
        clearInterval(executionTimer);
        executionTimer = null;
      }
      set({ isAutoStepping: false });
    },

    resetExecution: () => {
      const { visualEngine } = get();
      if (!visualEngine) return;

      get().pauseExecution();
      const state = visualEngine.reset();
      set({ executionState: state });
      get().syncExecutionUI(state);
    },

    setExecutionSpeed: (speedMs: number) => {
      set({ executionSpeedMs: speedMs });
      if (get().isAutoStepping) {
        get().pauseExecution();
        get().playExecution();
      }
    },

    goToExecutionStep: (stepIndex: number) => {
      const { visualEngine } = get();
      if (!visualEngine) return;

      get().pauseExecution();
      const state = visualEngine.goToStep(stepIndex);
      set({ executionState: state });
      get().syncExecutionUI(state);
    },

    provideExecutionInput: (val: string) => {
      const { visualEngine } = get();
      if (!visualEngine) return;

      const nextState = visualEngine.provideInput(val);
      set({ executionState: nextState });
      get().syncExecutionUI(nextState);
    },
  };
});
