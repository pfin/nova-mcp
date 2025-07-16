# Axiom Orchestration Patterns

> **Advanced patterns** for orchestrating multiple Claude instances with sophisticated coordination and communication strategies.

## Table of Contents

- [Core Orchestration Concepts](#core-orchestration-concepts)
- [Communication Patterns](#communication-patterns)
- [Coordination Strategies](#coordination-strategies)
- [Advanced Patterns](#advanced-patterns)
- [Error Handling & Recovery](#error-handling--recovery)
- [Performance Patterns](#performance-patterns)
- [Real-World Architectures](#real-world-architectures)

## Core Orchestration Concepts

### The Orchestration Hierarchy

```
┌─────────────────────────────────────┐
│        Master Orchestrator          │
├─────────────────────────────────────┤
│  • Spawns and manages instances     │
│  • Routes tasks to workers          │
│  • Monitors global progress         │
│  • Handles failures and retries     │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┬──────────────┐
    ▼                     ▼              ▼
┌─────────┐         ┌─────────┐    ┌─────────┐
│Worker 1 │         │Worker 2 │    │Worker 3 │
│"Backend"│         │"Frontend"│   │"Database"│
└─────────┘         └─────────┘    └─────────┘
```

### Instance Lifecycle Management

```javascript
class InstanceManager {
  constructor() {
    this.instances = new Map();
    this.taskQueue = [];
  }

  async spawnInstance(id, role) {
    const instance = await axiom_claude_orchestrate({
      action: "spawn",
      instanceId: id
    });
    
    this.instances.set(id, {
      id,
      role,
      status: "idle",
      tasksCompleted: 0,
      startTime: Date.now()
    });
    
    return instance;
  }

  async assignTask(instanceId, task) {
    const instance = this.instances.get(instanceId);
    instance.status = "working";
    
    await axiom_claude_orchestrate({
      action: "prompt",
      instanceId,
      prompt: task
    });
  }

  async checkHealth() {
    for (const [id, instance] of this.instances) {
      const status = await axiom_claude_orchestrate({
        action: "status",
        instanceId: id
      });
      
      if (status === "error") {
        await this.restartInstance(id);
      }
    }
  }
}
```

## Communication Patterns

### 1. Pipeline Pattern

Sequential processing with data handoff:

```javascript
async function pipelinePattern() {
  const stages = [
    { id: "analyzer", task: "Analyze requirements from requirements.md" },
    { id: "designer", task: "Create system design based on analysis" },
    { id: "implementer", task: "Implement code based on design" },
    { id: "tester", task: "Write tests for implementation" },
    { id: "documenter", task: "Document the code and API" }
  ];

  let previousOutput = null;

  for (const stage of stages) {
    // Spawn instance
    await axiom_claude_orchestrate({
      action: "spawn",
      instanceId: stage.id
    });

    // Create prompt with context from previous stage
    const prompt = previousOutput 
      ? `${stage.task}\n\nContext from previous stage:\n${previousOutput}`
      : stage.task;

    // Execute stage
    await axiom_claude_orchestrate({
      action: "prompt",
      instanceId: stage.id,
      prompt
    });

    // Wait for completion and get output
    await waitForCompletion(stage.id);
    
    previousOutput = await axiom_claude_orchestrate({
      action: "get_output",
      instanceId: stage.id,
      lines: 100
    });
  }
}
```

### 2. Broadcast Pattern

One-to-many communication:

```javascript
async function broadcastPattern() {
  // Create announcement instance
  await axiom_claude_orchestrate({
    action: "spawn",
    instanceId: "architect"
  });

  // Architect creates the design
  await axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "architect",
    prompt: "Create microservices architecture design for e-commerce platform"
  });

  // Wait for design completion
  await waitForCompletion("architect");

  // Get the design
  const design = await axiom_claude_orchestrate({
    action: "get_output",
    instanceId: "architect",
    lines: 200
  });

  // Broadcast to all implementers
  const services = ["user", "product", "order", "payment", "notification"];
  
  for (const service of services) {
    await axiom_claude_orchestrate({
      action: "spawn",
      instanceId: `${service}-dev`
    });

    await axiom_claude_orchestrate({
      action: "prompt",
      instanceId: `${service}-dev`,
      prompt: `Implement ${service} service based on this architecture:\n\n${design}`
    });
  }
}
```

### 3. Pub/Sub Pattern

Event-driven communication:

```javascript
class EventBus {
  constructor() {
    this.subscribers = new Map();
    this.eventQueue = [];
  }

  subscribe(event, instanceId) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event).push(instanceId);
  }

  async publish(event, data) {
    const subscribers = this.subscribers.get(event) || [];
    
    for (const instanceId of subscribers) {
      await axiom_claude_orchestrate({
        action: "prompt",
        instanceId,
        prompt: `Event: ${event}\nData: ${JSON.stringify(data)}\n\nProcess this event accordingly.`
      });
    }
  }
}

// Usage
const eventBus = new EventBus();

// Subscribers register for events
eventBus.subscribe("code-complete", "tester");
eventBus.subscribe("code-complete", "reviewer");
eventBus.subscribe("tests-passed", "deployer");

// Publisher triggers events
await eventBus.publish("code-complete", {
  file: "user-service.js",
  author: "backend-dev",
  timestamp: Date.now()
});
```

### 4. Request/Response Pattern

Synchronous communication between instances:

```javascript
async function requestResponsePattern() {
  // Create service instances
  const services = ["database", "cache", "auth"];
  
  for (const service of services) {
    await axiom_claude_orchestrate({
      action: "spawn",
      instanceId: service
    });
  }

  // API Gateway makes requests to services
  await axiom_claude_orchestrate({
    action: "spawn",
    instanceId: "api-gateway"
  });

  // Gateway requests data from database
  await axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "api-gateway",
    prompt: "Create getUserById function that queries the database service"
  });

  // Database service responds
  await axiom_claude_orchestrate({
    action: "prompt",
    instanceId: "database",
    prompt: "Implement database query handler for getUserById requests"
  });
}
```

## Coordination Strategies

### 1. Leader Election Pattern

```javascript
class LeaderElection {
  constructor(instances) {
    this.instances = instances;
    this.leader = null;
  }

  async electLeader() {
    // Simple election: instance with most completed tasks
    let maxTasks = 0;
    let elected = null;

    for (const instance of this.instances) {
      const status = await axiom_claude_orchestrate({
        action: "status",
        instanceId: instance.id
      });
      
      if (status.tasksCompleted > maxTasks) {
        maxTasks = status.tasksCompleted;
        elected = instance;
      }
    }

    this.leader = elected;
    await this.notifyElection();
  }

  async notifyElection() {
    // Notify all instances about the new leader
    for (const instance of this.instances) {
      await axiom_claude_orchestrate({
        action: "prompt",
        instanceId: instance.id,
        prompt: `New leader elected: ${this.leader.id}. Follow leader's coordination.`
      });
    }
  }
}
```

### 2. Work Stealing Pattern

```javascript
class WorkStealingScheduler {
  constructor() {
    this.taskQueues = new Map();
    this.instances = new Map();
  }

  async balanceLoad() {
    // Find overloaded and idle instances
    const loads = await this.getInstanceLoads();
    const overloaded = loads.filter(l => l.queueSize > 5);
    const idle = loads.filter(l => l.queueSize === 0);

    // Steal work from overloaded instances
    for (const idleInstance of idle) {
      for (const busyInstance of overloaded) {
        if (busyInstance.queueSize > 1) {
          // Steal half the tasks
          const tasksToSteal = Math.floor(busyInstance.queueSize / 2);
          const stolenTasks = this.taskQueues
            .get(busyInstance.id)
            .splice(0, tasksToSteal);

          // Assign to idle instance
          for (const task of stolenTasks) {
            await this.assignTask(idleInstance.id, task);
          }
        }
      }
    }
  }

  async assignTask(instanceId, task) {
    await axiom_claude_orchestrate({
      action: "prompt",
      instanceId,
      prompt: task
    });
  }
}
```

### 3. Consensus Pattern

```javascript
class ConsensusManager {
  async proposeChange(proposal) {
    const instances = ["reviewer-1", "reviewer-2", "reviewer-3"];
    const votes = new Map();

    // Spawn reviewers
    for (const id of instances) {
      await axiom_claude_orchestrate({
        action: "spawn",
        instanceId: id
      });
    }

    // Request votes
    for (const id of instances) {
      await axiom_claude_orchestrate({
        action: "prompt",
        instanceId: id,
        prompt: `Review and vote on this proposal:\n${proposal}\n\nRespond with APPROVE or REJECT and reasoning.`
      });
    }

    // Collect votes
    for (const id of instances) {
      const output = await axiom_claude_orchestrate({
        action: "get_output",
        instanceId: id,
        lines: 50
      });
      
      const vote = output.includes("APPROVE") ? "APPROVE" : "REJECT";
      votes.set(id, vote);
    }

    // Check consensus (majority wins)
    const approvals = Array.from(votes.values()).filter(v => v === "APPROVE").length;
    return approvals > instances.length / 2;
  }
}
```

## Advanced Patterns

### 1. Circuit Breaker Pattern

Prevent cascading failures:

```javascript
class CircuitBreaker {
  constructor(instanceId, threshold = 3) {
    this.instanceId = instanceId;
    this.failureCount = 0;
    this.threshold = threshold;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = null;
  }

  async execute(task) {
    if (this.state === "OPEN") {
      // Check if we should try again
      if (Date.now() - this.lastFailureTime > 60000) { // 1 minute
        this.state = "HALF_OPEN";
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.instanceId}`);
      }
    }

    try {
      const result = await axiom_claude_orchestrate({
        action: "prompt",
        instanceId: this.instanceId,
        prompt: task
      });

      // Success - reset failure count
      if (this.state === "HALF_OPEN") {
        this.state = "CLOSED";
      }
      this.failureCount = 0;
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold) {
        this.state = "OPEN";
        console.log(`Circuit breaker OPEN for ${this.instanceId}`);
      }

      throw error;
    }
  }
}
```

### 2. Saga Pattern

Distributed transactions with compensation:

```javascript
class SagaOrchestrator {
  constructor() {
    this.steps = [];
    this.compensations = [];
  }

  addStep(step, compensation) {
    this.steps.push(step);
    this.compensations.push(compensation);
  }

  async execute() {
    const completed = [];

    try {
      // Execute all steps
      for (let i = 0; i < this.steps.length; i++) {
        const result = await this.steps[i]();
        completed.push(i);
      }

      return { success: true };
    } catch (error) {
      // Rollback in reverse order
      console.log("Saga failed, executing compensations...");
      
      for (let i = completed.length - 1; i >= 0; i--) {
        try {
          await this.compensations[completed[i]]();
        } catch (compError) {
          console.error(`Compensation ${i} failed:`, compError);
        }
      }

      return { success: false, error };
    }
  }
}

// Usage example
const orderSaga = new SagaOrchestrator();

orderSaga.addStep(
  async () => {
    // Reserve inventory
    return await axiom_claude_orchestrate({
      action: "prompt",
      instanceId: "inventory-service",
      prompt: "Reserve 2 units of product SKU-123"
    });
  },
  async () => {
    // Compensation: Release inventory
    return await axiom_claude_orchestrate({
      action: "prompt",
      instanceId: "inventory-service",
      prompt: "Release reservation for 2 units of product SKU-123"
    });
  }
);

orderSaga.addStep(
  async () => {
    // Charge payment
    return await axiom_claude_orchestrate({
      action: "prompt",
      instanceId: "payment-service",
      prompt: "Charge $99.99 to customer card"
    });
  },
  async () => {
    // Compensation: Refund payment
    return await axiom_claude_orchestrate({
      action: "prompt",
      instanceId: "payment-service",
      prompt: "Refund $99.99 to customer"
    });
  }
);
```

### 3. Map-Reduce Pattern

Distributed computation:

```javascript
class MapReduceOrchestrator {
  async execute(data, mapFunction, reduceFunction) {
    const chunks = this.partition(data, 4); // 4 workers
    const mappers = [];

    // Map phase - parallel processing
    for (let i = 0; i < chunks.length; i++) {
      const mapperId = `mapper-${i}`;
      
      await axiom_claude_orchestrate({
        action: "spawn",
        instanceId: mapperId
      });

      mappers.push(
        axiom_claude_orchestrate({
          action: "prompt",
          instanceId: mapperId,
          prompt: `Apply this map function to data:\n${mapFunction}\n\nData:\n${JSON.stringify(chunks[i])}`
        })
      );
    }

    // Wait for all mappers
    await Promise.all(mappers);

    // Collect mapper outputs
    const mapResults = [];
    for (let i = 0; i < chunks.length; i++) {
      const output = await axiom_claude_orchestrate({
        action: "get_output",
        instanceId: `mapper-${i}`,
        lines: 100
      });
      mapResults.push(output);
    }

    // Reduce phase
    await axiom_claude_orchestrate({
      action: "spawn",
      instanceId: "reducer"
    });

    const finalResult = await axiom_claude_orchestrate({
      action: "prompt",
      instanceId: "reducer",
      prompt: `Apply reduce function to these results:\n${reduceFunction}\n\nResults:\n${mapResults.join('\n')}`
    });

    return finalResult;
  }

  partition(data, numPartitions) {
    const size = Math.ceil(data.length / numPartitions);
    const partitions = [];
    
    for (let i = 0; i < data.length; i += size) {
      partitions.push(data.slice(i, i + size));
    }
    
    return partitions;
  }
}
```

## Error Handling & Recovery

### 1. Retry with Exponential Backoff

```javascript
class RetryManager {
  async executeWithRetry(instanceId, task, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await axiom_claude_orchestrate({
          action: "prompt",
          instanceId,
          prompt: task
        });
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError}`);
  }
}
```

### 2. Bulkhead Pattern

Isolate failures:

```javascript
class BulkheadManager {
  constructor(maxConcurrentPerType) {
    this.limits = maxConcurrentPerType;
    this.active = new Map();
  }

  async execute(type, instanceId, task) {
    // Check if bulkhead is full
    const currentActive = this.active.get(type) || 0;
    
    if (currentActive >= this.limits[type]) {
      throw new Error(`Bulkhead full for type: ${type}`);
    }

    // Increment active count
    this.active.set(type, currentActive + 1);

    try {
      const result = await axiom_claude_orchestrate({
        action: "prompt",
        instanceId,
        prompt: task
      });
      
      return result;
    } finally {
      // Decrement active count
      this.active.set(type, (this.active.get(type) || 1) - 1);
    }
  }
}

// Usage
const bulkhead = new BulkheadManager({
  "critical": 2,
  "normal": 5,
  "batch": 10
});
```

## Performance Patterns

### 1. Caching Layer

```javascript
class OrchestrationCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 300000; // 5 minutes
  }

  getCacheKey(instanceId, prompt) {
    return `${instanceId}:${prompt.substring(0, 50)}`;
  }

  async executeWithCache(instanceId, prompt) {
    const key = this.getCacheKey(instanceId, prompt);
    const cached = this.cache.get(key);

    // Check if cached and not expired
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log("Cache hit!");
      return cached.result;
    }

    // Execute and cache
    const result = await axiom_claude_orchestrate({
      action: "prompt",
      instanceId,
      prompt
    });

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });

    return result;
  }
}
```

### 2. Load Balancer

```javascript
class LoadBalancer {
  constructor(instances) {
    this.instances = instances;
    this.currentIndex = 0;
    this.instanceLoads = new Map();
  }

