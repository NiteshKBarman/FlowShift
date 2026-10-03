/**
 * Python Parser — Recursive descent parser for educational Python code.
 *
 * Consumes tokens from PythonLexer and builds a Python AST.
 * Handles indentation-based blocks, functions, control flow, assignments, calls, and expressions.
 */

import { PythonLexer, type PythonToken, type PythonTokenType } from './lexer';
import type { SourceLocation } from '../../core/ir/source-location';
import type { Diagnostic } from '../../core/conversion/diagnostics';

// ─── Python AST Types ──────────────────────────────────────────

export type PyExpression =
  | { kind: 'int-literal'; value: string; location: SourceLocation }
  | { kind: 'float-literal'; value: string; location: SourceLocation }
  | { kind: 'string-literal'; value: string; location: SourceLocation }
  | { kind: 'bool-literal'; value: boolean; location: SourceLocation }
  | { kind: 'none-literal'; location: SourceLocation }
  | { kind: 'identifier'; name: string; location: SourceLocation }
  | { kind: 'binary'; op: string; left: PyExpression; right: PyExpression; location: SourceLocation }
  | { kind: 'unary'; op: string; operand: PyExpression; location: SourceLocation }
  | { kind: 'logical'; op: 'and' | 'or'; left: PyExpression; right: PyExpression; location: SourceLocation }
  | { kind: 'comparison'; op: string; left: PyExpression; right: PyExpression; location: SourceLocation }
  | { kind: 'call'; callee: PyExpression; args: PyExpression[]; location: SourceLocation }
  | { kind: 'index'; target: PyExpression; index: PyExpression; location: SourceLocation }
  | { kind: 'member-access'; object: PyExpression; member: string; location: SourceLocation }
  | { kind: 'list-literal'; elements: PyExpression[]; location: SourceLocation }
  | { kind: 'dict-literal'; entries: Array<{ key: PyExpression; value: PyExpression }>; location: SourceLocation }
  | { kind: 'paren'; expression: PyExpression; location: SourceLocation }
  | { kind: 'ternary'; condition: PyExpression; consequent: PyExpression; alternate: PyExpression; location: SourceLocation };

export type PyStatement =
  | { kind: 'assign'; target: PyExpression; op: string; value: PyExpression; location: SourceLocation }
  | { kind: 'expr-stmt'; expression: PyExpression; location: SourceLocation }
  | { kind: 'if'; condition: PyExpression; body: PyStatement[]; elifs?: Array<{ condition: PyExpression; body: PyStatement[]; location: SourceLocation }>; elseBody?: PyStatement[]; location: SourceLocation }
  | { kind: 'while'; condition: PyExpression; body: PyStatement[]; elseBody?: PyStatement[]; location: SourceLocation }
  | { kind: 'for'; target: string; iterable: PyExpression; body: PyStatement[]; location: SourceLocation }
  | { kind: 'return'; value?: PyExpression; location: SourceLocation }
  | { kind: 'break'; location: SourceLocation }
  | { kind: 'continue'; location: SourceLocation }
  | { kind: 'pass'; location: SourceLocation }
  | { kind: 'function-def'; name: string; params: PyParameter[]; body: PyStatement[]; returnType?: string; location: SourceLocation }
  | { kind: 'import'; module: string; names?: string[]; alias?: string; location: SourceLocation };

export interface PyParameter {
  name: string;
  typeAnnotation?: string;
  defaultValue?: PyExpression;
  location: SourceLocation;
}

export interface PyProgram {
  statements: PyStatement[];
  functions: Array<Extract<PyStatement, { kind: 'function-def' }>>;
  imports: Array<Extract<PyStatement, { kind: 'import' }>>;
}

// ─── Python Parser Class ───────────────────────────────────────

export class PythonParser {
  private tokens: PythonToken[] = [];
  private pos = 0;
  private diagnostics: Diagnostic[] = [];

  parse(source: string): { ast: PyProgram | null; diagnostics: Diagnostic[] } {
    const lexer = new PythonLexer(source);
    this.tokens = lexer.tokenize();
    this.pos = 0;
    this.diagnostics = [];

    try {
      const program = this.parseProgram();
      return { ast: program, diagnostics: this.diagnostics };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown Python parse error';
      this.diagnostics.push({
        severity: 'error',
        category: 'parse',
        message: msg,
        sourceLocation: this.currentLocation(),
      });
      return { ast: null, diagnostics: this.diagnostics };
    }
  }

