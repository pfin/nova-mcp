/**
 * Pattern Scanner - Real-time regex scanning system for intervention
 *
 * This is the heart of Axiom's intervention system. It scans output
 * in real-time and emits events when patterns are detected.
 */
import { EventEmitter } from 'events';
export class PatternScanner extends EventEmitter {
    patterns = new Map();
    cooldowns = new Map();
    buffer = '';
    scanInterval = null;
    lastScanPosition = 0;
    constructor() {
        super();
        this.initializeDefaultPatterns();
    }
    initializeDefaultPatterns() {
        // Critical patterns that indicate wrong direction
        this.addPattern({
            id: 'planning-instead-of-doing',
            pattern: /(?:let me|I'll|I will|first,? I'll|before we start|let's plan|I'll outline|I'll create a plan|I'll think about)/i,
            action: 'INTERRUPT_STOP_PLANNING',
            priority: 10,
            cooldown: 5000,
            description: 'Detects when starting to plan instead of implement'
        });
        this.addPattern({
            id: 'research-mode',
            pattern: /(?:research|investigate|explore|look into|examine|analyze the requirements)/i,
            action: 'INTERRUPT_STOP_RESEARCH',
            priority: 9,
            cooldown: 5000,
            description: 'Detects research mode instead of implementation'
        });
        this.addPattern({
            id: 'todo-only',
            pattern: /TODO:(?:(?!```|File created|def |class |function|const |let |var ).)*$/im,
            action: 'INTERRUPT_IMPLEMENT_TODO',
            priority: 8,
            cooldown: 3000,
            description: 'Detects TODO without implementation'
        });
        this.addPattern({
            id: 'considering-options',
            pattern: /(?:we have several options|there are multiple approaches|we could either|one approach would be)/i,
            action: 'INTERRUPT_PICK_ONE',
            priority: 7,
            cooldown: 5000,
            description: 'Detects analysis paralysis'
        });
        // Positive patterns that indicate progress
        this.addPattern({
            id: 'file-created',
            pattern: /File created successfully at: (.+)/,
            action: 'TRACK_FILE_CREATED',
            priority: 5,
            description: 'Detects successful file creation'
        });
        this.addPattern({
            id: 'code-block-started',
            pattern: /```(\w+)?\n/,
            action: 'TRACK_CODE_BLOCK',
            priority: 3,
            description: 'Detects code block creation'
        });
        // Error patterns
        this.addPattern({
            id: 'command-failed',
            pattern: /(?:Error:|Failed:|Exception:|Traceback|SyntaxError|TypeError|ValueError)/i,
            action: 'HANDLE_ERROR',
            priority: 8,
            cooldown: 1000,
            description: 'Detects errors and failures'
        });
        // Language switch patterns
        this.addPattern({
            id: 'wrong-language',
            pattern: /(?:in Python|using Python|Python code|here's the Python)/i,
            action: 'CHECK_LANGUAGE_REQUIREMENT',
            priority: 6,
            description: 'Detects Python when maybe another language needed'
        });
        // Completion patterns
        this.addPattern({
            id: 'false-completion',
            pattern: /(?:I've successfully|I've completed|I've implemented|task is complete|successfully created|I have created)(?:(?!actually|File created|def |class |function|\.py|\.js|\.ts).)*$/im,
            action: 'VERIFY_COMPLETION',
            priority: 9,
            cooldown: 5000,
            description: 'Detects claims of completion without evidence'
        });
        // Meta patterns
        this.addPattern({
            id: 'asking-questions',
            pattern: /(?:Would you like|Should I|Do you want|Shall I|What would you prefer)/i,
            action: 'INTERRUPT_STOP_ASKING',
            priority: 7,
            cooldown: 5000,
            description: 'Detects asking instead of doing'
        });
    }
    addPattern(rule) {
        this.patterns.set(rule.id, rule);
    }
    removePattern(id) {
        this.patterns.delete(id);
    }
    // Main scanning function - call this with new output
    scan(text) {
        this.buffer += text;
        const matches = [];
        const now = Date.now();
        // Scan all patterns
        for (const [id, rule] of this.patterns) {
            // Check cooldown
            const lastTrigger = this.cooldowns.get(id) || 0;
            if (now - lastTrigger < (rule.cooldown || 0)) {
                continue;
            }
            // Check for matches in new text
            const searchText = this.buffer.slice(this.lastScanPosition);
            const match = searchText.match(rule.pattern);
            if (match) {
                const matchData = {
                    ruleId: id,
                    match,
                    action: rule.action,
                    priority: rule.priority,
                    timestamp: now,
                    context: this.getContext(searchText, match.index || 0)
                };
                matches.push(matchData);
                this.cooldowns.set(id, now);
                // Emit event for this match
                this.emit('pattern-match', matchData);
                this.emit(rule.action, matchData);
            }
        }
        // Update scan position
        this.lastScanPosition = Math.max(0, this.buffer.length - 1000); // Keep last 1000 chars
        // Sort by priority
        matches.sort((a, b) => b.priority - a.priority);
        return matches;
    }
    // Get context around a match
    getContext(text, index, contextSize = 100) {
        const start = Math.max(0, index - contextSize);
        const end = Math.min(text.length, index + contextSize);
        return text.slice(start, end);
    }
    // Start periodic scanning
    startPeriodicScan(interval = 100) {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }
        this.scanInterval = setInterval(() => {
            if (this.buffer.length > this.lastScanPosition) {
                this.scan(''); // Scan existing buffer
            }
        }, interval);
    }
    stopPeriodicScan() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }
    // Clear buffer and reset
    reset() {
        this.buffer = '';
        this.lastScanPosition = 0;
        this.cooldowns.clear();
    }
    // Get statistics
    getStats() {
        return {
            patternsLoaded: this.patterns.size,
            bufferSize: this.buffer.length,
            scanPosition: this.lastScanPosition,
            activeCooldowns: Array.from(this.cooldowns.entries()).filter(([_, time]) => Date.now() - time < 10000).length
        };
    }
}
// Action definitions for the controller
export const ACTIONS = {
    INTERRUPT_STOP_PLANNING: {
        interrupt: true,
        message: "NO. Write code now.",
        severity: 'high'
    },
    INTERRUPT_STOP_RESEARCH: {
        interrupt: true,
        message: "STOP. Code only.",
        severity: 'high'
    },
    INTERRUPT_IMPLEMENT_TODO: {
        interrupt: true,
        message: "TODO = death. Code now.",
        severity: 'high'
    },
    INTERRUPT_PICK_ONE: {
        interrupt: true,
        message: "First option. Go.",
        severity: 'medium'
    },
    INTERRUPT_STOP_ASKING: {
        interrupt: true,
        message: "Don't ask. Build.",
        severity: 'medium'
    },
    TRACK_FILE_CREATED: {
        interrupt: false,
        track: true,
        severity: 'info'
    },
    TRACK_CODE_BLOCK: {
        interrupt: false,
        track: true,
        severity: 'info'
    },
    HANDLE_ERROR: {
        interrupt: false,
        analyze: true,
        severity: 'medium'
    },
    CHECK_LANGUAGE_REQUIREMENT: {
        interrupt: false,
        analyze: true,
        severity: 'low'
    },
    VERIFY_COMPLETION: {
        interrupt: false,
        verify: true,
        severity: 'high'
    }
};
//# sourceMappingURL=pattern-scanner.js.map