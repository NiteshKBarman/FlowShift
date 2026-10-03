/**
 * Python Normalizer — Converts Python AST into language-neutral Program IR.
 *
 * Handles:
 * - Recognizing print() as OutputStatement
 * - Recognizing input() / int(input()) as InputStatement
 * - Converting for-in range() loops to standard ForStatements
 * - Creating a synthetic main() function for top-level script statements
 * - Mapping Python types and operators to standard IR
 */

import type { PyProgram, PyStatement, PyExpression } from './parser';
import type { ProgramIR, IRFunction, IRParameter, IRImport } from '../../core/ir/program-ir';
import type { IRStatement, BlockStatement, IfStatement, ForStatement } from '../../core/ir/statement-ir';
import type { IRExpression, BinaryOperator, ComparisonOperator } from '../../core/ir/expression-ir';
import type { IRType } from '../../core/ir/type-ir';
import type { Diagnostic } from '../../core/conversion/diagnostics';
import {
  createProgram,
  createFunction,
  createParameter,
  createImport,
} from '../../core/ir/program-ir';
import {
  variableDeclaration,
  expressionStatement,
  inputStatement,
  outputStatement,
  ifStatement,
  whileStatement,
  forStatement,
  returnStatement,
  breakStatement,
  continueStatement,
  blockStatement,
  unknownStatement,
} from '../../core/ir/statement-ir';
import {
  literal,
  identifier,
  binary,
  unary,
  logical,
  comparison,
  assignment,
  call,
  arrayAccess,
  memberAccess,
  ternary,
  parenthesized,
} from '../../core/ir/expression-ir';
import {
  primitiveType,
  inferredType,
  arrayType,
} from '../../core/ir/type-ir';

export class PythonNormalizer {
  private diagnostics: Diagnostic[] = [];
  private declaredVariables = new Set<string>();

  normalize(ast: PyProgram): { ir: ProgramIR; diagnostics: Diagnostic[] } {
    this.diagnostics = [];
    this.declaredVariables.clear();

    const functions: IRFunction[] = [];
    const topLevelStatements: IRStatement[] = [];

    // Normalize explicitly defined functions
    for (const fn of ast.functions) {
      functions.push(this.normalizeFunction(fn));
    }

    // Normalize top-level statements
    for (const stmt of ast.statements) {
      if (stmt.kind !== 'function-def' && stmt.kind !== 'import') {
        const normalized = this.normalizeStatement(stmt);
        if (normalized) {
          topLevelStatements.push(normalized);
        }
      }
    }

    // If there are top-level executable statements, wrap them in a synthetic 'main' function
    // so flowcharts and conversion have a primary entry point
    if (topLevelStatements.length > 0) {
      const hasMain = functions.some((f) => f.name === 'main' || f.isMain);
      if (!hasMain) {
        functions.unshift(
          createFunction(
            'main',
            [],
            primitiveType('int'),
            blockStatement(topLevelStatements),
            { isMain: true }
          )
        );
      }
    }

    // Imports
    const imports: IRImport[] = ast.imports.map((imp) =>
      createImport(imp.module, imp.names, imp.location)
    );

    const program = createProgram(functions, 'python', {
      globalStatements: topLevelStatements.length > 0 && functions.some((f) => f.name === 'main' && f.body.statements === topLevelStatements)
        ? []
        : topLevelStatements,
      imports,
    });

    return { ir: program, diagnostics: this.diagnostics };
  }

  // ─── Function Normalization ────────────────────────────────────

  private normalizeFunction(fn: Extract<PyStatement, { kind: 'function-def' }>): IRFunction {
    const prevDeclared = new Set(this.declaredVariables);
    this.declaredVariables.clear();

    const params: IRParameter[] = fn.params.map((p) => {
      this.declaredVariables.add(p.name);
      return createParameter(
        p.name,
        p.typeAnnotation ? this.typeStringToIR(p.typeAnnotation) : inferredType(),
        p.defaultValue ? this.normalizeExpression(p.defaultValue) : undefined,
        p.location
      );
    });

    const bodyStatements: IRStatement[] = [];
    for (const stmt of fn.body) {
      const normalized = this.normalizeStatement(stmt);
      if (normalized) {
        bodyStatements.push(normalized);
      }
    }

    this.declaredVariables = prevDeclared;

    return createFunction(
      fn.name,
      params,
      fn.returnType ? this.typeStringToIR(fn.returnType) : primitiveType('void'),
      blockStatement(bodyStatements, fn.location),
      {
        isMain: fn.name === 'main',
        sourceLocation: fn.location,
      }
    );
  }

  // ─── Statement Normalization ───────────────────────────────────

