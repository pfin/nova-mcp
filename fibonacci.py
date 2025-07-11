#!/usr/bin/env python3
"""
Fibonacci sequence calculator with memoization
"""
from functools import lru_cache

def fibonacci_memoized(n, memo=None):
    """
    Calculate the nth Fibonacci number using memoization.
    
    Args:
        n: The position in the Fibonacci sequence (0-indexed)
        memo: Dictionary to store computed values (default: None)
        
    Returns:
        The nth Fibonacci number
    """
    if memo is None:
        memo = {}
    
    if n in memo:
        return memo[n]
    
    if n < 0:
        raise ValueError("Position must be non-negative")
    elif n <= 1:
        return n
    
    memo[n] = fibonacci_memoized(n - 1, memo) + fibonacci_memoized(n - 2, memo)
    return memo[n]


@lru_cache(maxsize=None)
def fibonacci(n):
    """
    Calculate the nth Fibonacci number using built-in LRU cache.
    
    Args:
        n: The position in the Fibonacci sequence (0-indexed)
        
    Returns:
        The nth Fibonacci number
    """
    if n < 0:
        raise ValueError("Position must be non-negative")
    elif n <= 1:
        return n
    else:
        return fibonacci(n - 1) + fibonacci(n - 2)


def fibonacci_sequence(count):
    """
    Generate a list of Fibonacci numbers.
    
    Args:
        count: Number of Fibonacci numbers to generate
        
    Returns:
        List of the first 'count' Fibonacci numbers
    """
    if count <= 0:
        return []
    
    sequence = []
    for i in range(count):
        sequence.append(fibonacci(i))
    return sequence


def fibonacci_generator(max_value=None):
    """
    Generator that yields Fibonacci numbers.
    
    Args:
        max_value: Optional maximum value to stop at
        
    Yields:
        Next Fibonacci number in the sequence
    """
    a, b = 0, 1
    while max_value is None or a <= max_value:
        yield a
        a, b = b, a + b


if __name__ == "__main__":
    # Example usage
    print("First 10 Fibonacci numbers:")
    print(fibonacci_sequence(10))
    
    print("\nFibonacci number at position 20:")
    print(fibonacci(20))
    
    print("\nFibonacci numbers up to 100:")
    for num in fibonacci_generator(100):
        print(num, end=" ")
    print()