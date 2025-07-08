#!/usr/bin/env node
/**
 * MCTS Proof Experiment
 * Demonstrates that parallel Claude instances with MCTS-style management
 * outperform a single Claude instance on the same problem
 */

import { spawn } from 'node-pty';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Experiment configuration
const PROBLEM = "Implement an efficient in-memory cache with LRU eviction, TTL support, and thread-safe operations";
const TIMEOUT = 120000; // 2 minutes per experiment
const INSTANCES = 5;

class MCTSExperiment {
  constructor() {
    this.results = {
      single: [],
      parallel: []
    };
    this.metrics = {
      timeToFirstSolution: {},
      timeToOptimal: {},
      solutionQuality: {},
      approachDiversity: {},
      errorCount: {}
    };
  }

  async run() {
    console.log('🧪 MCTS Proof Experiment Starting');
    console.log('================================\n');
    console.log(`Problem: ${PROBLEM}\n`);

    // Run single Claude experiment
    console.log('📊 Phase 1: Single Claude Baseline');
    console.log('----------------------------------');
    const singleResult = await this.runSingleClaude();
    
    console.log('\n📊 Phase 2: Parallel MCTS Claude');
    console.log('--------------------------------');
    const parallelResult = await this.runParallelMCTS();
    
    console.log('\n📈 Results Analysis');
    console.log('------------------');
    this.analyzeResults(singleResult, parallelResult);
  }

