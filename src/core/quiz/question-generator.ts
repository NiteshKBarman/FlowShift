/**
 * Question Generator Engine for Practice / Quiz Mode.
 *
 * Uses controlled parameter templates and executes programs through
 * the existing safe Program IR parser and execution engine.
 * Never uses eval(), Function(), shell, or arbitrary code execution.
 */

import type { SupportedLanguage } from '../../store/editor-store';
import { sourceToFlowchart } from '../conversion/converter';
import { createVisualExecutionEngine } from '../execution/visual-engine';
import type {
  QuizQuestion,
  QuizFilterOptions,
  QuizTopic,
  QuizDifficulty,
} from './quiz-types';

/**
 * Utility to shuffle an array deterministically or randomly.
 */
function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Random integer between min and max inclusive.
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─────────────────────────────────────────────────────────────────
// 1. Predict Output Question Generators
// ─────────────────────────────────────────────────────────────────

export function generatePredictOutputQuestion(
  lang: SupportedLanguage = 'c',
  difficulty: QuizDifficulty = 'easy',
  overrideTopic?: QuizTopic
): QuizQuestion {
  const a = randInt(2, 6);
  const b = randInt(2, 5);
  const c = randInt(2, 4);

  let code = '';
  let expectedDesc = '';

  if (lang === 'c') {
    if (difficulty === 'easy') {
      code = `#include <stdio.h>\n\nint main() {\n    int x = ${a};\n    x = x + ${b};\n    x = x * ${c};\n    printf("%d\\n", x);\n    return 0;\n}`;
      expectedDesc = `x = ${a} + ${b} = ${a + b}; x = ${a + b} * ${c} = ${(a + b) * c}`;
    } else if (difficulty === 'medium') {
      const limit = randInt(3, 5);
      code = `#include <stdio.h>\n\nint main() {\n    int sum = 0;\n    for (int i = 1; i <= ${limit}; i++) {\n        sum += i * ${a};\n    }\n    printf("%d\\n", sum);\n    return 0;\n}`;
      expectedDesc = `Loop multiplies each i (1 to ${limit}) by ${a} and accumulates into sum.`;
    } else {
      code = `#include <stdio.h>\n\nint calc(int n) {\n    if (n <= 1) return 1;\n    return n + calc(n - 1);\n}\n\nint main() {\n    printf("%d\\n", calc(${a}));\n    return 0;\n}`;
      expectedDesc = `Recursive sum from 1 to ${a}.`;
    }
  } else if (lang === 'cpp') {
    code = `#include <iostream>\nusing namespace std;\n\nint main() {\n    int val = ${a};\n    val += ${b};\n    val *= ${c};\n    cout << val << endl;\n    return 0;\n}`;
    expectedDesc = `val starts at ${a}, adds ${b} (${a + b}), multiplies by ${c} (${(a + b) * c}).`;
  } else if (lang === 'python') {
    if (difficulty === 'easy') {
      code = `x = ${a}\nx = x + ${b}\nx = x * ${c}\nprint(x)`;
      expectedDesc = `x begins at ${a}, adds ${b} (${a + b}), and is multiplied by ${c} (${(a + b) * c}).`;
    } else {
      code = `def step(n):\n    return n * 2 + ${b}\n\nres = step(${a})\nprint(res)`;
      expectedDesc = `step(${a}) computes ${a} * 2 + ${b} = ${a * 2 + b}.`;
    }
  } else {
    // java
    code = `public class Main {\n    public static void main(String[] args) {\n        int x = ${a};\n        x = x + ${b};\n        x = x * ${c};\n        System.out.println(x);\n    }\n}`;
    expectedDesc = `x is computed as (${a} + ${b}) * ${c} = ${(a + b) * c}.`;
  }

  const res = sourceToFlowchart(code, lang);
  let correctOutput = '';

  if (res.success && res.ir) {
    const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
    engine.start();
    const finalState = engine.getAllSnapshots().slice(-1)[0];
    correctOutput = finalState.output.join('').trim();
  }

  if (!correctOutput) {
    correctOutput = String((a + b) * c);
  }

  const numVal = parseInt(correctOutput, 10);
  const distractors = isNaN(numVal)
    ? ['0', 'None', 'Error']
    : [
        String(numVal + randInt(1, 4)),
        String(Math.max(0, numVal - randInt(1, 3))),
        String(numVal * 2),
      ];

  const options = shuffle([correctOutput, ...distractors.slice(0, 3)]);

  return {
    id: `output-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: 'Predict Program Output',
    prompt: 'What will be printed to standard output when this program executes to completion?',
    topic: overrideTopic && overrideTopic !== 'mixed' ? overrideTopic : (difficulty === 'hard' ? 'functions' : 'variables'),
    difficulty,
    language: lang,
    questionType: 'predict-output',
    codeSnippet: code,
    flowGraph: res.flowProgram?.graphs[0],
    options,
    correctAnswer: correctOutput,
    explanation: `The program executes and produces "${correctOutput}".\n\nExplanation: ${expectedDesc}`,
  };
}

// ─────────────────────────────────────────────────────────────────
// 2. Predict Variable Value Question Generator
// ─────────────────────────────────────────────────────────────────

export function generatePredictVariableQuestion(
  lang: SupportedLanguage = 'c',
  difficulty: QuizDifficulty = 'easy',
  overrideTopic?: QuizTopic
): QuizQuestion {
  const startX = randInt(5, 15);
  const addVal = randInt(2, 5);
  const loopBound = randInt(2, 4);

  let code = '';
  let targetVar = 'x';

  if (lang === 'c') {
    code = `#include <stdio.h>\n\nint main() {\n    int x = ${startX};\n    int i = 1;\n    while (i <= ${loopBound}) {\n        x += ${addVal};\n        i++;\n    }\n    return 0;\n}`;
  } else if (lang === 'cpp') {
    code = `#include <iostream>\nusing namespace std;\n\nint main() {\n    int x = ${startX};\n    for (int i = 0; i < ${loopBound}; i++) {\n        x += ${addVal};\n    }\n    return 0;\n}`;
  } else if (lang === 'python') {
    code = `x = ${startX}\nfor i in range(${loopBound}):\n    x += ${addVal}`;
  } else {
    code = `public class Main {\n    public static void main(String[] args) {\n        int x = ${startX};\n        for (int i = 0; i < ${loopBound}; i++) {\n            x += ${addVal};\n        }\n    }\n}`;
  }

  const res = sourceToFlowchart(code, lang);
  let correctVal = '';
  const stepTraces: string[] = [];

  if (res.success && res.ir) {
    const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
    engine.start();
    const snapshots = engine.getAllSnapshots();
    const finalState = snapshots[snapshots.length - 1];

    if (finalState.variables[targetVar] !== undefined) {
      correctVal = String(finalState.variables[targetVar]);
    }

    snapshots.forEach((s) => {
      if (s.changedVariables.includes(targetVar)) {
        stepTraces.push(`Step ${s.stepIndex + 1}: ${targetVar} = ${s.variables[targetVar]}`);
      }
    });
  }

  if (!correctVal) {
    correctVal = String(startX + addVal * loopBound);
  }

  const numVal = parseInt(correctVal, 10);
  const options = shuffle([
    correctVal,
    String(numVal - addVal),
    String(numVal + addVal),
    String(startX),
  ]);

  return {
    id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: 'Predict Final Variable Value',
    prompt: `What is the final value stored in variable "${targetVar}" at the end of execution?`,
    topic: overrideTopic && overrideTopic !== 'mixed' ? overrideTopic : 'loops',
    difficulty,
    language: lang,
    questionType: 'predict-variable',
    codeSnippet: code,
    flowGraph: res.flowProgram?.graphs[0],
    options,
    correctAnswer: correctVal,
    explanation: `Variable "${targetVar}" finishes with value ${correctVal}.\n\nTrace:\n- Starts at ${startX}\n- Loops ${loopBound} times, adding ${addVal} each iteration\n- Total: ${startX} + (${loopBound} × ${addVal}) = ${correctVal}`,
    stepDetails: stepTraces,
  };
}

