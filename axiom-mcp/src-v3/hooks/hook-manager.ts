/**
 * HookManager - Native TypeScript hook system for Axiom MCP v3
 * 
 * Bridges the gap between external shell scripts and internal runtime,
 * providing hooks with full access to the TypeScript environment.
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConversationDB } from '../database/conversation-db.js';
import { EventBus } from '../core/event-bus.js';
import { StatusManager } from '../managers/status-manager.js';

export enum HookEvent {
  // Tool lifecycle
  PRE_TOOL_USE = 'pre_tool_use',
  POST_TOOL_USE = 'post_tool_use',
  
  // Execution lifecycle
  PRE_SPAWN = 'pre_spawn',
  POST_SPAWN = 'post_spawn',
  
  // Stream processing
  STREAM_DATA = 'stream_data',
  PATTERN_DETECTED = 'pattern_detected',
  
  // Intervention
  PRE_INTERVENTION = 'pre_intervention',
  POST_INTERVENTION = 'post_intervention',
  
  // Verification
  PRE_VERIFY = 'pre_verify',
  POST_VERIFY = 'post_verify',
  
  // Session
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
}

export interface HookContext {
  event: HookEvent;
  tool?: string;
  args?: any;
  result?: any;
  stream?: string;
  pattern?: string;
  taskId?: string;
  db: ConversationDB;
  eventBus: EventBus;
  statusManager: StatusManager;
  metadata?: Record<string, any>;
}

export interface HookResult {
  continue: boolean;
  block?: boolean;
  reason?: string;
  modifiedArgs?: any;
  modifiedResult?: any;
  intervention?: {
    type: string;
    command: string;
  };
  logEvent?: boolean;
}

export interface Hook {
  name: string;
  event: HookEvent;
  priority?: number;
  enabled?: boolean;
  type: 'native' | 'shell';
  handler?: (context: HookContext) => Promise<HookResult>;
  command?: string; // For shell hooks
}

export class HookManager extends EventEmitter {
  private hooks: Map<HookEvent, Hook[]> = new Map();
  private nativeHooks: Map<string, Hook> = new Map();
  private db: ConversationDB;
  private eventBus: EventBus;
  private statusManager: StatusManager;
  private hooksDir: string;
  
  constructor(options: {
    db: ConversationDB;
    eventBus: EventBus;
    statusManager: StatusManager;
    hooksDir?: string;
  }) {
    super();
    this.db = options.db;
    this.eventBus = options.eventBus;
    this.statusManager = options.statusManager;
    this.hooksDir = options.hooksDir || path.join(process.cwd(), 'hooks');
  }
  
  /**
   * Initialize hook manager and load all hooks
   */
  async initialize(): Promise<void> {
    // Load native hooks
    await this.loadNativeHooks();
    
    // Load shell hooks for compatibility
    await this.loadShellHooks();
    
    // Sort hooks by priority
    this.sortHooks();
    
    console.error(`[HookManager] Initialized with ${this.nativeHooks.size} native hooks`);
  }
  
  /**
   * Register a native TypeScript hook
   */
  registerNativeHook(hook: Hook): void {
    if (!hook.handler) {
      throw new Error(`Native hook ${hook.name} must have a handler`);
    }
    
    this.nativeHooks.set(hook.name, hook);
    
    const eventHooks = this.hooks.get(hook.event) || [];
    eventHooks.push(hook);
    this.hooks.set(hook.event, eventHooks);
    
    console.error(`[HookManager] Registered native hook: ${hook.name} for ${hook.event}`);
  }
  
  /**
   * Trigger hooks for an event
   */
  async trigger(event: HookEvent, context: Partial<HookContext>): Promise<HookResult> {
    const hooks = this.hooks.get(event) || [];
    const fullContext: HookContext = {
      event,
      db: this.db,
      eventBus: this.eventBus,
      statusManager: this.statusManager,
      ...context
    };
    
    let result: HookResult = { continue: true };
    
    for (const hook of hooks) {
      if (hook.enabled === false) continue;
      
      try {
        if (hook.type === 'native' && hook.handler) {
          // Native TypeScript hook
          const hookResult = await hook.handler(fullContext);
          
          if (hookResult.block) {
            console.error(`[HookManager] Hook ${hook.name} blocked execution: ${hookResult.reason}`);
            return hookResult;
          }
          
          // Merge results
          result = this.mergeResults(result, hookResult);
          
          // Update context for next hook
          if (hookResult.modifiedArgs) {
            fullContext.args = hookResult.modifiedArgs;
          }
          
        } else if (hook.type === 'shell' && hook.command) {
          // Legacy shell hook
          const shellResult = await this.executeShellHook(hook, fullContext);
          
          if (shellResult.block) {
            return shellResult;
          }
          
          result = this.mergeResults(result, shellResult);
        }
        
      } catch (error) {
        console.error(`[HookManager] Error in hook ${hook.name}:`, error);
        // Log but don't block on hook errors
        this.eventBus.logEvent({
          taskId: context.taskId || 'system',
          workerId: 'hook-manager',
          event: 'hook_error',
          payload: { hook: hook.name, error: error.message }
        });
      }
    }
    
    return result;
  }
  
  /**
   * Process stream data through hooks
   */
  async processStream(data: string, taskId: string): Promise<string> {
    const result = await this.trigger(HookEvent.STREAM_DATA, {
      stream: data,
      taskId
    });
    
    // Return modified stream or original
    return result.modifiedResult || data;
  }
  
  /**
   * Load native hooks from the hooks directory
   */
  private async loadNativeHooks(): Promise<void> {
    const nativeDir = path.join(this.hooksDir, 'native');
    
    try {
      const files = await fs.readdir(nativeDir);
      
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          try {
            const hookModule = await import(path.join(nativeDir, file));
            
            if (hookModule.default && typeof hookModule.default === 'object') {
              const hook = hookModule.default as Hook;
              hook.type = 'native';
              this.registerNativeHook(hook);
            }
          } catch (error) {
            console.error(`[HookManager] Failed to load hook ${file}:`, error);
          }
        }
      }
    } catch (error) {
      // Native hooks directory might not exist yet
      console.error('[HookManager] No native hooks directory found');
    }
  }
  
  /**
   * Load shell hooks for backward compatibility
   */
  private async loadShellHooks(): Promise<void> {
    try {
      const files = await fs.readdir(this.hooksDir);
      
      for (const file of files) {
        if (file.startsWith('axiom-') && file.endsWith('.sh')) {
          const hook: Hook = {
            name: file.replace('.sh', ''),
            event: this.inferEventFromFilename(file),
            type: 'shell',
            command: path.join(this.hooksDir, file),
            priority: 50, // Lower priority than native hooks
            enabled: true
          };
          
          const eventHooks = this.hooks.get(hook.event) || [];
          eventHooks.push(hook);
          this.hooks.set(hook.event, eventHooks);
        }
      }
    } catch (error) {
      console.error('[HookManager] Failed to load shell hooks:', error);
    }
  }
  
  /**
   * Execute a shell hook
   */
  private async executeShellHook(hook: Hook, context: HookContext): Promise<HookResult> {
    return new Promise((resolve) => {
      const env = {
        ...process.env,
        TOOL_NAME: context.tool || '',
        TOOL_ARGS: JSON.stringify(context.args || {}),
        TOOL_RESULT: JSON.stringify(context.result || {}),
        TASK_ID: context.taskId || '',
        HOOK_EVENT: context.event
      };
      
      const proc = spawn(hook.command!, [], { env });
      let output = '';
      let error = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 2) {
          // Blocking error
          try {
            const result = JSON.parse(output);
            resolve({
              continue: false,
              block: true,
              reason: result.reason || 'Hook blocked execution'
            });
          } catch {
            resolve({
              continue: false,
              block: true,
              reason: 'Hook blocked execution'
            });
          }
        } else {
          // Non-blocking
          resolve({ continue: true });
        }
      });
      
      // Timeout for shell hooks
      setTimeout(() => {
        proc.kill();
        resolve({ continue: true });
      }, 5000);
    });
  }
  
  /**
   * Infer hook event from filename
   */
  private inferEventFromFilename(filename: string): HookEvent {
    if (filename.includes('validate')) return HookEvent.PRE_SPAWN;
    if (filename.includes('stream')) return HookEvent.STREAM_DATA;
    if (filename.includes('verify')) return HookEvent.POST_SPAWN;
    if (filename.includes('format')) return HookEvent.POST_TOOL_USE;
    if (filename.includes('finalize')) return HookEvent.SESSION_END;
    
    return HookEvent.POST_TOOL_USE; // Default
  }
  
  /**
   * Sort hooks by priority
   */
  private sortHooks(): void {
    for (const [event, hooks] of this.hooks) {
      hooks.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
  }
  
  /**
   * Merge hook results
   */
  private mergeResults(current: HookResult, next: HookResult): HookResult {
    return {
      continue: current.continue && next.continue,
      block: current.block || next.block,
      reason: next.reason || current.reason,
      modifiedArgs: next.modifiedArgs || current.modifiedArgs,
      modifiedResult: next.modifiedResult || current.modifiedResult,
      intervention: next.intervention || current.intervention
    };
  }
  
  /**
   * Get registered hooks for an event
   */
  getHooks(event?: HookEvent): Hook[] {
    if (event) {
      return this.hooks.get(event) || [];
    }
    
    const allHooks: Hook[] = [];
    for (const hooks of this.hooks.values()) {
      allHooks.push(...hooks);
    }
    return allHooks;
  }
  
  /**
   * Enable/disable a hook
   */
  setHookEnabled(name: string, enabled: boolean): void {
    const hook = this.nativeHooks.get(name);
    if (hook) {
      hook.enabled = enabled;
    }
  }
}