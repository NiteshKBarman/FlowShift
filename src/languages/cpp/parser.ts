/**
 * C++ Parser — Recursive descent parser for educational C++ programs.
 */

import { CPPLexer, type CPPToken, type CPPLexerTokenType } from './lexer';
import type { SourceLocation } from '../../core/ir/source-location';
import type { Diagnostic } from '../../core/conversion/diagnostics';

export type CPPType = {
  base: string; // 'int', 'float', 'double', 'char', 'string', 'bool', 'void'
  isConst?: boolean;
  isReference?: boolean;
  isPointer?: boolean;
};

export type CPPExpression =
  | { kind: 'int-literal'; value: string; location: SourceLocation }
  | { kind: 'float-literal'; value: string; location: SourceLocation }
  | { kind: 'string-literal'; value: string; location: SourceLocation }
  | { kind: 'char-literal'; value: string; location: SourceLocation }
  | { kind: 'bool-literal'; value: boolean; location: SourceLocation }
  | { kind: 'identifier'; name: string; location: SourceLocation }
  | { kind: 'binary'; op: string; left: CPPExpression; right: CPPExpression; location: SourceLocation }
  | { kind: 'unary'; op: string; position: 'prefix' | 'postfix'; operand: CPPExpression; location: SourceLocation }
  | { kind: 'assignment'; op: string; target: CPPExpression; value: CPPExpression; location: SourceLocation }
  | { kind: 'call'; callee: CPPExpression; args: CPPExpression[]; location: SourceLocation }
  | { kind: 'array-access'; array: CPPExpression; index: CPPExpression; location: SourceLocation }
  | { kind: 'member-access'; object: CPPExpression; member: string; op: '.' | '->'; location: SourceLocation }
  | { kind: 'paren'; expression: CPPExpression; location: SourceLocation }
  | { kind: 'ternary'; condition: CPPExpression; consequent: CPPExpression; alternate: CPPExpression; location: SourceLocation };

export type CPPStatement =
  | { kind: 'var-decl'; type: CPPType; name: string; init?: CPPExpression; location: SourceLocation }
  | { kind: 'cout'; items: CPPExpression[]; newline?: boolean; location: SourceLocation }
  | { kind: 'cin'; targets: string[]; location: SourceLocation }
  | { kind: 'expr-stmt'; expression: CPPExpression; location: SourceLocation }
  | { kind: 'if'; condition: CPPExpression; then: CPPStatement[]; else?: CPPStatement[]; location: SourceLocation }
  | { kind: 'while'; condition: CPPExpression; body: CPPStatement[]; location: SourceLocation }
  | { kind: 'for'; init?: CPPStatement; condition?: CPPExpression; update?: CPPExpression; body: CPPStatement[]; location: SourceLocation }
  | { kind: 'do-while'; condition: CPPExpression; body: CPPStatement[]; location: SourceLocation }
  | { kind: 'switch'; expression: CPPExpression; cases: Array<{ value?: CPPExpression; body: CPPStatement[]; location: SourceLocation }>; location: SourceLocation }
  | { kind: 'return'; value?: CPPExpression; location: SourceLocation }
  | { kind: 'break'; location: SourceLocation }
  | { kind: 'continue'; location: SourceLocation }
  | { kind: 'block'; statements: CPPStatement[]; location: SourceLocation };

export interface CPPFunction {
  name: string;
  returnType: CPPType;
  params: Array<{ name: string; type: CPPType; location: SourceLocation }>;
  body: CPPStatement[];
  location: SourceLocation;
}

export interface CPPProgram {
  includes: string[];
  usingNamespaces: string[];
  functions: CPPFunction[];
  globalVars: CPPStatement[];
}

export class CPPParser {
  private tokens: CPPToken[] = [];
  private pos = 0;
  private diagnostics: Diagnostic[] = [];

