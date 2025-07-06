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

export const FRAMEWORK_PROMPTS: FrameworkPrompts = {
  nextjs: {
    appRouter: `When working with Next.js App Router:
- Use the app/ directory structure
- Understand server vs client components ('use client' directive)
- Implement proper loading.tsx and error.tsx files
- Use Server Actions for forms
- Implement proper metadata exports
- Handle dynamic routes with [param] folders
- Use proper data fetching patterns (server components fetch directly)
- Implement proper caching strategies`,

    pagesRouter: `When working with Next.js Pages Router:
- Use pages/ directory structure
- Implement getStaticProps/getServerSideProps correctly
- Handle API routes in pages/api/
- Use proper _app.tsx and _document.tsx
- Implement ISR (Incremental Static Regeneration) where appropriate`,

    serverComponents: `For Next.js Server Components:
- Default to server components (no 'use client')
- Fetch data directly in components
- Use async/await in components
- Pass serializable props only
- Handle suspense boundaries properly
- Avoid browser-only APIs
- Minimize client component usage`,

    apiRoutes: `For Next.js API Routes:
- Use route.ts files in app router
- Implement proper HTTP methods (GET, POST, etc.)
- Handle request/response correctly
- Implement proper error handling
- Use middleware for auth/validation
- Consider edge runtime for performance
- Implement proper CORS if needed`,

    deployment: `For Next.js deployment:
- Configure next.config.js properly
- Set up environment variables
- Optimize images with next/image
- Configure output: 'standalone' for Docker
- Set up proper build caching
- Handle static vs dynamic routes
- Configure CDN and edge functions`
  },

  databases: {
    schema: `When creating database schemas:
- Design normalized tables with proper relationships
- Use appropriate data types and constraints
- Implement proper indexes for query performance
- Add foreign key constraints
- Consider using UUIDs vs auto-increment IDs
- Implement soft deletes where appropriate
- Add created_at/updated_at timestamps
- Document schema with comments`,

    migrations: `For database migrations:
- Create reversible migrations when possible
- Use transaction blocks for data integrity
- Test migrations on sample data
- Implement proper up/down methods
- Version migrations sequentially
- Handle data transformations carefully
- Document breaking changes
- Test rollback procedures`,

    orm: `When using ORMs (Prisma/Drizzle/TypeORM):
- Define models with proper types
- Implement relationships correctly
- Use query builders efficiently
- Avoid N+1 queries
- Implement proper transactions
- Use raw SQL when needed
- Set up proper connection pooling
- Handle database errors gracefully`,

    testing: `For database testing:
- Use test databases or in-memory DBs
- Implement proper test data factories
- Clean up after tests
- Test migrations separately
- Mock database calls in unit tests
- Test transaction rollbacks
- Verify constraints work
- Test concurrent access scenarios`,

    optimization: `For database optimization:
- Analyze query performance with EXPLAIN
- Add appropriate indexes
- Optimize JOIN operations
- Use database views for complex queries
- Implement caching strategies
- Consider read replicas
- Monitor connection pool usage
- Use batch operations where possible`
  },

  fullstack: {
    architecture: `For full-stack architecture:
- Separate concerns properly (API, business logic, data)
- Use proper folder structure (features/modules)
- Implement proper error boundaries
- Use dependency injection
- Create reusable components/services
- Implement proper logging
- Use environment-based configuration
- Document API contracts`,

    integration: `For frontend-backend integration:
- Define clear API contracts (OpenAPI/GraphQL schema)
- Implement proper error handling on both sides
- Use proper HTTP status codes
- Handle loading and error states
- Implement optimistic updates
- Use proper data validation
- Handle authentication tokens
- Implement CORS properly`,

    authentication: `For authentication systems:
- Use secure session management
- Implement JWT properly (if used)
- Store passwords with bcrypt/argon2
- Implement rate limiting
- Use HTTPS everywhere
- Implement CSRF protection
- Handle token refresh
- Add proper authorization checks`,

    deployment: `For full-stack deployment:
- Use Docker for containerization
- Set up CI/CD pipelines
- Configure environment variables
- Set up monitoring and logging
- Implement health checks
- Configure reverse proxy (nginx)
- Set up SSL certificates
- Plan for scaling (horizontal/vertical)`
  },

  testing: {
    unit: `For unit tests:
- Test individual functions/methods
- Mock external dependencies
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test edge cases
- Aim for high coverage
- Keep tests fast
- Test error scenarios`,

    integration: `For integration tests:
- Test component interactions
- Use test databases
- Test API endpoints
- Verify data flow
- Test error propagation
- Mock external services
- Test transactions
- Verify side effects`,

    e2e: `For end-to-end tests:
- Test critical user flows
- Use realistic test data
- Test across browsers
- Handle async operations
- Test error scenarios
- Verify UI updates
- Test form submissions
- Check accessibility`,

    performance: `For performance testing:
- Establish baseline metrics
- Test under load
- Monitor memory usage
- Check response times
- Test concurrent users
- Identify bottlenecks
- Test caching effectiveness
- Monitor database queries`
  }
};

