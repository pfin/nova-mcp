# Gemini Detailed Implementation Feedback for Axiom MCP

**Date:** July 6, 2025

This document provides concrete, code-level recommendations to fix the critical gaps in the Axiom MCP project. The focus is on replacing the flawed execution layer and wiring together the existing high-level architectural components.

## 1. The Foundation: A Standardized `VerificationProof`

To connect verification with the MCTS reward system, we need a standardized, machine-readable data structure for what "proof" means. This should be defined in `src/task-types.ts` or a similar central location.

**Recommendation:** Define the following interface:

```typescript
// in src/task-types.ts

export interface VerificationProof {
  // File System Artifacts
  filesCreated: Array<{ path: string; size: number; }>;
  filesModified: Array<{ path:string; diff: string; }>;
  filesDeleted: string[];

  // Execution & Testing
  exitCode: number | null;       // Exit code of the main process
  testsRun: number;
  testsPassed: number;
  coveragePercent: number;
  ranWithoutError: boolean;      // Did the process complete without throwing an exception?

  // LLM Behavior Analysis
  deceptivePatternsFound: string[]; // e.g., ["Claimed to create file but did not"]
  toolCallsMade: number;
  finalOutput: string;           // The final raw output from the LLM
}
```

This interface becomes the **data contract** for every task. The goal of any execution is to produce this object. The MCTS engine will use this object to calculate a reward.

## 2. The Anchor Fix: A Robust `PtyExecutor`

The highest priority is to replace all forms of subprocess execution with a single, reliable `PtyExecutor`. This class should wrap `node-pty` and be the **only** module in the system that interacts directly with the `claude` CLI.

**Recommendation:** Create `src-v3/executors/pty-executor.ts` with the following implementation.

```typescript
// in src-v3/executors/pty-executor.ts

import { spawn, IPty } from 'node-pty';
import { EventEmitter } from 'events';
import { SystemVerification } from '../system-verification.js'; // Assuming path
import { VerificationProof } from '../task-types.js'; // Assuming path

export class PtyExecutor extends EventEmitter {
  private ptyProcess: IPty | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private outputBuffer: string = '';
  private taskId: string;

  constructor(taskId: string) {
    super();
    this.taskId = taskId;
  }

  public async execute(prompt: string, workingDir: string): Promise<VerificationProof> {
    return new Promise((resolve, reject) => {
      this.ptyProcess = spawn('claude',
        ['--dangerously-skip-permissions', '-p', prompt],
        {
          name: 'xterm-color',
          cols: 120,
          rows: 40,
          cwd: workingDir,
          env: { ...process.env, FORCE_COLOR: '0' },
        }
      );

      this.startHeartbeat();

      this.ptyProcess.onData((data: string) => {
        this.outputBuffer += data;
        this.emit('data', data); // For real-time streaming
        process.stdout.write(data); // For local debugging
      });

      this.ptyProcess.onExit(async ({ exitCode }) => {
        this.stopHeartbeat();
        console.log(`[PtyExecutor] Process for task ${this.taskId} exited with code ${exitCode}.`);

        // CRITICAL: Verification happens here
        const verifier = new SystemVerification(this.taskId, workingDir);
        try {
          const proof = await verifier.gatherProof(this.outputBuffer, exitCode);
          resolve(proof);
        } catch (verificationError) {
          reject(verificationError);
        }
      });

      this.ptyProcess.on('error', (err) => {
          this.stopHeartbeat();
          console.error(`[PtyExecutor] Error for task ${this.taskId}:`, err);
          reject(err);
      });
    });
  }

  public write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  public kill(): void {
    this.stopHeartbeat();
    if (this.ptyProcess) {
      this.ptyProcess.kill();
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ptyProcess) {
        // Send a null character to keep the connection alive without affecting the prompt
        this.ptyProcess.write('\x00');
        this.emit('heartbeat');
      }
    }, 180000); // 3 minutes
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }
}
```

## 3. Closing the Loop: Wiring Verification to MCTS Rewards

With a reliable `PtyExecutor` that returns a `VerificationProof`, you can now implement the MCTS reward function as designed. This is the most important step for making the agent learn.

**Recommendation:** Implement `calculateReward` in `src/mcts-engine.ts`.