  parse(source: string): { ast: CPPProgram | null; diagnostics: Diagnostic[] } {
    const lexer = new CPPLexer(source);
    this.tokens = lexer.tokenize();
    this.pos = 0;
    this.diagnostics = [];

    try {
      const program = this.parseProgram();
      return { ast: program, diagnostics: this.diagnostics };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown C++ parse error';
      this.diagnostics.push({
        severity: 'error',
        category: 'parse',
        message: msg,
        sourceLocation: this.currentLocation(),
      });
      return { ast: null, diagnostics: this.diagnostics };
    }
  }

  private parseProgram(): CPPProgram {
    const includes: string[] = [];
    const usingNamespaces: string[] = [];
    const functions: CPPFunction[] = [];
    const globalVars: CPPStatement[] = [];

    while (!this.isAtEnd()) {
      const token = this.peek();

      if (token.type === 'PREPROCESSOR') {
        includes.push(this.advance().value);
        continue;
      }

      if (token.type === 'KW_USING' && this.peekAhead(1).type === 'KW_NAMESPACE') {
        this.advance(); // using
        this.advance(); // namespace
        const ns = this.advance().value; // std
        this.match('SEMICOLON');
        usingNamespaces.push(ns);
        continue;
      }

      // Check if it's a function or a global declaration
      if (this.isTypeSpecifier(token.type)) {
        const type = this.parseType();
        const nameToken = this.consume('IDENTIFIER', 'Expected identifier after type');

        if (this.check('LPAREN')) {
          // Function definition
          functions.push(this.parseFunction(type, nameToken.value, nameToken.location));
        } else {
          // Global variable declaration
          const decl = this.finishVarDecl(type, nameToken.value, nameToken.location);
          globalVars.push(decl);
        }
      } else {
        // Skip unknown token
        this.advance();
      }
    }

    return { includes, usingNamespaces, functions, globalVars };
  }

  private parseFunction(returnType: CPPType, name: string, startLoc: SourceLocation): CPPFunction {
    this.consume('LPAREN', "Expected '('");
    const params: Array<{ name: string; type: CPPType; location: SourceLocation }> = [];

    if (!this.check('RPAREN')) {
      do {
        if (this.match('COMMA')) continue;
        if (this.check('RPAREN')) break;

        const pType = this.parseType();
        let pName = '';
        let pLoc = this.currentLocation();
        if (this.check('IDENTIFIER')) {
          const tok = this.advance();
          pName = tok.value;
          pLoc = tok.location;
        }
        params.push({ name: pName, type: pType, location: pLoc });
      } while (this.match('COMMA'));
    }
    this.consume('RPAREN', "Expected ')'");

    const body = this.parseBlock();

    return {
      name,
      returnType,
      params,
      body,
      location: {
        startLine: startLoc.startLine,
        startColumn: startLoc.startColumn,
        endLine: body.length > 0 ? body[body.length - 1].location.endLine : startLoc.endLine,
        endColumn: body.length > 0 ? body[body.length - 1].location.endColumn : startLoc.endColumn,
      },
    };
  }

  private parseBlock(): CPPStatement[] {
    this.consume('LBRACE', "Expected '{'");
    const statements: CPPStatement[] = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      const prevPos = this.pos;
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
      if (this.pos === prevPos) {
        this.advance();
      }
    }
    this.consume('RBRACE', "Expected '}'");

