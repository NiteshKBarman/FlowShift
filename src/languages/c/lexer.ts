/**
 * C Lexer — Tokenizes C source code for the parser.
 *
 * This is a hand-written lexer targeting educational C programs.
 * It supports the subset of C needed for typical programming exercises.
 */

import type { SourceLocation } from '../../core/ir/source-location';

// ─── Token Types ─────────────────────────────────────────────────

export type TokenType =
  // Literals
  | 'INT_LITERAL'
  | 'FLOAT_LITERAL'
  | 'STRING_LITERAL'
  | 'CHAR_LITERAL'
  // Identifiers & Keywords
  | 'IDENTIFIER'
  | 'KW_INT'
  | 'KW_FLOAT'
  | 'KW_DOUBLE'
  | 'KW_CHAR'
  | 'KW_VOID'
  | 'KW_BOOL'
  | 'KW_LONG'
  | 'KW_SHORT'
  | 'KW_UNSIGNED'
  | 'KW_SIGNED'
  | 'KW_CONST'
  | 'KW_IF'
  | 'KW_ELSE'
  | 'KW_WHILE'
  | 'KW_FOR'
  | 'KW_DO'
  | 'KW_SWITCH'
  | 'KW_CASE'
  | 'KW_DEFAULT'
  | 'KW_BREAK'
  | 'KW_CONTINUE'
  | 'KW_RETURN'
  | 'KW_STRUCT'
  | 'KW_INCLUDE'
  | 'KW_DEFINE'
  | 'KW_SIZEOF'
  // Operators
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'PERCENT'
  | 'AMPERSAND'
  | 'PIPE'
  | 'CARET'
  | 'TILDE'
  | 'BANG'
  | 'QUESTION'
  | 'COLON'
  | 'DOT'
  | 'ARROW'
  | 'ASSIGN'
  | 'PLUS_ASSIGN'
  | 'MINUS_ASSIGN'
  | 'STAR_ASSIGN'
  | 'SLASH_ASSIGN'
  | 'PERCENT_ASSIGN'
  | 'EQ'
  | 'NEQ'
  | 'LT'
  | 'GT'
  | 'LTE'
  | 'GTE'
  | 'AND'
  | 'OR'
  | 'PLUS_PLUS'
  | 'MINUS_MINUS'
  | 'LSHIFT'
  | 'RSHIFT'
  // Delimiters
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACE'
  | 'RBRACE'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'SEMICOLON'
  | 'COMMA'
  | 'HASH'
  // Preprocessor
  | 'PREPROCESSOR'
  // Special
  | 'EOF'
  | 'ERROR';

export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly location: SourceLocation;
}

// ─── Keywords Map ────────────────────────────────────────────────

const KEYWORDS: Record<string, TokenType> = {
  int: 'KW_INT',
  float: 'KW_FLOAT',
  double: 'KW_DOUBLE',
  char: 'KW_CHAR',
  void: 'KW_VOID',
  bool: 'KW_BOOL',
  _Bool: 'KW_BOOL',
  long: 'KW_LONG',
  short: 'KW_SHORT',
  unsigned: 'KW_UNSIGNED',
  signed: 'KW_SIGNED',
  const: 'KW_CONST',
  if: 'KW_IF',
  else: 'KW_ELSE',
  while: 'KW_WHILE',
  for: 'KW_FOR',
  do: 'KW_DO',
  switch: 'KW_SWITCH',
  case: 'KW_CASE',
  default: 'KW_DEFAULT',
  break: 'KW_BREAK',
  continue: 'KW_CONTINUE',
  return: 'KW_RETURN',
  struct: 'KW_STRUCT',
  include: 'KW_INCLUDE',
  define: 'KW_DEFINE',
  sizeof: 'KW_SIZEOF',
};

// ─── Lexer ───────────────────────────────────────────────────────

