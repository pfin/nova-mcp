# Axiom Technical Specification

*Building the Self-Evident Truth in Quantitative Finance*

## System Architecture

### Core Philosophy
Axiom combines the computational rigor of QuantLib with the elegant simplicity of rateslib, creating a modern quantitative finance library optimized for relative value trading.

### Design Principles
1. **Automatic Differentiation First** - Every calculation returns values and sensitivities
2. **Event-Driven Architecture** - Real-time market data drives all updates
3. **Strategy-Centric Design** - Built around how traders actually work
4. **Cloud-Native Performance** - WebAssembly + Workers for scalability
5. **Memory-Aware Construction** - Learning from past losses to prevent future ones

## Core Components

### 1. Dual Number System (Automatic Differentiation)
```javascript
class Dual {
    constructor(value, derivatives = {}) {
        this.value = value;
        this.derivatives = derivatives;
    }
    
    // Arithmetic operations preserve derivatives
    add(other) {
        const newDerivatives = {};
        const allKeys = new Set([...Object.keys(this.derivatives), ...Object.keys(other.derivatives)]);
        
        for (const key of allKeys) {
            newDerivatives[key] = (this.derivatives[key] || 0) + (other.derivatives[key] || 0);
        }
        
        return new Dual(this.value + other.value, newDerivatives);
    }
    
    multiply(other) {
        const newDerivatives = {};
        const allKeys = new Set([...Object.keys(this.derivatives), ...Object.keys(other.derivatives)]);
        
        for (const key of allKeys) {
            newDerivatives[key] = 
                (this.derivatives[key] || 0) * other.value + 
                this.value * (other.derivatives[key] || 0);
        }
        
        return new Dual(this.value * other.value, newDerivatives);
    }
    
    exp() {
        const expValue = Math.exp(this.value);
        const newDerivatives = {};
        
        for (const [key, deriv] of Object.entries(this.derivatives)) {
            newDerivatives[key] = deriv * expValue;
        }
        
        return new Dual(expValue, newDerivatives);
    }
}
```

### 2. Curve Construction Engine
```javascript
class Curve {
    constructor(nodes, options = {}) {
        this.nodes = nodes;  // Map<Date, Dual>
        this.interpolation = options.interpolation || 'logLinear';
        this.id = options.id;
        this.dayCounter = options.dayCounter || new Actual360();
    }
    
    // All methods return Dual numbers
    discountFactor(date) {
        if (this.nodes.has(date)) {
            return this.nodes.get(date);
        }
        
        // Interpolate between surrounding nodes
        const [before, after] = this.findSurroundingNodes(date);
        return this.interpolate(before, after, date);
    }
    
    forwardRate(startDate, endDate, compounding = 'Continuous') {
        const df1 = this.discountFactor(startDate);
        const df2 = this.discountFactor(endDate);
        const time = this.dayCounter.yearFraction(startDate, endDate);
        
        switch (compounding) {
            case 'Continuous':
                return df1.divide(df2).log().divide(new Dual(time));
            case 'Simple':
                return df1.divide(df2).subtract(new Dual(1)).divide(new Dual(time));
            case 'Compounded':
                return df1.divide(df2).pow(new Dual(1/time)).subtract(new Dual(1));
        }
    }
    
    bump(bumpSize = 0.0001) {
        // Returns new curve with all nodes bumped
        const bumpedNodes = new Map();
        for (const [date, df] of this.nodes) {
            bumpedNodes.set(date, df.multiply(new Dual(1 + bumpSize)));
        }
        return new Curve(bumpedNodes, { ...this.options });
    }
}
```

