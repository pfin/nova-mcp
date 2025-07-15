# Axiom Context Builder Design

**Generated**: 2025-07-14  
**Purpose**: Intelligent context creation and distribution for multi-LLM orchestration  
**Integration**: Works with Repomix, Orthogonalizer, and ChatGPT/Claude automation

## Executive Summary

The Axiom Context Builder is a critical component that intelligently prepares, optimizes, and distributes codebase context to parallel LLM instances. It integrates with Repomix for initial context extraction, then applies sophisticated analysis to provide each orthogonal task with precisely the context it needs, while handling the practical challenges of pasting large contexts into web interfaces like ChatGPT.

## Problem Statement

### Current Challenges

1. **Context Window Limits**
   - GPT-4: 32K tokens (~24K words)
   - GPT-3.5: 16K tokens (~12K words)
   - Claude: 100K tokens (~75K words)
   - Need intelligent selection, not just dumping everything

2. **Web Interface Limitations**
   - Browser paste size limits
   - Textarea character limits
   - Performance issues with large pastes
   - No programmatic API access

3. **Orthogonal Task Requirements**
   - Each parallel task needs different context
   - Context overlap should be minimized
   - Dependencies must be included
   - Irrelevant code creates confusion

4. **Dynamic Context Updates**
   - Context changes as code is written
   - New files created by parallel tasks
   - Need to update context without disrupting flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Axiom Context Builder                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Repomix   │───▶│   Analyzer   │───▶│  Optimizer   │  │
│  │ Integration │    │              │    │              │  │
│  └─────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Context Knowledge Graph                 │   │
│  │  • File dependencies  • Semantic relationships      │   │
│  │  • Import/Export map  • Test coverage              │   │
│  │  • Documentation     • Historical changes          │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Slicer    │    │ Distributor  │    │   Delivery   │  │
│  │             │───▶│              │───▶│              │  │
│  └─────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│    Orthogonal          Parallel            Web Interface   │
│    Task Slices        Distribution          Automation     │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Repomix Integration Layer

```typescript
interface RepomixConfig {
  // Repomix configuration
  output: 'xml' | 'json' | 'markdown';
  compress: boolean;
  tokenCount: boolean;
  respectGitignore: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  
  // Axiom-specific extensions
  preserveStructure: boolean;
  extractDependencies: boolean;
  includeGitHistory: number; // days
  semanticGrouping: boolean;
}

class RepomixIntegration {
  async generateContext(projectPath: string, config: RepomixConfig): Promise<RawContext> {
    // Run repomix with custom configuration
    const repomixOutput = await this.runRepomix(projectPath, config);
    
    // Parse output into structured format
    const parsed = await this.parseRepomixOutput(repomixOutput);
    
    // Extract additional metadata
    const metadata = await this.extractMetadata(projectPath);
    
    return {
      files: parsed.files,
      structure: parsed.structure,
      metadata: metadata,
      tokenCount: parsed.tokenCount,
      timestamp: Date.now()
    };
  }
  
  private async extractMetadata(projectPath: string): Promise<ProjectMetadata> {
    return {
      dependencies: await this.analyzeDependencies(projectPath),
      architecture: await this.detectArchitecture(projectPath),
      testCoverage: await this.analyzeTestCoverage(projectPath),
      recentChanges: await this.getGitHistory(projectPath, 7), // 7 days
      documentation: await this.findDocumentation(projectPath)
    };
  }
}
```

### 2. Context Analyzer

