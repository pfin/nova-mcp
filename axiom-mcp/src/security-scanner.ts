import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface SecurityScanResult {
  passed: boolean;
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Security patterns based on OWASP and 2025 AI code research
 */
const SECURITY_PATTERNS = [
  // Injection vulnerabilities
  {
    pattern: /eval\s*\(/g,
    severity: 'critical' as const,
    type: 'Code Injection',
    description: 'Use of eval() can lead to code injection',
    suggestion: 'Use JSON.parse() for JSON data or Function constructor with validation'
  },
  {
    pattern: /exec\s*\([^)]*\$\{/g,
    severity: 'high' as const,
    type: 'Command Injection',
    description: 'String interpolation in exec() calls',
    suggestion: 'Use execFile() with argument array or validate/escape inputs'
  },
  {
    pattern: /innerHTML\s*=\s*[^'"`]/g,
    severity: 'high' as const,
    type: 'XSS',
    description: 'Direct innerHTML assignment without sanitization',
    suggestion: 'Use textContent or sanitize HTML input'
  },
  
  // Authentication/Authorization
  {
    pattern: /password\s*=\s*["'][^"']+["']/g,
    severity: 'critical' as const,
    type: 'Hardcoded Secrets',
    description: 'Hardcoded password detected',
    suggestion: 'Use environment variables or secure key management'
  },
  {
    pattern: /(api[_-]?key|secret|token)\s*=\s*["'][^"']+["']/gi,
    severity: 'critical' as const,
    type: 'Hardcoded Secrets',
    description: 'Hardcoded API key or secret',
    suggestion: 'Use environment variables or secure key management'
  },
  
  // Cryptography
  {
    pattern: /Math\.random\(\)/g,
    severity: 'medium' as const,
    type: 'Weak Randomness',
    description: 'Math.random() is not cryptographically secure',
    suggestion: 'Use crypto.randomBytes() or crypto.getRandomValues()'
  },
  {
    pattern: /md5|sha1/gi,
    severity: 'medium' as const,
    type: 'Weak Cryptography',
    description: 'Use of weak hash algorithm',
    suggestion: 'Use SHA-256 or stronger algorithms'
  },
  
  // File operations
  {
    pattern: /readFileSync\s*\([^)]*\$\{/g,
    severity: 'high' as const,
    type: 'Path Traversal',
    description: 'Dynamic file path without validation',
    suggestion: 'Validate and sanitize file paths, use path.join()'
  },
  {
    pattern: /unlink|rmdir|rm\s+-rf/g,
    severity: 'medium' as const,
    type: 'Dangerous File Operation',
    description: 'File deletion operations detected',
    suggestion: 'Validate paths and add confirmation checks'
  },
  
  // Network
  {
    pattern: /http:\/\//g,
    severity: 'low' as const,
    type: 'Insecure Protocol',
    description: 'Use of HTTP instead of HTTPS',
    suggestion: 'Use HTTPS for all network communication'
  },
  {
    pattern: /cors:\s*{\s*origin:\s*['"]\*/g,
    severity: 'medium' as const,
    type: 'CORS Misconfiguration',
    description: 'Wildcard CORS origin',
    suggestion: 'Specify allowed origins explicitly'
  },
];

/**
 * Scan code for security vulnerabilities
 */
export function scanCodeSecurity(code: string, filename?: string): SecurityScanResult {
  const issues: SecurityIssue[] = [];
  const lines = code.split('\n');
  
  // Check each pattern
  for (const secPattern of SECURITY_PATTERNS) {
    const matches = code.matchAll(secPattern.pattern);
    
    for (const match of matches) {
      if (match.index !== undefined) {
        // Find line number
        let charCount = 0;
        let lineNum = 1;
        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length + 1; // +1 for newline
          if (charCount > match.index) {
            lineNum = i + 1;
            break;
          }
        }
        
        issues.push({
          severity: secPattern.severity,
          type: secPattern.type,
          description: secPattern.description,
          file: filename,
          line: lineNum,
          suggestion: secPattern.suggestion,
        });
      }
    }
  }
  
  // Check for additional patterns
  checkComplexPatterns(code, issues, filename);
  
  // Calculate summary
  const summary = {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  };
  
  const passed = summary.critical === 0 && summary.high === 0;
  
  return { passed, issues, summary };
}

/**
 * Check for more complex security patterns
 */
function checkComplexPatterns(code: string, issues: SecurityIssue[], filename?: string): void {
  // Check for SQL injection
  if (/query\s*\([^)]*\+|`[^`]*\$\{[^}]*\}[^`]*`/g.test(code) && /SELECT|INSERT|UPDATE|DELETE/i.test(code)) {
    issues.push({
      severity: 'critical',
      type: 'SQL Injection',
      description: 'Potential SQL injection from string concatenation',
      file: filename,
      suggestion: 'Use parameterized queries or prepared statements'
    });
  }
  
  // Check for missing input validation
  if (/req\.(body|query|params)\.\w+/g.test(code) && !/validate|sanitize|escape/i.test(code)) {
    issues.push({
      severity: 'medium',
      type: 'Missing Input Validation',
      description: 'User input used without validation',
      file: filename,
      suggestion: 'Validate and sanitize all user inputs'
    });
  }
  
  // Check for missing error handling
  if (/async\s+function|\.then\(/g.test(code) && !/try\s*{|\.catch\(/g.test(code)) {
    issues.push({
      severity: 'low',
      type: 'Missing Error Handling',
      description: 'Async operations without error handling',
      file: filename,
      suggestion: 'Add try-catch blocks or .catch() handlers'
    });
  }
}

/**
 * Scan files in a directory
 */
export async function scanDirectory(dirPath: string, extensions: string[] = ['.js', '.ts', '.jsx', '.tsx']): Promise<SecurityScanResult> {
  const allIssues: SecurityIssue[] = [];
  
  function scanDir(dir: string): void {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanDir(filePath);
      } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const result = scanCodeSecurity(content, filePath);
        allIssues.push(...result.issues);
      }
    }
  }
  
  scanDir(dirPath);
  
  const summary = {
    critical: allIssues.filter(i => i.severity === 'critical').length,
    high: allIssues.filter(i => i.severity === 'high').length,
    medium: allIssues.filter(i => i.severity === 'medium').length,
    low: allIssues.filter(i => i.severity === 'low').length,
  };
  
  const passed = summary.critical === 0 && summary.high === 0;
  
  return { passed, issues: allIssues, summary };
}

/**
 * Format security report
 */
export function formatSecurityReport(result: SecurityScanResult): string {
  let report = '# Security Scan Report\n\n';
  
  if (result.passed) {
    report += '✅ **Security scan PASSED** - No critical or high severity issues found\n\n';
  } else {
    report += '❌ **Security scan FAILED** - Critical or high severity issues detected\n\n';
  }
  
  report += `## Summary\n`;
  report += `- Critical: ${result.summary.critical}\n`;
  report += `- High: ${result.summary.high}\n`;
  report += `- Medium: ${result.summary.medium}\n`;
  report += `- Low: ${result.summary.low}\n\n`;
  
  if (result.issues.length > 0) {
    report += `## Issues Found\n\n`;
    
    // Group by severity
    const severities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
    
    for (const severity of severities) {
      const severityIssues = result.issues.filter(i => i.severity === severity);
      if (severityIssues.length > 0) {
        report += `### ${severity.toUpperCase()} Severity\n\n`;
        
        for (const issue of severityIssues) {
          report += `**${issue.type}**: ${issue.description}\n`;
          if (issue.file) {
            report += `- File: ${issue.file}`;
            if (issue.line) report += ` (line ${issue.line})`;
            report += '\n';
          }
          if (issue.suggestion) {
            report += `- Suggestion: ${issue.suggestion}\n`;
          }
          report += '\n';
        }
      }
    }
  }
  
  return report;
}