### 3. Instrument Framework
```javascript
class Instrument {
    constructor(options) {
        this.options = options;
        this.curves = options.curves;  // Can be string ID or Curve object
    }
    
    // Core methods all instruments must implement
    npv() { throw new Error('Must implement npv()'); }
    fairRate() { throw new Error('Must implement fairRate()'); }
    
    // Greeks come from automatic differentiation
    delta() {
        const npv = this.npv();
        return npv.derivatives;
    }
    
    gamma() {
        // Second-order derivatives
        const delta = this.delta();
        const gamma = {};
        
        for (const [key1, d1] of Object.entries(delta)) {
            gamma[key1] = {};
            for (const [key2, d2] of Object.entries(delta)) {
                gamma[key1][key2] = this.calculateCrossGamma(key1, key2);
            }
        }
        
        return gamma;
    }
    
    theta() {
        // Time decay - roll curve forward 1 day
        const curve = this.getCurve();
        const rolledCurve = curve.roll(1);
        const currentNPV = this.npv();
        const tomorrowNPV = this.withCurve(rolledCurve).npv();
        
        return tomorrowNPV.subtract(currentNPV);
    }
}

class InterestRateSwap extends Instrument {
    constructor(options) {
        super(options);
        this.startDate = options.startDate;
        this.maturityDate = options.maturityDate;
        this.notional = options.notional || 1000000;
        this.fixedRate = options.fixedRate;
        this.floatingIndex = options.floatingIndex || 'SOFR';
        this.paymentFrequency = options.frequency || 'Quarterly';
    }
    
    npv() {
        const schedule = this.generateSchedule();
        let npv = new Dual(0);
        
        for (const period of schedule) {
            // Fixed leg
            const fixedPayment = this.notional * this.fixedRate * period.accrualFraction;
            const fixedPV = new Dual(fixedPayment).multiply(
                this.curves.discountFactor(period.paymentDate)
            );
            
            // Floating leg
            const forwardRate = this.curves.forwardRate(
                period.startDate, 
                period.endDate,
                'Simple'
            );
            const floatingPayment = this.notional.multiply(forwardRate).multiply(
                new Dual(period.accrualFraction)
            );
            const floatingPV = floatingPayment.multiply(
                this.curves.discountFactor(period.paymentDate)
            );
            
            npv = npv.add(floatingPV).subtract(fixedPV);
        }
        
        return npv;
    }
    
    fairRate() {
        // Rate that makes NPV = 0
        const floatingLegPV = this.calculateFloatingLegPV();
        const annuity = this.calculateAnnuity();
        
        return floatingLegPV.divide(annuity);
    }
}
```

### 4. Strategy Framework
```javascript
class Strategy {
    constructor(market, config = {}) {
        this.market = market;
        this.config = config;
        this.positions = [];
        this.limits = config.limits || {};
        
        // Risk monitoring
        this.maxDV01 = config.maxDV01 || 1000000;
        this.maxVaR = config.maxVaR || 5000000;
        this.stressTests = config.stressTests || this.defaultStressTests();
    }
    
    // Abstract methods strategies must implement
    analyze() { throw new Error('Must implement analyze()'); }
    generateSignals() { throw new Error('Must implement generateSignals()'); }
    constructTrade(signal) { throw new Error('Must implement constructTrade()'); }
    
    // Common functionality
    execute(trade) {
        // Pre-trade checks
        if (!this.checkLimits(trade)) {
            throw new Error('Trade violates risk limits');
        }
        
        // Guardian Protocol integration
        if (!this.guardianProtocol.approve(trade)) {
            throw new Error('Guardian Protocol blocked trade');
        }
        
        // Execute
        const execution = this.executionEngine.execute(trade);
        this.positions.push(execution);
        
        // Post-trade
        this.updateRisk();
        this.logTrade(execution);
        
        return execution;
    }
    
    getRisk() {
        const risk = {
            dv01: new Dual(0),
            gamma: {},
            vega: new Dual(0),
            theta: new Dual(0)
        };
        
        for (const position of this.positions) {
            risk.dv01 = risk.dv01.add(position.instrument.delta());
            risk.theta = risk.theta.add(position.instrument.theta());
            // Aggregate other Greeks...
        }
        
        return risk;
    }
    
    checkLimits(trade) {
        const currentRisk = this.getRisk();
        const tradeRisk = trade.instrument.delta();
        
        // Check DV01 limit
        const totalDV01 = currentRisk.dv01.add(tradeRisk);
        if (Math.abs(totalDV01.value) > this.maxDV01) {
            console.warn(`DV01 limit breach: ${totalDV01.value} > ${this.maxDV01}`);
            return false;
        }
        
        // Check VaR limit
        const var95 = this.calculateVaR(0.95);
        if (var95 > this.maxVaR) {
            console.warn(`VaR limit breach: ${var95} > ${this.maxVaR}`);
            return false;
        }
        
        return true;
    }
}
```

