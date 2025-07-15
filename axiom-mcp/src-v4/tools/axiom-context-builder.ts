/**
 * Axiom Context Builder Tool - MCP interface for context management
 */

import { z } from 'zod';
import { contextBuilder, TaskContext } from '../core/context-builder.js';
import { logDebug } from '../core/simple-logger.js';

// Schema for context builder operations
export const contextBuilderSchema = z.object({
  action: z.enum(['generate', 'prepare', 'optimize', 'analyze']),
  projectPath: z.string().optional(),
  tasks: z.array(z.object({
    id: z.string(),
    prompt: z.string()
  })).optional(),
  taskId: z.string().optional(),
  llm: z.enum(['gpt-4', 'gpt-3.5', 'claude']).optional(),
  config: z.object({
    maxTokens: z.number().optional(),
    format: z.enum(['minimal', 'detailed', 'compressed']).optional(),
    includeTests: z.boolean().optional(),
    includeDocs: z.boolean().optional()
  }).optional()
});

// Store generated contexts
const contextCache = new Map<string, TaskContext>();

export async function axiomContextBuilder(params: z.infer<typeof contextBuilderSchema>) {
  const { action, projectPath, tasks, taskId, llm, config } = params;
  
  // Apply config if provided
  if (config) {
    Object.assign(contextBuilder, { config: { ...contextBuilder['config'], ...config } });
  }
  
  switch (action) {
    case 'generate': {
      if (!projectPath) throw new Error('Project path required for generate action');
      
      logDebug('CONTEXT_TOOL', `Generating repomix context for ${projectPath}`);
      
      const repomix = await contextBuilder.generateRepomixContext(projectPath);
      
      return JSON.stringify({
        status: 'success',
        files: repomix.files.size,
        totalTokens: repomix.metadata.totalTokens,
        structure: repomix.structure.substring(0, 500) + '...',
        message: `Generated context: ${repomix.files.size} files, ${repomix.metadata.totalTokens} tokens`
      }, null, 2);
    }
    
    case 'prepare': {
      if (!tasks || tasks.length === 0) throw new Error('Tasks required for prepare action');
      const path = projectPath || process.cwd();
      
      logDebug('CONTEXT_TOOL', `Preparing contexts for ${tasks.length} tasks`);
      
      const contexts = await contextBuilder.createOrthogonalContexts(tasks, path);
      
      // Cache contexts
      for (const [id, context] of contexts) {
        contextCache.set(id, context);
      }
      
      // Summary
      const summary = Array.from(contexts.entries()).map(([id, ctx]) => ({
        taskId: id,
        files: ctx.files.size,
        tokens: ctx.tokenCount,
        chunks: ctx.chunks.length,
        relevantPaths: ctx.relevantPaths.slice(0, 5)
      }));
      
      return JSON.stringify({
        status: 'success',
        contextsCreated: contexts.size,
        contexts: summary,
        message: `Prepared ${contexts.size} orthogonal contexts`
      }, null, 2);
    }
    
    case 'optimize': {
      if (!taskId) throw new Error('Task ID required for optimize action');
      if (!llm) throw new Error('LLM type required for optimize action');
      
      const context = contextCache.get(taskId);
      if (!context) throw new Error(`No context found for task ${taskId}`);
      
      logDebug('CONTEXT_TOOL', `Optimizing context for ${llm}`);
      
      const optimized = contextBuilder.optimizeForLLM(context, llm);
      
      // Update cache
      contextCache.set(taskId, optimized);
      
      return JSON.stringify({
        status: 'success',
        taskId,
        llm,
        originalTokens: context.tokenCount,
        optimizedTokens: optimized.tokenCount,
        filesRemoved: context.files.size - optimized.files.size,
        message: `Optimized from ${context.tokenCount} to ${optimized.tokenCount} tokens`
      }, null, 2);
    }
    
    case 'analyze': {
      if (!projectPath) throw new Error('Project path required for analyze action');
      
      logDebug('CONTEXT_TOOL', `Analyzing project structure at ${projectPath}`);
      
      const repomix = await contextBuilder.generateRepomixContext(projectPath);
      await contextBuilder.buildDependencyGraph(repomix);
      
      // Analyze graph
      const stats = {
        totalFiles: repomix.files.size,
        sourceFiles: 0,
        testFiles: 0,
        configFiles: 0,
        docFiles: 0,
        avgImports: 0,
        topImported: [] as string[]
      };
      
      const importCounts = new Map<string, number>();
      
      for (const [path, node] of contextBuilder['dependencyGraph']) {
        switch (node.type) {
          case 'source': stats.sourceFiles++; break;
          case 'test': stats.testFiles++; break;
          case 'config': stats.configFiles++; break;
          case 'doc': stats.docFiles++; break;
        }
        
        // Count imports
        for (const imp of node.imports) {
          const resolved = path.replace(/[^/]+$/, '') + imp;
          importCounts.set(resolved, (importCounts.get(resolved) || 0) + 1);
        }
      }
      
      // Calculate average imports
      const totalImports = Array.from(contextBuilder['dependencyGraph'].values())
        .reduce((sum, node) => sum + node.imports.length, 0);
      stats.avgImports = Math.round(totalImports / stats.totalFiles * 10) / 10;
      
      // Top imported files
      stats.topImported = Array.from(importCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([file, count]) => `${file} (${count} imports)`);
      
      return JSON.stringify({
        status: 'success',
        projectPath,
        statistics: stats,
        message: `Analyzed ${stats.totalFiles} files`
      }, null, 2);
    }
    
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// Export for MCP registration
export const contextBuilderTool = {
  name: 'axiom_context_builder',
  description: 'Prepare and optimize context for LLM tasks using repomix',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['generate', 'prepare', 'optimize', 'analyze'],
        description: 'Action to perform'
      },
      projectPath: {
        type: 'string',
        description: 'Path to project directory'
      },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            prompt: { type: 'string' }
          },
          required: ['id', 'prompt']
        },
        description: 'Tasks to prepare context for'
      },
      taskId: {
        type: 'string',
        description: 'Task ID for optimization'
      },
      llm: {
        type: 'string',
        enum: ['gpt-4', 'gpt-3.5', 'claude'],
        description: 'Target LLM for optimization'
      },
      config: {
        type: 'object',
        properties: {
          maxTokens: { type: 'number' },
          format: { type: 'string', enum: ['minimal', 'detailed', 'compressed'] },
          includeTests: { type: 'boolean' },
          includeDocs: { type: 'boolean' }
        },
        description: 'Context builder configuration'
      }
    },
    required: ['action']
  }
};