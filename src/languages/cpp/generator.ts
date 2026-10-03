/**
 * C++ Code Generator — Generates formatted C++ source code from Program IR.
 */

import type { ProgramIR, IRFunction, IRParameter } from '../../core/ir/program-ir';
import type { IRStatement, BlockStatement, IfStatement, ForStatement } from '../../core/ir/statement-ir';
import type { IRExpression } from '../../core/ir/expression-ir';
import type { IRType } from '../../core/ir/type-ir';
import type { Diagnostic } from '../../core/conversion/diagnostics';
import type { GenerationResult, ConversionStatus } from '../../core/conversion/conversion-result';

export class CPPGenerator {
  private lines: string[] = [];
  private indent = 0;
  private diagnostics: Diagnostic[] = [];

  generate(ir: ProgramIR): GenerationResult {
    this.lines = [];
    this.indent = 0;
    this.diagnostics = [];

    this.writeLine('#include <iostream>');
    this.writeLine('#include <string>');
    this.writeLine('#include <vector>');
    this.writeLine('');
    this.writeLine('using namespace std;');
    this.writeLine('');

    // Global statements
    for (const stmt of ir.globalStatements) {
      this.generateStatement(stmt);
    }
    if (ir.globalStatements.length > 0) this.writeLine('');

    // Functions
    for (let i = 0; i < ir.functions.length; i++) {
      const fn = ir.functions[i];
      this.generateFunction(fn);
      if (i < ir.functions.length - 1) {
        this.writeLine('');
      }
    }

    const code = this.lines.join('\n').trimEnd() + '\n';
    const status: ConversionStatus = this.diagnostics.some((d) => d.severity === 'error')
      ? 'failed'
      : this.diagnostics.some((d) => d.severity === 'warning')
        ? 'partial_success'
        : 'success';

    return {
      success: !this.diagnostics.some((d) => d.severity === 'error'),
      code,
      diagnostics: this.diagnostics,
      status,
    };
  }

  private generateFunction(fn: IRFunction): void {
    const returnType = this.typeToString(fn.returnType);
    const params = fn.parameters.map((p) => this.paramToString(p)).join(', ');
    this.writeLine(`${returnType} ${fn.name}(${params}) {`);
    this.indent++;
    this.generateBlock(fn.body);

    if (fn.name === 'main' && !fn.body.statements.some((s) => s.kind === 'return')) {
      this.writeLine('return 0;');
    }
    this.indent--;
    this.writeLine('}');
  }

  private paramToString(param: IRParameter): string {
    const type = this.typeToString(param.type);
    if (param.defaultValue) {
      return `${type} ${param.name} = ${this.exprToString(param.defaultValue)}`;
    }
    return `${type} ${param.name}`;
  }

  private generateBlock(block: BlockStatement): void {
    for (const stmt of block.statements) {
      this.generateStatement(stmt);
    }
  }

