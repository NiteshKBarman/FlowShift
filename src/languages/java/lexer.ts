/**
 * Java Lexer — Tokenizes Java source code.
 */

import type { SourceLocation } from '../../core/ir/source-location';

export type JavaTokenType =
  | 'INT_LITERAL'
  | 'FLOAT_LITERAL'
  | 'STRING_LITERAL'
  | 'CHAR_LITERAL'
  | 'BOOL_LITERAL'
  | 'NULL_LITERAL'
  | 'IDENTIFIER'
  | 'KW_PUBLIC'
  | 'KW_PRIVATE'
  | 'KW_PROTECTED'
  | 'KW_STATIC'
  | 'KW_FINAL'
  | 'KW_CLASS'
  | 'KW_VOID'
  | 'KW_INT'
  | 'KW_DOUBLE'
  | 'KW_FLOAT'
  | 'KW_BOOLEAN'
  | 'KW_CHAR'
  | 'KW_STRING'
  | 'KW_IF'
  | 'KW_ELSE'
  | 'KW_WHILE'
  | 'KW_FOR'
  | 'KW_DO'
  | 'KW_SWITCH'
  | 'KW_CASE'
  | 'KW_DEFAULT'
  | 'KW_RETURN'
  | 'KW_BREAK'
  | 'KW_CONTINUE'
  | 'KW_NEW'
  | 'KW_IMPORT'
  | 'KW_PACKAGE'
  | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'PERCENT'
  | 'ASSIGN' | 'PLUS_ASSIGN' | 'MINUS_ASSIGN' | 'STAR_ASSIGN' | 'SLASH_ASSIGN'
  | 'EQ' | 'NEQ' | 'LT' | 'GT' | 'LTE' | 'GTE'
  | 'AND' | 'OR' | 'NOT'
  | 'INCREMENT' | 'DECREMENT'
  | 'LPAREN' | 'RPAREN'
  | 'LBRACE' | 'RBRACE'
  | 'LBRACKET' | 'RBRACKET'
  | 'SEMICOLON' | 'COMMA' | 'DOT' | 'QUESTION' | 'COLON'
  | 'EOF' | 'ERROR';

export interface JavaToken {
  type: JavaTokenType;
  value: string;
  location: SourceLocation;
}

const KEYWORDS: Record<string, JavaTokenType> = {
  public: 'KW_PUBLIC',
  private: 'KW_PRIVATE',
  protected: 'KW_PROTECTED',
  static: 'KW_STATIC',
  final: 'KW_FINAL',
  class: 'KW_CLASS',
  void: 'KW_VOID',
  int: 'KW_INT',
  double: 'KW_DOUBLE',
  float: 'KW_FLOAT',
  boolean: 'KW_BOOLEAN',
  char: 'KW_CHAR',
  String: 'KW_STRING',
  if: 'KW_IF',
  else: 'KW_ELSE',
  while: 'KW_WHILE',
  for: 'KW_FOR',
  do: 'KW_DO',
  switch: 'KW_SWITCH',
  case: 'KW_CASE',
  default: 'KW_DEFAULT',
  return: 'KW_RETURN',
  break: 'KW_BREAK',
  continue: 'KW_CONTINUE',
  new: 'KW_NEW',
  import: 'KW_IMPORT',
  package: 'KW_PACKAGE',
  true: 'BOOL_LITERAL',
  false: 'BOOL_LITERAL',
  null: 'NULL_LITERAL',
};

export class JavaLexer {
  private source: string;
  private pos = 0;
  private line = 1;
  private col = 1;
  private tokens: JavaToken[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): JavaToken[] {
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.tokens = [];

    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.source.length) break;

