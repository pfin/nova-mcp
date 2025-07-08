import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createMcpCompliantSchema } from '../utils/mcp-schema.js';

// Schema for settings management
export const axiomMcpSettingsSchema = z.object({
  action: z.enum(['get', 'set', 'list', 'reset'])
    .describe('Action to perform on settings'),
  
  setting: z.string().optional()
    .describe('Setting name (for get/set actions)'),
  
  value: z.any().optional()
    .describe('Setting value (for set action)'),
  
  category: z.enum(['execution', 'logging', 'intervention', 'verbose', 'all']).default('all')
    .describe('Settings category to view/modify')
});

export type AxiomMcpSettingsInput = z.infer<typeof axiomMcpSettingsSchema>;

export const axiomMcpSettingsTool = {
  name: 'axiom_mcp_settings',
  description: 'Manage Axiom MCP configuration settings',
  inputSchema: createMcpCompliantSchema(axiomMcpSettingsSchema, 'AxiomMcpSettingsInput'),
};

// Default settings
const DEFAULT_SETTINGS = {
  execution: {
    maxConcurrentTasks: 5,
    defaultTimeout: 300000, // 5 minutes
    useWorkerThreads: false,
    executorType: 'pty', // 'pty' or 'sdk'
    workingDirectory: process.cwd()
  },
  logging: {
    level: 'info', // 'debug', 'info', 'warn', 'error'
    maxLogFiles: 10,
    enableWebSocket: true,
    webSocketPort: 8080,
    formatOutput: true
  },
  intervention: {
    enabled: true,
    planningTimeout: 30000, // 30 seconds
    progressCheckInterval: 10000, // 10 seconds
    todoDetection: true,
    forceImplementation: true
  },
  verbose: {
    defaultEnabled: false,
    colorOutput: true,
    showTimestamps: true,
    prefixLength: 8,
    bufferSize: 1000,
    flushInterval: 100
  }
};

// Settings file path
const SETTINGS_PATH = path.join(process.cwd(), 'axiom-settings.json');

// Load settings from file or return defaults
async function loadSettings(): Promise<typeof DEFAULT_SETTINGS> {
  try {
    const content = await fs.readFile(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(content);
    
    // Merge with defaults to ensure all keys exist
    return {
      execution: { ...DEFAULT_SETTINGS.execution, ...settings.execution },
      logging: { ...DEFAULT_SETTINGS.logging, ...settings.logging },
      intervention: { ...DEFAULT_SETTINGS.intervention, ...settings.intervention },
      verbose: { ...DEFAULT_SETTINGS.verbose, ...settings.verbose }
    };
  } catch (error) {
    // Return defaults if file doesn't exist
    return DEFAULT_SETTINGS;
  }
}

// Save settings to file
async function saveSettings(settings: typeof DEFAULT_SETTINGS): Promise<void> {
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

// Format setting value for display
function formatValue(value: any): string {
  if (typeof value === 'boolean') {
    return value ? '✅ enabled' : '❌ disabled';
  } else if (typeof value === 'number') {
    if (value > 1000) {
      return `${(value / 1000).toFixed(1)}s`;
    }
    return value.toString();
  }
  return JSON.stringify(value);
}

export async function handleAxiomMcpSettings(
  args: AxiomMcpSettingsInput
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const settings = await loadSettings();
  
  try {
    switch (args.action) {
      case 'list': {
        // List all settings in category
        let output = '⚙️  Axiom MCP Settings\n';
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        
        const categories = args.category === 'all' 
          ? ['execution', 'logging', 'intervention', 'verbose']
          : [args.category];
        
        for (const cat of categories) {
          const categorySettings = settings[cat as keyof typeof settings];
          output += `📂 ${cat.toUpperCase()}\n`;
          
          for (const [key, value] of Object.entries(categorySettings)) {
            const displayKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
            output += `   ${displayKey}: ${formatValue(value)}\n`;
          }
          output += '\n';
        }
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }
      
      case 'get': {
        // Get specific setting
        if (!args.setting) {
          throw new Error('setting required for get action');
        }
        
        // Parse setting path (e.g., "execution.maxConcurrentTasks")
        const [category, key] = args.setting.split('.');
        
        if (!category || !key) {
          throw new Error('Setting must be in format: category.key (e.g., execution.maxConcurrentTasks)');
        }
        
        const categorySettings = settings[category as keyof typeof settings];
        if (!categorySettings) {
          throw new Error(`Unknown category: ${category}`);
        }
        
        const value = categorySettings[key as keyof typeof categorySettings];
        if (value === undefined) {
          throw new Error(`Unknown setting: ${args.setting}`);
        }
        
        return {
          content: [{
            type: 'text',
            text: `⚙️  ${args.setting} = ${formatValue(value)}`
          }]
        };
      }
      
      case 'set': {
        // Set specific setting
        if (!args.setting || args.value === undefined) {
          throw new Error('setting and value required for set action');
        }
        
        const [category, key] = args.setting.split('.');
        
        if (!category || !key) {
          throw new Error('Setting must be in format: category.key');
        }
        
        const categorySettings = settings[category as keyof typeof settings];
        if (!categorySettings) {
          throw new Error(`Unknown category: ${category}`);
        }
        
        // Type validation based on current value
        const currentValue = categorySettings[key as keyof typeof categorySettings];
        let newValue = args.value;
        
        if (typeof currentValue === 'boolean') {
          newValue = Boolean(args.value);
        } else if (typeof currentValue === 'number') {
          newValue = Number(args.value);
          if (isNaN(newValue)) {
            throw new Error(`Invalid number value: ${args.value}`);
          }
        } else if (typeof currentValue === 'string') {
          newValue = String(args.value);
        }
        
        // Update setting
        (categorySettings as any)[key] = newValue;
        
        // Save to file
        await saveSettings(settings);
        
        // Apply certain settings immediately
        if (category === 'intervention' && key === 'enabled') {
          // This would trigger intervention system enable/disable
          // For now, just acknowledge the change
        }
        
        return {
          content: [{
            type: 'text',
            text: `✅ Updated ${args.setting} = ${formatValue(newValue)}\n` +
                  `💾 Settings saved to ${SETTINGS_PATH}`
          }]
        };
      }
      
      case 'reset': {
        // Reset to defaults
        await saveSettings(DEFAULT_SETTINGS);
        
        return {
          content: [{
            type: 'text',
            text: '🔄 Settings reset to defaults\n' +
                  '💾 Saved to ' + SETTINGS_PATH
          }]
        };
      }
      
      default:
        throw new Error(`Unknown action: ${args.action}`);
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `❌ Error: ${error.message}`
      }]
    };
  }
}

// Export current settings for use by other components
export async function getCurrentSettings(): Promise<typeof DEFAULT_SETTINGS> {
  return await loadSettings();
}