  private generateStatement(stmt: IRStatement): void {
    switch (stmt.kind) {
      case 'variable-declaration': {
        const type = this.typeToString(stmt.type);
        const constPrefix = stmt.isConst ? 'const ' : '';
        if (stmt.initializer) {
          this.writeLine(`${constPrefix}${type} ${stmt.name} = ${this.exprToString(stmt.initializer)};`);
        } else {
          this.writeLine(`${constPrefix}${type} ${stmt.name};`);
        }
        break;
      }

      case 'expression-statement':
        this.writeLine(`${this.exprToString(stmt.expression)};`);
        break;

      case 'input':
        this.writeLine(`cin >> ${stmt.variable};`);
        break;

      case 'output': {
        const streamParts = stmt.expressions.map((e) => this.exprToString(e)).join(' << " " << ');
        if (stmt.newline === false) {
          this.writeLine(`cout << ${streamParts};`);
        } else {
          this.writeLine(`cout << ${streamParts} << endl;`);
        }
        break;
      }

      case 'if':
        this.generateIf(stmt);
        break;

      case 'while':
        this.writeLine(`while (${this.exprToString(stmt.condition)}) {`);
        this.indent++;
        this.generateBlock(stmt.body);
        this.indent--;
        this.writeLine('}');
        break;

      case 'for':
        this.generateFor(stmt);
        break;

      case 'do-while':
        this.writeLine('do {');
        this.indent++;
        this.generateBlock(stmt.body);
        this.indent--;
        this.writeLine(`} while (${this.exprToString(stmt.condition)});`);
        break;

      case 'switch':
        this.writeLine(`switch (${this.exprToString(stmt.expression)}) {`);
        this.indent++;
        for (const sc of stmt.cases) {
          if (sc.value) {
            this.writeLine(`case ${this.exprToString(sc.value)}: {`);
          } else {
            this.writeLine('default: {');
          }
          this.indent++;
          for (const s of sc.body) this.generateStatement(s);
          this.indent--;
          this.writeLine('}');
        }
        this.indent--;
        this.writeLine('}');
        break;

      case 'return':
        if (stmt.value) {
          this.writeLine(`return ${this.exprToString(stmt.value)};`);
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

      case 'function-call': {
        const args = stmt.arguments.map((a) => this.exprToString(a)).join(', ');
        this.writeLine(`${stmt.name}(${args});`);
        break;
      }

      case 'comment':
        this.writeLine(`// ${stmt.text}`);
        break;

      case 'empty':
        break;

      default:
        this.writeLine(`// ${(stmt as any).kind}`);
    }
  }

  private generateIf(stmt: IfStatement): void {
    this.writeLine(`if (${this.exprToString(stmt.condition)}) {`);
    this.indent++;
    this.generateBlock(stmt.thenBlock);
    this.indent--;
    this.writeLine('}');

    if (stmt.elseBlock) {
      if (stmt.elseBlock.kind === 'if') {
        this.writeLine('else');
        this.generateIf(stmt.elseBlock);
      } else {
        this.writeLine('else {');
        this.indent++;
        this.generateBlock(stmt.elseBlock);
        this.indent--;
        this.writeLine('}');
      }
    }
  }

  private generateFor(stmt: ForStatement): void {
    let initStr = '';
    if (stmt.init) {
      if (stmt.init.kind === 'variable-declaration') {
        const t = this.typeToString(stmt.init.type);
        const initVal = stmt.init.initializer ? ` = ${this.exprToString(stmt.init.initializer)}` : '';
        initStr = `${t} ${stmt.init.name}${initVal}`;
      } else if (stmt.init.kind === 'expression-statement') {
        initStr = this.exprToString(stmt.init.expression);
      }
    }
    const condStr = stmt.condition ? this.exprToString(stmt.condition) : '';
    const updateStr = stmt.update ? this.exprToString(stmt.update) : '';

    this.writeLine(`for (${initStr}; ${condStr}; ${updateStr}) {`);
    this.indent++;
    this.generateBlock(stmt.body);
    this.indent--;
    this.writeLine('}');
  }

  private exprToString(expr: IRExpression): string {
    switch (expr.kind) {
      case 'literal':
        if (expr.literalKind === 'string') return `"${expr.value.replace(/^["']|["']$/g, '')}"`;
        if (expr.literalKind === 'char') return `'${expr.value.replace(/^['"]|['"]$/g, '')}'`;
        return expr.value;

      case 'identifier':
        return expr.name;

      case 'binary':
        return `${this.exprToString(expr.left)} ${expr.operator} ${this.exprToString(expr.right)}`;

      case 'unary':
        if (expr.position === 'postfix') return `${this.exprToString(expr.operand)}${expr.operator}`;
        return `${expr.operator}${this.exprToString(expr.operand)}`;

      case 'logical':
        return `${this.exprToString(expr.left)} ${expr.operator} ${this.exprToString(expr.right)}`;

      case 'comparison':
        return `${this.exprToString(expr.left)} ${expr.operator} ${this.exprToString(expr.right)}`;

      case 'assignment':
        return `${this.exprToString(expr.target)} ${expr.operator} ${this.exprToString(expr.value)}`;

      case 'call': {
        const callee = this.exprToString(expr.callee);
        const args = expr.arguments.map((a) => this.exprToString(a)).join(', ');
        return `${callee}(${args})`;
      }

      case 'array-access':
        return `${this.exprToString(expr.array)}[${this.exprToString(expr.index)}]`;

      case 'member-access':
        return `${this.exprToString(expr.object)}.${expr.member}`;

      case 'parenthesized':
        return `(${this.exprToString(expr.expression)})`;

      case 'ternary':
        return `${this.exprToString(expr.condition)} ? ${this.exprToString(expr.consequent)} : ${this.exprToString(expr.alternate)}`;

      default:
        return '0';
    }
  }

  private typeToString(type: IRType): string {
    switch (type.kind) {
      case 'primitive':
        switch (type.name) {
          case 'int': return 'int';
          case 'float': return 'float';
          case 'double': return 'double';
          case 'char': return 'char';
          case 'string': return 'string';
          case 'bool': return 'bool';
          case 'void': return 'void';
          default: return 'auto';
        }
      case 'array':
        return `vector<${this.typeToString(type.elementType)}>`;
      case 'pointer':
        return `${this.typeToString(type.pointeeType)}*`;
      default:
        return 'auto';
    }
  }

  private writeLine(text: string): void {
    if (text === '') {
      this.lines.push('');
    } else {
      this.lines.push('    '.repeat(this.indent) + text);
    }
  }
}