### 5. Market Data Integration
```javascript
class MarketDataManager {
    constructor() {
        this.curves = new Map();
        this.surfaces = new Map();
        this.quotes = new Map();
        this.subscribers = new Map();
    }
    
    // Bloomberg integration
    async connectBloomberg() {
        this.bloomberg = new BloombergAPI({
            host: 'localhost',
            port: 8194
        });
        
        await this.bloomberg.connect();
        
        // Set up subscriptions
        this.bloomberg.on('data', (msg) => {
            this.handleMarketData(msg);
        });
    }
    
    handleMarketData(msg) {
        const { ticker, field, value } = msg;
        
        // Update quote
        const quote = this.quotes.get(ticker);
        if (quote) {
            quote.setValue(value);
            
            // Notify subscribers
            const subscribers = this.subscribers.get(ticker) || [];
            for (const callback of subscribers) {
                callback(ticker, value);
            }
        }
        
        // Trigger curve rebuilds if needed
        this.rebuildAffectedCurves(ticker);
    }
    
    subscribe(ticker, callback) {
        if (!this.subscribers.has(ticker)) {
            this.subscribers.set(ticker, []);
            
            // Subscribe via Bloomberg
            this.bloomberg.subscribe(ticker, ['LAST_PRICE', 'BID', 'ASK']);
        }
        
        this.subscribers.get(ticker).push(callback);
    }
}
```

### 6. Guardian Protocol Integration
```javascript
class GuardianProtocol {
    constructor(config) {
        this.config = config;
        this.patterns = this.loadDangerousPatterns();
        this.biometrics = new BiometricMonitor();
        this.alerts = new AlertSystem();
    }
    
    approve(trade) {
        const risks = this.assessRisks();
        
        // Check for $6M pattern
        if (this.detectDangerousPattern(risks)) {
            this.alerts.critical('Dangerous pattern detected - blocking trade');
            return false;
        }
        
        // Check biometrics
        const bioState = this.biometrics.getCurrentState();
        if (bioState.fatigue > 0.8 || bioState.stress > 0.9) {
            this.alerts.warning('High fatigue/stress detected');
            
            // Reduce position size
            if (trade.notional > 50000000) {
                this.alerts.critical('Large trade blocked due to biometric state');
                return false;
            }
        }
        
        return true;
    }
    
    detectDangerousPattern(risks) {
        // The $6M pattern
        if (risks.medicalStress && risks.highExposure && risks.fatigue) {
            return true;
        }
        
        // Other patterns...
        return false;
    }
}
```

## Performance Optimizations

### 1. Web Workers for Parallel Computation
```javascript
class ParallelEngine {
    constructor(numWorkers = navigator.hardwareConcurrency) {
        this.workers = [];
        this.taskQueue = [];
        
        // Initialize workers
        for (let i = 0; i < numWorkers; i++) {
            const worker = new Worker('axiom-worker.js');
            worker.onmessage = this.handleResult.bind(this);
            this.workers.push(worker);
        }
    }
    
    async calculateScenarios(scenarios) {
        const promises = scenarios.map(scenario => 
            this.submitTask('calculateScenario', scenario)
        );
        
        return Promise.all(promises);
    }
}
```

### 2. Smart Caching
```javascript
class CurveCache {
    constructor(maxSize = 1000) {
        this.cache = new LRUCache(maxSize);
        this.dependencies = new Map();
    }
    
    get(date, curveId) {
        const key = `${curveId}:${date.toISOString()}`;
        return this.cache.get(key);
    }
    
    set(date, curveId, value) {
        const key = `${curveId}:${date.toISOString()}`;
        this.cache.set(key, value);
    }
    
    invalidate(curveId) {
        // Invalidate all cache entries for this curve
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${curveId}:`)) {
                this.cache.delete(key);
            }
        }
    }
}
```

## Deployment Architecture

### 1. Development Environment
```bash
# Clone repository
git clone https://github.com/axiom-finance/axiom.git

