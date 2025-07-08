/**
 * No TODO Enforcement Hook - Core Axiom Principle
 *
 * Forces implementation over planning. If output contains only TODOs
 * without actual code, it intervenes and demands implementation.
 */
declare const NO_TODO_ENFORCEMENT_HOOK: {
    name: string;
    description: string;
    version: string;
    beforeExecute(context: any): Promise<{
        continueExecution: boolean;
        modifiedContext: any;
        error?: undefined;
    } | {
        continueExecution: boolean;
        error: string;
        modifiedContext?: undefined;
    } | {
        continueExecution: boolean;
        modifiedContext?: undefined;
        error?: undefined;
    }>;
    afterChunk(context: any): Promise<{
        continueExecution: boolean;
        interrupt?: undefined;
        interventionMessage?: undefined;
    } | {
        continueExecution: boolean;
        interrupt: boolean;
        interventionMessage: string;
    }>;
    afterExecute(context: any): Promise<{
        continueExecution: boolean;
        error: string;
        retry: boolean;
        retryPrompt: string;
        result?: undefined;
    } | {
        continueExecution: boolean;
        error: string;
        result: any;
        retry?: undefined;
        retryPrompt?: undefined;
    } | {
        continueExecution: boolean;
        result: any;
        error?: undefined;
        retry?: undefined;
        retryPrompt?: undefined;
    }>;
    handleParallelRequest(context: any): Promise<{
        continueExecution: boolean;
        result: any;
    } | {
        continueExecution: boolean;
        result?: undefined;
    }>;
};
export default NO_TODO_ENFORCEMENT_HOOK;
//# sourceMappingURL=no-todo-enforcement-hook.d.ts.map