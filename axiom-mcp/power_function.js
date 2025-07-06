/**
 * Calculates x raised to the power of y without using Math.pow()
 * @param {number} x - The base number
 * @param {number} y - The exponent (must be an integer)
 * @returns {number} - The result of x^y
 */
function power(x, y) {
    // Handle special cases
    if (y === 0) {
        return 1; // Any number to the power of 0 is 1
    }
    
    // Handle negative exponents
    let isNegativeExponent = false;
    if (y < 0) {
        isNegativeExponent = true;
        y = -y; // Make y positive for calculation
    }
    
    // Calculate power using a loop
    let result = 1;
    for (let i = 0; i < y; i++) {
        result *= x;
    }
    
    // If exponent was negative, return reciprocal
    if (isNegativeExponent) {
        result = 1 / result;
    }
    
    return result;
}

// Test the function with various cases
console.log("Testing power function:");
console.log("power(2, 3) =", power(2, 3));         // Should be 8
console.log("power(5, 2) =", power(5, 2));         // Should be 25
console.log("power(10, 0) =", power(10, 0));       // Should be 1
console.log("power(2, -3) =", power(2, -3));       // Should be 0.125
console.log("power(3, 4) =", power(3, 4));         // Should be 81
console.log("power(-2, 3) =", power(-2, 3));       // Should be -8
console.log("power(-2, 4) =", power(-2, 4));       // Should be 16
console.log("power(1.5, 2) =", power(1.5, 2));     // Should be 2.25

// Compare with Math.pow to verify correctness
console.log("\nVerification against Math.pow():");
const testCases = [
    [2, 3], [5, 2], [10, 0], [2, -3], [3, 4], [-2, 3], [-2, 4], [1.5, 2]
];

testCases.forEach(([base, exp]) => {
    const ourResult = power(base, exp);
    const mathPowResult = Math.pow(base, exp);
    const match = ourResult === mathPowResult ? "✓" : "✗";
    console.log(`power(${base}, ${exp}) = ${ourResult}, Math.pow = ${mathPowResult} ${match}`);
});