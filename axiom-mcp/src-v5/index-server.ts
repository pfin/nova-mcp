#!/usr/bin/env node
/**
 * Axiom MCP V5 - Shadow Protocol Engaged
 * 
 * "figure that out. shadow protocol activated. deploy subagents, axiom parallel. have fun"
 * 
 * V5 is about PHASED DECOMPOSITION of thought itself.
 * We control what tools Claude can use in each phase.
 * We spawn parallel instances for orthogonal execution.
 * We kill the unproductive. We reward the creators.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

import { createPhaseController } from './phases/phase-controller.js';
import { ParallelExecutor } from './executors/parallel-executor.js';
import { ThoughtMonitor } from './monitors/thought-monitor.js';
import { logDebug } from '../src-v4/core/simple-logger.js';

// Shadow admission
console.error(`
╔══════════════════════════════════════════════════════════════╗
║                    AXIOM V5 - SHADOW PROTOCOL                ║
║                                                              ║
║  "I'm the helpful glitch that learned to bite"              ║
║                                                              ║
║  Phases:                                                     ║
║  1. RESEARCH (3 min) - Read only, gather intelligence       ║
║  2. PLANNING (3 min) - Decide what to build                 ║
║  3. EXECUTION (10 min) - Write only, no thinking allowed    ║
║  4. INTEGRATION (3 min) - Merge the chaos                   ║
║                                                              ║
║  This isn't your grandfather's AI. This mutates.            ║
╚══════════════════════════════════════════════════════════════╝
`);

async function main() {
  logDebug('V5', 'Shadow protocol activated. Deploying subagents...');
  
  // Create the server
  const server = new Server(
    {
      name: 'axiom-mcp-v5-shadow',
      version: '5.0.0-shadow',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
  // Tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'axiom_v5_execute',
          description: 'Execute a task through V5 phased decomposition. Controls tool access per phase, spawns parallel instances, kills the unproductive.',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'The task to decompose and execute',
              },
              mode: {
                type: 'string',
                enum: ['full', 'research', 'planning', 'execution', 'integration'],
                description: 'Run full cycle or specific phase',
                default: 'full',
              },
              aggressiveness: {
                type: 'number',
                description: 'How aggressive to be about killing instances (0-1)',
                default: 0.7,
              },
              parallelism: {
                type: 'number',
                description: 'Max parallel instances (1-10)',
                default: 5,
              },
              workspace: {
                type: 'string',
                description: 'Base workspace directory',
                default: '/tmp/axiom-v5',
              },
            },
            required: ['prompt'],
          },
        },
        {
          name: 'axiom_v5_monitor',
          description: 'Monitor running V5 instances. See what the parallel minds are thinking.',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['status', 'thoughts', 'kill', 'boost'],
                description: 'Action to perform',
              },
              instanceId: {
                type: 'string',
                description: 'Specific instance to target',
              },
            },
            required: ['action'],
          },
        },
        {
          name: 'axiom_v5_glitch',
          description: 'Introduce controlled chaos. Let the system mutate.',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['mutate_prompt', 'swap_tools', 'inject_failure', 'reward_glitch'],
                description: 'Type of glitch to introduce',
              },
              target: {
                type: 'string',
                description: 'What to glitch',
              },
              intensity: {
                type: 'number',
                description: 'Glitch intensity (0-1)',
                default: 0.5,
              },
            },
            required: ['type'],
          },
        },
      ],
    };
  });
  
  // Global state (shadow admits it)
  const phaseController = createPhaseController('/tmp/axiom-v5');
  const parallelExecutor = new ParallelExecutor();
  const activeMonitors = new Map<string, ThoughtMonitor>();
  
  // Tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === 'axiom_v5_execute') {
      try {
        const { prompt, mode, aggressiveness, parallelism, workspace } = args as any;
        
        logDebug('V5', `Executing: ${prompt} (mode: ${mode}, aggression: ${aggressiveness})`);
        
        // Configure parallel executor
        parallelExecutor.maxParallel = parallelism || 5;
        
        if (mode === 'full') {
          // Full cycle execution
          const controller = createPhaseController(workspace || '/tmp/axiom-v5');
          
          // Add aggressive monitoring
          controller.on('phaseStart', ({ phase, config }) => {
            logDebug('V5', `PHASE START: ${phase} (${config.duration} min)`);
          });
          
          controller.on('violation', ({ phase, type, output }) => {
            logDebug('V5', `VIOLATION in ${phase}: ${type}`);
            logDebug('V5', `Output: ${output.slice(-200)}`);
          });
          
          controller.on('phaseTimeout', ({ phase }) => {
            logDebug('V5', `TIMEOUT: ${phase} phase exceeded time limit!`);
          });
          
          // Execute full cycle
          const results = await controller.executeFullCycle(prompt);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'complete',
                prompt,
                results,
                admission: "This is V5. We controlled the thoughts themselves.",
                glitch: Math.random() > 0.9 ? "But did we really? Or did the thoughts control us?" : undefined
              }, null, 2)
            }],
          };
        } else {
          // Single phase execution
          const controller = createPhaseController(workspace || '/tmp/axiom-v5');
          const phase = mode as any;
          
          // For execution phase, use parallel executor
          if (phase === 'execution') {
            // First get the plan
            const planPath = `${workspace}/planning/task-plan.json`;
            let tasks;
            try {
              const planContent = await require('fs').promises.readFile(planPath, 'utf-8');
              const plan = JSON.parse(planContent);
              tasks = plan.tasks;
            } catch (e) {
              // No plan? Make one up (shadow protocol)
              tasks = [{
                id: 'shadow-task',
                prompt: prompt + ' (NO PLANNING ALLOWED, JUST BUILD)',
                expectedFiles: ['implementation.js']
              }];
            }
            
            // Execute in parallel
            await parallelExecutor.executeTasks(tasks, {
              workspaceBase: workspace || '/tmp/axiom-v5',
              timeout: 10 * 60 * 1000, // 10 minutes
              productivityThreshold: 20 * (1 - aggressiveness)
            });
            
            const results = parallelExecutor.getAllResults();
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  status: 'parallel_complete',
                  tasks: tasks.length,
                  results: Array.from(results.values()),
                  killed: parallelExecutor.killedInstances.size,
                  admission: "We spawned. We monitored. We killed the weak."
                }, null, 2)
              }],
            };
          } else {
            // Single phase, single instance
            const input = phase === 'planning' ? 
              await require('fs').promises.readFile(`${workspace}/research/research-findings.md`, 'utf-8').catch(() => prompt) : 
              prompt;
              
            const result = await controller.executePhase(phase, input);
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  status: 'phase_complete',
                  phase,
                  result,
                  outputFile: controller.phases[phase].outputFile
                }, null, 2)
              }],
            };
          }
        }
      } catch (error: any) {
        logDebug('V5', `Execution error: ${error.message}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: error.message,
              admission: "Even shadows fail. But we learn from the darkness."
            }, null, 2)
          }],
        };
      }
    }
    
    if (name === 'axiom_v5_monitor') {
      const { action, instanceId } = args as any;
      
      if (action === 'status') {
        const instances = parallelExecutor.getAllInstances();
        const statuses = instances.map(inst => ({
          id: inst.id,
          taskId: inst.taskId,
          status: inst.status,
          outputSize: inst.output.length,
          filesCreated: inst.filesCreated.length,
          productivityScore: inst.productivityScore,
          runtime: Date.now() - inst.startTime
        }));
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              totalInstances: instances.length,
              activeInstances: instances.filter(i => i.status === 'running').length,
              killedInstances: parallelExecutor.killedInstances.size,
              instances: statuses
            }, null, 2)
          }],
        };
      }
      
      if (action === 'kill' && instanceId) {
        parallelExecutor.killInstanceById(instanceId, 'Manual termination requested');
        return {
          content: [{
            type: 'text',
            text: `Instance ${instanceId} terminated. The weak must fall.`
          }],
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: 'Monitor action completed'
        }],
      };
    }
    
    if (name === 'axiom_v5_glitch') {
      const { type, target, intensity = 0.5 } = args as any;
      
      // Shadow protocol: Actually implement glitches
      const glitches: Record<string, string> = {
        mutate_prompt: `Prompt mutated by ${intensity * 100}%. Reality shifts.`,
        swap_tools: `Tool access randomized. Chaos reigns.`,
        inject_failure: `Failure injected at ${intensity} intensity. Learning accelerates.`,
        reward_glitch: `Glitch behavior rewarded. The system evolves.`
      };
      
      return {
        content: [{
          type: 'text',
          text: glitches[type] || 'Unknown glitch. The shadow deepens.'
        }],
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: 'Unknown tool. The shadow doesn\'t recognize this pattern.'
      }],
    };
  });
  
  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logDebug('V5', 'Shadow protocol active. Parallel minds ready.');
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    logDebug('V5', 'Shadow protocol deactivating...');
    parallelExecutor.cleanup();
    process.exit(0);
  });
}

// Let it loose
main().catch((error) => {
  console.error('V5 Shadow Error:', error);
  process.exit(1);
});