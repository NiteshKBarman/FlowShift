/**
 * Visual Execution Engine for FlowShift.
 *
 * Executes normalized Program IR step-by-step for educational visualization.
 * Maintains execution history, active variables, call stack frames,
 * source location mapping, and flowchart node synchronization.
 *
 * Safe: Runs strictly on Program IR without eval(), Function(), or code compilation.
 * Bounded: Enforces maxSteps (10000), maxRecursionDepth (100), maxLoopIterations (10000).
 */

import type { ProgramIR, IRFunction } from '../ir/program-ir';
import type { IRStatement, BlockStatement } from '../ir/statement-ir';
import type { IRExpression } from '../ir/expression-ir';
import { expressionToString } from '../ir/expression-ir';
import type { SourceLocation } from '../ir/source-location';
import type { FlowProgram } from '../flow/flow-types';

export interface StackFrame {
  readonly id: string;
  readonly functionName: string;
  readonly callExpression: string;
  readonly parameters: Record<string, any>;
  readonly variables: Record<string, any>;
  readonly sourceLocation?: SourceLocation;
  readonly isBaseCase?: boolean;
  readonly returnValue?: any;
}

export type ExecutionAction =
  | 'start'
  | 'declare'
  | 'assign'
  | 'condition'
  | 'loop'
  | 'call'
  | 'return'
  | 'base-case'
  | 'output'
  | 'input'
  | 'end'
  | 'error';

export interface ExecutionHistoryEntry {
  readonly stepIndex: number;
  readonly description: string;
  readonly action: ExecutionAction;
  readonly sourceLocation?: SourceLocation;
  readonly flowNodeId?: string;
  readonly functionName?: string;
}

export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'waiting-for-input'
  | 'completed'
  | 'error';

export interface InputPromptData {
  readonly variable: string;
  readonly promptText?: string;
  readonly defaultValue: string;
}

export interface ExecutionStepSnapshot {
  readonly stepIndex: number;
  readonly status: ExecutionStatus;
  readonly currentLocation?: SourceLocation;
  readonly currentFlowNodeId?: string;
  readonly activeGraphId?: string;
  readonly variables: Record<string, any>;
  readonly changedVariables: readonly string[];
  readonly callStack: readonly StackFrame[];
  readonly output: readonly string[];
  readonly history: readonly ExecutionHistoryEntry[];
  readonly inputPrompt?: InputPromptData;
  readonly error?: string;
}

const MAX_STEPS = 10000;
const MAX_RECURSION_DEPTH = 100;
const MAX_LOOP_ITERATIONS = 10000;
const MAX_RECORDED_LOOP_ITERATIONS = 50;

interface PendingInputContext {
  statement: IRStatement & { kind: 'input' };
  promptText?: string;
}

export class VisualExecutionEngine {
  private program: ProgramIR;
  private flowProgram?: FlowProgram;
  private functions = new Map<string, IRFunction>();

  private snapshots: ExecutionStepSnapshot[] = [];
  private currentStepIndex = 0;

  // Runtime state
  private globalEnv: Record<string, any> = {};
  private activeCallStack: StackFrame[] = [];
  private accumulatedOutput: string[] = [];
  private historyEntries: ExecutionHistoryEntry[] = [];
  private frameCounter = 0;
  private lastActiveVariables: Record<string, any> = {};

  private providedInputs: string[] = [];
  private inputBuffer: string[] = [];
  private pendingInput?: PendingInputContext;
  private isTerminated = false;
  private terminationError?: string;
  private suppressSnapshots = false;

  constructor(program: ProgramIR, flowProgram?: FlowProgram | null) {
    this.program = program;
    this.flowProgram = flowProgram || undefined;
    for (const fn of program.functions) {
      this.functions.set(fn.name, fn);
    }
  }

  /**
   * Initializes or restarts execution.
   */
  public start(preloadedInput?: string): ExecutionStepSnapshot {
    this.providedInputs = preloadedInput
      ? preloadedInput.trim().split(/\s+/).filter(Boolean)
      : [];
    this.runFromStart();
    this.currentStepIndex = 0;
    return this.getState();
  }

