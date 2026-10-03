/**
 * Flow Generator — Converts Program IR into Flow IR (flowchart graph).
 *
 * This is the core engine that transforms structured program representation
 * into a directed graph suitable for flowchart visualization.
 */

import type { ProgramIR, IRFunction } from '../ir/program-ir';
import type { IRStatement, BlockStatement } from '../ir/statement-ir';
import { expressionToString } from '../ir/expression-ir';
import {
  type FlowNode,
  type FlowEdge,
  type FlowGraph,
  type FlowProgram,
  createFlowNodeWithId,
  createFlowGraph,
  createFlowProgram,
  resetFlowCounters,
} from './flow-types';

// ─── Generation Context ──────────────────────────────────────────

interface GenerationContext {
  nodes: FlowNode[];
  edges: FlowEdge[];
  nodeIdCounter: number;
  edgeIdCounter: number;
  /** Stack of loop exit targets for break statements */
  breakTargets: string[];
  /** Stack of loop entry/continue targets for continue statements */
  continueTargets: string[];
  /** Target node ID for function termination / return */
  endId?: string;
}

function createContext(): GenerationContext {
  return {
    nodes: [],
    edges: [],
    nodeIdCounter: 0,
    edgeIdCounter: 0,
    breakTargets: [],
    continueTargets: [],
  };
}

function nextNodeId(ctx: GenerationContext, prefix: string = 'n'): string {
  return `${prefix}_${ctx.nodeIdCounter++}`;
}

function nextEdgeId(ctx: GenerationContext): string {
  return `e_${ctx.edgeIdCounter++}`;
}

function addNode(ctx: GenerationContext, node: FlowNode): void {
  ctx.nodes.push(node);
}

function addEdge(
  ctx: GenerationContext,
  source: string,
  target: string,
  label?: string,
  branch?: FlowEdge['branch']
): void {
  ctx.edges.push({
    id: nextEdgeId(ctx),
    source,
    target,
    label,
    branch,
  });
}

// ─── Result type from generating a block ─────────────────────────

