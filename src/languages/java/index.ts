/**
 * Java Language Adapter — Implements the LanguageAdapter interface for Java.
 */

import type { LanguageAdapter } from '../../core/registry/language-adapter';
import type { ProgramIR } from '../../core/ir/program-ir';
import type {
  ParseResult,
  AnalysisResult,
  NormalizationResult,
  GenerationResult,
} from '../../core/conversion/conversion-result';
import { JavaParser } from './parser';
import { JavaNormalizer } from './normalizer';
import { JavaGenerator } from './generator';

export class JavaLanguageAdapter implements LanguageAdapter {
  readonly id = 'java';
  readonly name = 'Java';
  readonly fileExtension = '.java';
  readonly monacoLanguage = 'java';

  parse(source: string): ParseResult {
    const parser = new JavaParser();
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
    const normalizer = new JavaNormalizer();
    const result = normalizer.normalize(ast as ReturnType<JavaParser['parse']>['ast'] & object);
    return {
      success: true,
      ir: result.ir,
      diagnostics: result.diagnostics,
    };
  }

  generate(ir: ProgramIR): GenerationResult {
    const generator = new JavaGenerator();
    return generator.generate(ir);
  }
}