      const ch = this.source[this.pos];
      if (this.isDigit(ch)) {
        this.readNumber();
      } else if (this.isIdentStart(ch)) {
        this.readIdentifierOrKeyword();
      } else if (ch === '"') {
        this.readString();
      } else if (ch === "'") {
        this.readChar();
      } else {
        this.readOperatorOrDelimiter();
      }
    }

    this.addToken('EOF', '', this.line, this.col, this.line, this.col);
    return this.tokens;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.pos++;
        this.col++;
      } else if (ch === '\n') {
        this.pos++;
        this.line++;
        this.col = 1;
      } else if (ch === '/' && this.pos + 1 < this.source.length && this.source[this.pos + 1] === '/') {
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
          this.pos++;
        }
      } else if (ch === '/' && this.pos + 1 < this.source.length && this.source[this.pos + 1] === '*') {
        this.pos += 2;
        this.col += 2;
        while (this.pos + 1 < this.source.length && !(this.source[this.pos] === '*' && this.source[this.pos + 1] === '/')) {
          if (this.source[this.pos] === '\n') {
            this.line++;
            this.col = 1;
          } else {
            this.col++;
          }
          this.pos++;
        }
        this.pos += 2;
        this.col += 2;
      } else {
        break;
      }
    }
  }

  private readNumber(): void {
    const startLine = this.line;
    const startCol = this.col;
    let numStr = '';
    let isFloat = false;

    while (this.pos < this.source.length && (this.isDigit(this.source[this.pos]) || this.source[this.pos] === '.')) {
      if (this.source[this.pos] === '.') {
        if (isFloat) break;
        isFloat = true;
      }
      numStr += this.source[this.pos];
      this.pos++;
      this.col++;
    }

    if (this.pos < this.source.length && (this.source[this.pos] === 'f' || this.source[this.pos] === 'd' || this.source[this.pos] === 'L')) {
      numStr += this.source[this.pos];
      this.pos++;
      this.col++;
    }

    this.addToken(isFloat ? 'FLOAT_LITERAL' : 'INT_LITERAL', numStr, startLine, startCol, this.line, this.col);
  }

  private readIdentifierOrKeyword(): void {
    const startLine = this.line;
    const startCol = this.col;
    let id = '';

    while (this.pos < this.source.length && this.isIdentChar(this.source[this.pos])) {
      id += this.source[this.pos];
      this.pos++;
      this.col++;
    }

    const type = KEYWORDS[id] ?? 'IDENTIFIER';
    this.addToken(type, id, startLine, startCol, this.line, this.col);
  }

  private readString(): void {
    const startLine = this.line;
    const startCol = this.col;
    let str = '"';
    this.pos++;
    this.col++;

    while (this.pos < this.source.length && this.source[this.pos] !== '"') {
      if (this.source[this.pos] === '\\' && this.pos + 1 < this.source.length) {
        str += this.source[this.pos] + this.source[this.pos + 1];
        this.pos += 2;
        this.col += 2;
      } else {
        if (this.source[this.pos] === '\n') {
          this.line++;
          this.col = 1;
        } else {
          this.col++;
        }
        str += this.source[this.pos];
        this.pos++;
      }
    }
    if (this.pos < this.source.length && this.source[this.pos] === '"') {
      str += '"';
      this.pos++;
      this.col++;
    }

    this.addToken('STRING_LITERAL', str, startLine, startCol, this.line, this.col);
  }

  private readChar(): void {
    const startLine = this.line;
    const startCol = this.col;
    let chStr = "'";
    this.pos++;
    this.col++;

    while (this.pos < this.source.length && this.source[this.pos] !== "'") {
      chStr += this.source[this.pos];
      this.pos++;
      this.col++;
    }
    if (this.pos < this.source.length && this.source[this.pos] === "'") {
      chStr += "'";
      this.pos++;
      this.col++;
    }

    this.addToken('CHAR_LITERAL', chStr, startLine, startCol, this.line, this.col);
  }

  private readOperatorOrDelimiter(): void {
    const startLine = this.line;
    const startCol = this.col;
    const ch = this.source[this.pos];
    const next = this.pos + 1 < this.source.length ? this.source[this.pos + 1] : '';

    let type: JavaTokenType = 'ERROR';
    let val = ch;

    if (ch === '+' && next === '+') { type = 'INCREMENT'; val = '++'; this.pos += 2; this.col += 2; }
    else if (ch === '-' && next === '-') { type = 'DECREMENT'; val = '--'; this.pos += 2; this.col += 2; }
    else if (ch === '=' && next === '=') { type = 'EQ'; val = '=='; this.pos += 2; this.col += 2; }
    else if (ch === '!' && next === '=') { type = 'NEQ'; val = '!='; this.pos += 2; this.col += 2; }
    else if (ch === '<' && next === '=') { type = 'LTE'; val = '<='; this.pos += 2; this.col += 2; }
    else if (ch === '>' && next === '=') { type = 'GTE'; val = '>='; this.pos += 2; this.col += 2; }
    else if (ch === '&' && next === '&') { type = 'AND'; val = '&&'; this.pos += 2; this.col += 2; }
    else if (ch === '|' && next === '|') { type = 'OR'; val = '||'; this.pos += 2; this.col += 2; }
    else if (ch === '+' && next === '=') { type = 'PLUS_ASSIGN'; val = '+='; this.pos += 2; this.col += 2; }
    else if (ch === '-' && next === '=') { type = 'MINUS_ASSIGN'; val = '-='; this.pos += 2; this.col += 2; }
    else if (ch === '*' && next === '=') { type = 'STAR_ASSIGN'; val = '*='; this.pos += 2; this.col += 2; }
    else if (ch === '/' && next === '=') { type = 'SLASH_ASSIGN'; val = '/='; this.pos += 2; this.col += 2; }
    else {
      switch (ch) {
        case '+': type = 'PLUS'; break;
        case '-': type = 'MINUS'; break;
        case '*': type = 'STAR'; break;
        case '/': type = 'SLASH'; break;
        case '%': type = 'PERCENT'; break;
        case '=': type = 'ASSIGN'; break;
        case '<': type = 'LT'; break;
        case '>': type = 'GT'; break;
        case '!': type = 'NOT'; break;
        case '(': type = 'LPAREN'; break;
        case ')': type = 'RPAREN'; break;
        case '{': type = 'LBRACE'; break;
        case '}': type = 'RBRACE'; break;
        case '[': type = 'LBRACKET'; break;
        case ']': type = 'RBRACKET'; break;
        case ';': type = 'SEMICOLON'; break;
        case ',': type = 'COMMA'; break;
        case '.': type = 'DOT'; break;
        case '?': type = 'QUESTION'; break;
        case ':': type = 'COLON'; break;
        default: type = 'ERROR'; break;
      }
      this.pos++;
      this.col++;
    }

    this.addToken(type, val, startLine, startCol, this.line, this.col);
  }

  private addToken(type: JavaTokenType, value: string, startLine: number, startCol: number, endLine: number, endCol: number): void {
    this.tokens.push({
      type,
      value,
      location: { startLine, endLine, startColumn: startCol, endColumn: endCol },
    });
  }

  private isDigit(ch: string): boolean { return ch >= '0' && ch <= '9'; }
  private isIdentStart(ch: string): boolean { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$'; }
  private isIdentChar(ch: string): boolean { return this.isIdentStart(ch) || this.isDigit(ch); }
}
