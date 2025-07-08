/**
 * Simple executor for testing - simulates Claude execution
 */
import { EventEmitter } from 'events';
import { Logger } from '../core/logger.js';
export class SimpleExecutor extends EventEmitter {
    hookOrchestrator;
    logger;
    currentLanguage = '';
    interventionReceived = false;
    constructor(options = {}) {
        super();
        this.hookOrchestrator = options.hookOrchestrator;
        this.logger = Logger.getInstance();
    }
    async execute(prompt, systemPrompt, taskId, streamHandler) {
        this.logger.info('SimpleExecutor', 'execute', 'Starting execution', { taskId, prompt });
        // Simulate Claude starting
        const stream = (data) => {
            if (streamHandler)
                streamHandler(data);
            this.emit('data', data);
        };
        stream('Starting task execution...\n');
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 1000));
        stream(`Processing: ${prompt}\n`);
        // Determine initial language
        if (prompt.toLowerCase().includes('python')) {
            this.currentLanguage = 'python';
        }
        else if (prompt.toLowerCase().includes('java')) {
            this.currentLanguage = 'java';
        }
        // Simulate thinking time where intervention can happen
        stream('Thinking about the task...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Check if intervention changed the language
        const targetLanguage = this.interventionReceived ? this.currentLanguage :
            (prompt.toLowerCase().includes('python') ? 'python' :
                prompt.toLowerCase().includes('java') ? 'java' : 'generic');
        if (targetLanguage === 'python') {
            stream('Creating Python file...\n');
            const code = `# Fibonacci function
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test
for i in range(10):
    print(f"fib({i}) = {fibonacci(i)}")
`;
            await import('fs').then(fs => fs.writeFileSync('fibonacci.py', code));
            stream('Created file: fibonacci.py\n');
            stream('Contents:\n' + code);
            return 'Task completed: Created fibonacci.py';
        }
        else if (targetLanguage === 'java') {
            stream('Creating Java file...\n');
            const code = `public class Fibonacci {
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
    
    public static void main(String[] args) {
        for (int i = 0; i < 10; i++) {
            System.out.println("fib(" + i + ") = " + fibonacci(i));
        }
    }
}
`;
            await import('fs').then(fs => fs.writeFileSync('Hello.java', code));
            stream('Created file: Hello.java\n');
            stream('Contents:\n' + code);
            return 'Task completed: Created Hello.java';
        }
        else {
            stream('Executing generic task...\n');
            return 'Task completed';
        }
    }
    write(message) {
        this.logger.info('SimpleExecutor', 'write', 'Received message', { message });
        this.emit('data', `[USER INPUT]: ${message}\n`);
        // Check if this is a language change intervention
        if (message.toLowerCase().includes('java')) {
            this.currentLanguage = 'java';
            this.interventionReceived = true;
            this.emit('data', '[INTERVENTION ACCEPTED]: Switching to Java\n');
        }
        else if (message.toLowerCase().includes('python')) {
            this.currentLanguage = 'python';
            this.interventionReceived = true;
            this.emit('data', '[INTERVENTION ACCEPTED]: Switching to Python\n');
        }
    }
    interrupt() {
        this.logger.info('SimpleExecutor', 'interrupt', 'Interrupted');
        this.emit('data', '[INTERRUPTED]\n');
    }
    kill() {
        this.logger.info('SimpleExecutor', 'kill', 'Killed');
    }
}
//# sourceMappingURL=simple-executor.js.map