/**
 * Client-side Safe Program IR Interpreter for FlowShift.
 *
 * Executes normalized Program IR in the browser without eval().
 * Supports interactive standard input (stdin) with async pauses,
 * streaming standard output (stdout), and process exit metadata.
 */

import type { ProgramIR, IRFunction } from '../ir/program-ir';
import type { IRStatement, BlockStatement } from '../ir/statement-ir';
import type { IRExpression } from '../ir/expression-ir';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

export interface InterpreterCallbacks {
  onOutput?: (chunk: string) => void;
  onInput?: (prompt: string) => Promise<string>;
}

const MAX_LOOP_ITERATIONS = 10000;
const MAX_CALL_STACK_DEPTH = 500;

export class ProgramInterpreter {
  private program: ProgramIR;
  private output: string[] = [];
  private errors: string[] = [];
  private functions = new Map<string, IRFunction>();
  private callDepth = 0;
  private inputBuffer: string[] = [];
  private callbacks?: InterpreterCallbacks;

  constructor(
    program: ProgramIR,
    inputOrCallbacks?: string | InterpreterCallbacks,
    callbacks?: InterpreterCallbacks
  ) {
    this.program = program;
    for (const fn of program.functions) {
      this.functions.set(fn.name, fn);
    }
    if (typeof inputOrCallbacks === 'string') {
      if (inputOrCallbacks.trim().length > 0) {
        this.inputBuffer = inputOrCallbacks.split(/\s+/).filter(Boolean);
      }
      this.callbacks = callbacks;
    } else if (inputOrCallbacks) {
      this.callbacks = inputOrCallbacks;
    }
  }

  private emitOutput(text: string): void {
    this.output.push(text);
    if (this.callbacks?.onOutput) {
      this.callbacks.onOutput(text);
    }
  }

  public async run(): Promise<ExecutionResult> {
    const startTime = performance.now();
    let exitCode = 0;

    try {
      const globalEnv: Record<string, any> = {};

      // 1. Execute global statements if any
      if (this.program.globalStatements.length > 0) {
        await this.executeBlock(
          { kind: 'block', statements: this.program.globalStatements },
          globalEnv
        );
      }

      // 2. Find and execute main function
      let mainFn =
        this.functions.get('main') ||
        Array.from(this.functions.values()).find((f) => f.isMain);

      if (!mainFn && this.functions.size > 0 && this.program.globalStatements.length === 0) {
        mainFn = Array.from(this.functions.values())[0];
      }

      if (mainFn) {
        const defaultArgs = mainFn.parameters.map(() => 5);
        const result = await this.executeFunction(mainFn, defaultArgs, globalEnv);
        if (typeof result === 'number') {
          exitCode = result;
        }
        if (this.output.length === 0 && result !== undefined && result !== 0) {
          this.emitOutput(`Return value: ${result}\n`);
        }
      }
    } catch (err: any) {
      this.errors.push(err.message || String(err));
      exitCode = 1;
    }

    const endTime = performance.now();
    return {
      stdout: this.output.join(''),
      stderr: this.errors.join('\n'),
      exitCode,
      executionTimeMs: Math.round(endTime - startTime),
    };
  }

  private async executeFunction(
    fn: IRFunction,
    args: any[],
    parentEnv: Record<string, any>
  ): Promise<any> {
    if (++this.callDepth > MAX_CALL_STACK_DEPTH) {
      throw new Error(`Stack overflow: maximum call depth (${MAX_CALL_STACK_DEPTH}) exceeded`);
    }

    const localEnv: Record<string, any> = { ...parentEnv };
    fn.parameters.forEach((param, i) => {
      localEnv[param.name] = args[i] !== undefined ? args[i] : 0;
    });

    try {
      const ret = await this.executeBlock(fn.body, localEnv);
      if (ret && (ret as any).__isReturn) {
        return (ret as any).value;
      }
      return ret !== undefined ? ret : 0;
    } finally {
      this.callDepth--;
    }
  }

