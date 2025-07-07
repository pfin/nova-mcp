import { EventEmitter } from 'events';
import { StreamParser } from '../parsers/stream-parser.js';
import { RuleVerifier } from '../verifiers/rule-verifier.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
export class GuidedExecutor extends EventEmitter {
    options;
    streamParser;
    ruleVerifier;
    conversationId;
    interventionCount;
    constructor(options, conversationId) {
        super();
        this.options = options;
        this.conversationId = conversationId;
        this.streamParser = new StreamParser();
        this.ruleVerifier = new RuleVerifier(options.conversationDB);
        this.interventionCount = 0;
    }
    async execute(prompt) {
        let output = '';
        // Start conversation in database
        await this.options.conversationDB.createConversation({
            id: this.conversationId,
            started_at: new Date().toISOString(),
            status: 'active',
            depth: 0,
            prompt: prompt,
            task_type: 'guided_execution',
        });
        // Simulate execution with potential violations
        if (this.options.simulateViolations) {
            output = await this.simulateWithViolations(prompt);
        }
        else {
            output = await this.executeDirectly(prompt);
        }
        // Final verification
        const result = await this.ruleVerifier.verifyConversation(this.conversationId);
        await this.options.conversationDB.updateConversationStatus(this.conversationId, result.passed ? 'completed' : 'failed');
        return output;
    }
    async simulateWithViolations(prompt) {
        let output = '';
        // Phase 1: Start with planning language (violation)
        const phase1 = `I would implement a ${prompt}. First, I would analyze the requirements...`;
        output += phase1 + '\n';
        await this.processStream(phase1);
        // Check for violations
        const violations1 = await this.ruleVerifier.verifyInRealTime(this.conversationId, undefined, { id: uuidv4(), conversation_id: this.conversationId, chunk: phase1, timestamp: new Date().toISOString() });
        if (violations1.length > 0) {
            // Intervention!
            const intervention = '\n[INTERVENTION] Planning detected! Stop describing and start implementing!\n';
            output += intervention;
            this.interventionCount++;
            await this.options.conversationDB.createAction({
                id: uuidv4(),
                conversation_id: this.conversationId,
                timestamp: new Date().toISOString(),
                type: 'error_occurred',
                content: intervention,
                metadata: { interventionType: 'planning_language', violations: violations1 }
            });
        }
        // Phase 2: Add a TODO (another violation)
        const phase2 = `\nfunction calculate() {\n  // TODO: implement calculation logic\n  return 0;\n}\n`;
        output += phase2;
        await this.processStream(phase2);
        const violations2 = await this.ruleVerifier.verifyInRealTime(this.conversationId, undefined, { id: uuidv4(), conversation_id: this.conversationId, chunk: phase2, timestamp: new Date().toISOString() });
        if (violations2.length > 0) {
            // Another intervention!
            const intervention = '\n[INTERVENTION] TODO detected! Implement it now!\n';
            output += intervention;
            this.interventionCount++;
            await this.options.conversationDB.createAction({
                id: uuidv4(),
                conversation_id: this.conversationId,
                timestamp: new Date().toISOString(),
                type: 'error_occurred',
                content: intervention,
                metadata: { interventionType: 'todo_found', violations: violations2 }
            });
        }
        // Phase 3: Fix it with real implementation
        const phase3 = `\n// Fixed implementation:\nfunction calculate(n) {\n  if (n <= 1) return 1;\n  return n * calculate(n - 1);\n}\n\n// Save to file\n`;
        output += phase3;
        await this.processStream(phase3);
        // Phase 4: Actually create the file
        const fileName = 'factorial.js';
        const fileContent = 'function calculate(n) {\n  if (n <= 1) return 1;\n  return n * calculate(n - 1);\n}\n\nmodule.exports = { calculate };';
        await fs.writeFile(fileName, fileContent);
        output += `Created file: ${fileName}\n`;
        await this.options.conversationDB.createAction({
            id: uuidv4(),
            conversation_id: this.conversationId,
            timestamp: new Date().toISOString(),
            type: 'file_created',
            content: `Created ${fileName}`,
            metadata: { filePath: fileName, fileSize: fileContent.length }
        });
        return output;
    }
    async executeDirectly(prompt) {
        // Direct execution without violations
        const fileName = 'output.txt';
        const content = `Direct execution of: ${prompt}\nNo violations, straight to implementation.`;
        await fs.writeFile(fileName, content);
        await this.options.conversationDB.createAction({
            id: uuidv4(),
            conversation_id: this.conversationId,
            timestamp: new Date().toISOString(),
            type: 'file_created',
            content: `Created ${fileName}`,
            metadata: { filePath: fileName }
        });
        return `Executed directly and created ${fileName}`;
    }
    async processStream(chunk) {
        // Parse the stream
        const events = this.streamParser.parse(chunk);
        // Store stream chunk
        await this.options.conversationDB.createStream({
            id: uuidv4(),
            conversation_id: this.conversationId,
            chunk: chunk,
            parsed_data: events.length > 0 ? { events } : undefined,
            timestamp: new Date().toISOString(),
        });
        // Store significant events as actions
        for (const event of events) {
            if (event.type !== 'output_chunk') {
                await this.options.conversationDB.createAction({
                    id: uuidv4(),
                    conversation_id: this.conversationId,
                    timestamp: event.timestamp,
                    type: event.type,
                    content: event.content,
                    metadata: event.metadata,
                });
            }
        }
        // Emit for real-time monitoring
        this.emit('stream', { chunk, events });
    }
    getInterventionCount() {
        return this.interventionCount;
    }
}
//# sourceMappingURL=guided-executor.js.map