interface BlockResult {
  /** The first node ID in this block (entry point) */
  entry: string;
  /** The set of node IDs that need to be connected to whatever comes next.
   *  Empty if all paths end with return/break/continue. */
  exits: string[];
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Generates a FlowProgram from a ProgramIR.
 * Creates one FlowGraph per function.
 */
export function generateFlowProgram(program: ProgramIR): FlowProgram {
  resetFlowCounters();

  const graphs: FlowGraph[] = [];
  let mainGraphId: string | undefined;

  for (const fn of program.functions) {
    const graph = generateFunctionFlowGraph(fn);
    graphs.push(graph);
    if (fn.isMain || fn.name === 'main') {
      mainGraphId = graph.id;
    }
  }

  // If there are global statements and no main function,
  // generate a graph for them
  if (program.globalStatements.length > 0 && !mainGraphId) {
    const ctx = createContext();
    const startId = nextNodeId(ctx, 'start');
    const endId = nextNodeId(ctx, 'end');
    ctx.endId = endId;

    addNode(ctx, createFlowNodeWithId(startId, 'start', 'Start'));
    addNode(ctx, createFlowNodeWithId(endId, 'end', 'End'));

    const body: BlockStatement = {
      kind: 'block',
      statements: program.globalStatements,
    };

    const result = generateBlock(ctx, body);

    addEdge(ctx, startId, result.entry);
    for (const exit of result.exits) {
      addEdge(ctx, exit, endId);
    }

    const graph = createFlowGraph('main', ctx.nodes, ctx.edges);
    graphs.unshift(graph);
    mainGraphId = graph.id;
  }

  return createFlowProgram(graphs, mainGraphId);
}

/**
 * Generates a FlowGraph for a single function.
 */
export function generateFunctionFlowGraph(fn: IRFunction): FlowGraph {
  const ctx = createContext();

  const startId = nextNodeId(ctx, 'start');
  const endId = nextNodeId(ctx, 'end');
  ctx.endId = endId;

  const paramStr = fn.parameters.length > 0
    ? `(${fn.parameters.map(p => p.name).join(', ')})`
    : '';
  const startLabel = `Start: ${fn.name}${paramStr}`;

  addNode(ctx, createFlowNodeWithId(startId, 'start', startLabel, {
    sourceLocation: fn.sourceLocation,
    functionName: fn.name,
  }));
  addNode(ctx, createFlowNodeWithId(endId, 'end', `End: ${fn.name}`, {
    functionName: fn.name,
  }));

  if (fn.body.statements.length === 0) {
    addEdge(ctx, startId, endId);
  } else {
    const result = generateBlock(ctx, fn.body);
    addEdge(ctx, startId, result.entry);
    for (const exit of result.exits) {
      addEdge(ctx, exit, endId);
    }
  }

  return createFlowGraph(fn.name, ctx.nodes, ctx.edges);
}

// ─── Block Generation ────────────────────────────────────────────

function generateBlock(
  ctx: GenerationContext,
  block: BlockStatement
): BlockResult {
  const statements = block.statements.filter(
    (s) => s.kind !== 'empty' && s.kind !== 'comment'
  );

  if (statements.length === 0) {
    // Empty block — create a pass-through node
    const id = nextNodeId(ctx, 'pass');
    addNode(ctx, createFlowNodeWithId(id, 'process', '(empty)', {
      sourceLocation: block.sourceLocation,
    }));
    return { entry: id, exits: [id] };
  }

  let currentExits: string[] = [];
  let entry: string | undefined;

  for (const stmt of statements) {
    const result = generateStatement(ctx, stmt);

    if (!entry) {
      entry = result.entry;
    }

    // Connect previous exits to this statement's entry
    for (const exit of currentExits) {
      addEdge(ctx, exit, result.entry);
    }

    currentExits = result.exits;
  }

  return { entry: entry!, exits: currentExits };
}

// ─── Statement Generation ────────────────────────────────────────

function generateStatement(
  ctx: GenerationContext,
  stmt: IRStatement
): BlockResult {
  switch (stmt.kind) {
    case 'variable-declaration':
      return generateVariableDeclaration(ctx, stmt);
    case 'expression-statement':
      return generateExpressionStatement(ctx, stmt);
    case 'input':
      return generateInput(ctx, stmt);
    case 'output':
      return generateOutput(ctx, stmt);
    case 'if':
      return generateIf(ctx, stmt);
    case 'while':
      return generateWhile(ctx, stmt);
    case 'for':
      return generateFor(ctx, stmt);
    case 'do-while':
      return generateDoWhile(ctx, stmt);
    case 'switch':
      return generateSwitch(ctx, stmt);
    case 'return':
      return generateReturn(ctx, stmt);
    case 'break':
      return generateBreak(ctx, stmt);
    case 'continue':
      return generateContinue(ctx, stmt);
    case 'block':
      return generateBlock(ctx, stmt);
    case 'function-call':
      return generateFunctionCall(ctx, stmt);
    case 'unknown-statement':
      return generateUnknown(ctx, stmt);
    case 'comment':
    case 'empty':
      // Should be filtered, but handle gracefully
      const id = nextNodeId(ctx, 'pass');
      addNode(ctx, createFlowNodeWithId(id, 'process', '(no-op)'));
      return { entry: id, exits: [id] };
  }
}

function generateVariableDeclaration(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'variable-declaration' }
): BlockResult {
  const id = nextNodeId(ctx, 'decl');
  const label = stmt.initializer
    ? `${stmt.name} = ${expressionToString(stmt.initializer)}`
    : `Declare ${stmt.name}`;

  addNode(ctx, createFlowNodeWithId(id, 'process', label, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));

  return { entry: id, exits: [id] };
}

function generateExpressionStatement(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'expression-statement' }
): BlockResult {
  const id = nextNodeId(ctx, 'expr');
  addNode(ctx, createFlowNodeWithId(id, 'process', expressionToString(stmt.expression), {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));
  return { entry: id, exits: [id] };
}

function generateInput(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'input' }
): BlockResult {
  const id = nextNodeId(ctx, 'input');
  const label = stmt.prompt
    ? `Input ${stmt.variable} ("${stmt.prompt}")`
    : `Input ${stmt.variable}`;

  addNode(ctx, createFlowNodeWithId(id, 'input', label, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));
  return { entry: id, exits: [id] };
}

function generateOutput(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'output' }
): BlockResult {
  const id = nextNodeId(ctx, 'output');
  const label = `Output: ${stmt.expressions.map(expressionToString).join(', ')}`;

  addNode(ctx, createFlowNodeWithId(id, 'output', label, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));
  return { entry: id, exits: [id] };
}

