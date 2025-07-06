export interface Context {
    id: string;
    parentId?: string;
    goal: string;
    depth: number;
    findings: string[];
    subGoals: string[];
    status: 'pending' | 'exploring' | 'complete';
    createdAt: Date;
    completedAt?: Date;
}
export declare class ContextManager {
    private contexts;
    createContext(goal: string, parentId?: string): Context;
    updateContext(id: string, updates: Partial<Context>): void;
    getContext(id: string): Context | undefined;
    getChildContexts(parentId: string): Context[];
    getAllContexts(): Context[];
    /**
     * Build a tree structure from contexts
     */
    getContextTree(rootId?: string): any;
    /**
     * Merge findings from multiple contexts
     */
    mergeContexts(contextIds: string[]): string;
    /**
     * Get execution plan for incomplete contexts
     */
    getExecutionPlan(): string[];
    /**
     * Export contexts for persistence
     */
    exportContexts(): string;
    /**
     * Import contexts from export
     */
    importContexts(data: string): void;
}
//# sourceMappingURL=context-manager.d.ts.map