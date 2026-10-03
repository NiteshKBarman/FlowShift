/**
 * C++ Language Adapter — Implements the LanguageAdapter interface for C++.
 */

import type { LanguageAdapter } from '../../core/registry/language-adapter';
import type { ProgramIR } from '../../core/ir/program-ir';
import type {
  ParseResult,
  AnalysisResult,
  NormalizationResult,
  GenerationResult,
} from '../../core/conversion/conversion-result';
import { CPPParser } from './parser';
import { CPPNormalizer } from './normalizer';
import { CPPGenerator } from './generator';

export class CPPLanguageAdapter implements LanguageAdapter {
  readonly id = 'cpp';
  readonly name = 'C++';
  readonly fileExtension = '.cpp';
  readonly monacoLanguage = 'cpp';

  parse(source: string): ParseResult {
    const parser = new CPPParser();
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
    const normalizer = new CPPNormalizer();
    const result = normalizer.normalize(ast as ReturnType<CPPParser['parse']>['ast'] & object);
    return {
      success: true,
      ir: result.ir,
      diagnostics: result.diagnostics,
    };
  }

  generate(ir: ProgramIR): GenerationResult {
    const generator = new CPPGenerator();
    return generator.generate(ir);
  }
}