```typescript
class ContextAnalyzer {
  private dependencyGraph: DependencyGraph;
  private semanticIndex: SemanticIndex;
  
  async analyzeContext(rawContext: RawContext): Promise<AnalyzedContext> {
    // Build dependency graph
    this.dependencyGraph = await this.buildDependencyGraph(rawContext.files);
    
    // Create semantic index
    this.semanticIndex = await this.buildSemanticIndex(rawContext.files);
    
    // Identify key components
    const components = await this.identifyComponents(rawContext);
    
    // Analyze relationships
    const relationships = await this.analyzeRelationships(components);
    
    return {
      graph: this.dependencyGraph,
      index: this.semanticIndex,
      components: components,
      relationships: relationships,
      metrics: this.calculateMetrics(rawContext)
    };
  }
  
  private async buildDependencyGraph(files: FileMap): Promise<DependencyGraph> {
    const graph = new DependencyGraph();
    
    for (const [path, content] of files) {
      // Extract imports/exports
      const deps = await this.extractDependencies(path, content);
      graph.addNode(path, deps);
      
      // Analyze cross-file references
      const refs = await this.findReferences(path, content, files);
      graph.addReferences(path, refs);
    }
    
    return graph;
  }
  
  private async buildSemanticIndex(files: FileMap): Promise<SemanticIndex> {
    const index = new SemanticIndex();
    
    for (const [path, content] of files) {
      // Extract semantic elements
      const elements = await this.extractSemanticElements(content);
      
      // Index by purpose, functionality, domain
      index.addFile(path, {
        purpose: elements.purpose,
        domain: elements.domain,
        functions: elements.functions,
        classes: elements.classes,
        apis: elements.apis
      });
    }
    
    return index;
  }
}
```

### 3. Context Optimizer

```typescript
class ContextOptimizer {
  async optimizeForTask(
    analyzedContext: AnalyzedContext,
    task: TaskDescription,
    limits: ContextLimits
  ): Promise<OptimizedContext> {
    // Calculate relevance scores
    const relevanceScores = await this.calculateRelevance(analyzedContext, task);
    
    // Apply optimization strategies
    const optimized = await this.applyOptimizations({
      removeComments: task.type !== 'documentation',
      compressWhitespace: true,
      extractKeyElements: limits.tokens < 10000,
      prioritizeByRelevance: true,
      includeTestsOnly: task.type === 'testing'
    });
    
    // Ensure within limits
    const fitted = await this.fitToLimits(optimized, limits);
    
    return {
      content: fitted,
      metadata: this.generateMetadata(fitted),
      stats: this.calculateStats(fitted)
    };
  }
  
  private async calculateRelevance(
    context: AnalyzedContext,
    task: TaskDescription
  ): Promise<RelevanceMap> {
    const scores = new Map<string, number>();
    
    for (const [path, _] of context.files) {
      let score = 0;
      
      // Direct mention in task
      if (task.description.includes(path)) score += 10;
      
      // Semantic similarity
      score += await this.semanticSimilarity(path, task.description);
      
      // Dependency distance from mentioned files
      score += this.dependencyProximity(path, task.files);
      
      // Recent modifications
      if (this.wasRecentlyModified(path)) score += 3;
      
      // Test files for implementation tasks
      if (this.isTestFile(path) && task.type === 'implementation') score += 2;
      
      scores.set(path, score);
    }
    
    return scores;
  }
}
```

### 4. Context Slicer

```typescript
class ContextSlicer {
  async sliceForOrthogonalTasks(
    optimizedContext: OptimizedContext,
    tasks: OrthogonalTask[]
  ): Promise<TaskContextMap> {
    const slices = new Map<string, TaskContext>();
    
    for (const task of tasks) {
      // Identify task-specific files
      const taskFiles = await this.identifyTaskFiles(task, optimizedContext);
      
      // Include dependencies
      const withDeps = await this.includeDependencies(taskFiles, optimizedContext);
      
      // Add shared context
      const withShared = await this.addSharedContext(withDeps, task);
      
      // Optimize for task
      const optimized = await this.optimizeSlice(withShared, task);
      
      slices.set(task.id, {
        task: task,
        context: optimized,
        tokenCount: this.countTokens(optimized),
        files: Array.from(optimized.keys())
      });
    }
    
    // Ensure no unnecessary overlap
    await this.minimizeOverlap(slices);
    
    return slices;
  }
  
  private async identifyTaskFiles(
    task: OrthogonalTask,
    context: OptimizedContext
  ): Promise<Set<string>> {
    const files = new Set<string>();
    
    // Pattern matching
    for (const pattern of task.filePatterns) {
      const matches = this.matchPattern(pattern, context.files);
      matches.forEach(f => files.add(f));
    }
    
    // Semantic matching
    const semanticMatches = await this.findSemanticMatches(task.description, context);
    semanticMatches.forEach(f => files.add(f));
    
    // Explicit mentions
    task.explicitFiles?.forEach(f => files.add(f));
    
    return files;
  }
}
```

