import java.math.BigInteger;

/**
 * Factorial calculation class with both iterative and recursive implementations.
 */
public class Factorial {
    
    /**
     * Calculate factorial using recursion.
     * 
     * @param n Non-negative integer to calculate factorial of
     * @return The factorial of n (n!)
     * @throws IllegalArgumentException If n is negative
     * @throws StackOverflowError If n is too large for recursion
     */
    public static BigInteger factorialRecursive(int n) {
        if (n < 0) {
            throw new IllegalArgumentException("Factorial is not defined for negative numbers");
        }
        
        // Base cases
        if (n == 0 || n == 1) {
            return BigInteger.ONE;
        }
        
        // Recursive case
        return BigInteger.valueOf(n).multiply(factorialRecursive(n - 1));
    }
    
    /**
     * Calculate factorial using iteration.
     * 
     * @param n Non-negative integer to calculate factorial of
     * @return The factorial of n (n!)
     * @throws IllegalArgumentException If n is negative
     */
    public static BigInteger factorialIterative(int n) {
        if (n < 0) {
            throw new IllegalArgumentException("Factorial is not defined for negative numbers");
        }
        
        BigInteger result = BigInteger.ONE;
        for (int i = 2; i <= n; i++) {
            result = result.multiply(BigInteger.valueOf(i));
        }
        
        return result;
    }
    
    /**
     * Calculate factorial using the specified method.
     * 
     * @param n Non-negative integer to calculate factorial of
     * @param method Either "iterative" or "recursive" (default: "iterative")
     * @return The factorial of n (n!)
     * @throws IllegalArgumentException If n is negative or method is invalid
     */
    public static BigInteger factorial(int n, String method) {
        switch (method) {
            case "iterative":
                return factorialIterative(n);
            case "recursive":
                return factorialRecursive(n);
            default:
                throw new IllegalArgumentException(
                    "Invalid method: " + method + ". Use 'iterative' or 'recursive'"
                );
        }
    }
    
    /**
     * Calculate factorial using iterative method (default).
     */
    public static BigInteger factorial(int n) {
        return factorial(n, "iterative");
    }
    
    public static void main(String[] args) {
        System.out.println("Factorial Calculator Demo");
        System.out.println("========================================");
        
        // Test cases
        int[] testValues = {0, 1, 5, 10, 20};
        
        for (int val : testValues) {
            try {
                BigInteger iterResult = factorial(val, "iterative");
                BigInteger recResult = factorial(val, "recursive");
                System.out.printf("%d! = %s (iterative) = %s (recursive)%n", 
                    val, iterResult, recResult);
            } catch (Exception e) {
                System.err.printf("Error calculating %d!: %s%n", val, e.getMessage());
            }
        }
        
        // Test error handling
        System.out.println("\nError Handling Tests:");
        System.out.println("----------------------------------------");
        
        // Test negative number
        try {
            factorial(-5);
        } catch (IllegalArgumentException e) {
            System.out.println("✓ Caught error for negative input: " + e.getMessage());
        }
        
        // Test invalid method
        try {
            factorial(5, "invalid");
        } catch (IllegalArgumentException e) {
            System.out.println("✓ Caught error for invalid method: " + e.getMessage());
        }
        
        // Test recursion limit (Java handles large recursion better than Python)
        System.out.println("\nTesting large factorial...");
        try {
            BigInteger result = factorial(1000, "iterative");
            System.out.printf("1000! has %d digits%n", result.toString().length());
        } catch (Exception e) {
            System.err.println("Error with large factorial: " + e.getMessage());
        }
        
        // Very large factorial
        int largeN = 5000;
        BigInteger result = factorial(largeN, "iterative");
        System.out.printf("%d! has %d digits%n", largeN, result.toString().length());
    }
}