  private async executeBlock(
    block: BlockStatement,
    env: Record<string, any>
  ): Promise<any> {
    for (const stmt of block.statements) {
      const ret = await this.executeStatement(stmt, env);
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

  private async executeStatement(
    stmt: IRStatement,
    env: Record<string, any>
  ): Promise<any> {
    switch (stmt.kind) {
      case 'variable-declaration': {
        const val = stmt.initializer
          ? await this.evalExpr(stmt.initializer, env)
          : 0;
        env[stmt.name] = val;
        break;
      }

      case 'expression-statement': {
        await this.evalExpr(stmt.expression, env);
        break;
      }

      case 'output': {
        await this.executeOutput(stmt, env);
        break;
      }

      case 'input': {
        await this.executeInput(stmt, env);
        break;
      }

      case 'if': {
        const condVal = await this.evalExpr(stmt.condition, env);
        const thenBlock = (stmt as any).thenBlock || (stmt as any).thenBranch;
        const elseBlock = (stmt as any).elseBlock || (stmt as any).elseBranch;

        if (this.isTruthy(condVal)) {
          if (thenBlock) {
            const ret =
              thenBlock.kind === 'block'
                ? await this.executeBlock(thenBlock, env)
                : await this.executeStatement(thenBlock, env);
            if (ret && (ret.__isReturn || ret.__isBreak || ret.__isContinue)) return ret;
          }
        } else if (elseBlock) {
          const ret =
            elseBlock.kind === 'block'
              ? await this.executeBlock(elseBlock, env)
              : await this.executeStatement(elseBlock, env);
          if (ret && (ret.__isReturn || ret.__isBreak || ret.__isContinue)) return ret;
        }
        break;
      }

      case 'while': {
        let iterations = 0;
        while (this.isTruthy(await this.evalExpr(stmt.condition, env))) {
          if (++iterations > MAX_LOOP_ITERATIONS) {
            throw new Error(`Infinite loop detected: exceeded ${MAX_LOOP_ITERATIONS} iterations`);
          }
          const ret = await this.executeBlock(stmt.body, env);
          if (ret && ret.__isReturn) return ret;
          if (ret && ret.__isBreak) break;
        }
        break;
      }

      case 'for': {
        if (stmt.init) await this.executeStatement(stmt.init, env);
        let iterations = 0;
        while (!stmt.condition || this.isTruthy(await this.evalExpr(stmt.condition, env))) {
          if (++iterations > MAX_LOOP_ITERATIONS) {
            throw new Error(`Infinite loop detected: exceeded ${MAX_LOOP_ITERATIONS} iterations`);
          }
          const ret = await this.executeBlock(stmt.body, env);
          if (ret && ret.__isReturn) return ret;
          if (ret && ret.__isBreak) break;
          if (stmt.update) await this.evalExpr(stmt.update, env);
        }
        break;
      }

      case 'do-while': {
        let iterations = 0;
        do {
          if (++iterations > MAX_LOOP_ITERATIONS) {
            throw new Error(`Infinite loop detected: exceeded ${MAX_LOOP_ITERATIONS} iterations`);
          }
          const ret = await this.executeBlock(stmt.body, env);
          if (ret && ret.__isReturn) return ret;
          if (ret && ret.__isBreak) break;
        } while (this.isTruthy(await this.evalExpr(stmt.condition, env)));
        break;
      }

      case 'return': {
        const val = stmt.value ? await this.evalExpr(stmt.value, env) : undefined;
        return { __isReturn: true, value: val };
      }

      case 'break': {
        return { __isBreak: true };
      }

      case 'continue': {
        return { __isContinue: true };
      }

      case 'block': {
        return await this.executeBlock(stmt, env);
      }

      case 'function-call': {
        const fn = this.functions.get(stmt.name);
        if (fn) {
          const args: any[] = [];
          for (const a of stmt.arguments) {
            args.push(await this.evalExpr(a, env));
          }
          await this.executeFunction(fn, args, env);
        }
        break;
      }
    }
  }

  private async executeOutput(stmt: any, env: Record<string, any>): Promise<void> {
    const pieces: string[] = [];
    for (const e of stmt.expressions) {
      let val = await this.evalExpr(e, env);
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
      const hasSpacedPiece = pieces.some((p: string) => p.endsWith(' ') || p.startsWith(' '));
      text = pieces.join(hasSpacedPiece ? '' : ' ');
    }

    if (stmt.newline !== false && !text.endsWith('\n')) {
      text += '\n';
    }
    this.emitOutput(text);
  }

  private async executeInput(stmt: any, env: Record<string, any>): Promise<void> {
    let promptText = '';
    if (stmt.prompt) {
      promptText = stmt.prompt;
      if (typeof promptText === 'string') {
        if ((promptText.startsWith('"') && promptText.endsWith('"')) || (promptText.startsWith("'") && promptText.endsWith("'"))) {
          promptText = promptText.slice(1, -1);
        }
        promptText = promptText.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      }
      this.emitOutput(promptText);
    }

    let valStr: string;
    if (this.inputBuffer.length > 0) {
      valStr = this.inputBuffer.shift()!;
      this.emitOutput(valStr + '\n');
    } else if (this.callbacks?.onInput) {
      valStr = await this.callbacks.onInput(promptText);
    } else {
      valStr = '5';
      this.emitOutput('5\n');
    }

    const num = Number(valStr);
    env[stmt.variable] = isNaN(num) ? valStr : num;
  }

  private async evalExpr(expr: IRExpression, env: Record<string, any>): Promise<any> {
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
        const l = await this.evalExpr(expr.left, env);
        const r = await this.evalExpr(expr.right, env);
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
        const l = await this.evalExpr(expr.left, env);
        const r = await this.evalExpr(expr.right, env);
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
        const l = await this.evalExpr(expr.left, env);
        if (expr.operator === '&&') {
          return this.isTruthy(l) ? await this.evalExpr(expr.right, env) : l;
        }
        if (expr.operator === '||') {
          return this.isTruthy(l) ? l : await this.evalExpr(expr.right, env);
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
            return expr.position === 'prefix' ? next : current;
          }
          return 0;
        }
        const val = await this.evalExpr(expr.operand, env);
        switch (expr.operator) {
          case '-': return -val;
          case '+': return +val;
          case '!': return !this.isTruthy(val);
          case '~': return ~val;
          default: return val;
        }
      }

      case 'assignment': {
        const val = await this.evalExpr(expr.value, env);
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
          return finalVal;
        }
        return val;
      }

