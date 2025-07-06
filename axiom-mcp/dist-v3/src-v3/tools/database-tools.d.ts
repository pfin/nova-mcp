/**
 * Database-specific tools for Axiom MCP
 *
 * Provides specialized handling for database operations
 */
import { z } from 'zod';
export declare const DatabaseToolSchema: z.ZodObject<{
    operation: z.ZodEnum<["create-schema", "migrate", "seed", "test-connection", "generate-types"]>;
    database: z.ZodOptional<z.ZodEnum<["postgresql", "mysql", "sqlite", "mongodb"]>>;
    orm: z.ZodOptional<z.ZodEnum<["prisma", "drizzle", "typeorm", "mongoose"]>>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    operation: "create-schema" | "migrate" | "seed" | "test-connection" | "generate-types";
    database?: "postgresql" | "mysql" | "sqlite" | "mongodb" | undefined;
    orm?: "prisma" | "drizzle" | "typeorm" | "mongoose" | undefined;
    config?: Record<string, string> | undefined;
}, {
    operation: "create-schema" | "migrate" | "seed" | "test-connection" | "generate-types";
    database?: "postgresql" | "mysql" | "sqlite" | "mongodb" | undefined;
    orm?: "prisma" | "drizzle" | "typeorm" | "mongoose" | undefined;
    config?: Record<string, string> | undefined;
}>;
export type DatabaseToolInput = z.infer<typeof DatabaseToolSchema>;
/**
 * Handle database operations
 */
export declare function handleDatabaseOperation(input: DatabaseToolInput): Promise<{
    success: boolean;
    message: string;
    files?: string[];
    commands?: string[];
}>;
/**
 * Database tool definition for MCP
 */
export declare const databaseTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        operation: z.ZodEnum<["create-schema", "migrate", "seed", "test-connection", "generate-types"]>;
        database: z.ZodOptional<z.ZodEnum<["postgresql", "mysql", "sqlite", "mongodb"]>>;
        orm: z.ZodOptional<z.ZodEnum<["prisma", "drizzle", "typeorm", "mongoose"]>>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        operation: "create-schema" | "migrate" | "seed" | "test-connection" | "generate-types";
        database?: "postgresql" | "mysql" | "sqlite" | "mongodb" | undefined;
        orm?: "prisma" | "drizzle" | "typeorm" | "mongoose" | undefined;
        config?: Record<string, string> | undefined;
    }, {
        operation: "create-schema" | "migrate" | "seed" | "test-connection" | "generate-types";
        database?: "postgresql" | "mysql" | "sqlite" | "mongodb" | undefined;
        orm?: "prisma" | "drizzle" | "typeorm" | "mongoose" | undefined;
        config?: Record<string, string> | undefined;
    }>;
    handler: typeof handleDatabaseOperation;
};
//# sourceMappingURL=database-tools.d.ts.map