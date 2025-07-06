/**
 * Status Manager for Axiom MCP v3
 * Tracks task execution status and metadata
 */
export class StatusManager {
    tasks = new Map();
    taskOrder = [];
    addTask(task) {
        this.tasks.set(task.id, task);
        this.taskOrder.push(task.id);
        console.error(`[STATUS] Task added: ${task.id} - ${task.prompt.substring(0, 50)}...`);
    }
    updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);
        if (!task) {
            console.error(`[STATUS] Warning: Task ${taskId} not found for update`);
            return;
        }
        // Merge updates
        Object.assign(task, updates);
        // Set end time if status is terminal
        if (updates.status === 'completed' || updates.status === 'failed') {
            task.endTime = new Date();
        }
        console.error(`[STATUS] Task updated: ${taskId} - status: ${task.status}`);
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    getActiveTasks() {
        return Array.from(this.tasks.values())
            .filter(task => task.status === 'running' || task.status === 'pending');
    }
    getRecentTasks(limit = 10) {
        return this.taskOrder
            .slice(-limit)
            .reverse()
            .map(id => this.tasks.get(id))
            .filter(task => task !== undefined);
    }
    getStats() {
        const tasks = Array.from(this.tasks.values());
        return {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length,
            running: tasks.filter(t => t.status === 'running').length,
            pending: tasks.filter(t => t.status === 'pending').length,
        };
    }
    clear() {
        this.tasks.clear();
        this.taskOrder = [];
    }
}
//# sourceMappingURL=status-manager.js.map