/**
 * Flow Layout — Uses ELK.js for automatic graph layout computation.
 *
 * Converts FlowGraph into positioned nodes and edges suitable
 * for rendering by React Flow.
 */

import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { FlowGraph, FlowNode, FlowEdge } from './flow-types';

// ─── Layout Configuration ────────────────────────────────────────

export interface LayoutOptions {
  /** Direction of the graph layout */
  direction?: 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';
  /** Spacing between nodes */
  nodeSpacing?: number;
  /** Spacing between layers/ranks */
  layerSpacing?: number;
  /** Node width */
  nodeWidth?: number;
  /** Node height */
  nodeHeight?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'DOWN',
  nodeSpacing: 50,
  layerSpacing: 80,
  nodeWidth: 200,
  nodeHeight: 60,
};

// ─── Positioned Node/Edge ────────────────────────────────────────

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  flowNode: FlowNode;
}

export interface PositionedEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  branch?: FlowEdge['branch'];
  /** Bend points for edge routing */
  points?: Array<{ x: number; y: number }>;
}

export interface LayoutResult {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  width: number;
  height: number;
}

// ─── Layout Engine ───────────────────────────────────────────────

const elk = new ELK();

/**
 * Computes the layout for a FlowGraph using ELK.js.
 */
export async function computeLayout(
  graph: FlowGraph,
  options?: LayoutOptions
): Promise<LayoutResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const nodeHeights: Record<string, number> = {};
  const nodeWidths: Record<string, number> = {};

  // Compute dimensions based on node type
  for (const node of graph.nodes) {
    const dims = getNodeDimensions(node, opts);
    nodeWidths[node.id] = dims.width;
    nodeHeights[node.id] = dims.height;
  }

  const elkGraph: ElkNode = {
    id: graph.id,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': opts.direction,
      'elk.spacing.nodeNode': String(opts.nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.layerSpacing),
      'elk.layered.spacing.edgeNodeBetweenLayers': '30',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '20',
      'elk.spacing.edgeNode': '25',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.mergeEdges': 'true',
    },
    children: graph.nodes.map((node) => ({
      id: node.id,
      width: nodeWidths[node.id],
      height: nodeHeights[node.id],
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layoutResult = await elk.layout(elkGraph);

  const positionedNodes: PositionedNode[] = (layoutResult.children ?? []).map(
    (child) => {
      const flowNode = graph.nodes.find((n) => n.id === child.id)!;
      return {
        id: child.id,
        x: child.x ?? 0,
        y: child.y ?? 0,
        width: child.width ?? opts.nodeWidth,
        height: child.height ?? opts.nodeHeight,
        flowNode,
      };
    }
  );

  const positionedEdges: PositionedEdge[] = (
    (layoutResult.edges ?? []) as ElkExtendedEdge[]
  ).map((edge) => {
    const flowEdge = graph.edges.find((e) => e.id === edge.id)!;
    const points: Array<{ x: number; y: number }> = [];

    if (edge.sections) {
      for (const section of edge.sections) {
        if (section.startPoint) {
          points.push(section.startPoint);
        }
        if (section.bendPoints) {
          points.push(...section.bendPoints);
        }
        if (section.endPoint) {
          points.push(section.endPoint);
        }
      }
    }

    return {
      id: edge.id,
      source: flowEdge.source,
      target: flowEdge.target,
      label: flowEdge.label,
      branch: flowEdge.branch,
      points: points.length > 0 ? points : undefined,
    };
  });

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    width: layoutResult.width ?? 800,
    height: layoutResult.height ?? 600,
  };
}

// ─── Node Dimensions ─────────────────────────────────────────────

function getNodeDimensions(
  node: FlowNode,
  opts: Required<LayoutOptions>
): { width: number; height: number } {
  // Support both explicit newlines and escaped \n sequences
  const rawLines = node.label.split(/\\n|\n/);
  const lineCount = Math.max(1, rawLines.length);
  const maxLineLength = Math.max(...rawLines.map((l) => l.trim().length), 0);

  // Compute width bounded between 180 and 320 px
  const baseWidth = Math.max(
    opts.nodeWidth,
    Math.min(320, Math.max(180, maxLineLength * 8 + 50))
  );

  switch (node.type) {
    case 'start':
    case 'end':
      return { width: Math.max(150, Math.min(220, baseWidth)), height: 44 };
    case 'decision': {
      const decWidth = Math.max(baseWidth, 180);
      const decHeight = Math.max(76, 48 + lineCount * 20);
      return { width: decWidth, height: decHeight };
    }
    case 'input':
    case 'output': {
      // Header tag (Input/Output) + multiline text + py-3 padding
      const ioHeight = Math.max(80, 52 + lineCount * 20);
      return { width: Math.max(baseWidth, 200), height: ioHeight };
    }
    case 'subprocess': {
      const subHeight = Math.max(68, 44 + lineCount * 20);
      return { width: Math.max(baseWidth, 190), height: subHeight };
    }
    case 'connector':
      return { width: 24, height: 24 };
    case 'process':
    default: {
      const procHeight = Math.max(64, 40 + lineCount * 20);
      return { width: Math.max(baseWidth, 180), height: procHeight };
    }
  }
}

export const layoutFlowGraph = computeLayout;

