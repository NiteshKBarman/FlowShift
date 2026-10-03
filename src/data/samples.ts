/**
 * Educational Samples Library for FlowShift.
 * Contains classic algorithm and programming examples across C, C++, Python, and Java.
 */

export interface SampleProgram {
  id: string;
  title: string;
  description: string;
  category: 'Basics' | 'Conditionals' | 'Loops' | 'Functions' | 'Algorithms';
  code: Record<'c' | 'cpp' | 'python' | 'java', string>;
}

export const SAMPLE_PROGRAMS: SampleProgram[] = [
  {
    id: 'parity-check',
    title: 'Even or Odd Number',
    description: 'Demonstrates input, modulo operation, and conditional branching (if-else).',
    category: 'Conditionals',
    code: {
      c: `#include <stdio.h>

int main() {
    int n;
    printf("Enter an integer: ");
    scanf("%d", &n);
    if (n % 2 == 0) {
        printf("%d is even\\n", n);
    } else {
        printf("%d is odd\\n", n);
    }
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter an integer: ";
    cin >> n;
    if (n % 2 == 0) {
        cout << n << " is even" << endl;
    } else {
        cout << n << " is odd" << endl;
    }
    return 0;
}
`,
      python: `n = int(input("Enter an integer: "))
if n % 2 == 0:
    print(n, "is even")
else:
    print(n, "is odd")
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter an integer: ");
        int n = scanner.nextInt();
        if (n % 2 == 0) {
            System.out.println(n + " is even");
        } else {
            System.out.println(n + " is odd");
        }
    }
}
`,
    },
  },
  {
    id: 'sum-numbers',
    title: 'Sum of First N Numbers',
    description: 'Demonstrates accumulator variables and while loop iteration.',
    category: 'Loops',
    code: {
      c: `#include <stdio.h>

int main() {
    int n = 10;
    int sum = 0;
    int i = 1;
    while (i <= n) {
        sum += i;
        i++;
    }
    printf("Sum of first %d numbers is %d\\n", n, sum);
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    int n = 10;
    int sum = 0;
    int i = 1;
    while (i <= n) {
        sum += i;
        i++;
    }
    cout << "Sum is " << sum << endl;
    return 0;
}
`,
      python: `n = 10
sum = 0
i = 1
while i <= n:
    sum += i
    i += 1
print("Sum is", sum)
`,
      java: `public class Main {
    public static void main(String[] args) {
        int n = 10;
        int sum = 0;
        int i = 1;
        while (i <= n) {
            sum += i;
            i++;
        }
        System.out.println("Sum is " + sum);
    }
}
`,
    },
  },
  {
    id: 'factorial-function',
    title: 'Factorial Calculator',
    description: 'Shows multi-function program with base case branching and recursive flow.',
    category: 'Functions',
    code: {
      c: `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int num = 5;
    int result = factorial(num);
    printf("Factorial of %d is %d\\n", num, result);
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int num = 5;
    int result = factorial(num);
    cout << "Factorial is " << result << endl;
    return 0;
}
`,
      python: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def main():
    num = 5
    result = factorial(num)
    print("Factorial is", result)
`,
      java: `public class Main {
    public static int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        int num = 5;
        int result = factorial(num);
        System.out.println("Factorial is " + result);
    }
}
`,
    },
  },
  {
    id: 'for-loop-counter',
    title: 'For Loop Sequence',
    description: 'Demonstrates for loop counters, bounds, and increment statements.',
    category: 'Loops',
    code: {
      c: `#include <stdio.h>

int main() {
    int count = 5;
    for (int i = 0; i < count; i++) {
        printf("Iteration: %d\\n", i);
    }
    printf("Loop complete\\n");
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    int count = 5;
    for (int i = 0; i < count; i++) {
        cout << "Iteration: " << i << endl;
    }
    cout << "Loop complete" << endl;
    return 0;
}
`,
      python: `count = 5
for i in range(count):
    print("Iteration:", i)
print("Loop complete")
`,
      java: `public class Main {
    public static void main(String[] args) {
        int count = 5;
        for (int i = 0; i < count; i++) {
            System.out.println("Iteration: " + i);
        }
        System.out.println("Loop complete");
    }
}
`,
    },
  },
  {
    id: 'calculator-switch',
    title: 'Grade Classifier (Switch / Elif)',
    description: 'Multi-branch decision ladder comparing multiple scoring thresholds.',
    category: 'Conditionals',
    code: {
      c: `#include <stdio.h>

int main() {
    int score = 85;
    if (score >= 90) {
        printf("Grade: A\\n");
    } else if (score >= 80) {
        printf("Grade: B\\n");
    } else if (score >= 70) {
        printf("Grade: C\\n");
    } else {
        printf("Grade: F\\n");
    }
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    int score = 85;
    if (score >= 90) {
        cout << "Grade: A" << endl;
    } else if (score >= 80) {
        cout << "Grade: B" << endl;
    } else if (score >= 70) {
        cout << "Grade: C" << endl;
    } else {
        cout << "Grade: F" << endl;
    }
    return 0;
}
`,
      python: `score = 85
if score >= 90:
    print("Grade: A")
elif score >= 80:
    print("Grade: B")
elif score >= 70:
    print("Grade: C")
else:
    print("Grade: F")
`,
      java: `public class Main {
    public static void main(String[] args) {
        int score = 85;
        if (score >= 90) {
            System.out.println("Grade: A");
        } else if (score >= 80) {
            System.out.println("Grade: B");
        } else if (score >= 70) {
            System.out.println("Grade: C");
        } else {
            System.out.println("Grade: F");
        }
    }
}
`,
    },
  },
];
