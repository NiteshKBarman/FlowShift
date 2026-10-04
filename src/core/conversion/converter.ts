/**
 * Converter — Orchestrates the full conversion pipeline.
 *
 * Source Code → Parser → AST → Normalizer → Program IR → Generator → Target Code
 *                                              ↓
 *                                         Flow Generator → FlowGraph
 */

import type { ProgramIR } from '../ir/program-ir';
import { generateFlowProgram } from '../flow/flow-generator';
import { languageRegistry } from '../registry/language-registry';
import { createDiagnostics, type DiagnosticsCollection } from './diagnostics';
import { analyzeProgramRecursion } from '../analysis/recursion-analyzer';
import type {
  ConversionResult,
  NormalizationResult,
  FlowGenerationResult,
  ConversionStatus,
} from './conversion-result';

// ─── Source to IR ────────────────────────────────────────────────

/**
 * Parses source code and normalizes it to Program IR.
 */
export function sourceToIR(
  source: string,
  languageId: string
): NormalizationResult {
  const diagnostics = createDiagnostics();

  const adapter = languageRegistry.getLanguage(languageId);
  if (!adapter) {
    diagnostics.error('internal', `Unsupported source language: ${languageId}`);
    return { success: false, ir: null, diagnostics: diagnostics.all };
  }

  // Step 1: Parse
  const parseResult = adapter.parse(source);
  if (!parseResult.success) {
    return {
      success: false,
      ir: null,
      diagnostics: parseResult.diagnostics,
    };
  }

  // Step 2: Analyze (optional)
  const analysisResult = adapter.analyze(parseResult.ast);
  if (!analysisResult.success) {
    diagnostics.merge(
      Object.assign(createDiagnostics(), {
        all: analysisResult.diagnostics,
      }) as unknown as DiagnosticsCollection
    );
    // Continue even with analysis warnings
  }

  // Step 3: Normalize to IR
  const normResult = adapter.toIR(parseResult.ast);

  // Step 4: Recursion Analysis (enrich Program IR with recursion metadata)
  let enrichedIR = normResult.ir;
  const recursionDiagnostics = [];
  if (enrichedIR) {
    const analysis = analyzeProgramRecursion(enrichedIR);
    enrichedIR = analysis.program;
    recursionDiagnostics.push(...analysis.diagnostics);
  }

  // Merge all diagnostics
  const allDiagnostics = [
    ...parseResult.diagnostics,
    ...analysisResult.diagnostics,
    ...normResult.diagnostics,
    ...recursionDiagnostics,
  ];

  return {
    success: normResult.success,
    ir: enrichedIR,
    diagnostics: allDiagnostics,
  };
}

// ─── IR to Target Code ──────────────────────────────────────────

/**
 * Generates target code from Program IR.
 */
export function irToCode(
  ir: ProgramIR,
  targetLanguageId: string
): ConversionResult {
  const diagnostics = createDiagnostics();

  const adapter = languageRegistry.getLanguage(targetLanguageId);
  if (!adapter) {
    diagnostics.error('internal', `Unsupported target language: ${targetLanguageId}`);
    return {
      status: 'failed',
      sourceLanguage: ir.sourceLanguage,
      targetLanguage: targetLanguageId,
      generatedCode: '',
      diagnostics: diagnostics.all,
      ir,
    };
  }

  const result = adapter.generate(ir);

  return {
    status: result.status,
    sourceLanguage: ir.sourceLanguage,
    targetLanguage: targetLanguageId,
    generatedCode: result.code,
    diagnostics: result.diagnostics,
    ir,
  };
}

// ─── Full Conversion ────────────────────────────────────────────

/**
 * Performs a full source-to-target conversion.
 *
 * Source Code → Parser → AST → Normalizer → IR → Generator → Target Code
 */
export function convert(
  source: string,
  sourceLanguageId: string,
  targetLanguageId: string
): ConversionResult {
  // Source → IR
  const normResult = sourceToIR(source, sourceLanguageId);

  if (!normResult.success || !normResult.ir) {
    return {
      status: 'failed',
      sourceLanguage: sourceLanguageId,
      targetLanguage: targetLanguageId,
      generatedCode: '',
      diagnostics: normResult.diagnostics,
    };
  }

  // IR → Target Code
  const convResult = irToCode(normResult.ir, targetLanguageId);

  // Merge diagnostics
  const allDiagnostics = [
    ...normResult.diagnostics,
    ...convResult.diagnostics,
  ];

  const status: ConversionStatus = allDiagnostics.some(
    (d) => d.severity === 'error'
  )
    ? 'failed'
    : allDiagnostics.some((d) => d.severity === 'warning')
      ? 'partial_success'
      : 'success';

  return {
    status,
    sourceLanguage: sourceLanguageId,
    targetLanguage: targetLanguageId,
    generatedCode: convResult.generatedCode,
    diagnostics: allDiagnostics,
    ir: normResult.ir,
  };
}

// ─── Source to Flowchart ─────────────────────────────────────────

/**
 * Generates a flowchart from source code.
 *
 * Source Code → Parser → AST → Normalizer → IR → Flow Generator → FlowProgram
 */
export function sourceToFlowchart(
  source: string,
  languageId: string
): FlowGenerationResult {
  const normResult = sourceToIR(source, languageId);

  if (!normResult.success || !normResult.ir) {
    return {
      success: false,
      flowProgram: null,
      diagnostics: normResult.diagnostics,
    };
  }

  const flowRes = irToFlowchart(normResult.ir);
  return {
    ...flowRes,
    ir: normResult.ir,
    diagnostics: [...normResult.diagnostics, ...flowRes.diagnostics],
  };
}

/**
 * Generates a flowchart from Program IR.
 */
export function irToFlowchart(ir: ProgramIR): FlowGenerationResult {
  try {
    const flowProgram = generateFlowProgram(ir);
    return {
      success: true,
      flowProgram,
      ir,
      diagnostics: [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error during flow generation';
    return {
      success: false,
      flowProgram: null,
      diagnostics: [
        {
          severity: 'error',
          category: 'internal',
          message: `Flow generation failed: ${message}`,
        },
      ],
    };
  }
}
