import React, { useEffect, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useEditorStore } from '../../store/editor-store';
import { TerminalNode } from './nodes/TerminalNode';
import { ProcessNode } from './nodes/ProcessNode';
import { DecisionNode } from './nodes/DecisionNode';
import { InputOutputNode } from './nodes/InputOutputNode';
import { SubroutineNode } from './nodes/SubroutineNode';
import { RecursiveCallNode } from './nodes/RecursiveCallNode';
import { RecursionDetailPanel } from './RecursionDetailPanel';
import {
  ArrowDownUp,
  ArrowRightLeft,
  Download,
  FunctionSquare,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  HelpCircle,
  X,
} from 'lucide-react';

const ConnectorNode: React.FC = () => (
  <div className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600">
    <Handle type="target" position={Position.Top} className="opacity-0 w-0 h-0" />
    <Handle type="source" position={Position.Bottom} className="opacity-0 w-0 h-0" />
  </div>
);

const nodeTypes = {
  start: TerminalNode,
  end: TerminalNode,
  terminal: TerminalNode,
  process: ProcessNode,
  decision: DecisionNode,
  input: InputOutputNode,
  output: InputOutputNode,
  subprocess: SubroutineNode,
  connector: ConnectorNode,
  'recursive-call': RecursiveCallNode,
};

