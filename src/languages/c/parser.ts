/**
 * C Parser — Recursive descent parser for educational C programs.
 *
 * Produces a C-specific AST (CAst) that the normalizer converts to Program IR.
 * Supports: functions, variables, control flow, I/O, expressions, arrays.
 */

import { CLexer, type Token, type TokenType } from './lexer';
import type { SourceLocation } from '../../core/ir/source-location';
import type { Diagnostic } from '../../core/conversion/diagnostics';

// ─── C AST Node Types ────────────────────────────────────────────

export type CTypeSpec = {
  base: string; // 'int', 'float', 'double', 'char', 'void', etc.
  isConst?: boolean;
  isPointer?: boolean;
  isUnsigned?: boolean;
  arraySize?: number;
};

export type CExpression =
  | { kind: 'int-literal'; value: string; location: SourceLocation }
  | { kind: 'float-literal'; value: string; location: SourceLocation }
  | { kind: 'string-literal'; value: string; location: SourceLocation }
  | { kind: 'char-literal'; value: string; location: SourceLocation }
  | { kind: 'identifier'; name: string; location: SourceLocation }
  | { kind: 'binary'; op: string; left: CExpression; right: CExpression; location: SourceLocation }
  | { kind: 'unary'; op: string; position: 'prefix' | 'postfix'; operand: CExpression; location: SourceLocation }
  | { kind: 'assignment'; op: string; target: CExpression; value: CExpression; location: SourceLocation }
  | { kind: 'call'; callee: string; args: CExpression[]; location: SourceLocation }
  | { kind: 'array-access'; array: CExpression; index: CExpression; location: SourceLocation }
  | { kind: 'member-access'; object: CExpression; member: string; op: '.' | '->'; location: SourceLocation }
  | { kind: 'cast'; targetType: CTypeSpec; expression: CExpression; location: SourceLocation }
  | { kind: 'sizeof'; operand: CExpression | CTypeSpec; location: SourceLocation }
  | { kind: 'ternary'; condition: CExpression; consequent: CExpression; alternate: CExpression; location: SourceLocation }
  | { kind: 'address-of'; operand: CExpression; location: SourceLocation }
  | { kind: 'dereference'; operand: CExpression; location: SourceLocation }
  | { kind: 'paren'; expression: CExpression; location: SourceLocation };

export type CStatement =
  | { kind: 'var-decl'; type: CTypeSpec; name: string; init?: CExpression; location: SourceLocation }
  | { kind: 'array-decl'; type: CTypeSpec; name: string; size?: CExpression; init?: CExpression[]; location: SourceLocation }
  | { kind: 'expr-stmt'; expression: CExpression; location: SourceLocation }
  | { kind: 'if'; condition: CExpression; then: CStatement[]; else?: CStatement[]; location: SourceLocation }
  | { kind: 'while'; condition: CExpression; body: CStatement[]; location: SourceLocation }
  | { kind: 'for'; init?: CStatement; condition?: CExpression; update?: CExpression; body: CStatement[]; location: SourceLocation }
  | { kind: 'do-while'; condition: CExpression; body: CStatement[]; location: SourceLocation }
  | { kind: 'switch'; expression: CExpression; cases: CSwitchCase[]; location: SourceLocation }
  | { kind: 'return'; value?: CExpression; location: SourceLocation }
  | { kind: 'break'; location: SourceLocation }
  | { kind: 'continue'; location: SourceLocation }
  | { kind: 'block'; statements: CStatement[]; location: SourceLocation }
  | { kind: 'empty'; location: SourceLocation };

export interface CSwitchCase {
  value?: CExpression; // undefined = default
  body: CStatement[];
  location: SourceLocation;
}

export interface CParameter {
  type: CTypeSpec;
  name: string;
  location: SourceLocation;
}

export interface CFunction {
  returnType: CTypeSpec;
  name: string;
  parameters: CParameter[];
  body: CStatement[];
  location: SourceLocation;
}

export interface CPreprocessor {
  directive: string;
  value: string;
  location: SourceLocation;
}

export interface CProgram {
  preprocessors: CPreprocessor[];
  functions: CFunction[];
  globalVars: CStatement[];
}

// ─── Parser ──────────────────────────────────────────────────────