  private parseProgram(): PyProgram {
    const statements: PyStatement[] = [];
    const functions: Array<Extract<PyStatement, { kind: 'function-def' }>> = [];
    const imports: Array<Extract<PyStatement, { kind: 'import' }>> = [];

    this.skipNewlines();

    while (!this.isAtEnd()) {
      if (this.match('NEWLINE')) continue;

      const stmt = this.parseStatement();
      if (stmt) {
        if (stmt.kind === 'function-def') {
          functions.push(stmt);
        } else if (stmt.kind === 'import') {
          imports.push(stmt);
        }
        statements.push(stmt);
      }
      this.skipNewlines();
    }

    return { statements, functions, imports };
  }

  private parseStatement(): PyStatement | null {
    this.skipNewlines();
    if (this.isAtEnd()) return null;

    const token = this.peek();

    if (token.type === 'KW_DEF') {
      return this.parseFunctionDef();
    }
    if (token.type === 'KW_IF') {
      return this.parseIf();
    }
    if (token.type === 'KW_WHILE') {
      return this.parseWhile();
    }
    if (token.type === 'KW_FOR') {
      return this.parseFor();
    }
    if (token.type === 'KW_RETURN') {
      return this.parseReturn();
    }
    if (token.type === 'KW_BREAK') {
      const loc = this.advance().location;
      this.consumeStatementEnd();
      return { kind: 'break', location: loc };
    }
    if (token.type === 'KW_CONTINUE') {
      const loc = this.advance().location;
      this.consumeStatementEnd();
      return { kind: 'continue', location: loc };
    }
    if (token.type === 'KW_PASS') {
      const loc = this.advance().location;
      this.consumeStatementEnd();
      return { kind: 'pass', location: loc };
    }
    if (token.type === 'KW_IMPORT' || token.type === 'KW_FROM') {
      return this.parseImport();
    }

    // Otherwise, assignment or expression statement
    return this.parseAssignmentOrExpr();
  }

  private parseFunctionDef(): PyStatement {
    const startLoc = this.consume('KW_DEF', 'Expected def').location;
    const nameToken = this.consume('IDENTIFIER', 'Expected function name');
    const name = nameToken.value;

    this.consume('LPAREN', "Expected '(' after function name");
    const params: PyParameter[] = [];

    if (!this.check('RPAREN')) {
      do {
        if (this.match('COMMA')) continue;
        if (this.check('RPAREN')) break;

        const pNameToken = this.consume('IDENTIFIER', 'Expected parameter name');
        let typeAnnotation: string | undefined;
        let defaultValue: PyExpression | undefined;

        if (this.match('COLON')) {
          typeAnnotation = this.consume('IDENTIFIER', 'Expected type annotation').value;
        }
        if (this.match('ASSIGN')) {
          defaultValue = this.parseExpression();
        }

        params.push({
          name: pNameToken.value,
          typeAnnotation,
          defaultValue,
          location: pNameToken.location,
        });
      } while (this.match('COMMA'));
    }
    this.consume('RPAREN', "Expected ')' after parameters");

    let returnType: string | undefined;
    if (this.match('ARROW')) {
      returnType = this.consume('IDENTIFIER', 'Expected return type').value;
    }

    this.consume('COLON', "Expected ':' after function header");
    const body = this.parseBlock();

    return {
      kind: 'function-def',
      name,
      params,
      body,
      returnType,
      location: {
        startLine: startLoc.startLine,
        startColumn: startLoc.startColumn,
        endLine: body.length > 0 ? body[body.length - 1].location.endLine : startLoc.endLine,
        endColumn: body.length > 0 ? body[body.length - 1].location.endColumn : startLoc.endColumn,
      },
    };
  }