/**
 * Technology detection patterns
 */
export const TECH_PATTERNS = {
  nextjs: /next\.js|nextjs|app router|pages router|vercel|next\.config/i,
  react: /react|jsx|tsx|component|hooks|useState|useEffect/i,
  vue: /vue|vuex|nuxt|composition api|setup/i,
  angular: /angular|ng-|@angular|rxjs|observable/i,
  database: /database|postgres|mysql|mongodb|sqlite|prisma|typeorm|drizzle|migration|schema/i,
  api: /api|rest|graphql|endpoint|route|controller|express|fastify|nest/i,
  docker: /docker|dockerfile|container|compose|kubernetes|k8s/i,
  testing: /test|spec|jest|vitest|cypress|playwright|testing/i,
  auth: /auth|authentication|jwt|session|login|oauth|security/i
};

/**
 * Get relevant framework prompts based on task content
 */
export function getFrameworkPrompts(taskDescription: string): string[] {
  const prompts: string[] = [];
  const lowerTask = taskDescription.toLowerCase();
  
  // Check for Next.js
  if (TECH_PATTERNS.nextjs.test(taskDescription)) {
    if (lowerTask.includes('app router') || lowerTask.includes('app/')) {
      prompts.push(FRAMEWORK_PROMPTS.nextjs.appRouter);
    }
    if (lowerTask.includes('server component')) {
      prompts.push(FRAMEWORK_PROMPTS.nextjs.serverComponents);
    }
    if (lowerTask.includes('api')) {
      prompts.push(FRAMEWORK_PROMPTS.nextjs.apiRoutes);
    }
  }
  
  // Check for database work
  if (TECH_PATTERNS.database.test(taskDescription)) {
    if (lowerTask.includes('schema')) {
      prompts.push(FRAMEWORK_PROMPTS.databases.schema);
    }
    if (lowerTask.includes('migration')) {
      prompts.push(FRAMEWORK_PROMPTS.databases.migrations);
    }
    if (/prisma|drizzle|typeorm/.test(lowerTask)) {
      prompts.push(FRAMEWORK_PROMPTS.databases.orm);
    }
  }
  
  // Check for testing
  if (TECH_PATTERNS.testing.test(taskDescription)) {
    if (lowerTask.includes('unit')) {
      prompts.push(FRAMEWORK_PROMPTS.testing.unit);
    }
    if (lowerTask.includes('e2e') || lowerTask.includes('end-to-end')) {
      prompts.push(FRAMEWORK_PROMPTS.testing.e2e);
    }
  }
  
  // Check for auth
  if (TECH_PATTERNS.auth.test(taskDescription)) {
    prompts.push(FRAMEWORK_PROMPTS.fullstack.authentication);
  }
  
  // Check for deployment
  if (/deploy|docker|kubernetes|production/.test(lowerTask)) {
    prompts.push(FRAMEWORK_PROMPTS.fullstack.deployment);
  }
  
  return prompts;
}

/**
 * Framework-specific file templates
 */
export const FILE_TEMPLATES = {
  'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig`,

  'prisma.schema': `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`,

  'docker-compose.yml': `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:`,

  '.env.example': `# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myapp"

# Auth
JWT_SECRET="your-secret-key"
SESSION_SECRET="your-session-secret"

# API Keys
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# Environment
NODE_ENV="development"`,

  'middleware.ts': `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Add auth check here
  const token = request.cookies.get('token')
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*']
}`
};