```typescript
// in src/mcts-engine.ts

import { VerificationProof } from './task-types.ts';

// ... inside the MCTSEngine class

private calculateReward(proof: VerificationProof): number {
  let reward = 0.0;

  if (!proof.ranWithoutError || proof.exitCode !== 0) {
    return -1.0; // Catastrophic failure, prune this branch
  }

  // Positive rewards for tangible progress
  if (proof.filesCreated.length > 0) reward += 0.2;
  if (proof.filesModified.length > 0) reward += 0.1;
  if (proof.testsRun > 0) reward += 0.2;
  if (proof.testsPassed === proof.testsRun && proof.testsRun > 0) {
    reward += 0.5; // Big bonus for all tests passing
  }

  // Partial credit for test coverage
  reward += (proof.coveragePercent / 100) * 0.3;

  // Penalties for bad behavior
  if (proof.deceptivePatternsFound.length > 0) {
    reward -= 0.4; // Heavy penalty for lying
  }

  // Ensure reward is capped between -1 and 1
  return Math.max(-1, Math.min(1, reward));
}

// The simulation step would now look like this:
public async simulate(node: MCTSNode): Promise<number> {
    const executor = new PtyExecutor(node.task.id);
    const proof = await executor.execute(node.task.prompt, node.task.workingDir);
    const reward = this.calculateReward(proof);
    this.backpropagate(node, reward);
    return reward;
}
```

## 4. Refactoring a Core Tool: `axiom-mcp-implement`

All tools that execute code must be refactored to use the new `PtyExecutor`. They should no longer contain any retry logic themselves; the MCTS engine's search handles retries at a higher level.

**Recommendation:** Refactor `src/tools/axiom-mcp-implement.ts`.

```typescript
// in src/tools/axiom-mcp-implement.ts

import { PtyExecutor } from '../../src-v3/executors/pty-executor.js';
import { VerificationProof } from '../task-types.js';

// ... (schema definition remains the same)

export async function handleAxiomMcpImplement(input: AxiomMcpImplementInput): Promise<{ content: Array<{ type: string; text: string; }> }> {
  const taskId = `implement-${Date.now()}`;
  const executor = new PtyExecutor(taskId);

  try {
    // The prompt is now focused solely on the implementation task
    const detailedPrompt = `Based on the goal \"${input.goal}\" and the plan provided, write the necessary code. Save files to the current directory.`;

    const proof: VerificationProof = await executor.execute(detailedPrompt, process.cwd());

    // The tool's output is now a structured report based on the proof
    const responseText = `## Implementation Result for: ${input.goal}\n\n` +
                       `**Status:** ${proof.testsPassed === proof.testsRun && proof.testsRun > 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS'}\n` +
                       `**Verification Summary:**\n` +
                       `- Files Created: ${proof.filesCreated.length}\n` +
                       `- Tests Passed: ${proof.testsPassed}/${proof.testsRun}\n` +
                       `- Coverage: ${proof.coveragePercent}%\n\n` +
                       `**Full Output:**\n\`\`\`\n${proof.finalOutput}\n\`\`\`\n`;

    return {
      content: [{ type: 'text', text: responseText }]
    };

  } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
          content: [{ type: 'text', text: `Implementation task ${taskId} failed: ${errorMessage}` }]
      };
  } finally {
      executor.kill();
  }
}
```

## 5. Sketch of the V3 `MasterController` and `TaskWorker`

The `v3` architecture is the correct end-state. Here is a conceptual sketch of how the `MasterController` would manage `TaskWorkers`.

```typescript
// in src-v3/core/master-controller.ts

import { Worker } from 'worker_threads';
import { Task } from './types';

class MasterController {
  private taskQueue: Task[] = [];
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];

  constructor(numWorkers: number) {
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker('./dist-v3/workers/task-worker.js', { workerData: { workerId: i } });
      this.workers.push(worker);
      this.idleWorkers.push(worker);

      worker.on('message', (result: { taskId: string, proof: VerificationProof }) => {
        console.log(`Task ${result.taskId} completed.`);
        // TODO: Update task status in a central manager
        // TODO: Backpropagate reward in MCTS engine

        this.idleWorkers.push(worker); // Return worker to idle pool
        this.dispatch(); // Check for more tasks
      });
    }
  }

  public addTask(task: Task) {
    this.taskQueue.push(task);
    this.dispatch();
  }

  private dispatch() {
    if (this.taskQueue.length > 0 && this.idleWorkers.length > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.idleWorkers.shift()!;
      worker.postMessage(task);
    }
  }
}

// in src-v3/workers/task-worker.ts

import { parentPort, workerData } from 'worker_threads';
import { PtyExecutor } from '../executors/pty-executor';
import { Task } from '../core/types';

parentPort?.on('message', async (task: Task) => {
  console.log(`[Worker ${workerData.workerId}] Received task ${task.id}`);
  const executor = new PtyExecutor(task.id);
  const proof = await executor.execute(task.prompt, task.workingDir);
  parentPort?.postMessage({ taskId: task.id, proof });
});
```

By implementing these specific, detailed changes, you will systematically replace the project's weaknesses with robust, state-of-the-art solutions, finally allowing the visionary MCTS architecture to perform as designed.