  private normalizeStatement(stmt: PyStatement): IRStatement | null {
    switch (stmt.kind) {
      case 'assign': {
        // Check for input() assignment, e.g. x = input("prompt") or x = int(input())
        const inputStmt = this.tryNormalizeInput(stmt);
        if (inputStmt) return inputStmt;

        const targetExpr = this.normalizeExpression(stmt.target);
        const valueExpr = this.normalizeExpression(stmt.value);

        // If target is an identifier and not seen before, make it a VariableDeclaration
        if (targetExpr.kind === 'identifier' && !this.declaredVariables.has(targetExpr.name) && stmt.op === '=') {
          this.declaredVariables.add(targetExpr.name);
          return variableDeclaration(
            targetExpr.name,
            inferredType(),
            valueExpr,
            { sourceLocation: stmt.location }
          );
        }

        return expressionStatement(
          assignment(
            stmt.op as any,
            targetExpr,
            valueExpr,
            stmt.location
          ),
          stmt.location
        );
      }

      case 'expr-stmt': {
        // Check if expression is print(...)
        if (stmt.expression.kind === 'call') {
          const callee = stmt.expression.callee;
          if (callee.kind === 'identifier' && callee.name === 'print') {
            const args = stmt.expression.args.map((a) => this.normalizeExpression(a));
            return outputStatement(args, {
              newline: true,
              sourceLocation: stmt.location,
            });
          }
        }
        return expressionStatement(
          this.normalizeExpression(stmt.expression),
          stmt.location
        );
      }

      case 'if': {
        return this.normalizeIf(stmt);
      }

      case 'while': {
        const bodyStmts = stmt.body.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null);
        return whileStatement(
          this.normalizeExpression(stmt.condition),
          blockStatement(bodyStmts),
          stmt.location
        );
      }

      case 'for': {
        return this.normalizeFor(stmt);
      }

      case 'return': {
        return returnStatement(
          stmt.value ? this.normalizeExpression(stmt.value) : undefined,
          stmt.location
        );
      }

      case 'break':
        return breakStatement(stmt.location);

      case 'continue':
        return continueStatement(stmt.location);

      case 'pass':
        return null;

      case 'function-def':
      case 'import':
        return null;

      default:
        return unknownStatement('Unknown Python statement', stmt ? (stmt as any).location : undefined);
    }
  }

  // ─── If-Elif-Else Normalization ────────────────────────────────

  private normalizeIf(stmt: Extract<PyStatement, { kind: 'if' }>): IfStatement {
    const thenStmts = stmt.body.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null);
    const thenBlock = blockStatement(thenStmts);

    let elseBlock: BlockStatement | IfStatement | undefined;

    if (stmt.elseBody && stmt.elseBody.length > 0) {
      const elseStmts = stmt.elseBody.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null);
      elseBlock = blockStatement(elseStmts);
    }

    if (stmt.elifs && stmt.elifs.length > 0) {
      for (let i = stmt.elifs.length - 1; i >= 0; i--) {
        const elif = stmt.elifs[i];
        const elifStmts = elif.body.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null);
        elseBlock = ifStatement(
          this.normalizeExpression(elif.condition),
          blockStatement(elifStmts),
          elseBlock,
          elif.location
        );
      }
    }

    return ifStatement(
      this.normalizeExpression(stmt.condition),
      thenBlock,
      elseBlock,
      stmt.location
    );
  }

  // ─── For Loop Normalization (range handling) ───────────────────

  private normalizeFor(stmt: Extract<PyStatement, { kind: 'for' }>): ForStatement {
    this.declaredVariables.add(stmt.target);
    const bodyStmts = stmt.body.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null);
    const body = blockStatement(bodyStmts);

    // Check if iterable is range(...)
    if (stmt.iterable.kind === 'call' && stmt.iterable.callee.kind === 'identifier' && stmt.iterable.callee.name === 'range') {
      const args = stmt.iterable.args;
      let startExpr: IRExpression = literal('int', '0');
      let stopExpr: IRExpression = literal('int', '0');
      let stepExpr: IRExpression = literal('int', '1');

      if (args.length === 1) {
        stopExpr = this.normalizeExpression(args[0]);
      } else if (args.length >= 2) {
        startExpr = this.normalizeExpression(args[0]);
        stopExpr = this.normalizeExpression(args[1]);
        if (args.length >= 3) {
          stepExpr = this.normalizeExpression(args[2]);
        }
      }

      const init = variableDeclaration(
        stmt.target,
        primitiveType('int'),
        startExpr,
        { sourceLocation: stmt.location }
      );
      const cond = comparison('<', identifier(stmt.target), stopExpr);
      const update = (stepExpr.kind === 'literal' && stepExpr.value === '1')
        ? unary('++', 'postfix', identifier(stmt.target))
        : assignment('+=', identifier(stmt.target), stepExpr);

      return forStatement(init, cond, update, body, stmt.location);
    }

    // Default: for variable in iterable
    const init = variableDeclaration(
      stmt.target,
      inferredType(),
      this.normalizeExpression(stmt.iterable),
      { sourceLocation: stmt.location }
    );
    return forStatement(init, undefined, undefined, body, stmt.location);
  }

  // ─── Input Recognition ─────────────────────────────────────────

  private tryNormalizeInput(stmt: Extract<PyStatement, { kind: 'assign' }>): IRStatement | null {
    if (stmt.target.kind !== 'identifier') return null;
    const varName = stmt.target.name;

    // Direct input(): x = input("prompt")
    if (stmt.value.kind === 'call' && stmt.value.callee.kind === 'identifier' && stmt.value.callee.name === 'input') {
      let prompt: string | undefined;
      if (stmt.value.args.length > 0 && stmt.value.args[0].kind === 'string-literal') {
        prompt = stmt.value.args[0].value.replace(/^["']|["']$/g, '');
      }
      this.declaredVariables.add(varName);
      return inputStatement(varName, {
        prompt,
        type: primitiveType('string'),
        sourceLocation: stmt.location,
      });
    }

    // Typed input(): x = int(input("prompt")) or x = float(input())
    if (
      stmt.value.kind === 'call' &&
      stmt.value.callee.kind === 'identifier' &&
      (stmt.value.callee.name === 'int' || stmt.value.callee.name === 'float') &&
      stmt.value.args.length === 1
    ) {
      const inner = stmt.value.args[0];
      if (inner.kind === 'call' && inner.callee.kind === 'identifier' && inner.callee.name === 'input') {
        let prompt: string | undefined;
        if (inner.args.length > 0 && inner.args[0].kind === 'string-literal') {
          prompt = inner.args[0].value.replace(/^["']|["']$/g, '');
        }
        const irType = stmt.value.callee.name === 'int' ? primitiveType('int') : primitiveType('float');
        this.declaredVariables.add(varName);
        return inputStatement(varName, {
          prompt,
          type: irType,
          sourceLocation: stmt.location,
        });
      }
    }

    return null;
  }

  // ─── Expression Normalization ──────────────────────────────────

  private normalizeExpression(expr: PyExpression): IRExpression {
    switch (expr.kind) {
      case 'int-literal':
        return literal('int', expr.value, expr.location);

      case 'float-literal':
        return literal('float', expr.value, expr.location);

      case 'string-literal':
        return literal('string', expr.value, expr.location);

      case 'bool-literal':
        return literal('bool', expr.value ? 'true' : 'false', expr.location);

      case 'none-literal':
        return literal('null', 'null', expr.location);

      case 'identifier':
        return identifier(expr.name, expr.location);

      case 'binary': {
        const left = this.normalizeExpression(expr.left);
        const right = this.normalizeExpression(expr.right);
        let op = expr.op;
        if (op === '//') op = '/';
        return binary(op as BinaryOperator, left, right, expr.location);
      }

      case 'unary': {
        const operand = this.normalizeExpression(expr.operand);
        const op = expr.op === 'not' ? '!' : expr.op;
        return unary(op as any, 'prefix', operand, expr.location);
      }

      case 'logical': {
        const left = this.normalizeExpression(expr.left);
        const right = this.normalizeExpression(expr.right);
        const op = expr.op === 'and' ? '&&' : '||';
        return logical(op, left, right, expr.location);
      }

      case 'comparison': {
        const left = this.normalizeExpression(expr.left);
        const right = this.normalizeExpression(expr.right);
        return comparison(expr.op as ComparisonOperator, left, right, expr.location);
      }

      case 'call': {
        const callee = this.normalizeExpression(expr.callee);
        const args = expr.args.map((a) => this.normalizeExpression(a));
        return call(callee, args, expr.location);
      }

      case 'index': {
        const target = this.normalizeExpression(expr.target);
        const index = this.normalizeExpression(expr.index);
        return arrayAccess(target, index, expr.location);
      }

      case 'member-access': {
        const object = this.normalizeExpression(expr.object);
        return memberAccess(object, expr.member, expr.location);
      }

      case 'paren': {
        return parenthesized(this.normalizeExpression(expr.expression), expr.location);
      }

      case 'ternary': {
        return ternary(
          this.normalizeExpression(expr.condition),
          this.normalizeExpression(expr.consequent),
          this.normalizeExpression(expr.alternate),
          expr.location
        );
      }

      default:
        return identifier('unknown', (expr as any).location);
    }
  }

  // ─── Type Helpers ──────────────────────────────────────────────

  private typeStringToIR(typeStr: string): IRType {
    switch (typeStr.toLowerCase()) {
      case 'int': return primitiveType('int');
      case 'float': return primitiveType('float');
      case 'str': return primitiveType('string');
      case 'bool': return primitiveType('bool');
      case 'list': return arrayType(inferredType());
      default: return inferredType();
    }
  }
}