// ─────────────────────────────────────────────────────────────────
// 3. Next Execution Step Question Generator
// ─────────────────────────────────────────────────────────────────

export function generateNextStepQuestion(
  lang: SupportedLanguage = 'c'
): QuizQuestion {
  const code =
    lang === 'python'
      ? `count = 0\ni = 1\nwhile i <= 2:\n    count += 5\n    i += 1\nprint(count)`
      : `#include <stdio.h>\n\nint main() {\n    int count = 0;\n    int i = 1;\n    while (i <= 2) {\n        count += 5;\n        i++;\n    }\n    return 0;\n}`;

  const res = sourceToFlowchart(code, lang);
  let promptText = 'Execution has initialized count = 0 and i = 1. What statement or condition executes next?';
  const correctAnswer = 'Evaluate loop condition (i <= 2)';
  const options = shuffle([
    correctAnswer,
    'Increment i by 1 (i++)',
    'Add 5 to count (count += 5)',
    'Exit the while loop immediately',
  ]);

  return {
    id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: 'Identify Next Execution Step',
    prompt: promptText,
    topic: 'loops',
    difficulty: 'medium',
    language: lang,
    questionType: 'next-step',
    codeSnippet: code,
    flowGraph: res.flowProgram?.graphs[0],
    options,
    correctAnswer,
    explanation:
      'Before entering any while loop body, the program must evaluate the condition expression (i <= 2). Since i = 1, (1 <= 2) evaluates to true, allowing execution to proceed into the loop body.',
    stepDetails: [
      '1. Initialize count = 0',
      '2. Initialize i = 1',
      '3. Evaluate condition (i <= 2) -> evaluates to true',
      '4. Proceed into loop body',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────
// 4. Flowchart Path Question Generator
// ─────────────────────────────────────────────────────────────────

export function generateFlowchartPathQuestion(
  lang: SupportedLanguage = 'c'
): QuizQuestion {
  const threshold = randInt(10, 20);
  const testVal = threshold + randInt(2, 6);

  const code =
    lang === 'python'
      ? `x = ${testVal}\nif x >= ${threshold}:\n    status = 1\nelse:\n    status = 0`
      : `#include <stdio.h>\n\nint main() {\n    int x = ${testVal};\n    int status = 0;\n    if (x >= ${threshold}) {\n        status = 1;\n    } else {\n        status = 0;\n    }\n    return 0;\n}`;

  const res = sourceToFlowchart(code, lang);
  const correctAnswer = `Follow the TRUE branch to "status = 1"`;
  const options = shuffle([
    correctAnswer,
    `Follow the FALSE branch to "status = 0"`,
    'Follow a loop-back edge',
    'Terminate directly without executing either branch',
  ]);

  return {
    id: `flow-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: 'Flowchart Decision Path',
    prompt: `Given x = ${testVal}, which branch will execution follow out of the decision node "x >= ${threshold}" in the flowchart?`,
    topic: 'conditions',
    difficulty: 'easy',
    language: lang,
    questionType: 'flowchart-path',
    codeSnippet: code,
    flowGraph: res.flowProgram?.graphs[0],
    options,
    correctAnswer,
    explanation: `Since ${testVal} >= ${threshold} evaluates to true, the control flow follows the TRUE branch entering the block that sets status = 1.`,
  };
}

// ─────────────────────────────────────────────────────────────────
// 5. Find the Error Question Generator
// ─────────────────────────────────────────────────────────────────

export function generateFindErrorQuestion(
  lang: SupportedLanguage = 'c'
): QuizQuestion {
  const errors = [
    {
      title: 'Infinite Loop Defect',
      code:
        lang === 'python'
          ? `i = 1\nwhile i <= 5:\n    print(i)\n    # missing i increment`
          : `#include <stdio.h>\n\nint main() {\n    int i = 1;\n    while (i <= 5) {\n        printf("%d\\n", i);\n        /* missing i++ */\n    }\n    return 0;\n}`,
      errorLine: lang === 'python' ? 2 : 5,
      correctAnswer: 'Variable "i" is never updated, creating an infinite loop',
      options: shuffle([
        'Variable "i" is never updated, creating an infinite loop',
        'The loop condition i <= 5 is syntactically invalid',
        'printf cannot output variable i directly',
        'Main function must take command line arguments',
      ]),
      explanation:
        'Because i is never incremented inside the while loop body, the condition i <= 5 remains true indefinitely, resulting in an infinite loop.',
      topic: 'loops' as QuizTopic,
    },
    {
      title: 'Missing Recursion Base Case',
      code:
        lang === 'python'
          ? `def factorial(n):\n    # missing base case!\n    return n * factorial(n - 1)`
          : `#include <stdio.h>\n\nint factorial(int n) {\n    /* missing base case! */\n    return n * factorial(n - 1);\n}`,
      errorLine: lang === 'python' ? 3 : 5,
      correctAnswer: 'No base case to stop recursion, causing stack overflow',
      options: shuffle([
        'No base case to stop recursion, causing stack overflow',
        'Cannot multiply n by a recursive call',
        'Function signature requires void return type',
        'Recursive call must increment n instead of decrementing',
      ]),
      explanation:
        'A recursive function must have at least one base case that returns without calling itself. Without it, the function calls itself indefinitely until stack overflow occurs.',
      topic: 'recursion' as QuizTopic,
    },
    {
      title: 'Off-by-One Loop Boundary',
      code:
        lang === 'python'
          ? `items = [10, 20, 30]\nfor i in range(len(items) + 1):\n    print(items[i])`
          : `#include <stdio.h>\n\nint main() {\n    int arr[3] = {10, 20, 30};\n    for (int i = 0; i <= 3; i++) {\n        printf("%d\\n", arr[i]);\n    }\n    return 0;\n}`,
      errorLine: lang === 'python' ? 2 : 6,
      correctAnswer: 'Index out of bounds (accesses index 3 for an array of size 3)',
      options: shuffle([
        'Index out of bounds (accesses index 3 for an array of size 3)',
        'Array initialization syntax is invalid',
        'Cannot loop with integer counter i',
        'Array indices start at 1 instead of 0',
      ]),
      explanation:
        'Arrays of size 3 have valid indices 0, 1, and 2. Using <= 3 attempts to access index 3, causing an out-of-bounds index defect.',
      topic: 'arrays' as QuizTopic,
    },
  ];

  const chosen = errors[Math.floor(Math.random() * errors.length)];

  return {
    id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: chosen.title,
    prompt: 'Identify the bug or logical flaw in this code:',
    topic: chosen.topic,
    difficulty: 'medium',
    language: lang,
    questionType: 'find-error',
    codeSnippet: chosen.code,
    options: chosen.options,
    correctAnswer: chosen.correctAnswer,
    explanation: chosen.explanation,
    errorLine: chosen.errorLine,
  };
}

// ─────────────────────────────────────────────────────────────────
// 6. Recursion Questions Generator
// ─────────────────────────────────────────────────────────────────

export function generateRecursionQuestion(
  lang: SupportedLanguage = 'c'
): QuizQuestion {
  const n = randInt(3, 5);

  const subTypes = ['result', 'base-case', 'call-count'] as const;
  const picked = subTypes[Math.floor(Math.random() * subTypes.length)];

  const code =
    lang === 'python'
      ? `def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nres = factorial(${n})\nprint(res)`
      : `#include <stdio.h>\n\nint factorial(int n) {\n    if (n <= 1) {\n        return 1;\n    }\n    return n * factorial(n - 1);\n}\n\nint main() {\n    int res = factorial(${n});\n    printf("%d\\n", res);\n    return 0;\n}`;

  const res = sourceToFlowchart(code, lang);

  // Compute via existing execution engine
  let resultVal = 1;
  let callCount = 1;
  for (let i = 2; i <= n; i++) resultVal *= i;
  callCount = n;

  if (res.success && res.ir) {
    const engine = createVisualExecutionEngine(res.ir, res.flowProgram);
    engine.start();
    const snaps = engine.getAllSnapshots();
    const calls = snaps.filter((s) => s.history.some((h) => h.action === 'call'));
    if (calls.length > 0) callCount = calls.length;
  }

  if (picked === 'base-case') {
    const correctAnswer = 'if (n <= 1) return 1';
    const options = shuffle([
      correctAnswer,
      'return n * factorial(n - 1)',
      'int main()',
      'int res = factorial(n)',
    ]);

    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: 'Recursion: Identify Base Case',
      prompt: 'Which part of the factorial function serves as the base case?',
      topic: 'recursion',
      difficulty: 'easy',
      language: lang,
      questionType: 'recursion',
      codeSnippet: code,
      flowGraph: res.flowProgram?.graphs[0],
      options,
      correctAnswer,
      explanation:
        'The base case is "if (n <= 1) return 1". It terminates recursive descent when n reaches 1 or 0, providing the stopping condition.',
    };
  }

  if (picked === 'call-count') {
    const correctAnswer = String(callCount);
    const options = shuffle([
      correctAnswer,
      String(callCount + 1),
      String(Math.max(1, callCount - 1)),
      String(callCount * 2),
    ]);

    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: 'Recursion: Call Stack Depth',
      prompt: `How many total calls to "factorial" are made to compute factorial(${n})?`,
      topic: 'recursion',
      difficulty: 'medium',
      language: lang,
      questionType: 'recursion',
      codeSnippet: code,
      flowGraph: res.flowProgram?.graphs[0],
      options,
      correctAnswer,
      explanation: `For factorial(${n}), the calls are: ${Array.from({ length: n }, (_, i) => `factorial(${n - i})`).join(', ')}. That is exactly ${callCount} calls.`,
    };
  }

  // default: result
  const correctAnswer = String(resultVal);
  const options = shuffle([
    correctAnswer,
    String(resultVal + randInt(2, 6)),
    String(Math.max(1, resultVal - randInt(1, 4))),
    String(resultVal * 2),
  ]);

  return {
    id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: 'Recursion: Compute Result',
    prompt: `What is the returned value of factorial(${n})?`,
    topic: 'recursion',
    difficulty: 'medium',
    language: lang,
    questionType: 'recursion',
    codeSnippet: code,
    flowGraph: res.flowProgram?.graphs[0],
    options,
    correctAnswer,
    explanation: `factorial(${n}) evaluates as ${Array.from({ length: n }, (_, i) => n - i).join(' × ')} = ${resultVal}.`,
  };
}

