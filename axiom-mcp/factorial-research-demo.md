# Factorial Research Task Demo

This demonstrates what would happen if axiom_spawn were available:

## The Initial Research Task

```typescript
axiom_spawn({
  prompt: "Research different approaches to implement factorial functions in Python, JavaScript, and Java. Create these specific files:
- factorial.py with recursive, iterative, and memoized implementations
- factorial.js with recursive, iterative, and reduce-based implementations  
- Factorial.java with recursive, iterative, and BigInteger implementations
During research, use axiom_spawn to create separate implementation tasks for each language.",
  spawnPattern: "single",
  verboseMasterMode: true
})
```

## Expected Execution Flow

1. **Research Phase** (0-2 minutes)
   - Axiom would start researching factorial approaches
   - Character-by-character monitoring would detect research mode
   - After 30 seconds of planning without code: [INTERVENTION] Stop planning! Write code!

2. **Decomposition** (2-3 minutes)
   - The task would spawn 3 child tasks:
   ```typescript
   axiom_spawn({ prompt: "Create factorial.py with recursive, iterative, and memoized implementations" })
   axiom_spawn({ prompt: "Create factorial.js with recursive, iterative, and reduce-based implementations" })
   axiom_spawn({ prompt: "Create Factorial.java with recursive, iterative, and BigInteger implementations" })
   ```

3. **Parallel Execution** (3-8 minutes)
   - All three language implementations run simultaneously
   - Each has 5-10 minute window to complete
   - Real-time monitoring ensures files are created

## What Axiom Prevents

Without Axiom, an LLM might:
- Spend 20 minutes "researching" without writing code
- Create TODO comments instead of implementations
- End with "I've successfully analyzed factorial implementations" without creating files
- Drift into explaining concepts rather than implementing

With Axiom:
- 30-second planning timeout forces action
- TODO detection triggers immediate intervention
- File creation verification ensures actual output
- Parallel execution explores multiple approaches simultaneously

## The Files That Would Be Created

### factorial.py
```python
# Recursive implementation
def factorial_recursive(n):
    if n <= 1:
        return 1
    return n * factorial_recursive(n - 1)

# Iterative implementation
def factorial_iterative(n):
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

# Memoized implementation
def factorial_memoized():
    cache = {}
    def factorial(n):
        if n in cache:
            return cache[n]
        if n <= 1:
            result = 1
        else:
            result = n * factorial(n - 1)
        cache[n] = result
        return result
    return factorial
```

### factorial.js
```javascript
// Recursive implementation
function factorialRecursive(n) {
    if (n <= 1) return 1;
    return n * factorialRecursive(n - 1);
}

// Iterative implementation
function factorialIterative(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// Reduce-based implementation
function factorialReduce(n) {
    if (n <= 1) return 1;
    return Array.from({length: n}, (_, i) => i + 1)
        .reduce((acc, val) => acc * val, 1);
}
```

### Factorial.java
```java
import java.math.BigInteger;

public class Factorial {
    // Recursive implementation
    public static long factorialRecursive(int n) {
        if (n <= 1) return 1;
        return n * factorialRecursive(n - 1);
    }
    
    // Iterative implementation
    public static long factorialIterative(int n) {
        long result = 1;
        for (int i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }
    
    // BigInteger implementation for large values
    public static BigInteger factorialBigInteger(int n) {
        BigInteger result = BigInteger.ONE;
        for (int i = 2; i <= n; i++) {
            result = result.multiply(BigInteger.valueOf(i));
        }
        return result;
    }
}
```

## Key Axiom Features Demonstrated

1. **Task Decomposition**: Breaking research into concrete implementation tasks
2. **Parallel Execution**: All three languages implemented simultaneously
3. **File Verification**: Each task must create its file or be interrupted
4. **No False Positives**: Only completed implementations count as success
5. **Real-time Monitoring**: Character-by-character observation of progress

This is the power of Axiom MCP - turning vague research requests into concrete, parallel, verifiable implementations.