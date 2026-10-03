/**
 * Source location metadata for bidirectional mapping between
 * source code and IR/flowchart nodes.
 */
export interface SourceLocation {
  readonly startLine: number;
  readonly endLine: number;
  readonly startColumn: number;
  readonly endColumn: number;
}

/**
 * Creates a source location spanning the given range.
 */
export function createSourceLocation(
  startLine: number,
  endLine: number,
  startColumn: number = 0,
  endColumn: number = 0
): SourceLocation {
  return { startLine, endLine, startColumn, endColumn };
}

/**
 * Merges two source locations into one spanning both.
 */
export function mergeSourceLocations(
  a: SourceLocation,
  b: SourceLocation
): SourceLocation {
  return {
    startLine: Math.min(a.startLine, b.startLine),
    endLine: Math.max(a.endLine, b.endLine),
    startColumn:
      a.startLine < b.startLine
        ? a.startColumn
        : a.startLine > b.startLine
          ? b.startColumn
          : Math.min(a.startColumn, b.startColumn),
    endColumn:
      a.endLine > b.endLine
        ? a.endColumn
        : a.endLine < b.endLine
          ? b.endColumn
          : Math.max(a.endColumn, b.endColumn),
  };
}
