/**
 * Task Decomposer - Breaks tasks into 5-10 minute orthogonal chunks
 *
 * Core Axiom principle: Decompose into small, measurable tasks that
 * can be executed in parallel and interrupted before toxic completion.
 */
import { EventEmitter } from 'events';
export interface DecomposedTask {
    id: string;
    originalPrompt: string;
    subtasks: Subtask[];
    strategy: 'parallel' | 'sequential' | 'race';
    maxDuration: number;
    successCriteria: SuccessCriteria;
}
export interface Subtask {
    id: string;
    prompt: string;
    duration: number;
    orthogonal: boolean;
    dependencies: string[];
    verifiable: boolean;
    expectedOutput: string;
}
export interface SuccessCriteria {
    filesCreated?: string[];
    testsPass?: boolean;
    codeExecutes?: boolean;
    noTodos?: boolean;
    hasImplementation?: boolean;
}
export declare class TaskDecomposer extends EventEmitter {
    private patterns;
    decompose(prompt: string): DecomposedTask;
    private createSubtask;
    private inferExpectedOutput;
    private determineStrategy;
    private determineCriteria;
    private generateId;
    validateSuccess(task: DecomposedTask, actualOutput: string): boolean;
}
//# sourceMappingURL=task-decomposer.d.ts.map