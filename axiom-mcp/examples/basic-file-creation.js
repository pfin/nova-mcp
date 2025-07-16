/**
 * Basic File Creation Example
 * 
 * This example shows how Axiom forces immediate file creation
 * instead of planning about creating files.
 */

// Simple file creation task
axiom_spawn({
  prompt: "Create hello.py that prints 'Hello from Axiom!'",
  verboseMasterMode: true
});

// What you'll see:
// 1. Task starts
// 2. If Claude tries to say "I'll create a Python script..."
// 3. Axiom interrupts: "Stop planning! Create hello.py NOW!"
// 4. Claude creates the actual file
// 5. hello.py exists on disk

// Result: Real file in ~30 seconds instead of 5 minutes of planning