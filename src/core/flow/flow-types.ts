/**
 * Flow IR — Language-independent flowchart graph representation.
 *
 * This is completely independent of React Flow. React Flow is only
 * the rendering layer that consumes this data.
 */

import type { SourceLocation } from '../ir/source-location';

// ─── Flow Node Types ─────────────────────────────────────────────

export type FlowNodeType =
  | 'start'
  | 'end'
  | 'process'
  | 'input'
  | 'output'
  | 'decision'
  | 'subprocess'
  | 'connector'
  | 'recursive-call';

// ─── Flow Node ───────────────────────────────────────────────────

export interface FlowNode {
  readonly id: string;
  readonly type: FlowNodeType;
  readonly label: string;
  readonly metadata?: FlowNodeMetadata;
}

export interface FlowNodeMetadata {
  readonly sourceLocation?: SourceLocation;
  readonly statementKind?: string;
  readonly functionName?: string;
  readonly recursive?: boolean;
  readonly recursiveCall?: {
    readonly functionName: string;
    readonly argumentStrings: readonly string[];
  };
  /** Additional custom data for the node */
  readonly data?: Record<string, unknown>;
}

// ─── Flow Edge Types ─────────────────────────────────────────────

export type FlowEdgeBranch = 'true' | 'false' | 'default' | 'case' | 'loop-back' | 'normal';

export interface FlowEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label?: string;
  readonly branch?: FlowEdgeBranch;
}

// ─── Flow Graph ──────────────────────────────────────────────────

export interface FlowGraph {
  readonly id: string;
  readonly name: string;
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
}

// ─── Flow Graph for Multiple Functions ───────────────────────────

export interface FlowProgram {
  readonly graphs: readonly FlowGraph[];
  readonly mainGraphId?: string;
}

// ─── Constructors ────────────────────────────────────────────────

let nodeCounter = 0;
let edgeCounter = 0;

export function resetFlowCounters(): void {
  nodeCounter = 0;
  edgeCounter = 0;
}

export function createFlowNode(
  type: FlowNodeType,
  label: string,
  metadata?: FlowNodeMetadata
): FlowNode {
  return {
    id: `node_${nodeCounter++}`,
    type,
    label,
    metadata,
  };
}

export function createFlowNodeWithId(
  id: string,
  type: FlowNodeType,
  label: string,
  metadata?: FlowNodeMetadata
): FlowNode {
  return { id, type, label, metadata };
}

export function createFlowEdge(
  source: string,
  target: string,
  options?: { label?: string; branch?: FlowEdgeBranch }
): FlowEdge {
  return {
    id: `edge_${edgeCounter++}`,
    source,
    target,
    label: options?.label,
    branch: options?.branch,
  };
}

export function createFlowGraph(
  name: string,
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[]
): FlowGraph {
  return {
    id: `graph_${name}`,
    name,
    nodes,
    edges,
  };
}

export function createFlowProgram(
  graphs: readonly FlowGraph[],
  mainGraphId?: string
): FlowProgram {
  return { graphs, mainGraphId };
}

// ─── Graph Utilities ─────────────────────────────────────────────

/**
 * Finds a node by ID in a flow graph.
 */
export function findFlowNode(
  graph: FlowGraph,
  nodeId: string
): FlowNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

/**
 * Gets all edges entering a node.
 */
export function getIncomingEdges(
  graph: FlowGraph,
  nodeId: string
): readonly FlowEdge[] {
  return graph.edges.filter((e) => e.target === nodeId);
}

/**
 * Gets all edges leaving a node.
 */
export function getOutgoingEdges(
  graph: FlowGraph,
  nodeId: string
): readonly FlowEdge[] {
  return graph.edges.filter((e) => e.source === nodeId);
}

/**
 * Finds the start node of a flow graph.
 */
export function findStartNode(graph: FlowGraph): FlowNode | undefined {
  return graph.nodes.find((n) => n.type === 'start');
}

/**
 * Finds all end nodes of a flow graph.
 */
export function findEndNodes(graph: FlowGraph): readonly FlowNode[] {
  return graph.nodes.filter((n) => n.type === 'end');
}

/**
 * Validates a flow graph for basic consistency.
 */
export function validateFlowGraph(graph: FlowGraph): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  // Check for duplicate node IDs
  if (nodeIds.size !== graph.nodes.length) {
    errors.push('Duplicate node IDs detected');
  }

  // Check edges reference existing nodes
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references non-existent source node ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references non-existent target node ${edge.target}`);
    }
  }

  // Check for exactly one start node
  const startNodes = graph.nodes.filter((n) => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push('No start node found');
  } else if (startNodes.length > 1) {
    errors.push('Multiple start nodes found');
  }

  // Check for at least one end node
  const endNodes = graph.nodes.filter((n) => n.type === 'end');
  if (endNodes.length === 0) {
    errors.push('No end node found');
  }

  return errors;
}
