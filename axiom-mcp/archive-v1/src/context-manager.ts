import { v4 as uuidv4 } from 'uuid';

export interface Context {
  id: string;
  parentId?: string;
  goal: string;
  depth: number;
  findings: string[];
  subGoals: string[];
  status: 'pending' | 'exploring' | 'complete';
  createdAt: Date;
  completedAt?: Date;
}

export class ContextManager {
  private contexts: Map<string, Context> = new Map();

  createContext(goal: string, parentId?: string): Context {
    const parent = parentId ? this.contexts.get(parentId) : null;
    const depth = parent ? parent.depth + 1 : 0;

    const context: Context = {
      id: `ctx_${uuidv4()}`,
      parentId,
      goal,
      depth,
      findings: [],
      subGoals: [],
      status: 'pending',
      createdAt: new Date(),
    };

    this.contexts.set(context.id, context);
    console.error(`[ContextManager] Created context ${context.id} at depth ${depth}`);
    return context;
  }

  updateContext(id: string, updates: Partial<Context>): void {
    const context = this.contexts.get(id);
    if (!context) {
      throw new Error(`Context ${id} not found`);
    }

    Object.assign(context, updates);
    
    if (updates.status === 'complete' && !context.completedAt) {
      context.completedAt = new Date();
    }

    console.error(`[ContextManager] Updated context ${id}: ${updates.status || 'findings added'}`);
  }

  getContext(id: string): Context | undefined {
    return this.contexts.get(id);
  }

  getChildContexts(parentId: string): Context[] {
    return Array.from(this.contexts.values())
      .filter(ctx => ctx.parentId === parentId);
  }

  getAllContexts(): Context[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Build a tree structure from contexts
   */
  getContextTree(rootId?: string): any {
    const contexts = this.getAllContexts();
    const rootContexts = rootId 
      ? contexts.filter(c => c.id === rootId)
      : contexts.filter(c => !c.parentId);

    const buildTree = (context: Context): any => ({
      id: context.id,
      goal: context.goal,
      status: context.status,
      depth: context.depth,
      findingsCount: context.findings.length,
      children: this.getChildContexts(context.id).map(buildTree),
    });

    return rootContexts.map(buildTree);
  }

  /**
   * Merge findings from multiple contexts
   */
  mergeContexts(contextIds: string[]): string {
    const contexts = contextIds
      .map(id => this.contexts.get(id))
      .filter(ctx => ctx !== undefined) as Context[];

    if (contexts.length === 0) {
      return 'No contexts found to merge';
    }

    let merged = `# Merged Research Findings\n\n`;
    
    // Group by depth for hierarchical presentation
    const byDepth = contexts.reduce((acc, ctx) => {
      if (!acc[ctx.depth]) acc[ctx.depth] = [];
      acc[ctx.depth].push(ctx);
      return acc;
    }, {} as Record<number, Context[]>);

    // Present findings hierarchically
    Object.keys(byDepth)
      .sort((a, b) => Number(a) - Number(b))
      .forEach(depth => {
        merged += `## Level ${depth} Findings\n\n`;
        byDepth[Number(depth)].forEach(ctx => {
          merged += `### ${ctx.goal}\n`;
          merged += `Status: ${ctx.status}\n`;
          merged += `Findings:\n`;
          ctx.findings.forEach(f => {
            merged += `- ${f.substring(0, 200)}${f.length > 200 ? '...' : ''}\n`;
          });
          merged += '\n';
        });
      });

    return merged;
  }

  /**
   * Get execution plan for incomplete contexts
   */
  getExecutionPlan(): string[] {
    const pending = Array.from(this.contexts.values())
      .filter(ctx => ctx.status === 'pending')
      .sort((a, b) => a.depth - b.depth); // Breadth-first

    return pending.map(ctx => 
      `axiom_mcp_chain({ goal: "${ctx.goal}", parentContext: "${ctx.parentId || 'root'}" })`
    );
  }

  /**
   * Export contexts for persistence
   */
  exportContexts(): string {
    return JSON.stringify(
      Array.from(this.contexts.entries()),
      null,
      2
    );
  }

  /**
   * Import contexts from export
   */
  importContexts(data: string): void {
    try {
      const entries = JSON.parse(data) as [string, Context][];
      this.contexts = new Map(entries);
      console.error(`[ContextManager] Imported ${entries.length} contexts`);
    } catch (error) {
      console.error('[ContextManager] Failed to import contexts:', error);
    }
  }
}