  private parseIf(): PyStatement {
    const startLoc = this.consume('KW_IF', 'Expected if').location;
    const condition = this.parseExpression();
    this.consume('COLON', "Expected ':' after if condition");
    const body = this.parseBlock();

    const elifs: Array<{ condition: PyExpression; body: PyStatement[]; location: SourceLocation }> = [];
    while (this.check('KW_ELIF')) {
      const elifLoc = this.advance().location;
      const elifCond = this.parseExpression();
      this.consume('COLON', "Expected ':' after elif condition");
      const elifBody = this.parseBlock();
      elifs.push({ condition: elifCond, body: elifBody, location: elifLoc });
    }

    let elseBody: PyStatement[] | undefined;
    if (this.check('KW_ELSE')) {
      this.advance();
      this.consume('COLON', "Expected ':' after else");
      elseBody = this.parseBlock();
    }

    return {
      kind: 'if',
      condition,
      body,
      elifs: elifs.length > 0 ? elifs : undefined,
      elseBody,
      location: {
        startLine: startLoc.startLine,
        startColumn: startLoc.startColumn,
        endLine: elseBody && elseBody.length > 0
          ? elseBody[elseBody.length - 1].location.endLine
          : elifs.length > 0
            ? elifs[elifs.length - 1].body[elifs[elifs.length - 1].body.length - 1]?.location.endLine ?? startLoc.endLine
            : body.length > 0 ? body[body.length - 1].location.endLine : startLoc.endLine,
        endColumn: startLoc.endColumn,
      },
    };
  }

  private parseWhile(): PyStatement {
    const startLoc = this.consume('KW_WHILE', 'Expected while').location;
    const condition = this.parseExpression();
    this.consume('COLON', "Expected ':' after while condition");
    const body = this.parseBlock();

    let elseBody: PyStatement[] | undefined;
    if (this.match('KW_ELSE')) {
      this.consume('COLON', "Expected ':' after else");
      elseBody = this.parseBlock();
    }

    return {
      kind: 'while',
      condition,
      body,
      elseBody,
      location: {
        startLine: startLoc.startLine,
        startColumn: startLoc.startColumn,
        endLine: body.length > 0 ? body[body.length - 1].location.endLine : startLoc.endLine,
        endColumn: startLoc.endColumn,
      },
    };
  }

  private parseFor(): PyStatement {
    const startLoc = this.consume('KW_FOR', 'Expected for').location;
    const targetToken = this.consume('IDENTIFIER', 'Expected loop variable name');
    this.consume('KW_IN', "Expected 'in' in for loop");
    const iterable = this.parseExpression();
    this.consume('COLON', "Expected ':' after for loop");
    const body = this.parseBlock();

    return {
      kind: 'for',
      target: targetToken.value,
      iterable,
      body,
      location: {
        startLine: startLoc.startLine,
        startColumn: startLoc.startColumn,
        endLine: body.length > 0 ? body[body.length - 1].location.endLine : startLoc.endLine,
        endColumn: startLoc.endColumn,
      },
    };
  }

  private parseReturn(): PyStatement {
    const startLoc = this.consume('KW_RETURN', 'Expected return').location;
    let value: PyExpression | undefined;

    if (!this.check('NEWLINE') && !this.check('EOF') && !this.check('DEDENT')) {
      value = this.parseExpression();
    }
    this.consumeStatementEnd();

    return {
      kind: 'return',
      value,
      location: {
        startLine: startLoc.startLine,
        startColumn: startLoc.startColumn,
        endLine: value?.location.endLine ?? startLoc.endLine,
        endColumn: value?.location.endColumn ?? startLoc.endColumn,
      },
    };
  }

  private parseImport(): PyStatement {
    const startLoc = this.peek().location;
    if (this.match('KW_FROM')) {
      const moduleToken = this.consume('IDENTIFIER', 'Expected module name');
      this.consume('KW_IMPORT', "Expected 'import' after module");
      const names: string[] = [];
      do {
        if (this.check('IDENTIFIER')) {
          names.push(this.advance().value);
        } else if (this.check('STAR')) {
          names.push('*');
          this.advance();
        }
      } while (this.match('COMMA'));
      this.consumeStatementEnd();
      return { kind: 'import', module: moduleToken.value, names, location: startLoc };
    }

    this.consume('KW_IMPORT', 'Expected import');
    const moduleToken = this.consume('IDENTIFIER', 'Expected module name');
    let alias: string | undefined;
    if (this.match('KW_AS')) {
      alias = this.consume('IDENTIFIER', 'Expected alias').value;
    }
    this.consumeStatementEnd();
    return { kind: 'import', module: moduleToken.value, alias, location: startLoc };
  }

