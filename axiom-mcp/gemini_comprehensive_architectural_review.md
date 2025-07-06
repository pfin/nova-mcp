# Gemini Comprehensive Architectural Review & Implementation Blueprint for Axiom MCP

**Date:** July 6, 2025
**Version:** 2.0
**Author:** Gemini
**Scope:** Full codebase review, architectural critique, and detailed implementation roadmap.

## Executive Summary

This document presents a foundational critique and a detailed, prescriptive blueprint for the Axiom MCP project. The project's current state is one of profound duality: it is built upon a visionary and state-of-the-art architectural concept (MCTS for agentic tasks) that is fundamentally crippled by a fragmented, fragile, and outdated execution layer. The project's own documentation exhibits a remarkably accurate self-awareness of this gap, but the path to bridging it requires more than just fixing bugs—it requires architectural consolidation and a ruthless commitment to a unified design.

The core problem is not a lack of good ideas, but a surplus of competing, partially implemented ones. The codebase is littered with the ghosts of past approaches (`src/`, `src-v2/`, multiple controllers), creating a significant maintenance and cognitive burden. The project must evolve from a research testbed into a production-ready system.

This review provides the following:
1.  **A Critical Architectural Analysis:** A no-holds-barred look at the philosophical and structural weaknesses of the current design, including leaky abstractions, state management fragmentation, and the crippling cost of the V2/V3 schism.
2.  **A Prescriptive Implementation Blueprint:** Detailed, near-complete reference implementations for the critical components of a robust V3 architecture, including a `MasterController`, `TaskWorker`, `StateManager`, and hardened `Executors`.
3.  **A Hardened MCTS Engine Design:** A full conceptual model for the MCTS engine, showing how it should operate asynchronously as the true "brain" of the system, driven by a robust `VerificationProof`.
4.  **A Rigorous Multi-Sprint Roadmap:** A clear, actionable plan to deprecate legacy code, implement the V3 architecture, and finally realize the project's full potential.

**The bottom line is this:** Axiom MCP must stop experimenting and start engineering. It must choose the V3 architecture, centralize its state, formalize its agent-tool model, and build the robust foundation that its brilliant MCTS concept deserves.

---

## Part 1: A Critical Analysis of the Current Architecture

Before prescribing solutions, we must be ruthlessly honest about the existing architectural flaws. These are not bugs, but design choices and patterns that inhibit stability, scalability, and maintainability.

### 1.1. The Leaky Abstraction: MCTS Awareness is Everywhere

**Observation:** The concept of Monte Carlo Tree Search is so foundational that it has "leaked" out of the `mcts-engine.ts` and into the design of the tools themselves. Tools like `axiom-mcp-spawn-mcts` and `axiom-mcp-chain` are explicitly aware of the search process, containing logic about depth, strategy, and decomposition.

**Critique:** This is a critical architectural flaw. The MCTS engine should be the **sole orchestrator** of the search. Tools should be simple, stateless functions that perform a single, well-defined task (e.g., `implement_code`, `run_tests`, `list_files`). They should have no knowledge of whether they are part of a search, a chain, or a simple one-shot command. When the MCTS logic is scattered across multiple tools, it becomes impossible to modify or improve the search algorithm centrally. You have an MCTS engine that doesn't have full control over its own search.

**Recommendation:** The `MCTSEngine` should be the only module that understands the tree structure. It decides when to expand a node and calls a generic `spawn_task` tool. The logic for *how* to decompose the task should be encapsulated within a dedicated `DecompositionAgent` or be part of the MCTS engine's expansion strategy, not a separate, user-facing tool.

### 1.2. The Identity Crisis: Are They Tools or Agents?

**Observation:** The project uses the term "tool" to describe the `axiom-mcp-*` modules. However, their descriptions and intended functions are highly agentic. They perform complex reasoning, make decisions, and orchestrate other actions. `axiom-mcp-chain`, for example, is not a simple tool; it's a recursive agent that manages its own state via a `ContextManager`.

