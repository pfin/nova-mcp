import { EventEmitter } from 'events';
export class StatusManager extends EventEmitter {
    tasks = new Map();
    hookOrchestrator;
    setHookOrchestrator(orchestrator) {
        this.hookOrchestrator = orchestrator;
    }
    createTask(id, metadata) {
        const task = {
            id,
            status: 'pending',
            startTime: Date.now(),
            metadata
        };
        this.tasks.set(id, task);
        this.emit('task:created', task);
        // v4: Notify hooks
        if (this.hookOrchestrator) {
            this.hookOrchestrator.triggerHooks('STATUS_TASK_CREATED', { metadata: { task } });
        }
        return task;
    }
    updateTaskStatus(id, status, data) {
        const task = this.tasks.get(id);
        if (!task)
            return;
        task.status = status;
        if (data?.output)
            task.output = data.output;
        if (data?.error)
            task.error = data.error;
        if (data?.metadata)
            task.metadata = { ...task.metadata, ...data.metadata };
        if (status === 'completed' || status === 'failed') {
            task.endTime = Date.now();
        }
        this.emit(`task:${status}`, task);
        // v4: Notify hooks
        if (this.hookOrchestrator) {
            this.hookOrchestrator.triggerHooks('STATUS_TASK_UPDATED', { metadata: { task } });
        }
    }
    getTask(id) {
        return this.tasks.get(id);
    }
    getActiveTasks() {
        return Array.from(this.tasks.values())
            .filter(task => task.status === 'running' || task.status === 'pending');
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    getStats() {
        const tasks = Array.from(this.tasks.values());
        const completed = tasks.filter(t => t.status === 'completed');
        const failed = tasks.filter(t => t.status === 'failed');
        const active = tasks.filter(t => t.status === 'running' || t.status === 'pending');
        const durations = completed
            .filter(t => t.endTime)
            .map(t => t.endTime - t.startTime);
        const avgDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;
        return {
            total: tasks.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            avgDuration
        };
    }
    clearCompleted() {
        const completed = Array.from(this.tasks.entries())
            .filter(([_, task]) => task.status === 'completed' || task.status === 'failed');
        for (const [id] of completed) {
            this.tasks.delete(id);
        }
        this.emit('tasks:cleared', completed.length);
    }
    getTaskTree(rootId) {
        const tree = [];
        const task = this.tasks.get(rootId);
        if (task) {
            tree.push(task);
            // Find children (tasks with parent metadata)
            for (const [id, t] of this.tasks) {
                if (t.metadata?.parentId === rootId) {
                    tree.push(...this.getTaskTree(id));
                }
            }
        }
        return tree;
    }
}
//# sourceMappingURL=status-manager.js.map