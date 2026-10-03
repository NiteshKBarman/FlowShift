/**
 * Java Code Generator — Generates formatted Java source code from Program IR.
 */

import type { ProgramIR, IRFunction, IRParameter } from '../../core/ir/program-ir';
import type { IRStatement, BlockStatement, IfStatement, ForStatement } from '../../core/ir/statement-ir';
import type { IRExpression } from '../../core/ir/expression-ir';
import type { IRType } from '../../core/ir/type-ir';
import type { Diagnostic } from '../../core/conversion/diagnostics';
import type { GenerationResult, ConversionStatus } from '../../core/conversion/conversion-result';

export class JavaGenerator {
  private lines: string[] = [];
  private indent = 0;
  private diagnostics: Diagnostic[] = [];
  private needsScanner = false;

  generate(ir: ProgramIR): GenerationResult {
    this.lines = [];
    this.indent = 0;
    this.diagnostics = [];
    this.needsScanner = this.checkForInput(ir);

    if (this.needsScanner) {
      this.writeLine('import java.util.Scanner;');
      this.writeLine('');
    }

    this.writeLine('public class Main {');
    this.indent++;

    // Fields
    for (const stmt of ir.globalStatements) {
      this.writeLine('static ' + this.statementToSingleLine(stmt));
    }
    if (ir.globalStatements.length > 0) this.writeLine('');

    // Methods
    for (let i = 0; i < ir.functions.length; i++) {
      const fn = ir.functions[i];
      this.generateMethod(fn);
      if (i < ir.functions.length - 1) {
        this.writeLine('');
      }
    }

    this.indent--;
    this.writeLine('}');

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

  private checkForInput(ir: ProgramIR): boolean {
    const checkStmt = (s: IRStatement): boolean => {
      if (s.kind === 'input') return true;
      if (s.kind === 'block') return s.statements.some(checkStmt);
      if (s.kind === 'if') return s.thenBlock.statements.some(checkStmt) || (s.elseBlock ? (s.elseBlock.kind === 'block' ? s.elseBlock.statements.some(checkStmt) : checkStmt(s.elseBlock)) : false);
      if (s.kind === 'while' || s.kind === 'do-while' || s.kind === 'for') return s.body.statements.some(checkStmt);
      return false;
    };
    return ir.functions.some((f) => f.body.statements.some(checkStmt));
  }

  private generateMethod(fn: IRFunction): void {
    const isMain = fn.name === 'main' || fn.isMain;
    if (isMain) {
      this.writeLine('public static void main(String[] args) {');
    } else {
      const returnType = this.typeToString(fn.returnType);
      const params = fn.parameters.map((p) => this.paramToString(p)).join(', ');
      this.writeLine(`public static ${returnType} ${fn.name}(${params}) {`);
    }

    this.indent++;

    const methodHasInput = fn.body.statements.some((s) => this.hasInputRecursive(s));
    if (methodHasInput) {
      this.writeLine('Scanner scanner = new Scanner(System.in);');
    }

    this.generateBlock(fn.body);
    this.indent--;
    this.writeLine('}');
  }

  private hasInputRecursive(s: IRStatement): boolean {
    if (s.kind === 'input') return true;
    if (s.kind === 'block') return s.statements.some((c) => this.hasInputRecursive(c));
    return false;
  }

  private paramToString(param: IRParameter): string {
    const type = this.typeToString(param.type);
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
        const constPrefix = stmt.isConst ? 'final ' : '';
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

      case 'input': {
        if (stmt.type?.kind === 'primitive' && stmt.type.name === 'int') {
          this.writeLine(`${stmt.variable} = scanner.nextInt();`);
        } else if (stmt.type?.kind === 'primitive' && (stmt.type.name === 'double' || stmt.type.name === 'float')) {
          this.writeLine(`${stmt.variable} = scanner.nextDouble();`);
        } else {
          this.writeLine(`${stmt.variable} = scanner.nextLine();`);
        }
        break;
      }

      case 'output': {
        const exprs = stmt.expressions.map((e) => this.exprToString(e)).join(' + " " + ');
        if (stmt.newline === false) {
          this.writeLine(`System.out.print(${exprs || '""'});`);
        } else {
          this.writeLine(`System.out.println(${exprs || '""'});`);
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
            this.writeLine(`case ${this.exprToString(sc.value)}:`);
          } else {
            this.writeLine('default:');
          }
          this.indent++;
          for (const s of sc.body) this.generateStatement(s);
          this.indent--;
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

  private statementToSingleLine(stmt: IRStatement): string {
    if (stmt.kind === 'variable-declaration') {
      const type = this.typeToString(stmt.type);
      return stmt.initializer
        ? `${type} ${stmt.name} = ${this.exprToString(stmt.initializer)};`
        : `${type} ${stmt.name};`;
    }
    return '';
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
          case 'string': return 'String';
          case 'bool': return 'boolean';
          case 'void': return 'void';
          default: return 'Object';
        }
      case 'array':
        return `${this.typeToString(type.elementType)}[]`;
      default:
        return 'Object';
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
