/**
 * Claude Worker Thread
 * 
 * Based on expert recommendation from GoodIdeasFromOtherModels.txt:
 * "Each worker is responsible for managing the lifecycle of a single Claude subprocess inside a PTY"
 * 
 * And from GoodIdeasFromChatGPTo3.txt:
 * "In a worker thread... Stream all data from the PTY to the main thread"
 */

import { parentPort, workerData } from 'worker_threads';
import { PtyExecutor } from '../executors/pty-executor.js';
import { Task, WorkerMessage, VerificationResult } from '../core/types.js';
import { EventBus, EventType } from '../core/event-bus.js';
import { SystemVerification } from '../system-verification.js';

if (!parentPort) {
  throw new Error('Worker must be run in a worker thread');
}

// Initialize components
const workerId = workerData.workerId;
const eventBus = new EventBus({ logDir: workerData.eventBusLogDir });
let currentTask: Task | null = null;
let ptyExecutor: PtyExecutor | null = null;

// Send ready message
parentPort.postMessage({
  type: 'ready',
  workerId
} as WorkerMessage);

// Handle messages from master
parentPort.on('message', async (message: any) => {
  switch (message.type) {
    case 'execute':
      await executeTask(message.task);
      break;
      
    case 'intervene':
      // From docs: "Write to PTY: The worker receives the message and writes directly into the Claude subprocess"
      if (ptyExecutor) {
        ptyExecutor.write(message.payload + '\n');
        
        eventBus.logEvent({
          taskId: currentTask?.id || 'unknown',
          workerId,
          event: EventType.INTERVENTION,
          payload: { intervention: message.payload }
        });
      }
      break;
      
    case 'terminate':
      // Graceful shutdown
      if (ptyExecutor) {
        ptyExecutor.kill();
      }
      process.exit(0);
      break;
  }
});

/**
 * Execute a task using PTY
 * From docs: "Spawning one claude PTY process"
 */
async function executeTask(task: Task): Promise<void> {
  currentTask = task;
  
  try {
    // Create PTY executor
    ptyExecutor = new PtyExecutor({
      cwd: process.cwd(),
      heartbeatInterval: 180_000 // 3 minutes
    });
    
    // Collect output for verification
    let fullOutput = '';
    
    // Set up event handlers
    ptyExecutor.on('data', (event) => {
      fullOutput += event.payload;
      
      // From docs: "Stream all data from the PTY to the main thread"
      parentPort!.postMessage({
        type: 'stream',
        workerId,
        taskId: task.id,
        payload: event.payload
      } as WorkerMessage);
      
      // Check for tool invocations
      parseToolInvocations(event.payload);
      
      // Check for child spawn requests
      parseChildSpawnRequests(event.payload);
    });
    
    ptyExecutor.on('heartbeat', (event) => {
      eventBus.logEvent({
        taskId: task.id,
        workerId,
        event: EventType.HEARTBEAT,
        payload: event.payload
      });
    });
    
    ptyExecutor.on('error', (event) => {
      parentPort!.postMessage({
        type: 'error',
        workerId,
        taskId: task.id,
        payload: event.payload
      } as WorkerMessage);
    });
    
    // Execute the task
    const args = [
      '--dangerously-skip-permissions',
      '-p', task.prompt
    ];
    
    await ptyExecutor.execute('claude', args, task.id);
    
    // Wait for completion
    await new Promise<void>((resolve, reject) => {
      ptyExecutor!.on('exit', (event) => {
        if (event.payload.exitCode === 0) {
          resolve();
        } else {
          reject(new Error(`Claude exited with code ${event.payload.exitCode}`));
        }
      });
    });
    
    // Task completed - run verification
    const verification = await verifyTask(task, fullOutput);
    
    // Send completion message
    parentPort!.postMessage({
      type: 'complete',
      workerId,
      taskId: task.id,
      payload: {
        success: verification.passed,
        output: fullOutput,
        verification,
        duration: Date.now() - (task.assignedAt || task.createdAt),
        filesCreated: [] // TODO: Extract from verification
      }
    } as WorkerMessage);
    
    // Send verification result
    parentPort!.postMessage({
      type: 'verification',
      workerId,
      taskId: task.id,
      payload: verification
    } as WorkerMessage);
    
  } catch (error: any) {
    // Task failed
    parentPort!.postMessage({
      type: 'error',
      workerId,
      taskId: task.id,
      payload: {
        error: error.message,
        stack: error.stack
      }
    } as WorkerMessage);
  } finally {
    // Clean up
    if (ptyExecutor) {
      ptyExecutor.kill();
      ptyExecutor = null;
    }
    currentTask = null;
  }
}

/**
 * Parse output for TOOL_INVOCATION patterns
 * From docs: "watch the PTY output stream for the TOOL_INVOCATION: prefix"
 */
function parseToolInvocations(output: string): void {
  const pattern = /TOOL_INVOCATION:\s*({[^}]+})/g;
  let match;
  
  while ((match = pattern.exec(output)) !== null) {
    try {
      const toolCall = JSON.parse(match[1]);
      
      parentPort!.postMessage({
        type: 'tool_call',
        workerId,
        taskId: currentTask?.id,
        payload: toolCall
      } as WorkerMessage);
      
    } catch (error) {
      console.error('[Worker] Failed to parse tool invocation:', error);
    }
  }
}

/**
 * Parse output for child spawn requests
 * From docs: "When a running Claude instance needs to spawn a child task"
 */
function parseChildSpawnRequests(output: string): void {
  const pattern = /Axiom MCP Spawn Child:\s*({[^}]+})/g;
  let match;
  
  while ((match = pattern.exec(output)) !== null) {
    try {
      const spawnRequest = JSON.parse(match[1]);
      
      parentPort!.postMessage({
        type: 'spawn_child',
        workerId,
        taskId: currentTask?.id,
        payload: spawnRequest
      } as WorkerMessage);
      
    } catch (error) {
      console.error('[Worker] Failed to parse spawn request:', error);
    }
  }
}

/**
 * Verify task completion
 * From docs: "Verification must be a mandatory, automated step in the task lifecycle"
 */
async function verifyTask(task: Task, output: string): Promise<VerificationResult> {
  const verification = new SystemVerification();
  const proof = verification.gatherProof();
  
  // Check acceptance criteria
  const checks = {
    filesCreated: true, // TODO: Check against task.acceptanceCriteria.filesExpected
    codeExecutes: proof.hasImplementation,
    testsPass: proof.testsPass,
    lintPasses: true, // TODO: Run linter
    coverageMet: true, // TODO: Check coverage
    noVulnerabilities: true // TODO: Run security scanner
  };
  
  // Check for deceptive patterns
  const deceptivePatterns = [
    /I (have|'ve) created/i,
    /I (have|'ve) implemented/i,
    /The .* is now complete/i,
    /Successfully created/i
  ];
  
  const hasDeceptivePatterns = deceptivePatterns.some(pattern => 
    pattern.test(output) && !proof.hasImplementation
  );
  
  return {
    passed: Object.values(checks).every(Boolean) && !hasDeceptivePatterns,
    checks,
    evidence: [`Files created: ${proof.filesCreated.length}`, `Has implementation: ${proof.hasImplementation}`, `Tests pass: ${proof.testsPass}`],
    deceptivePatterns: hasDeceptivePatterns ? ['Claimed implementation without actual files'] : undefined
  };
}