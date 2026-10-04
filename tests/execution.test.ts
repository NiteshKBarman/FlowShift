import { describe, it, expect } from 'vitest';
import '../src/languages';
import { sourceToFlowchart } from '../src/core/conversion/converter';
import { executeProgramIR } from '../src/core/execution/interpreter';

describe('Program IR Interpreter and Terminal Execution', () => {
  it('should execute C recursive factorial program and produce correct stdout', async () => {
    const code = `
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int n = 5;
    int res = factorial(n);
    printf("Factorial of %d is %d\\n", n, res);
    return 0;
}
`;
    const flowRes = sourceToFlowchart(code, 'c');
    expect(flowRes.success).toBe(true);
    expect(flowRes.ir).toBeDefined();

    const execRes = await executeProgramIR(flowRes.ir!);
    expect(execRes.exitCode).toBe(0);
    expect(execRes.stdout).toContain('Factorial of 5 is 120');
  });

  it('should execute Python even/odd conditionals with stdin', async () => {
    const code = `
n = int(input("Enter an integer: "))
if n % 2 == 0:
    print(n, "is even")
else:
    print(n, "is odd")
`;
    const flowRes = sourceToFlowchart(code, 'python');
    expect(flowRes.success).toBe(true);
    expect(flowRes.ir).toBeDefined();

    const execRes = await executeProgramIR(flowRes.ir!, '8');
    expect(execRes.exitCode).toBe(0);
    expect(execRes.stdout).toContain('8 is even');
  });

  it('should execute interactive input via onInput callback', async () => {
    const code = `
#include <stdio.h>

int main() {
    int x;
    printf("Number: ");
    scanf("%d", &x);
    printf("Result is %d\\n", x * 2);
    return 0;
}
`;
    const flowRes = sourceToFlowchart(code, 'c');
    expect(flowRes.success).toBe(true);
    expect(flowRes.ir).toBeDefined();

    let capturedPrompt = '';
    const execRes = await executeProgramIR(flowRes.ir!, {
      onInput: async (prompt) => {
        capturedPrompt = prompt;
        return '21';
      },
    });

    expect(execRes.exitCode).toBe(0);
    expect(execRes.stdout).toContain('Number: ');
    expect(execRes.stdout).toContain('Result is 42');
  });

  it('should execute C++ while loop and sum numbers', async () => {
    const code = `
#include <iostream>
using namespace std;

int main() {
    int sum = 0;
    int i = 1;
    while (i <= 5) {
        sum = sum + i;
        i = i + 1;
    }
    cout << "Total: " << sum << endl;
    return 0;
}
`;
    const flowRes = sourceToFlowchart(code, 'cpp');
    expect(flowRes.success).toBe(true);
    expect(flowRes.ir).toBeDefined();

    const execRes = await executeProgramIR(flowRes.ir!);
    expect(execRes.exitCode).toBe(0);
    expect(execRes.stdout).toContain('Total: 15');
  });
});
