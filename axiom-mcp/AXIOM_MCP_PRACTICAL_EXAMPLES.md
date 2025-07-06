# Axiom MCP Practical Examples & Use Cases

## Overview

This document provides practical examples of how to effectively use Axiom MCP despite its limitations. Each example shows the actual commands, outputs, and how to bridge the gap to working code.

## Example 1: Building a Trading Strategy

### Step 1: Use Axiom MCP for Analysis

```javascript
axiom_mcp_goal({
  goal: "Design a butterfly spread trading strategy that automatically calculates DV01-neutral weights",
  context: "Need to trade 2Y-5Y-10Y butterfly on US Treasury curve with proper risk weighting",
  depth: "deep"
})
```

**Axiom Output** (abbreviated):
```
1. Goal Analysis:
   - Core requirement: DV01-neutral butterfly spread
   - Key components: Weight calculation, risk neutrality
   - Market: US Treasury curve

2. Clarifying Questions:
   - What's your execution platform? (Bloomberg/custom?)
   - Real-time or end-of-day calculations?
   - Include convexity adjustments?

3. Success Criteria:
   ✓ Net DV01 < $100 per $10mm notional
   ✓ Automated weight calculation
   ✓ Handle curve shape changes

4. Implementation Approach:
   - Calculate individual leg DV01s
   - Solve for neutral weights
   - Monitor and rebalance
```

### Step 2: Manual Implementation Based on Analysis

```javascript
// Actual implementation based on Axiom's analysis
class ButterflyStrategy {
  constructor(curve) {
    this.curve = curve;
    this.tenors = ['2Y', '5Y', '10Y'];
  }

  calculateDV01(tenor, notional = 10_000_000) {
    const shift = 0.0001; // 1bp
    const basePrice = this.priceSwap(tenor, notional);
    const shiftedPrice = this.priceSwap(tenor, notional, shift);
    return shiftedPrice - basePrice;
  }

  calculateWeights() {
    // Based on Axiom's DV01-neutral requirement
    const dv01s = this.tenors.map(t => this.calculateDV01(t));
    
    // Solve: w1*DV01_1 + w2*DV01_2 + w3*DV01_3 = 0
    // With: w1 + w3 = -w2 (butterfly constraint)
    const w2 = -2;
    const w1 = (w2 * dv01s[1]) / (dv01s[0] - dv01s[2]);
    const w3 = -w2 - w1;
    
    return [w1, w2, w3];
  }
}
```

## Example 2: System Architecture Design

### Step 1: Axiom MCP for Architecture

```javascript
axiom_mcp_spawn({
  parentPrompt: "Design real-time market data pipeline for options trading",
  spawnPattern: "decompose",
  spawnCount: 4,
  maxDepth: 2
})
```

**Axiom Output Structure**:
```
Main Task: Market Data Pipeline
├── Data Ingestion Layer
│   ├── WebSocket connections
│   └── REST API fallback
├── Processing Layer
│   ├── Data normalization
│   └── Greeks calculation
├── Storage Layer
│   ├── Time-series DB
│   └── Cache strategy
└── Distribution Layer
    ├── Client WebSocket
    └── REST endpoints
```

### Step 2: Implementation Blueprint

```javascript
// Transform Axiom's architecture into code structure
const MarketDataPipeline = {
  // Based on Axiom's decomposition
  ingestion: {
    websocket: new WebSocketManager({
      providers: ['deribit', 'okex'],
      reconnectStrategy: 'exponential'
    }),
    rest: new RestFallback({
      timeout: 5000,
      retries: 3
    })
  },
  
  processing: {
    normalizer: new DataNormalizer({
      schema: 'unified_options_v2'
    }),
    calculator: new GreeksCalculator({
      model: 'black_scholes',
      vol_surface: 'sabr'
    })
  },
  
  // ... rest of implementation
};
```

## Example 3: Complex Problem Solving

### Problem: Multi-Asset Portfolio Optimization

```javascript
// Use MCTS for exploring solution space
axiom_mcp_spawn_mcts({
  parentPrompt: "Optimize multi-asset portfolio with constraints: max 40% equities, min 20% bonds, ESG score > 7",
  mctsConfig: {
    maxIterations: 20,
    explorationConstant: 1.4,
    simulationMode: "mixed"
  }
})
```

**Axiom MCTS Exploration**:
```
Best path found:
1. Mean-Variance Optimization base
2. Add ESG constraints as linear constraints  
3. Use quadratic programming solver
4. Implement rebalancing triggers
```

### Manual Implementation:

```javascript
// Based on Axiom's MCTS recommendation
class ESGPortfolioOptimizer {
  constructor(constraints) {
    this.constraints = constraints;
    this.solver = new QuadraticProgrammingSolver();
  }

  optimize(assets, esgScores) {
    // Implement mean-variance with ESG constraints
    const objective = this.buildObjective(assets);
    const constraints = [
      ...this.assetClassConstraints(),
      ...this.esgConstraints(esgScores)
    ];
    
    return this.solver.solve(objective, constraints);
  }
}
```

