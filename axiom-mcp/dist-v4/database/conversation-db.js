import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
export class ConversationDB {
    db;
    dbPath;
    hookOrchestrator; // Will be injected
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(process.cwd(), 'axiom-v4.db');
    }
    // v4 addition: Set hook orchestrator for DB events
    setHookOrchestrator(orchestrator) {
        this.hookOrchestrator = orchestrator;
    }
    async initialize() {
        // Ensure directory exists
        await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err)
                    reject(err);
                else {
                    this.db.run('PRAGMA journal_mode = WAL');
                    this.db.run('PRAGMA foreign_keys = ON');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }
    async createTables() {
        const run = promisify(this.db.run.bind(this.db));
        // Create conversations table
        await run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        started_at TEXT NOT NULL,
        status TEXT NOT NULL,
        depth INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        task_type TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (parent_id) REFERENCES conversations(id)
      )
    `);
        // Create actions table
        await run(`
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      )
    `);
        // Create streams table
        await run(`
      CREATE TABLE IF NOT EXISTS streams (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        chunk TEXT NOT NULL,
        parsed_data TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      )
    `);
        // Create observation views table
        await run(`
      CREATE TABLE IF NOT EXISTS observation_views (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filter_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
        // Create indexes
        await run('CREATE INDEX IF NOT EXISTS idx_actions_conversation ON actions(conversation_id)');
        await run('CREATE INDEX IF NOT EXISTS idx_streams_conversation ON streams(conversation_id)');
        await run('CREATE INDEX IF NOT EXISTS idx_conversations_parent ON conversations(parent_id)');
    }
    async createConversation(conversation) {
        const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const conv = { ...conversation, id };
        const run = promisify(this.db.run.bind(this.db));
        await run(`INSERT INTO conversations (id, parent_id, started_at, status, depth, prompt, task_type, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, conv.parent_id, conv.started_at, conv.status, conv.depth, conv.prompt, conv.task_type,
            conv.metadata ? JSON.stringify(conv.metadata) : null]);
        // v4: Notify hooks of new conversation
        if (this.hookOrchestrator) {
            await this.hookOrchestrator.triggerHooks('DATABASE_CONVERSATION_CREATED', { conversation: conv });
        }
        return conv;
    }
    async updateConversation(id, updates) {
        const run = promisify(this.db.run.bind(this.db));
        const fields = Object.keys(updates).filter(k => k !== 'id');
        const values = fields.map(f => f === 'metadata' ? JSON.stringify(updates[f]) : updates[f]);
        if (fields.length === 0)
            return;
        const sql = `UPDATE conversations SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
        await run(sql, [...values, id]);
        // v4: Notify hooks of conversation update
        if (this.hookOrchestrator) {
            await this.hookOrchestrator.triggerHooks('DATABASE_CONVERSATION_UPDATED', { id, updates });
        }
    }
    async logAction(action) {
        const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const act = { ...action, id };
        const run = promisify(this.db.run.bind(this.db));
        await run(`INSERT INTO actions (id, conversation_id, timestamp, type, content, metadata) 
       VALUES (?, ?, ?, ?, ?, ?)`, [id, act.conversation_id, act.timestamp, act.type, act.content,
            act.metadata ? JSON.stringify(act.metadata) : null]);
        // v4: Notify hooks of new action
        if (this.hookOrchestrator) {
            await this.hookOrchestrator.triggerHooks('DATABASE_ACTION_LOGGED', { action: act });
        }
        return act;
    }
    async logStream(stream) {
        const id = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const str = { ...stream, id };
        const run = promisify(this.db.run.bind(this.db));
        await run(`INSERT INTO streams (id, conversation_id, chunk, parsed_data, timestamp) 
       VALUES (?, ?, ?, ?, ?)`, [id, str.conversation_id, str.chunk,
            str.parsed_data ? JSON.stringify(str.parsed_data) : null, str.timestamp]);
        return str;
    }
    async getConversation(id) {
        const get = promisify(this.db.get.bind(this.db));
        const row = await get('SELECT * FROM conversations WHERE id = ?', [id]);
        if (!row)
            return null;
        return {
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        };
    }
    async getActiveConversations() {
        const all = promisify(this.db.all.bind(this.db));
        const rows = await all('SELECT * FROM conversations WHERE status = ? ORDER BY started_at DESC', ['active']);
        return rows.map((row) => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    async getConversationTree(rootId) {
        const all = promisify(this.db.all.bind(this.db));
        const conversations = [];
        const visit = async (id) => {
            const row = await this.getConversation(id);
            if (row) {
                conversations.push(row);
                const children = await all('SELECT * FROM conversations WHERE parent_id = ? ORDER BY started_at', [id]);
                for (const child of children) {
                    await visit(child.id);
                }
            }
        };
        await visit(rootId);
        return conversations;
    }
    async getRecentActions(limit = 10) {
        const all = promisify(this.db.all.bind(this.db));
        const rows = await all('SELECT * FROM actions ORDER BY timestamp DESC LIMIT ?', [limit]);
        return rows.map((row) => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    async getStats() {
        const get = promisify(this.db.get.bind(this.db));
        const all = promisify(this.db.all.bind(this.db));
        const totalConversations = await get('SELECT COUNT(*) as count FROM conversations');
        const activeConversations = await get('SELECT COUNT(*) as count FROM conversations WHERE status = ?', ['active']);
        const completedConversations = await get('SELECT COUNT(*) as count FROM conversations WHERE status = ?', ['completed']);
        const failedConversations = await get('SELECT COUNT(*) as count FROM conversations WHERE status = ?', ['failed']);
        const actionsByType = await all('SELECT type, COUNT(*) as count FROM actions GROUP BY type');
        const violationsByType = await all(`SELECT 
         CASE 
           WHEN content LIKE '%TODO%' THEN 'todo_violation'
           WHEN content LIKE '%mock%' THEN 'mock_violation'
           WHEN type = 'error' THEN 'error'
           ELSE 'other'
         END as violation_type,
         COUNT(*) as count
       FROM actions 
       WHERE type IN ('error', 'intervention')
       GROUP BY violation_type`);
        return {
            totalConversations: totalConversations.count,
            activeConversations: activeConversations.count,
            completedConversations: completedConversations.count,
            failedConversations: failedConversations.count,
            actionsByType: Object.fromEntries(actionsByType.map((r) => [r.type, r.count])),
            violationsByType: Object.fromEntries(violationsByType.map((r) => [r.violation_type, r.count]))
        };
    }
    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
}
//# sourceMappingURL=conversation-db.js.map