  // Round-robin selection
  getRoundRobin() {
    const instance = this.instances[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.instances.length;
    return instance;
  }

  // Least connections selection
  async getLeastConnections() {
    let minLoad = Infinity;
    let selected = null;

    for (const instance of this.instances) {
      const load = this.instanceLoads.get(instance) || 0;
      if (load < minLoad) {
        minLoad = load;
        selected = instance;
      }
    }

    return selected;
  }

  async execute(task, strategy = "round-robin") {
    const instance = strategy === "round-robin" 
      ? this.getRoundRobin() 
      : await this.getLeastConnections();

    // Track load
    const currentLoad = this.instanceLoads.get(instance) || 0;
    this.instanceLoads.set(instance, currentLoad + 1);

    try {
      const result = await axiom_claude_orchestrate({
        action: "prompt",
        instanceId: instance,
        prompt: task
      });
      
      return result;
    } finally {
      // Decrease load
      const load = this.instanceLoads.get(instance) || 1;
      this.instanceLoads.set(instance, load - 1);
    }
  }
}
```

## Real-World Architectures

### 1. Microservices Architecture

```javascript
class MicroservicesOrchestrator {
  async deployFullStack() {
    // 1. Deploy infrastructure services
    const infra = ["service-discovery", "api-gateway", "message-broker"];
    
    for (const service of infra) {
      await this.deployService(service, `Create ${service} with health checks and monitoring`);
    }

    // 2. Deploy business services
    const business = [
      { name: "user-service", deps: [] },
      { name: "auth-service", deps: ["user-service"] },
      { name: "product-service", deps: [] },
      { name: "order-service", deps: ["user-service", "product-service"] },
      { name: "payment-service", deps: ["order-service"] }
    ];

    // Deploy respecting dependencies
    await this.deployWithDependencies(business);

    // 3. Deploy support services
    const support = ["logging-service", "monitoring-service", "backup-service"];
    
    await Promise.all(
      support.map(service => 
        this.deployService(service, `Create ${service} integrated with all business services`)
      )
    );
  }

