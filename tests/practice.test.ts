import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateQuestion,
  generatePredictOutputQuestion,
  generatePredictVariableQuestion,
  generateNextStepQuestion,
  generateFlowchartPathQuestion,
  generateFindErrorQuestion,
  generateRecursionQuestion,
  generateTimeComplexityQuestion,
  generateMCQQuestion,
} from '../src/core/quiz/question-generator';
import {
  getInitialProgress,
  loadUserProgress,
  saveUserProgress,
  resetUserProgress,
  recordQuestionResult,
  createInitialSessionState,
  recordSessionAnswer,
} from '../src/core/quiz/progress-storage';
import '../src/languages';
import { sourceToFlowchart } from '../src/core/conversion/converter';
import { createVisualExecutionEngine } from '../src/core/execution/visual-engine';

if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe('Practice / Quiz Mode Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Question Generation by Type', () => {
    it('generates a valid Predict Output question', () => {
      const q = generatePredictOutputQuestion('c', 'easy');
      expect(q.questionType).toBe('predict-output');
      expect(q.prompt).toContain('output');
      expect(q.codeSnippet).toBeDefined();
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options).toContain(q.correctAnswer);
      expect(q.explanation.length).toBeGreaterThan(0);
    });

    it('generates a valid Predict Variable question', () => {
      const q = generatePredictVariableQuestion('python', 'easy');
      expect(q.questionType).toBe('predict-variable');
      expect(q.prompt).toMatch(/final value.*x/i);
      expect(q.options).toContain(q.correctAnswer);
      expect(q.explanation).toBeDefined();
    });

    it('generates a valid Next Execution Step question', () => {
      const q = generateNextStepQuestion('c');
      expect(q.questionType).toBe('next-step');
      expect(q.prompt).toMatch(/next/i);
      expect(q.options).toContain(q.correctAnswer);
      expect(q.stepDetails).toBeDefined();
      expect(q.stepDetails!.length).toBeGreaterThan(0);
    });

    it('generates a valid Flowchart Path question with flowGraph', () => {
      const q = generateFlowchartPathQuestion('c');
      expect(q.questionType).toBe('flowchart-path');
      expect(q.prompt).toMatch(/branch|execute/i);
      expect(q.flowGraph).toBeDefined();
      expect(q.flowGraph!.nodes.length).toBeGreaterThan(0);
      expect(q.options).toContain(q.correctAnswer);
    });

    it('generates a valid Find the Error question', () => {
      const q = generateFindErrorQuestion('c');
      expect(q.questionType).toBe('find-error');
      expect(q.prompt).toMatch(/bug|error|problem/i);
      expect(q.options).toContain(q.correctAnswer);
      expect(q.errorLine).toBeDefined();
    });

    it('generates a valid Recursion question', () => {
      const q = generateRecursionQuestion('c');
      expect(q.questionType).toBe('recursion');
      expect(q.codeSnippet).toBeDefined();
      expect(q.options).toContain(q.correctAnswer);
      expect(q.explanation.length).toBeGreaterThan(5);
    });

    it('generates a valid Time Complexity question', () => {
      const q = generateTimeComplexityQuestion();
      expect(q.questionType).toBe('time-complexity');
      expect(q.prompt).toMatch(/time complexity/i);
      expect(q.correctAnswer).toMatch(/^O\(/);
      expect(q.options).toContain(q.correctAnswer);
    });

    it('generates a valid MCQ conceptual question', () => {
      const q = generateMCQQuestion('recursion');
      expect(q.questionType).toBe('mcq');
      expect(q.prompt.length).toBeGreaterThan(5);
      expect(q.options.length).toBe(4);
      expect(q.options).toContain(q.correctAnswer);
    });
  });

  describe('2. Required Algorithm & Code Pattern Verification', () => {
    it('verifies factorial execution and result calculation', () => {
      const code = `
int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}
int main() {
    int ans = factorial(4);
    printf("%d", ans);
    return 0;
}
`;
      const res = sourceToFlowchart(code, 'c');
      expect(res.ir).toBeDefined();
      const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
      engine.start();
      const snapshots = engine.getAllSnapshots();
      const finalState = snapshots[snapshots.length - 1];
      expect(finalState.output.join('').trim()).toBe('24');
    });

    it('verifies fibonacci execution and result calculation', () => {
      const code = `
int fib(int n) {
    if (n <= 1) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);
}
int main() {
    int val = fib(5);
    printf("%d", val);
    return 0;
}
`;
      const res = sourceToFlowchart(code, 'c');
      expect(res.ir).toBeDefined();
      const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
      engine.start();
      const snapshots = engine.getAllSnapshots();
      const finalState = snapshots[snapshots.length - 1];
      expect(finalState.output.join('').trim()).toBe('5');
    });

    it('verifies GCD Euclidean loop execution and output', () => {
      const code = `
int main() {
    int a = 18;
    int b = 12;
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    printf("%d", a);
    return 0;
}
`;
      const res = sourceToFlowchart(code, 'c');
      const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
      engine.start();
      const snapshots = engine.getAllSnapshots();
      const finalState = snapshots[snapshots.length - 1];
      expect(finalState.output.join('').trim()).toBe('6');
    });

    it('verifies loop sum execution', () => {
      const code = `
x = 0
for i in range(1, 5):
    x = x + i
print(x)
`;
      const res = sourceToFlowchart(code, 'python');
      const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
      engine.start();
      const snapshots = engine.getAllSnapshots();
      const finalState = snapshots[snapshots.length - 1];
      expect(finalState.output.join('').trim()).toBe('10');
    });

    it('verifies nested loop execution', () => {
      const code = `
int main() {
    int count = 0;
    int i = 0;
    while (i < 3) {
        int j = 0;
        while (j < 2) {
            count = count + 1;
            j++;
        }
        i++;
    }
    printf("%d", count);
    return 0;
}
`;
      const res = sourceToFlowchart(code, 'c');
      const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
      engine.start();
      const snapshots = engine.getAllSnapshots();
      const finalState = snapshots[snapshots.length - 1];
      expect(finalState.output.join('').trim()).toBe('6');
    });

    it('verifies if/else conditional branch execution', () => {
      const code = `
#include <iostream>
using namespace std;
int main() {
    int score = 85;
    if (score >= 90) {
        cout << "A";
    } else if (score >= 80) {
        cout << "B";
    } else {
        cout << "C";
    }
    return 0;
}
`;
      const res = sourceToFlowchart(code, 'cpp');
      const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
      engine.start();
      const snapshots = engine.getAllSnapshots();
      const finalState = snapshots[snapshots.length - 1];
      expect(finalState.output.join('').trim()).toBe('B');
    });

    it('verifies function return execution', () => {
      const code = `
int square(int n) {
    return n * n;
}
int main() {
    int res = square(7);
    printf("%d", res);
    return 0;
}
`;
      const res = sourceToFlowchart(code, 'c');
      const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
      engine.start();
      const snapshots = engine.getAllSnapshots();
      const finalState = snapshots[snapshots.length - 1];
      expect(finalState.output.join('').trim()).toBe('49');
    });

    it('verifies array sum execution', () => {
      const code = `
int main() {
    int nums[4];
    nums[0] = 2;
    nums[1] = 4;
    nums[2] = 6;
    nums[3] = 8;
    int total = 0;
    int i = 0;
    while (i < 4) {
        total = total + nums[i];
        i++;
    }
    printf("%d", total);
    return 0;
}
`;
      const res = sourceToFlowchart(code, 'c');
      const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
      engine.start();
      const snapshots = engine.getAllSnapshots();
      const finalState = snapshots[snapshots.length - 1];
      expect(finalState.output.join('').trim()).toBe('20');
    });
  });

  describe('3. Multi-language Support (C, C++, Python, Java)', () => {
    it('generates and evaluates questions in C', () => {
      const q = generateQuestion({ topic: 'variables', difficulty: 'easy', language: 'c', questionType: 'predict-output' });
      expect(q.language).toBe('c');
      expect(q.codeSnippet).toContain('printf');
    });

    it('generates and evaluates questions in C++', () => {
      const q = generateQuestion({ topic: 'variables', difficulty: 'easy', language: 'cpp', questionType: 'predict-output' });
      expect(q.language).toBe('cpp');
      expect(q.codeSnippet).toContain('cout');
    });

    it('generates and evaluates questions in Python', () => {
      const q = generateQuestion({ topic: 'variables', difficulty: 'easy', language: 'python', questionType: 'predict-output' });
      expect(q.language).toBe('python');
      expect(q.codeSnippet).toContain('print(');
    });

    it('generates and evaluates questions in Java', () => {
      const q = generateQuestion({ topic: 'variables', difficulty: 'easy', language: 'java', questionType: 'predict-output' });
      expect(q.language).toBe('java');
      expect(q.codeSnippet).toContain('System.out.println');
    });
  });

  describe('4. Scoring, Streaks, and Progress Persistence', () => {
    it('initializes default progress state', () => {
      const prog = getInitialProgress();
      expect(prog.totalQuestions).toBe(0);
      expect(prog.accuracy).toBe(0);
      expect(prog.bestStreak).toBe(0);
      expect(prog.topicPerformance.variables).toBeDefined();
    });

    it('records correct answer, updates score and streak', () => {
      let session = createInitialSessionState();
      const question = generateQuestion({ topic: 'loops', difficulty: 'easy', language: 'c', questionType: 'predict-output' });

      // Answer correctly
      const result = recordSessionAnswer(session, question, question.correctAnswer);
      session = result.session;

      expect(result.isCorrect).toBe(true);
      expect(session.questionsAnswered).toBe(1);
      expect(session.correctAnswers).toBe(1);
      expect(session.wrongAnswers).toBe(0);
      expect(session.score).toBe(10);
      expect(session.accuracy).toBe(100);
      expect(session.currentStreak).toBe(1);
      expect(session.bestStreak).toBe(1);

      // Verify persistent storage
      const loaded = loadUserProgress();
      expect(loaded.totalQuestions).toBe(1);
      expect(loaded.correct).toBe(1);
      expect(loaded.bestStreak).toBe(1);
      expect(loaded.topicPerformance.loops.total).toBe(1);
      expect(loaded.topicPerformance.loops.correct).toBe(1);
    });

    it('resets current streak on incorrect answer while preserving best streak', () => {
      let session = createInitialSessionState();
      const q1 = generateQuestion({ topic: 'conditions', difficulty: 'easy', language: 'python', questionType: 'predict-output' });
      const q2 = generateQuestion({ topic: 'conditions', difficulty: 'easy', language: 'python', questionType: 'predict-output' });

      // Correct first
      session = recordSessionAnswer(session, q1, q1.correctAnswer).session;
      expect(session.currentStreak).toBe(1);

      // Wrong second
      session = recordSessionAnswer(session, q2, 'DEFINITELY_WRONG_ANSWER_12345').session;
      expect(session.questionsAnswered).toBe(2);
      expect(session.correctAnswers).toBe(1);
      expect(session.wrongAnswers).toBe(1);
      expect(session.accuracy).toBe(50);
      expect(session.currentStreak).toBe(0);
      expect(session.bestStreak).toBe(1);

      const loaded = loadUserProgress();
      expect(loaded.totalQuestions).toBe(2);
      expect(loaded.correct).toBe(1);
      expect(loaded.incorrect).toBe(1);
      expect(loaded.bestStreak).toBe(1);
    });

    it('resets progress cleanly', () => {
      recordQuestionResult('variables', 'easy', true, 5);
      expect(loadUserProgress().totalQuestions).toBe(1);
      resetUserProgress();
      expect(loadUserProgress().totalQuestions).toBe(0);
    });
  });
});
