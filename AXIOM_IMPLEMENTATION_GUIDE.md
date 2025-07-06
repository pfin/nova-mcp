# Axiom Implementation Guide

*From Vision to Production*

## Getting Started

### Prerequisites
- Node.js 18+ (for JavaScript implementation)
- Python 3.9+ (for Python bindings)
- Bloomberg Terminal (for market data)
- Excel with PyXLL or custom RTD support

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/axiom-finance/axiom.git
cd axiom

# Install dependencies
npm install

# Run tests
npm test

# Build for production
npm run build
```

## Core Implementation Steps

### Step 1: Dual Number System
```javascript
// axiom-core/src/dual.js
export class Dual {
    constructor(value, derivatives = {}) {
        this.value = value;
        this.derivatives = Object.freeze({ ...derivatives });
    }
    
    static variable(value, name) {
        return new Dual(value, { [name]: 1 });
    }
    
    // Basic operations
    add(other) {
        if (!(other instanceof Dual)) {
            other = new Dual(other);
        }
        
        const derivatives = {};
        const allVars = new Set([
            ...Object.keys(this.derivatives),
            ...Object.keys(other.derivatives)
        ]);
        
        for (const v of allVars) {
            derivatives[v] = (this.derivatives[v] || 0) + (other.derivatives[v] || 0);
        }
        
        return new Dual(this.value + other.value, derivatives);
    }
    
    multiply(other) {
        if (!(other instanceof Dual)) {
            other = new Dual(other);
        }
        
        const derivatives = {};
        const allVars = new Set([
            ...Object.keys(this.derivatives),
            ...Object.keys(other.derivatives)
        ]);
        
        // Product rule: d(uv) = u'v + uv'
        for (const v of allVars) {
            derivatives[v] = 
                (this.derivatives[v] || 0) * other.value +
                this.value * (other.derivatives[v] || 0);
        }
        
        return new Dual(this.value * other.value, derivatives);
    }
    
    // More operations...
    divide(other) {
        if (!(other instanceof Dual)) {
            other = new Dual(other);
        }
        
        const derivatives = {};
        const allVars = new Set([
            ...Object.keys(this.derivatives),
            ...Object.keys(other.derivatives)
        ]);
        
        // Quotient rule: d(u/v) = (u'v - uv')/v²
        for (const v of allVars) {
            derivatives[v] = (
                (this.derivatives[v] || 0) * other.value -
                this.value * (other.derivatives[v] || 0)
            ) / (other.value * other.value);
        }
        
        return new Dual(this.value / other.value, derivatives);
    }
    
    pow(n) {
        const derivatives = {};
        
        // Power rule: d(u^n) = n * u^(n-1) * u'
        for (const [v, d] of Object.entries(this.derivatives)) {
            derivatives[v] = n * Math.pow(this.value, n - 1) * d;
        }
        
        return new Dual(Math.pow(this.value, n), derivatives);
    }
    
    exp() {
        const expVal = Math.exp(this.value);
        const derivatives = {};
        
        // d(e^u) = e^u * u'
        for (const [v, d] of Object.entries(this.derivatives)) {
            derivatives[v] = expVal * d;
        }
        
        return new Dual(expVal, derivatives);
    }
    
    log() {
        const derivatives = {};
        
        // d(ln(u)) = u'/u
        for (const [v, d] of Object.entries(this.derivatives)) {
            derivatives[v] = d / this.value;
        }
        
        return new Dual(Math.log(this.value), derivatives);
    }
}
```

### Step 2: Date and Calendar System
```javascript
// axiom-core/src/time/date.js
export class AxiomDate {
    constructor(year, month, day) {
        this.year = year;
        this.month = month;
        this.day = day;
        this._serial = this.toSerial();
    }
    
    static fromSerial(serial) {
        // Excel-compatible serial number conversion
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + serial * 86400000);
        return new AxiomDate(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
        );
    }
    
    toSerial() {
        const date = new Date(this.year, this.month - 1, this.day);
        const excelEpoch = new Date(1899, 11, 30);
        return Math.floor((date - excelEpoch) / 86400000);
    }
    
    addDays(days) {
        return AxiomDate.fromSerial(this._serial + days);
    }
    
    addMonths(months) {
        let year = this.year;
        let month = this.month + months;
        
        while (month > 12) {
            month -= 12;
            year++;
        }
        while (month < 1) {
            month += 12;
            year--;
        }
        
        // Handle end-of-month
        const lastDay = new Date(year, month, 0).getDate();
        const day = Math.min(this.day, lastDay);
        
        return new AxiomDate(year, month, day);
    }
}

// axiom-core/src/time/calendar.js
export class Calendar {
    constructor(name) {
        this.name = name;
        this.holidays = new Set();
    }
    
    isBusinessDay(date) {
        // Weekend check
        const jsDate = new Date(date.year, date.month - 1, date.day);
        const dayOfWeek = jsDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) return false;
        