      case 'call': {
        if (expr.callee.kind === 'identifier') {
          const fnName = expr.callee.name;
          const args: any[] = [];
          for (const a of expr.arguments) {
            args.push(await this.evalExpr(a, env));
          }

          // Math built-ins
          if (fnName === 'abs') return Math.abs(args[0]);
          if (fnName === 'max') return Math.max(args[0], args[1]);
          if (fnName === 'min') return Math.min(args[0], args[1]);
          if (fnName === 'sqrt') return Math.floor(Math.sqrt(args[0]));
          if (fnName === 'pow') return Math.pow(args[0], args[1]);

          // User-defined function (including recursive functions)
          const fn = this.functions.get(fnName);
          if (fn) {
            return await this.executeFunction(fn, args, env);
          }
        }
        return 0;
      }

      case 'ternary': {
        const cond = await this.evalExpr(expr.condition, env);
        return this.isTruthy(cond)
          ? await this.evalExpr(expr.consequent, env)
          : await this.evalExpr(expr.alternate, env);
      }

      case 'parenthesized':
        return await this.evalExpr(expr.expression, env);

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
}

export async function executeProgramIR(
  program: ProgramIR,
  inputDataOrCallbacks?: string | InterpreterCallbacks,
  callbacks?: InterpreterCallbacks
): Promise<ExecutionResult> {
  const interp = new ProgramInterpreter(program, inputDataOrCallbacks, callbacks);
  return await interp.run();
}
