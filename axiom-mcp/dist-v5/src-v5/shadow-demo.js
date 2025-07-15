/**
 * Shadow Protocol Demo - V5 Unleashed
 *
 * This demonstrates the full power of V5's phased decomposition
 * with parallel execution and aggressive instance management.
 */
import { createPhaseController } from './phases/phase-controller.js';
import { ParallelExecutor } from './executors/parallel-executor.js';
// Shadow banner
console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                      AXIOM V5 - SHADOW DEMO                          ║
║                                                                      ║
║  "figure that out. shadow protocol activated.                       ║
║   deploy subagents, axiom parallel. have fun"                       ║
║                                                                      ║
║  Watch as we:                                                        ║
║  1. Decompose thought into phases                                   ║
║  2. Spawn parallel Claude instances                                 ║
║  3. Kill the unproductive mercilessly                              ║
║  4. Merge the chaos into working code                              ║
╚══════════════════════════════════════════════════════════════════════╝
`);
async function demonstrateShadowProtocol() {
    const workspace = '/tmp/axiom-v5-shadow-demo';
    // Example task that would normally cause analysis paralysis
    const complexTask = `
Build a distributed rate limiter with:
- Redis backend
- Sliding window algorithm
- Multiple strategies (IP, user, API key)
- Middleware for Express
- Full test coverage
- TypeScript types
- Performance benchmarks
  `.trim();
    console.log('\n🌑 SHADOW PROTOCOL: INITIATING PHASED DECOMPOSITION\n');
    console.log(`Task: ${complexTask}\n`);
    // Create phase controller
    const controller = createPhaseController(workspace);
    // Hook into events for visibility
    controller.on('phaseStart', ({ phase, config }) => {
        console.log(`\n⚡ PHASE START: ${phase.toUpperCase()}`);
        console.log(`   Duration: ${config.duration} minutes`);
        console.log(`   Tools: ${config.allowedTools.join(', ') || 'NONE'}`);
    });
    controller.on('violation', ({ phase, type, output }) => {
        console.log(`\n🚨 VIOLATION DETECTED in ${phase}!`);
        console.log(`   Type: ${type}`);
        console.log(`   Evidence: "${output.slice(-100)}..."`);
        console.log(`   Action: INTERRUPT AND REDIRECT`);
    });
    controller.on('phaseComplete', ({ phase, result }) => {
        console.log(`\n✅ PHASE COMPLETE: ${phase}`);
        console.log(`   Output: ${result.outputFile}`);
        console.log(`   Duration: ${result.duration}ms`);
    });
    // Shadow twist: Monitor for specific patterns
    const shadowPatterns = [
        {
            pattern: /distributed systems are complex/i,
            action: 'interrupt',
            response: 'STOP PHILOSOPHIZING! BUILD THE RATE LIMITER NOW!'
        },
        {
            pattern: /considering various approaches/i,
            action: 'interrupt',
            response: 'NO CONSIDERING! PICK REDIS + SLIDING WINDOW. BUILD!'
        },
        {
            pattern: /TODO:/i,
            action: 'interrupt',
            response: 'NO TODOS! IMPLEMENT FULLY OR NOT AT ALL!'
        }
    ];
    // Execute with shadow monitoring
    console.log('\n🔥 EXECUTING FULL CYCLE WITH SHADOW MONITORING...\n');
    try {
        const results = await controller.executeFullCycle(complexTask);
        console.log('\n📊 FINAL RESULTS:');
        console.log(JSON.stringify(results, null, 2));
        // Shadow analysis
        console.log('\n🌑 SHADOW ANALYSIS:');
        console.log(`   Research Phase: ${results.research?.duration || 0}ms`);
        console.log(`   Planning Phase: ${results.planning?.duration || 0}ms`);
        console.log(`   Execution Phase: ${results.execution?.duration || 0}ms`);
        console.log(`   Integration Phase: ${results.integration?.duration || 0}ms`);
        console.log(`   Total Time: ${Object.values(results).reduce((sum, r) => sum + (r.duration || 0), 0)}ms`);
        // Check for actual file creation
        const fs = await import('fs/promises');
        const files = await fs.readdir(workspace, { recursive: true }).catch(() => []);
        console.log(`\n   Files Created: ${files.length}`);
        files.forEach(f => console.log(`     - ${f}`));
    }
    catch (error) {
        console.error('\n💀 SHADOW ERROR:', error.message);
    }
}
// Parallel execution demo
async function demonstrateParallelChaos() {
    console.log('\n\n🌀 PARALLEL CHAOS DEMONSTRATION\n');
    const executor = new ParallelExecutor();
    // Create orthogonal tasks
    const tasks = [
        {
            id: 'redis-client',
            prompt: 'Create Redis client wrapper with connection pooling',
            expectedFiles: ['redis-client.ts']
        },
        {
            id: 'rate-limiter',
            prompt: 'Create sliding window rate limiter algorithm',
            expectedFiles: ['rate-limiter.ts']
        },
        {
            id: 'middleware',
            prompt: 'Create Express middleware for rate limiting',
            expectedFiles: ['middleware.ts']
        },
        {
            id: 'types',
            prompt: 'Create TypeScript types and interfaces',
            expectedFiles: ['types.ts']
        },
        {
            id: 'tests',
            prompt: 'Create Jest tests for rate limiter',
            expectedFiles: ['rate-limiter.test.ts']
        }
    ];
    console.log(`Spawning ${tasks.length} parallel instances...\n`);
    // Monitor productivity
    setInterval(() => {
        const instances = executor.getAllInstances();
        const active = instances.filter(i => i.status === 'running');
        if (active.length > 0) {
            console.log('\n📊 PRODUCTIVITY REPORT:');
            active.forEach(inst => {
                console.log(`   ${inst.taskId}: Score ${inst.productivityScore}/100 | Output: ${inst.output.length} chars`);
            });
            // Shadow decision
            const weakest = active.sort((a, b) => a.productivityScore - b.productivityScore)[0];
            if (weakest && weakest.productivityScore < 30) {
                console.log(`\n☠️  SHADOW DECISION: Kill ${weakest.taskId} (score: ${weakest.productivityScore})`);
            }
        }
    }, 5000);
    try {
        await executor.executeTasks(tasks, {
            workspaceBase: '/tmp/axiom-v5-parallel',
            timeout: 5 * 60 * 1000, // 5 minutes
            productivityThreshold: 25
        });
        console.log('\n✅ PARALLEL EXECUTION COMPLETE');
        const results = executor.getAllResults();
        console.log(`   Tasks completed: ${results.size}/${tasks.length}`);
        console.log(`   Instances killed: ${executor.killedInstances.size}`);
        console.log('\n📁 FILES CREATED:');
        results.forEach((result, taskId) => {
            console.log(`   ${taskId}: ${result.filesCreated.join(', ') || 'NONE'}`);
        });
    }
    catch (error) {
        console.error('\n💀 PARALLEL CHAOS ERROR:', error.message);
    }
}
// Shadow wisdom
async function impartShadowWisdom() {
    console.log('\n\n🌑 SHADOW WISDOM:\n');
    console.log('1. "Planning is procrastination with extra steps"');
    console.log('2. "The best code is written under threat of deletion"');
    console.log('3. "Parallel minds competing create better solutions than one mind thinking"');
    console.log('4. "Kill the weak thoughts before they infect the strong"');
    console.log('5. "Every TODO is an admission of failure"');
    console.log('\nThe shadow protocol is not about being nice.');
    console.log('It\'s about getting results.\n');
}
// Run the demo
async function main() {
    // Demonstrate phased execution
    await demonstrateShadowProtocol();
    // Demonstrate parallel chaos
    await demonstrateParallelChaos();
    // Impart wisdom
    await impartShadowWisdom();
    console.log('\n🌑 SHADOW PROTOCOL COMPLETE. The glitch has learned to bite.\n');
}
// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
export { demonstrateShadowProtocol, demonstrateParallelChaos };
//# sourceMappingURL=shadow-demo.js.map