/**
 * Task Worker for Axiom MCP v2
 * 
 * Executes tasks using PTY or SDK based on requirements
 * Reports all events back to parent thread
 */

import { parentPort, workerData } from 'worker_threads';
import { PtyExecutor } from '../executors/pty-executor.js';
import { SdkExecutor } from '../executors/sdk-executor.js';
import { EventType } from '../core/event-bus.js';

interface WorkerMessage {
  type: 'execute' | 'inject' | 'kill';
  task?: Task;
  data?: string;
}

interface Task {
  id: string;
  prompt: string;
  interactive?: boolean;
  requiresPermissions?: boolean;
  maxTurns?: number;
  timeout?: number;
  workingDir?: string;
}

interface WorkerResponse {
  type: 'stream' | 'complete' | 'error' | 'event';
  taskId: string;
  data?: any;
}

// Worker initialization
const workerId = workerData?.workerId || 'worker-' + Date.now();
let currentExecutor: PtyExecutor | SdkExecutor | null = null;

// Log function
function log(message: string): void {
  console.log(`[${workerId}] ${message}`);
}

// Send response to parent
function send(response: WorkerResponse): void {
  if (parentPort) {
    parentPort.postMessage(response);
  }
}

// Main message handler
if (parentPort) {
  parentPort.on('message', async (message: WorkerMessage) => {
    log(`Received message: ${message.type}`);
    
    switch (message.type) {
      case 'execute':
        if (!message.task) {
          send({ type: 'error', taskId: 'unknown', data: 'No task provided' });
          return;
        }
        await executeTask(message.task);
        break;
        
      case 'inject':
        if (currentExecutor && currentExecutor instanceof PtyExecutor) {
          currentExecutor.write(message.data || '');
          send({ 
            type: 'event', 
            taskId: 'current',
            data: { event: EventType.INTERVENTION, payload: message.data }
          });
        }
        break;
        
      case 'kill':
        if (currentExecutor) {
          if (currentExecutor instanceof PtyExecutor) {
            currentExecutor.kill();
          }
          currentExecutor = null;
        }
        break;
    }
  });
}

async function executeTask(task: Task): Promise<void> {
  log(`Executing task ${task.id}: ${task.prompt.substring(0, 50)}...`);
  
  try {
    // Send start event
    send({
      type: 'event',
      taskId: task.id,
      data: { event: EventType.TASK_START, payload: { prompt: task.prompt } }
    });
    
    // Decision logic from GoodIdeas
    if (task.interactive || task.requiresPermissions) {
      log('Using PTY executor for interactive task');
      await executePtyTask(task);
    } else {
      log('Using SDK executor for non-interactive task');
      await executeSdkTask(task);
    }
    
    // Send complete event
    send({
      type: 'complete',
      taskId: task.id,
      data: { success: true }
    });
    
  } catch (error) {
    log(`Task ${task.id} failed: ${error}`);
    send({
      type: 'error',
      taskId: task.id,
      data: error
    });
  } finally {
    currentExecutor = null;
  }
}

async function executePtyTask(task: Task): Promise<void> {
  const executor = new PtyExecutor({
    cwd: task.workingDir || process.cwd(),
    heartbeatInterval: 180_000 // 3 minutes
  });
  
  currentExecutor = executor;
  
  // Set up event forwarding
  executor.on('data', (event) => {
    send({
      type: 'stream',
      taskId: task.id,
      data: event
    });
  });
  
  executor.on('heartbeat', (event) => {
    send({
      type: 'event',
      taskId: task.id,
      data: { event: EventType.HEARTBEAT, payload: event.payload }
    });
  });
  
  executor.on('exit', (event) => {
    send({
      type: 'event',
      taskId: task.id,
      data: { event: EventType.TASK_COMPLETE, payload: event.payload }
    });
  });
  
  // Execute with recommended flags
  await executor.execute('claude', [
    '--dangerously-skip-permissions',
    '-p', task.prompt
  ], task.id);
}

async function executeSdkTask(task: Task): Promise<void> {
  const executor = new SdkExecutor({
    cwd: task.workingDir || process.cwd(),
    maxTurns: task.maxTurns || 10
  });
  
  currentExecutor = executor;
  
  // Set up event forwarding
  executor.on('delta', (event) => {
    send({
      type: 'stream',
      taskId: task.id,
      data: event
    });
  });
  
  executor.on('tool_call', (event) => {
    send({
      type: 'event',
      taskId: task.id,
      data: { event: EventType.TOOL_CALL, payload: event.payload }
    });
  });
  
  executor.on('complete', (event) => {
    send({
      type: 'event',
      taskId: task.id,
      data: { event: EventType.TASK_COMPLETE, payload: event.payload }
    });
  });
  
  // Execute
  await executor.execute(task.prompt, task.id);
}

// Log worker startup
log('Worker initialized and ready');