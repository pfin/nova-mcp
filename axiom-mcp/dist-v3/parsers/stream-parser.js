import { EventEmitter } from 'events';
export class StreamParser extends EventEmitter {
    buffer = '';
    inCodeBlock = false;
    codeBlockLanguage;
    codeBlockContent = '';
    constructor() {
        super();
    }
    parse(chunk) {
        const events = [];
        this.buffer += chunk;
        // Split by lines but keep line endings
        const lines = this.buffer.split(/(\r?\n)/);
        // Keep last incomplete line in buffer
        if (!this.buffer.endsWith('\n')) {
            this.buffer = lines.pop() || '';
        }
        else {
            this.buffer = '';
        }
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line || line === '\n' || line === '\r\n')
                continue;
            // Check for code block markers
            if (line.match(/^```(\w+)?/)) {
                if (!this.inCodeBlock) {
                    this.inCodeBlock = true;
                    const match = line.match(/^```(\w+)?/);
                    this.codeBlockLanguage = match?.[1];
                    this.codeBlockContent = '';
                }
                else {
                    // End of code block
                    this.inCodeBlock = false;
                    if (this.codeBlockContent) {
                        events.push({
                            type: 'code_block',
                            timestamp: new Date().toISOString(),
                            content: this.codeBlockContent,
                            metadata: {
                                language: this.codeBlockLanguage
                            }
                        });
                    }
                    this.codeBlockLanguage = undefined;
                    this.codeBlockContent = '';
                }
                continue;
            }
            // Accumulate code block content
            if (this.inCodeBlock) {
                this.codeBlockContent += line;
                continue;
            }
            // Detect file creation/modification
            const fileCreateMatch = line.match(/(?:creating|created|writing|wrote|saved?)\s+(?:file\s+)?[`']?([^\s`']+)[`']?/i);
            if (fileCreateMatch) {
                events.push({
                    type: 'file_created',
                    timestamp: new Date().toISOString(),
                    content: line,
                    metadata: {
                        filePath: fileCreateMatch[1]
                    }
                });
            }
            // Detect file modification
            const fileModifyMatch = line.match(/(?:modifying|modified|updating|updated|editing|edited)\s+(?:file\s+)?[`']?([^\s`']+)[`']?/i);
            if (fileModifyMatch) {
                events.push({
                    type: 'file_modified',
                    timestamp: new Date().toISOString(),
                    content: line,
                    metadata: {
                        filePath: fileModifyMatch[1]
                    }
                });
            }
            // Detect command execution ($ prompt or common commands)
            const commandMatch = line.match(/^\$\s+(.+)/) ||
                line.match(/^(?:npm|yarn|python|node|ts-node|bash|sh)\s+(.+)/);
            if (commandMatch) {
                events.push({
                    type: 'command_executed',
                    timestamp: new Date().toISOString(),
                    content: line,
                    metadata: {
                        command: commandMatch[0]
                    }
                });
            }
            // Detect errors
            if (line.match(/error:|failed:|exception:|traceback|error\s+/i)) {
                events.push({
                    type: 'error_occurred',
                    timestamp: new Date().toISOString(),
                    content: line,
                    metadata: {
                        errorType: 'runtime'
                    }
                });
            }
            // Detect task markers
            if (line.match(/starting|beginning|initiating|executing/i) && line.match(/task|implementation|step/i)) {
                events.push({
                    type: 'task_started',
                    timestamp: new Date().toISOString(),
                    content: line
                });
            }
            if (line.match(/completed|finished|done|success/i) && line.match(/task|implementation|step/i)) {
                events.push({
                    type: 'task_completed',
                    timestamp: new Date().toISOString(),
                    content: line
                });
            }
            // Always emit raw output chunks
            events.push({
                type: 'output_chunk',
                timestamp: new Date().toISOString(),
                content: line
            });
        }
        // Emit all events
        events.forEach(event => this.emit('event', event));
        return events;
    }
    reset() {
        this.buffer = '';
        this.inCodeBlock = false;
        this.codeBlockLanguage = undefined;
        this.codeBlockContent = '';
    }
}
//# sourceMappingURL=stream-parser.js.map