    return statements;
  }

  private parseStatement(): CPPStatement | null {
    if (this.isAtEnd()) return null;

    const token = this.peek();

    // cout statement: cout << a << b << endl;
    if (token.type === 'KW_COUT' || (token.value === 'std' && this.peekAhead(1).type === 'SCOPE' && this.peekAhead(2).type === 'KW_COUT')) {
      return this.parseCout();
    }

    // cin statement: cin >> a >> b;
    if (token.type === 'KW_CIN' || (token.value === 'std' && this.peekAhead(1).type === 'SCOPE' && this.peekAhead(2).type === 'KW_CIN')) {
      return this.parseCin();
    }

    if (token.type === 'KW_IF') return this.parseIf();
    if (token.type === 'KW_WHILE') return this.parseWhile();
    if (token.type === 'KW_FOR') return this.parseFor();
    if (token.type === 'KW_DO') return this.parseDoWhile();
    if (token.type === 'KW_SWITCH') return this.parseSwitch();
    if (token.type === 'KW_RETURN') return this.parseReturn();
    if (token.type === 'KW_BREAK') {
      const loc = this.advance().location;
      this.consume('SEMICOLON', "Expected ';'");
      return { kind: 'break', location: loc };
    }
    if (token.type === 'KW_CONTINUE') {
      const loc = this.advance().location;
      this.consume('SEMICOLON', "Expected ';'");
      return { kind: 'continue', location: loc };
    }
    if (token.type === 'LBRACE') {
      const loc = token.location;
      const stmts = this.parseBlock();
      return { kind: 'block', statements: stmts, location: loc };
    }

    // Variable declaration: type name [= init];
    if (this.isTypeSpecifier(token.type)) {
      const type = this.parseType();
      const name = this.consume('IDENTIFIER', 'Expected variable name');
      return this.finishVarDecl(type, name.value, name.location);
    }

    // Expression statement
    const expr = this.parseExpression();
    this.match('SEMICOLON');
    return { kind: 'expr-stmt', expression: expr, location: expr.location };
  }

  private parseCout(): CPPStatement {
    const startLoc = this.currentLocation();
    if (this.peek().value === 'std') {
      this.advance(); // std
      this.advance(); // ::
    }
    this.consume('KW_COUT', 'Expected cout');

    const items: CPPExpression[] = [];
    let newline = false;

    while (this.match('LSHIFT')) {
      if (this.check('KW_ENDL') || (this.peek().value === 'std' && this.peekAhead(1).type === 'SCOPE' && this.peekAhead(2).type === 'KW_ENDL')) {
        if (this.peek().value === 'std') { this.advance(); this.advance(); }
        this.advance(); // endl
        newline = true;
      } else {
        items.push(this.parseExpression(10)); // precedence > LSHIFT
      }
    }

    this.consume('SEMICOLON', "Expected ';' after cout");
    return { kind: 'cout', items, newline, location: startLoc };
  }

  private parseCin(): CPPStatement {
    const startLoc = this.currentLocation();
    if (this.peek().value === 'std') {
      this.advance(); // std
      this.advance(); // ::
    }
    this.consume('KW_CIN', 'Expected cin');

    const targets: string[] = [];
    while (this.match('RSHIFT')) {
      const id = this.consume('IDENTIFIER', 'Expected variable after >>');
      targets.push(id.value);
    }

    this.consume('SEMICOLON', "Expected ';' after cin");
    return { kind: 'cin', targets, location: startLoc };
  }

  private parseIf(): CPPStatement {
    const startLoc = this.consume('KW_IF', 'Expected if').location;
    this.consume('LPAREN', "Expected '('");
    const cond = this.parseExpression();
    this.consume('RPAREN', "Expected ')'");

    const thenStmts = this.parseStatementOrBlock();
    let elseStmts: CPPStatement[] | undefined;

    if (this.match('KW_ELSE')) {
      elseStmts = this.parseStatementOrBlock();
    }

    return {
      kind: 'if',
      condition: cond,
      then: thenStmts,
      else: elseStmts,
      location: startLoc,
    };
  }

  private parseWhile(): CPPStatement {
    const startLoc = this.consume('KW_WHILE', 'Expected while').location;
    this.consume('LPAREN', "Expected '('");
    const cond = this.parseExpression();
    this.consume('RPAREN', "Expected ')'");
    const body = this.parseStatementOrBlock();

    return { kind: 'while', condition: cond, body, location: startLoc };
  }

  private parseFor(): CPPStatement {
    const startLoc = this.consume('KW_FOR', 'Expected for').location;
    this.consume('LPAREN', "Expected '('");

    let init: CPPStatement | undefined;
    if (!this.check('SEMICOLON')) {
      if (this.isTypeSpecifier(this.peek().type)) {
        const type = this.parseType();
        const name = this.consume('IDENTIFIER', 'Expected identifier');
        init = this.finishVarDecl(type, name.value, name.location);
      } else {
        const expr = this.parseExpression();
        this.consume('SEMICOLON', "Expected ';'");
        init = { kind: 'expr-stmt', expression: expr, location: expr.location };
      }
    } else {
      this.consume('SEMICOLON', "Expected ';'");
    }

    let cond: CPPExpression | undefined;
    if (!this.check('SEMICOLON')) {
      cond = this.parseExpression();
    }
    this.consume('SEMICOLON', "Expected ';'");

    let update: CPPExpression | undefined;
    if (!this.check('RPAREN')) {
      update = this.parseExpression();
    }
    this.consume('RPAREN', "Expected ')'");

    const body = this.parseStatementOrBlock();
    return { kind: 'for', init, condition: cond, update, body, location: startLoc };
  }

  private parseDoWhile(): CPPStatement {
    const startLoc = this.consume('KW_DO', 'Expected do').location;
    const body = this.parseStatementOrBlock();
    this.consume('KW_WHILE', "Expected while after do");
    this.consume('LPAREN', "Expected '('");
    const cond = this.parseExpression();
    this.consume('RPAREN', "Expected ')'");
    this.consume('SEMICOLON', "Expected ';'");

    return { kind: 'do-while', condition: cond, body, location: startLoc };
  }

  private parseSwitch(): CPPStatement {
    const startLoc = this.consume('KW_SWITCH', 'Expected switch').location;
    this.consume('LPAREN', "Expected '('");
    const expr = this.parseExpression();
    this.consume('RPAREN', "Expected ')'");
    this.consume('LBRACE', "Expected '{'");

    const cases: Array<{ value?: CPPExpression; body: CPPStatement[]; location: SourceLocation }> = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      if (this.match('KW_CASE')) {
        const val = this.parseExpression();
        this.consume('COLON', "Expected ':'");
        const body: CPPStatement[] = [];
        while (!this.check('KW_CASE') && !this.check('KW_DEFAULT') && !this.check('RBRACE') && !this.isAtEnd()) {
          const s = this.parseStatement();
          if (s) body.push(s);
        }
        cases.push({ value: val, body, location: val.location });
      } else if (this.match('KW_DEFAULT')) {
        const loc = this.previous().location;
        this.consume('COLON', "Expected ':'");
        const body: CPPStatement[] = [];
        while (!this.check('KW_CASE') && !this.check('KW_DEFAULT') && !this.check('RBRACE') && !this.isAtEnd()) {
          const s = this.parseStatement();
          if (s) body.push(s);
        }
        cases.push({ body, location: loc });
      } else {
        this.advance();
      }
    }
    this.consume('RBRACE', "Expected '}'");

    return { kind: 'switch', expression: expr, cases, location: startLoc };
  }

  private parseReturn(): CPPStatement {
    const startLoc = this.consume('KW_RETURN', 'Expected return').location;
    let value: CPPExpression | undefined;
    if (!this.check('SEMICOLON')) {
      value = this.parseExpression();
    }
    this.consume('SEMICOLON', "Expected ';'");
    return { kind: 'return', value, location: startLoc };
  }

  private finishVarDecl(type: CPPType, name: string, startLoc: SourceLocation): CPPStatement {
    let init: CPPExpression | undefined;
    if (this.match('ASSIGN')) {
      init = this.parseExpression();
    }
    this.consume('SEMICOLON', "Expected ';' after variable declaration");
    return {
      kind: 'var-decl',
      type,
      name,
      init,
      location: {
        startLine: startLoc.startLine,
        startColumn: startLoc.startColumn,
        endLine: init ? init.location.endLine : startLoc.endLine,
        endColumn: init ? init.location.endColumn : startLoc.endColumn,
      },
    };
  }

  private parseStatementOrBlock(): CPPStatement[] {
    if (this.check('LBRACE')) {
      return this.parseBlock();
    }
    const stmt = this.parseStatement();
    return stmt ? [stmt] : [];
  }

  // ─── Expressions ───────────────────────────────────────────────

  parseExpression(minPrec = 0): CPPExpression {
    let left = this.parseUnary();

    while (true) {
      const opToken = this.peek();
      const prec = this.getOperatorPrecedence(opToken.type);
      if (prec <= 0 || prec < minPrec) break;

      this.advance();

      if (opToken.type === 'ASSIGN' || opToken.type === 'PLUS_ASSIGN' || opToken.type === 'MINUS_ASSIGN' || opToken.type === 'STAR_ASSIGN' || opToken.type === 'SLASH_ASSIGN') {
        const right = this.parseExpression(prec);
        left = {
          kind: 'assignment',
          op: opToken.value,
          target: left,
          value: right,
          location: { startLine: left.location.startLine, startColumn: left.location.startColumn, endLine: right.location.endLine, endColumn: right.location.endColumn },
        };
      } else if (opToken.type === 'QUESTION') {
        const consequent = this.parseExpression();
        this.consume('COLON', "Expected ':' in ternary operator");
        const alternate = this.parseExpression(prec);
        left = {
          kind: 'ternary',
          condition: left,
          consequent,
          alternate,
          location: { startLine: left.location.startLine, startColumn: left.location.startColumn, endLine: alternate.location.endLine, endColumn: alternate.location.endColumn },
        };
      } else {
        const right = this.parseExpression(prec + 1);
        left = {
          kind: 'binary',
          op: opToken.value,
          left,
          right,
          location: { startLine: left.location.startLine, startColumn: left.location.startColumn, endLine: right.location.endLine, endColumn: right.location.endColumn },
        };
      }
    }

    return left;
  }

  private parseUnary(): CPPExpression {
    if (this.check('PLUS') || this.check('MINUS') || this.check('NOT') || this.check('TILDE') || this.check('INCREMENT') || this.check('DECREMENT')) {
      const opToken = this.advance();
      const operand = this.parseUnary();
      return {
        kind: 'unary',
        op: opToken.value,
        position: 'prefix',
        operand,
        location: { startLine: opToken.location.startLine, startColumn: opToken.location.startColumn, endLine: operand.location.endLine, endColumn: operand.location.endColumn },
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): CPPExpression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('INCREMENT')) {
        expr = { kind: 'unary', op: '++', position: 'postfix', operand: expr, location: expr.location };
      } else if (this.match('DECREMENT')) {
        expr = { kind: 'unary', op: '--', position: 'postfix', operand: expr, location: expr.location };
      } else if (this.match('LPAREN')) {
        const args: CPPExpression[] = [];
        if (!this.check('RPAREN')) {
          do {
            if (this.match('COMMA')) continue;
            if (this.check('RPAREN')) break;
            args.push(this.parseExpression());
          } while (this.match('COMMA'));
        }
        const closeLoc = this.consume('RPAREN', "Expected ')'").location;
        expr = {
          kind: 'call',
          callee: expr,
          args,
          location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: closeLoc.endLine, endColumn: closeLoc.endColumn },
        };
      } else if (this.match('LBRACKET')) {
        const index = this.parseExpression();
        const closeLoc = this.consume('RBRACKET', "Expected ']'").location;
        expr = {
          kind: 'array-access',
          array: expr,
          index,
          location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: closeLoc.endLine, endColumn: closeLoc.endColumn },
        };
      } else if (this.match('DOT') || this.match('ARROW')) {
        const op = this.previous().value as '.' | '->';
        const member = this.consume('IDENTIFIER', 'Expected member identifier');
        expr = {
          kind: 'member-access',
          object: expr,
          member: member.value,
          op,
          location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: member.location.endLine, endColumn: member.location.endColumn },
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): CPPExpression {
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
    if (token.type === 'CHAR_LITERAL') {
      this.advance();
      return { kind: 'char-literal', value: token.value, location: token.location };
    }
    if (token.type === 'BOOL_LITERAL') {
      this.advance();
      return { kind: 'bool-literal', value: token.value === 'true', location: token.location };
    }
    if (token.type === 'IDENTIFIER') {
      this.advance();
      return { kind: 'identifier', name: token.value, location: token.location };
    }
    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      const closeLoc = this.consume('RPAREN', "Expected ')'").location;
      return {
        kind: 'paren',
        expression: expr,
        location: { startLine: token.location.startLine, startColumn: token.location.startColumn, endLine: closeLoc.endLine, endColumn: closeLoc.endColumn },
      };
    }

    const err = this.advance();
    return { kind: 'identifier', name: err.value || 'err', location: err.location };
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private parseType(): CPPType {
    let isConst = false;
    if (this.match('KW_CONST')) {
      isConst = true;
    }

    // std::string
    let base = 'int';
    if (this.peek().value === 'std' && this.peekAhead(1).type === 'SCOPE') {
      this.advance(); // std
      this.advance(); // ::
      base = this.advance().value;
    } else {
      base = this.advance().value;
    }

    let isReference = false;
    let isPointer = false;
    if (this.match('AMPERSAND')) isReference = true;
    if (this.match('STAR')) isPointer = true;

    return { base, isConst, isReference, isPointer };
  }

  private isTypeSpecifier(type: CPPLexerTokenType): boolean {
    return (
      type === 'KW_INT' ||
      type === 'KW_FLOAT' ||
      type === 'KW_DOUBLE' ||
      type === 'KW_CHAR' ||
      type === 'KW_VOID' ||
      type === 'KW_BOOL' ||
      type === 'KW_STRING' ||
      type === 'KW_CONST' ||
      type === 'KW_AUTO' ||
      (this.peek().value === 'std' && this.peekAhead(1).type === 'SCOPE')
    );
  }

  private getOperatorPrecedence(type: CPPLexerTokenType): number {
    switch (type) {
      case 'ASSIGN':
      case 'PLUS_ASSIGN':
      case 'MINUS_ASSIGN':
      case 'STAR_ASSIGN':
      case 'SLASH_ASSIGN':
      case 'QUESTION':
        return 1;
      case 'OR':
        return 2;
      case 'AND':
        return 3;
      case 'PIPE':
        return 4;
      case 'CARET':
        return 5;
      case 'AMPERSAND':
        return 6;
      case 'EQ':
      case 'NEQ':
        return 7;
      case 'LT':
      case 'GT':
      case 'LTE':
      case 'GTE':
        return 8;
      case 'LSHIFT':
      case 'RSHIFT':
        return 9;
      case 'PLUS':
      case 'MINUS':
        return 10;
      case 'STAR':
      case 'SLASH':
      case 'PERCENT':
        return 11;
      default:
        return 0;
    }
  }

  private check(type: CPPLexerTokenType): boolean {
    if (this.isAtEnd()) return type === 'EOF';
    return this.peek().type === type;
  }

  private match(...types: CPPLexerTokenType[]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private advance(): CPPToken {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.tokens[this.pos].type === 'EOF';
  }

  private peek(): CPPToken {
    return this.tokens[this.pos] || { type: 'EOF', value: '', location: { startLine: 1, endLine: 1, startColumn: 1, endColumn: 1 } };
  }

  private peekAhead(offset: number): CPPToken {
    const idx = this.pos + offset;
    return this.tokens[idx] || { type: 'EOF', value: '', location: { startLine: 1, endLine: 1, startColumn: 1, endColumn: 1 } };
  }

  private previous(): CPPToken {
    return this.tokens[this.pos - 1];
  }

  private consume(type: CPPLexerTokenType, message: string): CPPToken {
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
    return this.peek().location;
  }
}
