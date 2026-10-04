/**
 * Program IR — Top-level language-neutral program representation.
 *
 * A Program contains functions, global declarations, and metadata.
 * This is the central abstraction that all language adapters produce
 * and all generators/flow-generators consume.
 */

import type { SourceLocation } from './source-location';
import type { IRType } from './type-ir';
import type { IRStatement, BlockStatement } from './statement-ir';
import type { IRExpression } from './expression-ir';

// ─── Recursion Metadata ──────────────────────────────────────────

export interface RecursiveCall {
  /** The function being called recursively */
  readonly functionName: string;
  /** String representation of each argument */
  readonly argumentStrings: readonly string[];
  /** The actual argument IR expressions */
  readonly arguments: readonly IRExpression[];
  /** Source location of the call site */
  readonly sourceLocation?: SourceLocation;
}

export interface BaseCase {
  /** Human-readable description of the base case condition */
  readonly conditionText: string;
  /** The return value expression string, if any */
  readonly returnText?: string;
  /** Source location of the if-statement that contains the base case */
  readonly sourceLocation?: SourceLocation;
  /** Heuristic confidence — always 'likely', never 'certain' */
  readonly confidence: 'likely';
}

export interface RecursiveCase {
  /** Human-readable description of the recursive case condition */
  readonly conditionText: string;
  /** The recursive calls within this case */
  readonly recursiveCalls: readonly RecursiveCall[];
  /** Source location */
  readonly sourceLocation?: SourceLocation;
}

export interface RecursionMetadata {
  /** Whether this function is directly recursive */
  readonly isRecursive: boolean;
  /** All recursive call sites found */
  readonly recursiveCalls: readonly RecursiveCall[];
  /** Likely base cases (heuristic, not proven) */
  readonly baseCases: readonly BaseCase[];
  /** Likely recursive cases */
  readonly recursiveCases: readonly RecursiveCase[];
  /** Count of distinct recursive call sites */
  readonly recursiveCallCount: number;
}

// ─── Function Parameter ──────────────────────────────────────────

export interface IRParameter {
  readonly name: string;
  readonly type: IRType;
  readonly defaultValue?: IRExpression;
  readonly sourceLocation?: SourceLocation;
}

// ─── Function Definition ─────────────────────────────────────────

export interface IRFunction {
  readonly name: string;
  readonly parameters: readonly IRParameter[];
  readonly returnType: IRType;
  readonly body: BlockStatement;
  readonly isMain?: boolean;
  readonly sourceLocation?: SourceLocation;
  /** Populated by the recursion analyzer after IR construction */
  readonly recursion?: RecursionMetadata;
}

// ─── Include/Import ──────────────────────────────────────────────

export interface IRImport {
  readonly module: string;
  readonly items?: readonly string[];
  readonly sourceLocation?: SourceLocation;
}

// ─── Program ─────────────────────────────────────────────────────

export interface ProgramIR {
  readonly functions: readonly IRFunction[];
  readonly globalStatements: readonly IRStatement[];
  readonly imports: readonly IRImport[];
  readonly sourceLanguage: string;
  readonly metadata?: ProgramMetadata;
}

// ─── Program Metadata ────────────────────────────────────────────

export interface ProgramMetadata {
  readonly sourceFile?: string;
  readonly sourceLanguageVersion?: string;
  readonly parseTimestamp?: number;
  readonly comments?: readonly string[];
}

// ─── Program Constructors ────────────────────────────────────────

export function createProgram(
  functions: readonly IRFunction[],
  sourceLanguage: string,
  options?: {
    globalStatements?: readonly IRStatement[];
    imports?: readonly IRImport[];
    metadata?: ProgramMetadata;
  }
): ProgramIR {
  return {
    functions,
    globalStatements: options?.globalStatements ?? [],
    imports: options?.imports ?? [],
    sourceLanguage,
    metadata: options?.metadata,
  };
}

export function createFunction(
  name: string,
  parameters: readonly IRParameter[],
  returnType: IRType,
  body: BlockStatement,
  options?: {
    isMain?: boolean;
    sourceLocation?: SourceLocation;
    recursion?: RecursionMetadata;
  }
): IRFunction {
  return {
    name,
    parameters,
    returnType,
    body,
    isMain: options?.isMain,
    sourceLocation: options?.sourceLocation,
    recursion: options?.recursion,
  };
}

export function createParameter(
  name: string,
  type: IRType,
  defaultValue?: IRExpression,
  sourceLocation?: SourceLocation
): IRParameter {
  return { name, type, defaultValue, sourceLocation };
}

export function createImport(
  module: string,
  items?: readonly string[],
  sourceLocation?: SourceLocation
): IRImport {
  return { module, items, sourceLocation };
}

// ─── Program Utilities ───────────────────────────────────────────

/**
 * Finds the main/entry function in a program.
 */
export function findMainFunction(program: ProgramIR): IRFunction | undefined {
  return program.functions.find(
    (fn) => fn.isMain || fn.name === 'main'
  );
}

/**
 * Gets all function names defined in a program.
 */
export function getFunctionNames(program: ProgramIR): string[] {
  return program.functions.map((fn) => fn.name);
}

/**
 * Finds a function by name.
 */
export function findFunction(
  program: ProgramIR,
  name: string
): IRFunction | undefined {
  return program.functions.find((fn) => fn.name === name);
}

/**
 * Counts the total number of statements in a program (recursive).
 */
export function countStatements(program: ProgramIR): number {
  let count = program.globalStatements.length;
  for (const fn of program.functions) {
    count += countBlockStatements(fn.body);
  }
  return count;
}

function countBlockStatements(block: BlockStatement): number {
  let count = block.statements.length;
  for (const stmt of block.statements) {
    if (stmt.kind === 'block') {
      count += countBlockStatements(stmt);
    } else if (stmt.kind === 'if') {
      count += countBlockStatements(stmt.thenBlock);
      if (stmt.elseBlock) {
        if (stmt.elseBlock.kind === 'block') {
          count += countBlockStatements(stmt.elseBlock);
        }
      }
    } else if (stmt.kind === 'while' || stmt.kind === 'do-while') {
      count += countBlockStatements(stmt.body);
    } else if (stmt.kind === 'for') {
      count += countBlockStatements(stmt.body);
    } else if (stmt.kind === 'switch') {
      for (const c of stmt.cases) {
        count += c.body.length;
      }
    }
  }
  return count;
}
