import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
export class ConversationDB {
    db;
    dbPath;
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(process.cwd(), 'axiom-conversations.db');
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
        await run('CREATE INDEX IF NOT EXISTS idx_conversations_parent ON conversations(parent_id)');
        await run('CREATE INDEX IF NOT EXISTS idx_actions_conversation ON actions(conversation_id, timestamp)');
        await run('CREATE INDEX IF NOT EXISTS idx_streams_conversation ON streams(conversation_id, timestamp)');
    }
    // Conversation methods
    async createConversation(conversation) {
        const run = promisify(this.db.run.bind(this.db));
        await run(`INSERT INTO conversations (id, parent_id, started_at, status, depth, prompt, task_type, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            conversation.id,
            conversation.parent_id || null,
            conversation.started_at,
            conversation.status,
            conversation.depth,
            conversation.prompt,
            conversation.task_type,
            conversation.metadata ? JSON.stringify(conversation.metadata) : null
        ]);
    }
    async updateConversationStatus(id, status) {
        const run = promisify(this.db.run.bind(this.db));
        await run('UPDATE conversations SET status = ? WHERE id = ?', [status, id]);
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
        return rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    async getConversationTree(rootId) {
        const all = promisify(this.db.all.bind(this.db));
        const rows = await all(`
      WITH RECURSIVE tree AS (
        SELECT * FROM conversations WHERE id = ?
        UNION ALL
        SELECT c.* FROM conversations c
        JOIN tree t ON c.parent_id = t.id
      )
      SELECT * FROM tree ORDER BY depth, started_at
    `, [rootId]);
        return rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    // Action methods
    async createAction(action) {
        const run = promisify(this.db.run.bind(this.db));
        await run(`INSERT INTO actions (id, conversation_id, timestamp, type, content, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`, [
            action.id,
            action.conversation_id,
            action.timestamp,
            action.type,
            action.content,
            action.metadata ? JSON.stringify(action.metadata) : null
        ]);
    }
    async getRecentActions(limit = 10) {
        const all = promisify(this.db.all.bind(this.db));
        const rows = await all('SELECT * FROM actions ORDER BY timestamp DESC LIMIT ?', [limit]);
        return rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    async getConversationActions(conversationId) {
        const all = promisify(this.db.all.bind(this.db));
        const rows = await all('SELECT * FROM actions WHERE conversation_id = ? ORDER BY timestamp', [conversationId]);
        return rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    // Stream methods
    async createStream(stream) {
        const run = promisify(this.db.run.bind(this.db));
        await run(`INSERT INTO streams (id, conversation_id, chunk, parsed_data, timestamp)
       VALUES (?, ?, ?, ?, ?)`, [
            stream.id,
            stream.conversation_id,
            stream.chunk,
            stream.parsed_data ? JSON.stringify(stream.parsed_data) : null,
            stream.timestamp
        ]);
    }
    async getConversationStreams(conversationId, limit) {
        const all = promisify(this.db.all.bind(this.db));
        const query = limit
            ? 'SELECT * FROM streams WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ?'
            : 'SELECT * FROM streams WHERE conversation_id = ? ORDER BY timestamp';
        const params = limit ? [conversationId, limit] : [conversationId];
        const rows = await all(query, params);
        return rows.map(row => ({
            ...row,
            parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : undefined
        }));
    }
    // Observation view methods
    async createObservationView(view) {
        const run = promisify(this.db.run.bind(this.db));
        await run(`INSERT INTO observation_views (id, name, filter_json, created_at)
       VALUES (?, ?, ?, ?)`, [view.id, view.name, view.filter_json, view.created_at]);
    }
    async getObservationViews() {
        const all = promisify(this.db.all.bind(this.db));
        return await all('SELECT * FROM observation_views ORDER BY created_at DESC');
    }
    // Get database statistics
    async getStats() {
        const get = promisify(this.db.get.bind(this.db));
        const all = promisify(this.db.all.bind(this.db));
        // Get conversation stats
        const convStats = await get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM conversations
    `);
        // Get action stats
        const actionStats = await get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'file_created' THEN 1 ELSE 0 END) as fileCreates,
        SUM(CASE WHEN type = 'tool_call' THEN 1 ELSE 0 END) as toolCalls,
        SUM(CASE WHEN type IN ('error', 'error_occurred') THEN 1 ELSE 0 END) as errors
      FROM actions
    `);
        // Get stream stats
        const streamStats = await get(`
      SELECT 
        COUNT(*) as total,
        SUM(LENGTH(chunk)) as totalSize
      FROM streams
    `);
        // Get violation stats
        const violationStats = await all(`
      SELECT 
        parsed_data->>'$.violationType' as violationType,
        COUNT(*) as count
      FROM streams
      WHERE parsed_data->>'$.hasViolation' = 'true'
      GROUP BY violationType
    `).catch(() => []); // Handle case where JSON queries aren't supported
        const violationsByType = {};
        let totalViolations = 0;
        for (const row of violationStats) {
            if (row.violationType) {
                violationsByType[row.violationType] = row.count;
                totalViolations += row.count;
            }
        }
        return {
            totalConversations: convStats?.total || 0,
            activeConversations: convStats?.active || 0,
            completedConversations: convStats?.completed || 0,
            totalActions: actionStats?.total || 0,
            fileCreates: actionStats?.fileCreates || 0,
            toolCalls: actionStats?.toolCalls || 0,
            errors: actionStats?.errors || 0,
            totalStreams: streamStats?.total || 0,
            totalStreamSize: streamStats?.totalSize || 0,
            totalViolations,
            violationsByType: Object.keys(violationsByType).length > 0 ? violationsByType : undefined
        };
    }
    // Close database
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