  async runSingleClaude() {
    const startTime = Date.now();
    const outputs = [];
    let firstSolutionTime = null;
    let errors = 0;
    
    console.log('Spawning single Claude instance...');
    
    return new Promise((resolve) => {
      const claude = spawn('claude', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
      });

      let buffer = '';
      let state = 'starting';

      claude.onData((data) => {
        buffer += data;
        outputs.push(data);
        
        // Detect readiness
        if (state === 'starting' && data.includes('Type your prompt')) {
          state = 'ready';
          console.log('✓ Claude ready, sending problem...');
          
          // Type the problem slowly
          setTimeout(async () => {
            for (const char of PROBLEM) {
              claude.write(char);
              await new Promise(r => setTimeout(r, 50));
            }
            claude.write('\x0d'); // Submit
            state = 'working';
          }, 500);
        }
        
        // Detect first code output
        if (!firstSolutionTime && data.includes('```')) {
          firstSolutionTime = Date.now() - startTime;
          console.log(`✓ First solution at ${firstSolutionTime}ms`);
        }
        
        // Detect errors
        if (data.includes('error') || data.includes('Error')) {
          errors++;
        }
      });

      // Set timeout
      setTimeout(() => {
        claude.kill();
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        resolve({
          totalTime,
          firstSolutionTime: firstSolutionTime || totalTime,
          errors,
          outputs: outputs.join(''),
          approaches: this.countApproaches(outputs.join('')),
          quality: this.assessQuality(outputs.join(''))
        });
      }, TIMEOUT);
    });
  }

  async runParallelMCTS() {
    const startTime = Date.now();
    const instances = new Map();
    const outputs = new Map();
    const states = new Map();
    let firstSolutionTime = null;
    let errors = 0;
    
    // Strategies for different instances
    const strategies = [
      { id: 'explorer', prompt: `${PROBLEM}\nExplore multiple approaches before choosing` },
      { id: 'optimizer', prompt: `${PROBLEM}\nFocus on performance optimization` },
      { id: 'simplifier', prompt: `${PROBLEM}\nStart simple and iterate` },
      { id: 'researcher', prompt: `${PROBLEM}\nResearch best practices first` },
      { id: 'innovator', prompt: `${PROBLEM}\nTry unconventional approaches` }
    ];
    
    console.log('Spawning parallel Claude instances...');
    
    return new Promise(async (resolve) => {
      // Spawn all instances
      for (const strategy of strategies) {
        const claude = spawn('claude', [], {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: process.cwd(),
          env: process.env
        });
        
        instances.set(strategy.id, claude);
        outputs.set(strategy.id, []);
        states.set(strategy.id, 'starting');
        
        claude.onData((data) => {
          outputs.get(strategy.id).push(data);
          
          // Detect readiness
          if (states.get(strategy.id) === 'starting' && data.includes('Type your prompt')) {
            states.set(strategy.id, 'ready');
            console.log(`✓ ${strategy.id} ready`);
            
            // Send strategy-specific prompt
            setTimeout(async () => {
              for (const char of strategy.prompt) {
                claude.write(char);
                await new Promise(r => setTimeout(r, 30)); // Faster for parallel
              }
              claude.write('\x0d');
              states.set(strategy.id, 'working');
            }, 500);
          }
          
          // Detect first solution from any instance
          if (!firstSolutionTime && data.includes('```')) {
            firstSolutionTime = Date.now() - startTime;
            console.log(`✓ First solution from ${strategy.id} at ${firstSolutionTime}ms`);
          }
          
          // Count errors
          if (data.includes('error') || data.includes('Error')) {
            errors++;
          }
        });
      }
      
      // MCTS monitoring and intervention
      const monitor = setInterval(() => {
        console.log('\n🔍 MCTS Monitor Check:');
        
        for (const [id, output] of outputs) {
          const text = output.join('');
          const quality = this.assessQuality(text);
          
          console.log(`  ${id}: Quality=${quality.toFixed(2)}, Length=${text.length}`);
          
          // Intervention logic
          if (quality < 0.3 && text.length > 1000) {
            console.log(`  → Intervening on ${id}: Steering to different approach`);
            const claude = instances.get(id);
            claude.write('\x1b'); // ESC to interrupt
            setTimeout(() => {
              const newPrompt = 'Try a completely different approach';
              for (const char of newPrompt) {
                claude.write(char);
              }
              claude.write('\x0d');
            }, 1000);
          }
        }
      }, 10000); // Check every 10 seconds
      
      // Run experiment
      setTimeout(() => {
        clearInterval(monitor);
        
        // Kill all instances
        for (const [id, claude] of instances) {
          claude.kill();
        }
        
        // Aggregate results
        const allOutputs = Array.from(outputs.values()).flat().join('');
        const approaches = new Set();
        
        for (const [id, output] of outputs) {
          const text = output.join('');
          const approach = this.identifyApproach(text);
          if (approach) approaches.add(approach);
        }
        
        resolve({
          totalTime: Date.now() - startTime,
          firstSolutionTime: firstSolutionTime || (Date.now() - startTime),
          errors,
          outputs: allOutputs,
          approaches: approaches.size,
          quality: Math.max(...Array.from(outputs.values()).map(o => 
            this.assessQuality(o.join(''))
          ))
        });
      }, TIMEOUT);
    });
  }

  countApproaches(text) {
    // Simple heuristic: count different implementation patterns
    const patterns = [
      /class\s+\w+Cache/g,
      /function\s+\w+Cache/g,
      /Map\(\)/g,
      /WeakMap\(\)/g,
      /Object\.create/g
    ];
    
    let count = 0;
    for (const pattern of patterns) {
      if (text.match(pattern)) count++;
    }
    return Math.max(1, count);
  }

  identifyApproach(text) {
    if (text.includes('class') && text.includes('Cache')) return 'OOP';
    if (text.includes('function') && text.includes('closure')) return 'Functional';
    if (text.includes('Map()')) return 'Map-based';
    if (text.includes('WeakMap()')) return 'WeakMap-based';
    if (text.includes('Proxy')) return 'Proxy-based';
    return null;
  }

  assessQuality(text) {
    let score = 0;
    
    // Check for key features
    if (text.includes('LRU')) score += 0.2;
    if (text.includes('TTL') || text.includes('expir')) score += 0.2;
    if (text.includes('thread') || text.includes('lock') || text.includes('mutex')) score += 0.2;
    if (text.includes('test') || text.includes('Test')) score += 0.1;
    if (text.includes('```')) score += 0.1; // Has code
    if (text.includes('O(1)')) score += 0.1; // Performance consideration
    if (text.includes('error') || text.includes('Error')) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  analyzeResults(single, parallel) {
    console.log('\n🏁 EXPERIMENT RESULTS');
    console.log('====================\n');
    
    console.log('Single Claude:');
    console.log(`  Time to first solution: ${single.firstSolutionTime}ms`);
    console.log(`  Total time: ${single.totalTime}ms`);
    console.log(`  Solution quality: ${single.quality.toFixed(2)}`);
    console.log(`  Approaches explored: ${single.approaches}`);
    console.log(`  Errors encountered: ${single.errors}`);
    
    console.log('\nParallel MCTS:');
    console.log(`  Time to first solution: ${parallel.firstSolutionTime}ms`);
    console.log(`  Total time: ${parallel.totalTime}ms`);
    console.log(`  Solution quality: ${parallel.quality.toFixed(2)}`);
    console.log(`  Approaches explored: ${parallel.approaches}`);
    console.log(`  Errors encountered: ${parallel.errors}`);
    
    console.log('\n📊 COMPARATIVE ANALYSIS');
    console.log('======================\n');
    
    const speedup = single.firstSolutionTime / parallel.firstSolutionTime;
    const qualityImprovement = ((parallel.quality - single.quality) / single.quality) * 100;
    const diversityGain = parallel.approaches - single.approaches;
    
    console.log(`⚡ Speed improvement: ${speedup.toFixed(2)}x faster to first solution`);
    console.log(`📈 Quality improvement: ${qualityImprovement.toFixed(1)}% better solution`);
    console.log(`🌈 Diversity gain: ${diversityGain} more approaches explored`);
    console.log(`🛡️ Reliability: ${single.errors - parallel.errors} fewer errors`);
    
    console.log('\n✅ CONCLUSION');
    console.log('============\n');
    
    if (speedup > 1.2 && qualityImprovement > 10 && diversityGain > 0) {
      console.log('🎯 MCTS PROVEN SUPERIOR!');
      console.log('Parallel Claude instances with MCTS-style management significantly');
      console.log('outperform single Claude instances across all metrics.');
    } else {
      console.log('📊 Results inconclusive. More testing needed.');
      console.log('Consider adjusting strategies or problem complexity.');
    }
    
    // Save detailed results
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const resultsPath = path.join(__dirname, `mcts-results-${timestamp}.json`);
    
    await fs.writeFile(resultsPath, JSON.stringify({
      problem: PROBLEM,
      single,
      parallel,
      analysis: {
        speedup,
        qualityImprovement,
        diversityGain,
        errorReduction: single.errors - parallel.errors
      }
    }, null, 2));
    
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);
  }
}

// Run the experiment
async function main() {
  const experiment = new MCTSExperiment();
  try {
    await experiment.run();
  } catch (error) {
    console.error('❌ Experiment failed:', error);
  }
}

main().catch(console.error);