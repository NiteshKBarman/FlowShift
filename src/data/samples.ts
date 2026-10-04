/**
 * Educational Samples Library for FlowShift.
 * Contains classic algorithm and programming examples across C, C++, Python, and Java.
 */

export interface SampleProgram {
  id: string;
  title: string;
  description: string;
  category: 'Basics' | 'Conditionals' | 'Loops' | 'Functions' | 'Algorithms' | 'Recursion';
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
  {
    id: 'recursive-factorial',
    title: 'Factorial (Recursion)',
    description: 'Classic single-call direct recursion with base condition n <= 1.',
    category: 'Recursion',
    code: {
      c: `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int n = 5;
    printf("Factorial of %d is %d\\n", n, factorial(n));
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
    int n = 5;
    cout << "Factorial: " << factorial(n) << endl;
    return 0;
}
`,
      python: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

n = 5
print("Factorial:", factorial(n))
`,
      java: `public class Main {
    public static int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        int n = 5;
        System.out.println("Factorial: " + factorial(n));
    }
}
`,
    },
  },
  {
    id: 'recursive-fibonacci',
    title: 'Fibonacci (Multi-call Recursion)',
    description: 'Direct recursion containing multiple recursive call sites: fib(n - 1) + fib(n - 2).',
    category: 'Recursion',
    code: {
      c: `#include <stdio.h>

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
    int n = 7;
    printf("Fibonacci of %d is %d\\n", n, fibonacci(n));
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

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
    int n = 7;
    cout << "Fibonacci: " << fibonacci(n) << endl;
    return 0;
}
`,
      python: `def fibonacci(n):
    if n <= 0:
        return 0
    if n == 1:
        return 1
    return fibonacci(n - 1) + fibonacci(n - 2)

n = 7
print("Fibonacci:", fibonacci(n))
`,
      java: `public class Main {
    public static int fibonacci(int n) {
        if (n <= 0) {
            return 0;
        }
        if (n == 1) {
            return 1;
        }
        return fibonacci(n - 1) + fibonacci(n - 2);
    }

    public static void main(String[] args) {
        int n = 7;
        System.out.println("Fibonacci: " + fibonacci(n));
    }
}
`,
    },
  },
  {
    id: 'recursive-gcd',
    title: 'Greatest Common Divisor (GCD)',
    description: "Euclid's algorithm computing greatest common divisor with base case b == 0.",
    category: 'Recursion',
    code: {
      c: `#include <stdio.h>

int gcd(int a, int b) {
    if (b == 0) {
        return a;
    }
    return gcd(b, a % b);
}

int main() {
    int a = 48;
    int b = 18;
    printf("GCD is %d\\n", gcd(a, b));
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int gcd(int a, int b) {
    if (b == 0) {
        return a;
    }
    return gcd(b, a % b);
}

int main() {
    int a = 48;
    int b = 18;
    cout << "GCD: " << gcd(a, b) << endl;
    return 0;
}
`,
      python: `def gcd(a, b):
    if b == 0:
        return a
    return gcd(b, a % b)

a = 48
b = 18
print("GCD:", gcd(a, b))
`,
      java: `public class Main {
    public static int gcd(int a, int b) {
        if (b == 0) {
            return a;
        }
        return gcd(b, a % b);
    }

    public static void main(String[] args) {
        int a = 48;
        int b = 18;
        System.out.println("GCD: " + gcd(a, b));
    }
}
`,
    },
  },
  {
    id: 'recursive-sum',
    title: 'Sum of Natural Numbers',
    description: 'Computes 1 + 2 + ... + n using recursive reduction.',
    category: 'Recursion',
    code: {
      c: `#include <stdio.h>

int sum(int n) {
    if (n <= 0) {
        return 0;
    }
    return n + sum(n - 1);
}

int main() {
    int n = 10;
    printf("Sum is %d\\n", sum(n));
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int sum(int n) {
    if (n <= 0) {
        return 0;
    }
    return n + sum(n - 1);
}

int main() {
    int n = 10;
    cout << "Sum: " << sum(n) << endl;
    return 0;
}
`,
      python: `def sum_natural(n):
    if n <= 0:
        return 0
    return n + sum_natural(n - 1)

n = 10
print("Sum:", sum_natural(n))
`,
      java: `public class Main {
    public static int sum(int n) {
        if (n <= 0) {
            return 0;
        }
        return n + sum(n - 1);
    }

    public static void main(String[] args) {
        int n = 10;
        System.out.println("Sum: " + sum(n));
    }
}
`,
    },
  },
  {
    id: 'recursive-power',
    title: 'Power Function (base^exp)',
    description: 'Computes base raised to exp using base * power(base, exp - 1).',
    category: 'Recursion',
    code: {
      c: `#include <stdio.h>

int power(int base, int exp) {
    if (exp == 0) {
        return 1;
    }
    return base * power(base, exp - 1);
}

int main() {
    int base = 2;
    int exp = 5;
    printf("Result is %d\\n", power(base, exp));
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int power(int base, int exp) {
    if (exp == 0) {
        return 1;
    }
    return base * power(base, exp - 1);
}

int main() {
    int base = 2;
    int exp = 5;
    cout << "Power: " << power(base, exp) << endl;
    return 0;
}
`,
      python: `def power(base, exp):
    if exp == 0:
        return 1
    return base * power(base, exp - 1)

base = 2
exp = 5
print("Power:", power(base, exp))
`,
      java: `public class Main {
    public static int power(int base, int exp) {
        if (exp == 0) {
            return 1;
        }
        return base * power(base, exp - 1);
    }

    public static void main(String[] args) {
        int base = 2;
        int exp = 5;
        System.out.println("Power: " + power(base, exp));
    }
}
`,
    },
  },
  {
    id: 'recursive-reverse-number',
    title: 'Reverse Number',
    description: 'Reverses an integer using recursive accumulator helper.',
    category: 'Recursion',
    code: {
      c: `#include <stdio.h>

int reverseHelper(int n, int rev) {
    if (n == 0) {
        return rev;
    }
    return reverseHelper(n / 10, rev * 10 + (n % 10));
}

int main() {
    int n = 1234;
    printf("Reversed: %d\\n", reverseHelper(n, 0));
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int reverseHelper(int n, int rev) {
    if (n == 0) {
        return rev;
    }
    return reverseHelper(n / 10, rev * 10 + (n % 10));
}

int main() {
    int n = 1234;
    cout << "Reversed: " << reverseHelper(n, 0) << endl;
    return 0;
}
`,
      python: `def reverse_helper(n, rev):
    if n == 0:
        return rev
    return reverse_helper(n // 10, rev * 10 + (n % 10))

n = 1234
print("Reversed:", reverse_helper(n, 0))
`,
      java: `public class Main {
    public static int reverseHelper(int n, int rev) {
        if (n == 0) {
            return rev;
        }
        return reverseHelper(n / 10, rev * 10 + (n % 10));
    }

    public static void main(String[] args) {
        int n = 1234;
        System.out.println("Reversed: " + reverseHelper(n, 0));
    }
}
`,
    },
  },
  {
    id: 'recursive-binary-search',
    title: 'Binary Search (Recursive)',
    description: 'Divide-and-conquer binary search over sorted range.',
    category: 'Recursion',
    code: {
      c: `#include <stdio.h>

int binarySearch(int low, int high, int target) {
    if (low > high) {
        return -1;
    }
    int mid = (low + high) / 2;
    if (mid == target) {
        return mid;
    }
    if (mid > target) {
        return binarySearch(low, mid - 1, target);
    }
    return binarySearch(mid + 1, high, target);
}

int main() {
    int target = 7;
    int index = binarySearch(0, 10, target);
    printf("Found at: %d\\n", index);
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int binarySearch(int low, int high, int target) {
    if (low > high) {
        return -1;
    }
    int mid = (low + high) / 2;
    if (mid == target) {
        return mid;
    }
    if (mid > target) {
        return binarySearch(low, mid - 1, target);
    }
    return binarySearch(mid + 1, high, target);
}

int main() {
    int target = 7;
    int index = binarySearch(0, 10, target);
    cout << "Found at: " << index << endl;
    return 0;
}
`,
      python: `def binary_search(low, high, target):
    if low > high:
        return -1
    mid = (low + high) // 2
    if mid == target:
        return mid
    if mid > target:
        return binary_search(low, mid - 1, target)
    return binary_search(mid + 1, high, target)

target = 7
index = binary_search(0, 10, target)
print("Found at:", index)
`,
      java: `public class Main {
    public static int binarySearch(int low, int high, int target) {
        if (low > high) {
            return -1;
        }
        int mid = (low + high) / 2;
        if (mid == target) {
            return mid;
        }
        if (mid > target) {
            return binarySearch(low, mid - 1, target);
        }
        return binarySearch(mid + 1, high, target);
    }

    public static void main(String[] args) {
        int target = 7;
        int index = binarySearch(0, 10, target);
        System.out.println("Found at: " + index);
    }
}
`,
    },
  },
  {
    id: 'recursive-array-sum',
    title: 'Recursive Array Sum',
    description: 'Computes sum of array elements recursively by reducing the count n.',
    category: 'Recursion',
    code: {
      c: `#include <stdio.h>

int arraySum(int n) {
    if (n <= 0) {
        return 0;
    }
    return n + arraySum(n - 1);
}

int main() {
    int n = 5;
    printf("Total sum: %d\\n", arraySum(n));
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int arraySum(int n) {
    if (n <= 0) {
        return 0;
    }
    return n + arraySum(n - 1);
}

int main() {
    int n = 5;
    cout << "Total sum: " << arraySum(n) << endl;
    return 0;
}
`,
      python: `def array_sum(n):
    if n <= 0:
        return 0
    return n + array_sum(n - 1)

n = 5
print("Total sum:", array_sum(n))
`,
      java: `public class Main {
    public static int arraySum(int n) {
        if (n <= 0) {
            return 0;
        }
        return n + arraySum(n - 1);
    }

    public static void main(String[] args) {
        int n = 5;
        System.out.println("Total sum: " + arraySum(n));
    }
}
`,
    },
  },
  {
    id: 'recursive-max-element',
    title: 'Recursive Maximum/Minimum',
    description: 'Finds maximum value comparing current value with recursive tail.',
    category: 'Recursion',
    code: {
      c: `#include <stdio.h>

int findMax(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

int recursiveMax(int n) {
    if (n <= 1) {
        return 1;
    }
    return findMax(n, recursiveMax(n - 1));
}

int main() {
    int n = 8;
    printf("Max: %d\\n", recursiveMax(n));
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

int findMax(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

int recursiveMax(int n) {
    if (n <= 1) {
        return 1;
    }
    return findMax(n, recursiveMax(n - 1));
}

int main() {
    int n = 8;
    cout << "Max: " << recursiveMax(n) << endl;
    return 0;
}
`,
      python: `def find_max(a, b):
    if a > b:
        return a
    return b

def recursive_max(n):
    if n <= 1:
        return 1
    return find_max(n, recursive_max(n - 1))

n = 8
print("Max:", recursive_max(n))
`,
      java: `public class Main {
    public static int findMax(int a, int b) {
        if (a > b) {
            return a;
        }
        return b;
    }

    public static int recursiveMax(int n) {
        if (n <= 1) {
            return 1;
        }
        return findMax(n, recursiveMax(n - 1));
    }

    public static void main(String[] args) {
        int n = 8;
        System.out.println("Max: " + recursiveMax(n));
    }
}
`,
    },
  },
  {
    id: 'recursive-tower-of-hanoi',
    title: 'Tower of Hanoi',
    description: 'Classic divide and conquer problem moving n disks between 3 pegs.',
    category: 'Recursion',
    code: {
      c: `#include <stdio.h>

void hanoi(int n, int from_peg, int to_peg, int aux_peg) {
    if (n == 1) {
        printf("Move disk 1\\n");
        return;
    }
    hanoi(n - 1, from_peg, aux_peg, to_peg);
    printf("Move disk\\n");
    hanoi(n - 1, aux_peg, to_peg, from_peg);
}

int main() {
    int n = 3;
    hanoi(n, 1, 3, 2);
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

void hanoi(int n, int from_peg, int to_peg, int aux_peg) {
    if (n == 1) {
        cout << "Move disk 1" << endl;
        return;
    }
    hanoi(n - 1, from_peg, aux_peg, to_peg);
    cout << "Move disk" << endl;
    hanoi(n - 1, aux_peg, to_peg, from_peg);
}

int main() {
    int n = 3;
    hanoi(n, 1, 3, 2);
    return 0;
}
`,
      python: `def hanoi(n, from_peg, to_peg, aux_peg):
    if n == 1:
        print("Move disk 1")
        return
    hanoi(n - 1, from_peg, aux_peg, to_peg)
    print("Move disk")
    hanoi(n - 1, aux_peg, to_peg, from_peg)

n = 3
hanoi(n, 1, 3, 2)
`,
      java: `public class Main {
    public static void hanoi(int n, int fromPeg, int toPeg, int auxPeg) {
        if (n == 1) {
            System.out.println("Move disk 1");
            return;
        }
        hanoi(n - 1, fromPeg, auxPeg, toPeg);
        System.out.println("Move disk");
        hanoi(n - 1, auxPeg, toPeg, fromPeg);
    }

    public static void main(String[] args) {
        int n = 3;
        hanoi(n, 1, 3, 2);
    }
}
`,
    },
  },
];
