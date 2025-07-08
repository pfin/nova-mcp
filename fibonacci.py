#!/usr/bin/env python3
"""
Fibonacci sequence calculator
"""

def fibonacci(n):
    """
    Calculate the nth Fibonacci number.
    
    Args:
        n: The position in the Fibonacci sequence (0-indexed)
        
    Returns:
        The nth Fibonacci number
    """
    if n < 0:
        raise ValueError("Position must be non-negative")
    elif n == 0:
        return 0
    elif n == 1:
        return 1
    else:
        # Iterative approach for efficiency
        a, b = 0, 1
        for _ in range(2, n + 1):
            a, b = b, a + b
        return b


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