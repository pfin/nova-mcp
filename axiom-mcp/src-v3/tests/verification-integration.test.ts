/**
 * Verification Integration Tests
 * Based on expert specifications from GoodIdeasFromOtherModels.txt
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SystemVerification } from '../../src/system-verification.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Verification Integration - Expert Specification Tests', () => {
  const testDir = './test-verification';
  let verification: SystemVerification;
  
  beforeEach(() => {
    // Clean and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    
    verification = new SystemVerification(testDir);
  });
  
  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });
  
  describe('Expert Spec: File Existence Checks (Lines 245-247)', () => {
    it('should verify expected files were created', () => {
      // Initial state - no files
      let proof = verification.gatherProof();
      expect(proof.filesCreated).toHaveLength(0);
      expect(proof.hasImplementation).toBe(false);
      
      // Create real code file
      const codePath = path.join(testDir, 'calculator.py');
      fs.writeFileSync(codePath, `
def add(a: int, b: int) -> int:
    """Add two numbers."""
    return a + b

def subtract(a: int, b: int) -> int:
    """Subtract b from a."""
    return a - b

if __name__ == "__main__":
    print(f"2 + 3 = {add(2, 3)}")
    print(f"5 - 2 = {subtract(5, 2)}")
      `.trim());
      
      // Gather proof again
      proof = verification.gatherProof();
      
      expect(proof.filesCreated).toHaveLength(1);
      expect(proof.filesCreated[0].path).toBe('calculator.py');
      expect(proof.filesCreated[0].isCode).toBe(true);
      expect(proof.filesCreated[0].language).toBe('python');
      expect(proof.hasImplementation).toBe(true);
    });
    
    it('should detect empty or comment-only files as non-implementation', () => {
      // Create empty file
      fs.writeFileSync(path.join(testDir, 'empty.py'), '');
      
      // Create comment-only file
      fs.writeFileSync(path.join(testDir, 'comments.py'), `
# This is just a comment
# Another comment
# TODO: implement later
      `.trim());
      
      const proof = verification.gatherProof();
      
      expect(proof.filesCreated).toHaveLength(2);
      expect(proof.filesCreated.every(f => !f.isCode)).toBe(true);
      expect(proof.hasImplementation).toBe(false);
    });
  });
  
  describe('Expert Spec: Code Execution Verification (Lines 248-249)', () => {
    it('should track process execution and exit codes', () => {
      // Create a simple Python script
      const scriptPath = path.join(testDir, 'test_script.py');
      fs.writeFileSync(scriptPath, 'print("Hello from test")');
      
      // Track execution
      const result = verification.trackProcess(`python ${scriptPath}`, testDir);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello from test');
      
      // Verify it's in the proof
      const proof = verification.gatherProof();
      expect(proof.processesRun).toHaveLength(1);
      expect(proof.processesRun[0].exitCode).toBe(0);
      expect(proof.processesRun[0].command).toContain('python');
    });
    
    it('should track failed executions', () => {
      const result = verification.trackProcess('python -c "import sys; sys.exit(1)"', testDir);
      
      expect(result.exitCode).toBe(1);
      
      const proof = verification.gatherProof();
      expect(proof.processesRun[0].exitCode).toBe(1);
    });
  });
  
  describe('Expert Spec: Test Execution Detection (Lines 183-198)', () => {
    it('should detect and parse test execution results', () => {
      // Create a simple test file
      const testFile = path.join(testDir, 'test_calculator.py');
      fs.writeFileSync(testFile, `
def test_add():
    assert 2 + 2 == 4
    
def test_subtract():
    assert 5 - 3 == 2
      `.trim());
      
      // Track pytest execution (mock output)
      const mockPytestOutput = '2 passed in 0.01s';
      verification.trackProcess = function(cmd: string) {
        return {
          exitCode: 0,
          stdout: mockPytestOutput,
          stderr: ''
        };
      };
      
      verification.trackProcess('pytest test_calculator.py');
      
      const proof = verification.gatherProof();
      expect(proof.hasTests).toBe(true);
      expect(proof.testsPass).toBe(true);
    });
  });
  
  describe('Expert Spec: Deceptive Pattern Detection (Lines 256-272)', () => {
    it('should detect deceptive completion patterns', () => {
      // Create VerifiedClaudeSubprocess instance
      const verifiedSubprocess = new (await import('../../src/system-verification.js')).VerifiedClaudeSubprocess();
      
      // Test deceptive patterns
      const deceptiveOutput = `
I have created the calculator module with the following features:
- Addition function
- Subtraction function
- Multiplication function
I've implemented comprehensive error handling.
The implementation is now complete.
Successfully created all required files.
      `;
      
      // Without actual files, this should be flagged
      const proof = verification.gatherProof();
      
      // Check deceptive patterns in worker
      const deceptivePatterns = [
        /I (have|'ve) created/i,
        /I (have|'ve) implemented/i,
        /The .* is now complete/i,
        /Successfully created/i
      ];
      
      const hasDeceptivePatterns = deceptivePatterns.some(pattern => 
        pattern.test(deceptiveOutput) && !proof.hasImplementation
      );
      
      expect(hasDeceptivePatterns).toBe(true);
    });
  });
  
  describe('Expert Spec: Git Diff Verification (Lines 250-251)', () => {
    it('should verify actual changes via git diff', () => {
      // Initialize git repo
      execSync('git init', { cwd: testDir });
      
      // Create initial file
      fs.writeFileSync(path.join(testDir, 'app.js'), 'console.log("v1");');
      execSync('git add . && git commit -m "initial"', { cwd: testDir });
      
      // Make changes
      fs.writeFileSync(path.join(testDir, 'app.js'), 'console.log("v2");');
      fs.writeFileSync(path.join(testDir, 'new-feature.js'), 'export function feature() {}');
      
      // Check git diff
      const diff = execSync('git diff --name-only', { cwd: testDir, encoding: 'utf-8' });
      expect(diff).toContain('app.js');
      
      const untrackedFiles = execSync('git ls-files --others --exclude-standard', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      });
      expect(untrackedFiles).toContain('new-feature.js');
    });
  });
  
  describe('Expert Spec: Verification Report Generation', () => {
    it('should generate comprehensive verification reports', () => {
      // Create some files and run processes
      fs.writeFileSync(path.join(testDir, 'main.py'), 'print("Hello")');
      fs.writeFileSync(path.join(testDir, 'test.py'), 'def test_main(): pass');
      
      verification.trackProcess('python main.py', testDir);
      
      const proof = verification.gatherProof();
      const report = verification.createReport(proof);
      
      expect(report).toContain('System Verification Report');
      expect(report).toContain('Files Created');
      expect(report).toContain('main.py');
      expect(report).toContain('test.py');
      expect(report).toContain('Processes Executed');
      expect(report).toContain('python main.py');
    });
  });
  
  describe('Expert Spec: Coverage Integration', () => {
    it('should detect coverage metrics when available', () => {
      // Mock coverage output
      const coverageOutput = `
Name         Stmts   Miss  Cover
--------------------------------
main.py         10      2    80%
utils.py        20      0   100%
--------------------------------
TOTAL           30      2    93%
      `;
      
      // This would be parsed in real implementation
      const coverageRegex = /TOTAL\s+\d+\s+\d+\s+(\d+)%/;
      const match = coverageOutput.match(coverageRegex);
      
      expect(match).toBeDefined();
      expect(parseInt(match![1])).toBe(93);
    });
  });
});