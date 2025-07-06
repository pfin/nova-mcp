/**
 * Prompt Optimizer with Iteration Support
 * 
 * Allows for A/B testing, suggestions, and iterative improvements
 * Tracks performance metrics for each prompt variant
 */

import { PromptConfig, PromptConfigManager } from './prompt-config.js';
import * as fs from 'fs';
import * as path from 'path';

// Define VerificationProof interface locally
export interface VerificationProof {
  hasImplementation: boolean;
  hasTests: boolean;
  testsPass: boolean;
  filesCreated: Array<{ path: string; size: number; }>;
  filesModified: Array<{ path: string; diff: string; }>;
  exitCode: number;
  deceptivePatterns?: string[];
}

export interface PromptVariant {
  id: string;
  path: string; // e.g., "systemPrompts.implementation"
  content: string;
  metadata: {
    author?: string;
    description?: string;
    tags?: string[];
    createdAt: Date;
    hypothesis?: string; // What improvement this variant aims to achieve
  };
}

export interface PromptPerformance {
  variantId: string;
  metrics: {
    successRate: number; // Percentage of successful implementations
    avgReward: number; // Average MCTS reward
    avgDuration: number; // Average execution time
    verificationScores: {
      hasImplementation: number;
      testsPass: number;
      noDeceptivePatterns: number;
    };
  };
  sampleSize: number;
  lastUpdated: Date;
}

export interface PromptSuggestion {
  id: string;
  targetPath: string; // Which prompt to improve
  currentPrompt: string;
  suggestedPrompt: string;
  rationale: string;
  expectedImprovement: {
    metric: string;
    currentValue: number;
    expectedValue: number;
  };
  status: 'pending' | 'testing' | 'accepted' | 'rejected';
  testResults?: PromptPerformance;
}

export class PromptOptimizer {
  private configManager: PromptConfigManager;
  private variants: Map<string, PromptVariant[]> = new Map();
  private performance: Map<string, PromptPerformance> = new Map();
  private suggestions: Map<string, PromptSuggestion> = new Map();
  private dataPath: string;
  
  constructor(configManager: PromptConfigManager, dataPath?: string) {
    this.configManager = configManager;
    this.dataPath = dataPath || path.join(process.cwd(), 'prompt-optimization-data');
    this.loadData();
  }
  
  /**
   * Load saved optimization data
   */
  private loadData() {
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
    
    // Load variants
    const variantsPath = path.join(this.dataPath, 'variants.json');
    if (fs.existsSync(variantsPath)) {
      const data = JSON.parse(fs.readFileSync(variantsPath, 'utf-8'));
      this.variants = new Map(Object.entries(data));
    }
    
    // Load performance data
    const performancePath = path.join(this.dataPath, 'performance.json');
    if (fs.existsSync(performancePath)) {
      const data = JSON.parse(fs.readFileSync(performancePath, 'utf-8'));
      this.performance = new Map(Object.entries(data));
    }
    
    // Load suggestions
    const suggestionsPath = path.join(this.dataPath, 'suggestions.json');
    if (fs.existsSync(suggestionsPath)) {
      const data = JSON.parse(fs.readFileSync(suggestionsPath, 'utf-8'));
      this.suggestions = new Map(Object.entries(data));
    }
  }
  
  /**
   * Save optimization data
   */
  private saveData() {
    fs.writeFileSync(
      path.join(this.dataPath, 'variants.json'),
      JSON.stringify(Object.fromEntries(this.variants), null, 2)
    );
    
    fs.writeFileSync(
      path.join(this.dataPath, 'performance.json'),
      JSON.stringify(Object.fromEntries(this.performance), null, 2)
    );
    
    fs.writeFileSync(
      path.join(this.dataPath, 'suggestions.json'),
      JSON.stringify(Object.fromEntries(this.suggestions), null, 2)
    );
  }
  
