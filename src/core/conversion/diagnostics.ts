/**
 * Diagnostics — User-friendly error, warning, and info reporting.
 */

import type { SourceLocation } from '../ir/source-location';

// ─── Severity ────────────────────────────────────────────────────

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

// ─── Category ────────────────────────────────────────────────────

export type DiagnosticCategory =
  | 'parse'
  | 'analysis'
  | 'conversion'
  | 'generation'
  | 'unsupported'
  | 'internal';

// ─── Diagnostic ──────────────────────────────────────────────────

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly category: DiagnosticCategory;
  readonly message: string;
  readonly sourceLocation?: SourceLocation;
  readonly code?: string;
  readonly suggestion?: string;
}

// ─── Diagnostics Collection ──────────────────────────────────────

export class DiagnosticsCollection {
  private readonly items: Diagnostic[] = [];

  error(
    category: DiagnosticCategory,
    message: string,
    options?: { sourceLocation?: SourceLocation; code?: string; suggestion?: string }
  ): void {
    this.items.push({
      severity: 'error',
      category,
      message,
      ...options,
    });
  }

  warning(
    category: DiagnosticCategory,
    message: string,
    options?: { sourceLocation?: SourceLocation; code?: string; suggestion?: string }
  ): void {
    this.items.push({
      severity: 'warning',
      category,
      message,
      ...options,
    });
  }

  info(
    category: DiagnosticCategory,
    message: string,
    options?: { sourceLocation?: SourceLocation; code?: string; suggestion?: string }
  ): void {
    this.items.push({
      severity: 'info',
      category,
      message,
      ...options,
    });
  }

  hint(
    category: DiagnosticCategory,
    message: string,
    options?: { sourceLocation?: SourceLocation; code?: string; suggestion?: string }
  ): void {
    this.items.push({
      severity: 'hint',
      category,
      message,
      ...options,
    });
  }

  get all(): readonly Diagnostic[] {
    return this.items;
  }

  get errors(): readonly Diagnostic[] {
    return this.items.filter((d) => d.severity === 'error');
  }

  get warnings(): readonly Diagnostic[] {
    return this.items.filter((d) => d.severity === 'warning');
  }

  get hasErrors(): boolean {
    return this.items.some((d) => d.severity === 'error');
  }

  get hasWarnings(): boolean {
    return this.items.some((d) => d.severity === 'warning');
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  merge(other: DiagnosticsCollection): void {
    this.items.push(...other.items);
  }

  clear(): void {
    this.items.length = 0;
  }

  /**
   * Formats diagnostics for display.
   */
  format(): string {
    return this.items
      .map((d) => {
        const severity = d.severity.toUpperCase();
        const location = d.sourceLocation
          ? ` (line ${d.sourceLocation.startLine})`
          : '';
        const suggestion = d.suggestion
          ? `\n  Suggestion: ${d.suggestion}`
          : '';
        return `[${severity}]${location}: ${d.message}${suggestion}`;
      })
      .join('\n');
  }
}

// ─── Convenience Constructors ────────────────────────────────────

export function createDiagnostics(): DiagnosticsCollection {
  return new DiagnosticsCollection();
}
