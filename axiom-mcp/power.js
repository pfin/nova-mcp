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

export default power;