/**
 * Test-Driven Development Example
 * 
 * Build features with tests using Axiom's intervention system.
 */

// Step 1: Create the test first
axiom_spawn({
  prompt: "Create user.test.js with Jest tests for user registration, login, and profile update",
  verboseMasterMode: true
});

// Step 2: Implement the feature
axiom_spawn({
  prompt: "Create user.js that makes all tests in user.test.js pass",
  verboseMasterMode: true
});

// Axiom ensures:
// - Tests have actual assertions, not TODOs
// - Implementation has real code, not stubs
// - Both files created within minutes

// Parallel TDD for multiple features
const features = [
  { test: "auth.test.js", impl: "auth.js" },
  { test: "product.test.js", impl: "product.js" },
  { test: "cart.test.js", impl: "cart.js" }
];

features.forEach(({ test, impl }) => {
  // Create test
  axiom_spawn({
    prompt: `Create ${test} with comprehensive tests`,
    verboseMasterMode: true
  });
  
  // Then implementation
  setTimeout(() => {
    axiom_spawn({
      prompt: `Create ${impl} to pass all tests in ${test}`,
      verboseMasterMode: true
    });
  }, 60000); // 1 minute delay
});

// Result: Full test coverage + implementation in ~10 minutes