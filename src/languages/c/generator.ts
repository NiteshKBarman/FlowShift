/**
 * C Code Generator — Generates C source code from Program IR.
 */

import type { ProgramIR, IRFunction, IRParameter } from '../../core/ir/program-ir';
import type { IRStatement, BlockStatement, SwitchCase } from '../../core/ir/statement-ir';
import type { IRExpression } from '../../core/ir/expression-ir';
import type { IRType } from '../../core/ir/type-ir';
import type { Diagnostic } from '../../core/conversion/diagnostics';
import type { GenerationResult, ConversionStatus } from '../../core/conversion/conversion-result';

export class CGenerator {
  private output: string[] = [];
  private indent: number = 0;
  private diagnostics: Diagnostic[] = [];
  private needsStdio = false;
  private needsStdlib = false;
  private needsString = false;
  private needsMath = false;

  generate(ir: ProgramIR): GenerationResult {
    this.output = [];
    this.indent = 0;
    this.diagnostics = [];
    this.needsStdio = false;
    this.needsStdlib = false;
    this.needsString = false;
    this.needsMath = false;

    // First pass: generate function bodies to determine includes
    const functionBodies: string[] = [];
    for (const fn of ir.functions) {
      const saved = this.output;
      this.output = [];
      this.generateFunction(fn);
      functionBodies.push(this.output.join('\n'));
      this.output = saved;
    }

    // Emit includes
    this.needsStdio = true; // Always include stdio for C
    if (this.needsStdio) this.writeLine('#include <stdio.h>');
    if (this.needsStdlib) this.writeLine('#include <stdlib.h>');
    if (this.needsString) this.writeLine('#include <string.h>');
    if (this.needsMath) this.writeLine('#include <math.h>');
    this.writeLine('');

    // Emit global variables
    for (const stmt of ir.globalStatements) {
      this.generateStatement(stmt);
    }
    if (ir.globalStatements.length > 0) this.writeLine('');

    // Emit functions
    for (const body of functionBodies) {
      this.output.push(body);
      this.writeLine('');
    }

    const code = this.output.join('\n').trimEnd() + '\n';
    const status: ConversionStatus = this.diagnostics.some(d => d.severity === 'error')
      ? 'failed'
      : this.diagnostics.some(d => d.severity === 'warning')
        ? 'partial_success'
        : 'success';

    return { success: !this.diagnostics.some(d => d.severity === 'error'), code, diagnostics: this.diagnostics, status };
  }

  // ─── Function ──────────────────────────────────────────────

  private generateFunction(fn: IRFunction): void {
    const isMain = fn.name === 'main' || fn.isMain;
    const returnType = isMain ? 'int' : this.typeToC(fn.returnType);
    const params = fn.parameters.map(p => this.paramToC(p)).join(', ');
    const paramStr = params ? params : (isMain ? '' : 'void');
    this.writeLine(`${returnType} ${fn.name}(${paramStr}) {`);
    this.indent++;
    this.generateBlock(fn.body);
    if (isMain && !fn.body.statements.some(s => s.kind === 'return')) {
      this.writeLine('return 0;');
    }
    this.indent--;
    this.writeLine('}');
  }

  private paramToC(param: IRParameter): string {
    const type = this.typeToC(param.type);
    if (param.type.kind === 'array') {
      return `${this.typeToC(param.type.kind === 'array' ? param.type.elementType : param.type)} ${param.name}[]`;
    }
    return `${type} ${param.name}`;
  }

  // ─── Type ──────────────────────────────────────────────────

  private typeToC(type: IRType): string {
    switch (type.kind) {
      case 'primitive':
        switch (type.name) {
          case 'int': return 'int';
          case 'float': return 'float';
          case 'double': return 'double';
          case 'char': return 'char';
          case 'string': return 'char*';
          case 'bool': return 'int';
          case 'void': return 'void';
        }
        break;
      case 'array':
        return this.typeToC(type.elementType);
      case 'pointer':
        return `${this.typeToC(type.pointeeType)}*`;
      case 'unknown':
        return type.rawText ?? 'int';
      case 'inferred':
        return 'int'; // C requires explicit types
      default:
        return 'int';
    }
  }

