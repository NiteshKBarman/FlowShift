/**
 * Python Lexer — Tokenizes Python source code.
 *
 * Handles indentation-based scoping by emitting INDENT/DEDENT tokens.
 */

import type { SourceLocation } from '../../core/ir/source-location';

export type PythonTokenType =
  | 'INT_LITERAL'
  | 'FLOAT_LITERAL'
  | 'STRING_LITERAL'
  | 'BOOL_LITERAL'
  | 'NONE_LITERAL'
  | 'IDENTIFIER'
  | 'KW_DEF'
  | 'KW_CLASS'
  | 'KW_IF'
  | 'KW_ELIF'
  | 'KW_ELSE'
  | 'KW_WHILE'
  | 'KW_FOR'
  | 'KW_IN'
  | 'KW_BREAK'
  | 'KW_CONTINUE'
  | 'KW_RETURN'
  | 'KW_IMPORT'
  | 'KW_FROM'
  | 'KW_AS'
  | 'KW_PASS'
  | 'KW_AND'
  | 'KW_OR'
  | 'KW_NOT'
  | 'KW_IS'
  | 'KW_LAMBDA'
  | 'KW_GLOBAL'
  | 'KW_NONLOCAL'
  | 'KW_TRY'
  | 'KW_EXCEPT'
  | 'KW_FINALLY'
  | 'KW_RAISE'
  | 'KW_WITH'
  | 'KW_YIELD'
  | 'KW_ASSERT'
  | 'KW_DEL'
  | 'KW_PRINT' // Not a keyword in Python 3, but we handle it
  | 'KW_RANGE'
  // Operators
  | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'DOUBLE_SLASH' | 'PERCENT' | 'DOUBLE_STAR'
  | 'ASSIGN' | 'PLUS_ASSIGN' | 'MINUS_ASSIGN' | 'STAR_ASSIGN' | 'SLASH_ASSIGN'
  | 'EQ' | 'NEQ' | 'LT' | 'GT' | 'LTE' | 'GTE'
  | 'AMPERSAND' | 'PIPE' | 'CARET' | 'TILDE' | 'LSHIFT' | 'RSHIFT'
  // Delimiters
  | 'LPAREN' | 'RPAREN' | 'LBRACKET' | 'RBRACKET' | 'LBRACE' | 'RBRACE'
  | 'COLON' | 'COMMA' | 'DOT' | 'ARROW' | 'SEMICOLON' | 'AT'
  // Indentation
  | 'INDENT' | 'DEDENT' | 'NEWLINE'
  // Special
  | 'EOF' | 'ERROR';

export interface PythonToken {
  readonly type: PythonTokenType;
  readonly value: string;
  readonly location: SourceLocation;
}

const KEYWORDS: Record<string, PythonTokenType> = {
  def: 'KW_DEF',
  class: 'KW_CLASS',
  if: 'KW_IF',
  elif: 'KW_ELIF',
  else: 'KW_ELSE',
  while: 'KW_WHILE',
  for: 'KW_FOR',
  in: 'KW_IN',
  break: 'KW_BREAK',
  continue: 'KW_CONTINUE',
  return: 'KW_RETURN',
  import: 'KW_IMPORT',
  from: 'KW_FROM',
  as: 'KW_AS',
  pass: 'KW_PASS',
  and: 'KW_AND',
  or: 'KW_OR',
  not: 'KW_NOT',
  is: 'KW_IS',
  True: 'BOOL_LITERAL',
  False: 'BOOL_LITERAL',
  None: 'NONE_LITERAL',
  lambda: 'KW_LAMBDA',
  global: 'KW_GLOBAL',
  nonlocal: 'KW_NONLOCAL',
  try: 'KW_TRY',
  except: 'KW_EXCEPT',
  finally: 'KW_FINALLY',
  raise: 'KW_RAISE',
  with: 'KW_WITH',
  yield: 'KW_YIELD',
  assert: 'KW_ASSERT',
  del: 'KW_DEL',
  range: 'KW_RANGE',
  print: 'KW_PRINT',
};

