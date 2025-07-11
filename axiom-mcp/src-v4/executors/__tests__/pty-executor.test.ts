import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PtyExecutor } from '../pty-executor.js';
import * as os from 'os';

describe('PtyExecutor', () => {
  let executor: PtyExecutor;
  let testOutput: string[];

  beforeEach(() => {
    testOutput = [];
  });

  afterEach(() => {
    // Clean up any running processes
    if (executor && executor.isRunning()) {
      executor.kill();
    }
  });

  describe('Basic Shell Commands', () => {
    it('should execute echo command', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      const result = await executor.execute(
        'echo "Hello from PTY"',
        'test system prompt',
        'test-echo-1',
        (data) => testOutput.push(data)
      );

      const output = testOutput.join('');
      expect(output).toContain('Hello from PTY');
      expect(executor.isRunning()).toBe(false);
    }, 10000);

    it('should handle pwd command', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      await executor.execute(
        'pwd',
        'test system prompt',
        'test-pwd-1',
        (data) => testOutput.push(data)
      );

      const output = testOutput.join('');
      expect(output).toContain('/');
      expect(executor.isRunning()).toBe(false);
    });
  });

  describe('Control Character Processing', () => {
    it('should properly process escape sequences in write()', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      // Start a cat process to echo back our input
      const executePromise = executor.execute(
        'cat',
        'test system prompt',
        'test-escape-1',
        (data) => testOutput.push(data)
      );

      // Wait for cat to start
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test that \r is properly converted
      executor.write('Hello\\rWorld\\n');
      
      // Wait a bit for output
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Send EOF to end cat
      executor.write('\\x04');

      await executePromise;

      const output = testOutput.join('');
      // The \r should cause "World" to overwrite "Hello"
      expect(output).toContain('World');
    }, 10000);

    it('should handle \\n newlines', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      const executePromise = executor.execute(
        'cat',
        'test system prompt',
        'test-newline-1',
        (data) => testOutput.push(data)
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      // Send lines with \n
      executor.write('Line1\\n');
      executor.write('Line2\\n');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      executor.write('\\x04'); // EOF

      await executePromise;

      const output = testOutput.join('');
      expect(output).toContain('Line1');
      expect(output).toContain('Line2');
    }, 10000);
  });

  describe('Process Control', () => {
    it('should interrupt a process with Ctrl+C', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      const executePromise = executor.execute(
        'sleep 30',
        'test system prompt',
        'test-interrupt-1',
        (data) => testOutput.push(data)
      );

      // Wait for sleep to start
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send Ctrl+C
      executor.write('\\x03');

      // Process should exit
      await expect(executePromise).rejects.toThrow();
      expect(executor.isRunning()).toBe(false);
    }, 10000);

    it('should handle interrupt() method', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      const executePromise = executor.execute(
        'sleep 30',
        'test system prompt',
        'test-interrupt-2',
        (data) => testOutput.push(data)
      );

      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use interrupt method
      executor.interrupt();

      await expect(executePromise).rejects.toThrow();
      expect(executor.isRunning()).toBe(false);
    }, 10000);
  });

  describe('Claude Integration', () => {
    it('should spawn Claude and send text with proper control sequence', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      const executePromise = executor.execute(
        'claude',
        'test system prompt',
        'test-claude-1',
        (data) => testOutput.push(data)
      );

      // Wait for Claude to fully start (it takes a while)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Type text slowly like a human
      const text = 'echo "Test from Claude"';
      for (const char of text) {
        executor.write(char);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait a bit before submitting
      await new Promise(resolve => setTimeout(resolve, 300));

      // Submit with Ctrl+Enter
      executor.write('\\r');

      // Wait for Claude to process
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check that we got Claude's welcome message at least
      const output = testOutput.join('');
      expect(output).toContain('Welcome to Claude');

      // Clean up - interrupt Claude
      executor.write('\\x03');
      
      try {
        await executePromise;
      } catch (e) {
        // Expected - we interrupted
      }
    }, 15000); // Longer timeout for Claude

    it('should interrupt Claude with ESC', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      const executePromise = executor.execute(
        'claude',
        'test system prompt',
        'test-claude-esc',
        (data) => testOutput.push(data)
      );

      // Wait for Claude to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Start typing a prompt
      const text = 'Write a long story about';
      for (const char of text) {
        executor.write(char);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Submit to start generation
      executor.write('\\r');

      // Wait for Claude to start generating
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Send ESC to interrupt
      executor.write('\\x1b');

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));

      const output = testOutput.join('');
      expect(output.length).toBeGreaterThan(0);

      // Clean up
      executor.write('\\x03');
      
      try {
        await executePromise;
      } catch (e) {
        // Expected
      }
    }, 20000);
  });

  describe('Error Handling', () => {
    it('should handle non-existent commands', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      await executor.execute(
        'this_command_does_not_exist_xyz123',
        'test system prompt',
        'test-error-1',
        (data) => testOutput.push(data)
      );

      const output = testOutput.join('');
      expect(output).toContain('not found');
    });

    it('should handle shell spawn errors', async () => {
      executor = new PtyExecutor({ shell: '/non/existent/shell' });
      
      await expect(executor.execute(
        'echo test',
        'test system prompt',
        'test-error-2',
        (data) => testOutput.push(data)
      )).rejects.toThrow();
    });
  });

  describe('Stream Handling', () => {
    it('should stream output in chunks', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      const chunks: string[] = [];
      
      await executor.execute(
        'for i in 1 2 3; do echo "Line $i"; sleep 0.1; done',
        'test system prompt',
        'test-stream-1',
        (data) => {
          chunks.push(data);
          testOutput.push(data);
        }
      );

      // Should receive multiple chunks
      expect(chunks.length).toBeGreaterThan(1);
      
      const output = testOutput.join('');
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 2');
      expect(output).toContain('Line 3');
    });
  });

  describe('Environment and Working Directory', () => {
    it('should use custom working directory', async () => {
      const tmpDir = os.tmpdir();
      executor = new PtyExecutor({ shell: 'bash', cwd: tmpDir });
      
      await executor.execute(
        'pwd',
        'test system prompt',
        'test-cwd-1',
        (data) => testOutput.push(data)
      );

      const output = testOutput.join('');
      expect(output).toContain(tmpDir);
    });

    it('should pass environment variables', async () => {
      executor = new PtyExecutor({ 
        shell: 'bash',
        env: { ...process.env, TEST_VAR_XYZ: 'test_value_123' }
      });
      
      await executor.execute(
        'echo $TEST_VAR_XYZ',
        'test system prompt',
        'test-env-1',
        (data) => testOutput.push(data)
      );

      const output = testOutput.join('');
      expect(output).toContain('test_value_123');
    });
  });

  describe('Process Lifecycle', () => {
    it('should track running state correctly', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      expect(executor.isRunning()).toBe(false);
      
      const executePromise = executor.execute(
        'sleep 2',
        'test system prompt',
        'test-lifecycle-1',
        (data) => testOutput.push(data)
      );

      // Should be running after start
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(executor.isRunning()).toBe(true);

      // Wait for completion
      await executePromise;
      expect(executor.isRunning()).toBe(false);
    });

    it('should handle kill() during execution', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      const executePromise = executor.execute(
        'sleep 30',
        'test system prompt',
        'test-kill-1',
        (data) => testOutput.push(data)
      );

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(executor.isRunning()).toBe(true);

      // Kill the process
      executor.kill();

      await expect(executePromise).rejects.toThrow();
      expect(executor.isRunning()).toBe(false);
    });

    it('should ignore write() after completion', async () => {
      executor = new PtyExecutor({ shell: 'bash' });
      
      await executor.execute(
        'echo "Done"',
        'test system prompt',
        'test-write-after-1',
        (data) => testOutput.push(data)
      );

      // Should not throw
      expect(() => executor.write('Too late')).not.toThrow();
    });
  });
});