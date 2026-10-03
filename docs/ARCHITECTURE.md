# FlowShift Architecture

## Overview

FlowShift is a browser-based educational programming tool that converts source code into interactive flowcharts and translates code between programming languages. All processing happens client-side.

## Core Architecture

```
SOURCE CODE (C, C++, Python, Java)
        │
        ▼
  LANGUAGE PARSER
        │
        ▼
  LANGUAGE AST (parser-specific)
        │
        ▼
   NORMALIZER (per-language)
        │
        ▼
  COMMON PROGRAM IR (language-neutral)
        │
        ├──────────────────────────┐
        ▼                         ▼
    FLOW IR              TARGET GENERATOR
        │                         │
        ▼                         ▼
  ELK.js LAYOUT          TARGET SOURCE CODE
        │
        ▼
  REACT FLOW RENDER
```

## Key Design Decisions

### 1. Language-Neutral Intermediate Representation (Program IR)

The Program IR is the central abstraction. It represents programs as a tree of typed statements and expressions, independent of any source or target language.

**Why?** Adding a new language requires only:
- A parser + normalizer (source → IR)
- A generator (IR → target code)

No changes to flowchart engine or other language adapters.

### 2. Separate Flow IR

The Flow IR (FlowGraph) is a directed graph representation independent of React Flow. This separation ensures:
- Testability without React
- Portability to other renderers
- Clean layout computation via ELK.js

### 3. Source Location Metadata

Every IR node carries optional source location metadata (`SourceLocation`). This enables bidirectional mapping between source code and flowchart nodes.

### 4. Discriminated Unions

TypeScript discriminated unions (`type` field) are used throughout the IR for type-safe pattern matching.

## Module Structure

### `src/core/ir/` — Program IR
- `program-ir.ts` — Top-level program, function, block definitions
- `statement-ir.ts` — All statement types (if, while, for, etc.)
- `expression-ir.ts` — All expression types (binary, unary, call, etc.)
- `type-ir.ts` — Type system representation

### `src/core/flow/` — Flow IR
- `flow-types.ts` — FlowNode, FlowEdge, FlowGraph
- `flow-generator.ts` — Program IR → Flow IR conversion
- `flow-layout.ts` — ELK.js layout computation

### `src/core/conversion/` — Conversion Pipeline
- `converter.ts` — Orchestrates source → IR → target
- `diagnostics.ts` — Error/warning/info diagnostics
- `conversion-result.ts` — Result types with status codes

### `src/core/registry/` — Language Registry
- `language-registry.ts` — Adapter registration and lookup

### `src/languages/{c,cpp,python,java}/` — Language Adapters
Each implements `LanguageAdapter`:
- `parser.ts` — Source code → AST
- `analyzer.ts` — Semantic analysis
- `normalizer.ts` — AST → Program IR
- `generator.ts` — Program IR → source code
- `diagnostics.ts` — Language-specific diagnostics

### `src/store/` — State Management (Zustand)
- `editor-store.ts` — Editor state, source code, language selection
- `flowchart-store.ts` — Flow graph, layout, selection
- `project-store.ts` — Project persistence, settings

### `src/components/` — React UI
- `editor/` — Monaco Editor wrapper
- `flowchart/` — React Flow wrapper and custom nodes
- `toolbar/` — Top toolbar, actions
- `language/` — Language selectors
- `panels/` — Diagnostics panel, output panel
- `common/` — Shared UI components

## Testing Strategy

- **Unit tests**: Each parser, normalizer, generator tested in isolation
- **Integration tests**: Full pipeline tests (source → IR → flowchart, source → IR → target)
- **Regression tests**: Bug-specific test cases
- **Framework**: Vitest

## State Management

Zustand stores with:
- Middleware for localStorage persistence
- Debounced processing
- Clear separation between editor state, flowchart state, and project state

## Security

- No `eval()` or code execution
- Source code treated as untrusted input (parsed, never executed)
- All processing browser-local
- No remote API calls for code processing
