/**
 * Java Normalizer — Converts Java AST into language-neutral Program IR.
 */

import type { JavaProgram, JavaMethod, JavaStatement, JavaExpression, JavaType } from './parser';
import type { ProgramIR, IRFunction, IRParameter } from '../../core/ir/program-ir';
import type { IRStatement } from '../../core/ir/statement-ir';
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
  doWhileStatement,
  switchStatement,
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

export class JavaNormalizer {
  private diagnostics: Diagnostic[] = [];

  normalize(ast: JavaProgram): { ir: ProgramIR; diagnostics: Diagnostic[] } {
    this.diagnostics = [];

    const functions: IRFunction[] = [];
    const globalStatements: IRStatement[] = [];

    for (const cls of ast.classes) {
      for (const field of cls.fields) {
        const norm = this.normalizeStatement(field);
        if (norm) globalStatements.push(norm);
      }

      for (const method of cls.methods) {
        functions.push(this.normalizeMethod(method));
      }
    }

    const imports = ast.imports.map((imp) => createImport(imp));

    const program = createProgram(functions, 'java', {
      globalStatements,
      imports,
    });

    return { ir: program, diagnostics: this.diagnostics };
  }

  private normalizeMethod(method: JavaMethod): IRFunction {
    const isMain = method.name === 'main';

    const params: IRParameter[] = method.params.map((p) =>
      createParameter(p.name, this.normalizeType(p.type), undefined, p.location)
    );

    const bodyStmts = method.body.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null);

    return createFunction(
      method.name,
      params,
      this.normalizeType(method.returnType),
      blockStatement(bodyStmts, method.location),
      {
        isMain,
        sourceLocation: method.location,
      }
    );
  }

  private normalizeStatement(stmt: JavaStatement): IRStatement | null {
    switch (stmt.kind) {
      case 'var-decl':
        return variableDeclaration(
          stmt.name,
          this.normalizeType(stmt.type),
          stmt.init ? this.normalizeExpression(stmt.init) : undefined,
          { sourceLocation: stmt.location }
        );

      case 'println': {
        const expressions = stmt.expressions.map((e) => this.normalizeExpression(e));
        return outputStatement(expressions, {
          newline: stmt.newline,
          sourceLocation: stmt.location,
        });
      }

      case 'scanner-input': {
        let inputType: IRType = primitiveType('string');
        if (stmt.method === 'nextInt') inputType = primitiveType('int');
        else if (stmt.method === 'nextDouble' || stmt.method === 'nextFloat') inputType = primitiveType('double');

        return inputStatement(stmt.variable, {
          type: inputType,
          sourceLocation: stmt.location,
        });
      }

      case 'expr-stmt':
        return expressionStatement(this.normalizeExpression(stmt.expression), stmt.location);

      case 'if': {
        const thenBlock = blockStatement(stmt.then.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null));
        const elseBlock = stmt.else
          ? blockStatement(stmt.else.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null))
          : undefined;
        return ifStatement(this.normalizeExpression(stmt.condition), thenBlock, elseBlock, stmt.location);
      }

      case 'while': {
        const body = blockStatement(stmt.body.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null));
        return whileStatement(this.normalizeExpression(stmt.condition), body, stmt.location);
      }

      case 'for': {
        const init = stmt.init ? this.normalizeStatement(stmt.init) ?? undefined : undefined;
        const cond = stmt.condition ? this.normalizeExpression(stmt.condition) : undefined;
        const update = stmt.update ? this.normalizeExpression(stmt.update) : undefined;
        const body = blockStatement(stmt.body.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null));
        return forStatement(init, cond, update, body, stmt.location);
      }

      case 'do-while': {
        const body = blockStatement(stmt.body.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null));
        return doWhileStatement(this.normalizeExpression(stmt.condition), body, stmt.location);
      }

      case 'switch': {
        const cases = stmt.cases.map((c) => ({
          value: c.value ? this.normalizeExpression(c.value) : undefined,
          body: c.body.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null),
          sourceLocation: c.location,
        }));
        return switchStatement(this.normalizeExpression(stmt.expression), cases, stmt.location);
      }

      case 'return':
        return returnStatement(stmt.value ? this.normalizeExpression(stmt.value) : undefined, stmt.location);

      case 'break':
        return breakStatement(stmt.location);

      case 'continue':
        return continueStatement(stmt.location);

      case 'block':
        return blockStatement(stmt.statements.map((s) => this.normalizeStatement(s)).filter((s): s is IRStatement => s !== null), stmt.location);

      default:
        return unknownStatement('Unknown Java statement', (stmt as any).location);
    }
  }

  private normalizeExpression(expr: JavaExpression): IRExpression {
    switch (expr.kind) {
      case 'int-literal':
        return literal('int', expr.value, expr.location);

      case 'float-literal':
        return literal('float', expr.value, expr.location);

      case 'string-literal':
        return literal('string', expr.value, expr.location);

      case 'char-literal':
        return literal('char', expr.value, expr.location);

      case 'bool-literal':
        return literal('bool', expr.value ? 'true' : 'false', expr.location);

      case 'null-literal':
        return literal('null', 'null', expr.location);

      case 'identifier':
        return identifier(expr.name, expr.location);

      case 'binary': {
        const left = this.normalizeExpression(expr.left);
        const right = this.normalizeExpression(expr.right);
        if (expr.op === '&&' || expr.op === '||') {
          return logical(expr.op, left, right, expr.location);
        }
        if (['==', '!=', '<', '<=', '>', '>='].includes(expr.op)) {
          return comparison(expr.op as ComparisonOperator, left, right, expr.location);
        }
        return binary(expr.op as BinaryOperator, left, right, expr.location);
      }

      case 'unary': {
        const operand = this.normalizeExpression(expr.operand);
        return unary(expr.op as any, expr.position, operand, expr.location);
      }

      case 'assignment': {
        const target = this.normalizeExpression(expr.target);
        const value = this.normalizeExpression(expr.value);
        return assignment(expr.op as any, target, value, expr.location);
      }

      case 'call': {
        const callee = this.normalizeExpression(expr.callee);
        const args = expr.args.map((a) => this.normalizeExpression(a));
        return call(callee, args, expr.location);
      }

      case 'array-access': {
        const array = this.normalizeExpression(expr.array);
        const index = this.normalizeExpression(expr.index);
        return arrayAccess(array, index, expr.location);
      }

      case 'member-access': {
        const object = this.normalizeExpression(expr.object);
        return memberAccess(object, expr.member, expr.location);
      }

      case 'paren':
        return parenthesized(this.normalizeExpression(expr.expression), expr.location);

      case 'ternary':
        return ternary(
          this.normalizeExpression(expr.condition),
          this.normalizeExpression(expr.consequent),
          this.normalizeExpression(expr.alternate),
          expr.location
        );

      default:
        return identifier('unknown', (expr as any).location);
    }
  }

  private normalizeType(type: JavaType): IRType {
    let base: IRType;
    switch (type.name) {
      case 'int': base = primitiveType('int'); break;
      case 'double': base = primitiveType('double'); break;
      case 'float': base = primitiveType('float'); break;
      case 'boolean': base = primitiveType('bool'); break;
      case 'char': base = primitiveType('char'); break;
      case 'String': base = primitiveType('string'); break;
      case 'void': base = primitiveType('void'); break;
      default: base = inferredType(); break;
    }

    if (type.isArray) {
      return arrayType(base);
    }
    return base;
  }
}
