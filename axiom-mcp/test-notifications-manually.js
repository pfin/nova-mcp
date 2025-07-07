#!/usr/bin/env node

console.log(`
Axiom V4 Notification Test Instructions
======================================

1. Start the MCP inspector:
   npx @modelcontextprotocol/inspector dist-v4/index.js

2. In the inspector, run these commands:

Test 1 - Basic Streaming:
-------------------------
axiom_spawn({ 
  prompt: "Write a Python script that counts from 1 to 5, printing each number", 
  verboseMasterMode: true 
})

Expected: 
- Immediate return with task ID
- Notifications appear showing Claude's output
- See the Python code being written in real-time

Test 2 - Send Message Mid-Stream:
---------------------------------
axiom_spawn({ 
  prompt: "Create a function to calculate factorial", 
  verboseMasterMode: true 
})

// Note the task ID, then quickly:
axiom_send({ 
  taskId: "task-xxx", 
  message: "Make it recursive with memoization" 
})

Expected:
- See Claude start writing factorial
- Message appears in stream
- Implementation changes to recursive with memoization

Test 3 - Check Output:
----------------------
axiom_output({ taskId: "task-xxx" })

Expected:
- Shows all accumulated output so far

3. Check if files were created as expected!
`);