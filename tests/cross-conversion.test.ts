import { describe, it, expect } from 'vitest';
import '../src/languages';
import { convert } from '../src/core/conversion/converter';

describe('Cross-Language Matrix Conversion', () => {
  const cCode = `
#include <stdio.h>

int main() {
    int x = 42;
    printf("Value: %d\\n", x);
    return 0;
}
`;

  it('converts C to C++, Python, and Java', () => {
    const toCpp = convert(cCode, 'c', 'cpp');
    expect(toCpp.status).toBe('success');
    expect(toCpp.generatedCode).toContain('cout <<');

    const toPython = convert(cCode, 'c', 'python');
    expect(toPython.status).toBe('success');
    expect(toPython.generatedCode).toContain('print(');

    const toJava = convert(cCode, 'c', 'java');
    expect(toJava.status).toBe('success');
    expect(toJava.generatedCode).toContain('public class Main');
    expect(toJava.generatedCode).toContain('System.out.println');
  });

  const pythonCode = `
def add(a, b):
    return a + b

def main():
    x = 10
    y = 20
    s = add(x, y)
    print("Sum:", s)
`;

  it('converts Python to C, C++, and Java', () => {
    const toC = convert(pythonCode, 'python', 'c');
    expect(toC.status).toBe('success');
    expect(toC.generatedCode).toContain('int main()');

    const toCpp = convert(pythonCode, 'python', 'cpp');
    expect(toCpp.status).toBe('success');
    expect(toCpp.generatedCode).toContain('cout <<');

    const toJava = convert(pythonCode, 'python', 'java');
    expect(toJava.status).toBe('success');
    expect(toJava.generatedCode).toContain('public static void main');
  });
});