## Example 4: Debugging Assistance

### Using Axiom for Problem Analysis

```javascript
axiom_mcp_goal({
  goal: "Debug why yield curve bootstrapping fails with negative forward rates",
  context: "Using log-linear interpolation on discount factors, getting negative 3M-6M forwards",
  depth: "standard"
})
```

**Axiom Analysis Points**:
1. Log-linear on discount factors can create arbitrage
2. Check input data for inverted curve segments
3. Consider linear interpolation on log(DF) instead
4. Verify day count conventions match

### Investigation Code:

```javascript
// Based on Axiom's debugging hints
function debugYieldCurve(curve) {
  // Check 1: Input data quality
  const inversions = findInversions(curve.inputs);
  
  // Check 2: Interpolation method impact
  const methods = ['linear', 'log_linear', 'cubic'];
  const results = methods.map(m => {
    const testCurve = new Curve(curve.inputs, m);
    return checkArbitrage(testCurve);
  });
  
  // Check 3: Day count impact
  const conventions = ['ACT/360', 'ACT/365', '30/360'];
  // ... test each
}
```

## Example 5: API Design

### Axiom for API Planning

```javascript
axiom_mcp_goal({
  goal: "Design REST API for quantitative trading system",
  context: "Need to support real-time prices, historical data, trade execution, and risk metrics",
  depth: "deep"
})
```

**Axiom's Structured Output**:
```
Endpoints:
/v1/prices
  - GET: Real-time prices
  - WebSocket upgrade available
  
/v1/historical
  - GET: OHLCV data
  - Query params: resolution, start, end
  
/v1/trades
  - POST: Execute trade
  - GET: Trade history
  
/v1/risk
  - GET: Portfolio metrics
  - Streaming updates via SSE
```

### OpenAPI Implementation:

```yaml
# Based on Axiom's design
openapi: 3.0.0
info:
  title: Quant Trading API
  version: 1.0.0

paths:
  /v1/prices:
    get:
      summary: Get real-time prices
      parameters:
        - name: symbols
          in: query
          schema:
            type: array
            items:
              type: string
      responses:
        200:
          description: Current prices
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Prices'
```

## Best Practices

### 1. Effective Prompting

**Good:**
```javascript
axiom_mcp_goal({
  goal: "Design cache strategy for market data with 1ms latency requirement",
  context: "Redis available, 100k requests/sec, 50GB data",
  depth: "standard"
})
```

**Better:**
```javascript
axiom_mcp_goal({
  goal: "Design cache strategy for market data",
  context: `Requirements:
    - 1ms p99 latency
    - 100k requests/sec
    - 50GB hot data
    - Redis cluster available
    - Must handle tick-by-tick updates
    - Failover needed`,
  depth: "deep"
})
```

### 2. Chaining Operations

```javascript
// First: High-level design
const architecture = await axiom_mcp_goal({
  goal: "Design options market making system",
  depth: "standard"
});

// Then: Detailed components
const components = await axiom_mcp_spawn({
  parentPrompt: "Detail each component of the market making system",
  spawnPattern: "decompose",
  spawnCount: 5
});

// Finally: Risk analysis
const risks = await axiom_mcp_goal({
  goal: "Identify technical and market risks in the system",
  context: architecture + components
});
```

### 3. Combining with Other Tools

```javascript
// Step 1: Axiom for analysis
const analysis = await axiom_mcp_analyze("Complex problem");

// Step 2: Task tool for code search
const examples = await task_search("Find similar implementations");

// Step 3: Combine insights
const implementation = combineInsights(analysis, examples);
```

## Common Pitfalls to Avoid

### ❌ Don't Expect Code
```javascript
// This will NOT produce working code
axiom_mcp_goal({
  goal: "Write a function to calculate Black-Scholes price"
})
// Output: Analysis and approach, but no code
```

### ❌ Don't Use for Simple Tasks
```javascript
// Overkill for simple problems
axiom_mcp_spawn_mcts({
  parentPrompt: "Add two numbers"
})
// Just write: const sum = a + b;
```

### ❌ Don't Ignore the Analysis
```javascript
// Axiom provides valuable insights - use them!
const analysis = await axiom_mcp_goal({...});
// DON'T: Ignore output and code from scratch
// DO: Implement based on the structured analysis
```

## Conclusion

Axiom MCP is a powerful **thinking tool**, not a coding tool. Use it to:
- Break down complex problems
- Explore solution spaces
- Design architectures
- Debug tricky issues
- Plan implementations

Then use traditional coding methods to build what Axiom helped you design.

---

*Remember: Axiom MCP + Your Implementation = Success*