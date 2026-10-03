import { describe, it, expect } from 'vitest';
import '../src/languages';
import { sourceToIR, convert, sourceToFlowchart } from '../src/core/conversion/converter';

describe('C++ Language Pipeline', () => {
  it('parses C++ cout, cin, and control structures', () => {
    const code = `
#include <iostream>
using namespace std;

int main() {
    int a;
    cin >> a;
    if (a % 2 == 0) {
        cout << "Even" << endl;
    } else {
        cout << "Odd" << endl;
    }
    return 0;
}
`;
    const res = sourceToIR(code, 'cpp');
    expect(res.success).toBe(true);

    const flow = sourceToFlowchart(code, 'cpp');
    expect(flow.success).toBe(true);

    // Convert C++ to Python
    const toPy = convert(code, 'cpp', 'python');
    expect(toPy.status).toBe('success');
    expect(toPy.generatedCode).toContain('print("Even")');
    expect(toPy.generatedCode).toContain('input(');
  });
});
