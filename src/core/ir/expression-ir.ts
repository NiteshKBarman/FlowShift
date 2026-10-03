/**
 * Expression IR — Language-neutral expression representations.
 *
 * Uses discriminated unions for type-safe pattern matching.
 * Every expression node can carry optional source location metadata.
 */

import type { SourceLocation } from './source-location';
import type { IRType } from './type-ir';

// ─── Expression Node Types ───────────────────────────────────────

export type ExpressionKind =
  | 'literal'
  | 'identifier'
  | 'binary'
  | 'unary'
  | 'logical'
  | 'comparison'
  | 'assignment'
  | 'call'
  | 'array-access'
  | 'member-access'
  | 'cast'
  | 'ternary'
  | 'parenthesized'
  | 'unknown-expression';

// ─── Literal ─────────────────────────────────────────────────────

export type LiteralKind = 'int' | 'float' | 'string' | 'char' | 'bool' | 'null';

export interface LiteralExpression {
  readonly kind: 'literal';
  readonly literalKind: LiteralKind;
  readonly value: string; // string representation for all types
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Identifier ──────────────────────────────────────────────────

export interface IdentifierExpression {
  readonly kind: 'identifier';
  readonly name: string;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Binary Operator ─────────────────────────────────────────────

export type BinaryOperator =
  | '+' | '-' | '*' | '/' | '%'
  | '&' | '|' | '^' | '<<' | '>>'
  | '**';

export interface BinaryExpression {
  readonly kind: 'binary';
  readonly operator: BinaryOperator;
  readonly left: IRExpression;
  readonly right: IRExpression;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Unary Operator ──────────────────────────────────────────────

export type UnaryOperator = '-' | '+' | '!' | '~' | '++' | '--';
export type UnaryPosition = 'prefix' | 'postfix';

export interface UnaryExpression {
  readonly kind: 'unary';
  readonly operator: UnaryOperator;
  readonly position: UnaryPosition;
  readonly operand: IRExpression;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Logical Operator ────────────────────────────────────────────

export type LogicalOperator = '&&' | '||';

export interface LogicalExpression {
  readonly kind: 'logical';
  readonly operator: LogicalOperator;
  readonly left: IRExpression;
  readonly right: IRExpression;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Comparison Operator ─────────────────────────────────────────

export type ComparisonOperator = '==' | '!=' | '<' | '<=' | '>' | '>=';

export interface ComparisonExpression {
  readonly kind: 'comparison';
  readonly operator: ComparisonOperator;
  readonly left: IRExpression;
  readonly right: IRExpression;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Assignment Expression ───────────────────────────────────────

export type AssignmentOperator = '=' | '+=' | '-=' | '*=' | '/=' | '%=';

export interface AssignmentExpression {
  readonly kind: 'assignment';
  readonly operator: AssignmentOperator;
  readonly target: IRExpression;
  readonly value: IRExpression;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Function Call ───────────────────────────────────────────────

export interface CallExpression {
  readonly kind: 'call';
  readonly callee: IRExpression;
  readonly arguments: readonly IRExpression[];
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Array Access ────────────────────────────────────────────────

export interface ArrayAccessExpression {
  readonly kind: 'array-access';
  readonly array: IRExpression;
  readonly index: IRExpression;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Member Access ───────────────────────────────────────────────

export interface MemberAccessExpression {
  readonly kind: 'member-access';
  readonly object: IRExpression;
  readonly member: string;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Cast Expression ─────────────────────────────────────────────

export interface CastExpression {
  readonly kind: 'cast';
  readonly targetType: IRType;
  readonly expression: IRExpression;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Ternary Expression ──────────────────────────────────────────

export interface TernaryExpression {
  readonly kind: 'ternary';
  readonly condition: IRExpression;
  readonly consequent: IRExpression;
  readonly alternate: IRExpression;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Parenthesized Expression ────────────────────────────────────

export interface ParenthesizedExpression {
  readonly kind: 'parenthesized';
  readonly expression: IRExpression;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Unknown Expression (graceful degradation) ───────────────────

export interface UnknownExpression {
  readonly kind: 'unknown-expression';
  readonly rawText: string;
  readonly resolvedType?: IRType;
  readonly sourceLocation?: SourceLocation;
}

// ─── Discriminated Union ─────────────────────────────────────────

export type IRExpression =
  | LiteralExpression
  | IdentifierExpression
  | BinaryExpression
  | UnaryExpression
  | LogicalExpression
  | ComparisonExpression
  | AssignmentExpression
  | CallExpression
  | ArrayAccessExpression
  | MemberAccessExpression
  | CastExpression
  | TernaryExpression
  | ParenthesizedExpression
  | UnknownExpression;

// ─── Expression Constructors ─────────────────────────────────────

export function literal(
  literalKind: LiteralKind,
  value: string,
  sourceLocation?: SourceLocation
): LiteralExpression {
  return { kind: 'literal', literalKind, value, sourceLocation };
}

export function identifier(
  name: string,
  sourceLocation?: SourceLocation
): IdentifierExpression {
  return { kind: 'identifier', name, sourceLocation };
}

export function binary(
  operator: BinaryOperator,
  left: IRExpression,
  right: IRExpression,
  sourceLocation?: SourceLocation
): BinaryExpression {
  return { kind: 'binary', operator, left, right, sourceLocation };
}

export function unary(
  operator: UnaryOperator,
  position: UnaryPosition,
  operand: IRExpression,
  sourceLocation?: SourceLocation
): UnaryExpression {
  return { kind: 'unary', operator, position, operand, sourceLocation };
}

export function logical(
  operator: LogicalOperator,
  left: IRExpression,
  right: IRExpression,
  sourceLocation?: SourceLocation
): LogicalExpression {
  return { kind: 'logical', operator, left, right, sourceLocation };
}

export function comparison(
  operator: ComparisonOperator,
  left: IRExpression,
  right: IRExpression,
  sourceLocation?: SourceLocation
): ComparisonExpression {
  return { kind: 'comparison', operator, left, right, sourceLocation };
}

export function assignment(
  operator: AssignmentOperator,
  target: IRExpression,
  value: IRExpression,
  sourceLocation?: SourceLocation
): AssignmentExpression {
  return { kind: 'assignment', operator, target, value, sourceLocation };
}

export function call(
  callee: IRExpression,
  args: readonly IRExpression[],
  sourceLocation?: SourceLocation
): CallExpression {
  return { kind: 'call', callee, arguments: args, sourceLocation };
}

export function arrayAccess(
  array: IRExpression,
  index: IRExpression,
  sourceLocation?: SourceLocation
): ArrayAccessExpression {
  return { kind: 'array-access', array, index, sourceLocation };
}

export function memberAccess(
  object: IRExpression,
  member: string,
  sourceLocation?: SourceLocation
): MemberAccessExpression {
  return { kind: 'member-access', object, member, sourceLocation };
}

export function cast(
  targetType: IRType,
  expression: IRExpression,
  sourceLocation?: SourceLocation
): CastExpression {
  return { kind: 'cast', targetType, expression, sourceLocation };
}

export function ternary(
  condition: IRExpression,
  consequent: IRExpression,
  alternate: IRExpression,
  sourceLocation?: SourceLocation
): TernaryExpression {
  return { kind: 'ternary', condition, consequent, alternate, sourceLocation };
}

export function parenthesized(
  expression: IRExpression,
  sourceLocation?: SourceLocation
): ParenthesizedExpression {
  return { kind: 'parenthesized', expression, sourceLocation };
}

export function unknownExpression(
  rawText: string,
  sourceLocation?: SourceLocation
): UnknownExpression {
  return { kind: 'unknown-expression', rawText, sourceLocation };
}

// ─── Expression Utilities ────────────────────────────────────────

/**
 * Recursively collects all source locations from an expression tree.
 */
export function collectExpressionLocations(
  expr: IRExpression
): SourceLocation[] {
  const locations: SourceLocation[] = [];
  if (expr.sourceLocation) {
    locations.push(expr.sourceLocation);
  }

  switch (expr.kind) {
    case 'binary':
    case 'logical':
    case 'comparison':
      locations.push(
        ...collectExpressionLocations(expr.left),
        ...collectExpressionLocations(expr.right)
      );
      break;
    case 'unary':
      locations.push(...collectExpressionLocations(expr.operand));
      break;
    case 'assignment':
      locations.push(
        ...collectExpressionLocations(expr.target),
        ...collectExpressionLocations(expr.value)
      );
      break;
    case 'call':
      locations.push(...collectExpressionLocations(expr.callee));
      for (const arg of expr.arguments) {
        locations.push(...collectExpressionLocations(arg));
      }
      break;
    case 'array-access':
      locations.push(
        ...collectExpressionLocations(expr.array),
        ...collectExpressionLocations(expr.index)
      );
      break;
    case 'member-access':
      locations.push(...collectExpressionLocations(expr.object));
      break;
    case 'cast':
      locations.push(...collectExpressionLocations(expr.expression));
      break;
    case 'ternary':
      locations.push(
        ...collectExpressionLocations(expr.condition),
        ...collectExpressionLocations(expr.consequent),
        ...collectExpressionLocations(expr.alternate)
      );
      break;
    case 'parenthesized':
      locations.push(...collectExpressionLocations(expr.expression));
      break;
    case 'literal':
    case 'identifier':
    case 'unknown-expression':
      // leaf nodes — already handled
      break;
  }

  return locations;
}

/**
 * Converts an expression to a human-readable string representation.
 */
export function expressionToString(expr: IRExpression): string {
  switch (expr.kind) {
    case 'literal':
      return expr.value;
    case 'identifier':
      return expr.name;
    case 'binary':
      return `${expressionToString(expr.left)} ${expr.operator} ${expressionToString(expr.right)}`;
    case 'unary':
      return expr.position === 'prefix'
        ? `${expr.operator}${expressionToString(expr.operand)}`
        : `${expressionToString(expr.operand)}${expr.operator}`;
    case 'logical':
      return `${expressionToString(expr.left)} ${expr.operator} ${expressionToString(expr.right)}`;
    case 'comparison':
      return `${expressionToString(expr.left)} ${expr.operator} ${expressionToString(expr.right)}`;
    case 'assignment':
      return `${expressionToString(expr.target)} ${expr.operator} ${expressionToString(expr.value)}`;
    case 'call':
      return `${expressionToString(expr.callee)}(${expr.arguments.map(expressionToString).join(', ')})`;
    case 'array-access':
      return `${expressionToString(expr.array)}[${expressionToString(expr.index)}]`;
    case 'member-access':
      return `${expressionToString(expr.object)}.${expr.member}`;
    case 'cast':
      return `(${expr.targetType})${expressionToString(expr.expression)}`;
    case 'ternary':
      return `${expressionToString(expr.condition)} ? ${expressionToString(expr.consequent)} : ${expressionToString(expr.alternate)}`;
    case 'parenthesized':
      return `(${expressionToString(expr.expression)})`;
    case 'unknown-expression':
      return expr.rawText;
  }
}