**Critique:** This ambiguity leads to a confusing and inconsistent design. A "tool" should be dumb. It should take inputs and produce outputs, like `fs.writeFileSync`. An "agent" has a goal, maintains state, and can use tools to achieve its goal. Axiom MCP has created complex agents and called them tools, blurring the lines of responsibility.

**Recommendation:** Formalize the hierarchy:
*   **The Engine:** The `MCTSEngine` is the master agent.
*   **The Worker:** A `TaskWorker` (running in a `worker_thread`) is a subordinate agent that executes a single, well-defined `Task` given to it by a controller.
*   **The Tools:** These are simple, stateless functions that a worker can use. They should map directly to fundamental capabilities: `writeFile`, `readFile`, `runCommand`, `getGitDiff`, etc. The LLM, running within a worker, decides which of these simple tools to call.

### 1.3. The State Management Nightmare

**Observation:** The project's state is dangerously fragmented across multiple, uncoordinated sources:
*   `status/current.json`: A single JSON file, prone to race conditions and corruption.
*   `src/context-manager.ts`: An in-memory state manager for the `chain` tool, completely disconnected from everything else.
*   `logs/*.jsonl` and `streams/live-updates.jsonl`: Event logs that represent a historical view of state but are not easily queryable for the *current* state of a given task.
*   The MCTS nodes themselves, which exist only in the memory of the `MCTSEngine`.

**Critique:** This is not a scalable or reliable system. Without a single, transactional source of truth for the state of the MCTS tree and all tasks, you cannot guarantee consistency, recover from crashes, or accurately report on the system's status. The current design is guaranteed to lead to state corruption.

**Recommendation:** Implement a `StateManager` module backed by a lightweight, single-file database like **SQLite**. The `v3` architecture is perfectly suited for this. The `MasterController` would own the `StateManager`, and all state modifications (creating a task, updating a node's reward, logging an event) would go through it. This provides transactional integrity and a single source of truth.

### 1.4. The V2 vs. V3 Schism

**Observation:** The repository contains `src-v2` and `src-v3` (and the original `src`), which appear to be parallel, competing evolutions. `v2` introduces executors and workers. `v3` refines this into a more complete client-server model with a master controller.

**Critique:** This is a significant red flag in any software project. It signals architectural indecision and splits development effort. The ideas in `v2` are good stepping stones, but `v3` represents the correct architectural vision. Continuing to maintain `v2` is a waste of resources and introduces confusion.

**Recommendation:** **Immediately deprecate and delete the `src/` and `src-v2/` directories.** All future development must be focused exclusively on building out the `src-v3` architecture. This single act will provide immense clarity and focus to the project.

---

## Part 2: The V3 Implementation Blueprint

This section provides detailed, near-complete reference implementations for the core components of the V3 architecture. The goal is to provide a solid, engineered foundation to build upon.

### 2.1. The Central Nervous System: `StateManager`

This new module is the most critical addition. It will manage all persistent state in an SQLite database, providing the single source of truth the project desperately needs.

**File:** `src-v3/core/state-manager.ts`

```typescript
import Database from 'better-sqlite3';
import { Task, MCTSNode, VerificationProof } from './types'; // Assuming types are defined

export class StateManager {
  private db: Database.Database;

  constructor(dbPath: string = 'axiom-state.sqlite') {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mcts_nodes (
        id TEXT PRIMARY KEY,
        parentId TEXT,
        taskId TEXT NOT NULL,
        visits INTEGER NOT NULL DEFAULT 0,
        reward REAL NOT NULL DEFAULT 0.0,
        isTerminal BOOLEAN NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued', -- queued, running, verifying, failed, complete
        workerId TEXT,
        proof TEXT, -- JSON blob of VerificationProof
        createdAt TEXT NOT NULL,
        completedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS event_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        taskId TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL -- JSON blob
      );
    `);
  }

  // --- Task Methods ---
  public createTask(id: string, prompt: string): void {
    const stmt = this.db.prepare('INSERT INTO tasks (id, prompt, createdAt) VALUES (?, ?, ?)');
    stmt.run(id, prompt, new Date().toISOString());
  }

  public updateTaskStatus(id: string, status: string, workerId?: string): void {
    const stmt = this.db.prepare('UPDATE tasks SET status = ?, workerId = ? WHERE id = ?');
    stmt.run(status, workerId, id);
  }

  public completeTask(id: string, proof: VerificationProof): void {
    const stmt = this.db.prepare('UPDATE tasks SET status = \'complete\', proof = ?, completedAt = ? WHERE id = ?');
    stmt.run(JSON.stringify(proof), new Date().toISOString(), id);
  }

  public getTask(id: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    return stmt.get(id) as Task | null;
  }

  // --- MCTS Node Methods ---
  public createNode(node: MCTSNode): void {
    const stmt = this.db.prepare('INSERT INTO mcts_nodes (id, parentId, taskId, createdAt) VALUES (?, ?, ?, ?)');
    stmt.run(node.id, node.parentId, node.taskId, new Date().toISOString());
  }

  public updateNode(id: string, visits: number, reward: number): void {
    const stmt = this.db.prepare('UPDATE mcts_nodes SET visits = ?, reward = ? WHERE id = ?');
    stmt.run(visits, reward, id);
  }

  public getNode(id: string): MCTSNode | null {
     const stmt = this.db.prepare('SELECT * FROM mcts_nodes WHERE id = ?');
     return stmt.get(id) as MCTSNode | null;
  }

  // --- Event Logging ---
  public logEvent(taskId: string, type: string, payload: object): void {
    const stmt = this.db.prepare('INSERT INTO event_ledger (timestamp, taskId, type, payload) VALUES (?, ?, ?, ?)');
    stmt.run(new Date().toISOString(), taskId, type, JSON.stringify(payload));
  }
}
```

### 2.2. The Conductor: `MasterController`

The `MasterController` is the heart of the V3 architecture. It manages the worker pool, the task queue, and the `StateManager`. It dispatches tasks and processes results.

**File:** `src-v3/core/master-controller.ts`

```typescript
import { Worker } from 'worker_threads';
import { StateManager } from './state-manager';
import { Task } from './types';
import { MCTSEngine } from '../mcts-engine'; // Assuming path