function generateIf(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'if' }
): BlockResult {
  const decisionId = nextNodeId(ctx, 'if');
  const condLabel = expressionToString(stmt.condition);

  addNode(ctx, createFlowNodeWithId(decisionId, 'decision', condLabel, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));

  // Then branch
  const thenResult = generateBlock(ctx, stmt.thenBlock);
  addEdge(ctx, decisionId, thenResult.entry, 'Yes', 'true');

  const exits: string[] = [...thenResult.exits];

  // Else branch
  if (stmt.elseBlock) {
    if (stmt.elseBlock.kind === 'if') {
      // else-if chain
      const elseIfResult = generateStatement(ctx, stmt.elseBlock);
      addEdge(ctx, decisionId, elseIfResult.entry, 'No', 'false');
      exits.push(...elseIfResult.exits);
    } else {
      const elseResult = generateBlock(ctx, stmt.elseBlock);
      addEdge(ctx, decisionId, elseResult.entry, 'No', 'false');
      exits.push(...elseResult.exits);
    }
  } else {
    // No else — decision becomes an exit for the "No" branch
    exits.push(decisionId + '_no');
    const mergeId = nextNodeId(ctx, 'merge');
    // Create a connector for the "no" path to flow through
    addNode(ctx, createFlowNodeWithId(mergeId, 'connector', '', {
      statementKind: 'if-merge',
    }));
    addEdge(ctx, decisionId, mergeId, 'No', 'false');
    // Replace the fake exit with the merge connector
    exits.pop();
    exits.push(mergeId);
  }

  return { entry: decisionId, exits };
}

function generateWhile(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'while' }
): BlockResult {
  const decisionId = nextNodeId(ctx, 'while');
  const condLabel = expressionToString(stmt.condition);

  addNode(ctx, createFlowNodeWithId(decisionId, 'decision', condLabel, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));

  const exitId = nextNodeId(ctx, 'while_exit');
  addNode(ctx, createFlowNodeWithId(exitId, 'connector', '', {
    statementKind: 'while-exit',
  }));

  // Push break/continue targets
  ctx.breakTargets.push(exitId);
  ctx.continueTargets.push(decisionId);

  const bodyResult = generateBlock(ctx, stmt.body);
  addEdge(ctx, decisionId, bodyResult.entry, 'Yes', 'true');

  // Loop back
  for (const exit of bodyResult.exits) {
    addEdge(ctx, exit, decisionId, '', 'loop-back');
  }

  // Exit
  addEdge(ctx, decisionId, exitId, 'No', 'false');

  ctx.breakTargets.pop();
  ctx.continueTargets.pop();

  return { entry: decisionId, exits: [exitId] };
}

function generateFor(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'for' }
): BlockResult {
  let entry: string;
  let initExits: string[] = [];

  // Init
  if (stmt.init) {
    const initResult = generateStatement(ctx, stmt.init);
    entry = initResult.entry;
    initExits = initResult.exits;
  } else {
    entry = ''; // will be set to decision
  }

  // Condition
  const decisionId = nextNodeId(ctx, 'for');
  const condLabel = stmt.condition
    ? expressionToString(stmt.condition)
    : 'true';

  addNode(ctx, createFlowNodeWithId(decisionId, 'decision', condLabel, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));

  if (entry === '') {
    entry = decisionId;
  } else {
    for (const exit of initExits) {
      addEdge(ctx, exit, decisionId);
    }
  }

  const exitId = nextNodeId(ctx, 'for_exit');
  addNode(ctx, createFlowNodeWithId(exitId, 'connector', '', {
    statementKind: 'for-exit',
  }));

  // Push break/continue targets
  ctx.breakTargets.push(exitId);

  // For continue, we want to go to the update step (or condition if no update)
  let continueTarget: string;

  // Update
  let updateId: string | undefined;
  if (stmt.update) {
    updateId = nextNodeId(ctx, 'for_update');
    const updateLabel = expressionToString(stmt.update);
    addNode(ctx, createFlowNodeWithId(updateId, 'process', updateLabel, {
      statementKind: 'for-update',
    }));
    addEdge(ctx, updateId, decisionId, '', 'loop-back');
    continueTarget = updateId;
  } else {
    continueTarget = decisionId;
  }

  ctx.continueTargets.push(continueTarget);

  // Body
  const bodyResult = generateBlock(ctx, stmt.body);
  addEdge(ctx, decisionId, bodyResult.entry, 'Yes', 'true');

  for (const exit of bodyResult.exits) {
    if (updateId) {
      addEdge(ctx, exit, updateId);
    } else {
      addEdge(ctx, exit, decisionId, '', 'loop-back');
    }
  }

  // Exit
  addEdge(ctx, decisionId, exitId, 'No', 'false');

  ctx.breakTargets.pop();
  ctx.continueTargets.pop();

  return { entry, exits: [exitId] };
}

