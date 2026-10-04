import { describe, it, expect } from 'vitest';
import '../src/languages'; // initializes language registry
import { sourceToIR, sourceToFlowchart, convert } from '../src/core/conversion/converter';
import { analyzeFunctionRecursion, simulateStaticRecursion } from '../src/core/analysis/recursion-analyzer';

describe('Recursion Support System', () => {
  // ─── 1. Factorial: Direct Recursion in C ─────────────────────────
  it('detects direct recursion in C factorial, extracts base case, and generates flow IR', () => {
    const cCode = `
int factorial(int n) {
    if (n <= 1)
        return 1;
    return n * factorial(n - 1);
}
`;
    const irResult = sourceToIR(cCode, 'c');
    expect(irResult.success).toBe(true);
    expect(irResult.ir).not.toBeNull();

    const fn = irResult.ir!.functions.find(f => f.name === 'factorial');
    expect(fn).toBeDefined();
    expect(fn!.recursion).toBeDefined();
    expect(fn!.recursion!.isRecursive).toBe(true);
    expect(fn!.recursion!.recursiveCallCount).toBe(1);
    expect(fn!.recursion!.recursiveCalls[0].functionName).toBe('factorial');
    expect(fn!.recursion!.recursiveCalls[0].argumentStrings).toEqual(['n - 1']);

    // Base case detection
    expect(fn!.recursion!.baseCases.length).toBeGreaterThanOrEqual(1);
    expect(fn!.recursion!.baseCases[0].conditionText).toContain('n <= 1');
    expect(fn!.recursion!.baseCases[0].confidence).toBe('likely');

    // Recursive case detection
    expect(fn!.recursion!.recursiveCases.length).toBeGreaterThanOrEqual(1);
    expect(fn!.recursion!.recursiveCases[0].conditionText).toContain('n > 1');

    // Flowchart generation
    const flowResult = sourceToFlowchart(cCode, 'c');
    expect(flowResult.success).toBe(true);
    expect(flowResult.flowProgram).not.toBeNull();
    const graph = flowResult.flowProgram!.graphs.find(g => g.name === 'factorial');
    expect(graph).toBeDefined();

    // Must have a dedicated recursive-call node
    const recNode = graph!.nodes.find(n => n.type === 'recursive-call');
    expect(recNode).toBeDefined();
    expect(recNode!.label).toContain('factorial(n - 1)');
  });

  // ─── 2. Fibonacci: Multiple Recursive Calls in C++ ───────────────
  it('detects multiple recursive calls in C++ fibonacci and generates flowchart nodes', () => {
    const cppCode = `
int fibonacci(int n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
`;
    const irResult = sourceToIR(cppCode, 'cpp');
    expect(irResult.success).toBe(true);

    const fn = irResult.ir!.functions.find(f => f.name === 'fibonacci');
    expect(fn).toBeDefined();
    expect(fn!.recursion!.isRecursive).toBe(true);
    expect(fn!.recursion!.recursiveCallCount).toBe(2);
    expect(fn!.recursion!.recursiveCalls.map(c => c.argumentStrings[0])).toEqual(['n - 1', 'n - 2']);

    const flowResult = sourceToFlowchart(cppCode, 'cpp');
    const graph = flowResult.flowProgram!.graphs.find(g => g.name === 'fibonacci');
    expect(graph).toBeDefined();

    const recNodes = graph!.nodes.filter(n => n.type === 'recursive-call');
    expect(recNodes.length).toBe(2);
  });

  // ─── 3. GCD: Euclid's algorithm in Python ────────────────────────
  it('detects recursion and base case in Python GCD', () => {
    const pyCode = `
def gcd(a, b):
    if b == 0:
        return a
    return gcd(b, a % b)
`;
    const irResult = sourceToIR(pyCode, 'python');
    expect(irResult.success).toBe(true);

    const fn = irResult.ir!.functions.find(f => f.name === 'gcd');
    expect(fn).toBeDefined();
    expect(fn!.recursion!.isRecursive).toBe(true);
    expect(fn!.recursion!.baseCases[0].conditionText).toContain('b == 0');
    expect(fn!.recursion!.baseCases[0].returnText).toBe('a');
    expect(fn!.recursion!.recursiveCases[0].conditionText).toContain('b != 0');
  });

  // ─── 4. Sum: Natural Numbers in Java ─────────────────────────────
  it('detects recursion and generates correct Program IR for Java sum', () => {
    const javaCode = `
public class Main {
    public static int sum(int n) {
        if (n <= 0) {
            return 0;
        }
        return n + sum(n - 1);
    }
}
`;
    const irResult = sourceToIR(javaCode, 'java');
    expect(irResult.success).toBe(true);

    const fn = irResult.ir!.functions.find(f => f.name === 'sum');
    expect(fn).toBeDefined();
    expect(fn!.recursion!.isRecursive).toBe(true);
    expect(fn!.recursion!.baseCases[0].conditionText).toContain('n <= 0');
  });

  // ─── 5. Power: Exponentiation ────────────────────────────────────
  it('detects base and recursive cases in power(base, exp)', () => {
    const cCode = `
int power(int base, int exp) {
    if (exp == 0) return 1;
    return base * power(base, exp - 1);
}
`;
    const irResult = sourceToIR(cCode, 'c');
    const fn = irResult.ir!.functions.find(f => f.name === 'power');
    expect(fn!.recursion!.isRecursive).toBe(true);
    expect(fn!.recursion!.baseCases[0].conditionText).toContain('exp == 0');
    expect(fn!.recursion!.recursiveCalls[0].argumentStrings).toEqual(['base', 'exp - 1']);
  });

  // ─── 6. Non-recursive Function ───────────────────────────────────
  it('correctly marks non-recursive functions as isRecursive: false', () => {
    const code = `
int square(int x) {
    return x * x;
}
`;
    const irResult = sourceToIR(code, 'c');
    const fn = irResult.ir!.functions.find(f => f.name === 'square');
    expect(fn).toBeDefined();
    expect(fn!.recursion!.isRecursive).toBe(false);
    expect(fn!.recursion!.recursiveCallCount).toBe(0);
    expect(fn!.recursion!.baseCases.length).toBe(0);
  });

  // ─── 7. Recursion Without Obvious Base Case (Diagnostic Warning) ──
  it('produces diagnostic warning when recursive function has no obvious base case', () => {
    const code = `
int infiniteLoop(int n) {
    return infiniteLoop(n);
}
`;
    const irResult = sourceToIR(code, 'c');
    const fn = irResult.ir!.functions.find(f => f.name === 'infiniteLoop');
    expect(fn!.recursion!.isRecursive).toBe(true);
    expect(fn!.recursion!.baseCases.length).toBe(0);

    const warn = irResult.diagnostics.find(
      d => d.severity === 'warning' && d.message.includes('No obvious base case')
    );
    expect(warn).toBeDefined();
  });

  // ─── 8. Cross-Language Conversion of Recursive Functions ────────
  it('converts C recursive factorial to Python preserving self-reference', () => {
    const cCode = `
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
`;
    const result = convert(cCode, 'c', 'python');
    expect(result.status).toBe('success');
    expect(result.generatedCode).toContain('def factorial(n):');
    expect(result.generatedCode).toContain('factorial(n - 1)');
  });

  it('converts Python recursive factorial to Java preserving self-reference', () => {
    const pyCode = `
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
`;
    const result = convert(pyCode, 'python', 'java');
    expect(result.status).toBe('success');
    expect(result.generatedCode).toContain('factorial(');
    expect(result.generatedCode).toContain('n - 1');
  });

  it('converts Java recursive fibonacci to C++ preserving self-reference', () => {
    const javaCode = `
public class Main {
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}
`;
    const result = convert(javaCode, 'java', 'cpp');
    expect(result.status).toBe('success');
    expect(result.generatedCode).toContain('fibonacci(n - 1)');
    expect(result.generatedCode).toContain('fibonacci(n - 2)');
  });

  it('converts C++ recursive GCD to C preserving self-reference', () => {
    const cppCode = `
int gcd(int a, int b) {
    if (b == 0) return a;
    return gcd(b, a % b);
}
`;
    const result = convert(cppCode, 'cpp', 'c');
    expect(result.status).toBe('success');
    expect(result.generatedCode).toContain('gcd(b, a % b)');
  });

  // ─── 9. Educational Call Stack Simulation ─────────────────────────
  it('statically simulates factorial call stack and return unwinding without eval', () => {
    const cCode = `
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
`;
    const irResult = sourceToIR(cCode, 'c');
    const fn = irResult.ir!.functions.find(f => f.name === 'factorial')!;

    const sim = simulateStaticRecursion(fn, { n: 4 }, 100);
    expect(sim.error).toBeUndefined();
    expect(sim.finalResult).toBe(24);
    expect(sim.maxDepthReached).toBe(4);
    expect(sim.steps.length).toBeGreaterThan(0);

    // Verify base case hit in steps
    const baseHit = sim.steps.find(s => s.action === 'base_case_hit');
    expect(baseHit).toBeDefined();
    expect(baseHit!.frame.argsString).toContain('1');
    expect(baseHit!.frame.result).toBe(1);
  });
});
