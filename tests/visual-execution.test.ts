import { describe, it, expect } from 'vitest';
import '../src/languages';
import { sourceToFlowchart } from '../src/core/conversion/converter';
import { createVisualExecutionEngine } from '../src/core/execution/visual-engine';

describe('Visual Execution Engine', () => {
  it('should visually execute variable declaration and assignment', () => {
    const code = `
int main() {
    int x = 10;
    int y = 20;
    int sum = x + y;
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    expect(res.success).toBe(true);

    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const snapshots = engine.getAllSnapshots();
    expect(snapshots.length).toBeGreaterThan(3);

    // Look for x = 10, y = 20, sum = 30
    const finalState = snapshots[snapshots.length - 1];
    expect(finalState.variables['x']).toBe(10);
    expect(finalState.variables['y']).toBe(20);
    expect(finalState.variables['sum']).toBe(30);

    // Test stepping forward and backward
    engine.reset();
    expect(engine.getCurrentStepIndex()).toBe(0);

    engine.stepForward();
    expect(engine.getCurrentStepIndex()).toBe(1);

    engine.stepBackward();
    expect(engine.getCurrentStepIndex()).toBe(0);
  });

  it('should evaluate arithmetic expressions correctly', () => {
    const code = `
int main() {
    int a = 15;
    int b = 4;
    int add = a + b;
    int sub = a - b;
    int mul = a * b;
    int div = a / b;
    int mod = a % b;
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const finalState = engine.getAllSnapshots().slice(-1)[0];
    expect(finalState.variables['add']).toBe(19);
    expect(finalState.variables['sub']).toBe(11);
    expect(finalState.variables['mul']).toBe(60);
    expect(finalState.variables['div']).toBe(3); // integer division
    expect(finalState.variables['mod']).toBe(3);
  });

  it('should branch correctly in if/else conditionals', () => {
    const code = `
int main() {
    int score = 85;
    int passed = 0;
    if (score >= 60) {
        passed = 1;
    } else {
        passed = -1;
    }
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const snapshots = engine.getAllSnapshots();
    const condSnapshot = snapshots.find((s) => s.history.some((h) => h.action === 'condition'));
    expect(condSnapshot).toBeDefined();

    const finalState = snapshots[snapshots.length - 1];
    expect(finalState.variables['passed']).toBe(1);
  });

  it('should execute while loops and track iterations and variable updates', () => {
    const code = `
int main() {
    int count = 0;
    int i = 1;
    while (i <= 5) {
        count += i;
        i++;
    }
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const snapshots = engine.getAllSnapshots();
    const finalState = snapshots[snapshots.length - 1];
    expect(finalState.variables['count']).toBe(15);
    expect(finalState.variables['i']).toBe(6);
  });

  it('should execute for loops and track loop updates', () => {
    const code = `
int main() {
    int sum = 0;
    for (int i = 0; i < 4; i++) {
        sum += i;
    }
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const snapshots = engine.getAllSnapshots();
    const finalState = snapshots[snapshots.length - 1];
    expect(finalState.variables['sum']).toBe(6);
  });

  it('should execute function calls and maintain call stack frames', () => {
    const code = `
int add(int a, int b) {
    return a + b;
}

int main() {
    int x = 10;
    int y = 20;
    int res = add(x, y);
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const snapshots = engine.getAllSnapshots();
    // Verify stack frame for add
    const addCallSnapshot = snapshots.find((s) =>
      s.callStack.some((f) => f.functionName === 'add')
    );
    expect(addCallSnapshot).toBeDefined();
    const addFrame = addCallSnapshot!.callStack.find((f) => f.functionName === 'add');
    expect(addFrame?.parameters).toEqual({ a: 10, b: 20 });

    const finalState = snapshots[snapshots.length - 1];
    expect(finalState.variables['res']).toBe(30);
  });

  it('should execute recursive factorial(4) and track stack, base case, and unwinding', () => {
    const code = `
int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int result = factorial(4);
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    expect(res.success).toBe(true);

    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const snapshots = engine.getAllSnapshots();

    // Verify deep stack frames reached: factorial(4), (3), (2), (1)
    const deepStackSnapshot = snapshots.find(
      (s) => s.callStack.filter((f) => f.functionName === 'factorial').length === 4
    );
    expect(deepStackSnapshot).toBeDefined();

    // Verify base case action
    const baseCaseSnapshot = snapshots.find((s) =>
      s.history.some((h) => h.action === 'base-case')
    );
    expect(baseCaseSnapshot).toBeDefined();

    // Verify final result is 24
    const finalState = snapshots[snapshots.length - 1];
    expect(finalState.variables['result']).toBe(24);
  });

  it('should execute recursive Fibonacci(6)', () => {
    const code = `
int fibonacci(int n) {
    if (n <= 0) {
        return 0;
    }
    if (n == 1) {
        return 1;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    int ans = fibonacci(6);
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const finalState = engine.getAllSnapshots().slice(-1)[0];
    expect(finalState.variables['ans']).toBe(8);
  });

  it('should execute recursive GCD(48, 18)', () => {
    const code = `
int gcd(int a, int b) {
    if (b == 0) {
        return a;
    }
    return gcd(b, a % b);
}

int main() {
    int g = gcd(48, 18);
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const finalState = engine.getAllSnapshots().slice(-1)[0];
    expect(finalState.variables['g']).toBe(6);
  });

  it('should pause at simulated input and continue when input is provided', () => {
    const code = `
int main() {
    int x;
    scanf("%d", &x);
    int doubled = x * 2;
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    const initial = engine.start();

    // Should pause waiting for input
    const lastSnapshot = engine.getAllSnapshots().slice(-1)[0];
    expect(lastSnapshot.status).toBe('waiting-for-input');
    expect(lastSnapshot.inputPrompt?.variable).toBe('x');

    // Provide input 25
    engine.provideInput('25');

    const finalSnap = engine.getAllSnapshots().slice(-1)[0];
    expect(finalSnap.status).toBe('completed');
    expect(finalSnap.variables['doubled']).toBe(50);
  });

  it('should accumulate stdout in console output', () => {
    const code = `
#include <stdio.h>

int main() {
    printf("Hello\\n");
    printf("World\\n");
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const finalSnap = engine.getAllSnapshots().slice(-1)[0];
    expect(finalSnap.output.join('')).toContain('Hello\nWorld\n');
  });

  it('should enforce recursion depth limit (100)', () => {
    const code = `
int infiniteRecursion(int n) {
    return infiniteRecursion(n + 1);
}

int main() {
    infiniteRecursion(1);
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const finalSnap = engine.getAllSnapshots().slice(-1)[0];
    expect(finalSnap.status).toBe('error');
    expect(finalSnap.error).toContain('Recursion limit reached');
  });

  it('should enforce loop iteration limit (10000)', () => {
    const code = `
int main() {
    int i = 0;
    while (1) {
        i++;
    }
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const finalSnap = engine.getAllSnapshots().slice(-1)[0];
    expect(finalSnap.status).toBe('error');
    expect(finalSnap.error).toContain('Loop iteration limit reached');
  });

  it('should execute Python code via Program IR', () => {
    const code = `
def multiply(x, y):
    return x * y

a = 6
b = 7
product = multiply(a, b)
print("Product:", product)
`;
    const res = sourceToFlowchart(code, 'python');
    expect(res.success).toBe(true);

    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const finalSnap = engine.getAllSnapshots().slice(-1)[0];
    expect(finalSnap.variables['product']).toBe(42);
    expect(finalSnap.output.join('')).toContain('Product: 42');
  });

  it('should execute C++ code via Program IR', () => {
    const code = `
#include <iostream>
using namespace std;

int main() {
    int sum = 0;
    int i = 1;
    while (i <= 4) {
        sum += i;
        i++;
    }
    cout << "Sum: " << sum << endl;
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'cpp');
    expect(res.success).toBe(true);

    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const finalSnap = engine.getAllSnapshots().slice(-1)[0];
    expect(finalSnap.variables['sum']).toBe(10);
    expect(finalSnap.output.join('')).toContain('Sum: 10');
  });

  it('should execute Java code via Program IR', () => {
    const code = `
public class Main {
    public static int square(int n) {
        return n * n;
    }

    public static void main(String[] args) {
        int x = 9;
        int sq = square(x);
        System.out.println("Square: " + sq);
    }
}
`;
    const res = sourceToFlowchart(code, 'java');
    expect(res.success).toBe(true);

    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const finalSnap = engine.getAllSnapshots().slice(-1)[0];
    expect(finalSnap.variables['sq']).toBe(81);
    expect(finalSnap.output.join('')).toContain('Square: 81');
  });

  it('should step backward and restore previous variables and state correctly', () => {
    const code = `
int main() {
    int x = 1;
    int y = 2;
    int z = 3;
    return 0;
}
`;
    const res = sourceToFlowchart(code, 'c');
    const engine = createVisualExecutionEngine(res.ir!, res.flowProgram);
    engine.start();

    const total = engine.getTotalSteps();
    engine.goToStep(total - 1);
    expect(engine.getState().variables['z']).toBe(3);

    // Step back to before z was declared
    engine.stepBackward();
    engine.stepBackward();
    const earlierState = engine.getState();
    expect(earlierState.stepIndex).toBe(total - 3);
  });
});

