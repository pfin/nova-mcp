#!/usr/bin/env node
/**
 * Test script for interrupt handling - Python to Java scenario
 * This demonstrates the enhanced visibility and interrupt injection
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ANSI color codes
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};
console.log(`${COLORS.bright}${COLORS.cyan}
╔═══════════════════════════════════════════════════════════╗
║         AXIOM V4 - INTERRUPT HANDLER TEST                 ║
║                                                           ║
║  Testing: Python → Java Language Change via Interrupt     ║
╚═══════════════════════════════════════════════════════════╝
${COLORS.reset}`);
// Start the MCP server
const serverPath = path.join(__dirname, '../dist-v4/index.js');
const mcpServer = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
});
// Capture server output
mcpServer.stdout.on('data', (data) => {
    process.stdout.write(`${COLORS.green}[SERVER]${COLORS.reset} ${data}`);
});
mcpServer.stderr.on('data', (data) => {
    process.stderr.write(`${COLORS.yellow}[SERVER]${COLORS.reset} ${data}`);
});
// MCP protocol helper
function sendRequest(method, params = {}) {
    const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
    };
    const message = JSON.stringify(request);
    mcpServer.stdin.write(`Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`);
}
// Wait for server to be ready
setTimeout(() => {
    console.log(`\n${COLORS.bright}${COLORS.blue}Step 1: Sending initial request to implement factorial in Python${COLORS.reset}\n`);
    // Send the initial request
    sendRequest('tools/call', {
        name: 'axiom_spawn',
        arguments: {
            prompt: 'Create a factorial function in Python. Save it to factorial.py',
            verboseMasterMode: true
        }
    });
    // Monitor for Python code detection
    let pythonDetected = false;
    let interruptSent = false;
    const monitor = setInterval(() => {
        const output = mcpServer.stderr.read();
        if (output && output.toString().includes('PYTHON_CODE')) {
            pythonDetected = true;
            console.log(`\n${COLORS.bright}${COLORS.green}✓ Python code detected!${COLORS.reset}\n`);
        }
        // Send interrupt after detecting Python code
        if (pythonDetected && !interruptSent) {
            interruptSent = true;
            console.log(`\n${COLORS.bright}${COLORS.red}Step 2: SENDING INTERRUPT TO CHANGE TO JAVA${COLORS.reset}\n`);
            // This simulates sending an interrupt through the stream
            mcpServer.stdin.write('[INTERRUPT: CHANGE TO JAVA]\n');
            setTimeout(() => {
                console.log(`\n${COLORS.bright}${COLORS.magenta}Monitoring for Java implementation...${COLORS.reset}\n`);
            }, 1000);
        }
        // Check for Java code
        if (output && output.toString().includes('JAVA_CODE')) {
            console.log(`\n${COLORS.bright}${COLORS.green}✅ SUCCESS! Java code detected after interrupt!${COLORS.reset}\n`);
            clearInterval(monitor);
            // Gracefully shut down
            setTimeout(() => {
                console.log(`\n${COLORS.bright}${COLORS.cyan}Test complete. Shutting down...${COLORS.reset}\n`);
                mcpServer.kill();
                process.exit(0);
            }, 2000);
        }
    }, 500);
    // Timeout after 30 seconds
    setTimeout(() => {
        console.log(`\n${COLORS.bright}${COLORS.red}Test timed out after 30 seconds${COLORS.reset}\n`);
        mcpServer.kill();
        process.exit(1);
    }, 30000);
}, 2000);
// Handle errors
mcpServer.on('error', (error) => {
    console.error(`${COLORS.red}Server error:${COLORS.reset}`, error);
    process.exit(1);
});
process.on('SIGINT', () => {
    console.log(`\n${COLORS.yellow}Interrupted by user${COLORS.reset}`);
    mcpServer.kill();
    process.exit(0);
});
//# sourceMappingURL=test-interrupt.js.map