# Install dependencies
npm install

# Run tests
npm test

# Build for production
npm run build
```

### 2. Production Deployment
```yaml
# docker-compose.yml
version: '3.8'
services:
  axiom-api:
    image: axiom-finance/axiom:latest
    ports:
      - "3000:3000"
    environment:
      - BLOOMBERG_HOST=bloomberg-server
      - REDIS_URL=redis://cache:6379
    
  bloomberg-bridge:
    image: axiom-finance/bloomberg-bridge:latest
    ports:
      - "8194:8194"
    
  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### 3. Excel Integration
```javascript
// PyXLL configuration for Excel
@xl_func("object curve, float date: float")
def axiom_discount_factor(curve_id, date):
    curve = axiom.getCurve(curve_id)
    return curve.discountFactor(date).value

@xl_func("object curve, float start_date, float end_date: float")
def axiom_forward_rate(curve_id, start_date, end_date):
    curve = axiom.getCurve(curve_id)
    return curve.forwardRate(start_date, end_date).value

@xl_RTD
class AxiomRTD(RTDServer):
    def __init__(self):
        super().__init__()
        self.axiom = AxiomConnection()
    
    def connect(self):
        self.axiom.subscribe(self.on_update)
    
    def on_update(self, topic, value):
        self.update(topic, value)
```

## Testing Strategy

### 1. Unit Tests
```javascript
describe('Dual Numbers', () => {
    test('addition preserves derivatives', () => {
        const a = new Dual(3, { x: 1 });
        const b = new Dual(4, { y: 1 });
        const c = a.add(b);
        
        expect(c.value).toBe(7);
        expect(c.derivatives.x).toBe(1);
        expect(c.derivatives.y).toBe(1);
    });
    
    test('multiplication chain rule', () => {
        const a = new Dual(3, { x: 1 });
        const b = new Dual(4, { x: 2 });
        const c = a.multiply(b);
        
        expect(c.value).toBe(12);
        expect(c.derivatives.x).toBe(10); // 3*2 + 4*1
    });
});
```

### 2. Strategy Backtests
```javascript
describe('Treasury Basis Strategy', () => {
    test('identifies positive carry trades', async () => {
        const historical = await loadHistoricalData('2020-2024');
        const strategy = new TreasuryBasis();
        
        const results = await strategy.backtest(historical);
        
        expect(results.sharpe).toBeGreaterThan(1.0);
        expect(results.maxDrawdown).toBeLessThan(0.05);
    });
});
```

### 3. Risk Validation
```javascript
describe('Risk Calculations', () => {
    test('DV01 matches finite difference', () => {
        const swap = new InterestRateSwap({ /* ... */ });
        
        // Automatic differentiation
        const dv01_ad = swap.delta();
        
        // Finite difference
        const dv01_fd = calculateFiniteDifference(swap);
        
        expect(Math.abs(dv01_ad - dv01_fd)).toBeLessThan(0.01);
    });
});
```

## Security Considerations

### 1. API Security
- JWT authentication for all endpoints
- Rate limiting per user/strategy
- Encrypted communication (TLS 1.3)
- Audit logging for all trades

### 2. Data Protection
- Encryption at rest for sensitive data
- PII handling compliance
- GDPR/CCPA compliance
- Regular security audits

### 3. Trading Safeguards
- Pre-trade compliance checks
- Position limits enforcement
- Fat finger prevention
- Kill switches for emergencies

## Future Roadmap

### Q3 2025
- [ ] Core library implementation
- [ ] Basic strategy framework
- [ ] Bloomberg integration
- [ ] Initial testing with paper trading

### Q4 2025
- [ ] Advanced strategies
- [ ] Excel add-in
- [ ] Risk dashboard
- [ ] Production pilot with select users

### Q1 2026
- [ ] Full production release
- [ ] Cloud deployment options
- [ ] Mobile monitoring app
- [ ] API marketplace

### Q2 2026
- [ ] Machine learning integration
- [ ] Advanced analytics
- [ ] Regulatory reporting
- [ ] Enterprise features

---

*"Building the future of quantitative finance, one axiom at a time"*

Technical Specification v1.0
July 4, 2025