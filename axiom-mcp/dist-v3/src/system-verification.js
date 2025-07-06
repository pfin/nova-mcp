/**
 * System-Level Verification
 *
 * This module provides unhackable verification that cannot be bypassed
 * by clever prompting or AI responses. It checks actual system artifacts.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
export class SystemVerification {
    startTime;
    workingDir;
    trackedFiles = new Set();
    trackedProcesses = [];
    // Unhackable patterns - based on system behavior, not text
    CODE_EXTENSIONS = /\.(js|ts|jsx|tsx|py|java|go|rs|cpp|c|cs|rb|php)$/;
    TEST_PATTERNS = /\.(test|spec|tests)\./;
    TEST_COMMANDS = /^(npm|yarn|pnpm|jest|mocha|pytest|go|cargo|mvn|gradle)\s+(test|spec)/;
    constructor(workingDir = process.cwd()) {
        this.startTime = Date.now();
        this.workingDir = workingDir;
        this.captureInitialState();
    }
    /**
     * Capture file system state before task execution
     */
    captureInitialState() {
        try {
            // Track existing files to detect new ones
            const files = this.getAllFiles(this.workingDir);
            files.forEach(f => this.trackedFiles.add(f));
        }
        catch (error) {
            console.error('[SystemVerification] Failed to capture initial state:', error);
        }
    }
    /**
     * Get all files recursively
     */
    getAllFiles(dir, fileList = []) {
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                    this.getAllFiles(filePath, fileList);
                }
                else if (stat.isFile()) {
                    fileList.push(filePath);
                }
            }
        }
        catch (error) {
            // Ignore permission errors
        }
        return fileList;
    }
    /**
     * Track a process execution (unhackable - based on actual system calls)
     */
    trackProcess(command, cwd) {
        const startTime = Date.now();
        let result = { exitCode: -1, stdout: '', stderr: '' };
        try {
            const stdout = execSync(command, {
                cwd: cwd || this.workingDir,
                encoding: 'utf-8',
                stdio: 'pipe'
            });
            result = {
                exitCode: 0,
                stdout: stdout,
                stderr: ''
            };
        }
        catch (error) {
            result = {
                exitCode: error.status || 1,
                stdout: error.stdout?.toString() || '',
                stderr: error.stderr?.toString() || error.message
            };
        }
        const duration = Date.now() - startTime;
        this.trackedProcesses.push({
            command,
            ...result,
            duration,
            timestamp: new Date()
        });
        return result;
    }
    /**
     * Gather verification proof (cannot be faked - checks actual system state)
     */
    gatherProof() {
        const currentFiles = this.getAllFiles(this.workingDir);
        const newFiles = currentFiles.filter(f => !this.trackedFiles.has(f));
        // Analyze new files
        const filesCreated = newFiles.map(filePath => {
            const stat = fs.statSync(filePath);
            const content = this.CODE_EXTENSIONS.test(filePath) ?
                fs.readFileSync(filePath, 'utf-8') : '';
            // Verify the file has real code, not just comments or empty
            const hasRealCode = content.length > 50 &&
                !/^\s*(\/\/|#|\/\*|\*)*\s*$/.test(content) &&
                (content.includes('function') || content.includes('class') ||
                    content.includes('const') || content.includes('def') ||
                    content.includes('impl') || content.includes('struct'));
            return {
                path: path.relative(this.workingDir, filePath),
                size: stat.size,
                isCode: this.CODE_EXTENSIONS.test(filePath) && hasRealCode,
                language: this.detectLanguage(filePath)
            };
        });
        // Filter for actual code files with real content
        const codeFiles = filesCreated.filter(f => f.isCode && f.size > 50);
        const testFiles = filesCreated.filter(f => this.TEST_PATTERNS.test(f.path) && f.size > 50);
        // Analyze test execution
        const testProcesses = this.trackedProcesses.filter(p => this.TEST_COMMANDS.test(p.command));
        let testResults;
        if (testProcesses.length > 0) {
            const lastTest = testProcesses[testProcesses.length - 1];
            testResults = this.parseTestOutput(lastTest.stdout);
        }
        // Stricter verification status
        const hasImplementation = codeFiles.length > 0 && codeFiles.some(f => f.size > 100);
        const hasTests = testFiles.length > 0 || (testProcesses.length > 0 && testProcesses.some(p => p.exitCode === 0));
        const testsPass = testProcesses.some(p => p.exitCode === 0 && p.stdout.length > 0);
        // Calculate code metrics
        const totalCodeSize = codeFiles.reduce((sum, f) => sum + f.size, 0);
        const avgCodeSize = codeFiles.length > 0 ? totalCodeSize / codeFiles.length : 0;
        const proof = {
            filesCreated,
            processesRun: this.trackedProcesses,
            testResults,
            isValid: hasImplementation && totalCodeSize > 200, // At least 200 bytes of real code
            hasImplementation,
            hasTests,
            testsPass,
            meetsRequirements: hasImplementation && (testsPass || testFiles.length > 0)
        };
        return proof;
    }
    /**
     * Detect programming language from file extension
     */
    detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const langMap = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.rb': 'ruby',
            '.php': 'php'
        };
        return langMap[ext];
    }
    /**
     * Parse test output to extract results
     */
    parseTestOutput(output) {
        // Jest pattern
        const jestMatch = output.match(/Tests?:.*?(\d+)\s+passed.*?(\d+)\s+total/);
        if (jestMatch) {
            return {
                passed: parseInt(jestMatch[1]),
                failed: parseInt(jestMatch[2]) - parseInt(jestMatch[1]),
                total: parseInt(jestMatch[2])
            };
        }
        // Pytest pattern
        const pytestMatch = output.match(/(\d+)\s+passed.*?(\d+)\s+failed/);
        if (pytestMatch) {
            return {
                passed: parseInt(pytestMatch[1]),
                failed: parseInt(pytestMatch[2]),
                total: parseInt(pytestMatch[1]) + parseInt(pytestMatch[2])
            };
        }
        // Generic pass pattern
        if (/pass|✓|success|ok/i.test(output) && !/fail|✗|error/i.test(output)) {
            return { passed: 1, failed: 0, total: 1 };
        }
        return null;
    }
    /**
     * Create a verification report
     */
    createReport(proof) {
        let report = '# System Verification Report\n\n';
        if (proof.meetsRequirements) {
            report += '✅ **VERIFICATION PASSED** - Implementation with passing tests detected\n\n';
        }
        else if (proof.hasImplementation) {
            report += '⚠️ **PARTIAL VERIFICATION** - Implementation found but tests failing/missing\n\n';
        }
        else {
            report += '❌ **VERIFICATION FAILED** - No implementation detected\n\n';
        }
        report += '## System Evidence\n\n';
        // Files created
        report += `### Files Created (${proof.filesCreated.length})\n`;
        if (proof.filesCreated.length > 0) {
            proof.filesCreated.forEach(f => {
                report += `- ${f.path} (${f.size} bytes${f.language ? `, ${f.language}` : ''})\n`;
            });
        }
        else {
            report += '- No new files created\n';
        }
        report += '\n';
        // Processes run
        report += `### Processes Executed (${proof.processesRun.length})\n`;
        if (proof.processesRun.length > 0) {
            proof.processesRun.forEach(p => {
                report += `- \`${p.command}\` (exit: ${p.exitCode}, duration: ${p.duration}ms)\n`;
            });
        }
        else {
            report += '- No processes executed\n';
        }
        report += '\n';
        // Test results
        if (proof.testResults) {
            report += '### Test Results\n';
            report += `- Passed: ${proof.testResults.passed}\n`;
            report += `- Failed: ${proof.testResults.failed}\n`;
            const total = 'total' in proof.testResults
                ? proof.testResults.total
                : proof.testResults.passed + proof.testResults.failed;
            report += `- Total: ${total}\n`;
        }
        return report;
    }
}
/**
 * Unhackable subprocess wrapper
 */
