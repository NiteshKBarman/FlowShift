import { describe, it, expect } from 'vitest';
import '../src/languages';
import { sourceToIR, convert, sourceToFlowchart } from '../src/core/conversion/converter';

describe('Python Language Pipeline', () => {
  it('parses Python scripts with functions and generates flowcharts', () => {
    const code = `
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def main():
    num = 5
    result = factorial(num)
    print("Factorial:", result)
`;
    const res = sourceToIR(code, 'python');
    expect(res.success).toBe(true);
    expect(res.ir?.functions.length).toBe(2);

    const flowRes = sourceToFlowchart(code, 'python');
    expect(flowRes.success).toBe(true);
    expect(flowRes.flowProgram?.graphs.length).toBe(2);

    // Convert Python to C
    const toC = convert(code, 'python', 'c');
    expect(toC.status).toBe('success');
    expect(toC.generatedCode).toContain('factorial(');
    expect(toC.generatedCode).toContain('int main()');
  });

  it('converts Python for-in range loop into C/C++ style loops', () => {
    const code = `
total = 0
for i in range(10):
    total += i
print(total)
`;
    const toCpp = convert(code, 'python', 'cpp');
    expect(toCpp.status).toBe('success');
    expect(toCpp.generatedCode).toContain('for (int i = 0; i < 10; i++)');
    expect(toCpp.generatedCode).toContain('cout <<');
  });
});
