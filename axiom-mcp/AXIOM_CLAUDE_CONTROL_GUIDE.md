# Axiom Claude Control Guide

## CRITICAL: When axiom_spawn starts a Claude instance

The task starts a `claude` CLI command which requires specific handling:

### Step-by-Step Process

1. **Task spawns Claude CLI**
   ```json
   axiom_spawn({ "prompt": "Create file.py..." })
   // Returns: { "taskId": "task-xxx" }
   ```

2. **Claude shows trust dialog**
   - Output will show: "Do you trust the files in this folder?"
   - Options: "1. Yes, proceed" or "2. No, exit"

3. **Send trust confirmation**
   ```json
   axiom_send({
     "taskId": "task-xxx",
     "message": "1"  // Select "Yes, proceed"
   })
   ```

4. **Wait for Claude welcome screen**
   - Look for "Welcome to Claude Code!"
   - Claude is now ready for input

5. **Send the actual prompt**
   ```json
   axiom_send({
     "taskId": "task-xxx",
     "message": "Create compound_interest.py with..."
   })
   ```

6. **Submit the prompt**
   ```json
   axiom_send({
     "taskId": "task-xxx", 
     "message": "\r"  // Ctrl+Enter to submit
   })
   ```

### Complete Example for LLMs

```javascript
// 1. Start task
const result = await axiom_spawn({
  "prompt": "Create fibonacci.py with recursive function"
});
const taskId = result.taskId;

// 2. Check output until you see trust dialog
await axiom_output({ "taskId": taskId });
// Look for: "Do you trust the files in this folder?"

// 3. Send trust confirmation
await axiom_send({ "taskId": taskId, "message": "1" });

// 4. Wait and check for welcome screen
// Wait 2-3 seconds
await axiom_output({ "taskId": taskId });
// Look for: "Welcome to Claude Code!"

// 5. Send actual prompt
await axiom_send({ 
  "taskId": taskId, 
  "message": "Create fibonacci.py with recursive function"
});

// 6. Submit with Ctrl+Enter
await axiom_send({ "taskId": taskId, "message": "\r" });

// 7. Monitor progress
await axiom_status({ "taskId": taskId });
await axiom_output({ "taskId": taskId, "tail": 50 });
```

### Key Points for LLMs

- **axiom_spawn's prompt is just for validation** - it ensures the task is concrete
- **The ACTUAL prompt must be sent via axiom_send** after handling trust dialog
- **Always send "1" first** to accept trust dialog
- **Use "\r" (Ctrl+Enter)** to submit prompts to Claude
- **Monitor with axiom_output** to know when each step completes

### CRITICAL: File Approval Dialogs

When Claude creates files, it shows approval prompts:

```
Do you want to create hooks_research_2025.md?
❯ 1. Yes
  2. Yes, and don't ask again this session (shift+tab)
  3. No, and tell Claude what to do differently (esc)
```

**IMPORTANT: Send the NUMBER, not 'y' or 'yes'!**

```javascript
// WRONG - These won't work!
axiom_send({ "taskId": "task-xxx", "message": "y" })
axiom_send({ "taskId": "task-xxx", "message": "yes" })

// CORRECT - Send the menu option number
axiom_send({ "taskId": "task-xxx", "message": "1" })  // Approve once
axiom_send({ "taskId": "task-xxx", "message": "2" })  // Auto-approve all
```

This is the #1 cause of stuck tasks! Always monitor output for these prompts.

### Changing Language Mid-Execution

Once Claude is executing:

1. **Use axiom_interrupt**
   ```json
   axiom_interrupt({
     "taskId": "task-xxx",
     "followUp": "[INTERRUPT: CHANGE TO JAVA]"
   })
   ```

2. **Or send interrupt command**
   ```json
   axiom_send({
     "taskId": "task-xxx",
     "message": "[INTERRUPT: CHANGE TO TYPESCRIPT]"
   })
   ```

### Debugging Tips

- Use `axiom_output` with `tail` parameter to see recent output
- Check `axiom_status` for runtime to confirm task is active
- If stuck, use `axiom_interrupt` with `followUp: "exit"`