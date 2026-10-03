/**
 * Language Adapter — Common interface for all language implementations.
 *
 * Each supported language provides an adapter implementing this interface.
 * The adapter encapsulates all language-specific logic behind a uniform API.
 */

import type { ProgramIR } from '../ir/program-ir';
import type {
  ParseResult,
  AnalysisResult,
  NormalizationResult,
  GenerationResult,
} from '../conversion/conversion-result';

export interface LanguageAdapter {
  /** Unique language identifier (e.g., 'c', 'cpp', 'python', 'java') */
  readonly id: string;

  /** Display name (e.g., 'C', 'C++', 'Python', 'Java') */
  readonly name: string;

  /** File extension (e.g., '.c', '.cpp', '.py', '.java') */
  readonly fileExtension: string;

  /** Monaco editor language ID */
  readonly monacoLanguage: string;

  /**
   * Parse source code into a language-specific AST.
   * The AST type is opaque to the rest of the system.
   */
  parse(source: string): ParseResult;

  /**
   * Perform semantic analysis on the parsed AST.
   * Optional — can return success with empty diagnostics if not needed.
   */
  analyze(ast: unknown): AnalysisResult;

  /**
   * Normalize a language-specific AST into the common Program IR.
   * This is where language-specific constructs are mapped to IR nodes.
   */
  toIR(ast: unknown): NormalizationResult;

  /**
   * Generate source code from a Program IR.
   * Produces formatted, readable code in this language.
   */
  generate(ir: ProgramIR): GenerationResult;
}

/**
 * Metadata about a language adapter's capabilities.
 */
export interface LanguageCapabilities {
  /** Whether this language supports classes */
  readonly supportsClasses: boolean;
  /** Whether this language supports pointers */
  readonly supportsPointers: boolean;
  /** Whether this language supports garbage collection */
  readonly hasGC: boolean;
  /** Whether this language requires a main function */
  readonly requiresMain: boolean;
  /** Whether this language is statically typed */
  readonly staticTyping: boolean;
}