function generateDoWhile(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'do-while' }
): BlockResult {
  const exitId = nextNodeId(ctx, 'dowhile_exit');
  addNode(ctx, createFlowNodeWithId(exitId, 'connector', '', {
    statementKind: 'do-while-exit',
  }));

  const decisionId = nextNodeId(ctx, 'dowhile');

  ctx.breakTargets.push(exitId);
  ctx.continueTargets.push(decisionId);

  // Body first
  const bodyResult = generateBlock(ctx, stmt.body);

  // Condition after body
  const condLabel = expressionToString(stmt.condition);
  addNode(ctx, createFlowNodeWithId(decisionId, 'decision', condLabel, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));

  for (const exit of bodyResult.exits) {
    addEdge(ctx, exit, decisionId);
  }

  // Loop back
  addEdge(ctx, decisionId, bodyResult.entry, 'Yes', 'loop-back');

  // Exit
  addEdge(ctx, decisionId, exitId, 'No', 'false');

  ctx.breakTargets.pop();
  ctx.continueTargets.pop();

  return { entry: bodyResult.entry, exits: [exitId] };
}

function generateSwitch(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'switch' }
): BlockResult {
  const switchId = nextNodeId(ctx, 'switch');
  const switchLabel = expressionToString(stmt.expression);

  addNode(ctx, createFlowNodeWithId(switchId, 'decision', `switch(${switchLabel})`, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));

  const exitId = nextNodeId(ctx, 'switch_exit');
  addNode(ctx, createFlowNodeWithId(exitId, 'connector', '', {
    statementKind: 'switch-exit',
  }));

  ctx.breakTargets.push(exitId);

  const exits: string[] = [];

  for (const caseItem of stmt.cases) {
    const caseLabel = caseItem.value
      ? expressionToString(caseItem.value)
      : 'default';

    if (caseItem.body.length === 0) {
      // Fallthrough
      continue;
    }

    const caseBlock: BlockStatement = {
      kind: 'block',
      statements: caseItem.body,
      sourceLocation: caseItem.sourceLocation,
    };

    const caseResult = generateBlock(ctx, caseBlock);
    addEdge(ctx, switchId, caseResult.entry, caseLabel, 'case');
    exits.push(...caseResult.exits);
  }

  ctx.breakTargets.pop();

  // If no explicit exits, connect to exit
  if (exits.length === 0) {
    return { entry: switchId, exits: [exitId] };
  }

  for (const exit of exits) {
    addEdge(ctx, exit, exitId);
  }

  return { entry: switchId, exits: [exitId] };
}

function generateReturn(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'return' }
): BlockResult {
  const id = nextNodeId(ctx, 'return');
  const label = stmt.value
    ? `Return ${expressionToString(stmt.value)}`
    : 'Return';

  addNode(ctx, createFlowNodeWithId(id, 'process', label, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));

  // Return terminates — connect directly to end terminal node
  if (ctx.endId) {
    addEdge(ctx, id, ctx.endId);
  }

  return { entry: id, exits: [] };
}

function generateBreak(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'break' }
): BlockResult {
  const id = nextNodeId(ctx, 'break');
  addNode(ctx, createFlowNodeWithId(id, 'process', 'Break', {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));

  const target = ctx.breakTargets[ctx.breakTargets.length - 1];
  if (target) {
    addEdge(ctx, id, target);
  }

  return { entry: id, exits: [] };
}

function generateContinue(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'continue' }
): BlockResult {
  const id = nextNodeId(ctx, 'continue');
  addNode(ctx, createFlowNodeWithId(id, 'process', 'Continue', {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));

  const target = ctx.continueTargets[ctx.continueTargets.length - 1];
  if (target) {
    addEdge(ctx, id, target, '', 'loop-back');
  }

  return { entry: id, exits: [] };
}

function generateFunctionCall(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'function-call' }
): BlockResult {
  const id = nextNodeId(ctx, 'call');
  const argsStr = stmt.arguments.map(expressionToString).join(', ');
  const label = `${stmt.name}(${argsStr})`;

  addNode(ctx, createFlowNodeWithId(id, 'subprocess', label, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));

  return { entry: id, exits: [id] };
}

function generateUnknown(
  ctx: GenerationContext,
  stmt: IRStatement & { kind: 'unknown-statement' }
): BlockResult {
  const id = nextNodeId(ctx, 'unknown');
  addNode(ctx, createFlowNodeWithId(id, 'process', `⚠ ${stmt.rawText}`, {
    sourceLocation: stmt.sourceLocation,
    statementKind: stmt.kind,
  }));
  return { entry: id, exits: [id] };
}
