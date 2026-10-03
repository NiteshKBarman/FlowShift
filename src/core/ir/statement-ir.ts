/**
 * Statement IR — Language-neutral statement representations.
 *
 * Uses discriminated unions for type-safe pattern matching.
 * Covers control flow, I/O, declarations, and expressions.
 */

import type { SourceLocation } from './source-location';
import type { IRExpression } from './expression-ir';
import type { IRType } from './type-ir';

// ─── Statement Kinds ─────────────────────────────────────────────

export type StatementKind =
  | 'variable-declaration'
  | 'expression-statement'
  | 'input'
  | 'output'
  | 'if'
  | 'while'
  | 'for'
  | 'do-while'
  | 'switch'
  | 'return'
  | 'break'
  | 'continue'
  | 'block'
  | 'function-call'
  | 'comment'
  | 'empty'
  | 'unknown-statement';

// ─── Variable Declaration ────────────────────────────────────────

export interface VariableDeclaration {
  readonly kind: 'variable-declaration';
  readonly name: string;
  readonly type: IRType;
  readonly initializer?: IRExpression;
  readonly isConst?: boolean;
  readonly sourceLocation?: SourceLocation;
}

// ─── Expression Statement ────────────────────────────────────────

export interface ExpressionStatement {
  readonly kind: 'expression-statement';
  readonly expression: IRExpression;
  readonly sourceLocation?: SourceLocation;
}

// ─── Input Statement (scanf, cin, input()) ───────────────────────

