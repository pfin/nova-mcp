"use strict";
/**
 * V5 Phase Controller - Core cognitive control system
 *
 * Controls the 4 phases of execution with strict time limits and tool restrictions:
 * 1. Research (3 min) - Tools: grep, read, find
 * 2. Planning (3 min) - Tools: read findings only
 * 3. Execution (10 min) - Tools: write ONLY
 * 4. Integration (3 min) - Tools: read, write
 *
 * Each phase spawns Claude instances with restricted tool access.
 * Includes timeout management and phase transitions.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhaseController = exports.Phase = void 0;
exports.createPhaseController = createPhaseController;
exports.getPhasePrompt = getPhasePrompt;
const events_1 = require("events");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
// Phase definitions with strict time limits and tool restrictions
var Phase;
(function (Phase) {
    Phase["RESEARCH"] = "research";
    Phase["PLANNING"] = "planning";
    Phase["EXECUTION"] = "execution";
    Phase["INTEGRATION"] = "integration";
})(Phase || (exports.Phase = Phase = {}));
class PhaseController extends events_1.EventEmitter {
    currentPhase = null;
    phaseStartTime = 0;
    activeProcesses = new Map();
    phaseTimer = null;
    workingDirectory;
    // Phase configurations
    phases = {
        [Phase.RESEARCH]: {
            name: Phase.RESEARCH,
            duration: 3,
            allowedTools: ['grep', 'find', 'read', 'ls'],
            forbiddenTools: ['write', 'edit', 'create'],
            outputFile: 'research-findings.md',
            prompt: `AXIOM V5 RESEARCH PHASE

You are in RESEARCH MODE for the next 3 minutes.

ALLOWED TOOLS:
- grep, find, read, ls, analyze
- You may search and explore freely

FORBIDDEN:
- Writing any files
- Making implementation decisions
- Planning architecture

YOUR ONLY OUTPUT:
Create research-findings.md with:
1. Existing patterns found
2. Dependencies identified
3. Conventions observed
4. Relevant context

TIMER: You have 3 minutes. At 2:30, wrap up findings.

If you start planning or explaining, you will be interrupted.`
        },
        [Phase.PLANNING]: {
            name: Phase.PLANNING,
            duration: 3,
            allowedTools: ['read'],
            forbiddenTools: ['write', 'edit', 'grep', 'find'],
            outputFile: 'task-plan.json',
            prompt: `AXIOM V5 PLANNING PHASE

You are in PLANNING MODE for the next 3 minutes.

INPUT: Read research-findings.md FIRST

ALLOWED TOOLS:
- read research-findings.md ONLY
- think and analyze

FORBIDDEN:
- Reading other files
- Writing implementation
- Endless analysis

YOUR ONLY OUTPUT:
Create task-plan.json with orthogonal tasks:
{
  "tasks": [
    {
      "id": "unique-id",
      "prompt": "specific implementation instruction",
      "expectedFiles": ["file1.ts"],
      "duration": 5
    }
  ]
}

TIMER: You have 3 minutes. Make decisions, don't analyze forever.`
        },
        [Phase.EXECUTION]: {
            name: Phase.EXECUTION,
            duration: 10,
            allowedTools: ['write', 'mkdir'],
            forbiddenTools: ['read', 'grep', 'find', 'ls'],
            outputFile: 'execution-complete.flag',
            prompt: `AXIOM V5 EXECUTION PHASE

You are in PURE CREATION MODE for the next 10 minutes.

ALLOWED TOOLS:
- write (create files)
- mkdir (create directories)

STRICTLY FORBIDDEN:
- read (no reading anything)
- grep/find (no searching)
- Thinking or planning
- Explaining your approach

YOUR TASK: [SPECIFIC_TASK_FROM_PLAN]

BEHAVIORAL RULES:
1. If you think "I would..." → STOP. Create the file instead.
2. If you think "First I need to..." → STOP. Just write code.
3. If you think "The approach is..." → STOP. Implement, don't explain.

SUCCESS = Files exist in workspace
FAILURE = Explaining without creating

TIMER: 10 minutes. Files must exist by minute 5.`
        },
        [Phase.INTEGRATION]: {
            name: Phase.INTEGRATION,
            duration: 3,
            allowedTools: ['read', 'write', 'edit'],
            forbiddenTools: ['grep', 'find'],
            outputFile: 'integration-complete.flag',
            prompt: `AXIOM V5 INTEGRATION PHASE

You are in INTEGRATION MODE for the next 3 minutes.

ALLOWED TOOLS:
- read (all created files)
- write (create integration files)
- edit (fix issues)

YOUR TASK:
1. Read all component files
2. Understand their interfaces
3. Resolve any conflicts
4. Create integration layer

FORBIDDEN:
- Shallow copying
- Assuming compatibility
- Skipping error handling

SUCCESS CRITERIA:
- All components properly imported
- Interfaces correctly connected
- Error propagation handled
- Single entry point created

TIMER: 3 minutes. Think deeply, then implement.`
        }
    };
    constructor(workingDirectory) {
        super();
        this.workingDirectory = workingDirectory;
    }
    /**
     * Execute all phases in sequence
     */
    async executeFullCycle(initialPrompt) {
        const results = [];
        try {
            // Phase 1: Research
            const researchResult = await this.executePhase(Phase.RESEARCH, initialPrompt);
            results.push(researchResult);
            if (!researchResult.success) {
                throw new Error(`Research phase failed: ${researchResult.error}`);
            }
            // Phase 2: Planning
            const planningResult = await this.executePhase(Phase.PLANNING, initialPrompt);
            results.push(planningResult);
            if (!planningResult.success) {
                throw new Error(`Planning phase failed: ${planningResult.error}`);
            }
            // Read the task plan
            const taskPlanPath = path.join(this.workingDirectory, 'task-plan.json');
            const taskPlanContent = await fs.readFile(taskPlanPath, 'utf-8');
            const taskPlan = JSON.parse(taskPlanContent);
            // Phase 3: Execution (parallel for orthogonal tasks)
            const executionResults = await this.executeParallelTasks(taskPlan.tasks);
            results.push(...executionResults);
            // Phase 4: Integration
            const integrationResult = await this.executePhase(Phase.INTEGRATION, initialPrompt);
            results.push(integrationResult);
            return results;
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
        finally {
            this.cleanup();
        }
    }
    /**
     * Execute a single phase with time limits and tool restrictions
     */
    async executePhase(phase, context) {
        const config = this.phases[phase];
        this.currentPhase = phase;
        this.phaseStartTime = Date.now();
        this.emit('phaseStart', { phase, config });
        try {
            // Set up phase timer
            const timeoutPromise = this.setupPhaseTimer(config.duration);
            // Spawn Claude instance with restricted tools
            const processId = `${phase}-${Date.now()}`;
            const claudeProcess = await this.spawnRestrictedClaude(config, context);
            this.activeProcesses.set(processId, claudeProcess);
            // Monitor for output file creation
            const outputPromise = this.waitForOutput(config.outputFile, config.duration);
            // Race between timeout and output
            const result = await Promise.race([timeoutPromise, outputPromise]);
            // Check if we were interrupted by timeout
            const interrupted = result === 'timeout';
            const duration = (Date.now() - this.phaseStartTime) / 1000 / 60; // minutes
            if (interrupted) {
                // Force interrupt the Claude instance
                this.interruptProcess(processId);
                return {
                    phase,
                    success: false,
                    error: `Phase timed out after ${config.duration} minutes`,
                    duration,
                    interrupted: true
                };
            }
            // Verify output file exists
            const outputPath = path.join(this.workingDirectory, config.outputFile);
            try {
                await fs.access(outputPath);
                return {
                    phase,
                    success: true,
                    outputFile: outputPath,
                    duration,
                    interrupted: false
                };
            }
            catch {
                return {
                    phase,
                    success: false,
                    error: 'Output file not created',
                    duration,
                    interrupted: false
                };
            }
        }
        finally {
            this.clearPhaseTimer();
            this.emit('phaseEnd', { phase, duration: (Date.now() - this.phaseStartTime) / 1000 });
        }
    }
    /**
     * Execute multiple tasks in parallel (for execution phase)
     */
    async executeParallelTasks(tasks) {
        const config = this.phases[Phase.EXECUTION];
        this.currentPhase = Phase.EXECUTION;
        this.phaseStartTime = Date.now();
        this.emit('phaseStart', { phase: Phase.EXECUTION, config, taskCount: tasks.length });
        try {
            // Spawn Claude instances for each task
            const taskPromises = tasks.map(async (task) => {
                const processId = `execution-${task.id}`;
                const taskConfig = {
                    ...config,
                    prompt: config.prompt.replace('[SPECIFIC_TASK_FROM_PLAN]', task.prompt)
                };
                const claudeProcess = await this.spawnRestrictedClaude(taskConfig, task.prompt);
                this.activeProcesses.set(processId, claudeProcess);
                // Monitor for expected files
                const filesPromise = this.waitForFiles(task.expectedFiles, task.duration);
                const timeoutPromise = this.setupTaskTimer(task.duration);
                const result = await Promise.race([filesPromise, timeoutPromise]);
                const interrupted = result === 'timeout';
                const duration = (Date.now() - this.phaseStartTime) / 1000 / 60;
                if (interrupted) {
                    this.interruptProcess(processId);
                }
                return {
                    phase: Phase.EXECUTION,
                    success: !interrupted,
                    error: interrupted ? `Task ${task.id} timed out` : undefined,
                    duration,
                    interrupted
                };
            });
            // Wait for all tasks with overall phase timeout
            const overallTimeout = this.setupPhaseTimer(config.duration);
            const allResults = await Promise.race([
                Promise.all(taskPromises),
                overallTimeout.then(() => [])
            ]);
            if (allResults.length === 0) {
                // Overall timeout hit
                this.interruptAllProcesses();
                return [{
                        phase: Phase.EXECUTION,
                        success: false,
                        error: 'Execution phase timed out',
                        duration: config.duration,
                        interrupted: true
                    }];
            }
            return allResults;
        }
        finally {
            this.clearPhaseTimer();
            this.emit('phaseEnd', { phase: Phase.EXECUTION, duration: (Date.now() - this.phaseStartTime) / 1000 });
        }
    }
    /**
     * Spawn a Claude instance with restricted tool access
     */
    async spawnRestrictedClaude(config, context) {
        // Build the command with system prompt
        const systemPrompt = config.prompt;
        const fullPrompt = `${context}\n\nREMEMBER: You are in ${config.name.toUpperCase()} phase with restricted tools.`;
        // Spawn Claude with restricted environment
        const claudeProcess = (0, child_process_1.spawn)('claude', [
            '--append-system-prompt', systemPrompt,
            fullPrompt
        ], {
            cwd: this.workingDirectory,
            env: {
                ...process.env,
                AXIOM_PHASE: config.name,
                AXIOM_ALLOWED_TOOLS: config.allowedTools.join(','),
                AXIOM_FORBIDDEN_TOOLS: config.forbiddenTools.join(',')
            }
        });
        // Monitor output for violations
        claudeProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this.checkForViolations(output, config);
            this.emit('output', { phase: config.name, data: output });
        });
        claudeProcess.stderr.on('data', (data) => {
            this.emit('error', { phase: config.name, error: data.toString() });
        });
        return claudeProcess;
    }
    /**
     * Check output for tool violations and intervene if needed
     */
    checkForViolations(output, config) {
        // Check for forbidden tool usage
        for (const tool of config.forbiddenTools) {
            if (output.toLowerCase().includes(`using ${tool}`) ||
                output.toLowerCase().includes(`calling ${tool}`)) {
                this.emit('violation', {
                    phase: config.name,
                    tool,
                    type: 'forbidden_tool'
                });
                // Interrupt the violating process
                for (const [id] of this.activeProcesses) {
                    if (id.startsWith(config.name)) {
                        this.interruptProcess(id);
                    }
                }
            }
        }
        // Check for phase-specific violations
        if (config.name === Phase.RESEARCH && output.includes('would implement')) {
            this.emit('violation', { phase: config.name, type: 'premature_planning' });
        }
        if (config.name === Phase.EXECUTION && output.includes('need to understand')) {
            this.emit('violation', { phase: config.name, type: 'analysis_in_execution' });
        }
    }
    /**
     * Set up phase timer
     */
    setupPhaseTimer(minutes) {
        return new Promise((resolve) => {
            this.phaseTimer = setTimeout(() => {
                this.emit('phaseTimeout', { phase: this.currentPhase, duration: minutes });
                resolve('timeout');
            }, minutes * 60 * 1000);
            // Warning at 80% time
            setTimeout(() => {
                this.emit('phaseWarning', {
                    phase: this.currentPhase,
                    remaining: minutes * 0.2
                });
            }, minutes * 60 * 1000 * 0.8);
        });
    }
    /**
     * Set up task-specific timer
     */
    setupTaskTimer(minutes) {
        return new Promise((resolve) => {
            setTimeout(() => resolve('timeout'), minutes * 60 * 1000);
        });
    }
    /**
     * Wait for output file creation
     */
    async waitForOutput(filename, timeoutMinutes) {
        const outputPath = path.join(this.workingDirectory, filename);
        const checkInterval = 1000; // Check every second
        const maxChecks = (timeoutMinutes * 60 * 1000) / checkInterval;
        for (let i = 0; i < maxChecks; i++) {
            try {
                await fs.access(outputPath);
                return 'success';
            }
            catch {
                await new Promise(resolve => setTimeout(resolve, checkInterval));
            }
        }
        return 'timeout';
    }
    /**
     * Wait for multiple files to be created
     */
    async waitForFiles(filenames, timeoutMinutes) {
        const checkInterval = 1000;
        const maxChecks = (timeoutMinutes * 60 * 1000) / checkInterval;
        for (let i = 0; i < maxChecks; i++) {
            const allExist = await Promise.all(filenames.map(async (filename) => {
                try {
                    await fs.access(path.join(this.workingDirectory, filename));
                    return true;
                }
                catch {
                    return false;
                }
            }));
            if (allExist.every(exists => exists)) {
                return 'success';
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        return 'timeout';
    }
    /**
     * Interrupt a specific process
     */
    interruptProcess(processId) {
        const process = this.activeProcesses.get(processId);
        if (process) {
            // Send ESC to interrupt Claude
            process.stdin.write('\x1b');
            setTimeout(() => {
                // Force kill if still running
                if (!process.killed) {
                    process.kill('SIGTERM');
                }
            }, 1000);
            this.activeProcesses.delete(processId);
        }
    }
    /**
     * Interrupt all active processes
     */
    interruptAllProcesses() {
        for (const [id] of this.activeProcesses) {
            this.interruptProcess(id);
        }
    }
    /**
     * Clear phase timer
     */
    clearPhaseTimer() {
        if (this.phaseTimer) {
            clearTimeout(this.phaseTimer);
            this.phaseTimer = null;
        }
    }
    /**
     * Cleanup all resources
     */
    cleanup() {
        this.clearPhaseTimer();
        this.interruptAllProcesses();
        this.currentPhase = null;
    }
}
exports.PhaseController = PhaseController;
// Export phase utilities
function createPhaseController(workingDirectory) {
    return new PhaseController(workingDirectory);
}
function getPhasePrompt(phase) {
    const configs = {
        [Phase.RESEARCH]: {
            name: Phase.RESEARCH,
            duration: 3,
            allowedTools: ['grep', 'find', 'read', 'ls'],
            forbiddenTools: ['write', 'edit', 'create'],
            outputFile: 'research-findings.md',
            prompt: 'Research phase prompt...'
        },
        [Phase.PLANNING]: {
            name: Phase.PLANNING,
            duration: 3,
            allowedTools: ['read'],
            forbiddenTools: ['write', 'edit', 'grep', 'find'],
            outputFile: 'task-plan.json',
            prompt: 'Planning phase prompt...'
        },
        [Phase.EXECUTION]: {
            name: Phase.EXECUTION,
            duration: 10,
            allowedTools: ['write', 'mkdir'],
            forbiddenTools: ['read', 'grep', 'find', 'ls'],
            outputFile: 'execution-complete.flag',
            prompt: 'Execution phase prompt...'
        },
        [Phase.INTEGRATION]: {
            name: Phase.INTEGRATION,
            duration: 3,
            allowedTools: ['read', 'write', 'edit'],
            forbiddenTools: ['grep', 'find'],
            outputFile: 'integration-complete.flag',
            prompt: 'Integration phase prompt...'
        }
    };
    return configs[phase].prompt;
}
//# sourceMappingURL=phase-controller.js.map