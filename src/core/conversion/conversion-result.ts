/**
 * Conversion Result — Typed result containers for all pipeline stages.
 */

import type { ProgramIR } from '../ir/program-ir';
import type { FlowProgram } from '../flow/flow-types';
import type { Diagnostic } from './diagnostics';

// ─── Conversion Status ───────────────────────────────────────────

export type ConversionStatus = 'success' | 'partial_success' | 'failed';

// ─── Parse Result ────────────────────────────────────────────────

export interface ParseResult {
  readonly success: boolean;
  readonly ast: unknown; // language-specific AST
  readonly diagnostics: readonly Diagnostic[];
}

// ─── Analysis Result ─────────────────────────────────────────────

export interface AnalysisResult {
  readonly success: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

// ─── Normalization Result ────────────────────────────────────────

export interface NormalizationResult {
  readonly success: boolean;
  readonly ir: ProgramIR | null;
  readonly diagnostics: readonly Diagnostic[];
}

// ─── Generation Result ───────────────────────────────────────────

export interface GenerationResult {
  readonly success: boolean;
  readonly code: string;
  readonly diagnostics: readonly Diagnostic[];
  readonly status: ConversionStatus;
}

// ─── Flow Generation Result ──────────────────────────────────────

export interface FlowGenerationResult {
  readonly success: boolean;
  readonly flowProgram: FlowProgram | null;
  readonly diagnostics: readonly Diagnostic[];
}

// ─── Full Conversion Result ──────────────────────────────────────

export interface ConversionResult {
  readonly status: ConversionStatus;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly generatedCode: string;
  readonly diagnostics: readonly Diagnostic[];
  readonly ir?: ProgramIR;
}

// ─── Status Helpers ──────────────────────────────────────────────

export function determineStatus(
  diagnostics: readonly Diagnostic[]
): ConversionStatus {
  const hasErrors = diagnostics.some((d) => d.severity === 'error');
  const hasWarnings = diagnostics.some((d) => d.severity === 'warning');

  if (hasErrors) return 'failed';
  if (hasWarnings) return 'partial_success';
  return 'success';
}