export interface InputStatement {
  readonly kind: 'input';
  readonly variable: string;
  readonly prompt?: string;
  readonly type?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Output Statement (printf, cout, print()) ───────────────────

export interface OutputStatement {
  readonly kind: 'output';
  readonly expressions: readonly IRExpression[];
  readonly newline?: boolean;
  readonly formatString?: string;
  readonly sourceLocation?: SourceLocation;
}

// ─── If Statement ────────────────────────────────────────────────

export interface IfStatement {
  readonly kind: 'if';
  readonly condition: IRExpression;
  readonly thenBlock: BlockStatement;
  readonly elseBlock?: BlockStatement | IfStatement; // supports else-if chains
  readonly sourceLocation?: SourceLocation;
}

// ─── While Loop ──────────────────────────────────────────────────

export interface WhileStatement {
  readonly kind: 'while';
  readonly condition: IRExpression;
  readonly body: BlockStatement;
  readonly sourceLocation?: SourceLocation;
}

// ─── For Loop ────────────────────────────────────────────────────

export interface ForStatement {
  readonly kind: 'for';
  readonly init?: IRStatement; // variable decl or expression
  readonly condition?: IRExpression;
  readonly update?: IRExpression;
  readonly body: BlockStatement;
  readonly sourceLocation?: SourceLocation;
}

// ─── Do-While Loop ───────────────────────────────────────────────

export interface DoWhileStatement {
  readonly kind: 'do-while';
  readonly condition: IRExpression;
  readonly body: BlockStatement;
  readonly sourceLocation?: SourceLocation;
}

// ─── Switch Statement ────────────────────────────────────────────

export interface SwitchCase {
  readonly value?: IRExpression; // undefined = default case
  readonly body: readonly IRStatement[];
  readonly sourceLocation?: SourceLocation;
}

export interface SwitchStatement {
  readonly kind: 'switch';
  readonly expression: IRExpression;
  readonly cases: readonly SwitchCase[];
  readonly sourceLocation?: SourceLocation;
}

// ─── Return ──────────────────────────────────────────────────────

export interface ReturnStatement {
  readonly kind: 'return';
  readonly value?: IRExpression;
  readonly sourceLocation?: SourceLocation;
}

// ─── Break ───────────────────────────────────────────────────────

export interface BreakStatement {
  readonly kind: 'break';
  readonly sourceLocation?: SourceLocation;
}

// ─── Continue ────────────────────────────────────────────────────

export interface ContinueStatement {
  readonly kind: 'continue';
  readonly sourceLocation?: SourceLocation;
}

// ─── Block ───────────────────────────────────────────────────────

export interface BlockStatement {
  readonly kind: 'block';
  readonly statements: readonly IRStatement[];
  readonly sourceLocation?: SourceLocation;
}

// ─── Function Call Statement ─────────────────────────────────────

export interface FunctionCallStatement {
  readonly kind: 'function-call';
  readonly name: string;
  readonly arguments: readonly IRExpression[];
  readonly sourceLocation?: SourceLocation;
}

// ─── Comment ─────────────────────────────────────────────────────

export interface CommentStatement {
  readonly kind: 'comment';
  readonly text: string;
  readonly sourceLocation?: SourceLocation;
}

// ─── Empty Statement ─────────────────────────────────────────────

export interface EmptyStatement {
  readonly kind: 'empty';
  readonly sourceLocation?: SourceLocation;
}

// ─── Unknown Statement (graceful degradation) ────────────────────

export interface UnknownStatement {
  readonly kind: 'unknown-statement';
  readonly rawText: string;
  readonly sourceLocation?: SourceLocation;
}

// ─── Discriminated Union ─────────────────────────────────────────

export type IRStatement =
  | VariableDeclaration
  | ExpressionStatement
  | InputStatement
  | OutputStatement
  | IfStatement
  | WhileStatement
  | ForStatement
  | DoWhileStatement
  | SwitchStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | BlockStatement
  | FunctionCallStatement
  | CommentStatement
  | EmptyStatement
  | UnknownStatement;

// ─── Statement Constructors ──────────────────────────────────────

export function variableDeclaration(
  name: string,
  type: IRType,
  initializer?: IRExpression,
  options?: { isConst?: boolean; sourceLocation?: SourceLocation }
): VariableDeclaration {
  return {
    kind: 'variable-declaration',
    name,
    type,
    initializer,
    isConst: options?.isConst,
    sourceLocation: options?.sourceLocation,
  };
}

export function expressionStatement(
  expression: IRExpression,
  sourceLocation?: SourceLocation
): ExpressionStatement {
  return { kind: 'expression-statement', expression, sourceLocation };
}

export function inputStatement(
  variable: string,
  options?: { prompt?: string; type?: IRType; sourceLocation?: SourceLocation }
): InputStatement {
  return {
    kind: 'input',
    variable,
    prompt: options?.prompt,
    type: options?.type,
    sourceLocation: options?.sourceLocation,
  };
}

export function outputStatement(
  expressions: readonly IRExpression[],
  options?: { newline?: boolean; formatString?: string; sourceLocation?: SourceLocation }
): OutputStatement {
  return {
    kind: 'output',
    expressions,
    newline: options?.newline,
    formatString: options?.formatString,
    sourceLocation: options?.sourceLocation,
  };
}

export function ifStatement(
  condition: IRExpression,
  thenBlock: BlockStatement,
  elseBlock?: BlockStatement | IfStatement,
  sourceLocation?: SourceLocation
): IfStatement {
  return { kind: 'if', condition, thenBlock, elseBlock, sourceLocation };
}

export function whileStatement(
  condition: IRExpression,
  body: BlockStatement,
  sourceLocation?: SourceLocation
): WhileStatement {
  return { kind: 'while', condition, body, sourceLocation };
}

export function forStatement(
  init: IRStatement | undefined,
  condition: IRExpression | undefined,
  update: IRExpression | undefined,
  body: BlockStatement,
  sourceLocation?: SourceLocation
): ForStatement {
  return { kind: 'for', init, condition, update, body, sourceLocation };
}

export function doWhileStatement(
  condition: IRExpression,
  body: BlockStatement,
  sourceLocation?: SourceLocation
): DoWhileStatement {
  return { kind: 'do-while', condition, body, sourceLocation };
}

export function switchStatement(
  expression: IRExpression,
  cases: readonly SwitchCase[],
  sourceLocation?: SourceLocation
): SwitchStatement {
  return { kind: 'switch', expression, cases, sourceLocation };
}

export function returnStatement(
  value?: IRExpression,
  sourceLocation?: SourceLocation
): ReturnStatement {
  return { kind: 'return', value, sourceLocation };
}

export function breakStatement(sourceLocation?: SourceLocation): BreakStatement {
  return { kind: 'break', sourceLocation };
}

export function continueStatement(sourceLocation?: SourceLocation): ContinueStatement {
  return { kind: 'continue', sourceLocation };
}

export function blockStatement(
  statements: readonly IRStatement[],
  sourceLocation?: SourceLocation
): BlockStatement {
  return { kind: 'block', statements, sourceLocation };
}

export function functionCallStatement(
  name: string,
  args: readonly IRExpression[],
  sourceLocation?: SourceLocation
): FunctionCallStatement {
  return { kind: 'function-call', name, arguments: args, sourceLocation };
}

export function commentStatement(
  text: string,
  sourceLocation?: SourceLocation
): CommentStatement {
  return { kind: 'comment', text, sourceLocation };
}

export function emptyStatement(sourceLocation?: SourceLocation): EmptyStatement {
  return { kind: 'empty', sourceLocation };
}

export function unknownStatement(
  rawText: string,
  sourceLocation?: SourceLocation
): UnknownStatement {
  return { kind: 'unknown-statement', rawText, sourceLocation };
}

// ─── Statement Utilities ─────────────────────────────────────────

/**
 * Gets source location from any statement.
 */
export function getStatementLocation(stmt: IRStatement): SourceLocation | undefined {
  return stmt.sourceLocation;
}

/**
 * Check if a statement is a control flow statement.
 */
export function isControlFlow(stmt: IRStatement): boolean {
  return (
    stmt.kind === 'if' ||
    stmt.kind === 'while' ||
    stmt.kind === 'for' ||
    stmt.kind === 'do-while' ||
    stmt.kind === 'switch'
  );
}

/**
 * Check if a statement is a jump statement.
 */
export function isJump(stmt: IRStatement): boolean {
  return (
    stmt.kind === 'return' ||
    stmt.kind === 'break' ||
    stmt.kind === 'continue'
  );
}
