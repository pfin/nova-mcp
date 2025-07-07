import { EventEmitter } from 'events';
import type { PtyExecutor } from '../executors/pty-executor.js';
import type { SdkExecutor } from '../executors/sdk-executor.js';
import type { StreamParser } from '../parsers/stream-parser.js';
import type { RuleVerifier } from '../verifiers/rule-verifier.js';
import type { ConversationDB } from '../database/conversation-db.js';
export declare class StreamAggregator extends EventEmitter {
    private streamParser;
    private ruleVerifier;
    private conversationDB;
    private activeStreams;
    private outputStream;
    private colorMap;
    private colors;
    private colorIndex;
    constructor(streamParser: StreamParser | null, ruleVerifier: RuleVerifier | null, conversationDB: ConversationDB | null, outputStream?: NodeJS.WritableStream);
    private getTaskColor;
    attachChild(taskId: string, executor: PtyExecutor | SdkExecutor): void;
    private attachPtyExecutor;
    private attachSdkExecutor;
    private storeEvents;
    private handleChildExit;
    private outputLine;
    private getAnsiColor;
    getActiveCount(): number;
    getStats(): {
        activeCount: number;
        totalLines: number;
        totalBytes: number;
        totalInterventions: number;
        streams: Array<{
            taskId: string;
            uptime: number;
            lines: number;
            bytes: number;
            interventions: number;
        }>;
    };
}
//# sourceMappingURL=stream-aggregator.d.ts.map