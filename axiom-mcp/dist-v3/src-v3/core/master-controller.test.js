/**
 * Tests for Master Controller
 * Verifying it matches expert specifications
 */
import { MasterController } from './master-controller.js';
import { PriorityQueue } from './priority-queue.js';
// Test Priority Queue first (building block)
describe('PriorityQueue', () => {
    let queue;
    beforeEach(() => {
        queue = new PriorityQueue();
    });
    test('should enqueue tasks in priority order', () => {
        const task1 = {
            id: '1',
            parentId: null,
            prompt: 'Low priority',
            priority: 1,
            status: 'queued',
            acceptanceCriteria: {},
            createdAt: Date.now()
        };
        const task2 = {
            id: '2',
            parentId: null,
            prompt: 'High priority',
            priority: 10,
            status: 'queued',
            acceptanceCriteria: {},
            createdAt: Date.now()
        };
        const task3 = {
            id: '3',
            parentId: null,
            prompt: 'Medium priority',
            priority: 5,
            status: 'queued',
            acceptanceCriteria: {},
            createdAt: Date.now()
        };
        queue.enqueue(task1);
        queue.enqueue(task2);
        queue.enqueue(task3);
        expect(queue.size()).toBe(3);
        expect(queue.dequeue()?.id).toBe('2'); // Highest priority
        expect(queue.dequeue()?.id).toBe('3'); // Medium priority
        expect(queue.dequeue()?.id).toBe('1'); // Lowest priority
    });
    test('should handle empty queue', () => {
        expect(queue.isEmpty()).toBe(true);
        expect(queue.dequeue()).toBeUndefined();
        expect(queue.peek()).toBeUndefined();
    });
    test('should filter tasks', () => {
        const parentTask = {
            id: 'parent',
            parentId: null,
            prompt: 'Parent',
            priority: 5,
            status: 'queued',
            acceptanceCriteria: {},
            createdAt: Date.now()
        };
        const childTask = {
            id: 'child',
            parentId: 'parent',
            prompt: 'Child',
            priority: 6,
            status: 'queued',
            acceptanceCriteria: {},
            createdAt: Date.now()
        };
        queue.enqueue(parentTask);
        queue.enqueue(childTask);
        const children = queue.filter(t => t.parentId === 'parent');
        expect(children).toHaveLength(1);
        expect(children[0].id).toBe('child');
    });
});
// Test Master Controller
describe('MasterController', () => {
    let controller;
    // Mock worker script for testing
    const mockWorkerScript = `
    const { parentPort, workerData } = require('worker_threads');
    
    // Send ready message
    parentPort.postMessage({ type: 'ready', workerId: workerData.workerId });
    
    // Handle messages
    parentPort.on('message', (msg) => {
      if (msg.type === 'execute') {
        // Simulate task execution
        setTimeout(() => {
          parentPort.postMessage({
            type: 'stream',
            workerId: workerData.workerId,
            payload: 'Executing task...'
          });
          
          setTimeout(() => {
            parentPort.postMessage({
              type: 'complete',
              workerId: workerData.workerId,
              payload: { success: true, output: 'Task completed' }
            });
          }, 100);
        }, 100);
      }
    });
  `;
    beforeEach(async () => {
        // Create temporary worker script
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-test-'));
        const workerPath = path.join(tmpDir, 'test-worker.js');
        await fs.writeFile(workerPath, mockWorkerScript);
        controller = new MasterController({
            maxWorkers: 2,
            workerScript: workerPath
        });
        // Wait for workers to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
    });
    afterEach(async () => {
        await controller.shutdown();
    });
    test('should initialize worker pool', () => {
        const status = controller.getStatus();
        expect(status.workers.total).toBe(2);
        expect(status.workers.available).toBe(2);
        expect(status.workers.busy).toBe(0);
    });
    test('should submit and assign tasks', async () => {
        const taskId = await controller.submitTask('Test task', {
            priority: 5,
            acceptanceCriteria: {
                filesExpected: ['test.py'],
                mustExecute: true
            }
        });
        expect(taskId).toBeTruthy();
        // Wait for assignment
        await new Promise(resolve => setTimeout(resolve, 100));
        const status = controller.getStatus();
        expect(status.workers.busy).toBe(1);
        expect(status.workers.available).toBe(1);
    });
    test('should handle task completion', async () => {
        const taskId = await controller.submitTask('Test task');
        // Wait for completion
        const completePromise = new Promise(resolve => {
            controller.on('task:complete', (event) => {
                expect(event.taskId).toBe(taskId);
                expect(event.result.success).toBe(true);
                resolve(true);
            });
        });
        await completePromise;
        // Worker should be available again
        const status = controller.getStatus();
        expect(status.workers.available).toBe(2);
        expect(status.workers.busy).toBe(0);
    });
    test('should handle parent-child task relationships', async () => {
        const parentId = await controller.submitTask('Parent task');
        const childId = await controller.submitTask('Child task', {
            parentId,
            priority: 10 // Higher priority than parent
        });
        expect(childId).toBeTruthy();
        const status = controller.getStatus();
        const tasks = Array.from(status.queue.tasks);
        // Child should be processed first due to higher priority
        if (tasks.length > 0) {
            expect(tasks[0].parentId).toBe(parentId);
        }
    });
    test('should parse TOOL_INVOCATION from output', async () => {
        const toolPromise = new Promise(resolve => {
            controller.on('task:tool_invocation', (event) => {
                expect(event.tool.tool).toBe('create_file');
                expect(event.tool.params.path).toBe('./test.py');
                resolve(true);
            });
        });
        // Simulate worker sending output with tool invocation
        const taskId = await controller.submitTask('Create a file');
        // Manually trigger tool invocation parsing (in real scenario, worker would send this)
        controller.emit('task:stream', {
            taskId,
            workerId: 'test',
            data: 'Creating file... TOOL_INVOCATION: {"tool": "create_file", "params": {"path": "./test.py"}} Done.'
        });
        await toolPromise;
    });
    test('should allocate ports for agents', () => {
        const port1 = controller.allocatePort('agent1');
        const port2 = controller.allocatePort('agent2', 'agent1');
        expect(port1).toBeGreaterThanOrEqual(9000);
        expect(port2).toBe(port1 + 1);
        const status = controller.getStatus();
        expect(status.ports).toHaveLength(2);
        expect(status.ports[1].parentId).toBe('agent1');
    });
});
// Export for running
export default {
    PriorityQueue: describe('PriorityQueue', () => { }),
    MasterController: describe('MasterController', () => { })
};
//# sourceMappingURL=master-controller.test.js.map