        // Holiday check
        return !this.holidays.has(date.toSerial());
    }
    
    advance(date, days, convention = 'ModifiedFollowing') {
        let result = date.addDays(days);
        
        switch (convention) {
            case 'Following':
                while (!this.isBusinessDay(result)) {
                    result = result.addDays(1);
                }
                break;
                
            case 'ModifiedFollowing':
                const original = result;
                while (!this.isBusinessDay(result)) {
                    result = result.addDays(1);
                }
                // If we crossed month boundary, go backward instead
                if (result.month !== original.month) {
                    result = original;
                    while (!this.isBusinessDay(result)) {
                        result = result.addDays(-1);
                    }
                }
                break;
                
            case 'Preceding':
                while (!this.isBusinessDay(result)) {
                    result = result.addDays(-1);
                }
                break;
        }
        
        return result;
    }
}

// Pre-built calendars
export const TARGET = new Calendar('TARGET');
export const NYSE = new Calendar('NYSE');
export const LONDON = new Calendar('LONDON');
```

### Step 3: Curve Building
```javascript
// axiom-core/src/curves/curve.js
export class YieldCurve {
    constructor(nodes, options = {}) {
        this.nodes = new Map(nodes); // Map<Date, Dual>
        this.interpolation = options.interpolation || 'logLinear';
        this.dayCounter = options.dayCounter || new Actual360();
        this.id = options.id;
        
        // Sort nodes by date
        this.sortedDates = Array.from(this.nodes.keys())
            .sort((a, b) => a.toSerial() - b.toSerial());
    }
    
    discountFactor(date) {
        const serial = date.toSerial();
        
        // Exact match
        if (this.nodes.has(date)) {
            return this.nodes.get(date);
        }
        
        // Find surrounding nodes
        let leftIdx = 0;
        let rightIdx = this.sortedDates.length - 1;
        
        for (let i = 0; i < this.sortedDates.length - 1; i++) {
            if (this.sortedDates[i].toSerial() <= serial && 
                this.sortedDates[i + 1].toSerial() > serial) {
                leftIdx = i;
                rightIdx = i + 1;
                break;
            }
        }
        
        const leftDate = this.sortedDates[leftIdx];
        const rightDate = this.sortedDates[rightIdx];
        const leftDF = this.nodes.get(leftDate);
        const rightDF = this.nodes.get(rightDate);
        
        // Interpolate
        return this.interpolate(
            leftDate, leftDF,
            rightDate, rightDF,
            date
        );
    }
    
    interpolate(date1, df1, date2, df2, targetDate) {
        const t1 = this.dayCounter.yearFraction(this.sortedDates[0], date1);
        const t2 = this.dayCounter.yearFraction(this.sortedDates[0], date2);
        const t = this.dayCounter.yearFraction(this.sortedDates[0], targetDate);
        
        switch (this.interpolation) {
            case 'linear':
                // Linear on discount factors
                const alpha = (t - t1) / (t2 - t1);
                return df1.multiply(1 - alpha).add(df2.multiply(alpha));
                
            case 'logLinear':
                // Log-linear on discount factors
                const logDF1 = df1.log();
                const logDF2 = df2.log();
                const alpha2 = (t - t1) / (t2 - t1);
                const logDF = logDF1.multiply(1 - alpha2).add(logDF2.multiply(alpha2));
                return logDF.exp();
                
            case 'cubic':
                // Natural cubic spline
                return this.cubicSpline(date1, df1, date2, df2, targetDate);
                
            default:
                throw new Error(`Unknown interpolation: ${this.interpolation}`);
        }
    }
    
    forwardRate(startDate, endDate, compounding = 'Continuous') {
        const df1 = this.discountFactor(startDate);
        const df2 = this.discountFactor(endDate);
        const time = this.dayCounter.yearFraction(startDate, endDate);
        const timeDual = new Dual(time);
        
        switch (compounding) {
            case 'Continuous':
                // r = -ln(df2/df1) / t
                return df1.divide(df2).log().divide(timeDual).multiply(-1);
                
            case 'Simple':
                // r = (df1/df2 - 1) / t
                return df1.divide(df2).add(-1).divide(timeDual);
                
            case 'Compounded':
                // r = (df1/df2)^(1/t) - 1
                return df1.divide(df2).pow(1/time).add(-1);
                
            default:
                throw new Error(`Unknown compounding: ${compounding}`);
        }
    }
    
    zeroRate(date, compounding = 'Continuous') {
        return this.forwardRate(this.sortedDates[0], date, compounding);
    }
}
```

### Step 4: Instrument Implementations
```javascript
// axiom-core/src/instruments/swap.js
export class InterestRateSwap {
    constructor(options) {
        this.startDate = options.startDate;
        this.maturityDate = options.maturityDate;
        this.notional = options.notional || 1000000;
        this.fixedRate = options.fixedRate;
        this.frequency = options.frequency || 'Quarterly';
        this.dayCounter = options.dayCounter || new Actual360();
        this.calendar = options.calendar || TARGET;
        this.convention = options.convention || 'ModifiedFollowing';
        this.curves = options.curves; // YieldCurve or curve ID
    }
    
