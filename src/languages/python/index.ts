/**
 * Python Language Adapter — Implements the LanguageAdapter interface for Python.
 */

import type { LanguageAdapter } from '../../core/registry/language-adapter';
import type { ProgramIR } from '../../core/ir/program-ir';
import type {
  ParseResult,
  AnalysisResult,
  NormalizationResult,
  GenerationResult,
} from '../../core/conversion/conversion-result';
import { PythonParser } from './parser';
import { PythonNormalizer } from './normalizer';
import { PythonGenerator } from './generator';

export class PythonLanguageAdapter implements LanguageAdapter {
  readonly id = 'python';
  readonly name = 'Python';
  readonly fileExtension = '.py';
  readonly monacoLanguage = 'python';

  parse(source: string): ParseResult {
    const parser = new PythonParser();
    const result = parser.parse(source);
    return {
      success: result.ast !== null,
      ast: result.ast,
      diagnostics: result.diagnostics,
    };
  }

  analyze(_ast: unknown): AnalysisResult {
    return { success: true, diagnostics: [] };
  }

  toIR(ast: unknown): NormalizationResult {
    const normalizer = new PythonNormalizer();
    const result = normalizer.normalize(ast as ReturnType<PythonParser['parse']>['ast'] & object);
    return {
      success: true,
      ir: result.ir,
      diagnostics: result.diagnostics,
    };
  }

  generate(ir: ProgramIR): GenerationResult {
    const generator = new PythonGenerator();
    return generator.generate(ir);
  }
}