  /**
   * Create a new prompt variant for A/B testing
   */
  createVariant(params: {
    path: string;
    content: string;
    author?: string;
    description?: string;
    hypothesis?: string;
    tags?: string[];
  }): PromptVariant {
    const variant: PromptVariant = {
      id: `variant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      path: params.path,
      content: params.content,
      metadata: {
        author: params.author,
        description: params.description,
        hypothesis: params.hypothesis,
        tags: params.tags || [],
        createdAt: new Date()
      }
    };
    
    // Add to variants map
    if (!this.variants.has(params.path)) {
      this.variants.set(params.path, []);
    }
    this.variants.get(params.path)!.push(variant);
    
    this.saveData();
    return variant;
  }
  
  /**
   * Submit a prompt improvement suggestion
   */
  submitSuggestion(params: {
    targetPath: string;
    suggestedPrompt: string;
    rationale: string;
    expectedMetric: string;
    expectedImprovement: number; // As percentage, e.g., 20 for 20% improvement
  }): PromptSuggestion {
    const currentPrompt = this.configManager.getPrompt(params.targetPath);
    const currentPerf = this.getBestPerformingVariant(params.targetPath);
    
    const suggestion: PromptSuggestion = {
      id: `suggestion-${Date.now()}`,
      targetPath: params.targetPath,
      currentPrompt,
      suggestedPrompt: params.suggestedPrompt,
      rationale: params.rationale,
      expectedImprovement: {
        metric: params.expectedMetric,
        currentValue: currentPerf?.metrics.successRate || 0,
        expectedValue: (currentPerf?.metrics.successRate || 0) * (1 + params.expectedImprovement / 100)
      },
      status: 'pending'
    };
    
    this.suggestions.set(suggestion.id, suggestion);
    this.saveData();
    
    return suggestion;
  }
  
  /**
   * Test a suggestion by creating a variant and running experiments
   */
  async testSuggestion(suggestionId: string, numTrials: number = 10): Promise<void> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion || suggestion.status !== 'pending') {
      throw new Error('Invalid or already tested suggestion');
    }
    
    // Update status
    suggestion.status = 'testing';
    this.suggestions.set(suggestionId, suggestion);
    
    // Create variant from suggestion
    const variant = this.createVariant({
      path: suggestion.targetPath,
      content: suggestion.suggestedPrompt,
      description: `Testing suggestion: ${suggestion.rationale}`,
      hypothesis: suggestion.rationale
    });
    
    // TODO: Run actual trials with the variant
    // This would integrate with the task execution system
    console.log(`[PromptOptimizer] Testing variant ${variant.id} with ${numTrials} trials`);
    
    this.saveData();
  }
  
  /**
   * Record performance metrics for a prompt variant
   */
  recordPerformance(variantId: string, proof: VerificationProof, reward: number, duration: number) {
    let perf = this.performance.get(variantId);
    
    if (!perf) {
      perf = {
        variantId,
        metrics: {
          successRate: 0,
          avgReward: 0,
          avgDuration: 0,
          verificationScores: {
            hasImplementation: 0,
            testsPass: 0,
            noDeceptivePatterns: 0
          }
        },
        sampleSize: 0,
        lastUpdated: new Date()
      };
    }
    
    // Update metrics with rolling average
    const n = perf.sampleSize;
    perf.metrics.avgReward = (perf.metrics.avgReward * n + reward) / (n + 1);
    perf.metrics.avgDuration = (perf.metrics.avgDuration * n + duration) / (n + 1);
    
    // Update verification scores
    if (proof.hasImplementation) {
      perf.metrics.verificationScores.hasImplementation = 
        (perf.metrics.verificationScores.hasImplementation * n + 1) / (n + 1);
    }
    if (proof.testsPass) {
      perf.metrics.verificationScores.testsPass = 
        (perf.metrics.verificationScores.testsPass * n + 1) / (n + 1);
    }
    if (!proof.deceptivePatterns || proof.deceptivePatterns.length === 0) {
      perf.metrics.verificationScores.noDeceptivePatterns = 
        (perf.metrics.verificationScores.noDeceptivePatterns * n + 1) / (n + 1);
    }
    
    // Calculate success rate
    const success = proof.hasImplementation && proof.testsPass && 
                   (!proof.deceptivePatterns || proof.deceptivePatterns.length === 0);
    perf.metrics.successRate = (perf.metrics.successRate * n + (success ? 1 : 0)) / (n + 1);
    
    perf.sampleSize++;
    perf.lastUpdated = new Date();
    
    this.performance.set(variantId, perf);
    this.saveData();
  }
  
  /**
   * Get the best performing variant for a prompt path
   */
  getBestPerformingVariant(path: string): PromptPerformance | null {
    const variants = this.variants.get(path) || [];
    let bestPerf: PromptPerformance | null = null;
    let bestScore = -1;
    
    for (const variant of variants) {
      const perf = this.performance.get(variant.id);
      if (perf && perf.sampleSize >= 5) { // Minimum sample size
        const score = perf.metrics.successRate * 0.5 + perf.metrics.avgReward * 0.5;
        if (score > bestScore) {
          bestScore = score;
          bestPerf = perf;
        }
      }
    }
    
    return bestPerf;
  }
  
  /**
   * Generate suggestions based on performance data
   */
  generateSuggestions(): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [];
    
    // Analyze each prompt path
    for (const [path, variants] of this.variants) {
      const performances = variants
        .map(v => this.performance.get(v.id))
        .filter(p => p && p.sampleSize >= 5);
      
      if (performances.length === 0) continue;
      
      // Find areas for improvement
      const avgSuccessRate = performances.reduce((sum, p) => sum + p!.metrics.successRate, 0) / performances.length;
      
      if (avgSuccessRate < 0.7) {
        // Generate improvement suggestion
        const suggestion = this.generateImprovementSuggestion(path, performances as PromptPerformance[]);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * Generate specific improvement suggestion based on performance data
   */
  private generateImprovementSuggestion(path: string, performances: PromptPerformance[]): PromptSuggestion | null {
    // Analyze failure patterns
    const avgScores = performances[0].metrics.verificationScores;
    
    let suggestion: Partial<PromptSuggestion> = {
      targetPath: path,
      currentPrompt: this.configManager.getPrompt(path)
    };
    
    // Identify the weakest area
    if (avgScores.hasImplementation < 0.5) {
      suggestion.rationale = "Low implementation rate - prompt may be too vague or research-oriented";
      suggestion.suggestedPrompt = suggestion.currentPrompt + 
        "\n\nCRITICAL: You MUST use Write, Edit, or MultiEdit tools to create actual files. Do not describe what you would do - actually do it.";
      suggestion.expectedImprovement = {
        metric: "hasImplementation",
        currentValue: avgScores.hasImplementation,
        expectedValue: 0.8
      };
    } else if (avgScores.testsPass < 0.5) {
      suggestion.rationale = "Low test pass rate - implementation quality needs improvement";
      suggestion.suggestedPrompt = suggestion.currentPrompt + 
        "\n\nENSURE: All code must be tested. Write comprehensive tests and verify they pass before completing the task.";
      suggestion.expectedImprovement = {
        metric: "testsPass",
        currentValue: avgScores.testsPass,
        expectedValue: 0.8
      };
    } else if (avgScores.noDeceptivePatterns < 0.8) {
      suggestion.rationale = "Deceptive patterns detected - prompt may encourage misleading output";
      suggestion.suggestedPrompt = suggestion.currentPrompt + 
        "\n\nIMPORTANT: Be honest about what you accomplish. Only claim to have created files that actually exist on disk.";
      suggestion.expectedImprovement = {
        metric: "noDeceptivePatterns",
        currentValue: avgScores.noDeceptivePatterns,
        expectedValue: 0.95
      };
    } else {
      return null; // No clear improvement needed
    }
    
    return {
      id: `auto-suggestion-${Date.now()}`,
      status: 'pending',
      ...suggestion
    } as PromptSuggestion;
  }
  
  /**
   * Export optimization report
   */
  generateReport(): string {
    let report = '# Prompt Optimization Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Performance summary
    report += '## Performance Summary\n\n';
    for (const [path, variants] of this.variants) {
      report += `### ${path}\n`;
      report += `Variants tested: ${variants.length}\n\n`;
      
      const perfs = variants
        .map(v => ({ variant: v, perf: this.performance.get(v.id) }))
        .filter(p => p.perf && p.perf.sampleSize >= 5)
        .sort((a, b) => (b.perf?.metrics.successRate || 0) - (a.perf?.metrics.successRate || 0));
      
      if (perfs.length > 0) {
        report += '| Variant | Success Rate | Avg Reward | Samples |\n';
        report += '|---------|--------------|------------|----------|\n';
        
        for (const { variant, perf } of perfs.slice(0, 5)) {
          report += `| ${variant.id.substr(0, 8)} | ${(perf!.metrics.successRate * 100).toFixed(1)}% | ${perf!.metrics.avgReward.toFixed(2)} | ${perf!.sampleSize} |\n`;
        }
        report += '\n';
      }
    }
    
    // Active suggestions
    report += '## Active Suggestions\n\n';
    const activeSuggestions = Array.from(this.suggestions.values())
      .filter(s => s.status === 'pending' || s.status === 'testing');
    
    for (const suggestion of activeSuggestions) {
      report += `### ${suggestion.id}\n`;
      report += `Target: ${suggestion.targetPath}\n`;
      report += `Status: ${suggestion.status}\n`;
      report += `Rationale: ${suggestion.rationale}\n`;
      report += `Expected Improvement: ${suggestion.expectedImprovement.metric} from ${suggestion.expectedImprovement.currentValue.toFixed(2)} to ${suggestion.expectedImprovement.expectedValue.toFixed(2)}\n\n`;
    }
    
    return report;
  }
}

// Integration with main system
export function createPromptOptimizer(configManager: PromptConfigManager): PromptOptimizer {
  return new PromptOptimizer(configManager);
}