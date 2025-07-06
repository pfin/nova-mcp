import { ClaudeCodeSubprocess } from './claude-subprocess.js';
import { SecurityScanResult } from './security-scanner.js';
export interface MCTSNode {
    id: string;
    task: string;
    depth: number;
    visits: number;
    totalReward: number;
    averageReward: number;
    parent: MCTSNode | null;
    children: MCTSNode[];
    untriedActions: string[];
    implementation?: {
        code: string;
        output: string;
        reward: number;
        security: SecurityScanResult;
    };
    created: Date;
    lastVisited?: Date;
}
export interface MCTSConfig {
    explorationConstant: number;
    maxDepth: number;
    maxIterations: number;
    maxTime: number;
    simulationMode: 'fast' | 'full' | 'mixed';
    parallelWorkers: number;
    fastSimulationTimeout: number;
    fullRolloutTimeout: number;
    minQualityThreshold: number;
}
export interface RewardComponents {
    hasCode: boolean;
    syntaxValid: boolean;
    testsPass: boolean;
    securityScore: number;
    completeness: number;
    complexity: number;
}
export declare class MCTSEngine {
    private claudeCode;
    private config;
    private nodes;
    private transpositionTable;
    private startTime;
    private iterations;
    constructor(claudeCode: ClaudeCodeSubprocess, config?: MCTSConfig);
    /**
     * Main MCTS search algorithm
     */
    search(task: string): Promise<MCTSNode>;
    /**
     * Create a new node
     */
    private createNode;
    /**
     * Generate possible actions for a task
     */
    private generateActions;
    /**
     * Selection phase - traverse tree using UCB1
     */
    private select;
    /**
     * Select best child using UCB1
     */
    private selectBestChild;
    /**
     * Calculate UCB1 score
     */
    private ucb1Score;
    /**
     * Expansion phase - add new child
     */
    private expand;
    /**
     * Simulation phase - implement and evaluate
     */
    private simulate;
    /**
     * Fast simulation - code structure only
     */
    private fastSimulation;
    /**
     * Full simulation - complete implementation
     */
    private fullSimulation;
    /**
     * Calculate reward for a simulation result
     */
    private calculateReward;
    /**
     * Backpropagation - update statistics up the tree
     */
    private backpropagate;
    /**
     * Get best child by average reward
     */
    private getBestChild;
    /**
     * Check if node is a leaf
     */
    private isLeaf;
    /**
     * Check if node is terminal
     */
    private isTerminal;
    /**
     * Check if search should terminate
     */
    private shouldTerminate;
    /**
     * Get transposition table key
     */
    private getTranspositionKey;
    /**
     * Scan code for security issues
     */
    private scanSecurity;
    /**
     * Get tree statistics
     */
    getStatistics(): {
        totalNodes: number;
        maxDepth: number;
        iterations: number;
        timeElapsed: number;
        bestReward: number;
    };
}
//# sourceMappingURL=mcts-engine.d.ts.map