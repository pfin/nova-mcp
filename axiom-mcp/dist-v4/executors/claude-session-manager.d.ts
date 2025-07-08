/**
 * Claude Session Manager - Manages interactive Claude sessions
 * The entire point: bidirectional communication with running Claude
 */
import { EventEmitter } from 'events';
import * as pty from 'node-pty';
export interface ClaudeSession {
    id: string;
    pty: pty.IPty;
    output: string;
    ready: boolean;
    busy: boolean;
    created: Date;
}
export declare class ClaudeSessionManager extends EventEmitter {
    private sessions;
    private logger;
    constructor();
    /**
     * Create a new Claude session
     */
    createSession(sessionId: string): Promise<ClaudeSession>;
    /**
     * Send a message to a session
     */
    sendMessage(sessionId: string, message: string): Promise<void>;
    /**
     * Wait for session to be ready
     */
    private waitForReady;
    /**
     * Get session output
     */
    getOutput(sessionId: string): string;
    /**
     * Kill a session
     */
    killSession(sessionId: string): void;
    /**
     * Get all active sessions
     */
    getActiveSessions(): string[];
}
//# sourceMappingURL=claude-session-manager.d.ts.map