/**
 * Axiom Context Builder - Core context management for multi-LLM orchestration
 *
 * This is the central component that prepares, optimizes, and distributes
 * codebase context to parallel LLM instances. It integrates with repomix
 * for extraction and provides intelligent context slicing for orthogonal tasks.
 */
import { EventEmitter } from 'events';
export interface ContextConfig {
    maxTokens: number;
    maxChunkSize: number;
    format: 'minimal' | 'detailed' | 'compressed';
    includeTests: boolean;
    includeDocs: boolean;
    includeHistory: boolean;
}
export interface TaskContext {
    taskId: string;
    prompt: string;
    files: Map<string, string>;
    structure: string;
    relevantPaths: string[];
    tokenCount: number;
    chunks: string[];
}
export interface RepomixOutput {
    files: Map<string, string>;
    structure: string;
    metadata: {
        totalFiles: number;
        totalTokens: number;
        timestamp: number;
    };
}
export interface DependencyNode {
    path: string;
    imports: string[];
    exports: string[];
    type: 'source' | 'test' | 'config' | 'doc';
    relevanceScore: number;
}
export declare class ContextBuilder extends EventEmitter {
    private repomixCache;
    private dependencyGraph;
    private config;
    constructor(config?: Partial<ContextConfig>);
    /**
     * Generate context using repomix
     */
    generateRepomixContext(projectPath: string): Promise<RepomixOutput>;
    /**
     * Parse repomix XML output
     */
    private parseRepomixXML;
    /**
     * Build dependency graph from repomix output
     */
    buildDependencyGraph(repomix: RepomixOutput): Promise<void>;
    /**
     * Extract import statements
     */
    private extractImports;
    /**
     * Extract export statements
     */
    private extractExports;
    /**
     * Classify file type
     */
    private classifyFile;
    /**
     * Calculate relevance scores based on graph connectivity
     */
    private calculateRelevanceScores;
    /**
     * Resolve import path to actual file
     */
    private resolveImport;
    /**
     * Create context for a specific task
     */
    createTaskContext(task: {
        id: string;
        prompt: string;
    }, repomix: RepomixOutput): Promise<TaskContext>;
    /**
     * Select files relevant to the task
     */
    private selectRelevantFiles;
    /**
     * Identify focus areas from prompt
     */
    private identifyFocusAreas;
    /**
     * Estimate token count (rough approximation)
     */
    private estimateTokens;
    /**
     * Create chunks for paste operations
     */
    private createChunks;
    /**
     * Create orthogonal contexts for parallel tasks
     */
    createOrthogonalContexts(tasks: Array<{
        id: string;
        prompt: string;
    }>, projectPath: string): Promise<Map<string, TaskContext>>;
    /**
     * Analyze overlap between contexts (for optimization)
     */
    private analyzeContextOverlap;
    /**
     * Optimize context for specific LLM
     */
    optimizeForLLM(context: TaskContext, llm: 'gpt-4' | 'gpt-3.5' | 'claude'): TaskContext;
    /**
     * Rebuild full context from TaskContext
     */
    private rebuildFullContext;
}
export declare const contextBuilder: ContextBuilder;
//# sourceMappingURL=context-builder.d.ts.map