/**
 * Recursion Analyzer — Detects and analyzes recursive functions in Program IR.
 *
 * Performs purely static analysis on the IR tree.
 * Does NOT execute user code. Does NOT use eval().
 *
 * Features:
 *   - Direct recursion detection
 *   - Multiple recursive calls (e.g. Fibonacci, Divide & Conquer)
 *   - Heuristic base-case detection
 *   - Recursive-case identification
 *   - Diagnostic reporting
 *   - AST-based educational call-stack simulation (max 100 frames)
 */

import type { ProgramIR, IRFunction, RecursionMetadata, RecursiveCall, BaseCase, RecursiveCase } from '../ir/program-ir';
import type { IRStatement, IfStatement, ReturnStatement } from '../ir/statement-ir';
import type { IRExpression } from '../ir/expression-ir';
import { expressionToString } from '../ir/expression-ir';
import type { Diagnostic } from '../conversion/diagnostics';

// ─── Helpers: Expression & Statement Traversal ───────────────────

/**
 * Recursively extracts all calls to `targetName` within an expression.
 */
export function extractRecursiveCallsFromExpr(
  expr: IRExpression | undefined | null,
  targetName: string,
  calls: RecursiveCall[]
): void {
  if (!expr) return;
  switch (expr.kind) {
    case 'call': {
      if (expr.callee.kind === 'identifier' && expr.callee.name === targetName) {
        calls.push({
          functionName: targetName,
          argumentStrings: expr.arguments.map(expressionToString),
          arguments: expr.arguments,
          sourceLocation: expr.sourceLocation,
        });
      } else {
        extractRecursiveCallsFromExpr(expr.callee, targetName, calls);
      }
      for (const arg of expr.arguments) {
        extractRecursiveCallsFromExpr(arg, targetName, calls);
      }
      break;
    }
    case 'binary':
    case 'logical':
    case 'comparison': {
      extractRecursiveCallsFromExpr(expr.left, targetName, calls);
      extractRecursiveCallsFromExpr(expr.right, targetName, calls);
      break;
    }
    case 'unary': {
      extractRecursiveCallsFromExpr(expr.operand, targetName, calls);
      break;
    }
    case 'ternary': {
      extractRecursiveCallsFromExpr(expr.condition, targetName, calls);
      extractRecursiveCallsFromExpr(expr.consequent, targetName, calls);
      extractRecursiveCallsFromExpr(expr.alternate, targetName, calls);
      break;
    }
    case 'assignment': {
      extractRecursiveCallsFromExpr(expr.target, targetName, calls);
      extractRecursiveCallsFromExpr(expr.value, targetName, calls);
      break;
    }
    case 'array-access': {
      extractRecursiveCallsFromExpr(expr.array, targetName, calls);
      extractRecursiveCallsFromExpr(expr.index, targetName, calls);
      break;
    }
    case 'member-access': {
      extractRecursiveCallsFromExpr(expr.object, targetName, calls);
      break;
    }
    case 'cast': {
      extractRecursiveCallsFromExpr(expr.expression, targetName, calls);
      break;
    }
    case 'parenthesized': {
      extractRecursiveCallsFromExpr(expr.expression, targetName, calls);
      break;
    }
    default:
      break;
  }
}

/**
 * Recursively extracts all calls to `targetName` within a statement.
 */
