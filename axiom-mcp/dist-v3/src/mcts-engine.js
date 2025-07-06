import { v4 as uuidv4 } from 'uuid';
import { scanCodeSecurity } from './security-scanner.js';
export class MCTSEngine {
    claudeCode;
    config;
    nodes = new Map();
    transpositionTable = new Map();
    startTime = 0;
    iterations = 0;
    constructor(claudeCode, config = {
        explorationConstant: Math.sqrt(2),
        maxDepth: 5,
        maxIterations: 100,
        maxTime: 600000, // 10 minutes
        simulationMode: 'mixed',
        parallelWorkers: 1,
        fastSimulationTimeout: 30000,
        fullRolloutTimeout: 300000,
        minQualityThreshold: 0.7,
    }) {
        this.claudeCode = claudeCode;
        this.config = config;
    }
    /**
     * Main MCTS search algorithm
     */
    async search(task) {
        this.startTime = Date.now();
        this.iterations = 0;
        // Create root node
        const root = this.createNode(task, null);
        // Run MCTS iterations
        while (!this.shouldTerminate()) {
            this.iterations++;
            // 1. Selection - traverse tree using UCB1
            const leaf = await this.select(root);
            // 2. Expansion - add child if not terminal and visited
            let selectedNode = leaf;
            if (!this.isTerminal(leaf) && leaf.visits > 0) {
                selectedNode = await this.expand(leaf);
            }
            // 3. Simulation - run fast or full implementation
            const reward = await this.simulate(selectedNode);
            // 4. Backpropagation - update statistics up the tree
            this.backpropagate(selectedNode, reward);
            console.error(`[MCTS] Iteration ${this.iterations}: reward=${reward.toFixed(3)}, best=${this.getBestChild(root)?.averageReward.toFixed(3) || 0}`);
        }
        // Return best implementation
        return this.getBestChild(root) || root;
    }
    /**
     * Create a new node
     */
    createNode(task, parent) {
        const node = {
            id: uuidv4(),
            task,
            depth: parent ? parent.depth + 1 : 0,
            visits: 0,
            totalReward: 0,
            averageReward: 0,
            parent,
            children: [],
            untriedActions: this.generateActions(task),
            created: new Date(),
        };
        this.nodes.set(node.id, node);
        return node;
    }
    /**
     * Generate possible actions for a task
     */
    generateActions(task) {
        const actions = [];
        // Implementation-focused actions
        if (task.toLowerCase().includes('test')) {
            actions.push('Write unit tests with Jest');
            actions.push('Write integration tests');
            actions.push('Write property-based tests');
        }
        else if (task.toLowerCase().includes('api')) {
            actions.push('Implement REST API with Express');
            actions.push('Implement GraphQL API');
            actions.push('Implement gRPC service');
        }
        else if (task.toLowerCase().includes('function') || task.toLowerCase().includes('implement')) {
            actions.push('Implement with functional approach');
            actions.push('Implement with OOP approach');
            actions.push('Implement with async/await');
        }
        else {
            // Generic implementation strategies
            actions.push('Direct implementation');
            actions.push('Implement with error handling');
            actions.push('Implement with validation');
            actions.push('Test-driven implementation');
        }
        return actions;
    }
    /**
     * Selection phase - traverse tree using UCB1
     */
    async select(node) {
        while (!this.isLeaf(node)) {
            if (node.untriedActions.length > 0) {
                return node; // Node has untried actions
            }
            node = this.selectBestChild(node);
        }
        return node;
    }
    /**
     * Select best child using UCB1
     */
    selectBestChild(node) {
        let bestScore = -Infinity;
        let bestChild = null;
        for (const child of node.children) {
            const score = this.ucb1Score(child, node);
            if (score > bestScore) {
                bestScore = score;
                bestChild = child;
            }
        }
        if (!bestChild) {
            throw new Error('No best child found');
        }
        return bestChild;
    }
    /**
     * Calculate UCB1 score
     */
    ucb1Score(node, parent) {
        if (node.visits === 0) {
            return Infinity;
        }
        const exploitation = node.averageReward;
        const exploration = this.config.explorationConstant *
            Math.sqrt(Math.log(parent.visits) / node.visits);
        return exploitation + exploration;
    }
    /**
     * Expansion phase - add new child
     */
    async expand(node) {
        if (node.untriedActions.length === 0) {
            return node;
        }
        // Select random untried action
        const actionIndex = Math.floor(Math.random() * node.untriedActions.length);
        const action = node.untriedActions[actionIndex];
        node.untriedActions.splice(actionIndex, 1);
        // Create child node with specific implementation approach
        const childTask = `${node.task}\n\nApproach: ${action}`;
        const child = this.createNode(childTask, node);
        node.children.push(child);
        return child;
    }
    /**
     * Simulation phase - implement and evaluate
     */
    async simulate(node) {
        node.lastVisited = new Date();
        // Check transposition table
        const cacheKey = this.getTranspositionKey(node.task);
        const cached = this.transpositionTable.get(cacheKey);
        if (cached && cached.implementation) {
            node.implementation = cached.implementation;
            return cached.implementation.reward;
        }
        // Decide simulation mode
        const useFullSimulation = this.config.simulationMode === 'full' ||
            (this.config.simulationMode === 'mixed' && Math.random() < 0.3);
        let result;
        if (useFullSimulation) {
            // Full implementation with tests
            result = await this.fullSimulation(node.task);
        }
        else {
            // Fast simulation - structure only
            result = await this.fastSimulation(node.task);
        }
        // Calculate reward
        const reward = await this.calculateReward(result, useFullSimulation);
        // Store implementation
        node.implementation = {
            code: result.response,
            output: result.response,
            reward,
            security: await this.scanSecurity(result.response),
        };
        // Cache in transposition table
        this.transpositionTable.set(cacheKey, node);
        return reward;
    }
    /**
     * Fast simulation - code structure only
     */
    async fastSimulation(task) {
        const prompt = `Create a code structure outline for: ${task}

FAST SIMULATION MODE - Provide:
1. File structure needed
2. Function signatures with types
3. Test structure outline
4. Key implementation notes

DO NOT write full implementations, just structure and signatures.`;
        return await this.claudeCode.execute(prompt, {
            timeout: this.config.fastSimulationTimeout,
            systemPrompt: 'You are creating code structure outlines for planning purposes.',
        });
    }
    /**
     * Full simulation - complete implementation
     */
    async fullSimulation(task) {
        const prompt = `IMPLEMENT: ${task}

You MUST:
1. Write complete, working code
2. Create test files
3. Run tests and show they pass
4. Handle errors properly
5. Follow best practices

This is a FULL IMPLEMENTATION - write all code, test it, verify it works.`;
        return await this.claudeCode.execute(prompt, {
            timeout: this.config.fullRolloutTimeout,
            systemPrompt: `You are an implementation-focused agent. Write ACTUAL CODE that works, not descriptions.`,
            allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
        });
    }
    /**
     * Calculate reward for a simulation result
     */
    async calculateReward(result, isFullSimulation) {
        const components = {
            hasCode: /```[\s\S]+```/.test(result.response),
            syntaxValid: !result.error && result.response.length > 100,
            testsPass: /test.*pass|✓|success/i.test(result.response),
            securityScore: 1.0,
            completeness: 0,
            complexity: 0,
        };
        // Check for file operations (actual implementation)
        const hasFileOps = /(Write|Edit|Created)\s+\S+\.(ts|js|py)/i.test(result.response);
        const hasTests = /test|spec|\.test\.|\.spec\./i.test(result.response);
        // Calculate completeness
        components.completeness = 0;
        if (components.hasCode)
            components.completeness += 0.25;
        if (hasFileOps)
            components.completeness += 0.25;
        if (hasTests)
            components.completeness += 0.25;
        if (components.testsPass)
            components.completeness += 0.25;
        // Security check for full simulations
        if (isFullSimulation && components.hasCode) {
            const security = await this.scanSecurity(result.response);
            components.securityScore = security.passed ? 1.0 :
                1.0 - (security.summary.critical * 0.5 + security.summary.high * 0.3);
        }
        // Calculate weighted reward
        let reward = 0;
        if (isFullSimulation) {
            // Full simulation weights - implementation focused
            reward = ((components.hasCode ? 1 : 0) * 0.2 +
                (components.syntaxValid ? 1 : 0) * 0.1 +
                (components.testsPass ? 1 : 0) * 0.3 +
                components.securityScore * 0.2 +
                components.completeness * 0.2);
        }
        else {
            // Fast simulation weights - structure focused
            reward = ((components.hasCode ? 1 : 0) * 0.4 +
                (components.syntaxValid ? 1 : 0) * 0.3 +
                components.completeness * 0.3);
            // Scale down fast simulation rewards
            reward *= 0.7;
        }
        return Math.max(0, Math.min(1, reward));
    }
    /**
     * Backpropagation - update statistics up the tree
     */
    backpropagate(node, reward) {
        let current = node;
        while (current) {
            current.visits++;
            current.totalReward += reward;
            current.averageReward = current.totalReward / current.visits;
            current = current.parent;
        }
    }
    /**
     * Get best child by average reward
     */
    getBestChild(node) {
        if (node.children.length === 0)
            return null;
        return node.children.reduce((best, child) => child.averageReward > best.averageReward ? child : best);
    }
    /**
     * Check if node is a leaf
     */
    isLeaf(node) {
        return node.children.length === 0;
    }
    /**
     * Check if node is terminal
     */
    isTerminal(node) {
        return node.depth >= this.config.maxDepth ||
            (node.implementation !== undefined && node.implementation.reward >= this.config.minQualityThreshold);
    }
    /**
     * Check if search should terminate
     */
    shouldTerminate() {
        const timeExpired = Date.now() - this.startTime > this.config.maxTime;
        const iterationsComplete = this.iterations >= this.config.maxIterations;
        return timeExpired || iterationsComplete;
    }
    /**
     * Get transposition table key
     */
    getTranspositionKey(task) {
        // Normalize task description
        return task.toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .trim();
    }
    /**
     * Scan code for security issues
     */
    async scanSecurity(code) {
        return scanCodeSecurity(code);
    }
    /**
     * Get tree statistics
     */
    getStatistics() {
        let maxDepth = 0;
        let bestReward = 0;
        for (const node of this.nodes.values()) {
            maxDepth = Math.max(maxDepth, node.depth);
            if (node.implementation) {
                bestReward = Math.max(bestReward, node.implementation.reward);
            }
        }
        return {
            totalNodes: this.nodes.size,
            maxDepth,
            iterations: this.iterations,
            timeElapsed: Date.now() - this.startTime,
            bestReward,
        };
    }
}
//# sourceMappingURL=mcts-engine.js.map