export class MasterController {
  private stateManager: StateManager;
  private mctsEngine: MCTSEngine;
  private taskQueue: string[] = []; // Queue of task IDs
  private workers: Map<number, Worker> = new Map();
  private idleWorkers: number[] = [];

  constructor(numWorkers: number, dbPath: string) {
    this.stateManager = new StateManager(dbPath);
    this.mctsEngine = new MCTSEngine(this.stateManager, this);

    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker('./dist-v3/workers/task-worker.js', { workerData: { workerId: i } });
      this.workers.set(i, worker);
      this.idleWorkers.push(i);

      worker.on('message', (result: { taskId: string, proof: VerificationProof }) => {
        this.stateManager.logEvent(result.taskId, 'task_completed', { proof: result.proof });
        this.stateManager.completeTask(result.taskId, result.proof);

        // IMPORTANT: Notify the MCTS engine of the result
        this.mctsEngine.processSimulationResult(result.taskId, result.proof);

        this.idleWorkers.push(i); // Return worker to idle pool
        this.dispatch();
      });

      worker.on('error', (err) => { /* ... handle worker crash ... */ });
      worker.on('exit', (code) => { /* ... handle worker exit ... */ });
    }
  }

  public startNewSearch(prompt: string): void {
    this.mctsEngine.startSearch(prompt);
  }

  // Called by MCTSEngine to queue a task for simulation
  public queueTask(taskId: string): void {
    this.taskQueue.push(taskId);
    this.dispatch();
  }

  private dispatch(): void {
    if (this.taskQueue.length > 0 && this.idleWorkers.length > 0) {
      const taskId = this.taskQueue.shift()!;
      const workerId = this.idleWorkers.shift()!;
      const worker = this.workers.get(workerId)!;

      const task = this.stateManager.getTask(taskId);
      if (task) {
        this.stateManager.updateTaskStatus(taskId, 'running', `worker-${workerId}`);
        this.stateManager.logEvent(taskId, 'dispatch_to_worker', { workerId });
        worker.postMessage(task);
      }
    }
  }
}
```

### 2.3. The Workhorse: `TaskWorker` and a Hardened `PtyExecutor`

The worker is simple. Its only job is to receive a task, execute it with the `PtyExecutor`, and post the `VerificationProof` back.

**File:** `src-v3/workers/task-worker.ts`

```typescript
import { parentPort, workerData } from 'worker_threads';
import { PtyExecutor } from '../executors/pty-executor';
import { Task } from '../core/types';