// ─────────────────────────────────────────────────────────────────
// 7. Time Complexity Question Generator
// ─────────────────────────────────────────────────────────────────

export function generateTimeComplexityQuestion(): QuizQuestion {
  const templates = [
    {
      title: 'Single Loop Complexity',
      code: `for (int i = 0; i < n; i++) {\n    sum += i;\n}`,
      correctAnswer: 'O(n)',
      explanation: 'A single loop that iterates from 0 to n runs n times, giving linear time complexity O(n).',
      difficulty: 'easy' as QuizDifficulty,
    },
    {
      title: 'Nested Loop Complexity',
      code: `for (int i = 0; i < n; i++) {\n    for (int j = 0; j < n; j++) {\n        matrix[i][j] = i + j;\n    }\n}`,
      correctAnswer: 'O(n²)',
      explanation: 'The outer loop runs n times and for each outer step the inner loop runs n times. n × n = n², so complexity is quadratic O(n²).',
      difficulty: 'medium' as QuizDifficulty,
    },
    {
      title: 'Logarithmic Doubling Loop',
      code: `int i = 1;\nwhile (i < n) {\n    count++;\n    i = i * 2;\n}`,
      correctAnswer: 'O(log n)',
      explanation: 'The loop counter doubles in each iteration (1, 2, 4, 8, ...). The loop terminates in log₂(n) steps, which is O(log n).',
      difficulty: 'medium' as QuizDifficulty,
    },
    {
      title: 'Constant Time Operation',
      code: `int compute(int a, int b) {\n    int sum = a + b;\n    int product = a * b;\n    return sum + product;\n}`,
      correctAnswer: 'O(1)',
      explanation: 'The function performs a fixed number of arithmetic operations independent of input size. Thus time complexity is constant O(1).',
      difficulty: 'easy' as QuizDifficulty,
    },
    {
      title: 'Binary Tree Recursion (Fibonacci)',
      code: `int fib(int n) {\n    if (n <= 1) return n;\n    return fib(n - 1) + fib(n - 2);\n}`,
      correctAnswer: 'O(2ⁿ)',
      explanation: 'Each call generates two recursive branch calls, forming a binary call tree of depth n. The total number of calls scales exponentially as O(2ⁿ).',
      difficulty: 'hard' as QuizDifficulty,
    },
  ];

  const picked = templates[Math.floor(Math.random() * templates.length)];
  const options = ['O(1)', 'O(log n)', 'O(n)', 'O(n²)', 'O(2ⁿ)'];

  return {
    id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: picked.title,
    prompt: 'What is the time complexity (Big-O) of this code segment in terms of n?',
    topic: 'algorithms',
    difficulty: picked.difficulty,
    language: 'pseudocode',
    questionType: 'time-complexity',
    codeSnippet: picked.code,
    options,
    correctAnswer: picked.correctAnswer,
    explanation: picked.explanation,
  };
}