// Inner canvas controls using useReactFlow
const FlowchartControlsOverlay: React.FC = () => {
  const { fitView, zoomIn, zoomOut, zoomTo } = useReactFlow();
  const [showLegend, setShowLegend] = useState(false);

  return (
    <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1 backdrop-blur-md shadow-xl select-none">
      <button
        onClick={() => fitView({ padding: 0.2, duration: 300 })}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Fit Flowchart in View"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => zoomIn({ duration: 200 })}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Zoom In"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => zoomOut({ duration: 200 })}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Zoom Out"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => zoomTo(1, { duration: 200 })}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Reset Zoom to 100%"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      <span className="w-px h-4 bg-slate-800 my-auto" />

      {/* Legend Popover Toggle */}
      <div className="relative">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`p-1.5 rounded-lg transition-colors ${
            showLegend
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Flowchart Symbols Legend"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {showLegend && (
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl text-xs z-30 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="font-bold text-slate-200">Symbols Legend</span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-2 rounded-full bg-emerald-500/80 border border-emerald-400 shrink-0" />
                <span className="text-slate-300">Terminal: Start / End</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-2.5 rounded bg-cyan-900 border border-cyan-500 shrink-0" />
                <span className="text-slate-300">Process: Statement / Assignment</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rotate-45 bg-amber-900 border border-amber-500 shrink-0" />
                <span className="text-slate-300">Decision: If condition / Loop branch</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-2.5 skew-x-12 bg-sky-900 border border-sky-500 shrink-0" />
                <span className="text-slate-300">Input / Output: Scanf, Printf, I/O</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-2.5 rounded bg-indigo-900 border border-indigo-500 shrink-0" />
                <span className="text-slate-300">Function: Routine invocation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-2.5 rounded bg-purple-900 border border-purple-400 shrink-0" />
                <span className="text-slate-300">Recursive Call: Self-referential</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FlowchartViewerContent: React.FC = () => {
  const {
    programIR,
    flowProgram,
    activeGraphId,
    activeGraph,
    layoutResult,
    layoutDirection,
    selectedNodeId,
    executionState,
    setLayoutDirection,
    setActiveGraphId,
    selectNode,
    isProcessing,
  } = useEditorStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Synchronize layout results into interactive nodes & edges
  useEffect(() => {
    if (!layoutResult) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const currentExecNodeId = executionState?.currentFlowNodeId;

    const newNodes: Node[] = layoutResult.nodes.map((n) => {
      const isSelected = n.id === selectedNodeId;
      const isExecuting = n.id === currentExecNodeId;

      return {
        id: n.id,
        type: n.flowNode.type,
        position: { x: n.x, y: n.y },
        data: {
          label: n.flowNode.label,
          type: n.flowNode.type,
          metadata: n.flowNode.metadata,
          isExecuting,
        },
        selected: isSelected || isExecuting,
      };
    });

    const newEdges: Edge[] = layoutResult.edges.map((e) => {
      let strokeColor = '#64748b'; // slate-500
      let labelBgColor = '#1e293b';
      let labelTextColor = '#94a3b8';
      let animated = false;

      if (e.branch === 'true') {
        strokeColor = '#10b981'; // emerald-500
        labelBgColor = '#064e3b';
        labelTextColor = '#6ee7b7';
      } else if (e.branch === 'false') {
        strokeColor = '#f43f5e'; // rose-500
        labelBgColor = '#881337';
        labelTextColor = '#fda4af';
      }

      if ((e as { isLoopBack?: boolean }).isLoopBack || e.label?.toLowerCase().includes('loop')) {
        strokeColor = '#f59e0b'; // amber-500
        animated = true;
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated,
        label: e.label,
        labelStyle: {
          fill: labelTextColor,
          fontWeight: 600,
          fontSize: 11,
          fontFamily: 'monospace',
        },
        labelBgStyle: {
          fill: labelBgColor,
          fillOpacity: 0.9,
          rx: 4,
          ry: 4,
        },
        style: {
          stroke: strokeColor,
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 14,
          height: 14,
        },
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [layoutResult, selectedNodeId, executionState?.currentFlowNodeId, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Export Flowchart as JSON
  const handleExportJSON = () => {
    if (!activeGraph) return;
    const blob = new Blob([JSON.stringify(activeGraph, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeGraph.name || 'flowchart'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Top Flow Toolbar */}
      <div className="h-10 border-b border-slate-800 bg-slate-900/90 px-3 sm:px-4 flex items-center justify-between z-10 select-none">
        {/* Function Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold mr-1 shrink-0">
            <FunctionSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xs:inline">Function:</span>
          </div>

          {flowProgram && flowProgram.graphs.length > 0 ? (
            flowProgram.graphs.map((g) => {
              const fnIR = programIR?.functions.find((f) => f.name === g.name);
              const isRec = fnIR?.recursion?.isRecursive;

              return (
                <button
                  key={g.id}
                  onClick={() => setActiveGraphId(g.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all duration-150 flex items-center gap-1.5 shrink-0 ${
                    g.id === activeGraphId
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{g.name}()</span>
                    {isRec && (
                      <span
                        className="text-amber-400 font-bold ml-0.5 text-xs animate-[pulse_2s_infinite]"
                        title="Recursive function"
                      >
                        ↻
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                    {g.nodes.length}
                  </span>
                </button>
              );
            })
          ) : (
            <span className="text-xs text-slate-500 italic">No functions detected</span>
          )}
        </div>

        {/* Viewport & Layout Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Orientation Toggle */}
          <button
            onClick={() => setLayoutDirection(layoutDirection === 'DOWN' ? 'RIGHT' : 'DOWN')}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            title="Toggle Flowchart Layout Direction"
          >
            {layoutDirection === 'DOWN' ? (
              <>
                <ArrowDownUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Vertical</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Horizontal</span>
              </>
            )}
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            disabled={!activeGraph}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            title="Export Flowchart Graph as JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <RecursionDetailPanel />

        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.15}
            maxZoom={2.5}
            defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
            className="bg-slate-950"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#1e293b"
            />
            <FlowchartControlsOverlay />
          </ReactFlow>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
                <p className="text-sm font-medium text-slate-400">
                  Synthesizing flowchart from code...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 max-w-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
                  <FunctionSquare className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-300">No Flowchart Available</p>
                <p className="text-xs text-slate-500">
                  Write or paste source code in the editor to automatically generate an interactive visual flowchart.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const FlowchartViewer: React.FC = () => {
  return (
    <ReactFlowProvider>
      <FlowchartViewerContent />
    </ReactFlowProvider>
  );
};
