/**
 * C Language Adapter — Implements the LanguageAdapter interface for C.
 */

import type { LanguageAdapter } from '../../core/registry/language-adapter';
import type { ProgramIR } from '../../core/ir/program-ir';
import type {
  ParseResult,
  AnalysisResult,
  NormalizationResult,
  GenerationResult,
} from '../../core/conversion/conversion-result';
import { CParser } from './parser';
import { CNormalizer } from './normalizer';
import { CGenerator } from './generator';

export class CLanguageAdapter implements LanguageAdapter {
  readonly id = 'c';
  readonly name = 'C';
  readonly fileExtension = '.c';
  readonly monacoLanguage = 'c';

  parse(source: string): ParseResult {
    const parser = new CParser();
    const result = parser.parse(source);
    return {
      success: result.ast !== null,
      ast: result.ast,
      diagnostics: result.diagnostics,
    };
  }

  analyze(_ast: unknown): AnalysisResult {
    // Basic analysis — currently a pass-through
    return { success: true, diagnostics: [] };
  }

  toIR(ast: unknown): NormalizationResult {
    const normalizer = new CNormalizer();
    const result = normalizer.normalize(ast as ReturnType<CParser['parse']>['ast'] & object);
    return {
      success: true,
      ir: result.ir,
      diagnostics: result.diagnostics,
    };
  }

  generate(ir: ProgramIR): GenerationResult {
    const generator = new CGenerator();
    return generator.generate(ir);
  }
}
