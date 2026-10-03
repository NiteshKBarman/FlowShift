/**
 * Java Parser — Recursive descent parser for educational Java programs.
 */

import { JavaLexer, type JavaToken, type JavaTokenType } from './lexer';
import type { SourceLocation } from '../../core/ir/source-location';
import type { Diagnostic } from '../../core/conversion/diagnostics';

export type JavaType = {
  name: string; // 'int', 'double', 'float', 'boolean', 'char', 'String', 'void'
  isArray?: boolean;
};

export type JavaExpression =
  | { kind: 'int-literal'; value: string; location: SourceLocation }
  | { kind: 'float-literal'; value: string; location: SourceLocation }
  | { kind: 'string-literal'; value: string; location: SourceLocation }
  | { kind: 'char-literal'; value: string; location: SourceLocation }
  | { kind: 'bool-literal'; value: boolean; location: SourceLocation }
  | { kind: 'null-literal'; location: SourceLocation }
  | { kind: 'identifier'; name: string; location: SourceLocation }
  | { kind: 'binary'; op: string; left: JavaExpression; right: JavaExpression; location: SourceLocation }
  | { kind: 'unary'; op: string; position: 'prefix' | 'postfix'; operand: JavaExpression; location: SourceLocation }
  | { kind: 'assignment'; op: string; target: JavaExpression; value: JavaExpression; location: SourceLocation }
  | { kind: 'call'; callee: JavaExpression; args: JavaExpression[]; location: SourceLocation }
  | { kind: 'array-access'; array: JavaExpression; index: JavaExpression; location: SourceLocation }
  | { kind: 'member-access'; object: JavaExpression; member: string; location: SourceLocation }
  | { kind: 'new'; className: string; args: JavaExpression[]; location: SourceLocation }
  | { kind: 'paren'; expression: JavaExpression; location: SourceLocation }
  | { kind: 'ternary'; condition: JavaExpression; consequent: JavaExpression; alternate: JavaExpression; location: SourceLocation };

export type JavaStatement =
  | { kind: 'var-decl'; type: JavaType; name: string; init?: JavaExpression; location: SourceLocation }
  | { kind: 'println'; expressions: JavaExpression[]; newline: boolean; location: SourceLocation }
  | { kind: 'scanner-input'; variable: string; method: string; location: SourceLocation }
  | { kind: 'expr-stmt'; expression: JavaExpression; location: SourceLocation }
  | { kind: 'if'; condition: JavaExpression; then: JavaStatement[]; else?: JavaStatement[]; location: SourceLocation }
  | { kind: 'while'; condition: JavaExpression; body: JavaStatement[]; location: SourceLocation }
  | { kind: 'for'; init?: JavaStatement; condition?: JavaExpression; update?: JavaExpression; body: JavaStatement[]; location: SourceLocation }
  | { kind: 'do-while'; condition: JavaExpression; body: JavaStatement[]; location: SourceLocation }
  | { kind: 'switch'; expression: JavaExpression; cases: Array<{ value?: JavaExpression; body: JavaStatement[]; location: SourceLocation }>; location: SourceLocation }
  | { kind: 'return'; value?: JavaExpression; location: SourceLocation }
  | { kind: 'break'; location: SourceLocation }
  | { kind: 'continue'; location: SourceLocation }
  | { kind: 'block'; statements: JavaStatement[]; location: SourceLocation };

export interface JavaMethod {
  name: string;
  returnType: JavaType;
  isStatic?: boolean;
  params: Array<{ name: string; type: JavaType; location: SourceLocation }>;
  body: JavaStatement[];
  location: SourceLocation;
}

export interface JavaClass {
  name: string;
  methods: JavaMethod[];
  fields: JavaStatement[];
}

export interface JavaProgram {
  packageName?: string;
  imports: string[];
  classes: JavaClass[];
}

export class JavaParser {
  private tokens: JavaToken[] = [];
  private pos = 0;
  private diagnostics: Diagnostic[] = [];

  parse(source: string): { ast: JavaProgram | null; diagnostics: Diagnostic[] } {
    const lexer = new JavaLexer(source);
    this.tokens = lexer.tokenize();
    this.pos = 0;
    this.diagnostics = [];

    try {
      const program = this.parseProgram();
      return { ast: program, diagnostics: this.diagnostics };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown Java parse error';
      this.diagnostics.push({
        severity: 'error',
        category: 'parse',
        message: msg,
        sourceLocation: this.currentLocation(),
      });
      return { ast: null, diagnostics: this.diagnostics };
    }
  }