// ─────────────────────────────────────────────────────────────────
// 8. Conceptual MCQ Question Pool
// ─────────────────────────────────────────────────────────────────

export function generateMCQQuestion(topic: QuizTopic = 'mixed'): QuizQuestion {
  const mcqs = [
    {
      title: 'Base Case in Recursion',
      prompt: 'What is the primary purpose of a base case in a recursive function?',
      topic: 'recursion' as QuizTopic,
      difficulty: 'easy' as QuizDifficulty,
      correctAnswer: 'To provide a termination condition and prevent infinite recursion',
      options: shuffle([
        'To provide a termination condition and prevent infinite recursion',
        'To allocate additional stack frames for parameters',
        'To start the recursive loop from index 0',
        'To invert the sign of the returned values',
      ]),
      explanation:
        'A base case ensures that recursive calls eventually halt, unwinding the call stack and returning answers rather than overflowing stack memory.',
    },
    {
      title: 'While vs Do-While Loop',
      prompt: 'What is the fundamental difference between a while loop and a do-while loop?',
      topic: 'loops' as QuizTopic,
      difficulty: 'easy' as QuizDifficulty,
      correctAnswer: 'A do-while loop always executes its body at least once before checking the condition',
      options: shuffle([
        'A do-while loop always executes its body at least once before checking the condition',
        'A while loop can only execute an even number of times',
        'A do-while loop cannot use break or continue statements',
        'A while loop does not support integer variables',
      ]),
      explanation:
        'A standard while loop tests the condition at the entry point; if false, the body never runs. A do-while loop evaluates the condition at the bottom, guaranteeing at least one execution.',
    },
    {
      title: 'Stack Overflow Cause',
      prompt: 'What typically causes a Stack Overflow error in a computer program?',
      topic: 'functions' as QuizTopic,
      difficulty: 'medium' as QuizDifficulty,
      correctAnswer: 'Too many nested or infinite function calls exhausting the call stack memory',
      options: shuffle([
        'Too many nested or infinite function calls exhausting the call stack memory',
        'Dividing a floating-point number by zero',
        'Using more than three while loops in a single file',
        'Declaring a variable with the same name as a keyword',
      ]),
      explanation:
        'Each function invocation allocates a stack frame on the call stack. Unbounded recursion or extremely deep call nesting exhausts available call stack memory, triggering a stack overflow.',
    },
    {
      title: 'Variable Scope',
      prompt: 'What is meant by the "local scope" of a variable inside a function?',
      topic: 'variables' as QuizTopic,
      difficulty: 'easy' as QuizDifficulty,
      correctAnswer: 'The variable is accessible only within the function in which it was declared',
      options: shuffle([
        'The variable is accessible only within the function in which it was declared',
        'The variable persists across all source files and functions globally',
        'The variable can never change its value once declared',
        'The variable is stored exclusively in CPU cache',
      ]),
      explanation:
        'Variables declared inside a function or block are local to that block and cannot be accessed outside of it once the frame exits.',
    },
    {
      title: 'Array Indexing Bounds',
      prompt: 'In a zero-indexed programming language, what are the valid index bounds for an array of size N?',
      topic: 'arrays' as QuizTopic,
      difficulty: 'easy' as QuizDifficulty,
      correctAnswer: 'From index 0 to N - 1',
      options: shuffle([
        'From index 0 to N - 1',
        'From index 1 to N',
        'From index 0 to N',
        'From index -1 to N - 1',
      ]),
      explanation:
        'In zero-indexed languages (like C, C++, Python, and Java), an array with N elements has elements indexed at 0, 1, 2, ..., up to N - 1.',
    },
    {
      title: 'Euclidean Algorithm for GCD',
      prompt: 'What mathematical principle does the Euclidean algorithm use to compute GCD(a, b)?',
      topic: 'algorithms' as QuizTopic,
      difficulty: 'medium' as QuizDifficulty,
      correctAnswer: 'GCD(a, b) = GCD(b, a % b) with base case GCD(a, 0) = a',
      options: shuffle([
        'GCD(a, b) = GCD(b, a % b) with base case GCD(a, 0) = a',
        'GCD(a, b) = (a + b) / 2 until both are prime',
        'GCD(a, b) = a * b / (a - b)',
        'GCD(a, b) = min(a, b) * 2',
      ]),
      explanation:
        'Euclid proved that the greatest common divisor of two integers also divides their remainder: GCD(a, b) = GCD(b, a mod b). When b reaches 0, GCD is a.',
    },
  ];

  const filtered =
    topic === 'mixed' ? mcqs : mcqs.filter((m) => m.topic === topic);
  const pool = filtered.length > 0 ? filtered : mcqs;

  const picked = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: `mcq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: picked.title,
    prompt: picked.prompt,
    topic: picked.topic,
    difficulty: picked.difficulty,
    language: 'general',
    questionType: 'mcq',
    options: picked.options,
    correctAnswer: picked.correctAnswer,
    explanation: picked.explanation,
  };
}

// ─────────────────────────────────────────────────────────────────
// Main Unified Question Generator Entry Point
// ─────────────────────────────────────────────────────────────────

export function generateQuestion(filters: QuizFilterOptions): QuizQuestion {
  const chosenLang: SupportedLanguage =
    filters.language === 'any'
      ? (['c', 'cpp', 'python', 'java'] as const)[Math.floor(Math.random() * 4)]
      : filters.language;

  const difficulty: QuizDifficulty =
    filters.difficulty === 'all'
      ? (['easy', 'medium', 'hard'] as const)[Math.floor(Math.random() * 3)]
      : filters.difficulty;

  // If specific question type is requested
  if (filters.questionType !== 'all') {
    switch (filters.questionType) {
      case 'predict-output':
        return generatePredictOutputQuestion(chosenLang, difficulty, filters.topic);
      case 'predict-variable':
        return generatePredictVariableQuestion(chosenLang, difficulty, filters.topic);
      case 'next-step':
        return generateNextStepQuestion(chosenLang);
      case 'flowchart-path':
        return generateFlowchartPathQuestion(chosenLang);
      case 'find-error':
        return generateFindErrorQuestion(chosenLang);
      case 'recursion':
        return generateRecursionQuestion(chosenLang);
      case 'time-complexity':
        return generateTimeComplexityQuestion();
      case 'mcq':
        return generateMCQQuestion(filters.topic);
    }
  }

  // Filter based on topic
  if (filters.topic === 'recursion') {
    return Math.random() < 0.6
      ? generateRecursionQuestion(chosenLang)
      : generatePredictOutputQuestion(chosenLang, 'hard');
  }

  if (filters.topic === 'algorithms') {
    return Math.random() < 0.5
      ? generateTimeComplexityQuestion()
      : generateMCQQuestion('algorithms');
  }

  if (filters.topic === 'variables') {
    return Math.random() < 0.5
      ? generatePredictVariableQuestion(chosenLang, difficulty)
      : generatePredictOutputQuestion(chosenLang, difficulty);
  }

  if (filters.topic === 'conditions') {
    return Math.random() < 0.5
      ? generateFlowchartPathQuestion(chosenLang)
      : generatePredictOutputQuestion(chosenLang, difficulty);
  }

  if (filters.topic === 'loops') {
    const roll = Math.random();
    if (roll < 0.35) return generatePredictVariableQuestion(chosenLang, difficulty);
    if (roll < 0.7) return generatePredictOutputQuestion(chosenLang, difficulty);
    return generateNextStepQuestion(chosenLang);
  }

  // Mixed or default random selection across types
  const roll = Math.random();
  if (roll < 0.22) return generatePredictOutputQuestion(chosenLang, difficulty);
  if (roll < 0.38) return generatePredictVariableQuestion(chosenLang, difficulty);
  if (roll < 0.52) return generateFlowchartPathQuestion(chosenLang);
  if (roll < 0.64) return generateNextStepQuestion(chosenLang);
  if (roll < 0.76) return generateRecursionQuestion(chosenLang);
  if (roll < 0.88) return generateFindErrorQuestion(chosenLang);
  if (roll < 0.94) return generateTimeComplexityQuestion();
  return generateMCQQuestion('mixed');
}
