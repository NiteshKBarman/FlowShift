import { describe, it, expect } from 'vitest';
import '../src/languages';
import { sourceToIR, convert, sourceToFlowchart } from '../src/core/conversion/converter';

describe('Java Language Pipeline', () => {
  it('parses Java class, methods, Scanner, and System.out.println', () => {
    const code = `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int count = 10;
        for (int i = 0; i < count; i++) {
            System.out.println(i);
        }
    }
}
`;
    const res = sourceToIR(code, 'java');
    expect(res.success).toBe(true);
    expect(res.ir?.functions.length).toBe(1);

    const flow = sourceToFlowchart(code, 'java');
    expect(flow.success).toBe(true);

    const toPython = convert(code, 'java', 'python');
    expect(toPython.status).toBe('success');
    expect(toPython.generatedCode).toContain('for i in range(');
    expect(toPython.generatedCode).toContain('print(i)');
  });
});
