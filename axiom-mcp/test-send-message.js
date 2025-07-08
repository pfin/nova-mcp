#!/usr/bin/env node

/**
 * Test sending messages to running tasks
 */

console.log('Test: Sending messages to running tasks\n');

console.log('Step 1: Start a task to create a Python program');
console.log('axiom_spawn({ prompt: "Create a simple calculator in Python" })');
console.log('\nExpected: Task starts, begins creating Python code');

console.log('\nStep 2: Send message to change to Java');
console.log('axiom_send({ taskId: "task-xxx", message: "Actually, make it in Java instead" })');
console.log('\nExpected: Task receives message and switches to Java');

console.log('\nStep 3: Check status');
console.log('axiom_status({ taskId: "task-xxx" })');
console.log('\nExpected: Shows task running with output');

console.log('\nStep 4: Check if file was created');
console.log('After task completes, check for Calculator.java file');

console.log('\n\nManual Test Instructions:');
console.log('1. Run: npx @modelcontextprotocol/inspector dist-v4/index.js');
console.log('2. Call axiom_spawn with prompt to create Python calculator');
console.log('3. Note the task ID returned');
console.log('4. Quickly call axiom_send with that task ID and message to switch to Java');
console.log('5. Watch the output to see if it switches');
console.log('6. Check if Calculator.java is created at the end');