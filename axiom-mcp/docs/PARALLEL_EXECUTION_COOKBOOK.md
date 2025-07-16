# Axiom Parallel Execution Cookbook

> **Ready-to-use recipes** for common parallel execution scenarios

## Table of Contents

- [Web Development](#web-development)
- [API Development](#api-development)
- [Database Operations](#database-operations)
- [Testing Scenarios](#testing-scenarios)
- [Refactoring Projects](#refactoring-projects)
- [Documentation Tasks](#documentation-tasks)
- [Performance Optimization](#performance-optimization)

## Web Development

### Recipe: Build Complete Web App in 30 Minutes

```javascript
// The 30-Minute Web App Challenge
const webAppTasks = [
  // Backend (10 min)
  { 
    prompt: "Create Express.js server with user auth using JWT",
    id: "backend"
  },
  // Frontend (10 min)
  {
    prompt: "Create React app with login/register pages using Tailwind CSS",
    id: "frontend"  
  },
  // Database (5 min)
  {
    prompt: "Create PostgreSQL schema for users, sessions, and profiles",
    id: "database"
  },
  // API Docs (5 min)
  {
    prompt: "Create Swagger/OpenAPI documentation for all endpoints",
    id: "docs"
  }
];

// Launch all tasks in parallel
webAppTasks.forEach(task => {
  axiom_spawn({
    prompt: task.prompt,
    verboseMasterMode: true
  });
});

// Result: Complete full-stack app with auth in 30 minutes
```

### Recipe: Landing Page Variations

```javascript
// Create 5 different landing page designs
const styles = ["Minimalist", "Bold", "Playful", "Corporate", "Startup"];

styles.forEach(style => {
  axiom_spawn({
    prompt: `Create landing page with ${style} design using HTML/CSS/JS. Include hero, features, testimonials, and CTA sections.`,
    verboseMasterMode: true
  });
});

// Pick the best design from 5 options
```

### Recipe: Responsive Component Library

```javascript
// Build complete component library in parallel
const components = [
  "Navigation bars (sticky, dropdown, mobile hamburger)",
  "Hero sections (video bg, parallax, split screen)",
  "Card layouts (product, blog, testimonial)",
  "Forms (contact, multi-step, with validation)",
  "Footers (sitemap, newsletter, social)",
  "Modals (popup, drawer, fullscreen)"
];

components.forEach(component => {
  axiom_spawn({
    prompt: `Create React component: ${component}. Make it fully responsive with Tailwind CSS.`,
    verboseMasterMode: true
  });
});
```

## API Development

### Recipe: Multi-Protocol API

```javascript
// Same data, multiple protocols
const protocols = [
  { type: "REST", tool: "Express.js" },
  { type: "GraphQL", tool: "Apollo Server" },
  { type: "gRPC", tool: "grpc-node" },
  { type: "WebSocket", tool: "Socket.io" }
];

protocols.forEach(({ type, tool }) => {
  axiom_spawn({
    prompt: `Create ${type} API for todo list using ${tool}. Include CRUD operations and real-time updates.`,
    verboseMasterMode: true
  });
});

// Compare performance and developer experience
```

### Recipe: Microservices in Minutes

```javascript
// Build complete microservices architecture
const services = {
  "api-gateway": "Kong/Express gateway with rate limiting and auth",
  "user-service": "User management with Postgres and Redis cache",
  "product-service": "Product catalog with Elasticsearch",
  "order-service": "Order processing with Stripe integration",
  "email-service": "Transactional emails with SendGrid",
  "analytics-service": "Event tracking with ClickHouse"
};

// Create all services with Docker support
Object.entries(services).forEach(([name, desc]) => {
  axiom_spawn({
    prompt: `Create ${name}: ${desc}. Include Dockerfile, tests, and health checks.`,
    verboseMasterMode: true
  });
});
```

### Recipe: API Client Libraries

```javascript
// Generate clients for multiple languages
const languages = ["JavaScript", "Python", "Go", "Ruby", "PHP"];

languages.forEach(lang => {
  axiom_spawn({
    prompt: `Create ${lang} client library for REST API (from openapi.yaml). Include authentication, error handling, and retries.`,
    verboseMasterMode: true
  });
});
```

## Database Operations

### Recipe: Multi-Database Schema

```javascript
// Same schema, different databases
const databases = [
  "PostgreSQL with proper constraints and indexes",
  "MongoDB with embedded documents and references",
  "MySQL with foreign keys and triggers",
  "SQLite for local development",
  "Redis data structures for caching"
];

databases.forEach(db => {
  axiom_spawn({
    prompt: `Create e-commerce schema for ${db}. Include users, products, orders, and reviews.`,
    verboseMasterMode: true
  });
});
```

### Recipe: Database Migration Scripts

```javascript
// Parallel migration development
const migrations = [
  "Migrate users from MySQL to PostgreSQL with data transformation",
  "Convert normalized schema to denormalized for analytics",
  "Add audit logging to all tables without downtime",
  "Implement soft deletes across entire database",
  "Add full-text search indexes for product catalog"
];

migrations.forEach(task => {
  axiom_spawn({
    prompt: `Create migration script: ${task}. Include rollback procedure.`,
    verboseMasterMode: true
  });
});
```

## Testing Scenarios

### Recipe: Comprehensive Test Suite

```javascript
// Different testing approaches in parallel
const testTypes = [
  { type: "Unit tests", tool: "Jest", target: "All utility functions" },
  { type: "Integration tests", tool: "Supertest", target: "API endpoints" },
  { type: "E2E tests", tool: "Cypress", target: "User workflows" },
  { type: "Performance tests", tool: "Artillery", target: "Load testing" },
  { type: "Security tests", tool: "OWASP ZAP", target: "Vulnerability scan" }
];

testTypes.forEach(({ type, tool, target }) => {
  axiom_spawn({
    prompt: `Create ${type} using ${tool} for ${target}. Include CI/CD configuration.`,
    verboseMasterMode: true
  });
});
```

### Recipe: Test Data Generation

```javascript
// Generate diverse test datasets
const datasets = [
  "User profiles with realistic names and addresses (1000 records)",
  "E-commerce products with descriptions and prices (500 items)",
  "Time-series sensor data for IoT testing (10k readings)",
  "Social media posts with comments and reactions (2000 posts)",
  "Financial transactions with various types (5000 records)"
];

datasets.forEach(dataset => {
  axiom_spawn({
    prompt: `Generate JSON dataset: ${dataset}. Make it realistic and diverse.`,
    verboseMasterMode: true
  });
});
```

## Refactoring Projects

### Recipe: Legacy Code Modernization

```javascript
// Refactor different aspects simultaneously
const refactorTasks = [
  "Convert callbacks to async/await in all API routes",
  "Replace var with const/let throughout codebase",
  "Extract magic numbers into named constants",
  "Split large functions (>50 lines) into smaller ones",
  "Add TypeScript types to all function parameters"
];

refactorTasks.forEach(task => {
  axiom_spawn({
    prompt: `Refactor task: ${task}. Maintain backward compatibility.`,
    verboseMasterMode: true
  });
});
```

### Recipe: Framework Migration

```javascript
// Migrate same app to different frameworks
const frameworks = [
  { from: "Express.js", to: "Fastify" },
  { from: "Express.js", to: "NestJS" },
  { from: "Express.js", to: "Koa" },
  { from: "Express.js", to: "Hapi" }
];

frameworks.forEach(({ from, to }) => {
  axiom_spawn({
    prompt: `Migrate REST API from ${from} to ${to}. Preserve all functionality and tests.`,
    verboseMasterMode: true
  });
});

// Choose best framework for your needs
```

## Documentation Tasks

### Recipe: Multi-Format Documentation

```javascript
// Generate docs in different formats
const docFormats = [
  "README.md with badges and examples",
  "API documentation with Swagger UI",
  "GitBook for user guide",
  "Docusaurus site for developers",
  "Video script for YouTube tutorial"
];

docFormats.forEach(format => {
  axiom_spawn({
    prompt: `Create ${format} for task management API. Include authentication, CRUD operations, and webhooks.`,
    verboseMasterMode: true
  });
});
```

### Recipe: Language Translations

```javascript
// Translate documentation to multiple languages
const languages = ["Spanish", "French", "German", "Japanese", "Portuguese"];

languages.forEach(lang => {
  axiom_spawn({
    prompt: `Translate README.md to ${lang}. Maintain technical accuracy and code examples.`,
    verboseMasterMode: true
  });
});
```

## Performance Optimization

### Recipe: Optimization Strategies

```javascript
// Try different optimization approaches
const optimizations = [
  "Add Redis caching layer to all GET endpoints",
  "Implement database connection pooling",
  "Add request/response compression",
  "Optimize images with Sharp library",
  "Implement lazy loading for React components",
  "Add service worker for offline support"
];

optimizations.forEach(optimization => {
  axiom_spawn({
    prompt: `Implement: ${optimization}. Measure before/after performance.`,
    verboseMasterMode: true
  });
});
```

### Recipe: Algorithm Optimization Contest

```javascript
// Parallel algorithm optimization
const problem = "Find all prime numbers up to 1 million";

const approaches = [
  "Sieve of Eratosthenes with bit array",
  "Segmented sieve for memory efficiency",
  "Parallel sieve using worker threads",
  "Wheel factorization optimization",
  "Cache-friendly blocked sieve"
];

approaches.forEach(approach => {
  axiom_spawn({
    prompt: `Implement '${problem}' using ${approach}. Include benchmarks.`,
    verboseMasterMode: true
  });
});

// May the fastest algorithm win!
```

## Advanced Patterns

### Recipe: A/B Testing Infrastructure

```javascript
// Build complete A/B testing system
const abComponents = [
  "Feature flag service with Redis",
  "Analytics collector for events",
  "Statistical analysis engine",
  "Admin dashboard with React",
  "SDK for JavaScript/Python/Go"
];

abComponents.forEach(component => {
  axiom_spawn({
    prompt: `Create ${component} for A/B testing platform. Include examples and tests.`,
    verboseMasterMode: true
  });
});
```

### Recipe: Real-time Collaboration

```javascript
// Build Google Docs clone components
const realtimeComponents = [
  "Operational Transform engine for text",
  "WebSocket server with Socket.io",
  "React editor with live cursors",
  "Conflict resolution algorithm",
  "Redis pubsub for scaling"
];

realtimeComponents.forEach(component => {
  axiom_spawn({
    prompt: `Build ${component} for collaborative editor. Handle edge cases.`,
    verboseMasterMode: true
  });
});
```

## Tips for Maximum Efficiency

1. **Batch Similar Tasks**: Group similar operations for better context
2. **Use Clear Naming**: Help each agent understand its specific role
3. **Monitor Progress**: Watch verbose output to catch issues early
4. **Verify Output**: Always check that files were created successfully
5. **Iterate Quickly**: Use parallel execution to explore options fast

## Performance Benchmarks

| Recipe Type | Sequential Time | Parallel Time | Speedup |
|------------|----------------|---------------|---------|
| Web App | 2 hours | 30 minutes | 4x |
| Microservices | 5 hours | 45 minutes | 6.7x |
| Test Suite | 3 hours | 30 minutes | 6x |
| Documentation | 2 hours | 20 minutes | 6x |
| Refactoring | 4 hours | 40 minutes | 6x |

## Conclusion

These recipes demonstrate the power of parallel execution in Axiom. By running multiple agents simultaneously, you can:

- **Explore Options**: Try different approaches at once
- **Save Time**: Complete projects in minutes instead of hours
- **Increase Quality**: Generate multiple solutions and pick the best
- **Stay Productive**: Never wait for sequential tasks again

Remember: With Axiom, the limit is your imagination, not your time.