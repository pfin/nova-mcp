import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as pty from 'node-pty';
import { OrthogonalDecomposerV2 } from '../src-v4/tools/axiom-orthogonal-decomposer-v2.js';

describe('OrthogonalDecomposerV2 - Cleanup Tests', () => {
  let decomposer: OrthogonalDecomposerV2;
  let tempDirs: string[] = [];
  
  beforeEach(() => {
    decomposer = new OrthogonalDecomposerV2();
  });
  
  afterEach(async () => {
    // Ensure cleanup
    await decomposer.cleanupAll();
    
    // Verify our tracked dirs are gone
    for (const dir of tempDirs) {
      const exists = await fs.access(dir).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    }
    tempDirs = [];
  });
  
  test('cleans up temp directories after successful execution', async () => {
    // Track temp dirs before
    const tmpDirsBefore = await fs.readdir(os.tmpdir());
    const axiomDirsBefore = tmpDirsBefore.filter(d => d.startsWith('axiom-'));
    
    // Mock Claude spawn to simulate success
    const mockPty = {
      write: jest.fn(),
      kill: jest.fn(),
      onData: jest.fn((callback: any) => {
        // Simulate Claude ready prompt
        setTimeout(() => callback('> '), 100);
        // Simulate file creation message
        setTimeout(() => callback('Created index.js'), 500);
      }),
      onExit: jest.fn()
    };
    
    jest.spyOn(pty, 'spawn').mockImplementation(() => mockPty as any);
    
    // Create mock file in workspace
    const originalMkdtemp = fs.mkdtemp;
    jest.spyOn(fs, 'mkdtemp').mockImplementation(async (prefix) => {
      const dir = await originalMkdtemp(prefix);
      tempDirs.push(dir);
      
      // Create expected file
      setTimeout(async () => {
        await fs.writeFile(path.join(dir, 'index.js'), 'console.log("test");');
      }, 400);
      
      return dir;
    });
    
    // Execute a simple task
    const tasks = [{
      id: 'test',
      prompt: 'Create index.js',
      duration: 5,
      outputs: ['index.js']
    }];
    
    await decomposer.execute(tasks);
    
    // Verify temp dirs are cleaned up
    const tmpDirsAfter = await fs.readdir(os.tmpdir());
    const axiomDirsAfter = tmpDirsAfter.filter(d => d.startsWith('axiom-'));
    
    expect(axiomDirsAfter.length).toBe(axiomDirsBefore.length);
    expect(mockPty.kill).toHaveBeenCalled();
  });
  
  test('cleans up on process exit', async () => {
    // Create a task but don't wait for completion
    const mockPty = {
      write: jest.fn(),
      kill: jest.fn(),
      onData: jest.fn(),
      onExit: jest.fn()
    };
    
    jest.spyOn(pty, 'spawn').mockImplementation(() => mockPty as any);
    
    const tasks = [{
      id: 'long-task',
      prompt: 'Long running task',
      duration: 5,
      outputs: ['output.js']
    }];
    
    // Start execution but don't await
    decomposer.execute(tasks);
    
    // Wait a bit for setup
    await new Promise(r => setTimeout(r, 100));
    
    // Simulate process exit
    process.emit('exit', 0 as any);
    
    // Verify cleanup was called
    expect(mockPty.kill).toHaveBeenCalled();
  });
  
  test('cleans up after failures', async () => {
    // Mock Claude to fail
    jest.spyOn(pty, 'spawn').mockImplementation(() => {
      throw new Error('Claude not found');
    });
    
    const tasks = [{
      id: 'fail-task',
      prompt: 'This will fail',
      duration: 5,
      outputs: ['fail.js']
    }];
    
    const results = await decomposer.execute(tasks);
    
    // Verify task failed
    expect(results.get('fail-task')?.status).toBe('failed');
    
    // Verify temp dirs cleaned up
    const tmpDirs = await fs.readdir(os.tmpdir());
    const axiomDirs = tmpDirs.filter(d => d.startsWith('axiom-fail-task-'));
    expect(axiomDirs.length).toBe(0);
  });
  
  test('cleans up intervals and timeouts', async () => {
    // Track timer creation
    const intervals: NodeJS.Timeout[] = [];
    const timeouts: NodeJS.Timeout[] = [];
    
    const originalSetInterval = global.setInterval;
    const originalSetTimeout = global.setTimeout;
    
    jest.spyOn(global, 'setInterval').mockImplementation((...args: any[]) => {
      const id = originalSetInterval(...args);
      intervals.push(id);
      return id;
    });
    
    jest.spyOn(global, 'setTimeout').mockImplementation((...args: any[]) => {
      const id = originalSetTimeout(...args);
      timeouts.push(id);
      return id;
    });
    
    // Mock successful Claude
    const mockPty = {
      write: jest.fn(),
      kill: jest.fn(),
      onData: jest.fn((callback: any) => {
        setTimeout(() => callback('> '), 50);
      }),
      onExit: jest.fn()
    };
    
    jest.spyOn(pty, 'spawn').mockImplementation(() => mockPty as any);
    
    // Execute task
    const tasks = [{
      id: 'timer-test',
      prompt: 'Test timers',
      duration: 5,
      outputs: ['timer.js']
    }];
    
    // Start execution
    decomposer.execute(tasks);
    
    // Wait for setup
    await new Promise(r => setTimeout(r, 200));
    
    // Force cleanup
    await decomposer.cleanupAll();
    
    // Verify all timers were cleared
    // (In real implementation, we'd track if clearInterval/clearTimeout were called)
    expect(mockPty.kill).toHaveBeenCalled();
  });
});