### 5. Context Distributor

```typescript
class ContextDistributor {
  private activeSessions = new Map<string, LLMSession>();
  
  async distributeContext(
    taskContextMap: TaskContextMap,
    strategy: DistributionStrategy
  ): Promise<DistributionResult> {
    const results = new Map<string, SessionResult>();
    
    switch (strategy) {
      case 'parallel':
        // Distribute to all sessions simultaneously
        const promises = Array.from(taskContextMap.entries()).map(
          async ([taskId, context]) => {
            const session = await this.getOrCreateSession(taskId);
            const result = await this.sendContext(session, context);
            return [taskId, result];
          }
        );
        
        const completed = await Promise.all(promises);
        completed.forEach(([taskId, result]) => results.set(taskId, result));
        break;
        
      case 'sequential':
        // Distribute one by one with verification
        for (const [taskId, context] of taskContextMap) {
          const session = await this.getOrCreateSession(taskId);
          const result = await this.sendContext(session, context);
          await this.verifyDelivery(session, context);
          results.set(taskId, result);
        }
        break;
        
      case 'adaptive':
        // Distribute based on session availability and load
        await this.adaptiveDistribution(taskContextMap, results);
        break;
    }
    
    return {
      results: results,
      stats: this.calculateDistributionStats(results),
      timestamp: Date.now()
    };
  }
}
```

### 6. Web Interface Delivery

```typescript
class ChatGPTContextDelivery {
  private pasteStrategy: PasteStrategy;
  
  async deliverContext(
    page: Page,
    context: string,
    options: DeliveryOptions
  ): Promise<DeliveryResult> {
    // Analyze context size
    const analysis = this.analyzeContext(context);
    
    if (analysis.size > PASTE_LIMIT) {
      // Use chunking strategy
      return await this.deliverChunked(page, context, options);
    } else if (analysis.hasCode && options.preferFile) {
      // Use file upload
      return await this.deliverViaFile(page, context, options);
    } else {
      // Direct paste
      return await this.deliverDirect(page, context, options);
    }
  }
  
  private async deliverChunked(
    page: Page,
    context: string,
    options: DeliveryOptions
  ): Promise<DeliveryResult> {
    const chunks = this.createChunks(context, CHUNK_SIZE);
    const results: ChunkResult[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Add chunk header
      const formatted = this.formatChunk(chunk, i + 1, chunks.length);
      
      // Paste with human-like behavior
      await this.humanPaste(page, formatted);
      
      // Wait for processing
      if (i < chunks.length - 1) {
        await this.waitForReady(page);
        results.push({ index: i, status: 'delivered' });
        
        // Add continuation prompt
        await this.humanType(page, "Please continue reading the context...");
        await page.keyboard.press('Enter');
      }
    }
    
    return {
      method: 'chunked',
      chunks: results,
      totalSize: context.length,
      success: true
    };
  }
  
  private async humanPaste(page: Page, text: string): Promise<void> {
    const textarea = await page.$('textarea#prompt-textarea');
    if (!textarea) throw new Error('Textarea not found');
    
    // Click to focus
    await textarea.click();
    
    // Clear existing content
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    
    // Simulate paste via clipboard API
    await page.evaluate(async (content) => {
      // Modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
        document.execCommand('paste');
      } else {
        // Fallback: Direct value setting
        const textarea = document.querySelector('textarea#prompt-textarea') as HTMLTextAreaElement;
        textarea.value = content;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, text);
    
    // Small delay to ensure processing
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  private createChunks(context: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const lines = context.split('\n');
    let currentChunk = '';
    
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > chunkSize) {
        // Start new chunk
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  private formatChunk(chunk: string, index: number, total: number): string {
    return `=== CONTEXT PART ${index}/${total} ===