export function extractRecursiveCallsFromStmt(
  stmt: IRStatement | undefined | null,
  targetName: string,
  calls: RecursiveCall[]
): void {
  if (!stmt) return;
  switch (stmt.kind) {
    case 'function-call': {
      if (stmt.name === targetName) {
        calls.push({
          functionName: targetName,
          argumentStrings: stmt.arguments.map(expressionToString),
          arguments: stmt.arguments,
          sourceLocation: stmt.sourceLocation,
        });
      }
      for (const arg of stmt.arguments) {
        extractRecursiveCallsFromExpr(arg, targetName, calls);
      }
      break;
    }
    case 'expression-statement': {
      extractRecursiveCallsFromExpr(stmt.expression, targetName, calls);
      break;
    }
    case 'variable-declaration': {
      if (stmt.initializer) {
        extractRecursiveCallsFromExpr(stmt.initializer, targetName, calls);
      }
      break;
    }
    case 'return': {
      if (stmt.value) {
        extractRecursiveCallsFromExpr(stmt.value, targetName, calls);
      }
      break;
    }
    case 'output': {
      for (const expr of stmt.expressions) {
        extractRecursiveCallsFromExpr(expr, targetName, calls);
      }
      break;
    }
    case 'if': {
      extractRecursiveCallsFromExpr(stmt.condition, targetName, calls);
      const thenBlock = (stmt as any).thenBlock || (stmt as any).thenBranch;
      const elseBlock = (stmt as any).elseBlock || (stmt as any).elseBranch;
      extractRecursiveCallsFromStmt(thenBlock, targetName, calls);
      if (elseBlock) {
        extractRecursiveCallsFromStmt(elseBlock, targetName, calls);
      }
      break;
    }
    case 'while':
    case 'do-while': {
      extractRecursiveCallsFromExpr(stmt.condition, targetName, calls);
      extractRecursiveCallsFromStmt(stmt.body, targetName, calls);
      break;
    }
    case 'for': {
      if (stmt.init) extractRecursiveCallsFromStmt(stmt.init, targetName, calls);
      if (stmt.condition) extractRecursiveCallsFromExpr(stmt.condition, targetName, calls);
      if (stmt.update) extractRecursiveCallsFromExpr(stmt.update, targetName, calls);
      extractRecursiveCallsFromStmt(stmt.body, targetName, calls);
      break;
    }
    case 'switch': {
      extractRecursiveCallsFromExpr(stmt.expression, targetName, calls);
      if (stmt.cases) {
        for (const c of stmt.cases) {
          if (c.value) extractRecursiveCallsFromExpr(c.value, targetName, calls);
          if (c.body) {
            for (const s of c.body) {
              extractRecursiveCallsFromStmt(s, targetName, calls);
            }
          }
        }
      }
      break;
    }
    case 'block': {
      if (stmt.statements) {
        for (const s of stmt.statements) {
          extractRecursiveCallsFromStmt(s, targetName, calls);
        }
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Checks whether a branch/statement contains any recursive calls to targetName.
 */
function branchHasRecursiveCalls(stmt: IRStatement | undefined | null, targetName: string): boolean {
  if (!stmt) return false;
  const calls: RecursiveCall[] = [];
  extractRecursiveCallsFromStmt(stmt, targetName, calls);
  return calls.length > 0;
}

/**
 * Checks whether an expression contains any recursive calls to targetName.
 */
function exprHasRecursiveCalls(expr: IRExpression | undefined | null, targetName: string): boolean {
  if (!expr) return false;
  const calls: RecursiveCall[] = [];
  extractRecursiveCallsFromExpr(expr, targetName, calls);
  return calls.length > 0;
}

/**
 * Finds return statements inside a statement tree.
 */
function findReturnStatements(stmt: IRStatement | undefined | null): ReturnStatement[] {
  const returns: ReturnStatement[] = [];
  function walk(s: IRStatement | undefined | null) {
    if (!s) return;
    if (s.kind === 'return') {
      returns.push(s);
    } else if (s.kind === 'block' && s.statements) {
      s.statements.forEach(walk);
    } else if (s.kind === 'if') {
      const thenBlock = (s as any).thenBlock || (s as any).thenBranch;
      const elseBlock = (s as any).elseBlock || (s as any).elseBranch;
      walk(thenBlock);
      if (elseBlock) walk(elseBlock);
    }
  }
  walk(stmt);
  return returns;
}

/**
 * Inverts a condition expression string for display in recursive cases.
 * e.g. "n <= 1" -> "n > 1", "n == 0" -> "n != 0", "b == 0" -> "b != 0"
 */
export function invertCondition(condition: IRExpression): string {
  if (condition.kind === 'comparison') {
    const left = expressionToString(condition.left);
    const right = expressionToString(condition.right);
    const opMap: Record<string, string> = {
      '<=': '>',
      '<': '>=',
      '==': '!=',
      '!=': '==',
      '>=': '<',
      '>': '<=',
    };
    const invOp = opMap[condition.operator];
    if (invOp) {
      return `${left} ${invOp} ${right}`;
    }
  }
  if (condition.kind === 'unary' && condition.operator === '!') {
    return expressionToString(condition.operand);
  }
  const condStr = expressionToString(condition);
  return `!(${condStr})`;
}

// ─── Base Case and Recursive Case Detection ──────────────────────

/**
 * Detects likely base cases and recursive cases within a recursive function.
 */
export function detectCases(
  fn: IRFunction,
  recursiveCalls: RecursiveCall[]
): { baseCases: BaseCase[]; recursiveCases: RecursiveCase[] } {
  const baseCases: BaseCase[] = [];
  const recursiveCases: RecursiveCase[] = [];

  function addBaseCase(condText: string, returnText?: string, loc?: IRStatement['sourceLocation']) {
    baseCases.push({
      conditionText: condText,
      returnText,
      sourceLocation: loc,
      confidence: 'likely',
    });
  }

  function addRecursiveCase(condText: string, calls: RecursiveCall[], loc?: IRStatement['sourceLocation']) {
    recursiveCases.push({
      conditionText: condText,
      recursiveCalls: calls,
      sourceLocation: loc,
    });
  }

  // 1. Inspect statements in fn.body
  for (const stmt of fn.body.statements) {
    if (stmt.kind === 'if') {
      const conditionText = expressionToString(stmt.condition);
      const thenBlock = (stmt as any).thenBlock || (stmt as any).thenBranch;
      const elseBlock = (stmt as any).elseBlock || (stmt as any).elseBranch;
      const thenHasRec = branchHasRecursiveCalls(thenBlock, fn.name);
      const elseHasRec = elseBlock ? branchHasRecursiveCalls(elseBlock, fn.name) : false;

      // Pattern A: if (cond) return baseValue; [then branch has no rec calls]
      if (!thenHasRec) {
        const returns = findReturnStatements(thenBlock);
        const returnText = returns.length > 0 && returns[0].value
          ? expressionToString(returns[0].value)
          : undefined;

        addBaseCase(conditionText, returnText, stmt.sourceLocation);

        if (elseHasRec && elseBlock) {
          const elseCalls: RecursiveCall[] = [];
          extractRecursiveCallsFromStmt(elseBlock, fn.name, elseCalls);
          addRecursiveCase(invertCondition(stmt.condition), elseCalls, (elseBlock as any).sourceLocation);
        }
      } else {
        // Pattern B: if (cond) return recursiveCall; else return baseValue;
        const thenCalls: RecursiveCall[] = [];
        extractRecursiveCallsFromStmt(thenBlock, fn.name, thenCalls);
        addRecursiveCase(conditionText, thenCalls, (thenBlock as any).sourceLocation);

        if (elseBlock && !elseHasRec) {
          const returns = findReturnStatements(elseBlock);
          const returnText = returns.length > 0 && returns[0].value
            ? expressionToString(returns[0].value)
            : undefined;
          addBaseCase(invertCondition(stmt.condition), returnText, (elseBlock as any).sourceLocation);
        }
      }
    } else if (stmt.kind === 'return' && stmt.value && stmt.value.kind === 'ternary') {
      // Pattern C: return cond ? baseVal : recVal;
      const ternary = stmt.value;
      const condText = expressionToString(ternary.condition);
      const conHasRec = exprHasRecursiveCalls(ternary.consequent, fn.name);
      const altHasRec = exprHasRecursiveCalls(ternary.alternate, fn.name);

      if (!conHasRec && altHasRec) {
        addBaseCase(condText, expressionToString(ternary.consequent), stmt.sourceLocation);
        const recCalls: RecursiveCall[] = [];
        extractRecursiveCallsFromExpr(ternary.alternate, fn.name, recCalls);
        addRecursiveCase(invertCondition(ternary.condition), recCalls, stmt.sourceLocation);
      } else if (conHasRec && !altHasRec) {
        addBaseCase(invertCondition(ternary.condition), expressionToString(ternary.alternate), stmt.sourceLocation);
        const recCalls: RecursiveCall[] = [];
        extractRecursiveCallsFromExpr(ternary.consequent, fn.name, recCalls);
        addRecursiveCase(condText, recCalls, stmt.sourceLocation);
      }
    }
  }

  // 2. If recursive cases not yet populated but we found base cases and recursive calls exist
  if (recursiveCases.length === 0 && recursiveCalls.length > 0) {
    if (baseCases.length > 0) {
      const matchIf = fn.body.statements.find(s => s.kind === 'if') as IfStatement | undefined;
      const recCondition = matchIf
        ? invertCondition(matchIf.condition)
        : `otherwise (${baseCases[0].conditionText} is false)`;

      addRecursiveCase(recCondition, recursiveCalls, fn.sourceLocation);
    } else {
      addRecursiveCase('unconditional / recursive body', recursiveCalls, fn.sourceLocation);
    }
  }

  return { baseCases, recursiveCases };
}

// ─── Function & Program Analysis ─────────────────────────────────

/**
 * Analyzes a single function for recursion.
 */
export function analyzeFunctionRecursion(fn: IRFunction): RecursionMetadata {
  const recursiveCalls: RecursiveCall[] = [];
  extractRecursiveCallsFromStmt(fn.body, fn.name, recursiveCalls);

  const isRecursive = recursiveCalls.length > 0;
  if (!isRecursive) {
    return {
      isRecursive: false,
      recursiveCalls: [],
      baseCases: [],
      recursiveCases: [],
      recursiveCallCount: 0,
    };
  }

  const { baseCases, recursiveCases } = detectCases(fn, recursiveCalls);

  return {
    isRecursive: true,
    recursiveCalls,
    baseCases,
    recursiveCases,
    recursiveCallCount: recursiveCalls.length,
  };
}

/**
 * Analyzes an entire ProgramIR for recursion across all functions.
 * Attaches RecursionMetadata to each function and returns diagnostics.
 */
export function analyzeProgramRecursion(program: ProgramIR): {
  program: ProgramIR;
  diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];
  const updatedFunctions: IRFunction[] = [];

  for (const fn of program.functions) {
    const recursion = analyzeFunctionRecursion(fn);
    const enrichedFn: IRFunction = {
      ...fn,
      recursion,
    };
    updatedFunctions.push(enrichedFn);

    if (recursion.isRecursive) {
      // 1. Diagnostic: Recursive function detected
      diagnostics.push({
        severity: 'info',
        category: 'analysis',
        message: `Recursive function detected: ${fn.name}() (${recursion.recursiveCallCount} recursive call site${recursion.recursiveCallCount > 1 ? 's' : ''})`,
        sourceLocation: fn.sourceLocation,
      });

      // 2. Diagnostic: Base case detected
      if (recursion.baseCases.length > 0) {
        for (const bc of recursion.baseCases) {
          const locStr = bc.sourceLocation ? ` at line ${bc.sourceLocation.startLine}` : '';
          diagnostics.push({
            severity: 'info',
            category: 'analysis',
            message: `Likely base case detected${locStr}: ${bc.conditionText}${bc.returnText ? ` -> return ${bc.returnText}` : ''}`,
            sourceLocation: bc.sourceLocation,
          });
        }
      } else {
        // Warning: No obvious base case detected
        diagnostics.push({
          severity: 'warning',
          category: 'analysis',
          message: `No obvious base case was detected in recursive function '${fn.name}()'. Ensure terminating condition exists.`,
          sourceLocation: fn.sourceLocation,
        });
      }

      // 3. Diagnostic: Check if recursive call argument reduces
      if (fn.parameters.length > 0) {
        const paramNames = fn.parameters.map(p => p.name);
        for (const call of recursion.recursiveCalls) {
          if (
            call.argumentStrings.length === 1 &&
            paramNames.length === 1 &&
            call.argumentStrings[0].trim() === paramNames[0].trim()
          ) {
            diagnostics.push({
              severity: 'warning',
              category: 'analysis',
              message: `Recursive call '${call.functionName}(${call.argumentStrings.join(', ')})' does not modify parameter '${paramNames[0]}'. It may not reduce toward a terminating condition.`,
              sourceLocation: call.sourceLocation,
            });
          }
        }
      }
    }
  }

  return {
    program: {
      ...program,
      functions: updatedFunctions,
    },
    diagnostics,
  };
}

// ─── Educational Call Stack Simulator (Pure Static, No eval) ──────

export interface CallFrame {
  id: number;
  functionName: string;
  args: Record<string, number>;
  argsString: string;
  depth: number;
  isBaseCase: boolean;
  result?: number;
  state: 'calling' | 'active' | 'returning' | 'completed';
}

export interface SimulationStep {
  stepIndex: number;
  action: 'call' | 'base_case_hit' | 'return';
  frame: CallFrame;
  activeStack: CallFrame[];
  description: string;
}

export interface SimulationResult {
  steps: SimulationStep[];
  finalResult?: number;
  totalFrames: number;
  maxDepthReached: number;
  error?: string;
}

/**
 * Purely evaluates an expression using a simple numeric environment.
 * Supports numbers, variables, +, -, *, /, %, comparisons.
 * Returns NaN if unsupported or non-numeric.
 */
function evaluateExprStatic(expr: IRExpression, env: Record<string, number>): number {
  switch (expr.kind) {
    case 'literal': {
      const parsed = parseFloat(expr.value);
      return isNaN(parsed) ? (expr.value === 'true' ? 1 : expr.value === 'false' ? 0 : NaN) : parsed;
    }
    case 'identifier': {
      return env[expr.name] !== undefined ? env[expr.name] : NaN;
    }
    case 'binary': {
      const left = evaluateExprStatic(expr.left, env);
      const right = evaluateExprStatic(expr.right, env);
      if (isNaN(left) || isNaN(right)) return NaN;
      switch (expr.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return right !== 0 ? Math.floor(left / right) : NaN;
        case '%': return right !== 0 ? left % right : NaN;
        default: return NaN;
      }
    }
    case 'comparison': {
      const left = evaluateExprStatic(expr.left, env);
      const right = evaluateExprStatic(expr.right, env);
      if (isNaN(left) || isNaN(right)) return NaN;
      switch (expr.operator) {
        case '==': return left === right ? 1 : 0;
        case '!=': return left !== right ? 1 : 0;
        case '<': return left < right ? 1 : 0;
        case '<=': return left <= right ? 1 : 0;
        case '>': return left > right ? 1 : 0;
        case '>=': return left >= right ? 1 : 0;
      }
    }
    case 'unary': {
      const val = evaluateExprStatic(expr.operand, env);
      if (isNaN(val)) return NaN;
      if (expr.operator === '-') return -val;
      if (expr.operator === '!') return val === 0 ? 1 : 0;
      return val;
    }
    case 'parenthesized':
      return evaluateExprStatic(expr.expression, env);
    default:
      return NaN;
  }
}

/**
 * Simulates a recursive function execution purely on the IR AST without executing arbitrary code.
 * Safe, bounded by maxDepth (default 100).
 */
export function simulateStaticRecursion(
  fn: IRFunction,
  initialArgs: Record<string, number>,
  maxDepth = 100
): SimulationResult {
  const steps: SimulationStep[] = [];
  let frameCounter = 0;
  let maxDepthReached = 0;

  function runFrame(args: Record<string, number>, depth: number): number {
    if (depth > maxDepth) {
      throw new Error(`Maximum simulation depth reached (${maxDepth} frames)`);
    }
    maxDepthReached = Math.max(maxDepthReached, depth);

    const frameId = ++frameCounter;
    const argsString = `${fn.name}(${Object.values(args).join(', ')})`;
    const frame: CallFrame = {
      id: frameId,
      functionName: fn.name,
      args,
      argsString,
      depth,
      isBaseCase: false,
      state: 'calling',
    };

    steps.push({
      stepIndex: steps.length,
      action: 'call',
      frame: { ...frame },
      activeStack: [],
      description: `Call ${argsString} at depth ${depth}`,
    });

    for (const stmt of fn.body.statements) {
      if (stmt.kind === 'if') {
        const condVal = evaluateExprStatic(stmt.condition, args);
        if (condVal === 1) {
          const thenBlock = (stmt as any).thenBlock || (stmt as any).thenBranch;
          const returns = findReturnStatements(thenBlock);
          if (returns.length > 0) {
            const ret = returns[0];
            const retVal = ret.value ? evaluateExprStatic(ret.value, args) : 0;
            frame.isBaseCase = true;
            frame.result = retVal;
            frame.state = 'returning';

            steps.push({
              stepIndex: steps.length,
              action: 'base_case_hit',
              frame: { ...frame },
              activeStack: [],
              description: `Base case matched in ${argsString}: return ${retVal}`,
            });

            return retVal;
          }
        }
      } else if (stmt.kind === 'return' && stmt.value) {
        const retExpr = stmt.value;

        // Pattern 1: binary with recursive call(s) (e.g. n * f(n - 1) or f(n-1) + f(n-2))
        if (retExpr.kind === 'binary' && (retExpr.operator === '*' || retExpr.operator === '+')) {
          let leftVal: number;
          let rightVal: number;

          if (retExpr.left.kind === 'call' && retExpr.left.callee.kind === 'identifier' && retExpr.left.callee.name === fn.name) {
            const nextArg = evaluateExprStatic(retExpr.left.arguments[0], args);
            const paramName = fn.parameters[0]?.name ?? 'n';
            leftVal = runFrame({ [paramName]: nextArg }, depth + 1);
          } else {
            leftVal = evaluateExprStatic(retExpr.left, args);
          }

          if (retExpr.right.kind === 'call' && retExpr.right.callee.kind === 'identifier' && retExpr.right.callee.name === fn.name) {
            const nextArg = evaluateExprStatic(retExpr.right.arguments[0], args);
            const paramName = fn.parameters[0]?.name ?? 'n';
            rightVal = runFrame({ [paramName]: nextArg }, depth + 1);
          } else {
            rightVal = evaluateExprStatic(retExpr.right, args);
          }

          const combined = retExpr.operator === '*' ? leftVal * rightVal : leftVal + rightVal;
          frame.result = combined;
          frame.state = 'returning';

          steps.push({
            stepIndex: steps.length,
            action: 'return',
            frame: { ...frame },
            activeStack: [],
            description: `Return from ${argsString} = ${combined}`,
          });

          return combined;
        }

        // Pattern 2: direct recursive call return f(a, b) (e.g. GCD)
        if (retExpr.kind === 'call' && retExpr.callee.kind === 'identifier' && retExpr.callee.name === fn.name) {
          const nextArgs: Record<string, number> = {};
          fn.parameters.forEach((p, idx) => {
            if (retExpr.arguments[idx]) {
              nextArgs[p.name] = evaluateExprStatic(retExpr.arguments[idx], args);
            }
          });
          const res = runFrame(nextArgs, depth + 1);
          frame.result = res;
          frame.state = 'returning';

          steps.push({
            stepIndex: steps.length,
            action: 'return',
            frame: { ...frame },
            activeStack: [],
            description: `Return from ${argsString} = ${res}`,
          });

          return res;
        }
      }
    }

    return 0;
  }

  try {
    const finalResult = runFrame(initialArgs, 1);
    return {
      steps,
      finalResult,
      totalFrames: frameCounter,
      maxDepthReached,
    };
  } catch (err) {
    return {
      steps,
      totalFrames: frameCounter,
      maxDepthReached,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