    generateSchedule() {
        const schedule = [];
        let currentDate = this.startDate;
        
        const monthsPerPeriod = {
            'Annual': 12,
            'Semiannual': 6,
            'Quarterly': 3,
            'Monthly': 1
        }[this.frequency];
        
        while (currentDate.toSerial() < this.maturityDate.toSerial()) {
            const nextDate = currentDate.addMonths(monthsPerPeriod);
            const adjustedNext = this.calendar.advance(nextDate, 0, this.convention);
            
            // Don't go past maturity
            const endDate = adjustedNext.toSerial() > this.maturityDate.toSerial() 
                ? this.maturityDate 
                : adjustedNext;
            
            schedule.push({
                startDate: currentDate,
                endDate: endDate,
                paymentDate: endDate,
                accrualFraction: this.dayCounter.yearFraction(currentDate, endDate)
            });
            
            currentDate = endDate;
        }
        
        return schedule;
    }
    
    npv() {
        const schedule = this.generateSchedule();
        const curve = this.getCurve();
        
        let fixedLegPV = new Dual(0);
        let floatingLegPV = new Dual(0);
        
        for (const period of schedule) {
            const df = curve.discountFactor(period.paymentDate);
            
            // Fixed leg
            const fixedCashflow = new Dual(this.notional * this.fixedRate * period.accrualFraction);
            fixedLegPV = fixedLegPV.add(fixedCashflow.multiply(df));
            
            // Floating leg
            const forwardRate = curve.forwardRate(
                period.startDate,
                period.endDate,
                'Simple'
            );
            const floatingCashflow = new Dual(this.notional * period.accrualFraction)
                .multiply(forwardRate);
            floatingLegPV = floatingLegPV.add(floatingCashflow.multiply(df));
        }
        
        // Return floating - fixed (receive floating, pay fixed)
        return floatingLegPV.add(fixedLegPV.multiply(-1));
    }
    
    fairRate() {
        const schedule = this.generateSchedule();
        const curve = this.getCurve();
        
        let annuity = new Dual(0);
        let floatingLegPV = new Dual(0);
        
        for (const period of schedule) {
            const df = curve.discountFactor(period.paymentDate);
            
            // Annuity (sum of discounted accrual fractions)
            annuity = annuity.add(
                new Dual(period.accrualFraction).multiply(df)
            );
            
            // Floating leg PV
            const forwardRate = curve.forwardRate(
                period.startDate,
                period.endDate,
                'Simple'
            );
            const floatingCashflow = new Dual(this.notional * period.accrualFraction)
                .multiply(forwardRate);
            floatingLegPV = floatingLegPV.add(floatingCashflow.multiply(df));
        }
        
        // Fair rate = Floating Leg PV / Annuity
        return floatingLegPV.divide(new Dual(this.notional).multiply(annuity));
    }
    
    dv01() {
        const npv = this.npv();
        // Sum all rate sensitivities
        let totalDV01 = 0;
        for (const [variable, sensitivity] of Object.entries(npv.derivatives)) {
            if (variable.startsWith('rate_')) {
                totalDV01 += sensitivity;
            }
        }
        return totalDV01 * 0.0001; // Convert to basis point sensitivity
    }
    
    getCurve() {
        if (typeof this.curves === 'string') {
            return Axiom.Market.getCurve(this.curves);
        }
        return this.curves;
    }
}
```

### Step 5: Strategy Implementation Example
```javascript
// axiom-strategies/src/butterfly.js
export class ButterflyStrategy extends Strategy {
    constructor(market, config = {}) {
        super(market, config);
        this.tenors = config.tenors || ['2Y', '5Y', '10Y'];
        this.curve = config.curve || 'SOFR';
        this.notional = config.notional || 100000000; // $100mm
        this.weights = null;
        this.historical = [];
    }
    
    analyze() {
        // Create swaps
        const swaps = this.tenors.map(tenor => 
            new InterestRateSwap({
                startDate: this.market.valuationDate,
                maturityDate: this.market.valuationDate.addYears(parseInt(tenor)),
                notional: this.notional,
                fixedRate: 0, // Will use fair rate
                curves: this.curve
            })
        );
        
        // Calculate DV01-neutral weights if not provided
        if (!this.weights) {
            this.weights = this.calculateDV01NeutralWeights(swaps);
        }
        
        // Calculate spread
        const rates = swaps.map(s => s.fairRate());
        const spread = this.weights.reduce((sum, w, i) => 
            sum.add(rates[i].multiply(w)), new Dual(0)
        ).multiply(10000); // Convert to bps
        
        // Calculate risk metrics
        const risk = {
            spread: spread.value,
            dv01: this.calculateNetDV01(swaps),
            gamma: this.calculateGamma(swaps),
            carry: this.calculateCarry(swaps),
            rollDown: this.calculateRollDown(swaps),
            zScore: this.calculateZScore(spread.value),
            percentile: this.calculatePercentile(spread.value),
            signal: this.generateSignal(spread.value)
        };
        
        // Store for historical analysis
        this.historical.push({
            date: this.market.valuationDate,
            spread: spread.value,
            risk
        });
        
        return risk;
    }
    
    calculateDV01NeutralWeights(swaps) {
        const dv01s = swaps.map(s => s.dv01());
        
        // Standard butterfly: middle leg = 2
        const w2 = 2;
        
        // Solve for w1 and w3 such that:
        // w1 * dv01_1 + w2 * dv01_2 + w3 * dv01_3 = 0
        // w1 + w3 = -w2
        
        const ratio = dv01s[1] / (dv01s[0] + dv01s[2]);
        const w1 = -w2 * ratio * (dv01s[2] / (dv01s[0] + dv01s[2]));
        const w3 = -w2 - w1;
        
        return [w1, w2, w3];
    }
    