  async deployService(name, prompt) {
    await axiom_claude_orchestrate({
      action: "spawn",
      instanceId: name
    });

    await axiom_claude_orchestrate({
      action: "prompt",
      instanceId: name,
      prompt: `${prompt}. Include Dockerfile, K8s manifests, and tests.`
    });
  }

  async deployWithDependencies(services) {
    const deployed = new Set();

    const deployService = async (service) => {
      // Wait for dependencies
      for (const dep of service.deps) {
        if (!deployed.has(dep)) {
          const depService = services.find(s => s.name === dep);
          await deployService(depService);
        }
      }

      // Deploy this service
      if (!deployed.has(service.name)) {
        await this.deployService(
          service.name, 
          `Create ${service.name} microservice with REST API`
        );
        deployed.add(service.name);
      }
    };

    // Deploy all services
    for (const service of services) {
      await deployService(service);
    }
  }
}
```

### 2. Event-Driven Architecture

```javascript
class EventDrivenOrchestrator {
  constructor() {
    this.eventStore = [];
    this.projections = new Map();
  }

  async setupEventDrivenSystem() {
    // 1. Create event producers
    const producers = [
      { id: "order-producer", events: ["OrderCreated", "OrderUpdated", "OrderCancelled"] },
      { id: "user-producer", events: ["UserRegistered", "UserUpdated", "UserDeleted"] },
      { id: "payment-producer", events: ["PaymentProcessed", "PaymentFailed", "RefundIssued"] }
    ];

    for (const producer of producers) {
      await axiom_claude_orchestrate({
        action: "spawn",
        instanceId: producer.id
      });

      await axiom_claude_orchestrate({
        action: "prompt",
        instanceId: producer.id,
        prompt: `Create event producer that emits: ${producer.events.join(", ")}. Use EventStore pattern.`
      });
    }

    // 2. Create event processors
    const processors = [
      { id: "email-processor", handles: ["OrderCreated", "UserRegistered", "PaymentProcessed"] },
      { id: "inventory-processor", handles: ["OrderCreated", "OrderCancelled"] },
      { id: "analytics-processor", handles: "*" } // Handles all events
    ];

    for (const processor of processors) {
      await axiom_claude_orchestrate({
        action: "spawn",
        instanceId: processor.id
      });

      const eventsDesc = processor.handles === "*" ? "all events" : processor.handles.join(", ");
      
      await axiom_claude_orchestrate({
        action: "prompt",
        instanceId: processor.id,
        prompt: `Create event processor that handles: ${eventsDesc}. Implement idempotency and error handling.`
      });
    }

    // 3. Create projections
    await this.createProjections();
  }

