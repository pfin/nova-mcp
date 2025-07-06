/**
 * Database-specific tools for Axiom MCP
 * 
 * Provides specialized handling for database operations
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Schema for database operations
export const DatabaseToolSchema = z.object({
  operation: z.enum(['create-schema', 'migrate', 'seed', 'test-connection', 'generate-types']),
  database: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb']).optional(),
  orm: z.enum(['prisma', 'drizzle', 'typeorm', 'mongoose']).optional(),
  config: z.record(z.string()).optional()
});

export type DatabaseToolInput = z.infer<typeof DatabaseToolSchema>;

/**
 * Handle database operations
 */
export async function handleDatabaseOperation(input: DatabaseToolInput): Promise<{
  success: boolean;
  message: string;
  files?: string[];
  commands?: string[];
}> {
  const { operation, database = 'postgresql', orm = 'prisma', config = {} } = input;
  
  switch (operation) {
    case 'create-schema':
      return createDatabaseSchema(database, orm, config);
    
    case 'migrate':
      return runMigration(orm, config);
    
    case 'seed':
      return seedDatabase(orm, config);
    
    case 'test-connection':
      return testDatabaseConnection(database, config);
    
    case 'generate-types':
      return generateTypes(orm, config);
    
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Create database schema files
 */
async function createDatabaseSchema(
  database: string,
  orm: string,
  config: Record<string, string>
): Promise<any> {
  const files: string[] = [];
  const commands: string[] = [];
  
  switch (orm) {
    case 'prisma': {
      // Create Prisma schema
      const schemaPath = 'prisma/schema.prisma';
      const schemaContent = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${database}"
  url      = env("DATABASE_URL")
}

${config.models || ''}
`;
      
      fs.mkdirSync('prisma', { recursive: true });
      fs.writeFileSync(schemaPath, schemaContent);
      files.push(schemaPath);
      
      // Create .env.example
      const envContent = `DATABASE_URL="${database}://user:password@localhost:5432/dbname"`;
      fs.writeFileSync('.env.example', envContent);
      files.push('.env.example');
      
      // Add commands
      commands.push('npm install prisma @prisma/client');
      commands.push('npx prisma generate');
      commands.push('npx prisma db push');
      
      break;
    }
    
    case 'drizzle': {
      // Create Drizzle config
      const configPath = 'drizzle.config.ts';
      const configContent = `import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: '${database === 'postgresql' ? 'pg' : database}',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;`;
      
      fs.writeFileSync(configPath, configContent);
      files.push(configPath);
      
      // Create schema file
      const schemaPath = 'src/db/schema.ts';
      fs.mkdirSync('src/db', { recursive: true });
      const schemaContent = `import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});`;
      
      fs.writeFileSync(schemaPath, schemaContent);
      files.push(schemaPath);
      
      commands.push('npm install drizzle-orm drizzle-kit');
      commands.push('npm install @types/pg');
      commands.push('npx drizzle-kit generate:pg');
      
      break;
    }
    
    default:
      throw new Error(`ORM ${orm} not yet supported`);
  }
  
  return {
    success: true,
    message: `Created ${orm} schema for ${database}`,
    files,
    commands
  };
}

/**
 * Run database migrations
 */
async function runMigration(orm: string, config: Record<string, string>): Promise<any> {
  const commands: string[] = [];
  
  switch (orm) {
    case 'prisma':
      if (config.name) {
        commands.push(`npx prisma migrate dev --name ${config.name}`);
      } else {
        commands.push('npx prisma migrate dev');
      }
      break;
    
    case 'drizzle':
      commands.push('npx drizzle-kit generate:pg');
      commands.push('npx drizzle-kit push:pg');
      break;
    
    default:
      throw new Error(`Migration not supported for ${orm}`);
  }
  
  // Execute commands
  try {
    for (const cmd of commands) {
      console.log(`Running: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
    }
    
    return {
      success: true,
      message: `Migrations completed for ${orm}`,
      commands
    };
  } catch (error) {
    return {
      success: false,
      message: `Migration failed: ${(error as Error).message}`,
      commands
    };
  }
}

/**
 * Seed database with sample data
 */
async function seedDatabase(orm: string, config: Record<string, string>): Promise<any> {
  const seedFile = orm === 'prisma' ? 'prisma/seed.ts' : 'src/db/seed.ts';
  
  const seedContent = `// Database seeding script
${orm === 'prisma' ? "import { PrismaClient } from '@prisma/client';" : "import { db } from './index';"}

async function seed() {
  ${orm === 'prisma' ? 'const prisma = new PrismaClient();' : ''}
  
  console.log('Seeding database...');
  
  // Add your seed data here
  const users = await ${orm === 'prisma' ? 'prisma.user.createMany' : 'db.insert(users).values'}({
    data: [
      { email: 'admin@example.com', name: 'Admin User' },
      { email: 'user@example.com', name: 'Test User' },
    ],
  });
  
  console.log('Seeded users:', users);
  
  ${orm === 'prisma' ? 'await prisma.$disconnect();' : ''}
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('Seeding complete');
  });`;
  
  fs.mkdirSync(path.dirname(seedFile), { recursive: true });
  fs.writeFileSync(seedFile, seedContent);
  
  return {
    success: true,
    message: `Created seed file: ${seedFile}`,
    files: [seedFile],
    commands: ['npx tsx ' + seedFile]
  };
}

/**
 * Test database connection
 */
async function testDatabaseConnection(database: string, config: Record<string, string>): Promise<any> {
  const testFile = 'test-db-connection.js';
  
  let testContent = '';
  switch (database) {
    case 'postgresql':
      testContent = `const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || '${config.url || ''}'
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Database connected:', res.rows[0]);
    await client.end();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

testConnection();`;
      break;
    
    case 'mysql':
      testContent = `const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL || '${config.url || ''}');
    const [rows] = await connection.execute('SELECT NOW()');
    console.log('✅ Database connected:', rows[0]);
    await connection.end();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

testConnection();`;
      break;
  }
  
  fs.writeFileSync(testFile, testContent);
  
  return {
    success: true,
    message: `Created connection test: ${testFile}`,
    files: [testFile],
    commands: [`node ${testFile}`]
  };
}

/**
 * Generate TypeScript types from database
 */
async function generateTypes(orm: string, config: Record<string, string>): Promise<any> {
  const commands: string[] = [];
  
  switch (orm) {
    case 'prisma':
      commands.push('npx prisma generate');
      break;
    
    case 'drizzle':
      commands.push('npx drizzle-kit introspect:pg');
      break;
    
    default:
      throw new Error(`Type generation not supported for ${orm}`);
  }
  
  return {
    success: true,
    message: `Type generation commands for ${orm}`,
    commands
  };
}

/**
 * Database tool definition for MCP
 */
export const databaseTool = {
  name: 'database_operations',
  description: 'Handle database schema, migrations, and operations',
  inputSchema: DatabaseToolSchema,
  handler: handleDatabaseOperation
};