    calculateZScore(currentSpread) {
        if (this.historical.length < 20) return 0;
        
        const recentSpreads = this.historical
            .slice(-20)
            .map(h => h.spread);
        
        const mean = recentSpreads.reduce((a, b) => a + b) / recentSpreads.length;
        const variance = recentSpreads
            .map(s => Math.pow(s - mean, 2))
            .reduce((a, b) => a + b) / recentSpreads.length;
        const stdDev = Math.sqrt(variance);
        
        return (currentSpread - mean) / stdDev;
    }
    
    generateSignal(currentSpread) {
        const zScore = this.calculateZScore(currentSpread);
        
        if (Math.abs(zScore) < 1.0) return 'HOLD';
        
        if (zScore > 2.0) return 'SELL'; // Rich, expect to revert
        if (zScore < -2.0) return 'BUY';  // Cheap, expect to revert
        
        if (zScore > 1.5) return 'SELL_SMALL';
        if (zScore < -1.5) return 'BUY_SMALL';
        
        return 'HOLD';
    }
    
    constructTrade(signal) {
        if (signal === 'HOLD') return null;
        
        const direction = signal.startsWith('BUY') ? 1 : -1;
        const size = signal.includes('SMALL') ? 0.5 : 1.0;
        
        const trades = this.tenors.map((tenor, i) => ({
            instrument: 'IRS',
            tenor,
            direction: direction * this.weights[i] * size,
            notional: Math.abs(this.notional * this.weights[i] * size),
            side: (direction * this.weights[i] > 0) ? 'PAY' : 'RECEIVE'
        }));
        
        return {
            strategy: 'BUTTERFLY',
            legs: trades,
            totalDV01: 0, // By construction
            expectedPnL: this.calculateExpectedPnL(signal)
        };
    }
    
    calculateExpectedPnL(signal) {
        // Based on historical mean reversion
        const currentZScore = this.calculateZScore(this.analyze().spread);
        const targetZScore = 0; // Mean reversion target
        const moveInStdDevs = targetZScore - currentZScore;
        
        // Historical daily volatility
        const dailyVol = this.calculateDailyVolatility();
        
        // Expected move over reversion period (typically 10-20 days)
        const reversionDays = 15;
        const expectedMove = moveInStdDevs * dailyVol * Math.sqrt(reversionDays);
        
        // Convert to PnL
        const positionDV01 = Math.abs(this.notional * 0.0001); // Approximate
        return expectedMove * positionDV01;
    }
}
```

### Step 6: Market Data Integration
```javascript
// axiom-market/src/bloomberg-adapter.js
export class BloombergAdapter {
    constructor(config = {}) {
        this.host = config.host || 'localhost';
        this.port = config.port || 8194;
        this.session = null;
        this.subscriptions = new Map();
        this.callbacks = new Map();
    }
    
    async connect() {
        const blpapi = await import('blpapi');
        
        this.session = new blpapi.Session({
            serverHost: this.host,
            serverPort: this.port
        });
        
        await this.session.start();
        
        // Open market data service
        await this.session.openService('//blp/mktdata');
        this.service = this.session.getService('//blp/mktdata');
        
        // Set up event handling
        this.session.on('SessionTerminated', () => {
            console.log('Bloomberg session terminated');
            this.reconnect();
        });
        
        this.session.on('MarketDataEvents', (event) => {
            this.handleMarketData(event);
        });
    }
    
    subscribe(ticker, fields, callback) {
        const subscriptions = [];
        
        if (!Array.isArray(fields)) {
            fields = [fields];
        }
        
        for (const field of fields) {
            const subscription = this.service.createSubscription(
                `${ticker} ${field}`,
                field,
                null,
                new blpapi.SubscriptionOptions()
            );
            
            subscriptions.push(subscription);
            this.callbacks.set(`${ticker}:${field}`, callback);
        }
        
        this.subscriptions.set(ticker, subscriptions);
        this.session.subscribe(subscriptions);
    }
    
    handleMarketData(event) {
        for (const message of event.data) {
            const topic = message.correlationId.value;
            const [ticker, field] = topic.split(':');
            
            if (message.data.hasElement(field)) {
                const value = message.data.getElement(field).getValue();
                const callback = this.callbacks.get(topic);
                
                if (callback) {
                    callback({
                        ticker,
                        field,
                        value,
                        timestamp: new Date()
                    });
                }
            }
        }
    }
    
    async getHistoricalData(ticker, field, startDate, endDate) {
        const request = this.service.createRequest('HistoricalDataRequest');
        
        request.set('securities', ticker);
        request.set('fields', field);
        request.set('startDate', startDate.format('YYYYMMDD'));
        request.set('endDate', endDate.format('YYYYMMDD'));
        request.set('periodicitySelection', 'DAILY');
        
        const response = await this.session.sendRequest(request);
        return this.parseHistoricalData(response);
    }
}

// axiom-market/src/market-manager.js
export class MarketManager {
    constructor() {
        this.curves = new Map();
        this.quotes = new Map();
        this.bloomberg = new BloombergAdapter();
        this.updateCallbacks = new Set();
    }
    
