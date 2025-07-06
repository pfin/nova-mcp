// Simple addition function
function add(a, b) {
  return a + b;
}

// Test the function with some examples
console.log('Testing add function:');
console.log('add(2, 3) =', add(2, 3));
console.log('add(10, 20) =', add(10, 20));
console.log('add(-5, 5) =', add(-5, 5));
console.log('add(0.5, 0.5) =', add(0.5, 0.5));
console.log('add(100, 200) =', add(100, 200));

// Export the function for use in other modules
module.exports = add;