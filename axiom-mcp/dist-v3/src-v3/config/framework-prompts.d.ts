/**
 * Framework-Specific Prompt Templates
 *
 * Provides specialized prompts for different frameworks, databases, and technologies
 */
export interface FrameworkPrompts {
    nextjs: {
        appRouter: string;
        pagesRouter: string;
        serverComponents: string;
        apiRoutes: string;
        deployment: string;
    };
    databases: {
        schema: string;
        migrations: string;
        orm: string;
        testing: string;
        optimization: string;
    };
    fullstack: {
        architecture: string;
        integration: string;
        authentication: string;
        deployment: string;
    };
    testing: {
        unit: string;
        integration: string;
        e2e: string;
        performance: string;
    };
}
export declare const FRAMEWORK_PROMPTS: FrameworkPrompts;
/**
 * Technology detection patterns
 */
export declare const TECH_PATTERNS: {
    nextjs: RegExp;
    react: RegExp;
    vue: RegExp;
    angular: RegExp;
    database: RegExp;
    api: RegExp;
    docker: RegExp;
    testing: RegExp;
    auth: RegExp;
};
/**
 * Get relevant framework prompts based on task content
 */
export declare function getFrameworkPrompts(taskDescription: string): string[];
/**
 * Framework-specific file templates
 */
export declare const FILE_TEMPLATES: {
    'next.config.js': string;
    'prisma.schema': string;
    'docker-compose.yml': string;
    '.env.example': string;
    'middleware.ts': string;
};
//# sourceMappingURL=framework-prompts.d.ts.map