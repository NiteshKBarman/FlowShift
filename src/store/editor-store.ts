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
import { sourceToFlowchart, convert } from '../core/conversion/converter';
import { SAMPLE_PROGRAMS } from '../data/samples';
import '../languages'; // Initialize language adapters

export type SupportedLanguage = 'c' | 'cpp' | 'python' | 'java';
export type AppViewMode = 'split' | 'flowchart' | 'translate' | 'code';

interface EditorState {
  // Source State
  sourceCode: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;

  // Flowchart State
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

  // Actions
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
}

export const useEditorStore = create<EditorState>((set, get) => {
  const initialSample = SAMPLE_PROGRAMS[0];
  const initialLang: SupportedLanguage = 'c';
  const initialCode = initialSample.code[initialLang];

  return {
    sourceCode: initialCode,
    sourceLanguage: initialLang,
    targetLanguage: 'python',

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
          flowProgram: flowResult.flowProgram,
          activeGraph,
          activeGraphId,
          layoutResult: layout,
          convertedCode: convResult.generatedCode,
          conversionStatus: convResult.status,
          diagnostics: [...flowResult.diagnostics, ...convResult.diagnostics],
          isProcessing: false,
        });
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
  };
});
