def fibonacci(n):
    """
    Calculate the nth Fibonacci number.
    
    The Fibonacci sequence is a series of numbers where each number is the sum
    of the two preceding ones. The sequence starts with 0 and 1:
    0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...
    
    Args:
        n (int): The position in the Fibonacci sequence (0-indexed)
                 n must be a non-negative integer
    
    Returns:
        int: The nth Fibonacci number
        
    Examples:
        >>> fibonacci(0)
        0
        >>> fibonacci(1)
        1
        >>> fibonacci(6)
        8
        >>> fibonacci(10)
        55
    """
    # Handle edge cases for the first two numbers in the sequence
    if n < 0:
        raise ValueError("Input must be a non-negative integer")
    
    # Base cases: F(0) = 0 and F(1) = 1
    if n == 0:
        return 0
    elif n == 1:
        return 1
    
    # For n >= 2, calculate using the recurrence relation: F(n) = F(n-1) + F(n-2)
    # We'll use an iterative approach for better performance than recursion
    
    # Initialize the first two Fibonacci numbers
    prev_prev = 0  # F(0)
    prev = 1       # F(1)
    
    # Iterate from position 2 to n, calculating each Fibonacci number
    for i in range(2, n + 1):
        # Calculate the current Fibonacci number as sum of previous two
        current = prev + prev_prev
        
        # Update values for next iteration
        # Move the window forward: prev_prev becomes prev, prev becomes current
        prev_prev = prev
        prev = current
    
    # After the loop, 'prev' contains F(n)
    return prev


def fibonacci_recursive(n):
    """
    Calculate the nth Fibonacci number using recursion.
    
    This is a more intuitive but less efficient implementation that directly
    follows the mathematical definition of Fibonacci numbers.
    
    Args:
        n (int): The position in the Fibonacci sequence (0-indexed)
    
    Returns:
        int: The nth Fibonacci number
        
    Note:
        This recursive approach has exponential time complexity O(2^n) and
        should only be used for small values of n. For larger values,
        use the iterative fibonacci() function instead.
    """
    # Base cases
    if n < 0:
        raise ValueError("Input must be a non-negative integer")
    if n <= 1:
        return n
    
    # Recursive case: F(n) = F(n-1) + F(n-2)
    return fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2)


def fibonacci_generator(max_n):
    """
    Generate Fibonacci numbers up to the nth position.
    
    This generator function yields Fibonacci numbers one at a time,
    which is memory-efficient for processing large sequences.
    
    Args:
        max_n (int): Generate Fibonacci numbers from F(0) to F(max_n)
    
    Yields:
        int: The next Fibonacci number in the sequence
        
    Example:
        >>> list(fibonacci_generator(5))
        [0, 1, 1, 2, 3, 5]
    """
    # Handle edge case
    if max_n < 0:
        return
    
    # Yield the first Fibonacci number
    a, b = 0, 1
    yield a
    
    # If max_n is 0, we're done
    if max_n == 0:
        return
    
    # Yield the second Fibonacci number
    yield b
    
    # Generate remaining Fibonacci numbers
    for i in range(2, max_n + 1):
        # Calculate next Fibonacci number
        a, b = b, a + b
        yield b


# Example usage and testing
if __name__ == "__main__":
    # Test the iterative function
    print("Iterative Fibonacci:")
    for i in range(10):
        print(f"F({i}) = {fibonacci(i)}")
    
    print("\n" + "="*40 + "\n")
    
    # Test the recursive function (only for small values)
    print("Recursive Fibonacci (small values only):")
    for i in range(10):
        print(f"F({i}) = {fibonacci_recursive(i)}")
    
    print("\n" + "="*40 + "\n")
    
    # Test the generator function
    print("Generator Fibonacci:")
    print("First 15 Fibonacci numbers:", list(fibonacci_generator(14)))
    
    print("\n" + "="*40 + "\n")
    
    # Performance comparison for larger values
    import time
    
    n = 30
    start = time.time()
    result_iter = fibonacci(n)
    time_iter = time.time() - start
    
    start = time.time()
    result_rec = fibonacci_recursive(n)
    time_rec = time.time() - start
    
    print(f"Performance comparison for F({n}):")
    print(f"Iterative: {result_iter} (Time: {time_iter:.6f} seconds)")
    print(f"Recursive: {result_rec} (Time: {time_rec:.6f} seconds)")
    print(f"Recursive is {time_rec/time_iter:.0f}x slower than iterative")