export class PythonLexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private col: number = 0;
  private tokens: PythonToken[] = [];
  private indentStack: number[] = [0];
  private parenDepth: number = 0;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): PythonToken[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.col = 0;
    this.indentStack = [0];
    this.parenDepth = 0;

    while (this.pos < this.source.length) {
      this.tokenizeLine();
    }

    // Emit remaining DEDENTs
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.addToken('DEDENT', '', this.line, this.col, this.line, this.col);
    }

    this.addToken('EOF', '', this.line, this.col, this.line, this.col);
    return this.tokens;
  }

  private tokenizeLine(): void {
    // Handle indentation at start of line
    if (this.col === 0 && this.parenDepth === 0) {
      const indent = this.readIndent();

      // Skip blank lines and comment-only lines
      if (this.pos < this.source.length && (this.source[this.pos] === '\n' || this.source[this.pos] === '\r' || this.source[this.pos] === '#')) {
        this.skipToEndOfLine();
        return;
      }

      const currentIndent = this.indentStack[this.indentStack.length - 1];
      if (indent > currentIndent) {
        this.indentStack.push(indent);
        this.addToken('INDENT', '', this.line, 0, this.line, indent);
      } else {
        while (this.indentStack.length > 1 && indent < this.indentStack[this.indentStack.length - 1]) {
          this.indentStack.pop();
          this.addToken('DEDENT', '', this.line, 0, this.line, indent);
        }
      }
    }

    // Tokenize rest of the line
    while (this.pos < this.source.length) {
      this.skipSpaces();
      if (this.pos >= this.source.length) break;

      const ch = this.source[this.pos];

      if (ch === '\n' || ch === '\r') {
        if (this.parenDepth === 0) {
          this.addToken('NEWLINE', '\\n', this.line, this.col, this.line, this.col);
        }
        this.advancePastNewline();
        return;
      }

      if (ch === '#') {
        this.skipToEndOfLine();
        continue;
      }

      if (ch === '\\' && this.pos + 1 < this.source.length &&
          (this.source[this.pos + 1] === '\n' || this.source[this.pos + 1] === '\r')) {
        this.pos++;
        this.col++;
        this.advancePastNewline();
        continue;
      }

      // String literals
      if (ch === '"' || ch === "'") {
        this.readString();
        continue;
      }

      // Numbers
      if (this.isDigit(ch)) {
        this.readNumber();
        continue;
      }

      // Identifiers and keywords
      if (this.isIdentStart(ch)) {
        this.readIdentifier();
        continue;
      }

      // Operators
      this.readOperator();
    }
  }

  private readIndent(): number {
    let indent = 0;
    while (this.pos < this.source.length) {
      if (this.source[this.pos] === ' ') {
        indent++;
        this.pos++;
      } else if (this.source[this.pos] === '\t') {
        indent += 4;
        this.pos++;
      } else {
        break;
      }
    }
    this.col = indent;
    return indent;
  }

  private skipSpaces(): void {
    while (this.pos < this.source.length && (this.source[this.pos] === ' ' || this.source[this.pos] === '\t')) {
      this.pos++;
      this.col++;
    }
  }

  private skipToEndOfLine(): void {
    while (this.pos < this.source.length && this.source[this.pos] !== '\n' && this.source[this.pos] !== '\r') {
      this.pos++;
      this.col++;
    }
    if (this.pos < this.source.length) {
      if (this.parenDepth === 0) {
        this.addToken('NEWLINE', '\\n', this.line, this.col, this.line, this.col);
      }
      this.advancePastNewline();
    }
  }

  private advancePastNewline(): void {
    if (this.pos < this.source.length && this.source[this.pos] === '\r') {
      this.pos++;
    }
    if (this.pos < this.source.length && this.source[this.pos] === '\n') {
      this.pos++;
    }
    this.line++;
    this.col = 0;
  }

  private readString(): void {
    const startLine = this.line;
    const startCol = this.col;
    const quote = this.source[this.pos];
    let value = '';

    // Check for triple quotes
    if (this.pos + 2 < this.source.length && this.source[this.pos + 1] === quote && this.source[this.pos + 2] === quote) {
      this.pos += 3;
      this.col += 3;
      while (this.pos + 2 < this.source.length) {
        if (this.source[this.pos] === quote && this.source[this.pos + 1] === quote && this.source[this.pos + 2] === quote) {
          this.pos += 3;
          this.col += 3;
          break;
        }
        if (this.source[this.pos] === '\n') {
          this.line++;
          this.col = 0;
          value += '\n';
        } else {
          value += this.source[this.pos];
          this.col++;
        }
        this.pos++;
      }
    } else {
      this.pos++;
      this.col++;
      while (this.pos < this.source.length && this.source[this.pos] !== quote && this.source[this.pos] !== '\n') {
        if (this.source[this.pos] === '\\' && this.pos + 1 < this.source.length) {
          value += this.source[this.pos] + this.source[this.pos + 1];
          this.pos += 2;
          this.col += 2;
        } else {
          value += this.source[this.pos];
          this.pos++;
          this.col++;
        }
      }
      if (this.pos < this.source.length && this.source[this.pos] === quote) {
        this.pos++;
        this.col++;
      }
    }

    this.addToken('STRING_LITERAL', value, startLine, startCol, this.line, this.col);
  }

  private readNumber(): void {
    const startLine = this.line;
    const startCol = this.col;
    let value = '';
    let isFloat = false;

    while (this.pos < this.source.length && (this.isDigit(this.source[this.pos]) || this.source[this.pos] === '.' || this.source[this.pos] === '_')) {
      if (this.source[this.pos] === '.') {
        if (isFloat) break;
        isFloat = true;
      }
      if (this.source[this.pos] !== '_') {
        value += this.source[this.pos];
      }
      this.pos++;
      this.col++;
    }

    this.addToken(isFloat ? 'FLOAT_LITERAL' : 'INT_LITERAL', value, startLine, startCol, this.line, this.col);
  }

  private readIdentifier(): void {
    const startLine = this.line;
    const startCol = this.col;
    let value = '';

    while (this.pos < this.source.length && this.isIdentChar(this.source[this.pos])) {
      value += this.source[this.pos];
      this.pos++;
      this.col++;
    }

    const type = KEYWORDS[value] ?? 'IDENTIFIER';
    this.addToken(type, value, startLine, startCol, this.line, this.col);
  }

  private readOperator(): void {
    const startLine = this.line;
    const startCol = this.col;
    const ch = this.source[this.pos];
    const next = this.pos + 1 < this.source.length ? this.source[this.pos + 1] : '';

    let type: PythonTokenType;
    let value: string;

    switch (ch) {
      case '+':
        if (next === '=') { type = 'PLUS_ASSIGN'; value = '+='; this.pos += 2; this.col += 2; break; }
        type = 'PLUS'; value = '+'; this.pos++; this.col++; break;
      case '-':
        if (next === '=') { type = 'MINUS_ASSIGN'; value = '-='; this.pos += 2; this.col += 2; break; }
        if (next === '>') { type = 'ARROW'; value = '->'; this.pos += 2; this.col += 2; break; }
        type = 'MINUS'; value = '-'; this.pos++; this.col++; break;
      case '*':
        if (next === '*') { type = 'DOUBLE_STAR'; value = '**'; this.pos += 2; this.col += 2; break; }
        if (next === '=') { type = 'STAR_ASSIGN'; value = '*='; this.pos += 2; this.col += 2; break; }
        type = 'STAR'; value = '*'; this.pos++; this.col++; break;
      case '/':
        if (next === '/') { type = 'DOUBLE_SLASH'; value = '//'; this.pos += 2; this.col += 2; break; }
        if (next === '=') { type = 'SLASH_ASSIGN'; value = '/='; this.pos += 2; this.col += 2; break; }
        type = 'SLASH'; value = '/'; this.pos++; this.col++; break;
      case '%':
        type = 'PERCENT'; value = '%'; this.pos++; this.col++; break;
      case '=':
        if (next === '=') { type = 'EQ'; value = '=='; this.pos += 2; this.col += 2; break; }
        type = 'ASSIGN'; value = '='; this.pos++; this.col++; break;
      case '!':
        if (next === '=') { type = 'NEQ'; value = '!='; this.pos += 2; this.col += 2; break; }
        type = 'ERROR'; value = '!'; this.pos++; this.col++; break;
      case '<':
        if (next === '=') { type = 'LTE'; value = '<='; this.pos += 2; this.col += 2; break; }
        if (next === '<') { type = 'LSHIFT'; value = '<<'; this.pos += 2; this.col += 2; break; }
        type = 'LT'; value = '<'; this.pos++; this.col++; break;
      case '>':
        if (next === '=') { type = 'GTE'; value = '>='; this.pos += 2; this.col += 2; break; }
        if (next === '>') { type = 'RSHIFT'; value = '>>'; this.pos += 2; this.col += 2; break; }
        type = 'GT'; value = '>'; this.pos++; this.col++; break;
      case '&':
        type = 'AMPERSAND'; value = '&'; this.pos++; this.col++; break;
      case '|':
        type = 'PIPE'; value = '|'; this.pos++; this.col++; break;
      case '^':
        type = 'CARET'; value = '^'; this.pos++; this.col++; break;
      case '~':
        type = 'TILDE'; value = '~'; this.pos++; this.col++; break;
      case '(':
        type = 'LPAREN'; value = '('; this.pos++; this.col++; this.parenDepth++; break;
      case ')':
        type = 'RPAREN'; value = ')'; this.pos++; this.col++; this.parenDepth = Math.max(0, this.parenDepth - 1); break;
      case '[':
        type = 'LBRACKET'; value = '['; this.pos++; this.col++; this.parenDepth++; break;
      case ']':
        type = 'RBRACKET'; value = ']'; this.pos++; this.col++; this.parenDepth = Math.max(0, this.parenDepth - 1); break;
      case '{':
        type = 'LBRACE'; value = '{'; this.pos++; this.col++; this.parenDepth++; break;
      case '}':
        type = 'RBRACE'; value = '}'; this.pos++; this.col++; this.parenDepth = Math.max(0, this.parenDepth - 1); break;
      case ':':
        type = 'COLON'; value = ':'; this.pos++; this.col++; break;
      case ',':
        type = 'COMMA'; value = ','; this.pos++; this.col++; break;
      case '.':
        type = 'DOT'; value = '.'; this.pos++; this.col++; break;
      case ';':
        type = 'SEMICOLON'; value = ';'; this.pos++; this.col++; break;
      case '@':
        type = 'AT'; value = '@'; this.pos++; this.col++; break;
      default:
        type = 'ERROR'; value = ch; this.pos++; this.col++;
    }

    this.addToken(type, value, startLine, startCol, this.line, this.col);
  }

  private addToken(type: PythonTokenType, value: string, startLine: number, startCol: number, endLine: number, endCol: number): void {
    this.tokens.push({
      type,
      value,
      location: { startLine, endLine, startColumn: startCol, endColumn: endCol },
    });
  }

  private isDigit(ch: string): boolean { return ch >= '0' && ch <= '9'; }
  private isIdentStart(ch: string): boolean { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'; }
  private isIdentChar(ch: string): boolean { return this.isIdentStart(ch) || this.isDigit(ch); }
}