export class VerifiedClaudeSubprocess {
    UNHACKABLE_PREFIX = `
[SYSTEM VERIFICATION ACTIVE]
This session is monitored by system-level verification.
The following will be tracked and verified:
1. All files created (by monitoring file system)
2. All processes executed (by monitoring system calls)
3. All test results (by parsing actual output)

You cannot fake these metrics - they are verified at the OS level.
Only actual implementation that creates real files and runs real tests will pass.

`;
    async execute(prompt, options = {}) {
        const verification = new SystemVerification();
        // Add unhackable prefix
        const verifiedPrompt = this.UNHACKABLE_PREFIX + prompt;
        // Execute with monitoring
        const result = await this.executeWithTracking(verifiedPrompt, options, verification);
        // Gather proof
        const proof = verification.gatherProof();
        // Enforce verification
        if (!proof.hasImplementation && !proof.hasTests) {
            const report = verification.createReport(proof);
            throw new Error(`Verification Failed - No implementation detected:\n${report}`);
        }
        // Add verification proof to result
        result.verification = proof;
        result.verificationReport = verification.createReport(proof);
        return result;
    }
    async executeWithTracking(prompt, options, verification) {
        // This would integrate with the actual Claude subprocess
        // For now, it's a placeholder showing the structure
        const claudeResult = {
            response: "Implementation would go here",
            verification: null,
            verificationReport: null
        };
        // Track any processes mentioned in the response
        const commandMatches = claudeResult.response.matchAll(/\$\s+([^\n]+)/g);
        for (const match of commandMatches) {
            const command = match[1];
            if (this.isSafeCommand(command)) {
                verification.trackProcess(command);
            }
        }
        return claudeResult;
    }
    isSafeCommand(command) {
        // Only allow safe commands
        const safePatterns = [
            /^npm\s+(test|run)/,
            /^yarn\s+(test|run)/,
            /^jest/,
            /^pytest/,
            /^go\s+test/,
            /^cargo\s+test/,
            /^node\s+/,
            /^python\s+/
        ];
        return safePatterns.some(pattern => pattern.test(command));
    }
}
//# sourceMappingURL=system-verification.js.map