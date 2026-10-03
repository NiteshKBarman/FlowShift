import { describe, it, expect } from 'vitest';
import '../src/languages'; // initializes language registry
import { sourceToIR, irToCode, convert, sourceToFlowchart } from '../src/core/conversion/converter';

describe('C Language Pipeline', () => {
  it('parses, normalizes and generates a standard C program', () => {
    const code = `
#include <stdio.h>

int main() {
    int x = 10;
    int y = 20;
    if (x < y) {
        printf("x is smaller\\n");
    } else {
        printf("y is smaller\\n");
    }
    return 0;
}
`;
    const res = sourceToIR(code, 'c');
    expect(res.success).toBe(true);
    expect(res.ir).toBeDefined();
    expect(res.ir?.functions.length).toBe(1);
    expect(res.ir?.functions[0].name).toBe('main');

    // Flowchart generation
    const flowRes = sourceToFlowchart(code, 'c');
    expect(flowRes.success).toBe(true);
    expect(flowRes.flowProgram?.graphs.length).toBe(1);
    const mainGraph = flowRes.flowProgram?.graphs[0];
    expect(mainGraph?.nodes.length).toBeGreaterThan(3);

    // Re-generation
    const genRes = irToCode(res.ir!, 'c');
    expect(genRes.status).toBe('success');
    expect(genRes.generatedCode).toContain('int main()');
    expect(genRes.generatedCode).toContain('if (');
  });

  it('handles while loops, scanf, and nested control flow', () => {
    const code = `
#include <stdio.h>

int main() {
    int n;
    scanf("%d", &n);
    int sum = 0;
    int i = 1;
    while (i <= n) {
        sum += i;
        i++;
    }
    printf("Sum: %d\\n", sum);
    return 0;
}
`;
    const res = convert(code, 'c', 'python');
    expect(res.status).toBe('success');
    expect(res.generatedCode).toContain('while');
    expect(res.generatedCode).toContain('print(');
  });
});
