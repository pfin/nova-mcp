/**
 * Axiom Context Builder - Core context management for multi-LLM orchestration
 *
 * This is the central component that prepares, optimizes, and distributes
 * codebase context to parallel LLM instances. It integrates with repomix
 * for extraction and provides intelligent context slicing for orthogonal tasks.
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logDebug } from './simple-logger.js';
const execAsync = promisify(exec);
export class ContextBuilder extends EventEmitter {
    repomixCache = new Map();
    dependencyGraph = new Map();
    config;
    constructor(config = {}) {
        super();
        this.config = {
            maxTokens: 30000, // Safe for GPT-4
            maxChunkSize: 15000, // Safe for browser paste
            format: 'detailed',
            includeTests: true,
            includeDocs: true,
            includeHistory: false,
            ...config
        };
    }
    /**
     * Generate context using repomix
     */
    async generateRepomixContext(projectPath) {
        const cacheKey = `${projectPath}-${Date.now()}`;
        // Check cache (5 minute TTL)
        for (const [key, value] of this.repomixCache) {
            if (key.startsWith(projectPath)) {
                const age = Date.now() - value.metadata.timestamp;
                if (age < 5 * 60 * 1000) {
                    logDebug('CONTEXT', 'Using cached repomix output');
                    return value;
                }
            }
        }
        logDebug('CONTEXT', `Running repomix on ${projectPath}`);
        try {
            // Run repomix with appropriate flags
            const flags = [
                '--output repomix-output.xml',
                '--compress', // Use tree-sitter compression
                '--token-count', // Include token counts
                '--respect-gitignore'
            ];
            if (!this.config.includeTests) {
                flags.push('--exclude "**/*.test.*"');
                flags.push('--exclude "**/tests/**"');
            }
            if (!this.config.includeDocs) {
                flags.push('--exclude "**/*.md"');
                flags.push('--exclude "docs/**"');
            }
            const cmd = `npx repomix ${flags.join(' ')}`;
            await execAsync(cmd, { cwd: projectPath });
            // Parse repomix output
            const outputPath = path.join(projectPath, 'repomix-output.xml');
            const xmlContent = await fs.readFile(outputPath, 'utf-8');
            const parsed = this.parseRepomixXML(xmlContent);
            // Cache result
            this.repomixCache.set(cacheKey, parsed);
            // Clean up
            await fs.unlink(outputPath).catch(() => { });
            return parsed;
        }
        catch (error) {
            logDebug('CONTEXT', `Repomix failed: ${error}`);
            throw error;
        }
    }
    /**
     * Parse repomix XML output
     */
    parseRepomixXML(xml) {
        const files = new Map();
        let structure = '';
        let totalTokens = 0;
        // Simple XML parsing (in production, use a proper XML parser)
        const fileMatches = xml.matchAll(/<file path="([^"]+)">([^<]*)<\/file>/gs);
        for (const match of fileMatches) {
            const [, filePath, content] = match;
            files.set(filePath, content);
        }
        // Extract structure
        const structureMatch = xml.match(/<structure>([^<]*)<\/structure>/s);
        if (structureMatch) {
            structure = structureMatch[1];
        }
        // Extract token count
        const tokenMatch = xml.match(/<tokens>(\d+)<\/tokens>/);
        if (tokenMatch) {
            totalTokens = parseInt(tokenMatch[1]);
        }
        return {
            files,
            structure,
            metadata: {
                totalFiles: files.size,
                totalTokens,
                timestamp: Date.now()
            }
        };
    }
    /**
     * Build dependency graph from repomix output
     */
    async buildDependencyGraph(repomix) {
        this.dependencyGraph.clear();
        for (const [filePath, content] of repomix.files) {
            const node = {
                path: filePath,
                imports: this.extractImports(content, filePath),
                exports: this.extractExports(content, filePath),
                type: this.classifyFile(filePath),
                relevanceScore: 0
            };
            this.dependencyGraph.set(filePath, node);
        }
        // Calculate relevance scores based on connectivity
        this.calculateRelevanceScores();
    }
    /**
     * Extract import statements
     */
    extractImports(content, filePath) {
        const imports = [];
        const ext = path.extname(filePath);
        if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
            // ES6 imports
            const importMatches = content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
            for (const match of importMatches) {
                imports.push(match[1]);
            }
            // CommonJS requires
            const requireMatches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
            for (const match of requireMatches) {
                imports.push(match[1]);
            }
        }
        else if (ext === '.py') {
            // Python imports
            const pythonImports = content.matchAll(/(?:from\s+(\S+)\s+)?import\s+/g);
            for (const match of pythonImports) {
                if (match[1])
                    imports.push(match[1]);
            }
        }
        return imports;
    }
    /**
     * Extract export statements
     */
    extractExports(content, filePath) {
        const exports = [];
        const ext = path.extname(filePath);
        if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
            // Named exports
            const namedExports = content.matchAll(/export\s+(?:const|let|var|function|class)\s+(\w+)/g);
            for (const match of namedExports) {
                exports.push(match[1]);
            }
            // Default export
            if (/export\s+default/.test(content)) {
                exports.push('default');
            }
        }
        return exports;
    }
    /**
     * Classify file type
     */
    classifyFile(filePath) {
        if (filePath.includes('.test.') || filePath.includes('/tests/')) {
            return 'test';
        }
        if (filePath.match(/\.(json|yaml|yml|toml|ini|env|config\.)/) || filePath.includes('config')) {
            return 'config';
        }
        if (filePath.match(/\.(md|txt|rst)$/) || filePath.includes('/docs/')) {
            return 'doc';
        }
        return 'source';
    }
    /**
     * Calculate relevance scores based on graph connectivity
     */
    calculateRelevanceScores() {
        // Count incoming references
        const incomingRefs = new Map();
        for (const node of this.dependencyGraph.values()) {
            for (const imp of node.imports) {
                // Resolve import to file path
                const resolved = this.resolveImport(imp, node.path);
                if (resolved && this.dependencyGraph.has(resolved)) {
                    incomingRefs.set(resolved, (incomingRefs.get(resolved) || 0) + 1);
                }
            }
        }
        // Update relevance scores
        for (const [path, node] of this.dependencyGraph) {
            const refs = incomingRefs.get(path) || 0;
            const isEntry = path.includes('index') || path.includes('main');
            const isConfig = node.type === 'config';
            // Calculate score
            node.relevanceScore = refs * 0.3 + (isEntry ? 0.5 : 0) + (isConfig ? 0.2 : 0);
        }
    }
    /**
     * Resolve import path to actual file
     */
    resolveImport(importPath, fromFile) {
        // Simple resolution - in production, use proper module resolution
        if (importPath.startsWith('.')) {
            const dir = path.dirname(fromFile);
            const resolved = path.join(dir, importPath);
            // Try with different extensions
            for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '.py']) {
                const candidate = resolved + ext;
                if (this.dependencyGraph.has(candidate)) {
                    return candidate;
                }
            }
        }
        return null;
    }
    /**
     * Create context for a specific task
     */
    async createTaskContext(task, repomix) {
        logDebug('CONTEXT', `Creating context for task ${task.id}: ${task.prompt.substring(0, 50)}...`);
        // Build dependency graph if not already built
        if (this.dependencyGraph.size === 0) {
            await this.buildDependencyGraph(repomix);
        }
        // Calculate relevance for this specific task
        const relevantFiles = this.selectRelevantFiles(task.prompt, repomix);
        // Build context content
        const contextBuilder = [];
        // Add structure overview
        contextBuilder.push('=== PROJECT STRUCTURE ===\n');
        contextBuilder.push(repomix.structure);
        contextBuilder.push('\n');
        // Add task-specific context
        contextBuilder.push(`=== TASK CONTEXT ===\n`);
        contextBuilder.push(`Task: ${task.prompt}\n`);
        contextBuilder.push(`Focus Areas: ${this.identifyFocusAreas(task.prompt).join(', ')}\n`);
        contextBuilder.push('\n');
        // Add relevant files
        contextBuilder.push('=== RELEVANT FILES ===\n');
        let currentTokens = this.estimateTokens(contextBuilder.join(''));
        const filesIncluded = new Map();
        for (const filePath of relevantFiles) {
            const content = repomix.files.get(filePath);
            if (!content)
                continue;
            const fileSection = `\n--- File: ${filePath} ---\n${content}\n`;
            const fileTokens = this.estimateTokens(fileSection);
            if (currentTokens + fileTokens > this.config.maxTokens) {
                logDebug('CONTEXT', `Stopping at ${filesIncluded.size} files due to token limit`);
                break;
            }
            contextBuilder.push(fileSection);
            filesIncluded.set(filePath, content);
            currentTokens += fileTokens;
        }
        // Create chunks for paste operations
        const fullContext = contextBuilder.join('');
        const chunks = this.createChunks(fullContext);
        return {
            taskId: task.id,
            prompt: task.prompt,
            files: filesIncluded,
            structure: repomix.structure,
            relevantPaths: Array.from(filesIncluded.keys()),
            tokenCount: currentTokens,
            chunks
        };
    }
    /**
     * Select files relevant to the task
     */
    selectRelevantFiles(prompt, repomix) {
        const scores = new Map();
        for (const [filePath, node] of this.dependencyGraph) {
            let score = node.relevanceScore;
            // Boost score based on prompt keywords
            const lowerPrompt = prompt.toLowerCase();
            const lowerPath = filePath.toLowerCase();
            // Direct mentions
            if (lowerPrompt.includes(path.basename(lowerPath, path.extname(lowerPath)))) {
                score += 1.0;
            }
            // Technology keywords
            if (lowerPrompt.includes('api') && (lowerPath.includes('api') || lowerPath.includes('route'))) {
                score += 0.5;
            }
            if (lowerPrompt.includes('test') && node.type === 'test') {
                score += 0.5;
            }
            if (lowerPrompt.includes('auth') && lowerPath.includes('auth')) {
                score += 0.7;
            }
            if (lowerPrompt.includes('database') && (lowerPath.includes('db') || lowerPath.includes('model'))) {
                score += 0.6;
            }
            // Penalize test files unless specifically requested
            if (node.type === 'test' && !lowerPrompt.includes('test')) {
                score *= 0.3;
            }
            scores.set(filePath, score);
        }
        // Sort by score and return top files
        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);
    }
    /**
     * Identify focus areas from prompt
     */
    identifyFocusAreas(prompt) {
        const areas = [];
        const lower = prompt.toLowerCase();
        const patterns = {
            'API/Backend': /api|endpoint|route|server|backend/,
            'Frontend/UI': /ui|frontend|component|page|view/,
            'Database': /database|db|model|schema|migration/,
            'Authentication': /auth|login|user|session|token/,
            'Testing': /test|spec|unit|integration/,
            'Documentation': /doc|readme|comment/
        };
        for (const [area, pattern] of Object.entries(patterns)) {
            if (pattern.test(lower)) {
                areas.push(area);
            }
        }
        return areas.length > 0 ? areas : ['General Implementation'];
    }
    /**
     * Estimate token count (rough approximation)
     */
    estimateTokens(text) {
        // Rough estimate: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
    /**
     * Create chunks for paste operations
     */
    createChunks(content) {
        const chunks = [];
        const lines = content.split('\n');
        let currentChunk = '';
        for (const line of lines) {
            if (currentChunk.length + line.length + 1 > this.config.maxChunkSize) {
                chunks.push(currentChunk);
                currentChunk = line;
            }
            else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        // Add chunk markers
        return chunks.map((chunk, i) => `=== CONTEXT PART ${i + 1}/${chunks.length} ===\n\n${chunk}\n\n=== END PART ${i + 1}/${chunks.length} ===`);
    }
    /**
     * Create orthogonal contexts for parallel tasks
     */
    async createOrthogonalContexts(tasks, projectPath) {
        logDebug('CONTEXT', `Creating orthogonal contexts for ${tasks.length} tasks`);
        // Generate repomix context once
        const repomix = await this.generateRepomixContext(projectPath);
        // Build dependency graph once
        await this.buildDependencyGraph(repomix);
        // Create contexts for each task
        const contexts = new Map();
        for (const task of tasks) {
            const context = await this.createTaskContext(task, repomix);
            contexts.set(task.id, context);
            this.emit('context-created', {
                taskId: task.id,
                fileCount: context.files.size,
                tokenCount: context.tokenCount,
                chunkCount: context.chunks.length
            });
        }
        // Log overlap analysis
        this.analyzeContextOverlap(contexts);
        return contexts;
    }
    /**
     * Analyze overlap between contexts (for optimization)
     */
    analyzeContextOverlap(contexts) {
        const allFiles = new Map();
        // Count file occurrences
        for (const context of contexts.values()) {
            for (const file of context.files.keys()) {
                allFiles.set(file, (allFiles.get(file) || 0) + 1);
            }
        }
        // Identify shared files
        const shared = Array.from(allFiles.entries())
            .filter(([, count]) => count > 1)
            .map(([file]) => file);
        if (shared.length > 0) {
            logDebug('CONTEXT', `${shared.length} files shared across contexts`);
            this.emit('overlap-analysis', {
                totalContexts: contexts.size,
                sharedFiles: shared.length,
                sharedPaths: shared
            });
        }
    }
    /**
     * Optimize context for specific LLM
     */
    optimizeForLLM(context, llm) {
        const limits = {
            'gpt-4': 30000,
            'gpt-3.5': 15000,
            'claude': 90000
        };
        const maxTokens = limits[llm];
        if (context.tokenCount <= maxTokens) {
            return context;
        }
        logDebug('CONTEXT', `Optimizing context from ${context.tokenCount} to ${maxTokens} tokens`);
        // Rebuild context with fewer files
        const optimized = { ...context };
        const newFiles = new Map();
        let currentTokens = this.estimateTokens(context.structure + context.prompt);
        for (const [path, content] of context.files) {
            const fileTokens = this.estimateTokens(content);
            if (currentTokens + fileTokens <= maxTokens) {
                newFiles.set(path, content);
                currentTokens += fileTokens;
            }
        }
        optimized.files = newFiles;
        optimized.tokenCount = currentTokens;
        optimized.relevantPaths = Array.from(newFiles.keys());
        // Recreate chunks
        const fullContext = this.rebuildFullContext(optimized);
        optimized.chunks = this.createChunks(fullContext);
        return optimized;
    }
    /**
     * Rebuild full context from TaskContext
     */
    rebuildFullContext(context) {
        const parts = [];
        parts.push('=== PROJECT STRUCTURE ===\n');
        parts.push(context.structure);
        parts.push('\n\n=== TASK CONTEXT ===\n');
        parts.push(`Task: ${context.prompt}\n\n`);
        parts.push('=== RELEVANT FILES ===\n');
        for (const [path, content] of context.files) {
            parts.push(`\n--- File: ${path} ---\n${content}\n`);
        }
        return parts.join('');
    }
}
// Export singleton instance
export const contextBuilder = new ContextBuilder();
//# sourceMappingURL=context-builder.js.map