#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { 
  axiomMcpGoalTool, 
  handleAxiomMcpGoal 
} from './tools/axiom-mcp-goal.js';
import { 
  axiomMcpExploreTool, 
  handleAxiomMcpExplore 
} from './tools/axiom-mcp-explore.js';
import { 
  axiomMcpChainTool, 
  handleAxiomMcpChain,
  initializeContextManager as initChainContextManager
} from './tools/axiom-mcp-chain.js';
import { 
  axiomMcpSynthesisTool, 
  handleAxiomMcpSynthesis,
  initializeSynthesisContextManager
} from './tools/axiom-mcp-synthesis.js';
import {
  axiomMcpStatusTool,
  handleAxiomMcpStatus
} from './tools/axiom-mcp-status.js';
import {
  axiomMcpSpawnTool,
  handleAxiomMcpSpawn
} from './tools/axiom-mcp-spawn.js';
import {
  axiomMcpSpawnMctsTool,
  handleAxiomMcpSpawnMcts
} from './tools/axiom-mcp-spawn-mcts.js';
import {
  axiomMcpSpawnStreamingTool,
  handleAxiomMcpSpawnStreaming
} from './tools/axiom-mcp-spawn-streaming.js';
import {
  axiomMcpTreeTool,
  handleAxiomMcpTree
} from './tools/axiom-mcp-tree.js';
import {
  axiomMcpGoalsTool,
  handleAxiomMcpGoals
} from './tools/axiom-mcp-goals.js';
import {
  axiomMcpMergeTool,
  handleAxiomMcpMerge
} from './tools/axiom-mcp-merge.js';
import {
  axiomMcpEvaluateTool,
  handleAxiomMcpEvaluate
} from './tools/axiom-mcp-evaluate.js';
import {
  axiomMcpTestGuidanceTool,
  handleAxiomMcpTestGuidance
} from './tools/axiom-mcp-test-guidance.js';
import {
  axiomMcpImplementTool,
  handleAxiomMcpImplement
} from './tools/axiom-mcp-implement.js';
import {
  axiomMcpVisualizeTool,
  handleAxiomMcpVisualize
} from './tools/axiom-mcp-visualize.js';
import {
  axiomMcpVerifyTool,
  handleAxiomMcpVerify
} from './tools/axiom-mcp-verify.js';
import {
  axiomMcpDocsTool,
  handleAxiomMcpDocs
} from './tools/axiom-mcp-docs.js';
import { ClaudeCodeSubprocess } from './claude-subprocess.js';
import { ClaudeCodeSubprocessStreaming } from './claude-subprocess-streaming.js';
import { ContextManager } from './context-manager.js';
import { StatusManager } from './status-manager.js';
import { streamManager } from './stream-manager.js';

const server = new Server(
  {
    name: 'axiom-mcp',
    version: '0.5.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize shared instances
const claudeCode = new ClaudeCodeSubprocess({
  timeout: 1800000, // 30 minutes for deep research
});

const claudeStreaming = new ClaudeCodeSubprocessStreaming({
  timeout: 1800000, // 30 minutes for deep research
});

const contextManager = new ContextManager();
const statusManager = new StatusManager();

// Initialize context managers for tools
initChainContextManager(contextManager);
initializeSynthesisContextManager(contextManager);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      axiomMcpGoalTool,
      axiomMcpExploreTool,
      axiomMcpChainTool,
      axiomMcpSynthesisTool,
      axiomMcpStatusTool,
      axiomMcpSpawnTool,
      axiomMcpSpawnMctsTool,
      axiomMcpSpawnStreamingTool,
      axiomMcpTreeTool,
      axiomMcpGoalsTool,
      axiomMcpMergeTool,
      axiomMcpEvaluateTool,
      axiomMcpTestGuidanceTool,
      axiomMcpImplementTool,
      axiomMcpVisualizeTool,
      axiomMcpVerifyTool,
      axiomMcpDocsTool,
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'axiom_mcp_goal':
        return await handleAxiomMcpGoal(args as any, claudeCode);
      
      case 'axiom_mcp_explore':
        return await handleAxiomMcpExplore(args as any, claudeCode);
      
      case 'axiom_mcp_chain':
        return await handleAxiomMcpChain(args as any, claudeCode);
      
      case 'axiom_mcp_synthesis':
        return await handleAxiomMcpSynthesis(args as any, claudeCode);
      
      case 'axiom_mcp_status':
        return await handleAxiomMcpStatus(args as any, statusManager);
      
      case 'axiom_mcp_spawn':
        return await handleAxiomMcpSpawn(args as any, claudeCode, statusManager);
      
      case 'axiom_mcp_spawn_mcts':
        return await handleAxiomMcpSpawnMcts(args as any, claudeCode, statusManager);
      
      case 'axiom_mcp_spawn_streaming':
        return await handleAxiomMcpSpawnStreaming(args as any, claudeStreaming, statusManager);
      
      case 'axiom_mcp_tree':
        return await handleAxiomMcpTree(args as any, statusManager, contextManager);
      
      case 'axiom_mcp_goals':
        return await handleAxiomMcpGoals(args as any, statusManager, contextManager);
      
      case 'axiom_mcp_merge':
        return await handleAxiomMcpMerge(args as any, statusManager, contextManager, claudeCode);
      
      case 'axiom_mcp_evaluate':
        return await handleAxiomMcpEvaluate(args as any, statusManager, contextManager, claudeCode);
      
      case 'axiom_mcp_test_guidance':
        return await handleAxiomMcpTestGuidance(args as any, claudeCode);
      
      case 'axiom_mcp_implement':
        return await handleAxiomMcpImplement(args as any, claudeCode, statusManager);
      
      case 'axiom_mcp_visualize':
        return await handleAxiomMcpVisualize(args as any, statusManager);
      
      case 'axiom_mcp_verify':
        return await handleAxiomMcpVerify(args as any);
      
      case 'axiom_mcp_docs':
        return await handleAxiomMcpDocs(args as any);
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Axiom MCP server v0.5.0 started - Critical evaluation and quality control enabled!');
  console.error(`Logs directory: ${process.cwd()}/logs`);
  console.error(`Status file: ${process.cwd()}/status/current.json`);
  console.error('Features: tree visualization, goal tracking, context merging, critical evaluation');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});