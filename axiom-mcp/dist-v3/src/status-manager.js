import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
export class StatusManager {
    tasks = new Map();
    logsDir;
    statusFile;
    contextDir;
    constructor(baseDir = process.cwd()) {
        this.logsDir = join(baseDir, 'logs');
        this.contextDir = join(baseDir, 'contexts');
        this.statusFile = join(baseDir, 'status', 'current.json');
        // Ensure directories exist
        [this.logsDir, this.contextDir, join(baseDir, 'status')].forEach(dir => {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
        });
        // Load existing status if available
        this.loadStatus();
    }
    addTask(task) {
        this.tasks.set(task.id, task);
        this.saveStatus();
        this.log(`Task added: ${task.id} - ${task.prompt.substring(0, 50)}...`);
    }
    updateTask(id, updates) {
        const task = this.tasks.get(id);
        if (task) {
            Object.assign(task, updates);
            if (updates.status === 'completed' || updates.status === 'failed') {
                task.endTime = new Date();
                task.duration = task.endTime.getTime() - task.startTime.getTime();
            }
            this.tasks.set(id, task);
            this.saveStatus();
            this.log(`Task updated: ${id} - Status: ${task.status}`);
        }
    }
    getTask(id) {
        return this.tasks.get(id);
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    getSystemStatus() {
        const tasks = this.getAllTasks();
        const activeSessions = new Map();
        // Group tasks by parent/session
        tasks.forEach(task => {
            const sessionId = task.parentTask || 'root';
            if (!activeSessions.has(sessionId)) {
                activeSessions.set(sessionId, []);
            }
            activeSessions.get(sessionId).push(task);
        });
        return {
            totalTasks: tasks.length,
            runningTasks: tasks.filter(t => t.status === 'running').length,
            completedTasks: tasks.filter(t => t.status === 'completed').length,
            failedTasks: tasks.filter(t => t.status === 'failed').length,
            activeSessions,
            lastUpdated: new Date(),
        };
    }
    getRecentCommands(limit = 10) {
        return this.getAllTasks()
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
            .slice(0, limit);
    }
    /**
     * Get most recent N tasks with optional filters
     */
    getMostRecentTasks(limit = 5, filters) {
        let tasks = this.getAllTasks();
        // Apply filters
        if (filters) {
            if (filters.status) {
                tasks = tasks.filter(t => t.status === filters.status);
            }
            if (filters.taskType) {
                tasks = tasks.filter(t => t.taskTypeId === filters.taskType);
            }
            if (filters.hasErrors !== undefined) {
                tasks = tasks.filter(t => filters.hasErrors ? !!t.error : !t.error);
            }
            if (filters.minDepth !== undefined) {
                tasks = tasks.filter(t => t.depth >= filters.minDepth);
            }
            if (filters.maxDepth !== undefined) {
                tasks = tasks.filter(t => t.depth <= filters.maxDepth);
            }
            if (filters.parentTask !== undefined) {
                tasks = tasks.filter(t => t.parentTask === filters.parentTask);
            }
        }
        // Sort by start time (most recent first)
        return tasks
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
            .slice(0, limit);
    }
    /**
     * Get tasks within a time window using temporal data
     */
    getTasksInTimeWindow(startDate, endDate) {
        return this.getAllTasks().filter(task => {
            if (!task.temporalStartTime)
                return false;
            const taskDate = new Date(task.temporalStartTime);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return taskDate >= start && taskDate <= end;
        });
    }
    getTaskTree(rootId) {
        const task = this.getTask(rootId);
        if (!task)
            return null;
        const tree = {
            ...task,
            children: [],
        };
        if (task.childTasks) {
            task.childTasks.forEach(childId => {
                const childTree = this.getTaskTree(childId);
                if (childTree) {
                    tree.children.push(childTree);
                }
            });
        }
        return tree;
    }
    saveContext(taskId, context) {
        const contextFile = join(this.contextDir, `${taskId}.json`);
        writeFileSync(contextFile, JSON.stringify(context, null, 2));
        this.log(`Context saved for task: ${taskId}`);
    }
    loadContext(taskId) {
        const contextFile = join(this.contextDir, `${taskId}.json`);
        if (existsSync(contextFile)) {
            return JSON.parse(readFileSync(contextFile, 'utf-8'));
        }
        return null;
    }
    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        // Console log
        console.error(logMessage.trim());
        // File log
        const logFile = join(this.logsDir, `axiom-mcp-${new Date().toISOString().split('T')[0]}.log`);
        writeFileSync(logFile, logMessage, { flag: 'a' });
    }
    saveStatus() {
        const status = {
            tasks: Array.from(this.tasks.entries()),
            lastSaved: new Date().toISOString(),
        };
        writeFileSync(this.statusFile, JSON.stringify(status, null, 2));
    }
    loadStatus() {
        if (existsSync(this.statusFile)) {
            try {
                const data = JSON.parse(readFileSync(this.statusFile, 'utf-8'));
                this.tasks = new Map(data.tasks.map(([id, task]) => [
                    id,
                    {
                        ...task,
                        startTime: new Date(task.startTime),
                        endTime: task.endTime ? new Date(task.endTime) : undefined,
                    },
                ]));
                this.log(`Loaded ${this.tasks.size} tasks from previous session`);
            }
            catch (error) {
                this.log(`Failed to load status: ${error}`);
            }
        }
    }
    clearOldTasks(daysToKeep = 7) {
        const cutoffTime = new Date();
        cutoffTime.setDate(cutoffTime.getDate() - daysToKeep);
        let removed = 0;
        this.tasks.forEach((task, id) => {
            if (task.endTime && task.endTime < cutoffTime) {
                this.tasks.delete(id);
                removed++;
            }
        });
        if (removed > 0) {
            this.log(`Cleared ${removed} old tasks`);
            this.saveStatus();
        }
    }
}
//# sourceMappingURL=status-manager.js.map