    async initialize() {
        await this.bloomberg.connect();
        await this.loadCurveDefinitions();
        await this.subscribeToMarketData();
    }
    
    async loadCurveDefinitions() {
        // SOFR curve definition
        this.curveDefinitions.set('SOFR', {
            instruments: [
                { ticker: 'SOFRRATE Index', tenor: 'ON', type: 'DEPO' },
                { ticker: 'USOSFR1Z Curncy', tenor: '1M', type: 'FUTURES' },
                { ticker: 'USOSFR2Z Curncy', tenor: '2M', type: 'FUTURES' },
                { ticker: 'USOSFR3Z Curncy', tenor: '3M', type: 'FUTURES' },
                { ticker: 'USSW2 Curncy', tenor: '2Y', type: 'SWAP' },
                { ticker: 'USSW5 Curncy', tenor: '5Y', type: 'SWAP' },
                { ticker: 'USSW10 Curncy', tenor: '10Y', type: 'SWAP' },
                { ticker: 'USSW30 Curncy', tenor: '30Y', type: 'SWAP' }
            ]
        });
    }
    
    async subscribeToMarketData() {
        for (const [curveName, definition] of this.curveDefinitions) {
            for (const instrument of definition.instruments) {
                this.bloomberg.subscribe(
                    instrument.ticker,
                    ['BID', 'ASK', 'LAST_PRICE'],
                    (data) => this.handleQuoteUpdate(curveName, instrument, data)
                );
            }
        }
    }
    
    handleQuoteUpdate(curveName, instrument, data) {
        // Update quote
        const quoteKey = `${curveName}:${instrument.tenor}`;
        const quote = this.quotes.get(quoteKey) || {};
        
        quote[data.field] = data.value;
        quote.timestamp = data.timestamp;
        this.quotes.set(quoteKey, quote);
        
        // Rebuild affected curves
        this.rebuildCurve(curveName);
        
        // Notify listeners
        for (const callback of this.updateCallbacks) {
            callback({
                type: 'QUOTE_UPDATE',
                curve: curveName,
                instrument: instrument.tenor,
                data
            });
        }
    }
    
    rebuildCurve(curveName) {
        const definition = this.curveDefinitions.get(curveName);
        const instruments = [];
        
        // Create rate helpers for each instrument
        for (const inst of definition.instruments) {
            const quote = this.quotes.get(`${curveName}:${inst.tenor}`);
            if (!quote) continue;
            
            const mid = (quote.BID + quote.ASK) / 2;
            
            // Create appropriate rate helper based on type
            let helper;
            switch (inst.type) {
                case 'DEPO':
                    helper = new DepositRateHelper({
                        rate: mid / 100,
                        tenor: inst.tenor,
                        settlement: 2,
                        calendar: TARGET,
                        convention: 'ModifiedFollowing',
                        dayCounter: new Actual360()
                    });
                    break;
                    
                case 'FUTURES':
                    helper = new FuturesRateHelper({
                        price: mid,
                        imm: this.getIMMDate(inst.tenor),
                        nMonths: 3,
                        calendar: TARGET,
                        convention: 'ModifiedFollowing',
                        dayCounter: new Actual360()
                    });
                    break;
                    
                case 'SWAP':
                    helper = new SwapRateHelper({
                        rate: mid / 100,
                        tenor: inst.tenor,
                        calendar: TARGET,
                        frequency: 'Semiannual',
                        convention: 'ModifiedFollowing',
                        dayCounter: new Thirty360(),
                        index: 'SOFR'
                    });
                    break;
            }
            
            instruments.push(helper);
        }
        
        // Bootstrap curve
        const curve = new YieldCurve(
            this.bootstrapCurve(instruments),
            { id: curveName }
        );
        
        this.curves.set(curveName, curve);
        
        // Notify update
        for (const callback of this.updateCallbacks) {
            callback({
                type: 'CURVE_UPDATE',
                curve: curveName,
                timestamp: new Date()
            });
        }
    }
    
    onUpdate(callback) {
        this.updateCallbacks.add(callback);
    }
}
```

### Step 7: Risk Management Integration
```javascript
// axiom-risk/src/guardian-protocol.js
export class GuardianProtocol {
    constructor(config = {}) {
        this.config = config;
        this.patterns = this.loadPatterns();
        this.alerts = [];
        this.blocked = 0;
        this.biometrics = null;
    }
    
    loadPatterns() {
        return {
            sixMillionPattern: {
                name: 'Six Million Dollar Loss Pattern',
                conditions: [
                    { type: 'medical_stress', threshold: 0.7 },
                    { type: 'position_size', threshold: 1000000 }, // $1M DV01
                    { type: 'fatigue', threshold: 0.8 },
                    { type: 'precision_required', threshold: 0.9 }
                ],
                action: 'BLOCK',
                message: 'Pattern matches $6M loss conditions - blocking trade'
            },
            
            griefTrade: {
                name: 'Grief Trading Pattern',
                conditions: [
                    { type: 'recent_loss', window: 30 }, // days
                    { type: 'unusual_size', multiplier: 2 },
                    { type: 'emotional_state', threshold: 0.8 }
                ],
                action: 'WARN',
                message: 'Emotional state detected - reduce position size'
            },
            
            protectorParadox: {
                name: 'Protector Paradox',
                conditions: [
                    { type: 'family_pressure', threshold: 0.7 },
                    { type: 'overtrading', threshold: 1.5 }, // vs normal
                    { type: 'risk_seeking', threshold: 0.8 }
                ],
                action: 'REDUCE',
                message: 'Overtrading to provide - reducing limits'
            },
            
            focusFragment: {
                name: 'Focus Fragmentation',
                conditions: [
                    { type: 'multitasking', count: 3 },
                    { type: 'interruptions', rate: 0.5 }, // per minute
                    { type: 'critical_trade', threshold: 0.9 }
                ],
                action: 'DELAY',
                message: 'Too many parallel tasks - delay execution'
            }
        };
    }
    