  private parseAssignmentOrExpr(): PyStatement {
    const expr = this.parseExpression();

    const assignOps: PythonTokenType[] = ['ASSIGN', 'PLUS_ASSIGN', 'MINUS_ASSIGN', 'STAR_ASSIGN', 'SLASH_ASSIGN'];
    for (const opType of assignOps) {
      if (this.check(opType)) {
        const opToken = this.advance();
        const value = this.parseExpression();
        this.consumeStatementEnd();
        return {
          kind: 'assign',
          target: expr,
          op: opToken.value,
          value,
          location: {
            startLine: expr.location.startLine,
            startColumn: expr.location.startColumn,
            endLine: value.location.endLine,
            endColumn: value.location.endColumn,
          },
        };
      }
    }

    this.consumeStatementEnd();
    return {
      kind: 'expr-stmt',
      expression: expr,
      location: expr.location,
    };
  }

  private parseBlock(): PyStatement[] {
    this.consumeStatementEnd();
    const statements: PyStatement[] = [];

    // May have inline single statement or INDENT block
    if (this.match('INDENT')) {
      while (!this.check('DEDENT') && !this.isAtEnd()) {
        this.skipNewlines();
        if (this.check('DEDENT') || this.isAtEnd()) break;
        const stmt = this.parseStatement();
        if (stmt) statements.push(stmt);
      }
      this.match('DEDENT');
    } else {
      // Single line statement
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    return statements;
  }

  // ─── Expressions (Precedence Climbing) ──────────────────────────

  parseExpression(): PyExpression {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): PyExpression {
    let expr = this.parseLogicalAnd();
    while (this.match('KW_OR')) {
      const right = this.parseLogicalAnd();
      expr = {
        kind: 'logical',
        op: 'or',
        left: expr,
        right,
        location: {
          startLine: expr.location.startLine,
          startColumn: expr.location.startColumn,
          endLine: right.location.endLine,
          endColumn: right.location.endColumn,
        },
      };
    }
    return expr;
  }

  private parseLogicalAnd(): PyExpression {
    let expr = this.parseLogicalNot();
    while (this.match('KW_AND')) {
      const right = this.parseLogicalNot();
      expr = {
        kind: 'logical',
        op: 'and',
        left: expr,
        right,
        location: {
          startLine: expr.location.startLine,
          startColumn: expr.location.startColumn,
          endLine: right.location.endLine,
          endColumn: right.location.endColumn,
        },
      };
    }
    return expr;
  }

  private parseLogicalNot(): PyExpression {
    if (this.match('KW_NOT')) {
      const loc = this.previous().location;
      const operand = this.parseLogicalNot();
      return {
        kind: 'unary',
        op: 'not',
        operand,
        location: {
          startLine: loc.startLine,
          startColumn: loc.startColumn,
          endLine: operand.location.endLine,
          endColumn: operand.location.endColumn,
        },
      };
    }
    return this.parseComparison();
  }

  private parseComparison(): PyExpression {
    let expr = this.parseBitwiseOr();
    const compTokens: PythonTokenType[] = ['EQ', 'NEQ', 'LT', 'GT', 'LTE', 'GTE', 'KW_IN', 'KW_IS'];

    for (const tokenType of compTokens) {
      if (this.check(tokenType)) {
        const op = this.advance().value;
        const right = this.parseBitwiseOr();
        expr = {
          kind: 'comparison',
          op,
          left: expr,
          right,
          location: {
            startLine: expr.location.startLine,
            startColumn: expr.location.startColumn,
            endLine: right.location.endLine,
            endColumn: right.location.endColumn,
          },
        };
      }
    }
    return expr;
  }

  private parseBitwiseOr(): PyExpression {
    let expr = this.parseBitwiseXor();
    while (this.match('PIPE')) {
      const right = this.parseBitwiseXor();
      expr = {
        kind: 'binary',
        op: '|',
        left: expr,
        right,
        location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: right.location.endLine, endColumn: right.location.endColumn },
      };
    }
    return expr;
  }