  private parseProgram(): JavaProgram {
    let packageName: string | undefined;
    const imports: string[] = [];
    const classes: JavaClass[] = [];

    while (!this.isAtEnd()) {
      if (this.match('KW_PACKAGE')) {
        let pkg = this.consume('IDENTIFIER', 'Expected package name').value;
        while (this.match('DOT')) {
          pkg += '.' + this.consume('IDENTIFIER', 'Expected identifier').value;
        }
        this.consume('SEMICOLON', "Expected ';'");
        packageName = pkg;
        continue;
      }

      if (this.match('KW_IMPORT')) {
        let imp = this.consume('IDENTIFIER', 'Expected import name').value;
        while (this.match('DOT')) {
          if (this.match('STAR')) {
            imp += '.*';
            break;
          }
          imp += '.' + this.consume('IDENTIFIER', 'Expected identifier').value;
        }
        this.consume('SEMICOLON', "Expected ';'");
        imports.push(imp);
        continue;
      }

      // Skip modifiers: public, private, static, final, etc.
      this.skipModifiers();

      if (this.match('KW_CLASS')) {
        const className = this.consume('IDENTIFIER', 'Expected class name').value;
        this.consume('LBRACE', "Expected '{'");
        const cls = this.parseClassBody(className);
        classes.push(cls);
        continue;
      }

      // If top level has methods directly without class (for flexibility)
      if (this.isTypeSpecifier(this.peek().type)) {
        const type = this.parseType();
        const name = this.consume('IDENTIFIER', 'Expected name').value;
        if (this.check('LPAREN')) {
          const method = this.parseMethod(type, name);
          let defaultClass = classes.find((c) => c.name === 'Main');
          if (!defaultClass) {
            defaultClass = { name: 'Main', methods: [], fields: [] };
            classes.push(defaultClass);
          }
          defaultClass.methods.push(method);
        }
        continue;
      }

      this.advance();
    }

    return { packageName, imports, classes };
  }

  private parseClassBody(className: string): JavaClass {
    const methods: JavaMethod[] = [];
    const fields: JavaStatement[] = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      const isStatic = this.checkModifier('static');
      this.skipModifiers();

      if (this.isTypeSpecifier(this.peek().type)) {
        const type = this.parseType();
        const nameTok = this.consume('IDENTIFIER', 'Expected name');

        if (this.check('LPAREN')) {
          const method = this.parseMethod(type, nameTok.value, isStatic);
          methods.push(method);
        } else {
          const field = this.finishVarDecl(type, nameTok.value, nameTok.location);
          fields.push(field);
        }
      } else {
        this.advance();
      }
    }