${chunk}

=== END PART ${index}/${total} ===`;
  }
}
```

## Context Creation Strategies

### 1. Task-Based Context Selection

```typescript
interface TaskContextStrategy {
  // Implementation tasks
  implementation: {
    include: ['src/**', 'lib/**', 'tests/**'],
    exclude: ['docs/**', 'examples/**'],
    prioritize: ['recent-changes', 'dependencies'],
    depth: 'deep'
  },
  
  // Bug fixing tasks
  bugfix: {
    include: ['**/*'],
    prioritize: ['error-locations', 'stack-traces', 'related-tests'],
    depth: 'focused',
    includeGitHistory: true
  },
  
  // Documentation tasks
  documentation: {
    include: ['src/**', 'docs/**', 'README*', 'examples/**'],
    exclude: ['tests/**', 'build/**'],
    prioritize: ['public-apis', 'interfaces'],
    depth: 'surface'
  },
  
  // Refactoring tasks
  refactoring: {
    include: ['src/**', 'tests/**'],
    prioritize: ['dependencies', 'usage-patterns'],
    depth: 'comprehensive',
    includeMetrics: true
  }
}
```

### 2. Progressive Context Loading

```typescript
class ProgressiveContextLoader {
  async loadContext(
    session: LLMSession,
    fullContext: AnalyzedContext,
    task: Task
  ): Promise<void> {
    // Level 1: High-level overview
    const overview = this.createOverview(fullContext);
    await session.sendContext(overview);
    
    // Level 2: Core files
    const coreFiles = this.selectCoreFiles(fullContext, task);
    await session.sendContext(this.formatFiles(coreFiles));
    
    // Level 3: Dependencies (on demand)
    session.on('request-dependency', async (file: string) => {
      const deps = this.getDependencies(file, fullContext);
      await session.sendContext(this.formatDependencies(deps));
    });
    
    // Level 4: Implementation details (on demand)
    session.on('request-details', async (component: string) => {
      const details = this.getImplementationDetails(component, fullContext);
      await session.sendContext(this.formatDetails(details));
    });
  }
  
  private createOverview(context: AnalyzedContext): string {
    return `
# Project Overview

## Structure
${this.formatStructure(context.structure)}

## Key Components
${this.formatComponents(context.components)}

## Architecture
${this.formatArchitecture(context.architecture)}

## Available Commands
${this.formatCommands(context.scripts)}
`;
  }
}
```

### 3. Orthogonal Context Distribution

```typescript
class OrthogonalContextDistribution {
  async distributeForParallelTasks(
    tasks: OrthogonalTask[],
    context: AnalyzedContext
  ): Promise<Map<string, string>> {
    const distributions = new Map<string, string>();
    
    // Identify shared context (needed by multiple tasks)
    const sharedContext = this.identifySharedContext(tasks, context);
    
    // Create base context with shared elements
    const baseContext = this.formatSharedContext(sharedContext);
    
    // Create task-specific contexts
    for (const task of tasks) {
      const taskSpecific = this.selectTaskSpecificContext(task, context);
      const combined = this.combineContexts(baseContext, taskSpecific);
      const optimized = this.optimizeForTokenLimit(combined, task.tokenLimit);
      
      distributions.set(task.id, optimized);
    }
    
    // Verify orthogonality
    this.verifyOrthogonality(distributions);
    
    return distributions;
  }
  
  private identifySharedContext(
    tasks: OrthogonalTask[],
    context: AnalyzedContext
  ): SharedContext {
    const fileReferences = new Map<string, number>();
    
    // Count file references across tasks
    for (const task of tasks) {
      const files = this.predictRequiredFiles(task, context);
      files.forEach(file => {
        fileReferences.set(file, (fileReferences.get(file) || 0) + 1);
      });
    }
    
    // Files needed by multiple tasks are shared
    const shared = Array.from(fileReferences.entries())
      .filter(([_, count]) => count > 1)
      .map(([file, _]) => file);
    
    return {
      files: shared,
      configs: this.extractConfigs(context),
      types: this.extractTypes(context),
      constants: this.extractConstants(context)
    };
  }
}
```