  private parseBitwiseXor(): PyExpression {
    let expr = this.parseBitwiseAnd();
    while (this.match('CARET')) {
      const right = this.parseBitwiseAnd();
      expr = {
        kind: 'binary',
        op: '^',
        left: expr,
        right,
        location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: right.location.endLine, endColumn: right.location.endColumn },
      };
    }
    return expr;
  }

  private parseBitwiseAnd(): PyExpression {
    let expr = this.parseShift();
    while (this.match('AMPERSAND')) {
      const right = this.parseShift();
      expr = {
        kind: 'binary',
        op: '&',
        left: expr,
        right,
        location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: right.location.endLine, endColumn: right.location.endColumn },
      };
    }
    return expr;
  }

  private parseShift(): PyExpression {
    let expr = this.parseAdditive();
    while (this.check('LSHIFT') || this.check('RSHIFT')) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      expr = {
        kind: 'binary',
        op,
        left: expr,
        right,
        location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: right.location.endLine, endColumn: right.location.endColumn },
      };
    }
    return expr;
  }

  private parseAdditive(): PyExpression {
    let expr = this.parseMultiplicative();
    while (this.check('PLUS') || this.check('MINUS')) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      expr = {
        kind: 'binary',
        op,
        left: expr,
        right,
        location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: right.location.endLine, endColumn: right.location.endColumn },
      };
    }
    return expr;
  }

  private parseMultiplicative(): PyExpression {
    let expr = this.parsePower();
    while (this.check('STAR') || this.check('SLASH') || this.check('DOUBLE_SLASH') || this.check('PERCENT')) {
      const op = this.advance().value;
      const right = this.parsePower();
      expr = {
        kind: 'binary',
        op,
        left: expr,
        right,
        location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: right.location.endLine, endColumn: right.location.endColumn },
      };
    }
    return expr;
  }

  private parsePower(): PyExpression {
    let expr = this.parseUnary();
    if (this.match('DOUBLE_STAR')) {
      const right = this.parseUnary();
      expr = {
        kind: 'binary',
        op: '**',
        left: expr,
        right,
        location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: right.location.endLine, endColumn: right.location.endColumn },
      };
    }
    return expr;
  }

  private parseUnary(): PyExpression {
    if (this.check('PLUS') || this.check('MINUS') || this.check('TILDE')) {
      const opToken = this.advance();
      const operand = this.parseUnary();
      return {
        kind: 'unary',
        op: opToken.value,
        operand,
        location: {
          startLine: opToken.location.startLine,
          startColumn: opToken.location.startColumn,
          endLine: operand.location.endLine,
          endColumn: operand.location.endColumn,
        },
      };
    }
    return this.parseCallOrMember();
  }

  private parseCallOrMember(): PyExpression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('LPAREN')) {
        const args: PyExpression[] = [];
        if (!this.check('RPAREN')) {
          do {
            if (this.match('COMMA')) continue;
            if (this.check('RPAREN')) break;
            args.push(this.parseExpression());
          } while (this.match('COMMA'));
        }
        const closeLoc = this.consume('RPAREN', "Expected ')' after arguments").location;
        expr = {
          kind: 'call',
          callee: expr,
          args,
          location: {
            startLine: expr.location.startLine,
            startColumn: expr.location.startColumn,
            endLine: closeLoc.endLine,
            endColumn: closeLoc.endColumn,
          },
        };
      } else if (this.match('LBRACKET')) {
        const index = this.parseExpression();
        const closeLoc = this.consume('RBRACKET', "Expected ']' after index").location;
        expr = {
          kind: 'index',
          target: expr,
          index,
          location: {
            startLine: expr.location.startLine,
            startColumn: expr.location.startColumn,
            endLine: closeLoc.endLine,
            endColumn: closeLoc.endColumn,
          },
        };
      } else if (this.match('DOT')) {
        const member = this.consume('IDENTIFIER', 'Expected property name after .');
        expr = {
          kind: 'member-access',
          object: expr,
          member: member.value,
          location: {
            startLine: expr.location.startLine,
            startColumn: expr.location.startColumn,
            endLine: member.location.endLine,
            endColumn: member.location.endColumn,
          },
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): PyExpression {
    const token = this.peek();

    if (token.type === 'INT_LITERAL') {
      this.advance();
      return { kind: 'int-literal', value: token.value, location: token.location };
    }
    if (token.type === 'FLOAT_LITERAL') {
      this.advance();
      return { kind: 'float-literal', value: token.value, location: token.location };
    }
    if (token.type === 'STRING_LITERAL') {
      this.advance();
      return { kind: 'string-literal', value: token.value, location: token.location };
    }
    if (token.type === 'BOOL_LITERAL') {
      this.advance();
      return { kind: 'bool-literal', value: token.value === 'True', location: token.location };
    }
    if (token.type === 'NONE_LITERAL') {
      this.advance();
      return { kind: 'none-literal', location: token.location };
    }
    if (token.type === 'IDENTIFIER' || token.type === 'KW_PRINT' || token.type === 'KW_RANGE') {
      this.advance();
      return { kind: 'identifier', name: token.value, location: token.location };
    }
    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      const closeLoc = this.consume('RPAREN', "Expected ')'").location;
      return {
        kind: 'paren',
        expression: expr,
        location: {
          startLine: token.location.startLine,
          startColumn: token.location.startColumn,
          endLine: closeLoc.endLine,
          endColumn: closeLoc.endColumn,
        },
      };
    }
    if (this.match('LBRACKET')) {
      const elements: PyExpression[] = [];
      if (!this.check('RBRACKET')) {
        do {
          if (this.match('COMMA')) continue;
          if (this.check('RBRACKET')) break;
          elements.push(this.parseExpression());
        } while (this.match('COMMA'));
      }
      const closeLoc = this.consume('RBRACKET', "Expected ']'").location;
      return {
        kind: 'list-literal',
        elements,
        location: {
          startLine: token.location.startLine,
          startColumn: token.location.startColumn,
          endLine: closeLoc.endLine,
          endColumn: closeLoc.endColumn,
        },
      };
    }
    if (this.match('LBRACE')) {
      const entries: Array<{ key: PyExpression; value: PyExpression }> = [];
      if (!this.check('RBRACE')) {
        do {
          if (this.match('COMMA')) continue;
          if (this.check('RBRACE')) break;
          const key = this.parseExpression();
          this.consume('COLON', "Expected ':' in dictionary entry");
          const val = this.parseExpression();
          entries.push({ key, value: val });
        } while (this.match('COMMA'));
      }
      const closeLoc = this.consume('RBRACE', "Expected '}'").location;
      return {
        kind: 'dict-literal',
        entries,
        location: {
          startLine: token.location.startLine,
          startColumn: token.location.startColumn,
          endLine: closeLoc.endLine,
          endColumn: closeLoc.endColumn,
        },
      };
    }

    // Fallback error node
    const errToken = this.advance();
    return {
      kind: 'identifier',
      name: errToken.value || 'unknown',
      location: errToken.location,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private skipNewlines(): void {
    while (this.check('NEWLINE') || this.check('SEMICOLON')) {
      this.advance();
    }
  }

  private consumeStatementEnd(): void {
    if (this.check('NEWLINE') || this.check('SEMICOLON')) {
      this.advance();
      this.skipNewlines();
    } else if (!this.check('EOF') && !this.check('DEDENT')) {
      // Graceful toleration
    }
  }

  private check(type: PythonTokenType): boolean {
    if (this.isAtEnd()) return type === 'EOF';
    return this.peek().type === type;
  }

  private match(...types: PythonTokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private advance(): PythonToken {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.tokens[this.pos].type === 'EOF';
  }

  private peek(): PythonToken {
    return this.tokens[this.pos] || { type: 'EOF', value: '', location: { startLine: 1, endLine: 1, startColumn: 1, endColumn: 1 } };
  }

  private previous(): PythonToken {
    return this.tokens[this.pos - 1];
  }

  private consume(type: PythonTokenType, message: string): PythonToken {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    this.diagnostics.push({
      severity: 'error',
      category: 'parse',
      message: `${message}, found '${token.value || token.type}'`,
      sourceLocation: token.location,
    });
    return token;
  }

  private currentLocation(): SourceLocation {
    const token = this.peek();
    return token.location;
  }
}