    async checkTrade(trade, context) {
        const assessment = {
            approved: true,
            warnings: [],
            modifications: [],
            score: 1.0
        };
        
        // Check each pattern
        for (const [patternName, pattern] of Object.entries(this.patterns)) {
            const match = await this.checkPattern(pattern, trade, context);
            
            if (match.triggered) {
                assessment.score *= (1 - match.severity);
                
                switch (pattern.action) {
                    case 'BLOCK':
                        assessment.approved = false;
                        assessment.warnings.push({
                            level: 'CRITICAL',
                            message: pattern.message,
                            pattern: patternName
                        });
                        this.blocked++;
                        break;
                        
                    case 'WARN':
                        assessment.warnings.push({
                            level: 'WARNING',
                            message: pattern.message,
                            pattern: patternName
                        });
                        break;
                        
                    case 'REDUCE':
                        const reduction = 0.5; // Reduce to 50%
                        assessment.modifications.push({
                            type: 'POSITION_SIZE',
                            factor: reduction,
                            reason: pattern.message
                        });
                        trade.notional *= reduction;
                        break;
                        
                    case 'DELAY':
                        assessment.modifications.push({
                            type: 'EXECUTION_DELAY',
                            seconds: 300, // 5 minute delay
                            reason: pattern.message
                        });
                        break;
                }
                
                // Log for analysis
                this.logPatternMatch(patternName, match, trade);
            }
        }
        
        // Record biometrics at trade time
        if (this.biometrics) {
            assessment.biometrics = await this.biometrics.snapshot();
        }
        
        return assessment;
    }
    
    async checkPattern(pattern, trade, context) {
        let conditionsMet = 0;
        let totalConditions = pattern.conditions.length;
        let severity = 0;
        
        for (const condition of pattern.conditions) {
            const result = await this.evaluateCondition(condition, trade, context);
            if (result.met) {
                conditionsMet++;
                severity += result.severity;
            }
        }
        
        return {
            triggered: conditionsMet === totalConditions,
            severity: severity / totalConditions,
            conditionsMet,
            totalConditions
        };
    }
    
    async evaluateCondition(condition, trade, context) {
        switch (condition.type) {
            case 'medical_stress':
                // Check calendar for medical events
                const medicalEvents = context.calendar
                    .getEvents('medical', -7, 7); // +/- 7 days
                return {
                    met: medicalEvents.length > 0,
                    severity: medicalEvents.length * 0.3
                };
                
            case 'position_size':
                const dv01 = Math.abs(trade.estimatedDV01());
                return {
                    met: dv01 > condition.threshold,
                    severity: Math.min(dv01 / condition.threshold - 1, 1)
                };
                
            case 'fatigue':
                if (!this.biometrics) return { met: false, severity: 0 };
                const fatigue = await this.biometrics.getFatigue();
                return {
                    met: fatigue > condition.threshold,
                    severity: (fatigue - condition.threshold) / (1 - condition.threshold)
                };
                
            case 'precision_required':
                // Complex trades require more precision
                const complexity = this.assessComplexity(trade);
                return {
                    met: complexity > condition.threshold,
                    severity: complexity
                };
                
            default:
                return { met: false, severity: 0 };
        }
    }
    
    assessComplexity(trade) {
        let score = 0;
        
        // Multi-leg trades are complex
        if (trade.legs && trade.legs.length > 2) {
            score += 0.3 * (trade.legs.length - 2);
        }
        
        // Cross-currency adds complexity
        if (trade.currencies && trade.currencies.length > 1) {
            score += 0.4;
        }
        
        // Options/volatility trades are complex
        if (trade.instrument.includes('Option') || trade.instrument.includes('Swaption')) {
            score += 0.5;
        }
        
        // Large notional adds pressure
        if (trade.notional > 1000000000) { // $1B
            score += 0.3;
        }
        
        return Math.min(score, 1);
    }
    
    logPatternMatch(patternName, match, trade) {
        const log = {
            timestamp: new Date(),
            pattern: patternName,
            severity: match.severity,
            trade: {
                instrument: trade.instrument,
                notional: trade.notional,
                dv01: trade.estimatedDV01()
            },
            biometrics: this.biometrics ? this.biometrics.snapshot() : null
        };
        
        // Store for later analysis
        this.alerts.push(log);
        
        // Send to monitoring system
        if (this.monitoring) {
            this.monitoring.send('guardian.pattern_match', log);
        }
    }
    