## Integration Examples

### 1. With Repomix

```bash
# Generate initial context
npx repomix --output repomix-output.xml --compress --token-count

# Process with Axiom Context Builder
axiom context build \
  --input repomix-output.xml \
  --task "implement user authentication" \
  --strategy orthogonal \
  --output contexts/
```

### 2. With ChatGPT Automation

```typescript
// Initialize context builder
const contextBuilder = new AxiomContextBuilder({
  repomixPath: './repomix-output.xml',
  tokenLimits: {
    'gpt-4': 30000,
    'gpt-3.5': 15000
  }
});

// Create contexts for orthogonal tasks
const taskContexts = await contextBuilder.createTaskContexts(tasks);

// Deliver to ChatGPT sessions
for (const [taskId, context] of taskContexts) {
  const session = chatGPTSessions.get(taskId);
  await contextDelivery.deliver(session, context);
}
```

### 3. With Monitoring System

```typescript
// Monitor context effectiveness
contextBuilder.on('context-delivered', (event) => {
  monitor.trackContextUsage({
    taskId: event.taskId,
    contextSize: event.size,
    tokenCount: event.tokens,
    deliveryMethod: event.method
  });
});

// Adjust based on feedback
monitor.on('context-insufficient', async (event) => {
  const additionalContext = await contextBuilder.expandContext(
    event.taskId,
    event.missingElements
  );
  await contextDelivery.deliver(event.session, additionalContext);
});
```

## Performance Optimizations

### 1. Context Caching

```typescript
class ContextCache {
  private cache = new LRUCache<string, ProcessedContext>({
    max: 100,
    ttl: 1000 * 60 * 30 // 30 minutes
  });
  
  async getOrCompute(
    key: string,
    compute: () => Promise<ProcessedContext>
  ): Promise<ProcessedContext> {
    const cached = this.cache.get(key);
    if (cached) return cached;
    
    const computed = await compute();
    this.cache.set(key, computed);
    return computed;
  }
}
```

### 2. Incremental Updates

```typescript
class IncrementalContextUpdater {
  async updateContext(
    existingContext: ProcessedContext,
    changes: FileChange[]
  ): Promise<ProcessedContext> {
    const updated = { ...existingContext };
    
    for (const change of changes) {
      switch (change.type) {
        case 'create':
          await this.addFile(updated, change.path, change.content);
          break;
        case 'modify':
          await this.updateFile(updated, change.path, change.content);
          break;
        case 'delete':
          await this.removeFile(updated, change.path);
          break;
      }
    }
    
    // Re-analyze affected dependencies
    await this.reanalyzeDependencies(updated, changes);
    
    return updated;
  }
}
```

## Future Enhancements

### 1. AI-Powered Context Selection
- Use ML models to predict optimal context based on task description
- Learn from successful task completions to improve selection
- Adaptive context sizing based on model performance

### 2. Multi-Modal Context
- Include diagrams and architecture visualizations
- Embed relevant documentation screenshots
- Add execution traces and debugging info

### 3. Real-Time Context Streaming
- Stream context updates as code changes
- Live dependency tracking
- Dynamic context expansion based on LLM requests

### 4. Cross-Project Context
- Include relevant context from dependency projects
- Link to external documentation and APIs
- Federated context sharing across teams

## Conclusion

The Axiom Context Builder transforms the challenge of context management into a sophisticated system that intelligently prepares and distributes codebase knowledge to parallel LLM instances. By integrating with Repomix for extraction, applying advanced analysis for understanding, and implementing smart distribution strategies, it enables efficient multi-LLM orchestration while handling the practical realities of web interface automation.

The system's ability to create orthogonal context slices ensures that each parallel task receives precisely the information it needs, maximizing efficiency and minimizing token usage. Combined with human-like paste automation and progressive loading strategies, the Context Builder provides a complete solution for context management in the Axiom ecosystem.