if (!parentPort) process.exit();

parentPort.on('message', async (task: Task) => {
  const executor = new PtyExecutor(task.id);

  // Forward streaming data to the main thread for live logging/websockets
  executor.on('data', (data) => {
    parentPort?.postMessage({ type: 'stream', taskId: task.id, data });
  });

  try {
    const proof = await executor.execute(task.prompt, process.cwd()); // Assuming CWD for now
    parentPort?.postMessage({ taskId: task.id, proof });
  } catch (error) {
    // ... handle execution error, create a failed proof object ...
    parentPort?.postMessage({ taskId: task.id, error: error.message });
  }
});
```

The `PtyExecutor` itself needs to be more robust, especially in how it invokes the final verification.

**File:** `src-v3/executors/pty-executor.ts` (Refined)

```typescript
// ... (imports and class definition as before) ...

// The `onExit` handler is the most critical part:
this.ptyProcess.onExit(async ({ exitCode }) => {
  this.stopHeartbeat();
  console.log(`[PtyExecutor] Process for task ${this.taskId} exited with code ${exitCode}.`);

  // The verifier should be instantiated here, NOT in the tool.
  // It needs the context of what was supposed to happen.
  const verifier = new SystemVerification(this.taskId, workingDir, this.originalPrompt);

  try {
    // The verifier now takes the final output and exit code to generate the full proof.
    const proof = await verifier.gatherProof(this.outputBuffer, exitCode);
    resolve(proof);
  } catch (verificationError) {
    console.error(`[PtyExecutor] Verification failed for task ${this.taskId}:`, verificationError);
    reject(verificationError);
  }
});

// ... (rest of the class)
```

### 2.4. The Brain: A Hardened `MCTSEngine`

The MCTS engine should not be a tool. It should be a long-running process within the `MasterController` that drives the entire agentic workflow.

**File:** `src-v3/mcts-engine.ts` (Conceptual)

```typescript
import { StateManager } from './core/state-manager';
import { MasterController } from './core/master-controller';
import { MCTSNode, VerificationProof } from './core/types';

export class MCTSEngine {
  private state: StateManager;
  private controller: MasterController;
  private rootNodeId: string | null = null;

  constructor(state: StateManager, controller: MasterController) {
    this.state = state;
    this.controller = controller;
  }

  public async startSearch(prompt: string): Promise<void> {
    const rootTaskId = `task-${Date.now()}`;
    this.state.createTask(rootTaskId, prompt);
    const rootNode = { id: `node-${Date.now()}`, taskId: rootTaskId, /* ... other fields */ };
    this.state.createNode(rootNode);
    this.rootNodeId = rootNode.id;

    // Start the search loop
    for (let i = 0; i < 100; i++) { // Or run until a condition is met
      const leafNode = await this.select(this.rootNodeId);
      if (!leafNode.isTerminal) {
        const expandedNodes = await this.expand(leafNode);
        for (const node of expandedNodes) {
          this.controller.queueTask(node.taskId); // This queues the simulation
        }
      } else {
        // Re-simulate terminal nodes to get better reward estimates
        this.controller.queueTask(leafNode.taskId);
      }
    }
  }

  private async select(nodeId: string): Promise<MCTSNode> {
    // Implement UCB1 traversal from nodeId down to a leaf node
    // This will involve repeatedly fetching child nodes from the StateManager
    // and applying the UCB1 formula.
    // ... returns a leaf MCTSNode
  }

