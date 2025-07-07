import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createMcpCompliantSchema } from '../utils/mcp-schema.js';

// Schema for log viewing
export const axiomMcpLogsSchema = z.object({
  action: z.enum(['list', 'read', 'tail', 'search', 'clear'])
    .describe('Action to perform on logs'),
  
  logFile: z.string().optional()
    .describe('Specific log file to read (for read/tail actions)'),
  
  limit: z.number().min(1).max(1000).default(100)
    .describe('Number of lines to return (for tail) or files to list'),
  
  query: z.string().optional()
    .describe('Search query (for search action)'),
  
  format: z.enum(['json', 'text', 'summary']).default('text')
    .describe('Output format for logs')
});

export type AxiomMcpLogsInput = z.infer<typeof axiomMcpLogsSchema>;

export const axiomMcpLogsTool = {
  name: 'axiom_mcp_logs',
  description: 'View and manage Axiom MCP execution logs',
  inputSchema: createMcpCompliantSchema(axiomMcpLogsSchema, 'AxiomMcpLogsInput'),
};

// Get logs directory
function getLogsDir(): string {
  return path.join(process.cwd(), 'logs-v3');
}

// Format log entry based on format type
function formatLogEntry(entry: any, format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify(entry, null, 2);
    
    case 'summary':
      return `[${entry.timestamp}] ${entry.event}: ${
        entry.payload?.message || JSON.stringify(entry.payload).slice(0, 100)
      }`;
    
    case 'text':
    default:
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const event = entry.event.toUpperCase().padEnd(15);
      let message = '';
      
      if (entry.payload?.message) {
        message = entry.payload.message;
      } else if (entry.payload?.tool) {
        message = `Tool: ${entry.payload.tool}`;
      } else if (entry.payload?.error) {
        message = `Error: ${entry.payload.error}`;
      } else if (entry.payload?.output) {
        message = entry.payload.output.slice(0, 200);
      } else {
        message = JSON.stringify(entry.payload).slice(0, 100);
      }
      
      return `${time} [${event}] ${message}`;
  }
}

export async function handleAxiomMcpLogs(
  args: AxiomMcpLogsInput
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const logsDir = getLogsDir();
  
  try {
    switch (args.action) {
      case 'list': {
        // List all log files
        const files = await fs.readdir(logsDir);
        const logFiles = files
          .filter(f => f.endsWith('.jsonl'))
          .sort((a, b) => b.localeCompare(a))
          .slice(0, args.limit);
        
        const fileStats = await Promise.all(
          logFiles.map(async (file) => {
            const stats = await fs.stat(path.join(logsDir, file));
            return {
              file,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              lines: await countLines(path.join(logsDir, file))
            };
          })
        );
        
        let output = '📁 Axiom MCP Log Files\n';
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        
        for (const stat of fileStats) {
          output += `📄 ${stat.file}\n`;
          output += `   Size: ${(stat.size / 1024).toFixed(2)} KB\n`;
          output += `   Lines: ${stat.lines}\n`;
          output += `   Modified: ${new Date(stat.modified).toLocaleString()}\n\n`;
        }
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }
      
      case 'read': {
        // Read entire log file
        if (!args.logFile) {
          throw new Error('logFile required for read action');
        }
        
        const logPath = path.join(logsDir, args.logFile);
        const content = await fs.readFile(logPath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        
        let output = `📄 Log: ${args.logFile}\n`;
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            output += formatLogEntry(entry, args.format) + '\n';
          } catch (e) {
            output += line + '\n';
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }
      
      case 'tail': {
        // Get last N lines from log file or latest log
        let logPath: string;
        
        if (args.logFile) {
          logPath = path.join(logsDir, args.logFile);
        } else {
          // Get latest log file
          const files = await fs.readdir(logsDir);
          const logFiles = files
            .filter(f => f.endsWith('.jsonl'))
            .sort((a, b) => b.localeCompare(a));
          
          if (logFiles.length === 0) {
            throw new Error('No log files found');
          }
          
          logPath = path.join(logsDir, logFiles[0]);
        }
        
        const content = await fs.readFile(logPath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const tailLines = lines.slice(-args.limit);
        
        let output = `📄 Tail: ${path.basename(logPath)} (last ${tailLines.length} lines)\n`;
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        
        for (const line of tailLines) {
          try {
            const entry = JSON.parse(line);
            output += formatLogEntry(entry, args.format) + '\n';
          } catch (e) {
            output += line + '\n';
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }
      
      case 'search': {
        // Search across all log files
        if (!args.query) {
          throw new Error('query required for search action');
        }
        
        const files = await fs.readdir(logsDir);
        const logFiles = files.filter(f => f.endsWith('.jsonl'));
        const results: Array<{ file: string; line: string; entry: any }> = [];
        
        for (const file of logFiles) {
          const content = await fs.readFile(path.join(logsDir, file), 'utf-8');
          const lines = content.trim().split('\n').filter(Boolean);
          
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              const entryStr = JSON.stringify(entry).toLowerCase();
              
              if (entryStr.includes(args.query.toLowerCase())) {
                results.push({ file, line, entry });
                
                if (results.length >= args.limit) {
                  break;
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
          
          if (results.length >= args.limit) {
            break;
          }
        }
        
        let output = `🔍 Search Results for "${args.query}"\n`;
        output += `Found ${results.length} matches\n`;
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        
        for (const result of results) {
          output += `📄 ${result.file}\n`;
          output += `   ${formatLogEntry(result.entry, args.format)}\n\n`;
        }
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }
      
      case 'clear': {
        // Clear old log files (keep last 10)
        const files = await fs.readdir(logsDir);
        const logFiles = files
          .filter(f => f.endsWith('.jsonl'))
          .sort((a, b) => b.localeCompare(a));
        
        const filesToDelete = logFiles.slice(10);
        
        for (const file of filesToDelete) {
          await fs.unlink(path.join(logsDir, file));
        }
        
        return {
          content: [{
            type: 'text',
            text: `🗑️ Cleared ${filesToDelete.length} old log files\n` +
                  `📁 Kept ${Math.min(10, logFiles.length)} most recent files`
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

// Helper to count lines in a file
async function countLines(filePath: string): Promise<number> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content.trim().split('\n').filter(Boolean).length;
}