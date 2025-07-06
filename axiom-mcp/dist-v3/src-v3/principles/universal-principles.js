/**
 * Universal Principles for Axiom MCP
 * These principles guide all code generation and verification
 */
export const UNIVERSAL_CODING_PRINCIPLES = [
    {
        id: 'no-mocks',
        name: 'No Mocks Ever',
        category: 'coding',
        description: 'Never use mock data, mock functions, or hardcoded test values. Always use real execution and real data.',
        verificationRule: 'Code must not contain mock implementations, stub functions, or hardcoded test data',
        examples: {
            bad: [
                'const mockData = { id: 1, name: "test" }',
                'function mockExecutor() { return "fake result" }',
                'const users = ["user1", "user2"] // hardcoded'
            ],
            good: [
                'const data = await database.query("SELECT * FROM users")',
                'const result = await executor.run(command)',
                'const users = await api.fetchUsers()'
            ]
        }
    },
    {
        id: 'real-execution',
        name: 'Real Execution Only',
        category: 'execution',
        description: 'Every operation must perform real actions. No simulations, no dry runs, no preview modes.',
        verificationRule: 'All functions must execute real operations and produce real side effects',
        examples: {
            bad: [
                '// This would create a file',
                'console.log("Would execute: " + command)',
                'if (!dryRun) { writeFile() }'
            ],
            good: [
                'fs.writeFileSync(path, content)',
                'const result = execSync(command)',
                'await database.insert(record)'
            ]
        }
    },
    {
        id: 'verify-dont-trust',
        name: 'Verify, Don\'t Trust',
        category: 'coding',
        description: 'Always verify operations succeeded. Check file existence, validate outputs, confirm state changes.',
        verificationRule: 'Every operation must be followed by verification of its success',
        examples: {
            bad: [
                'writeFile(path, content); // assume it worked',
                'await createUser(data); return "success"'
            ],
            good: [
                'writeFile(path, content); if (!fs.existsSync(path)) throw new Error("File not created")',
                'const user = await createUser(data); if (!user.id) throw new Error("User creation failed")'
            ]
        }
    },
    {
        id: 'no-todos',
        name: 'No TODOs or Placeholders',
        category: 'coding',
        description: 'Implement fully or not at all. No TODO comments, no "implement later", no stub functions.',
        verificationRule: 'Code must not contain TODO, FIXME, XXX, or placeholder implementations',
        examples: {
            bad: [
                '// TODO: implement error handling',
                'function processData() { /* TODO */ }',
                'throw new Error("Not implemented")'
            ],
            good: [
                'try { processData() } catch(e) { logger.error(e); throw e; }',
                'function processData() { return data.map(transform).filter(validate) }',
                'if (!feature) { logger.warn("Feature disabled"); return null; }'
            ]
        }
    },
    {
        id: 'observable-operations',
        name: 'Observable Operations',
        category: 'execution',
        description: 'Every operation must produce observable output. Log actions, emit events, update state.',
        verificationRule: 'Operations must produce logs, events, or state changes that can be observed',
        examples: {
            bad: [
                'data = transform(data); // silent operation',
                'if (condition) { flag = true; } // no feedback'
            ],
            good: [
                'logger.info("Transforming data"); data = transform(data); logger.info(`Transformed ${data.length} items`)',
                'if (condition) { flag = true; eventEmitter.emit("flagSet", { reason: condition }); }'
            ]
        }
    }
];
export const UNIVERSAL_THINKING_PRINCIPLES = [
    {
        id: 'action-over-planning',
        name: 'Action Over Planning',
        category: 'thinking',
        description: 'Implement first, refine later. Stop planning and start doing.',
        verificationRule: 'Output must contain working code, not descriptions of code',
        examples: {
            bad: [
                'I would implement a function that...',
                'The approach would be to...',
                'We could create a system that...'
            ],
            good: [
                'function calculate() { return x * y }',
                'class DataProcessor { process() {...} }',
                'const result = await api.fetch()'
            ]
        }
    },
    {
        id: 'fail-fast-loudly',
        name: 'Fail Fast and Loudly',
        category: 'thinking',
        description: 'When something goes wrong, fail immediately with clear error messages.',
        verificationRule: 'Errors must be thrown immediately with descriptive messages',
        examples: {
            bad: [
                'if (error) { return null; }',
                'try { risky() } catch(e) { /* ignore */ }',
                'if (!valid) { console.log("invalid"); }'
            ],
            good: [
                'if (error) { throw new Error(`Operation failed: ${error.message}`); }',
                'if (!file) { throw new Error(`File not found: ${path}`); }',
                'assert(valid, `Invalid input: expected number, got ${typeof input}`)'
            ]
        }
    },
    {
        id: 'concrete-over-abstract',
        name: 'Concrete Over Abstract',
        category: 'thinking',
        description: 'Write specific, concrete implementations. Avoid over-abstraction and premature generalization.',
        verificationRule: 'Code must solve the specific problem at hand, not hypothetical future problems',
        examples: {
            bad: [
                'class AbstractFactory<T extends Base> { /* 5 levels of abstraction */ }',
                'interface IGenericProcessor<T, U, V> { }',
                'function createDynamicHandler(type, config, options, metadata) { }'
            ],
            good: [
                'function calculateTax(amount: number): number { return amount * 0.15 }',
                'class UserService { async getUser(id: string) { } }',
                'function saveFile(path: string, content: string) { }'
            ]
        }
    },
    {
        id: 'measure-dont-guess',
        name: 'Measure, Don\'t Guess',
        category: 'thinking',
        description: 'Base decisions on measured data, not assumptions. Time operations, count iterations, profile performance.',
        verificationRule: 'Performance claims must be backed by measurements',
        examples: {
            bad: [
                '// This should be fast enough',
                '// Probably uses less memory',
                '// I think this is more efficient'
            ],
            good: [
                'console.time("operation"); doWork(); console.timeEnd("operation"); // 245ms',
                'const before = process.memoryUsage(); doWork(); const after = process.memoryUsage();',
                'const iterations = 0; for(...) { iterations++; } logger.info(`Processed ${iterations} items`)'
            ]
        }
    },
    {
        id: 'explicit-over-implicit',
        name: 'Explicit Over Implicit',
        category: 'thinking',
        description: 'Make intentions, types, and behaviors explicit. No magic, no hidden behavior.',
        verificationRule: 'Code behavior must be obvious from reading it',
        examples: {
            bad: [
                'function process(data) { } // what type? what does it do?',
                'if (user.level > 5) { } // what does level 5 mean?',
                'config.mode = 2; // what is mode 2?'
            ],
            good: [
                'function validateEmail(email: string): boolean { }',
                'if (user.permissionLevel > PermissionLevel.ADMIN) { }',
                'config.mode = ExecutionMode.PARALLEL; // explicit enum'
            ]
        }
    }
];
export class PrincipleEnforcer {
    principles = new Map();
    constructor() {
        // Load all principles
        [...UNIVERSAL_CODING_PRINCIPLES, ...UNIVERSAL_THINKING_PRINCIPLES].forEach(p => {
            this.principles.set(p.id, p);
        });
    }
    /**
     * Check if code violates any principles
     */
    checkViolations(code) {
        const violations = [];
        // Check for mocks
        if (code.match(/\b(mock|stub|fake|dummy)\b/i) || code.includes('hardcoded')) {
            violations.push({
                principle: this.principles.get('no-mocks'),
                violation: 'Code contains mock or hardcoded values'
            });
        }
        // Check for TODOs
        if (code.match(/\b(TODO|FIXME|XXX|HACK)\b/)) {
            violations.push({
                principle: this.principles.get('no-todos'),
                violation: 'Code contains TODO or placeholder'
            });
        }
        // Check for planning language
        if (code.match(/\b(I would|I will|would implement|could create|plan to)\b/i)) {
            violations.push({
                principle: this.principles.get('action-over-planning'),
                violation: 'Contains planning language instead of implementation'
            });
        }
        // Check for silent catches
        if (code.match(/catch\s*\([^)]*\)\s*{\s*(\/\/.*)?}/)) {
            violations.push({
                principle: this.principles.get('fail-fast-loudly'),
                violation: 'Empty catch block swallows errors'
            });
        }
        return violations;
    }
    /**
     * Generate principle-aware prompt additions
     */
    generatePromptGuidance() {
        return `
# UNIVERSAL PRINCIPLES - MUST FOLLOW

## Coding Principles
${UNIVERSAL_CODING_PRINCIPLES.map(p => `- **${p.name}**: ${p.description}`).join('\n')}

## Thinking Principles  
${UNIVERSAL_THINKING_PRINCIPLES.map(p => `- **${p.name}**: ${p.description}`).join('\n')}

## CRITICAL RULES
1. NO MOCKS - Real execution only
2. NO TODOs - Implement fully or not at all
3. NO PLANNING - Write code, not descriptions
4. VERIFY EVERYTHING - Check that operations succeeded
5. FAIL LOUDLY - Throw errors with clear messages

Remember: Every line of code must DO something real, not pretend to do it.`;
    }
}
//# sourceMappingURL=universal-principles.js.map