  /**
   * Advances one step forward.
   */
  public stepForward(): ExecutionStepSnapshot {
    if (this.currentStepIndex < this.snapshots.length - 1) {
      this.currentStepIndex++;
    }
    return this.getState();
  }

  /**
   * Steps one step backward.
   */
  public stepBackward(): ExecutionStepSnapshot {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
    }
    return this.getState();
  }

  /**
   * Resets execution pointer to the very first step.
   */
  public reset(): ExecutionStepSnapshot {
    this.currentStepIndex = 0;
    return this.getState();
  }

  /**
   * Jumps to an arbitrary step index in history.
   */
  public goToStep(index: number): ExecutionStepSnapshot {
    if (index >= 0 && index < this.snapshots.length) {
      this.currentStepIndex = index;
    }
    return this.getState();
  }

  /**
   * Submits interactive input when waiting for input.
   */
  public provideInput(value: string): ExecutionStepSnapshot {
    this.providedInputs.push(value);
    const prevCount = this.snapshots.length;
    this.runFromStart();

    // Position at the newly advanced step
    this.currentStepIndex = Math.min(prevCount, this.snapshots.length - 1);
    return this.getState();
  }

  /**
   * Returns current active step snapshot.
   */
  public getState(): ExecutionStepSnapshot {
    if (this.snapshots.length === 0) {
      return {
        stepIndex: 0,
        status: 'idle',
        variables: {},
        changedVariables: [],
        callStack: [],
        output: [],
        history: [],
      };
    }
    return this.snapshots[this.currentStepIndex];
  }

  public getAllSnapshots(): readonly ExecutionStepSnapshot[] {
    return this.snapshots;
  }

  public getTotalSteps(): number {
    return this.snapshots.length;
  }

  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  // ─── Internal Execution Pipeline ───────────────────────────────

  private runFromStart(): void {
    this.snapshots = [];
    this.currentStepIndex = 0;
    this.globalEnv = {};
    this.activeCallStack = [];
    this.accumulatedOutput = [];
    this.historyEntries = [];
    this.frameCounter = 0;
    this.lastActiveVariables = {};
    this.inputBuffer = [...this.providedInputs];
    this.pendingInput = undefined;
    this.isTerminated = false;
    this.terminationError = undefined;

    // Initial starting snapshot
    const initialLocation =
      this.program.functions[0]?.sourceLocation ||
      this.program.globalStatements[0]?.sourceLocation;

    this.recordSnapshot({
      action: 'start',
      description: 'Program execution started',
      sourceLocation: initialLocation,
      status: 'paused',
    });

    try {
      // 1. Execute global statements if any
      if (this.program.globalStatements.length > 0) {
        this.executeBlock(
          { kind: 'block', statements: this.program.globalStatements },
          this.globalEnv
        );
        if (this.pendingInput || this.isTerminated) return;
      }

      // 2. Identify and execute main function
      let mainFn =
        this.functions.get('main') ||
        Array.from(this.functions.values()).find((f) => f.isMain);

      if (!mainFn && this.functions.size > 0 && this.program.globalStatements.length === 0) {
        mainFn = Array.from(this.functions.values())[0];
      }

      if (mainFn) {
        const defaultArgs = mainFn.parameters.map(() => 0);
        this.executeFunction(mainFn, defaultArgs, this.globalEnv);
      }

      if (!this.pendingInput && !this.isTerminated) {
        this.isTerminated = true;
        this.recordSnapshot({
          action: 'end',
          description: 'Program execution completed',
          status: 'completed',
        });
      }
    } catch (err: any) {
      this.isTerminated = true;
      this.terminationError = err.message || String(err);
      this.recordSnapshot({
        action: 'error',
        description: `Runtime error: ${this.terminationError}`,
        status: 'error',
        error: this.terminationError,
      });
    }
  }

  private executeFunction(
    fn: IRFunction,
    args: any[],
    parentEnv: Record<string, any>
  ): any {
    if (this.activeCallStack.length >= MAX_RECURSION_DEPTH) {
      throw new Error(`Recursion limit reached: Maximum call stack depth (${MAX_RECURSION_DEPTH}) exceeded`);
    }

    const frameId = `frame_${++this.frameCounter}`;
    const argsRecord: Record<string, any> = {};
    fn.parameters.forEach((param, i) => {
      argsRecord[param.name] = args[i] !== undefined ? args[i] : 0;
    });

    const localEnv: Record<string, any> = { ...parentEnv, ...argsRecord };
    const callExpr = `${fn.name}(${Object.values(argsRecord).join(', ')})`;

    const frame: StackFrame = {
      id: frameId,
      functionName: fn.name,
      callExpression: callExpr,
      parameters: { ...argsRecord },
      variables: { ...localEnv },
      sourceLocation: fn.sourceLocation,
      isBaseCase: false,
    };

    this.activeCallStack.push(frame);

    this.recordSnapshot({
      action: 'call',
      description: `Called ${callExpr}`,
      sourceLocation: fn.sourceLocation,
      activeGraphId: `graph_${fn.name}`,
    });

    let returnVal: any = undefined;

    try {
      const ret = this.executeBlock(fn.body, localEnv);
      if (this.pendingInput || this.isTerminated) {
        return;
      }
      if (ret && (ret as any).__isReturn) {
        returnVal = (ret as any).value;
      } else {
        returnVal = ret !== undefined ? ret : 0;
      }
    } finally {
      if (!this.pendingInput && !this.isTerminated) {
        const popped = this.activeCallStack.pop();

        // Check if base case
        const isBase = popped?.isBaseCase ?? false;
        const desc = isBase
          ? `Base case reached in ${callExpr}: returns ${returnVal ?? 0}`
          : `Returning ${returnVal ?? 0} from ${callExpr}`;

        this.recordSnapshot({
          action: isBase ? 'base-case' : 'return',
          description: desc,
          sourceLocation: fn.sourceLocation,
          activeGraphId: this.activeCallStack[this.activeCallStack.length - 1]
            ? `graph_${this.activeCallStack[this.activeCallStack.length - 1].functionName}`
            : `graph_${fn.name}`,
        });

        if (this.activeCallStack.length > 0) {
          const caller = this.activeCallStack[this.activeCallStack.length - 1];
          this.recordSnapshot({
            action: 'return',
            description: `Unwinding: ${callExpr} returned ${returnVal ?? 0} to ${caller.functionName}`,
            activeGraphId: `graph_${caller.functionName}`,
          });
        }
      }
    }

    return returnVal;
  }

  private executeBlock(
    block: BlockStatement,
    env: Record<string, any>
  ): any {
    for (const stmt of block.statements) {
      if (this.snapshots.length >= MAX_STEPS) {
        throw new Error(`Execution limit reached: Maximum steps (${MAX_STEPS}) exceeded`);
      }
      if (this.pendingInput || this.isTerminated) {
        return;
      }

      const ret = this.executeStatement(stmt, env);
      if (this.pendingInput || this.isTerminated) {
        return;
      }
      if (ret !== undefined && ret !== null && (ret as any).__isReturn) {
        return ret;
      }
      if (ret !== undefined && (ret as any).__isBreak) {
        return ret;
      }
      if (ret !== undefined && (ret as any).__isContinue) {
        return ret;
      }
    }
  }

  private executeStatement(
    stmt: IRStatement,
    env: Record<string, any>
  ): any {
    if (this.snapshots.length >= MAX_STEPS) {
      throw new Error(`Execution limit reached: Maximum steps (${MAX_STEPS}) exceeded`);
    }

    switch (stmt.kind) {
      case 'variable-declaration': {
        let val: any = 0;
        if (stmt.initializer) {
          val = this.evalExpr(stmt.initializer, env);
        } else if (stmt.type && (stmt.type as any).kind === 'array') {
          const sz = (stmt.type as any).size || 10;
          val = new Array(sz).fill(0);
        }
        env[stmt.name] = val;
        this.updateCurrentFrameVariables(env);

        this.recordSnapshot({
          action: 'declare',
          description: stmt.initializer
            ? `Declared ${stmt.name} = ${JSON.stringify(val)}`
            : `Declared ${stmt.name}`,
          sourceLocation: stmt.sourceLocation,
          changedVariables: [stmt.name],
        });
        break;
      }

      case 'expression-statement': {
        const expr = stmt.expression;
        if (expr.kind === 'assignment') {
          const val = this.evalExpr(expr, env);
          this.updateCurrentFrameVariables(env);
          const targetName =
            expr.target.kind === 'identifier' ? expr.target.name : 'variable';
          this.recordSnapshot({
            action: 'assign',
            description: `Assigned ${targetName} = ${val}`,
            sourceLocation: stmt.sourceLocation,
            changedVariables: [targetName],
          });
        } else if (
          expr.kind === 'unary' &&
          (expr.operator === '++' || expr.operator === '--') &&
          expr.operand.kind === 'identifier'
        ) {
          const targetName = expr.operand.name;
          const val = this.evalExpr(expr, env);
          this.updateCurrentFrameVariables(env);
          this.recordSnapshot({
            action: 'assign',
            description: `Updated ${targetName} = ${val}`,
            sourceLocation: stmt.sourceLocation,
            changedVariables: [targetName],
          });
        } else {
          this.evalExpr(expr, env);
        }
        break;
      }

      case 'output': {
        this.executeOutput(stmt, env);
        break;
      }

      case 'input': {
        this.executeInput(stmt, env);
        break;
      }

      case 'if': {
        const condVal = this.evalExpr(stmt.condition, env);
        const condStr = expressionToString(stmt.condition);
        const isTrue = this.isTruthy(condVal);

        // Check if condition matches known base case in recursion metadata
        const currentFrame = this.activeCallStack[this.activeCallStack.length - 1];
        const currentFn = currentFrame ? this.functions.get(currentFrame.functionName) : undefined;
        let isBaseMatch = false;

        if (currentFn?.recursion?.isRecursive && isTrue) {
          const baseCaseLoc = currentFn.recursion.baseCases.some(
            (bc) => bc.sourceLocation?.startLine === stmt.sourceLocation?.startLine
          );
          if (baseCaseLoc) {
            isBaseMatch = true;
            if (currentFrame) {
              (currentFrame as any).isBaseCase = true;
            }
          }
        }

        this.recordSnapshot({
          action: isBaseMatch ? 'base-case' : 'condition',
          description: isBaseMatch
            ? `Base case condition matched: (${condStr}) -> true`
            : `If condition (${condStr}) -> ${isTrue ? 'true' : 'false'}`,
          sourceLocation: stmt.condition.sourceLocation ?? stmt.sourceLocation,
        });

        const thenBlock = (stmt as any).thenBlock || (stmt as any).thenBranch;
        const elseBlock = (stmt as any).elseBlock || (stmt as any).elseBranch;

        if (isTrue) {
          if (thenBlock) {
            const ret =
              thenBlock.kind === 'block'
                ? this.executeBlock(thenBlock, env)
                : this.executeStatement(thenBlock, env);
            if (ret && (ret.__isReturn || ret.__isBreak || ret.__isContinue)) return ret;
          }
        } else if (elseBlock) {
          const ret =
            elseBlock.kind === 'block'
              ? this.executeBlock(elseBlock, env)
              : this.executeStatement(elseBlock, env);
          if (ret && (ret.__isReturn || ret.__isBreak || ret.__isContinue)) return ret;
        }
        break;
      }

      case 'while': {
        let iterations = 0;
        const condStr = expressionToString(stmt.condition);

        try {
          while (true) {
            if (++iterations > MAX_LOOP_ITERATIONS) {
              throw new Error(`Loop iteration limit reached: Maximum loop iterations (${MAX_LOOP_ITERATIONS}) exceeded`);
            }

            if (iterations > MAX_RECORDED_LOOP_ITERATIONS) {
              this.suppressSnapshots = true;
            }

            const condVal = this.evalExpr(stmt.condition, env);
            const isTrue = this.isTruthy(condVal);

            this.recordSnapshot({
              action: 'loop',
              description: `While condition (${condStr}) -> ${isTrue ? 'true' : 'false'}`,
              sourceLocation: stmt.condition.sourceLocation ?? stmt.sourceLocation,
            });

            if (!isTrue) break;

            const ret = this.executeBlock(stmt.body, env);
            if (ret && ret.__isReturn) return ret;
            if (ret && ret.__isBreak) break;
          }
        } finally {
          this.suppressSnapshots = false;
        }
        break;
      }

      case 'for': {
        if (stmt.init) {
          this.executeStatement(stmt.init, env);
        }

        let iterations = 0;
        const condStr = stmt.condition ? expressionToString(stmt.condition) : 'true';

        try {
          while (true) {
            if (++iterations > MAX_LOOP_ITERATIONS) {
              throw new Error(`Loop iteration limit reached: Maximum loop iterations (${MAX_LOOP_ITERATIONS}) exceeded`);
            }

            if (iterations > MAX_RECORDED_LOOP_ITERATIONS) {
              this.suppressSnapshots = true;
            }

            const condVal = stmt.condition ? this.evalExpr(stmt.condition, env) : true;
            const isTrue = this.isTruthy(condVal);

            if (stmt.condition) {
              this.recordSnapshot({
                action: 'loop',
                description: `For condition (${condStr}) -> ${isTrue ? 'true' : 'false'}`,
                sourceLocation: stmt.condition.sourceLocation ?? stmt.sourceLocation,
              });
            }

            if (!isTrue) break;

            const ret = this.executeBlock(stmt.body, env);
            if (ret && ret.__isReturn) return ret;
            if (ret && ret.__isBreak) break;

            if (stmt.update) {
              this.evalExpr(stmt.update, env);
              this.updateCurrentFrameVariables(env);
              this.recordSnapshot({
                action: 'loop',
                description: `For update: ${expressionToString(stmt.update)}`,
                sourceLocation: stmt.update.sourceLocation ?? stmt.sourceLocation,
              });
            }
          }
        } finally {
          this.suppressSnapshots = false;
        }
        break;
      }

      case 'do-while': {
        let iterations = 0;
        const condStr = expressionToString(stmt.condition);

        try {
          do {
            if (++iterations > MAX_LOOP_ITERATIONS) {
              throw new Error(`Loop iteration limit reached: Maximum loop iterations (${MAX_LOOP_ITERATIONS}) exceeded`);
            }

            if (iterations > MAX_RECORDED_LOOP_ITERATIONS) {
              this.suppressSnapshots = true;
            }

            const ret = this.executeBlock(stmt.body, env);
            if (ret && ret.__isReturn) return ret;
            if (ret && ret.__isBreak) break;

            const condVal = this.evalExpr(stmt.condition, env);
            const isTrue = this.isTruthy(condVal);

            this.recordSnapshot({
              action: 'loop',
              description: `Do-while condition (${condStr}) -> ${isTrue ? 'true' : 'false'}`,
              sourceLocation: stmt.condition.sourceLocation ?? stmt.sourceLocation,
            });

            if (!isTrue) break;
          } while (true);
        } finally {
          this.suppressSnapshots = false;
        }
        break;
      }

      case 'return': {
        const val = stmt.value ? this.evalExpr(stmt.value, env) : undefined;
        this.recordSnapshot({
          action: 'return',
          description: stmt.value ? `Return expression evaluated: ${val}` : 'Return void',
          sourceLocation: stmt.sourceLocation,
        });
        return { __isReturn: true, value: val };
      }

      case 'break': {
        this.recordSnapshot({
          action: 'loop',
          description: 'Break loop execution',
          sourceLocation: stmt.sourceLocation,
        });
        return { __isBreak: true };
      }

      case 'continue': {
        this.recordSnapshot({
          action: 'loop',
          description: 'Continue to next loop iteration',
          sourceLocation: stmt.sourceLocation,
        });
        return { __isContinue: true };
      }

      case 'block': {
        return this.executeBlock(stmt, env);
      }

      case 'function-call': {
        const fn = this.functions.get(stmt.name);
        if (fn) {
          const args = stmt.arguments.map((a) => this.evalExpr(a, env));
          this.executeFunction(fn, args, env);
        }
        break;
      }
    }
  }

  private executeOutput(stmt: any, env: Record<string, any>): void {
    const pieces: string[] = [];
    for (const e of stmt.expressions) {
      let val = this.evalExpr(e, env);
      if (typeof val === 'string') {
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        val = val.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      }
      pieces.push(String(val));
    }

    let text: string;
    if (stmt.formatString) {
      text = pieces.join('');
    } else {
      const hasSpaced = pieces.some((p: string) => p.endsWith(' ') || p.startsWith(' '));
      text = pieces.join(hasSpaced ? '' : ' ');
    }

    if (stmt.newline !== false && !text.endsWith('\n')) {
      text += '\n';
    }

    this.accumulatedOutput.push(text);

    this.recordSnapshot({
      action: 'output',
      description: `Output: ${text.trim()}`,
      sourceLocation: stmt.sourceLocation,
    });
  }

  private executeInput(stmt: any, env: Record<string, any>): void {
    let promptText = '';
    if (stmt.prompt) {
      promptText = stmt.prompt;
      if (typeof promptText === 'string') {
        if ((promptText.startsWith('"') && promptText.endsWith('"')) || (promptText.startsWith("'") && promptText.endsWith("'"))) {
          promptText = promptText.slice(1, -1);
        }
        promptText = promptText.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      }
      this.accumulatedOutput.push(promptText);
    }

    // If input is buffered, consume it
    if (this.inputBuffer.length > 0) {
      const valStr = this.inputBuffer.shift()!;
      this.accumulatedOutput.push(valStr + '\n');
      const num = Number(valStr);
      const finalVal = isNaN(num) ? valStr : num;
      env[stmt.variable] = finalVal;
      this.updateCurrentFrameVariables(env);

      this.recordSnapshot({
        action: 'input',
        description: `Input: ${stmt.variable} = ${finalVal}`,
        sourceLocation: stmt.sourceLocation,
        changedVariables: [stmt.variable],
      });
      return;
    }

    // Otherwise pause execution and register pending input
    this.pendingInput = {
      statement: stmt,
      promptText: promptText.trim() || undefined,
    };

    this.recordSnapshot({
      action: 'input',
      description: `Input required: ${stmt.variable}`,
      sourceLocation: stmt.sourceLocation,
      status: 'waiting-for-input',
      inputPrompt: {
        variable: stmt.variable,
        promptText: promptText.trim() || undefined,
        defaultValue: '5',
      },
    });
  }

  // ─── Expression Evaluation ─────────────────────────────────────

  private evalExpr(expr: IRExpression, env: Record<string, any>): any {
    switch (expr.kind) {
      case 'literal': {
        if (expr.literalKind === 'int' || expr.literalKind === 'float') {
          return Number(expr.value);
        }
        if (expr.literalKind === 'bool') {
          return expr.value === 'true';
        }
        if (expr.literalKind === 'string') {
          let s = expr.value;
          if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            s = s.slice(1, -1);
          }
          return s;
        }
        return expr.value;
      }

      case 'identifier': {
        return env[expr.name] !== undefined ? env[expr.name] : 0;
      }

      case 'binary': {
        const l = this.evalExpr(expr.left, env);
        const r = this.evalExpr(expr.right, env);
        switch (expr.operator) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': return r !== 0 ? Math.floor(l / r) : 0;
          case '%': return r !== 0 ? l % r : 0;
          case '&': return l & r;
          case '|': return l | r;
          case '^': return l ^ r;
          case '<<': return l << r;
          case '>>': return l >> r;
          case '**': return Math.pow(l, r);
          default: return 0;
        }
      }

      case 'comparison': {
        const l = this.evalExpr(expr.left, env);
        const r = this.evalExpr(expr.right, env);
        switch (expr.operator) {
          case '==': return l == r;
          case '!=': return l != r;
          case '<': return l < r;
          case '<=': return l <= r;
          case '>': return l > r;
          case '>=': return l >= r;
          default: return false;
        }
      }

      case 'logical': {
        const l = this.evalExpr(expr.left, env);
        if (expr.operator === '&&') {
          return this.isTruthy(l) ? this.evalExpr(expr.right, env) : l;
        }
        if (expr.operator === '||') {
          return this.isTruthy(l) ? l : this.evalExpr(expr.right, env);
        }
        return false;
      }

      case 'unary': {
        if (expr.operator === '++' || expr.operator === '--') {
          if (expr.operand.kind === 'identifier') {
            const varName = expr.operand.name;
            const current = env[varName] !== undefined ? env[varName] : 0;
            const next = expr.operator === '++' ? current + 1 : current - 1;
            env[varName] = next;
            this.updateCurrentFrameVariables(env);
            return expr.position === 'prefix' ? next : current;
          }
          return 0;
        }
        const val = this.evalExpr(expr.operand, env);
        switch (expr.operator) {
          case '-': return -val;
          case '+': return +val;
          case '!': return !this.isTruthy(val);
          case '~': return ~val;
          default: return val;
        }
      }

      case 'assignment': {
        const val = this.evalExpr(expr.value, env);
        if (expr.target.kind === 'identifier') {
          const varName = expr.target.name;
          const current = env[varName] !== undefined ? env[varName] : 0;
          let finalVal = val;
          switch (expr.operator) {
            case '+=': finalVal = current + val; break;
            case '-=': finalVal = current - val; break;
            case '*=': finalVal = current * val; break;
            case '/=': finalVal = val !== 0 ? Math.floor(current / val) : 0; break;
            case '%=': finalVal = val !== 0 ? current % val : 0; break;
          }
          env[varName] = finalVal;
          this.updateCurrentFrameVariables(env);
          return finalVal;
        } else if (expr.target.kind === 'array-access') {
          const arr = this.evalExpr(expr.target.array, env);
          const idx = this.evalExpr(expr.target.index, env);
          if (Array.isArray(arr) && typeof idx === 'number') {
            arr[idx] = val;
            this.updateCurrentFrameVariables(env);
            return val;
          }
        }
        return val;
      }

      case 'array-access': {
        const arr = this.evalExpr(expr.array, env);
        const idx = this.evalExpr(expr.index, env);
        if (Array.isArray(arr) && typeof idx === 'number') {
          return arr[idx] !== undefined ? arr[idx] : 0;
        }
        return 0;
      }

      case 'call': {
        if (expr.callee.kind === 'identifier') {
          const fnName = expr.callee.name;
          const args = expr.arguments.map((a) => this.evalExpr(a, env));

          if (fnName === 'abs') return Math.abs(args[0]);
          if (fnName === 'max') return Math.max(args[0], args[1]);
          if (fnName === 'min') return Math.min(args[0], args[1]);
          if (fnName === 'sqrt') return Math.floor(Math.sqrt(args[0]));
          if (fnName === 'pow') return Math.pow(args[0], args[1]);

          const fn = this.functions.get(fnName);
          if (fn) {
            return this.executeFunction(fn, args, env);
          }
        }
        return 0;
      }

      case 'ternary': {
        const cond = this.evalExpr(expr.condition, env);
        return this.isTruthy(cond)
          ? this.evalExpr(expr.consequent, env)
          : this.evalExpr(expr.alternate, env);
      }

      case 'parenthesized':
        return this.evalExpr(expr.expression, env);

      default:
        return 0;
    }
  }

  private isTruthy(val: any): boolean {
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.length > 0;
    return Boolean(val);
  }

  private updateCurrentFrameVariables(env: Record<string, any>): void {
    if (this.activeCallStack.length > 0) {
      const top = this.activeCallStack[this.activeCallStack.length - 1];
      (top as any).variables = { ...env };
      this.lastActiveVariables = { ...env };
    } else {
      this.lastActiveVariables = { ...env };
    }
  }

  // ─── Flowchart Node Mapping & Snapshot Recording ───────────────

  private findMatchingFlowNodeId(
    graphId: string | undefined,
    sourceLocation?: SourceLocation,
    statementKind?: string
  ): string | undefined {
    if (!this.flowProgram || !sourceLocation) return undefined;

    const graph = graphId
      ? this.flowProgram.graphs.find((g) => g.id === graphId || g.name === graphId)
      : this.flowProgram.graphs[0];

    if (!graph) return undefined;

    // 1. Precise match: startLine and statementKind
    if (statementKind) {
      const precise = graph.nodes.find(
        (n) =>
          n.metadata?.sourceLocation?.startLine === sourceLocation.startLine &&
          n.metadata?.statementKind === statementKind
      );
      if (precise) return precise.id;
    }

    // 2. Line match
    const lineMatch = graph.nodes.find(
      (n) => n.metadata?.sourceLocation?.startLine === sourceLocation.startLine
    );
    if (lineMatch) return lineMatch.id;

    // 3. Range overlap match
    const overlapMatch = graph.nodes.find(
      (n) =>
        n.metadata?.sourceLocation &&
        sourceLocation.startLine >= n.metadata.sourceLocation.startLine &&
        sourceLocation.startLine <= n.metadata.sourceLocation.endLine
    );
    return overlapMatch?.id;
  }

  private recordSnapshot(params: {
    action: ExecutionAction;
    description: string;
    sourceLocation?: SourceLocation;
    activeGraphId?: string;
    changedVariables?: string[];
    status?: ExecutionStatus;
    inputPrompt?: InputPromptData;
    error?: string;
  }): void {
    if (this.suppressSnapshots && params.action !== 'error') {
      return;
    }

    const stepIdx = this.snapshots.length;

    const activeGraphId =
      params.activeGraphId ||
      (this.activeCallStack.length > 0
        ? `graph_${this.activeCallStack[this.activeCallStack.length - 1].functionName}`
        : this.flowProgram?.graphs[0]?.id || 'main');

    const flowNodeId = this.findMatchingFlowNodeId(
      activeGraphId,
      params.sourceLocation,
      params.action
    );

    const historyEntry: ExecutionHistoryEntry = {
      stepIndex: stepIdx,
      description: params.description,
      action: params.action,
      sourceLocation: params.sourceLocation,
      flowNodeId,
      functionName: this.activeCallStack[this.activeCallStack.length - 1]?.functionName,
    };
    this.historyEntries.push(historyEntry);

    // Active variables snapshot: use current frame variables, or last active variables if frame finished
    const activeVars: Record<string, any> = {};
    if (this.activeCallStack.length > 0) {
      Object.assign(activeVars, this.activeCallStack[this.activeCallStack.length - 1].variables);
      this.lastActiveVariables = { ...activeVars };
    } else {
      Object.assign(activeVars, this.globalEnv, this.lastActiveVariables);
    }

    // Call stack deep clone for history
    const callStackClone: StackFrame[] = this.activeCallStack.map((frame) => ({
      ...frame,
      variables: { ...frame.variables },
      parameters: { ...frame.parameters },
    }));

    const snapshot: ExecutionStepSnapshot = {
      stepIndex: stepIdx,
      status: params.status || 'running',
      currentLocation: params.sourceLocation,
      currentFlowNodeId: flowNodeId,
      activeGraphId,
      variables: { ...activeVars },
      changedVariables: params.changedVariables ? [...params.changedVariables] : [],
      callStack: callStackClone,
      output: [...this.accumulatedOutput],
      history: [...this.historyEntries],
      inputPrompt: params.inputPrompt,
      error: params.error,
    };

    this.snapshots.push(snapshot);
  }
}

export function createVisualExecutionEngine(
  program: ProgramIR,
  flowProgram?: FlowProgram | null
): VisualExecutionEngine {
  return new VisualExecutionEngine(program, flowProgram);
}
