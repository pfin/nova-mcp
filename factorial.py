#!/usr/bin/env python3
"""
Factorial calculation module with both iterative and recursive implementations.
"""

from typing import Union


def factorial_recursive(n: int) -> int:
    """
    Calculate factorial using recursion.
    
    Args:
        n: Non-negative integer to calculate factorial of
        
    Returns:
        The factorial of n (n!)
        
    Raises:
        ValueError: If n is negative
        TypeError: If n is not an integer
        RecursionError: If n is too large for Python's recursion limit
    """
    if not isinstance(n, int):
        raise TypeError(f"Expected int, got {type(n).__name__}")
    
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    
    # Base cases
    if n in (0, 1):
        return 1
    
    # Recursive case
    try:
        return n * factorial_recursive(n - 1)
    except RecursionError:
        raise RecursionError(f"Input {n} is too large for recursive calculation")


def factorial_iterative(n: int) -> int:
    """
    Calculate factorial using iteration.
    
    Args:
        n: Non-negative integer to calculate factorial of
        
    Returns:
        The factorial of n (n!)
        
    Raises:
        ValueError: If n is negative
        TypeError: If n is not an integer
    """
    if not isinstance(n, int):
        raise TypeError(f"Expected int, got {type(n).__name__}")
    
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    
    result = 1
    for i in range(2, n + 1):
        result *= i
    
    return result


def factorial(n: int, method: str = "iterative") -> int:
    """
    Calculate factorial using the specified method.
    
    Args:
        n: Non-negative integer to calculate factorial of
        method: Either "iterative" or "recursive" (default: "iterative")
        
    Returns:
        The factorial of n (n!)
        
    Raises:
        ValueError: If n is negative or method is invalid
        TypeError: If n is not an integer
        RecursionError: If using recursive method with large n
        
    Examples:
        >>> factorial(5)
        120
        >>> factorial(5, "recursive")
        120
        >>> factorial(0)
        1
        >>> factorial(-1)
        Traceback (most recent call last):
            ...
        ValueError: Factorial is not defined for negative numbers
    """
    if method == "iterative":
        return factorial_iterative(n)
    elif method == "recursive":
        return factorial_recursive(n)
    else:
        raise ValueError(f"Invalid method: {method}. Use 'iterative' or 'recursive'")


def main():
    """Demonstrate factorial calculations."""
    print("Factorial Calculator Demo")
    print("=" * 40)
    
    # Test cases
    test_values = [0, 1, 5, 10, 20]
    
    for val in test_values:
        try:
            iter_result = factorial(val, "iterative")
            rec_result = factorial(val, "recursive")
            print(f"{val}! = {iter_result} (iterative) = {rec_result} (recursive)")
        except Exception as e:
            print(f"Error calculating {val}!: {e}")
    
    # Test error handling
    print("\nError Handling Tests:")
    print("-" * 40)
    
    # Test negative number
    try:
        factorial(-5)
    except ValueError as e:
        print(f"✓ Caught error for negative input: {e}")
    
    # Test non-integer
    try:
        factorial(5.5)
    except TypeError as e:
        print(f"✓ Caught error for float input: {e}")
    
    # Test invalid method
    try:
        factorial(5, "invalid")
    except ValueError as e:
        print(f"✓ Caught error for invalid method: {e}")
    
    # Test recursion limit
    print("\nTesting recursion limit...")
    try:
        factorial(10000, "recursive")
    except RecursionError as e:
        print(f"✓ Caught recursion error: {e}")
    
    # Large factorial with iterative method
    large_n = 100
    result = factorial(large_n, "iterative")
    print(f"\n{large_n}! has {len(str(result))} digits")


if __name__ == "__main__":
    main()