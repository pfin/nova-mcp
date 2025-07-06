def factorial(n):
    """
    Calculate factorial of n without using recursion.
    Uses iterative approach with a loop.
    
    Args:
        n: Non-negative integer
        
    Returns:
        The factorial of n (n!)
        
    Raises:
        ValueError: If n is negative
        TypeError: If n is not an integer
    """
    # Type checking
    if not isinstance(n, int):
        raise TypeError(f"Factorial is only defined for integers, got {type(n).__name__}")
    
    # Handle negative numbers
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    
    # Base case: 0! = 1
    if n == 0:
        return 1
    
    # Calculate factorial iteratively
    result = 1
    for i in range(1, n + 1):
        result *= i
    
    return result


# Test the function
if __name__ == "__main__":
    # Test cases
    test_cases = [0, 1, 5, 10, 20]
    
    print("Testing factorial function (iterative):")
    print("-" * 40)
    
    for n in test_cases:
        result = factorial(n)
        print(f"factorial({n}) = {result}")
    
    print("\nTesting edge cases:")
    print("-" * 40)
    
    # Test with a larger number
    print(f"factorial(15) = {factorial(15)}")
    
    # Test error cases
    try:
        factorial(-1)
    except ValueError as e:
        print(f"factorial(-1) raised ValueError: {e}")
    
    try:
        factorial(3.14)
    except TypeError as e:
        print(f"factorial(3.14) raised TypeError: {e}")
    
    # Verify some known values
    print("\nVerification of known values:")
    print("-" * 40)
    assert factorial(0) == 1, "0! should be 1"
    assert factorial(1) == 1, "1! should be 1"
    assert factorial(5) == 120, "5! should be 120"
    assert factorial(10) == 3628800, "10! should be 3,628,800"
    print("All assertions passed!")