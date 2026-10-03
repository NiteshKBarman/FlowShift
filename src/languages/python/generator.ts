/**
 * Python Code Generator — Generates Python source code from Program IR.
 */

import type { ProgramIR, IRFunction, IRParameter } from '../../core/ir/program-ir';
import type { IRStatement, BlockStatement, IfStatement, ForStatement } from '../../core/ir/statement-ir';
import type { IRExpression } from '../../core/ir/expression-ir';
import type { Diagnostic } from '../../core/conversion/diagnostics';
import type { GenerationResult, ConversionStatus } from '../../core/conversion/conversion-result';

export class PythonGenerator {
  private lines: string[] = [];
  private indent = 0;
  private diagnostics: Diagnostic[] = [];

  generate(ir: ProgramIR): GenerationResult {
    this.lines = [];
    this.indent = 0;
    this.diagnostics = [];

    // Imports
    if (ir.imports.length > 0) {
      for (const imp of ir.imports) {
        if (imp.items && imp.items.length > 0) {
          this.writeLine(`from ${imp.module} import ${imp.items.join(', ')}`);
        } else {
          this.writeLine(`import ${imp.module}`);
        }
      }
      this.writeLine('');
    }

    // Global statements
    for (const stmt of ir.globalStatements) {
      this.generateStatement(stmt);
    }
    if (ir.globalStatements.length > 0 && ir.functions.length > 0) {
      this.writeLine('');
    }

    // Functions
    for (let i = 0; i < ir.functions.length; i++) {
      const fn = ir.functions[i];
      this.generateFunction(fn);
      if (i < ir.functions.length - 1) {
        this.writeLine('');
      }
    }

    // If there is a main function, invoke it at the end
    const mainFn = ir.functions.find((f) => f.name === 'main' || f.isMain);
    if (mainFn) {
      this.writeLine('');
      this.writeLine('if __name__ == "__main__":');
      this.indent++;
      this.writeLine('main()');
      this.indent--;
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
    const params = fn.parameters.map((p) => this.paramToString(p)).join(', ');
    this.writeLine(`def ${fn.name}(${params}):`);
    this.indent++;

    if (fn.body.statements.length === 0) {
      this.writeLine('pass');
    } else {
      this.generateBlock(fn.body);
    }
    this.indent--;
  }

  private paramToString(param: IRParameter): string {
    if (param.defaultValue) {
      return `${param.name}=${this.exprToString(param.defaultValue)}`;
    }
    return param.name;
  }

  private generateBlock(block: BlockStatement): void {
    if (block.statements.length === 0) {
      this.writeLine('pass');
      return;
    }
    for (const stmt of block.statements) {
      this.generateStatement(stmt);
    }
  }

  private generateStatement(stmt: IRStatement): void {
    switch (stmt.kind) {
      case 'variable-declaration': {
        const val = stmt.initializer ? this.exprToString(stmt.initializer) : 'None';
        this.writeLine(`${stmt.name} = ${val}`);
        break;
      }

      case 'expression-statement':
        this.writeLine(this.exprToString(stmt.expression));
        break;

      case 'input': {
        const prompt = stmt.prompt ? `"${stmt.prompt}"` : '""';
        if (stmt.type?.kind === 'primitive' && stmt.type.name === 'int') {
          this.writeLine(`${stmt.variable} = int(input(${prompt}))`);
        } else if (stmt.type?.kind === 'primitive' && (stmt.type.name === 'float' || stmt.type.name === 'double')) {
          this.writeLine(`${stmt.variable} = float(input(${prompt}))`);
        } else {
          this.writeLine(`${stmt.variable} = input(${prompt})`);
        }
        break;
      }

      case 'output': {
        const exprs = stmt.expressions.map((e) => this.exprToString(e)).join(', ');
        if (stmt.newline === false) {
          this.writeLine(`print(${exprs}, end="")`);
        } else {
          this.writeLine(`print(${exprs})`);
        }
        break;
      }

      case 'if':
        this.generateIf(stmt);
        break;

      case 'while':
        this.writeLine(`while ${this.exprToString(stmt.condition)}:`);
        this.indent++;
        this.generateBlock(stmt.body);
        this.indent--;
        break;

      case 'for':
        this.generateFor(stmt);
        break;

      case 'return':
        if (stmt.value) {
          this.writeLine(`return ${this.exprToString(stmt.value)}`);
        } else {
          this.writeLine('return');
        }
        break;

      case 'break':
        this.writeLine('break');
        break;

      case 'continue':
        this.writeLine('continue');
        break;

      case 'block':
        this.generateBlock(stmt);
        break;

      case 'function-call': {
        const args = stmt.arguments.map((a) => this.exprToString(a)).join(', ');
        this.writeLine(`${stmt.name}(${args})`);
        break;
      }

      case 'comment':
        this.writeLine(`# ${stmt.text}`);
        break;

      case 'empty':
        break;

      case 'switch': {
        // Python does not traditionally have switch (pre-3.10), generate if-elif chain
        this.diagnostics.push({
          severity: 'info',
          category: 'conversion',
          message: 'Converting switch statement to if-elif ladder in Python',
        });
        const switchExpr = this.exprToString(stmt.expression);
        let first = true;
        for (const sc of stmt.cases) {
          if (sc.value) {
            const prefix = first ? 'if' : 'elif';
            this.writeLine(`${prefix} ${switchExpr} == ${this.exprToString(sc.value)}:`);
            first = false;
          } else {
            this.writeLine('else:');
          }
          this.indent++;
          const filtered = sc.body.filter((s) => s.kind !== 'break');
          if (filtered.length === 0) {
            this.writeLine('pass');
          } else {
            for (const s of filtered) this.generateStatement(s);
          }
          this.indent--;
        }
        break;
      }

      default:
        this.writeLine(`# ${(stmt as any).kind}`);
    }
  }

  private generateIf(stmt: IfStatement): void {
    this.writeLine(`if ${this.exprToString(stmt.condition)}:`);
    this.indent++;
    this.generateBlock(stmt.thenBlock);
    this.indent--;

    if (stmt.elseBlock) {
      if (stmt.elseBlock.kind === 'if') {
        this.writeLine(`elif ${this.exprToString(stmt.elseBlock.condition)}:`);
        this.indent++;
        this.generateBlock(stmt.elseBlock.thenBlock);
        this.indent--;
        if (stmt.elseBlock.elseBlock) {
          this.generateElseBranch(stmt.elseBlock.elseBlock);
        }
      } else {
        this.generateElseBranch(stmt.elseBlock);
      }
    }
  }

  private generateElseBranch(elseBlock: BlockStatement | IfStatement): void {
    if (elseBlock.kind === 'if') {
      this.writeLine(`elif ${this.exprToString(elseBlock.condition)}:`);
      this.indent++;
      this.generateBlock(elseBlock.thenBlock);
      this.indent--;
      if (elseBlock.elseBlock) {
        this.generateElseBranch(elseBlock.elseBlock);
      }
    } else {
      this.writeLine('else:');
      this.indent++;
      this.generateBlock(elseBlock);
      this.indent--;
    }
  }

  private generateFor(stmt: ForStatement): void {
    // Check if it matches a standard counting loop: for (i = start; i < stop; i++)
    let loopVar = 'i';
    let startVal = '0';
    let stopVal = '10';
    let stepVal = '1';

    if (stmt.init && stmt.init.kind === 'variable-declaration') {
      loopVar = stmt.init.name;
      if (stmt.init.initializer) {
        startVal = this.exprToString(stmt.init.initializer);
      }
    }

    if (stmt.condition && stmt.condition.kind === 'comparison') {
      stopVal = this.exprToString(stmt.condition.right);
    }

    if (startVal === '0' && stepVal === '1') {
      this.writeLine(`for ${loopVar} in range(${stopVal}):`);
    } else if (stepVal === '1') {
      this.writeLine(`for ${loopVar} in range(${startVal}, ${stopVal}):`);
    } else {
      this.writeLine(`for ${loopVar} in range(${startVal}, ${stopVal}, ${stepVal}):`);
    }

    this.indent++;
    this.generateBlock(stmt.body);
    this.indent--;
  }

  private exprToString(expr: IRExpression): string {
    switch (expr.kind) {
      case 'literal':
        if (expr.literalKind === 'bool') {
          return expr.value === 'true' ? 'True' : 'False';
        }
        if (expr.literalKind === 'null') {
          return 'None';
        }
        if (expr.literalKind === 'string') {
          return `"${expr.value.replace(/^["']|["']$/g, '')}"`;
        }
        return expr.value;

      case 'identifier':
        return expr.name;

      case 'binary':
        return `${this.exprToString(expr.left)} ${expr.operator} ${this.exprToString(expr.right)}`;

      case 'unary':
        if (expr.operator === '!') return `not ${this.exprToString(expr.operand)}`;
        if (expr.operator === '++') return `${this.exprToString(expr.operand)} + 1`;
        if (expr.operator === '--') return `${this.exprToString(expr.operand)} - 1`;
        return `${expr.operator}${this.exprToString(expr.operand)}`;

      case 'logical': {
        const op = expr.operator === '&&' ? 'and' : 'or';
        return `${this.exprToString(expr.left)} ${op} ${this.exprToString(expr.right)}`;
      }

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
        return `${this.exprToString(expr.consequent)} if ${this.exprToString(expr.condition)} else ${this.exprToString(expr.alternate)}`;

      default:
        return 'None';
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