  async createProjections() {
    const projections = [
      { id: "order-view", query: "Current order status by aggregating all order events" },
      { id: "user-activity", query: "User activity timeline from all user-related events" },
      { id: "revenue-report", query: "Revenue projections from payment events" }
    ];

    for (const projection of projections) {
      await axiom_claude_orchestrate({
        action: "spawn",
        instanceId: projection.id
      });

      await axiom_claude_orchestrate({
        action: "prompt",
        instanceId: projection.id,
        prompt: `Create CQRS projection: ${projection.query}. Read from event store and maintain materialized view.`
      });
    }
  }
}
```

## Best Practices

1. **Instance Naming**: Use descriptive IDs that indicate role and purpose
2. **Error Boundaries**: Implement circuit breakers and bulkheads
3. **Monitoring**: Track instance health and performance metrics
4. **Resource Limits**: Set appropriate concurrency limits
5. **Graceful Degradation**: Design for partial failures
6. **Testing**: Include chaos engineering scenarios

## Conclusion

These orchestration patterns enable sophisticated multi-agent systems that can:

- **Scale**: Handle complex projects with many moving parts
- **Resilient**: Recover from failures automatically
- **Efficient**: Maximize parallel execution
- **Flexible**: Adapt to changing requirements
- **Observable**: Provide insights into system behavior

By combining these patterns, you can build robust, scalable systems that leverage the full power of parallel AI execution.