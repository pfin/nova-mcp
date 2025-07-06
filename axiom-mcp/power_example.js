import power from './power.js';

// Example usage
console.log("Basic examples:");
console.log("2^8 =", power(2, 8));        // 256
console.log("10^3 =", power(10, 3));      // 1000
console.log("5^0 =", power(5, 0));        // 1

console.log("\nNegative exponents:");
console.log("2^-2 =", power(2, -2));      // 0.25
console.log("10^-1 =", power(10, -1));    // 0.1

console.log("\nNegative bases:");
console.log("(-3)^2 =", power(-3, 2));    // 9
console.log("(-3)^3 =", power(-3, 3));    // -27