  private async expand(node: MCTSNode): Promise<MCTSNode[]> {
    // 1. Create a decomposition prompt for the LLM.
    const task = this.state.getTask(node.taskId)!;
    const decompPrompt = `Decompose the high-level goal: \"${task.prompt}\". Return a JSON array of sub-goals.`;

    // 2. Queue a one-shot task to get the sub-goals.
    // (This itself could be a mini-task)
    const subGoals = await this.runDecompositionTask(decompPrompt);

    // 3. Create new tasks and MCTS nodes for each sub-goal in the StateManager.
    const newNodes: MCTSNode[] = [];
    for (const goal of subGoals) {
        const newTaskId = `task-${Date.now()}`;
        this.state.createTask(newTaskId, goal);
        const newNode = { id: `node-${Date.now()}`, parentId: node.id, taskId: newTaskId, /*...*/ };
        this.state.createNode(newNode);
        newNodes.push(newNode);
    }
    return newNodes;
  }

  public processSimulationResult(taskId: string, proof: VerificationProof): void {
    const reward = this.calculateReward(proof);
    const node = this.state.findNodeByTaskId(taskId); // Assumes this method exists
    this.backpropagate(node.id, reward);
  }

  private backpropagate(nodeId: string, reward: number): void {
    // Traverse up the tree from nodeId to the root, updating visit counts and rewards
    // for each node along the path using data from the StateManager.
  }

  private calculateReward(proof: VerificationProof): number {
    // The detailed reward function from the previous feedback document goes here.
    // ...
  }
}
```

---

## Part 3: The Roadmap to a Stable V3

This is a prescriptive, four-sprint plan to get from the current state to a stable, functional V3.

**Sprint -1: Deprecation (The Great Cleanup)**
*   **Goal:** Create a clean slate for V3 development.
*   **Actions:**
    1.  **DELETE** the `src/` and `src-v2/` directories entirely.
    2.  Review `package.json` and remove any dependencies that are no longer needed.
    3.  Consolidate all markdown documentation into a single `docs/` directory. Merge redundant `README` files.
*   **Exit Criteria:** The repository only contains the `src-v3/` directory and a clean set of supporting files. A full `npm install` and `npm run build` (for `v3`) completes without error.

**Sprint 0: The Unshakeable Foundation**
*   **Goal:** Get a single task running reliably through the V3 architecture.
*   **Actions:**
    1.  Implement the `StateManager` with SQLite as described above.
    2.  Implement the `PtyExecutor` as described above.
    3.  Implement a basic `MasterController` that can manage ONE `TaskWorker`.
    4.  Implement the `TaskWorker` to receive a task and execute it with the `PtyExecutor`.
*   **Exit Criteria:** The `MasterController` can be manually given a single task, and the `TaskWorker` will execute it to completion, logging the final `VerificationProof`.

**Sprint 1: The Brain and the Senses**
*   **Goal:** Implement the MCTS engine and the asynchronous feedback loop.
*   **Actions:**
    1.  Implement the full `MCTSEngine` class within the `MasterController`.
    2.  Implement the `select`, `expand`, and `backpropagate` methods using the `StateManager` as the source of truth.
    3.  Connect the `MasterController`'s worker message handler to the `mctsEngine.processSimulationResult` method.
*   **Exit Criteria:** Calling `masterController.startNewSearch("some complex goal")` kicks off a multi-task search, which can be observed via the SQLite database.

**Sprint 2: Full Observability and Verification**
*   **Goal:** Make the entire system observable in real-time and implement deep verification.
*   **Actions:**
    1.  Implement the `WebSocketServer` that tails the event ledger from the `StateManager`.
    2.  Create the `monitor.html` client that connects to the WebSocket and displays a live, formatted stream of all system events.
    3.  Flesh out the `SystemVerification` module with `git` integration for diffs and test runners (`jest`, `pytest`) for coverage analysis.
*   **Exit Criteria:** You can watch a complex MCTS search unfold in real-time in the monitor UI, and the final rewards in the database accurately reflect the quality of the generated code.

By following this rigorous and detailed blueprint, Axiom MCP can transform from a promising but flawed prototype into a benchmark for next-generation agentic systems.
