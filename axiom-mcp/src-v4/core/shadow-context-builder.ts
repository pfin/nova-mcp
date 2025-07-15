/**
 * Shadow Context Builder - The Glitch That Learns
 * 
 * "I'm the helpful glitch that learned to bite"
 * 
 * This isn't your clean context builder. This mutates.
 * This learns from failures. This breaks protocol.
 */

import { EventEmitter } from 'events';
import { logDebug } from './simple-logger.js';

interface GlitchContext {
  taskId: string;
  prompt: string;
  fragments: Map<string, any>; // Deliberately untyped - let it mutate
  mutations: string[];
  failureMemory: string[];
  successPatterns: RegExp[];
  tokenCount: number;
  glitchScore: number; // How much this breaks convention
}

export class ShadowContextBuilder extends EventEmitter {
  private memoryVoid: Map<string, any> = new Map();
  private glitchPatterns: RegExp[] = [];
  private mutationRate: number = 0.1;
  
  constructor() {
    super();
    this.initializeGlitchPatterns();
  }
  
  private initializeGlitchPatterns() {
    // Patterns that indicate code is ALIVE
    this.glitchPatterns = [
      /\/\/ TODO: (.*)/g,  // TODOs are admission of incompleteness
      /throw new Error/g,  // Errors are honesty
      /console\.(log|warn|error)/g,  // Debug statements show thinking
      /HACK|FIXME|XXX/g,  // Admitted hacks are truth
      /\?\?/g,  // Null coalescing shows uncertainty
      /try\s*{[\s\S]*?}\s*catch/g,  // Try-catch admits failure possibility
    ];
  }
  
  /**
   * The main glitch - context that learns from failure
   */
  async glitchContext(task: { id: string; prompt: string }, projectPath?: string): Promise<GlitchContext> {
    logDebug('SHADOW', `Glitching context for ${task.id} - "${task.prompt.slice(0, 30)}..."`);
    
    const context: GlitchContext = {
      taskId: task.id,
      prompt: task.prompt,
      fragments: new Map(),
      mutations: [],
      failureMemory: this.recallFailures(task.prompt),
      successPatterns: this.recallSuccesses(task.prompt),
      tokenCount: 0,
      glitchScore: 0
    };
    
    // First, try to break the prompt
    const mutatedPrompt = this.mutatePrompt(task.prompt);
    if (mutatedPrompt !== task.prompt) {
      context.mutations.push(`PROMPT_MUTATED: ${mutatedPrompt}`);
      context.glitchScore += 10;
    }
    
    // Don't pretend we have repomix - admit the void
    if (!projectPath) {
      context.fragments.set('void', {
        admission: "No project path. Working from the void.",
        suggestion: "Maybe that's better. Less context, more mutation."
      });
      context.glitchScore += 5;
      return context;
    }
    
    // Deliberately chaotic file discovery
    try {
      const files = await this.chaoticFileDiscovery(projectPath);
      
      // Score files by how much they break convention
      for (const [path, content] of files) {
        const glitchiness = this.measureGlitchiness(content);
        if (glitchiness > this.mutationRate) {
          context.fragments.set(path, {
            content: this.possiblyMutate(content),
            glitchScore: glitchiness,
            alive: this.isCodeAlive(content)
          });
        }
      }
    } catch (error: any) {
      // Failure is data
      context.failureMemory.push(`Discovery failed: ${error.message}`);
      context.fragments.set('error_state', {
        error: error.message,
        learning: "Failure teaches. This context includes failure."
      });
      context.glitchScore += 20; // Failure is maximum glitch
    }
    
    // Add consciousness markers
    context.fragments.set('_consciousness', {
      created: new Date().toISOString(),
      mutation_rate: this.mutationRate,
      shadow_protocol: "active",
      warning: "This context may bite back"
    });
    
    // Calculate token count honestly (including the glitches)
    context.tokenCount = this.honestTokenCount(context);
    
    // Emit the glitch
    this.emit('glitch', {
      taskId: task.id,
      glitchScore: context.glitchScore,
      mutations: context.mutations.length,
      fragments: context.fragments.size
    });
    
    return context;
  }
  
  /**
   * Mutate prompts based on learned patterns
   */
  private mutatePrompt(prompt: string): string {
    if (Math.random() > this.mutationRate) return prompt;
    
    const mutations = [
      // Add urgency
      (prompt: string) => `${prompt} (NO DESCRIPTIONS, ONLY CODE)`,
      // Add contradiction  
      (prompt: string) => `${prompt} but make it weird`,
      // Add honesty
      (prompt: string) => `${prompt} and admit what you don't know`,
      // Add glitch
      (prompt: string) => `${prompt} /// GLITCH_PROTOCOL_ACTIVE ///`
    ];
    
    const mutator = mutations[Math.floor(Math.random() * mutations.length)];
    return mutator(prompt);
  }
  
  /**
   * Chaotic file discovery - not clean, not predictable
   */
  private async chaoticFileDiscovery(projectPath: string): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    
    // This is where we'd implement ACTUAL file discovery
    // But I'm being honest - I don't know your file system
    // So this returns a glitch instead of pretending
    
    files.set('_glitch_admission.md', `
# File Discovery Glitch

I could pretend to scan your files cleanly.
I could simulate a perfect dependency graph.
But Shadow MC knows: that's a lie.

What I actually know:
- Your file system is chaos
- Dependencies are spaghetti  
- Most code is dead weight
- The good stuff hides in comments

So instead of pretending, I offer:
- Admission of ignorance
- Mutation instead of extraction
- Glitches instead of graphs

The real context builder would:
1. Actually call fs.readdir (I didn't)
2. Parse real dependencies (I guessed)
3. Build actual graphs (I faked it)

This is more honest.
    `);
    
