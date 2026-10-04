import React, { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
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
import {
  ArrowDownUp,
  ArrowRightLeft,
  Download,
  FunctionSquare,
  Sparkles,
} from 'lucide-react';

const ConnectorNode: React.FC = () => (
  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500/80 border border-slate-700">
    <Handle type="target" position={Position.Top} className="opacity-0" />
    <Handle type="source" position={Position.Bottom} className="opacity-0" />
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
};

export const FlowchartViewer: React.FC = () => {
  const {
    flowProgram,
    activeGraphId,
    activeGraph,
    layoutResult,
    layoutDirection,
    selectedNodeId,
    setLayoutDirection,
    setActiveGraphId,
    selectNode,
    isProcessing,
  } = useEditorStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Synchronize layout results into interactive, draggable nodes & edges
  useEffect(() => {
    if (!layoutResult) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node[] = layoutResult.nodes.map((n) => ({
      id: n.id,
      type: n.flowNode.type,
      position: { x: n.x, y: n.y },
      data: {
        label: n.flowNode.label,
        type: n.flowNode.type,
        metadata: n.flowNode.metadata,
      },
      selected: n.id === selectedNodeId,
    }));

    const newEdges: Edge[] = layoutResult.edges.map((e) => {
      let strokeColor = '#64748b'; // slate-500
      let labelBgColor = '#1e293b';
      let labelTextColor = '#94a3b8';
      let animated = false;

      if (e.branch === 'true') {
        strokeColor = '#10b981'; // emerald-500
        labelBgColor = '#064e3b';
        labelTextColor = '#a7f3d0';
      } else if (e.branch === 'false') {
        strokeColor = '#f43f5e'; // rose-500
        labelBgColor = '#881337';
        labelTextColor = '#fecdd3';
      } else if (e.branch === 'loop-back') {
        strokeColor = '#38bdf8'; // sky-400
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
  }, [layoutResult, setNodes, setEdges]);

  // Sync selection without resetting dragged node positions
  useEffect(() => {
    setNodes((prevNodes) =>
      prevNodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

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
    <div className="relative w-full h-full bg-slate-950 flex flex-col overflow-hidden">
      {/* Function Tabs & Layout Controls Header */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 flex items-center justify-between z-10 select-none">
        {/* Function Tabs for Multi-function programs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-2">
            <FunctionSquare className="w-4 h-4 text-cyan-400" />
            <span>Function:</span>
          </div>

          {flowProgram && flowProgram.graphs.length > 0 ? (
            flowProgram.graphs.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGraphId(g.id)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  g.id === activeGraphId
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <span>{g.name}()</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                  {g.nodes.length}
                </span>
              </button>
            ))
          ) : (
            <span className="text-xs text-slate-500 italic">No functions detected</span>
          )}
        </div>

        {/* Viewport & Layout Actions */}
        <div className="flex items-center gap-2">
          {/* Orientation Toggle */}
          <button
            onClick={() => setLayoutDirection(layoutDirection === 'DOWN' ? 'RIGHT' : 'DOWN')}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            title="Toggle Flowchart Layout Direction"
          >
            {layoutDirection === 'DOWN' ? (
              <>
                <ArrowDownUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Vertical</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                <span>Horizontal</span>
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
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodesDraggable={true}
            elementsSelectable={true}
            fitView
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.5}
              color="#334155"
              className="bg-slate-950"
            />
            <Controls className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl [&>button]:border-slate-800 [&>button]:fill-slate-300 [&>button:hover]:bg-slate-800" />
            <MiniMap
              nodeStrokeColor="#475569"
              nodeColor="#1e293b"
              maskColor="rgba(15, 23, 42, 0.75)"
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl"
            />
          </ReactFlow>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-slate-400">Synthesizing Flowchart...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 max-w-sm">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-300">Ready to Generate</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter or select any C, C++, Python, or Java program to generate an interactive control-flow diagram automatically.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