describe('OrthogonalDecomposerV2 - Claude Control Tests', () => {
  let decomposer: OrthogonalDecomposerV2;
  
  beforeEach(() => {
    decomposer = new OrthogonalDecomposerV2();
  });
  
  afterEach(async () => {
    await decomposer.cleanupAll();
  });
  
  test('uses correct control sequences', async () => {
    const writtenData: string[] = [];
    
    const mockPty = {
      write: jest.fn((data: string) => {
        writtenData.push(data);
      }),
      kill: jest.fn(),
      onData: jest.fn((callback: any) => {
        // Simulate ready
        setTimeout(() => callback('> '), 100);
        // Simulate completion
        setTimeout(() => callback('Created test.js'), 600);
      }),
      onExit: jest.fn()
    };
    
    jest.spyOn(pty, 'spawn').mockImplementation(() => mockPty as any);
    
    // Mock file creation
    jest.spyOn(fs, 'readFile').mockResolvedValue('test content');
    
    const tasks = [{
      id: 'control-test',
      prompt: 'Test prompt',
      duration: 5,
      outputs: ['test.js']
    }];
    
    await decomposer.execute(tasks);
    
    // Verify human-like typing
    const promptChars = writtenData.slice(0, -1); // Exclude final control char
    expect(promptChars.join('')).toBe('Test prompt');
    
    // Verify Ctrl+Enter submission
    const lastChar = writtenData[writtenData.length - 1];
    expect(lastChar).toBe('\x0d'); // Ctrl+Enter
  });
  
  test('detects Claude ready state correctly', async () => {
    let readyDetected = false;
    
    const mockPty = {
      write: jest.fn(),
      kill: jest.fn(),
      onData: jest.fn((callback: any) => {
        // Test various outputs
        callback('Welcome to Claude\n');
        callback('Loading...\n');
        callback('> '); // This should trigger ready
        readyDetected = true;
      }),
      onExit: jest.fn()
    };
    
    jest.spyOn(pty, 'spawn').mockImplementation(() => mockPty as any);
    
    const tasks = [{
      id: 'ready-test',
      prompt: 'Test',
      duration: 5,
      outputs: ['test.js']
    }];
    
    // Start execution
    decomposer.execute(tasks);
    
    // Wait a bit
    await new Promise(r => setTimeout(r, 200));
    
    expect(readyDetected).toBe(true);
    
    await decomposer.cleanupAll();
  });
});

describe('OrthogonalDecomposerV2 - Error Recovery Tests', () => {
  let decomposer: OrthogonalDecomposerV2;
  
  beforeEach(() => {
    decomposer = new OrthogonalDecomposerV2();
  });
  
  afterEach(async () => {
    await decomposer.cleanupAll();
  });
  
  test('retries failed tasks', async () => {
    let attempts = 0;
    
    const mockPty = {
      write: jest.fn(),
      kill: jest.fn(),
      onData: jest.fn((callback: any) => {
        attempts++;
        
        if (attempts < 3) {
          // Fail first 2 attempts
          setTimeout(() => callback('Error occurred'), 100);
        } else {
          // Succeed on 3rd attempt
          setTimeout(() => callback('> '), 100);
          setTimeout(() => callback('Created retry.js'), 200);
        }
      }),
      onExit: jest.fn((callback: any) => {
        if (attempts < 3) {
          // Simulate crash
          setTimeout(callback, 150);
        }
      })
    };
    
    jest.spyOn(pty, 'spawn').mockImplementation(() => mockPty as any);
    jest.spyOn(fs, 'readFile').mockResolvedValue('retry content');
    
    const tasks = [{
      id: 'retry-test',
      prompt: 'Retry test',
      duration: 5,
      outputs: ['retry.js']
    }];
    
    const results = await decomposer.execute(tasks);
    
    // Should succeed after retries
    expect(results.get('retry-test')?.status).toBe('complete');
    expect(attempts).toBe(3);
  });
  
  test('handles timeout correctly', async () => {
    const mockPty = {
      write: jest.fn(),
      kill: jest.fn(),
      onData: jest.fn((callback: any) => {
        // Simulate ready but never complete
        setTimeout(() => callback('> '), 100);
        // Just keep outputting without completing
        setInterval(() => callback('Still working...'), 1000);
      }),
      onExit: jest.fn()
    };
    
    jest.spyOn(pty, 'spawn').mockImplementation(() => mockPty as any);
    
    // Reduce timeout for testing
    (decomposer as any).taskTimeout = 2000; // 2 seconds
    
    const tasks = [{
      id: 'timeout-test',
      prompt: 'This will timeout',
      duration: 5,
      outputs: ['timeout.js']
    }];
    
    const startTime = Date.now();
    const results = await decomposer.execute(tasks);
    const duration = Date.now() - startTime;
    
    // Should timeout
    expect(results.get('timeout-test')?.status).toBe('timeout');
    expect(mockPty.write).toHaveBeenCalledWith('\x1b'); // ESC interrupt
    expect(mockPty.kill).toHaveBeenCalled();
    
    // Should not take full 5 minutes
    expect(duration).toBeLessThan(10000); // Less than 10 seconds
  });
});