    getStatistics() {
        return {
            totalChecks: this.alerts.length + this.blocked,
            blocked: this.blocked,
            warnings: this.alerts.filter(a => a.severity > 0.5).length,
            patterns: Object.keys(this.patterns).map(p => ({
                name: p,
                matches: this.alerts.filter(a => a.pattern === p).length
            }))
        };
    }
}
```

## Excel Integration

### PyXLL Configuration
```python
# axiom_excel.py
from pyxll import xl_func, xl_macro, RTD, xl_app
import axiom
import asyncio
from datetime import datetime

# Initialize Axiom
market = axiom.MarketManager()
strategies = {}

@xl_func("string curve_id, date maturity_date: float", category="Axiom")
def axiom_discount_factor(curve_id, maturity_date):
    """Get discount factor from curve"""
    curve = market.get_curve(curve_id)
    if not curve:
        return f"#ERROR: Curve {curve_id} not found"
    
    df = curve.discount_factor(axiom.Date.from_excel(maturity_date))
    return df.value

@xl_func("string curve_id, date start_date, date end_date, string compounding: float", 
         category="Axiom")
def axiom_forward_rate(curve_id, start_date, end_date, compounding="Continuous"):
    """Calculate forward rate between two dates"""
    curve = market.get_curve(curve_id)
    if not curve:
        return f"#ERROR: Curve {curve_id} not found"
    
    rate = curve.forward_rate(
        axiom.Date.from_excel(start_date),
        axiom.Date.from_excel(end_date),
        compounding
    )
    return rate.value * 100  # Return as percentage

@xl_func("date start_date, date maturity_date, float notional, float fixed_rate, "
         "string curve_id, string frequency: float",
         category="Axiom")
def axiom_swap_npv(start_date, maturity_date, notional, fixed_rate, 
                   curve_id, frequency="Quarterly"):
    """Calculate swap NPV"""
    swap = axiom.InterestRateSwap({
        'start_date': axiom.Date.from_excel(start_date),
        'maturity_date': axiom.Date.from_excel(maturity_date),
        'notional': notional,
        'fixed_rate': fixed_rate / 100,  # Convert from percentage
        'curves': curve_id,
        'frequency': frequency
    })
    
    return swap.npv().value

@xl_func("string strategy_type, string curve_id, string tenors, float notional: object",
         category="Axiom Strategies")
def axiom_analyze_strategy(strategy_type, curve_id, tenors, notional):
    """Analyze relative value strategy"""
    
    tenor_list = [t.strip() for t in tenors.split(',')]
    
    if strategy_type.upper() == "BUTTERFLY":
        strategy = axiom.ButterflyStrategy(market, {
            'curve': curve_id,
            'tenors': tenor_list,
            'notional': notional
        })
    else:
        return f"#ERROR: Unknown strategy {strategy_type}"
    
    analysis = strategy.analyze()
    
    # Return as array for Excel
    return [
        ["Spread (bps)", analysis['spread']],
        ["DV01", analysis['dv01']],
        ["Gamma", analysis['gamma']],
        ["Carry", analysis['carry']],
        ["Z-Score", analysis['z_score']],
        ["Signal", analysis['signal']]
    ]

# Real-time data
class AxiomRTD(RTD):
    """Real-time data server for Axiom"""
    
    def __init__(self):
        super().__init__()
        self._subscriptions = {}
        
    async def connect(self):
        """Connect to market data"""
        await market.initialize()
        market.on_update(self._handle_update)
        
    def _handle_update(self, update):
        """Handle market data updates"""
        if update['type'] == 'CURVE_UPDATE':
            # Update all subscriptions for this curve
            for topic, sub in self._subscriptions.items():
                if sub['curve'] == update['curve']:
                    self.update(topic)
        
    def topic_value(self, topic):
        """Get value for topic"""
        parts = topic.split('|')
        if len(parts) != 3:
            return "#ERROR: Invalid topic"
        
        data_type, curve_id, param = parts
        
        if data_type == "CURVE":
            curve = market.get_curve(curve_id)
            if not curve:
                return f"#ERROR: Curve {curve_id} not found"
            
            if param.startswith("DF:"):
                date = axiom.Date.from_string(param[3:])
                return curve.discount_factor(date).value
            elif param.startswith("ZERO:"):
                date = axiom.Date.from_string(param[5:])
                return curve.zero_rate(date).value * 100
            elif param.startswith("FWD:"):
                dates = param[4:].split('-')
                start = axiom.Date.from_string(dates[0])
                end = axiom.Date.from_string(dates[1])
                return curve.forward_rate(start, end).value * 100
        
        return "#ERROR: Unknown topic type"

# Register RTD
axiom_rtd = AxiomRTD()

@xl_macro
def axiom_connect():
    """Connect to Axiom market data"""
    xl_app().StatusBar = "Connecting to Axiom..."
    asyncio.run(axiom_rtd.connect())
    xl_app().StatusBar = "Axiom connected"