export class CLexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private col: number = 0;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.col = 0;

    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      const ch = this.source[this.pos];

      // Skip comments
      if (ch === '/' && this.pos + 1 < this.source.length) {
        if (this.source[this.pos + 1] === '/') {
          this.skipLineComment();
          continue;
        }
        if (this.source[this.pos + 1] === '*') {
          this.skipBlockComment();
          continue;
        }
      }

      // Preprocessor directives
      if (ch === '#') {
        this.readPreprocessor();
        continue;
      }

      // String literal
      if (ch === '"') {
        this.readString();
        continue;
      }

      // Char literal
      if (ch === "'") {
        this.readChar();
        continue;
      }

      // Number
      if (this.isDigit(ch) || (ch === '.' && this.pos + 1 < this.source.length && this.isDigit(this.source[this.pos + 1]))) {
        this.readNumber();
        continue;
      }

      // Identifier or keyword
      if (this.isIdentStart(ch)) {
        this.readIdentifier();
        continue;
      }

      // Operators and delimiters
      this.readOperator();
    }

    this.addToken('EOF', '', this.line, this.col, this.line, this.col);
    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === '\n') {
        this.line++;
        this.col = 0;
        this.pos++;
      } else if (ch === '\r') {
        this.pos++;
        if (this.pos < this.source.length && this.source[this.pos] === '\n') {
          this.pos++;
        }
        this.line++;
        this.col = 0;
      } else if (ch === ' ' || ch === '\t') {
        this.col++;
        this.pos++;
      } else {
        break;
      }
    }
  }

  private skipLineComment(): void {
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      this.pos++;
      this.col++;
    }
  }

  private skipBlockComment(): void {
    this.pos += 2; // skip /*
    this.col += 2;
    while (this.pos + 1 < this.source.length) {
      if (this.source[this.pos] === '*' && this.source[this.pos + 1] === '/') {
        this.pos += 2;
        this.col += 2;
        return;
      }
      if (this.source[this.pos] === '\n') {
        this.line++;
        this.col = 0;
      } else {
        this.col++;
      }
      this.pos++;
    }
    // Unterminated block comment
    this.pos = this.source.length;
  }

  private readPreprocessor(): void {
    const startLine = this.line;
    const startCol = this.col;
    let value = '#';
    this.pos++;
    this.col++;

    // Skip whitespace after #
    while (this.pos < this.source.length && (this.source[this.pos] === ' ' || this.source[this.pos] === '\t')) {
      this.pos++;
      this.col++;
    }

    // Read the directive keyword
    let directive = '';
    while (this.pos < this.source.length && this.isIdentChar(this.source[this.pos])) {
      directive += this.source[this.pos];
      this.pos++;
      this.col++;
    }

    // Read the rest of the line (handling line continuations)
    let rest = '';
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      if (this.source[this.pos] === '\\' && this.pos + 1 < this.source.length && this.source[this.pos + 1] === '\n') {
        this.pos += 2;
        this.line++;
        this.col = 0;
        continue;
      }
      rest += this.source[this.pos];
      this.pos++;
      this.col++;
    }

    value = `#${directive}${rest}`;
    this.addToken('PREPROCESSOR', value.trim(), startLine, startCol, this.line, this.col);
  }

  private readString(): void {
    const startLine = this.line;
    const startCol = this.col;
    let value = '';
    this.pos++; // skip opening "
    this.col++;

    while (this.pos < this.source.length && this.source[this.pos] !== '"') {
      if (this.source[this.pos] === '\\' && this.pos + 1 < this.source.length) {
        value += this.source[this.pos];
        value += this.source[this.pos + 1];
        this.pos += 2;
        this.col += 2;
      } else {
        if (this.source[this.pos] === '\n') {
          this.line++;
          this.col = 0;
        } else {
          this.col++;
        }
        value += this.source[this.pos];
        this.pos++;
      }
    }

    if (this.pos < this.source.length) {
      this.pos++; // skip closing "
      this.col++;
    }

    this.addToken('STRING_LITERAL', value, startLine, startCol, this.line, this.col);
  }

  private readChar(): void {
    const startLine = this.line;
    const startCol = this.col;
    let value = '';
    this.pos++; // skip opening '
    this.col++;

    while (this.pos < this.source.length && this.source[this.pos] !== "'") {
      if (this.source[this.pos] === '\\' && this.pos + 1 < this.source.length) {
        value += this.source[this.pos];
        value += this.source[this.pos + 1];
        this.pos += 2;
        this.col += 2;
      } else {
        value += this.source[this.pos];
        this.pos++;
        this.col++;
      }
    }

    if (this.pos < this.source.length) {
      this.pos++; // skip closing '
      this.col++;
    }

    this.addToken('CHAR_LITERAL', value, startLine, startCol, this.line, this.col);
  }

  private readNumber(): void {
    const startLine = this.line;
    const startCol = this.col;
    let value = '';
    let isFloat = false;

    while (this.pos < this.source.length && (this.isDigit(this.source[this.pos]) || this.source[this.pos] === '.')) {
      if (this.source[this.pos] === '.') {
        if (isFloat) break; // second dot
        isFloat = true;
      }
      value += this.source[this.pos];
      this.pos++;
      this.col++;
    }

    // Handle suffix (f, l, u, etc.)
    if (this.pos < this.source.length) {
      const ch = this.source[this.pos].toLowerCase();
      if (ch === 'f' || ch === 'l' || ch === 'u') {
        value += this.source[this.pos];
        this.pos++;
        this.col++;
        isFloat = isFloat || ch === 'f';
      }
    }

    this.addToken(
      isFloat ? 'FLOAT_LITERAL' : 'INT_LITERAL',
      value,
      startLine,
      startCol,
      this.line,
      this.col
    );
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

    let type: TokenType;
    let value: string;

    switch (ch) {
      case '+':
        if (next === '+') { type = 'PLUS_PLUS'; value = '++'; this.pos += 2; this.col += 2; break; }
        if (next === '=') { type = 'PLUS_ASSIGN'; value = '+='; this.pos += 2; this.col += 2; break; }
        type = 'PLUS'; value = '+'; this.pos++; this.col++; break;
      case '-':
        if (next === '-') { type = 'MINUS_MINUS'; value = '--'; this.pos += 2; this.col += 2; break; }
        if (next === '=') { type = 'MINUS_ASSIGN'; value = '-='; this.pos += 2; this.col += 2; break; }
        if (next === '>') { type = 'ARROW'; value = '->'; this.pos += 2; this.col += 2; break; }
        type = 'MINUS'; value = '-'; this.pos++; this.col++; break;
      case '*':
        if (next === '=') { type = 'STAR_ASSIGN'; value = '*='; this.pos += 2; this.col += 2; break; }
        type = 'STAR'; value = '*'; this.pos++; this.col++; break;
      case '/':
        if (next === '=') { type = 'SLASH_ASSIGN'; value = '/='; this.pos += 2; this.col += 2; break; }
        type = 'SLASH'; value = '/'; this.pos++; this.col++; break;
      case '%':
        if (next === '=') { type = 'PERCENT_ASSIGN'; value = '%='; this.pos += 2; this.col += 2; break; }
        type = 'PERCENT'; value = '%'; this.pos++; this.col++; break;
      case '=':
        if (next === '=') { type = 'EQ'; value = '=='; this.pos += 2; this.col += 2; break; }
        type = 'ASSIGN'; value = '='; this.pos++; this.col++; break;
      case '!':
        if (next === '=') { type = 'NEQ'; value = '!='; this.pos += 2; this.col += 2; break; }
        type = 'BANG'; value = '!'; this.pos++; this.col++; break;
      case '<':
        if (next === '=') { type = 'LTE'; value = '<='; this.pos += 2; this.col += 2; break; }
        if (next === '<') { type = 'LSHIFT'; value = '<<'; this.pos += 2; this.col += 2; break; }
        type = 'LT'; value = '<'; this.pos++; this.col++; break;
      case '>':
        if (next === '=') { type = 'GTE'; value = '>='; this.pos += 2; this.col += 2; break; }
        if (next === '>') { type = 'RSHIFT'; value = '>>'; this.pos += 2; this.col += 2; break; }
        type = 'GT'; value = '>'; this.pos++; this.col++; break;
      case '&':
        if (next === '&') { type = 'AND'; value = '&&'; this.pos += 2; this.col += 2; break; }
        type = 'AMPERSAND'; value = '&'; this.pos++; this.col++; break;
      case '|':
        if (next === '|') { type = 'OR'; value = '||'; this.pos += 2; this.col += 2; break; }
        type = 'PIPE'; value = '|'; this.pos++; this.col++; break;
      case '^':
        type = 'CARET'; value = '^'; this.pos++; this.col++; break;
      case '~':
        type = 'TILDE'; value = '~'; this.pos++; this.col++; break;
      case '?':
        type = 'QUESTION'; value = '?'; this.pos++; this.col++; break;
      case ':':
        type = 'COLON'; value = ':'; this.pos++; this.col++; break;
      case '.':
        type = 'DOT'; value = '.'; this.pos++; this.col++; break;
      case '(':
        type = 'LPAREN'; value = '('; this.pos++; this.col++; break;
      case ')':
        type = 'RPAREN'; value = ')'; this.pos++; this.col++; break;
      case '{':
        type = 'LBRACE'; value = '{'; this.pos++; this.col++; break;
      case '}':
        type = 'RBRACE'; value = '}'; this.pos++; this.col++; break;
      case '[':
        type = 'LBRACKET'; value = '['; this.pos++; this.col++; break;
      case ']':
        type = 'RBRACKET'; value = ']'; this.pos++; this.col++; break;
      case ';':
        type = 'SEMICOLON'; value = ';'; this.pos++; this.col++; break;
      case ',':
        type = 'COMMA'; value = ','; this.pos++; this.col++; break;
      default:
        type = 'ERROR'; value = ch; this.pos++; this.col++;
    }

    this.addToken(type, value, startLine, startCol, this.line, this.col);
  }

  private addToken(
    type: TokenType,
    value: string,
    startLine: number,
    startCol: number,
    endLine: number,
    endCol: number
  ): void {
    this.tokens.push({
      type,
      value,
      location: {
        startLine,
        endLine,
        startColumn: startCol,
        endColumn: endCol,
      },
    });
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isIdentStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isIdentChar(ch: string): boolean {
    return this.isIdentStart(ch) || this.isDigit(ch);
  }
}