export class CParser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private diagnostics: Diagnostic[] = [];

  parse(source: string): { ast: CProgram | null; diagnostics: Diagnostic[] } {
    const lexer = new CLexer(source);
    this.tokens = lexer.tokenize();
    this.pos = 0;
    this.diagnostics = [];

    try {
      const program = this.parseProgram();
      return { ast: program, diagnostics: this.diagnostics };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown parse error';
      this.diagnostics.push({
        severity: 'error',
        category: 'parse',
        message: msg,
        sourceLocation: this.currentLocation(),
      });
      return { ast: null, diagnostics: this.diagnostics };
    }
  }

  // ─── Top-level parsing ───────────────────────────────────────

  private parseProgram(): CProgram {
    const preprocessors: CPreprocessor[] = [];
    const functions: CFunction[] = [];
    const globalVars: CStatement[] = [];

    while (!this.isAtEnd()) {
      // Preprocessor directives
      if (this.check('PREPROCESSOR')) {
        const tok = this.advance();
        preprocessors.push({
          directive: tok.value,
          value: tok.value,
          location: tok.location,
        });
        continue;
      }

      // Try to parse a function or global variable
      if (this.isTypeStart()) {
        const saved = this.pos;
        try {
          const fn = this.parseFunctionOrGlobal();
          if (fn) {
            if ('body' in fn && 'parameters' in fn) {
              functions.push(fn as CFunction);
            } else {
              globalVars.push(fn as CStatement);
            }
            continue;
          }
        } catch {
          this.pos = saved;
        }
      }

      // Skip unknown tokens
      if (!this.isAtEnd()) {
        const tok = this.advance();
        this.diagnostics.push({
          severity: 'warning',
          category: 'parse',
          message: `Unexpected token: ${tok.value}`,
          sourceLocation: tok.location,
        });
      }
    }

    return { preprocessors, functions, globalVars };
  }

  private parseFunctionOrGlobal(): CFunction | CStatement {
    const typeSpec = this.parseTypeSpec();
    const name = this.expect('IDENTIFIER').value;
    const loc = this.tokens[this.pos - 1].location;

    // Function
    if (this.check('LPAREN')) {
      this.advance(); // (
      const params = this.parseParameterList();
      this.expect('RPAREN');
      const body = this.parseBlock();
      return {
        returnType: typeSpec,
        name,
        parameters: params,
        body,
        location: {
          startLine: typeSpec.isConst ? loc.startLine : loc.startLine,
          endLine: this.tokens[this.pos - 1]?.location.endLine ?? loc.endLine,
          startColumn: loc.startColumn,
          endColumn: this.tokens[this.pos - 1]?.location.endColumn ?? loc.endColumn,
        },
      };
    }

    // Array declaration
    if (this.check('LBRACKET')) {
      return this.finishArrayDecl(typeSpec, name, loc);
    }

    // Global variable
    let init: CExpression | undefined;
    if (this.check('ASSIGN')) {
      this.advance();
      init = this.parseExpression();
    }
    this.expect('SEMICOLON');

    return {
      kind: 'var-decl',
      type: typeSpec,
      name,
      init,
      location: loc,
    };
  }

  // ─── Type Parsing ────────────────────────────────────────────

  private isTypeStart(): boolean {
    const t = this.current().type;
    return (
      t === 'KW_INT' || t === 'KW_FLOAT' || t === 'KW_DOUBLE' ||
      t === 'KW_CHAR' || t === 'KW_VOID' || t === 'KW_BOOL' ||
      t === 'KW_LONG' || t === 'KW_SHORT' || t === 'KW_UNSIGNED' ||
      t === 'KW_SIGNED' || t === 'KW_CONST' || t === 'KW_STRUCT'
    );
  }

  private parseTypeSpec(): CTypeSpec {
    let isConst = false;
    let isUnsigned = false;
    let base = '';
    let isPointer = false;

    if (this.check('KW_CONST')) {
      isConst = true;
      this.advance();
    }

    if (this.check('KW_UNSIGNED')) {
      isUnsigned = true;
      this.advance();
    }
    if (this.check('KW_SIGNED')) {
      this.advance(); // just skip, default is signed
    }

    if (this.check('KW_LONG')) {
      this.advance();
      if (this.check('KW_LONG')) {
        this.advance();
        base = 'long long';
      } else if (this.check('KW_INT')) {
        this.advance();
        base = 'long';
      } else {
        base = 'long';
      }
    } else if (this.check('KW_SHORT')) {
      this.advance();
      if (this.check('KW_INT')) this.advance();
      base = 'short';
    } else {
      const tok = this.advance();
      switch (tok.type) {
        case 'KW_INT': base = 'int'; break;
        case 'KW_FLOAT': base = 'float'; break;
        case 'KW_DOUBLE': base = 'double'; break;
        case 'KW_CHAR': base = 'char'; break;
        case 'KW_VOID': base = 'void'; break;
        case 'KW_BOOL': base = 'bool'; break;
        case 'IDENTIFIER': base = tok.value; break;
        default:
          this.addError(`Expected type, got ${tok.value}`, tok.location);
          base = 'int'; // fallback
      }
    }

    while (this.check('STAR')) {
      isPointer = true;
      this.advance();
    }

    return { base, isConst, isPointer, isUnsigned };
  }

  // ─── Parameter List ──────────────────────────────────────────

  private parseParameterList(): CParameter[] {
    const params: CParameter[] = [];

    if (this.check('RPAREN')) return params;

    // void parameter
    if (this.check('KW_VOID') && this.peek(1)?.type === 'RPAREN') {
      this.advance();
      return params;
    }

    do {
      if (this.check('COMMA')) this.advance();
      const type = this.parseTypeSpec();
      const name = this.expect('IDENTIFIER').value;
      const loc = this.tokens[this.pos - 1].location;

      // Array parameter: int arr[]
      if (this.check('LBRACKET')) {
        this.advance();
        if (this.check('RBRACKET')) {
          this.advance();
        } else {
          this.parseExpression(); // size
          this.expect('RBRACKET');
        }
        type.isPointer = true;
      }

      params.push({ type, name, location: loc });
    } while (this.check('COMMA'));

    return params;
  }

  // ─── Block ───────────────────────────────────────────────────

  private parseBlock(): CStatement[] {
    this.expect('LBRACE');
    const stmts: CStatement[] = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) stmts.push(stmt);
    }

    this.expect('RBRACE');
    return stmts;
  }

  // ─── Statement Parsing ───────────────────────────────────────

  private parseStatement(): CStatement | null {
    const tok = this.current();

    switch (tok.type) {
      case 'KW_IF': return this.parseIf();
      case 'KW_WHILE': return this.parseWhile();
      case 'KW_FOR': return this.parseFor();
      case 'KW_DO': return this.parseDoWhile();
      case 'KW_SWITCH': return this.parseSwitch();
      case 'KW_RETURN': return this.parseReturn();
      case 'KW_BREAK':
        this.advance();
        this.expect('SEMICOLON');
        return { kind: 'break', location: tok.location };
      case 'KW_CONTINUE':
        this.advance();
        this.expect('SEMICOLON');
        return { kind: 'continue', location: tok.location };
      case 'LBRACE': {
        const stmts = this.parseBlock();
        return { kind: 'block', statements: stmts, location: tok.location };
      }
      case 'SEMICOLON':
        this.advance();
        return { kind: 'empty', location: tok.location };
    }

    // Type-starting tokens → variable/array declaration
    if (this.isTypeStart()) {
      return this.parseDeclaration();
    }

    // Expression statement
    return this.parseExpressionStatement();
  }

  private parseDeclaration(): CStatement {
    const startLoc = this.current().location;
    const typeSpec = this.parseTypeSpec();
    const name = this.expect('IDENTIFIER').value;

    // Array declaration
    if (this.check('LBRACKET')) {
      return this.finishArrayDecl(typeSpec, name, startLoc);
    }

    // Variable declaration
    let init: CExpression | undefined;
    if (this.check('ASSIGN')) {
      this.advance();
      init = this.parseExpression();
    }
    this.expect('SEMICOLON');

    return { kind: 'var-decl', type: typeSpec, name, init, location: startLoc };
  }

  private finishArrayDecl(type: CTypeSpec, name: string, loc: SourceLocation): CStatement {
    this.expect('LBRACKET');
    let size: CExpression | undefined;
    if (!this.check('RBRACKET')) {
      size = this.parseExpression();
    }
    this.expect('RBRACKET');

    let init: CExpression[] | undefined;
    if (this.check('ASSIGN')) {
      this.advance();
      if (this.check('LBRACE')) {
        this.advance();
        init = [];
        while (!this.check('RBRACE') && !this.isAtEnd()) {
          init.push(this.parseExpression());
          if (this.check('COMMA')) this.advance();
        }
        this.expect('RBRACE');
      }
    }
    this.expect('SEMICOLON');

    return { kind: 'array-decl', type, name, size, init, location: loc };
  }

  private parseExpressionStatement(): CStatement {
    const loc = this.current().location;
    const expr = this.parseExpression();
    this.expect('SEMICOLON');
    return { kind: 'expr-stmt', expression: expr, location: loc };
  }

  // ─── Control Flow ────────────────────────────────────────────

  private parseIf(): CStatement {
    const loc = this.current().location;
    this.expect('KW_IF');
    this.expect('LPAREN');
    const condition = this.parseExpression();
    this.expect('RPAREN');

    const thenBody = this.parseStatementOrBlock();

    let elseBody: CStatement[] | undefined;
    if (this.check('KW_ELSE')) {
      this.advance();
      elseBody = this.parseStatementOrBlock();
    }

    return { kind: 'if', condition, then: thenBody, else: elseBody, location: loc };
  }

  private parseWhile(): CStatement {
    const loc = this.current().location;
    this.expect('KW_WHILE');
    this.expect('LPAREN');
    const condition = this.parseExpression();
    this.expect('RPAREN');
    const body = this.parseStatementOrBlock();
    return { kind: 'while', condition, body, location: loc };
  }

  private parseFor(): CStatement {
    const loc = this.current().location;
    this.expect('KW_FOR');
    this.expect('LPAREN');

    // Init
    let init: CStatement | undefined;
    if (!this.check('SEMICOLON')) {
      if (this.isTypeStart()) {
        init = this.parseDeclaration();
        // parseDeclaration already consumes the semicolon
      } else {
        init = this.parseExpressionStatement();
      }
    } else {
      this.advance(); // skip ;
    }

    // Condition
    let condition: CExpression | undefined;
    if (!this.check('SEMICOLON')) {
      condition = this.parseExpression();
    }
    this.expect('SEMICOLON');

    // Update
    let update: CExpression | undefined;
    if (!this.check('RPAREN')) {
      update = this.parseExpression();
    }
    this.expect('RPAREN');

    const body = this.parseStatementOrBlock();
    return { kind: 'for', init, condition, update, body, location: loc };
  }

  private parseDoWhile(): CStatement {
    const loc = this.current().location;
    this.expect('KW_DO');
    const body = this.parseStatementOrBlock();
    this.expect('KW_WHILE');
    this.expect('LPAREN');
    const condition = this.parseExpression();
    this.expect('RPAREN');
    this.expect('SEMICOLON');
    return { kind: 'do-while', condition, body, location: loc };
  }

  private parseSwitch(): CStatement {
    const loc = this.current().location;
    this.expect('KW_SWITCH');
    this.expect('LPAREN');
    const expression = this.parseExpression();
    this.expect('RPAREN');
    this.expect('LBRACE');

    const cases: CSwitchCase[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      if (this.check('KW_CASE')) {
        const caseLoc = this.current().location;
        this.advance();
        const value = this.parseExpression();
        this.expect('COLON');
        const body = this.parseCaseBody();
        cases.push({ value, body, location: caseLoc });
      } else if (this.check('KW_DEFAULT')) {
        const caseLoc = this.current().location;
        this.advance();
        this.expect('COLON');
        const body = this.parseCaseBody();
        cases.push({ body, location: caseLoc });
      } else {
        // unexpected
        this.advance();
      }
    }

    this.expect('RBRACE');
    return { kind: 'switch', expression, cases, location: loc };
  }

  private parseCaseBody(): CStatement[] {
    const stmts: CStatement[] = [];
    while (
      !this.check('KW_CASE') &&
      !this.check('KW_DEFAULT') &&
      !this.check('RBRACE') &&
      !this.isAtEnd()
    ) {
      const stmt = this.parseStatement();
      if (stmt) stmts.push(stmt);
    }
    return stmts;
  }

  private parseReturn(): CStatement {
    const loc = this.current().location;
    this.expect('KW_RETURN');
    let value: CExpression | undefined;
    if (!this.check('SEMICOLON')) {
      value = this.parseExpression();
    }
    this.expect('SEMICOLON');
    return { kind: 'return', value, location: loc };
  }

  private parseStatementOrBlock(): CStatement[] {
    if (this.check('LBRACE')) {
      return this.parseBlock();
    }
    const stmt = this.parseStatement();
    return stmt ? [stmt] : [];
  }

  // ─── Expression Parsing (Pratt-style precedence climbing) ────

  private parseExpression(): CExpression {
    return this.parseAssignment();
  }

  private parseAssignment(): CExpression {
    const left = this.parseTernary();

    if (
      this.check('ASSIGN') ||
      this.check('PLUS_ASSIGN') ||
      this.check('MINUS_ASSIGN') ||
      this.check('STAR_ASSIGN') ||
      this.check('SLASH_ASSIGN') ||
      this.check('PERCENT_ASSIGN')
    ) {
      const op = this.advance().value;
      const right = this.parseAssignment();
      return {
        kind: 'assignment',
        op,
        target: left,
        value: right,
        location: left.location,
      };
    }

    return left;
  }

  private parseTernary(): CExpression {
    const condition = this.parseLogicalOr();

    if (this.check('QUESTION')) {
      this.advance();
      const consequent = this.parseExpression();
      this.expect('COLON');
      const alternate = this.parseTernary();
      return {
        kind: 'ternary',
        condition,
        consequent,
        alternate,
        location: condition.location,
      };
    }

    return condition;
  }

  private parseLogicalOr(): CExpression {
    let left = this.parseLogicalAnd();
    while (this.check('OR')) {
      const op = this.advance().value;
      const right = this.parseLogicalAnd();
      left = { kind: 'binary', op, left, right, location: left.location };
    }
    return left;
  }

  private parseLogicalAnd(): CExpression {
    let left = this.parseBitwiseOr();
    while (this.check('AND')) {
      const op = this.advance().value;
      const right = this.parseBitwiseOr();
      left = { kind: 'binary', op, left, right, location: left.location };
    }
    return left;
  }

  private parseBitwiseOr(): CExpression {
    let left = this.parseBitwiseXor();
    while (this.check('PIPE')) {
      const op = this.advance().value;
      const right = this.parseBitwiseXor();
      left = { kind: 'binary', op, left, right, location: left.location };
    }
    return left;
  }

  private parseBitwiseXor(): CExpression {
    let left = this.parseBitwiseAnd();
    while (this.check('CARET')) {
      const op = this.advance().value;
      const right = this.parseBitwiseAnd();
      left = { kind: 'binary', op, left, right, location: left.location };
    }
    return left;
  }

  private parseBitwiseAnd(): CExpression {
    let left = this.parseEquality();
    while (this.check('AMPERSAND')) {
      const op = this.advance().value;
      const right = this.parseEquality();
      left = { kind: 'binary', op, left, right, location: left.location };
    }
    return left;
  }

  private parseEquality(): CExpression {
    let left = this.parseComparison();
    while (this.check('EQ') || this.check('NEQ')) {
      const op = this.advance().value;
      const right = this.parseComparison();
      left = { kind: 'binary', op, left, right, location: left.location };
    }
    return left;
  }

  private parseComparison(): CExpression {
    let left = this.parseShift();
    while (this.check('LT') || this.check('GT') || this.check('LTE') || this.check('GTE')) {
      const op = this.advance().value;
      const right = this.parseShift();
      left = { kind: 'binary', op, left, right, location: left.location };
    }
    return left;
  }

  private parseShift(): CExpression {
    let left = this.parseAdditive();
    while (this.check('LSHIFT') || this.check('RSHIFT')) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = { kind: 'binary', op, left, right, location: left.location };
    }
    return left;
  }

  private parseAdditive(): CExpression {
    let left = this.parseMultiplicative();
    while (this.check('PLUS') || this.check('MINUS')) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = { kind: 'binary', op, left, right, location: left.location };
    }
    return left;
  }

  private parseMultiplicative(): CExpression {
    let left = this.parseUnary();
    while (this.check('STAR') || this.check('SLASH') || this.check('PERCENT')) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { kind: 'binary', op, left, right, location: left.location };
    }
    return left;
  }

  private parseUnary(): CExpression {
    const tok = this.current();

    if (this.check('MINUS') || this.check('PLUS') || this.check('BANG') || this.check('TILDE')) {
      const op = this.advance().value;
      const operand = this.parseUnary();
      return { kind: 'unary', op, position: 'prefix', operand, location: tok.location };
    }

    if (this.check('PLUS_PLUS') || this.check('MINUS_MINUS')) {
      const op = this.advance().value;
      const operand = this.parseUnary();
      return { kind: 'unary', op, position: 'prefix', operand, location: tok.location };
    }

    if (this.check('AMPERSAND')) {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'address-of', operand, location: tok.location };
    }

    if (this.check('STAR')) {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'dereference', operand, location: tok.location };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): CExpression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.check('LBRACKET')) {
        this.advance();
        const index = this.parseExpression();
        this.expect('RBRACKET');
        expr = { kind: 'array-access', array: expr, index, location: expr.location };
      } else if (this.check('DOT')) {
        this.advance();
        const member = this.expect('IDENTIFIER').value;
        expr = { kind: 'member-access', object: expr, member, op: '.', location: expr.location };
      } else if (this.check('ARROW')) {
        this.advance();
        const member = this.expect('IDENTIFIER').value;
        expr = { kind: 'member-access', object: expr, member, op: '->', location: expr.location };
      } else if (this.check('PLUS_PLUS')) {
        this.advance();
        expr = { kind: 'unary', op: '++', position: 'postfix', operand: expr, location: expr.location };
      } else if (this.check('MINUS_MINUS')) {
        this.advance();
        expr = { kind: 'unary', op: '--', position: 'postfix', operand: expr, location: expr.location };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): CExpression {
    const tok = this.current();

    if (this.check('INT_LITERAL')) {
      this.advance();
      return { kind: 'int-literal', value: tok.value, location: tok.location };
    }

    if (this.check('FLOAT_LITERAL')) {
      this.advance();
      return { kind: 'float-literal', value: tok.value, location: tok.location };
    }

    if (this.check('STRING_LITERAL')) {
      this.advance();
      return { kind: 'string-literal', value: tok.value, location: tok.location };
    }

    if (this.check('CHAR_LITERAL')) {
      this.advance();
      return { kind: 'char-literal', value: tok.value, location: tok.location };
    }

    if (this.check('IDENTIFIER')) {
      const name = this.advance().value;

      // Function call
      if (this.check('LPAREN')) {
        this.advance();
        const args: CExpression[] = [];
        if (!this.check('RPAREN')) {
          args.push(this.parseExpression());
          while (this.check('COMMA')) {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        this.expect('RPAREN');
        return { kind: 'call', callee: name, args, location: tok.location };
      }

      return { kind: 'identifier', name, location: tok.location };
    }

    if (this.check('LPAREN')) {
      this.advance();
      // Could be a cast: (int)x
      if (this.isTypeStart() && this.lookAheadForCast()) {
        const type = this.parseTypeSpec();
        this.expect('RPAREN');
        const expr = this.parseUnary();
        return { kind: 'cast', targetType: type, expression: expr, location: tok.location };
      }
      const expr = this.parseExpression();
      this.expect('RPAREN');
      return { kind: 'paren', expression: expr, location: tok.location };
    }

    // Fallback
    this.advance();
    this.addError(`Unexpected token: ${tok.value}`, tok.location);
    return { kind: 'int-literal', value: '0', location: tok.location };
  }

  /**
   * Look ahead to determine if a parenthesized expression is a cast.
   * This is a heuristic: (type)expr patterns.
   */
  private lookAheadForCast(): boolean {
    const saved = this.pos;
    try {
      this.parseTypeSpec();
      return this.check('RPAREN');
    } catch {
      return false;
    } finally {
      this.pos = saved;
    }
  }

  // ─── Token Utilities ─────────────────────────────────────────

  private current(): Token {
    return this.tokens[this.pos] ?? this.tokens[this.tokens.length - 1];
  }

  private peek(offset: number): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private advance(): Token {
    const tok = this.current();
    if (!this.isAtEnd()) this.pos++;
    return tok;
  }

  private expect(type: TokenType): Token {
    if (this.check(type)) {
      return this.advance();
    }
    const tok = this.current();
    const expected = type.replace('KW_', '').toLowerCase();
    this.addError(
      `Expected '${expected}', got '${tok.value}'`,
      tok.location
    );
    // Try to recover by advancing
    return this.advance();
  }

  private isAtEnd(): boolean {
    return this.current().type === 'EOF';
  }

  private currentLocation(): SourceLocation {
    return this.current().location;
  }

  private addError(message: string, location: SourceLocation): void {
    this.diagnostics.push({
      severity: 'error',
      category: 'parse',
      message,
      sourceLocation: location,
    });
  }
}