@xl_macro
def axiom_run_guardian_check():
    """Run Guardian Protocol check on current positions"""
    guardian = axiom.GuardianProtocol()
    
    # Get positions from Excel
    positions_range = xl_app().Range("Positions")
    
    results = []
    for row in positions_range.Rows:
        trade = {
            'instrument': row.Cells(1).Value,
            'notional': row.Cells(2).Value,
            'dv01': row.Cells(3).Value
        }
        
        assessment = guardian.check_trade(trade, {
            'calendar': market.calendar,
            'biometrics': None  # Would connect to real biometrics
        })
        
        results.append([
            trade['instrument'],
            assessment['approved'],
            assessment['score'],
            '; '.join([w['message'] for w in assessment['warnings']])
        ])
    
    # Write results
    xl_app().Range("GuardianResults").Value = results
```

## Testing Framework

### Integration Tests
```javascript
// tests/integration/strategy-test.js
import { describe, test, expect, beforeAll } from '@jest/globals';
import { MarketManager, ButterflyStrategy } from '../src';

describe('Butterfly Strategy Integration', () => {
    let market;
    let strategy;
    
    beforeAll(async () => {
        market = new MarketManager();
        await market.loadTestData('2024-01-01', '2024-07-01');
        
        strategy = new ButterflyStrategy(market, {
            curve: 'SOFR',
            tenors: ['2Y', '5Y', '10Y'],
            notional: 100000000
        });
    });
    
    test('calculates DV01-neutral weights correctly', () => {
        const analysis = strategy.analyze();
        
        // Total DV01 should be near zero
        expect(Math.abs(analysis.dv01)).toBeLessThan(100);
        
        // Weights should sum to zero
        const weightSum = strategy.weights.reduce((a, b) => a + b, 0);
        expect(Math.abs(weightSum)).toBeLessThan(0.01);
    });
    
    test('generates appropriate signals', () => {
        // Test with different market conditions
        const scenarios = [
            { spread: 25, expectedSignal: 'SELL' },      // 2.5 std dev
            { spread: 15, expectedSignal: 'SELL_SMALL' }, // 1.5 std dev
            { spread: 5, expectedSignal: 'HOLD' },        // 0.5 std dev
            { spread: -15, expectedSignal: 'BUY_SMALL' }, // -1.5 std dev
            { spread: -25, expectedSignal: 'BUY' }        // -2.5 std dev
        ];
        
        for (const scenario of scenarios) {
            strategy.historical = generateHistory(scenario.spread);
            const analysis = strategy.analyze();
            expect(analysis.signal).toBe(scenario.expectedSignal);
        }
    });
    
    test('Guardian Protocol integration', async () => {
        const guardian = new GuardianProtocol();
        const trade = strategy.constructTrade('BUY');
        
        const assessment = await guardian.checkTrade(trade, {
            calendar: market.calendar,
            biometrics: null
        });
        
        expect(assessment.approved).toBe(true);
        expect(assessment.warnings.length).toBe(0);
    });
});
```

## Production Deployment

### Docker Setup
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN npm ci --production

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Kubernetes Deployment
```yaml
# axiom-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: axiom-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: axiom-api
  template:
    metadata:
      labels:
        app: axiom-api
    spec:
      containers:
      - name: axiom
        image: axiom-finance/axiom:latest
        ports:
        - containerPort: 3000
        env:
        - name: BLOOMBERG_HOST
          valueFrom:
            secretKeyRef:
              name: axiom-secrets
              key: bloomberg-host
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: axiom-api
spec:
  selector:
    app: axiom-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Monitoring and Observability

### Prometheus Metrics
```javascript
// axiom-monitoring/src/metrics.js
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
    // Trade metrics
    tradesTotal: new Counter({
        name: 'axiom_trades_total',
        help: 'Total number of trades executed',
        labelNames: ['strategy', 'instrument', 'status']
    }),
    
    // Risk metrics
    portfolioDV01: new Gauge({
        name: 'axiom_portfolio_dv01',
        help: 'Portfolio DV01 in USD',
        labelNames: ['strategy', 'curve']
    }),
    
    // Performance metrics
    strategyPnL: new Gauge({
        name: 'axiom_strategy_pnl',
        help: 'Strategy P&L in USD',
        labelNames: ['strategy', 'period']
    }),
    
    // Guardian Protocol metrics
    guardianBlocks: new Counter({
        name: 'axiom_guardian_blocks_total',
        help: 'Total trades blocked by Guardian Protocol',
        labelNames: ['pattern', 'severity']
    }),
    
    // System metrics
    calculationDuration: new Histogram({
        name: 'axiom_calculation_duration_seconds',
        help: 'Calculation duration in seconds',
        labelNames: ['operation', 'instrument']
    })
};

export function recordTrade(strategy, instrument, status) {
    metrics.tradesTotal.inc({ strategy, instrument, status });
}

export function updateRisk(strategy, curve, dv01) {
    metrics.portfolioDV01.set({ strategy, curve }, dv01);
}

export function recordGuardianBlock(pattern, severity) {
    metrics.guardianBlocks.inc({ pattern, severity });
}
```

## Next Steps

1. **Implement Core Dual System** - The foundation for automatic differentiation
2. **Build First Strategy** - Treasury Basis with full functionality
3. **Connect Bloomberg** - Real-time market data integration
4. **Test Guardian Protocol** - Ensure protection mechanisms work
5. **Deploy to Test Environment** - Paper trading validation

---

*"From vision to implementation - building the future of quantitative finance"*

Axiom Implementation Guide v1.0
July 4, 2025