  private getFormatSpecifier(type: IRType): string {
    if (type.kind === 'primitive') {
      switch (type.name) {
        case 'int': return '%d';
        case 'float': return '%f';
        case 'double': return '%lf';
        case 'char': return '%c';
        case 'string': return '%s';
        default: return '%d';
      }
    }
    return '%d';
  }

  // ─── Block ─────────────────────────────────────────────────

  private generateBlock(block: BlockStatement): void {
    for (const stmt of block.statements) {
      this.generateStatement(stmt);
    }
  }

  // ─── Statement ─────────────────────────────────────────────

  private generateStatement(stmt: IRStatement): void {
    switch (stmt.kind) {
      case 'variable-declaration': {
        const type = this.typeToC(stmt.type);
        if (stmt.type.kind === 'array') {
          const size = stmt.type.size ? `[${stmt.type.size}]` : '[]';
          this.writeLine(`${type} ${stmt.name}${size};`);
        } else if (stmt.initializer) {
          this.writeLine(`${type} ${stmt.name} = ${this.exprToC(stmt.initializer)};`);
        } else {
          this.writeLine(`${type} ${stmt.name};`);
        }
        break;
      }

      case 'expression-statement':
        this.writeLine(`${this.exprToC(stmt.expression)};`);
        break;

      case 'input': {
        this.needsStdio = true;
        const fmt = stmt.type ? this.getFormatSpecifier(stmt.type) : '%d';
        this.writeLine(`scanf("${fmt}", &${stmt.variable});`);
        break;
      }

      case 'output': {
        this.needsStdio = true;
        const parts: string[] = [];
        const args: string[] = [];
        for (const expr of stmt.expressions) {
          if (expr.kind === 'literal' && expr.literalKind === 'string') {
            const text = expr.value.replace(/^["']|["']$/g, '');
            parts.push(text);
          } else {
            parts.push('%d');
            args.push(this.exprToC(expr));
          }
        }
        let fmt = parts.join('');
        if (stmt.newline && !fmt.endsWith('\\n')) fmt += '\\n';
        const argsStr = args.length > 0 ? `, ${args.join(', ')}` : '';
        this.writeLine(`printf("${fmt}"${argsStr});`);
        break;
      }

      case 'if': {
        this.writeLine(`if (${this.exprToC(stmt.condition)}) {`);
        this.indent++;
        this.generateBlock(stmt.thenBlock);
        this.indent--;
        if (stmt.elseBlock) {
          if (stmt.elseBlock.kind === 'if') {
            this.write(`} else `);
            this.generateStatement(stmt.elseBlock);
          } else {
            this.writeLine('} else {');
            this.indent++;
            this.generateBlock(stmt.elseBlock);
            this.indent--;
            this.writeLine('}');
          }
        } else {
          this.writeLine('}');
        }
        break;
      }

      case 'while':
        this.writeLine(`while (${this.exprToC(stmt.condition)}) {`);
        this.indent++;
        this.generateBlock(stmt.body);
        this.indent--;
        this.writeLine('}');
        break;

      case 'for': {
        const init = stmt.init ? this.stmtExprToC(stmt.init) : '';
        const cond = stmt.condition ? this.exprToC(stmt.condition) : '';
        const update = stmt.update ? this.exprToC(stmt.update) : '';
        this.writeLine(`for (${init}; ${cond}; ${update}) {`);
        this.indent++;
        this.generateBlock(stmt.body);
        this.indent--;
        this.writeLine('}');
        break;
      }

      case 'do-while':
        this.writeLine('do {');
        this.indent++;
        this.generateBlock(stmt.body);
        this.indent--;
        this.writeLine(`} while (${this.exprToC(stmt.condition)});`);
        break;

      case 'switch':
        this.writeLine(`switch (${this.exprToC(stmt.expression)}) {`);
        this.indent++;
        for (const c of stmt.cases) {
          this.generateCase(c);
        }
        this.indent--;
        this.writeLine('}');
        break;

      case 'return':
        if (stmt.value) {
          this.writeLine(`return ${this.exprToC(stmt.value)};`);
        } else {
          this.writeLine('return;');
        }
        break;

      case 'break':
        this.writeLine('break;');
        break;

      case 'continue':
        this.writeLine('continue;');
        break;

      case 'block':
        this.writeLine('{');
        this.indent++;
        this.generateBlock(stmt);
        this.indent--;
        this.writeLine('}');
        break;

      case 'function-call':
        this.writeLine(`${stmt.name}(${stmt.arguments.map(a => this.exprToC(a)).join(', ')});`);
        break;

      case 'comment':
        this.writeLine(`// ${stmt.text}`);
        break;

      case 'empty':
        break;

      case 'unknown-statement':
        this.writeLine(`/* unsupported: ${stmt.rawText} */`);
        this.diagnostics.push({
          severity: 'warning',
          category: 'generation',
          message: `Unsupported construct: ${stmt.rawText}`,
        });
        break;
    }
  }

  private generateCase(c: SwitchCase): void {
    if (c.value) {
      this.writeLine(`case ${this.exprToC(c.value)}:`);
    } else {
      this.writeLine('default:');
    }
    this.indent++;
    for (const stmt of c.body) {
      this.generateStatement(stmt);
    }
    this.indent--;
  }

  // ─── Expression ────────────────────────────────────────────

  private exprToC(expr: IRExpression): string {
    switch (expr.kind) {
      case 'literal':
        return expr.value;
      case 'identifier':
        return expr.name;
      case 'binary':
        return `${this.exprToC(expr.left)} ${expr.operator} ${this.exprToC(expr.right)}`;
      case 'unary':
        return expr.position === 'prefix'
          ? `${expr.operator}${this.exprToC(expr.operand)}`
          : `${this.exprToC(expr.operand)}${expr.operator}`;
      case 'logical':
        return `${this.exprToC(expr.left)} ${expr.operator} ${this.exprToC(expr.right)}`;
      case 'comparison':
        return `${this.exprToC(expr.left)} ${expr.operator} ${this.exprToC(expr.right)}`;
      case 'assignment':
        return `${this.exprToC(expr.target)} ${expr.operator} ${this.exprToC(expr.value)}`;
      case 'call':
        return `${this.exprToC(expr.callee)}(${expr.arguments.map(a => this.exprToC(a)).join(', ')})`;
      case 'array-access':
        return `${this.exprToC(expr.array)}[${this.exprToC(expr.index)}]`;
      case 'member-access':
        return `${this.exprToC(expr.object)}.${expr.member}`;
      case 'cast':
        return `(${this.typeToC(expr.targetType)})${this.exprToC(expr.expression)}`;
      case 'ternary':
        return `${this.exprToC(expr.condition)} ? ${this.exprToC(expr.consequent)} : ${this.exprToC(expr.alternate)}`;
      case 'parenthesized':
        return `(${this.exprToC(expr.expression)})`;
      case 'unknown-expression':
        return expr.rawText;
    }
  }

  private stmtExprToC(stmt: IRStatement): string {
    if (stmt.kind === 'variable-declaration') {
      const type = this.typeToC(stmt.type);
      if (stmt.initializer) {
        return `${type} ${stmt.name} = ${this.exprToC(stmt.initializer)}`;
      }
      return `${type} ${stmt.name}`;
    }
    if (stmt.kind === 'expression-statement') {
      return this.exprToC(stmt.expression);
    }
    return '';
  }

  // ─── Output Helpers ────────────────────────────────────────

  private writeLine(text: string): void {
    const indentStr = '    '.repeat(this.indent);
    this.output.push(`${indentStr}${text}`);
  }

  private write(text: string): void {
    const indentStr = '    '.repeat(this.indent);
    // Append to last line if possible
    if (this.output.length > 0) {
      this.output[this.output.length - 1] = `${indentStr}${text}`;
    } else {
      this.output.push(`${indentStr}${text}`);
    }
  }
}
