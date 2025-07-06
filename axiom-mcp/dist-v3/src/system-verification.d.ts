/**
 * System-Level Verification
 *
 * This module provides unhackable verification that cannot be bypassed
 * by clever prompting or AI responses. It checks actual system artifacts.
 */
export interface SystemArtifact {
    type: 'file' | 'process' | 'output';
    path?: string;
    content?: string;
    exitCode?: number;
    timestamp: Date;
}
export interface VerificationProof {
    filesCreated: Array<{
        path: string;
        size: number;
        isCode: boolean;
        language?: string;
    }>;
    processesRun: Array<{
        command: string;
        exitCode: number;
        stdout: string;
        stderr: string;
        duration: number;
    }>;
    testResults?: {
        passed: number;
        failed: number;
        coverage?: {
            statements: number;
            branches: number;
            functions: number;
            lines: number;
        };
    };
    isValid: boolean;
    hasImplementation: boolean;
    hasTests: boolean;
    testsPass: boolean;
    meetsRequirements: boolean;
}
export declare class SystemVerification {
    private readonly startTime;
    private readonly workingDir;
    private readonly trackedFiles;
    private readonly trackedProcesses;
    private readonly CODE_EXTENSIONS;
    private readonly TEST_PATTERNS;
    private readonly TEST_COMMANDS;
    constructor(workingDir?: string);
    /**
     * Capture file system state before task execution
     */
    private captureInitialState;
    /**
     * Get all files recursively
     */
    private getAllFiles;
    /**
     * Track a process execution (unhackable - based on actual system calls)
     */
    trackProcess(command: string, cwd?: string): {
        exitCode: number;
        stdout: string;
        stderr: string;
    };
    /**
     * Gather verification proof (cannot be faked - checks actual system state)
     */
    gatherProof(): VerificationProof;
    /**
     * Detect programming language from file extension
     */
    private detectLanguage;
    /**
     * Parse test output to extract results
     */
    private parseTestOutput;
    /**
     * Create a verification report
     */
    createReport(proof: VerificationProof): string;
}
/**
 * Unhackable subprocess wrapper
 */
export declare class VerifiedClaudeSubprocess {
    private readonly UNHACKABLE_PREFIX;
    execute(prompt: string, options?: any): Promise<any>;
    private executeWithTracking;
    private isSafeCommand;
}
//# sourceMappingURL=system-verification.d.ts.map