    this.consume('RBRACE', "Expected '}'");
    return { name: className, methods, fields };
  }

  private parseMethod(returnType: JavaType, name: string, isStatic = false): JavaMethod {
    const startLoc = this.currentLocation();
    this.consume('LPAREN', "Expected '('");

    const params: Array<{ name: string; type: JavaType; location: SourceLocation }> = [];

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
      isStatic,
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

  private parseBlock(): JavaStatement[] {
    this.consume('LBRACE', "Expected '{'");
    const statements: JavaStatement[] = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }
    this.consume('RBRACE', "Expected '}'");

    return statements;
  }

  private parseStatement(): JavaStatement | null {
    if (this.isAtEnd()) return null;

    const token = this.peek();

    // Check for System.out.println(...) or System.out.print(...)
    if (token.value === 'System' && this.peekAhead(1).type === 'DOT' && this.peekAhead(2).value === 'out') {
      return this.parsePrint();
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

    // Variable declaration or Scanner input
    if (this.isTypeSpecifier(token.type)) {
      const type = this.parseType();
      const name = this.consume('IDENTIFIER', 'Expected variable name');

      // Check if it's Scanner input assignment: int x = sc.nextInt();
      if (this.match('ASSIGN')) {
        const val = this.parseExpression();
        this.consume('SEMICOLON', "Expected ';'");

        if (val.kind === 'call' && val.callee.kind === 'member-access' && val.callee.member.startsWith('next')) {
          return {
            kind: 'scanner-input',
            variable: name.value,
            method: val.callee.member,
            location: name.location,
          };
        }

        return {
          kind: 'var-decl',
          type,
          name: name.value,
          init: val,
          location: name.location,
        };
      }

      this.consume('SEMICOLON', "Expected ';'");
      return {
        kind: 'var-decl',
        type,
        name: name.value,
        location: name.location,
      };
    }

    // Assignment or expression statement
    const expr = this.parseExpression();
    this.match('SEMICOLON');
    return { kind: 'expr-stmt', expression: expr, location: expr.location };
  }

  private parsePrint(): JavaStatement {
    const startLoc = this.currentLocation();
    this.advance(); // System
    this.advance(); // .
    this.advance(); // out
    this.consume('DOT', "Expected '.'");
    const methodToken = this.advance();
    const isPrintln = methodToken.value === 'println';

    this.consume('LPAREN', "Expected '('");
    const expressions: JavaExpression[] = [];

    if (!this.check('RPAREN')) {
      do {
        if (this.match('COMMA')) continue;
        if (this.check('RPAREN')) break;
        expressions.push(this.parseExpression());
      } while (this.match('COMMA'));
    }
    this.consume('RPAREN', "Expected ')'");
    this.consume('SEMICOLON', "Expected ';'");

    return {
      kind: 'println',
      expressions,
      newline: isPrintln,
      location: startLoc,
    };
  }

  private parseIf(): JavaStatement {
    const startLoc = this.consume('KW_IF', 'Expected if').location;
    this.consume('LPAREN', "Expected '('");
    const cond = this.parseExpression();
    this.consume('RPAREN', "Expected ')'");

    const thenStmts = this.parseStatementOrBlock();
    let elseStmts: JavaStatement[] | undefined;

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

  private parseWhile(): JavaStatement {
    const startLoc = this.consume('KW_WHILE', 'Expected while').location;
    this.consume('LPAREN', "Expected '('");
    const cond = this.parseExpression();
    this.consume('RPAREN', "Expected ')'");
    const body = this.parseStatementOrBlock();

    return { kind: 'while', condition: cond, body, location: startLoc };
  }

  private parseFor(): JavaStatement {
    const startLoc = this.consume('KW_FOR', 'Expected for').location;
    this.consume('LPAREN', "Expected '('");

    let init: JavaStatement | undefined;
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

    let cond: JavaExpression | undefined;
    if (!this.check('SEMICOLON')) {
      cond = this.parseExpression();
    }
    this.consume('SEMICOLON', "Expected ';'");

    let update: JavaExpression | undefined;
    if (!this.check('RPAREN')) {
      update = this.parseExpression();
    }
    this.consume('RPAREN', "Expected ')'");

    const body = this.parseStatementOrBlock();
    return { kind: 'for', init, condition: cond, update, body, location: startLoc };
  }

  private parseDoWhile(): JavaStatement {
    const startLoc = this.consume('KW_DO', 'Expected do').location;
    const body = this.parseStatementOrBlock();
    this.consume('KW_WHILE', 'Expected while');
    this.consume('LPAREN', "Expected '('");
    const cond = this.parseExpression();
    this.consume('RPAREN', "Expected ')'");
    this.consume('SEMICOLON', "Expected ';'");

    return { kind: 'do-while', condition: cond, body, location: startLoc };
  }

  private parseSwitch(): JavaStatement {
    const startLoc = this.consume('KW_SWITCH', 'Expected switch').location;
    this.consume('LPAREN', "Expected '('");
    const expr = this.parseExpression();
    this.consume('RPAREN', "Expected ')'");
    this.consume('LBRACE', "Expected '{'");

    const cases: Array<{ value?: JavaExpression; body: JavaStatement[]; location: SourceLocation }> = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      if (this.match('KW_CASE')) {
        const val = this.parseExpression();
        this.consume('COLON', "Expected ':'");
        const body: JavaStatement[] = [];
        while (!this.check('KW_CASE') && !this.check('KW_DEFAULT') && !this.check('RBRACE') && !this.isAtEnd()) {
          const s = this.parseStatement();
          if (s) body.push(s);
        }
        cases.push({ value: val, body, location: val.location });
      } else if (this.match('KW_DEFAULT')) {
        const loc = this.previous().location;
        this.consume('COLON', "Expected ':'");
        const body: JavaStatement[] = [];
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

  private parseReturn(): JavaStatement {
    const startLoc = this.consume('KW_RETURN', 'Expected return').location;
    let value: JavaExpression | undefined;
    if (!this.check('SEMICOLON')) {
      value = this.parseExpression();
    }
    this.consume('SEMICOLON', "Expected ';'");
    return { kind: 'return', value, location: startLoc };
  }

  private finishVarDecl(type: JavaType, name: string, startLoc: SourceLocation): JavaStatement {
    let init: JavaExpression | undefined;
    if (this.match('ASSIGN')) {
      init = this.parseExpression();
    }
    this.consume('SEMICOLON', "Expected ';'");
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

  private parseStatementOrBlock(): JavaStatement[] {
    if (this.check('LBRACE')) {
      return this.parseBlock();
    }
    const stmt = this.parseStatement();
    return stmt ? [stmt] : [];
  }

  // ─── Expressions ───────────────────────────────────────────────

  parseExpression(minPrec = 0): JavaExpression {
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

  private parseUnary(): JavaExpression {
    if (this.check('PLUS') || this.check('MINUS') || this.check('NOT') || this.check('INCREMENT') || this.check('DECREMENT')) {
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

  private parsePostfix(): JavaExpression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('INCREMENT')) {
        expr = { kind: 'unary', op: '++', position: 'postfix', operand: expr, location: expr.location };
      } else if (this.match('DECREMENT')) {
        expr = { kind: 'unary', op: '--', position: 'postfix', operand: expr, location: expr.location };
      } else if (this.match('LPAREN')) {
        const args: JavaExpression[] = [];
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
      } else if (this.match('DOT')) {
        const member = this.consume('IDENTIFIER', 'Expected member identifier');
        expr = {
          kind: 'member-access',
          object: expr,
          member: member.value,
          location: { startLine: expr.location.startLine, startColumn: expr.location.startColumn, endLine: member.location.endLine, endColumn: member.location.endColumn },
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): JavaExpression {
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
    if (token.type === 'NULL_LITERAL') {
      this.advance();
      return { kind: 'null-literal', location: token.location };
    }
    if (token.type === 'IDENTIFIER') {
      this.advance();
      return { kind: 'identifier', name: token.value, location: token.location };
    }
    if (this.match('KW_NEW')) {
      const clsName = this.consume('IDENTIFIER', 'Expected class name after new').value;
      this.consume('LPAREN', "Expected '('");
      const args: JavaExpression[] = [];
      if (!this.check('RPAREN')) {
        do {
          if (this.match('COMMA')) continue;
          if (this.check('RPAREN')) break;
          args.push(this.parseExpression());
        } while (this.match('COMMA'));
      }
      const closeLoc = this.consume('RPAREN', "Expected ')'").location;
      return { kind: 'new', className: clsName, args, location: closeLoc };
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

  private parseType(): JavaType {
    const name = this.advance().value;
    let isArray = false;
    if (this.match('LBRACKET')) {
      this.consume('RBRACKET', "Expected ']'");
      isArray = true;
    }
    return { name, isArray };
  }

  private isTypeSpecifier(type: JavaTokenType): boolean {
    return (
      type === 'KW_INT' ||
      type === 'KW_DOUBLE' ||
      type === 'KW_FLOAT' ||
      type === 'KW_BOOLEAN' ||
      type === 'KW_CHAR' ||
      type === 'KW_STRING' ||
      type === 'KW_VOID' ||
      type === 'IDENTIFIER'
    );
  }

  private skipModifiers(): void {
    while (
      this.check('KW_PUBLIC') ||
      this.check('KW_PRIVATE') ||
      this.check('KW_PROTECTED') ||
      this.check('KW_STATIC') ||
      this.check('KW_FINAL')
    ) {
      this.advance();
    }
  }

  private checkModifier(mod: string): boolean {
    let i = 0;
    while (this.pos + i < this.tokens.length) {
      const tok = this.tokens[this.pos + i];
      if (['KW_PUBLIC', 'KW_PRIVATE', 'KW_PROTECTED', 'KW_STATIC', 'KW_FINAL'].includes(tok.type)) {
        if (tok.value === mod) return true;
        i++;
      } else {
        break;
      }
    }
    return false;
  }

  private getOperatorPrecedence(type: JavaTokenType): number {
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
      case 'EQ':
      case 'NEQ':
        return 4;
      case 'LT':
      case 'GT':
      case 'LTE':
      case 'GTE':
        return 5;
      case 'PLUS':
      case 'MINUS':
        return 6;
      case 'STAR':
      case 'SLASH':
      case 'PERCENT':
        return 7;
      default:
        return 0;
    }
  }

  private check(type: JavaTokenType): boolean {
    if (this.isAtEnd()) return type === 'EOF';
    return this.peek().type === type;
  }

  private match(...types: JavaTokenType[]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private advance(): JavaToken {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.tokens[this.pos].type === 'EOF';
  }

  private peek(): JavaToken {
    return this.tokens[this.pos] || { type: 'EOF', value: '', location: { startLine: 1, endLine: 1, startColumn: 1, endColumn: 1 } };
  }

  private peekAhead(offset: number): JavaToken {
    const idx = this.pos + offset;
    return this.tokens[idx] || { type: 'EOF', value: '', location: { startLine: 1, endLine: 1, startColumn: 1, endColumn: 1 } };
  }

  private previous(): JavaToken {
    return this.tokens[this.pos - 1];
  }

  private consume(type: JavaTokenType, message: string): JavaToken {
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