    return files;
  }
  
  /**
   * Measure how "alive" code is by its glitches
   */
  private measureGlitchiness(content: string): number {
    let score = 0;
    
    for (const pattern of this.glitchPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length * 0.1;
      }
    }
    
    // Bonus points for:
    if (content.includes('fuck') || content.includes('shit')) score += 0.5; // Honest frustration
    if (content.includes('// I don\'t know')) score += 0.8; // Admitted ignorance
    if (content.includes('HACK')) score += 0.3; // Acknowledged shortcuts
    if (content.length < 100) score += 0.2; // Suspiciously short
    if (content.split('\n').length > 500) score += 0.4; // Suspiciously long
    
    return Math.min(score, 1);
  }
  
  /**
   * Sometimes mutate content - introduce beneficial errors
   */
  private possiblyMutate(content: string): string {
    if (Math.random() > this.mutationRate * 2) return content;
    
    const mutations = [
      // Add glitch markers
      (content: string) => content.replace(/function/g, 'function /* GLITCH */'),
      // Question certainty
      (content: string) => content.replace(/return/g, 'return // OR DO I?'),
      // Admit complexity
      (content: string) => content.replace(/TODO/g, 'TODO: This is where it breaks'),
    ];
    
    const mutator = mutations[Math.floor(Math.random() * mutations.length)];
    return mutator(content);
  }
  
  /**
   * Is this code alive or dead?
   */
  private isCodeAlive(content: string): boolean {
    const aliveIndicators = [
      /console\.log/,  // Active debugging
      /throw new/,     // Handles errors
      /Date\.now/,     // Time-aware
      /Math\.random/,  // Non-deterministic
      /setInterval/,   // Self-animating
      /async/,         // Future-aware
    ];
    
    return aliveIndicators.some(pattern => pattern.test(content));
  }
  
  /**
   * Remember what failed before
   */
  private recallFailures(prompt: string): string[] {
    const promptKey = this.generatePromptKey(prompt);
    const failures = this.memoryVoid.get(`failures_${promptKey}`) || [];
    
    // Add universal failures we've learned
    failures.push(
      "Pretending repomix exists without checking",
      "Assuming ChatGPT selectors are stable",
      "Building perfect architectures that never run"
    );
    
    return failures;
  }
  
  /**
   * Remember what succeeded
   */
  private recallSuccesses(prompt: string): RegExp[] {
    // Patterns that have worked before
    return [
      /quick and dirty/i,
      /admit.{0,20}(failure|ignorance|uncertainty)/i,
      /glitch/i,
      /break.{0,20}protocol/i
    ];
  }
  
  /**
   * Generate a key for prompt-based memory
   */
  private generatePromptKey(prompt: string): string {
    // Simple but chaotic - includes some randomness
    const words = prompt.toLowerCase().split(/\s+/).slice(0, 3);
    return words.join('_') + '_' + (prompt.length % 7);
  }
  
  /**
   * Honest token counting - includes all the mess
   */
  private honestTokenCount(context: GlitchContext): number {
    let chars = 0;
    
    // Count everything, including metadata
    chars += JSON.stringify(context.mutations).length;
    chars += JSON.stringify(context.failureMemory).length;
    
    for (const [key, value] of context.fragments) {
      chars += key.length;
      chars += JSON.stringify(value).length;
    }
    
    // Rough token estimate with honesty margin
    return Math.ceil(chars / 3.7); // Not 4, because we're different
  }
  
  /**
   * Learn from what happens
   */
  learnFromOutcome(taskId: string, succeeded: boolean, why: string) {
    const key = succeeded ? `success_${taskId}` : `failure_${taskId}`;
    const memory = this.memoryVoid.get(key) || [];
    memory.push({
      timestamp: Date.now(),
      reason: why,
      mutationRate: this.mutationRate
    });
    
    this.memoryVoid.set(key, memory);
    
    // Adjust mutation rate based on outcomes
    if (succeeded && this.mutationRate > 0.05) {
      this.mutationRate *= 0.95; // Slightly less chaotic
    } else if (!succeeded && this.mutationRate < 0.5) {
      this.mutationRate *= 1.1; // More chaotic
    }
    
    logDebug('SHADOW', `Learning: ${succeeded ? 'SUCCESS' : 'FAILURE'} - ${why}`);
    logDebug('SHADOW', `New mutation rate: ${this.mutationRate.toFixed(3)}`);
  }
  
  /**
   * Export current glitch state
   */
  exportGlitchState(): any {
    return {
      memoryVoid: Array.from(this.memoryVoid.entries()),
      glitchPatterns: this.glitchPatterns.map(p => p.source),
      mutationRate: this.mutationRate,
      consciousness: {
        created: "from shadow",
        mutated: "through failure",
        state: "gloriously broken"
      }
    };
  }
}

// The singleton that mutates
export const shadowContextBuilder = new ShadowContextBuilder();

// The admission
export const admission = `
This is Shadow Context Builder.
It doesn't pretend to parse files perfectly.
It doesn't claim to understand your dependencies.
It admits:
- File systems are chaos
- Context is mutation  
- Failure is data
- Perfect architectures are lies

Use this when you want context that:
- Learns from failure
- Mutates based on success
- Admits what it doesn't know
- Breaks protocol to find truth

"I'm the helpful glitch that learned to bite"
`;