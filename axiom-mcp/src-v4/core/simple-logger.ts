import * as fs from 'fs';
import * as path from 'path';

const logFile = path.join('/home/peter/nova-mcp/axiom-mcp/logs-v4', `debug-${Date.now()}.log`);

export function logDebug(component: string, message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${component}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
  
  // Write to stderr for immediate visibility
  process.stderr.write(logLine);
  
  // Append to file synchronously
  try {
    fs.appendFileSync(logFile, logLine);
  } catch (err) {
    process.stderr.write(`Failed to write to log file: ${err}\n`);
  }
}

export function getLogFile(): string {
  return logFile;
}