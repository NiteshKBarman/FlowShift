/**
 * C Normalizer — Converts C-specific AST into language-neutral Program IR.
 *
 * This is where C-specific constructs (printf, scanf, etc.) are mapped
 * to their IR equivalents (output, input statements).
 */

import type {
  CProgram, CFunction, CStatement, CExpression, CTypeSpec, CParameter,
} from './parser';
import type { ProgramIR, IRFunction, IRParameter } from '../../core/ir/program-ir';
import type { IRStatement, BlockStatement, IfStatement } from '../../core/ir/statement-ir';
import type { IRExpression } from '../../core/ir/expression-ir';
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
  functionCallStatement,
  unknownStatement,
  emptyStatement,
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
  cast,
  ternary,
  parenthesized,
  unknownExpression,
} from '../../core/ir/expression-ir';
import {
  primitiveType,
  arrayType,
  pointerType,
  unknownType,
  inferredType,
} from '../../core/ir/type-ir';
import type {
  BinaryOperator, UnaryOperator, LogicalOperator,
  ComparisonOperator, AssignmentOperator,
} from '../../core/ir/expression-ir';

// ─── Normalizer ──────────────────────────────────────────────────

export class CNormalizer {
  private diagnostics: Diagnostic[] = [];

  normalize(ast: CProgram): { ir: ProgramIR; diagnostics: Diagnostic[] } {
    this.diagnostics = [];

    const functions = ast.functions.map((fn) => this.normalizeFunction(fn));

    const globalStmts = ast.globalVars.map((s) => this.normalizeStatement(s));

    const imports = ast.preprocessors
      .filter((p) => p.directive.startsWith('#include'))
      .map((p) => {
        const match = p.directive.match(/#include\s*[<"]([^>"]+)[>"]/);
        return createImport(match ? match[1] : p.directive);
      });

    const ir = createProgram(functions, 'c', {
      globalStatements: globalStmts,
      imports,
      metadata: { parseTimestamp: Date.now() },
    });

    return { ir, diagnostics: this.diagnostics };
  }

  // ─── Function ──────────────────────────────────────────────

  private normalizeFunction(fn: CFunction): IRFunction {
    const params = fn.parameters.map((p) => this.normalizeParameter(p));
    const body = this.normalizeBlock(fn.body);
    const returnType = this.normalizeType(fn.returnType);

    return createFunction(fn.name, params, returnType, body, {
      isMain: fn.name === 'main',
      sourceLocation: fn.location,
    });
  }

  private normalizeParameter(param: CParameter): IRParameter {
    return createParameter(
      param.name,
      this.normalizeType(param.type),
      undefined,
      param.location
    );
  }

  // ─── Type Conversion ──────────────────────────────────────

  private normalizeType(type: CTypeSpec): IRType {
    if (type.isPointer) {
      if (type.base === 'char') {
        // char* → string
        return primitiveType('string');
      }
      return pointerType(this.normalizeBaseType(type.base));
    }

    if (type.arraySize !== undefined) {
      return arrayType(this.normalizeBaseType(type.base), type.arraySize);
    }

    return this.normalizeBaseType(type.base);
  }

  private normalizeBaseType(base: string): IRType {
    switch (base) {
      case 'int':
      case 'long':
      case 'long long':
      case 'short':
        return primitiveType('int');
      case 'float':
        return primitiveType('float');
      case 'double':
        return primitiveType('double');
      case 'char':
        return primitiveType('char');
      case 'void':
        return primitiveType('void');
      case 'bool':
        return primitiveType('bool');
      default:
        return unknownType(base);
    }
  }

  // ─── Block ─────────────────────────────────────────────────

  private normalizeBlock(stmts: CStatement[]): BlockStatement {
    const irStmts = stmts.map((s) => this.normalizeStatement(s));
    return blockStatement(irStmts);
  }

  // ─── Statement ─────────────────────────────────────────────

  private normalizeStatement(stmt: CStatement): IRStatement {
    switch (stmt.kind) {
      case 'var-decl':
        return variableDeclaration(
          stmt.name,
          this.normalizeType(stmt.type),
          stmt.init ? this.normalizeExpression(stmt.init) : undefined,
          { isConst: stmt.type.isConst, sourceLocation: stmt.location }
        );

      case 'array-decl': {
        const elemType = this.normalizeType(stmt.type);
        const size = stmt.size
          ? parseInt(this.extractLiteral(stmt.size), 10)
          : undefined;
        return variableDeclaration(
          stmt.name,
          arrayType(elemType, isNaN(size!) ? undefined : size),
          undefined,
          { sourceLocation: stmt.location }
        );
      }

      case 'expr-stmt':
        return this.normalizeExpressionStatement(stmt);

      case 'if':
        return ifStatement(
          this.normalizeExpression(stmt.condition),
          this.normalizeBlock(stmt.then),
          stmt.else ? this.normalizeElse(stmt.else) : undefined,
          stmt.location
        );

      case 'while':
        return whileStatement(
          this.normalizeExpression(stmt.condition),
          this.normalizeBlock(stmt.body),
          stmt.location
        );

      case 'for':
        return forStatement(
          stmt.init ? this.normalizeStatement(stmt.init) : undefined,
          stmt.condition ? this.normalizeExpression(stmt.condition) : undefined,
          stmt.update ? this.normalizeExpression(stmt.update) : undefined,
          this.normalizeBlock(stmt.body),
          stmt.location
        );

      case 'do-while':
        return doWhileStatement(
          this.normalizeExpression(stmt.condition),
          this.normalizeBlock(stmt.body),
          stmt.location
        );

      case 'switch':
        return switchStatement(
          this.normalizeExpression(stmt.expression),
          stmt.cases.map((c) => ({
            value: c.value ? this.normalizeExpression(c.value) : undefined,
            body: c.body.map((s) => this.normalizeStatement(s)),
            sourceLocation: c.location,
          })),
          stmt.location
        );

      case 'return':
        return returnStatement(
          stmt.value ? this.normalizeExpression(stmt.value) : undefined,
          stmt.location
        );

      case 'break':
        return breakStatement(stmt.location);

      case 'continue':
        return continueStatement(stmt.location);

      case 'block':
        return this.normalizeBlock(stmt.statements);

      case 'empty':
        return emptyStatement(stmt.location);
    }
  }

  /**
   * Handles else clauses, detecting else-if chains.
   */
  private normalizeElse(stmts: CStatement[]): BlockStatement | IfStatement {
    if (stmts.length === 1 && stmts[0].kind === 'if') {
      // else-if chain
      const ifStmt = stmts[0];
      return ifStatement(
        this.normalizeExpression(ifStmt.condition),
        this.normalizeBlock(ifStmt.then),
        ifStmt.else ? this.normalizeElse(ifStmt.else) : undefined,
        ifStmt.location
      );
    }
    return this.normalizeBlock(stmts);
  }

  /**
   * Recognizes printf/scanf/puts patterns and converts to IR I/O statements.
   */
  private normalizeExpressionStatement(
    stmt: CStatement & { kind: 'expr-stmt' }
  ): IRStatement {
    const expr = stmt.expression;

    if (expr.kind === 'call') {
      // printf → output
      if (expr.callee === 'printf' || expr.callee === 'puts') {
        return this.normalizePrintf(expr, stmt.location);
      }

      // scanf → input
      if (expr.callee === 'scanf') {
        return this.normalizeScanf(expr, stmt.location);
      }

      // Regular function call
      return functionCallStatement(
        expr.callee,
        expr.args.map((a) => this.normalizeExpression(a)),
        stmt.location
      );
    }

    return expressionStatement(
      this.normalizeExpression(expr),
      stmt.location
    );
  }

  /**
   * Converts printf("...", args) → OutputStatement
   */
  private normalizePrintf(
    expr: CExpression & { kind: 'call' },
    location: import('../../core/ir/source-location').SourceLocation
  ): IRStatement {
    if (expr.args.length === 0) {
      return outputStatement([], {
        newline: expr.callee === 'puts',
        sourceLocation: location,
      });
    }

    const firstArg = expr.args[0];
    let formatStr: string | undefined;
    const outputExprs: IRExpression[] = [];

    if (firstArg.kind === 'string-literal') {
      formatStr = firstArg.value;

      // Extract non-format-specifier parts and map args
      const parts = this.parsePrintfFormat(firstArg.value);
      let argIdx = 1;

      for (const part of parts) {
        if (part.isSpecifier) {
          if (argIdx < expr.args.length) {
            outputExprs.push(this.normalizeExpression(expr.args[argIdx]));
            argIdx++;
          }
        } else if (part.text.length > 0) {
          outputExprs.push(literal('string', `"${part.text}"`));
        }
      }
    } else {
      outputExprs.push(this.normalizeExpression(firstArg));
    }

    const hasNewline = formatStr?.endsWith('\\n') ?? expr.callee === 'puts';

    return outputStatement(outputExprs, {
      newline: hasNewline,
      formatString: formatStr,
      sourceLocation: location,
    });
  }

  private parsePrintfFormat(format: string): Array<{ text: string; isSpecifier: boolean }> {
    const parts: Array<{ text: string; isSpecifier: boolean }> = [];
    let current = '';

    for (let i = 0; i < format.length; i++) {
      if (format[i] === '%' && i + 1 < format.length) {
        if (format[i + 1] === '%') {
          current += '%';
          i++;
          continue;
        }

        if (current.length > 0) {
          parts.push({ text: current, isSpecifier: false });
          current = '';
        }

        // Read format specifier
        let spec = '%';
        i++;
        while (i < format.length && !'diouxXeEfFgGaAcspn'.includes(format[i])) {
          spec += format[i];
          i++;
        }
        if (i < format.length) {
          spec += format[i];
        }
        parts.push({ text: spec, isSpecifier: true });
      } else if (format[i] === '\\' && i + 1 < format.length) {
        current += format[i] + format[i + 1];
        i++;
      } else {
        current += format[i];
      }
    }

    if (current.length > 0) {
      parts.push({ text: current, isSpecifier: false });
    }

    return parts;
  }

  /**
   * Converts scanf("%d", &x) → InputStatement
   */
  private normalizeScanf(
    expr: CExpression & { kind: 'call' },
    location: import('../../core/ir/source-location').SourceLocation
  ): IRStatement {
    if (expr.args.length < 2) {
      this.diagnostics.push({
        severity: 'warning',
        category: 'conversion',
        message: 'scanf with insufficient arguments',
        sourceLocation: location,
      });
      return unknownStatement('scanf(...)', location);
    }

    // Extract variable name from &var
    const varArg = expr.args[1];
    let varName: string;

    if (varArg.kind === 'address-of' && varArg.operand.kind === 'identifier') {
      varName = varArg.operand.name;
    } else if (varArg.kind === 'identifier') {
      varName = varArg.name;
    } else {
      varName = 'unknown';
      this.diagnostics.push({
        severity: 'warning',
        category: 'conversion',
        message: 'Complex scanf argument not fully supported',
        sourceLocation: location,
      });
    }

    // Determine type from format string
    let type: IRType = inferredType();
    const firstArg = expr.args[0];
    if (firstArg.kind === 'string-literal') {
      if (firstArg.value.includes('%d') || firstArg.value.includes('%i')) {
        type = primitiveType('int');
      } else if (firstArg.value.includes('%f') || firstArg.value.includes('%lf')) {
        type = primitiveType('float');
      } else if (firstArg.value.includes('%c')) {
        type = primitiveType('char');
      } else if (firstArg.value.includes('%s')) {
        type = primitiveType('string');
      }
    }

    return inputStatement(varName, { type, sourceLocation: location });
  }

  // ─── Expression ────────────────────────────────────────────

  private normalizeExpression(expr: CExpression): IRExpression {
    switch (expr.kind) {
      case 'int-literal':
        return literal('int', expr.value, expr.location);

      case 'float-literal':
        return literal('float', expr.value, expr.location);

      case 'string-literal':
        return literal('string', `"${expr.value}"`, expr.location);

      case 'char-literal':
        return literal('char', `'${expr.value}'`, expr.location);

      case 'identifier':
        return identifier(expr.name, expr.location);

      case 'binary': {
        const left = this.normalizeExpression(expr.left);
        const right = this.normalizeExpression(expr.right);

        // Classify operator
        if (expr.op === '&&' || expr.op === '||') {
          return logical(
            expr.op as LogicalOperator,
            left,
            right,
            expr.location
          );
        }
        if (['==', '!=', '<', '<=', '>', '>='].includes(expr.op)) {
          return comparison(
            expr.op as ComparisonOperator,
            left,
            right,
            expr.location
          );
        }
        return binary(
          expr.op as BinaryOperator,
          left,
          right,
          expr.location
        );
      }

      case 'unary':
        return unary(
          expr.op as UnaryOperator,
          expr.position,
          this.normalizeExpression(expr.operand),
          expr.location
        );

      case 'assignment':
        return assignment(
          expr.op as AssignmentOperator,
          this.normalizeExpression(expr.target),
          this.normalizeExpression(expr.value),
          expr.location
        );

      case 'call':
        return call(
          identifier(expr.callee, expr.location),
          expr.args.map((a) => this.normalizeExpression(a)),
          expr.location
        );

      case 'array-access':
        return arrayAccess(
          this.normalizeExpression(expr.array),
          this.normalizeExpression(expr.index),
          expr.location
        );

      case 'member-access':
        return memberAccess(
          this.normalizeExpression(expr.object),
          expr.member,
          expr.location
        );

      case 'cast':
        return cast(
          this.normalizeType(expr.targetType),
          this.normalizeExpression(expr.expression),
          expr.location
        );

      case 'ternary':
        return ternary(
          this.normalizeExpression(expr.condition),
          this.normalizeExpression(expr.consequent),
          this.normalizeExpression(expr.alternate),
          expr.location
        );

      case 'paren':
        return parenthesized(
          this.normalizeExpression(expr.expression),
          expr.location
        );

      case 'address-of':
        // Address-of is C-specific; represent as unary
        return unary('&' as UnaryOperator, 'prefix', this.normalizeExpression(expr.operand), expr.location);

      case 'dereference':
        return unary('*' as UnaryOperator, 'prefix', this.normalizeExpression(expr.operand), expr.location);

      case 'sizeof':
        return unknownExpression(`sizeof(...)`, expr.location);
    }
  }

  // ─── Utilities ─────────────────────────────────────────────

  private extractLiteral(expr: CExpression): string {
    if (expr.kind === 'int-literal') return expr.value;
    if (expr.kind === 'float-literal') return expr.value;
    return '0';
  }
}
