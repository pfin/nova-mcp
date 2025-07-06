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
 * Scan code for security vulnerabilities
 */
export declare function scanCodeSecurity(code: string, filename?: string): SecurityScanResult;
/**
 * Scan files in a directory
 */
export declare function scanDirectory(dirPath: string, extensions?: string[]): Promise<SecurityScanResult>;
/**
 * Format security report
 */
export declare function formatSecurityReport(result: SecurityScanResult): string;
//# sourceMappingURL=security-scanner.d.ts.map