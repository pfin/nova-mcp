# Axiom Relative Value Trading Strategies

*Institutional-grade analytics with trader-friendly implementation*

## Treasury Basis Trading

### Strategy Overview
Exploiting differences between Treasury futures and cash bonds, considering delivery options, financing, and repo specialness.

### Implementation
```javascript
class TreasuryBasis extends Axiom.Strategy {
    constructor(future, cashBonds, repoRates) {
        this.future = future;
        this.bonds = cashBonds;
        this.repo = repoRates;
        this.ctd = null;
    }
    
    calculateCTD() {
        // Find cheapest-to-deliver with delivery option value
        return this.bonds.map(bond => ({
            bond,
            basis: this.future.price - (bond.cleanPrice * this.future.conversionFactor(bond)),
            irr: this.impliedRepoRate(bond),
            optionValue: this.deliveryOptionValue(bond),
            carryToDelivery: this.calculateCarry(bond, this.future.deliveryDate)
        })).sort((a, b) => a.irr - b.irr)[0];
    }
    
    tradePnL(position, carryDays = 1) {
        const pnl = new Axiom.PnLAttribution();
        
        // Futures leg
        pnl.futures = position.futures * (this.future.price - position.entryFuturesPrice) * this.future.multiplier;
        
        // Cash leg
        pnl.cash = -position.bonds * (this.ctd.bond.dirtyPrice() - position.entryCashPrice);
        
        // Financing
        pnl.repoFinancing = -position.bonds * position.entryCashPrice * this.repo.rate * carryDays / 360;
        
        // Carry
        pnl.couponCarry = position.bonds * this.ctd.bond.accruedInterest(carryDays);
        
        // Option value decay
        pnl.optionDecay = this.deliveryOptionTheta() * carryDays;
        
        return pnl;
    }
}
```

### Real-World Usage
```javascript
const basis = new Axiom.TreasuryBasis(
    Axiom.Futures.TY('Dec2024'),           // 10Y futures
    Axiom.Bonds.search('10Y', 'onTheRun'), // Cash bonds
    Axiom.Repo.current('UST')              // Repo rates
);

const trade = basis.analyze();
console.log(`CTD: ${trade.ctd.cusip}`);
console.log(`Basis: ${trade.basis} 32nds`);
console.log(`Implied repo: ${trade.irr}% vs GC ${trade.gcRepo}%`);
```

## Butterfly Strategies

### Strategy Overview
Trading curvature through weighted positions (e.g., -1×2Y +2×5Y -1×10Y).

### Key Features
- Automatic DV01-neutral weighting
- Real-time spread calculation
- Full cross-gamma matrix
- Historical analysis (z-score, percentile)
- Carry and roll-down attribution

### Implementation
```javascript
class Butterfly extends Axiom.Strategy {
    constructor(curve, tenors = ['2Y', '5Y', '10Y'], weights = null) {
        this.curve = curve;
        this.tenors = tenors;
        this.weights = weights || this.calculateDV01NeutralWeights();
    }
    
    calculateDV01NeutralWeights() {
        // Auto-calculate weights for DV01 neutrality
        const swaps = this.tenors.map(t => new Axiom.Swap(t, this.curve));
        const dv01s = swaps.map(s => s.dv01());
        
        // Solve for weights: w1*dv01_1 + w2*dv01_2 + w3*dv01_3 = 0
        const w2 = 2;  // Convention: middle leg = 2
        const ratio = dv01s[1] / (dv01s[0] + dv01s[2]);
        return [-ratio, w2, -ratio];
    }
    
    analyze() {
        const swaps = this.tenors.map(t => new Axiom.Swap(t, this.curve));
        
        // Current spread
        const spread = this.weights.reduce((sum, w, i) => 
            sum + w * swaps[i].fairRate(), 0) * 10000;  // in bps
        
        // Risk metrics (automatic differentiation!)
        const risk = {
            dv01: this.weights.reduce((sum, w, i) => 
                sum + w * swaps[i].dv01(), 0),
            
            gamma: this.weights.reduce((sum, w, i) => 
                sum + w * swaps[i].gamma(), 0),
            
            crossGamma: this.calculateCrossGamma(swaps),
            
            carry: this.weights.reduce((sum, w, i) => 
                sum + w * swaps[i].theta(), 0),
            
            rollDown: this.calculateRollDown(1),
            
            zScore: this.calculateZScore(spread),
            percentile: this.historicalPercentile(spread),
            sharpe: this.historicalSharpe()
        };
        
        return { spread, risk, signal: this.generateSignal(spread, risk) };
    }
}
```

## Fed Expectations Trading

### Strategy Overview
Trading forward OIS/Fed Funds rates vs FOMC expectations, dots, and market pricing.

### Key Components
- Meeting-date precision
- Probability extraction from futures
- Optimal trade construction
- Real-time mispricing detection

### Implementation
```javascript
class FedExpectations extends Axiom.Strategy {
    constructor() {
        this.meetings = Axiom.Fed.getMeetingDates();
        this.dots = Axiom.Fed.getLatestDots();
        this.futures = Axiom.Futures.FedFunds.all();
    }
    
    calculateMeetingProbabilities(meeting) {
        const current = this.getCurrentEffectiveRate();
        const future = this.futures.get(meeting.month);
        
        // Extract probabilities of different hike scenarios
        const impliedRate = future.impliedRate();
        const probabilities = {};
        
        for (let hikes = -2; hikes <= 4; hikes++) {
            const targetRate = current + (hikes * 0.25);
            probabilities[`${hikes * 25}bp`] = this.calculateProb(
                impliedRate, current, targetRate
            );
        }
        
        return probabilities;
    }
    
    findMispricings() {
        const opportunities = [];
        
        this.meetings.forEach(meeting => {
            // Market pricing
            const market = this.getMarketPricing(meeting);
            
            // Model expectation
            const model = this.modelExpectation(meeting);
            
            // Compare
            const diff = market.rate - model.rate;
            if (Math.abs(diff) > 0.05) {  // 5bp threshold
                opportunities.push({
                    meeting,
                    marketRate: market.rate,
                    modelRate: model.rate,
                    difference: diff,
                    probability: model.confidence,
                    trade: this.constructTrade(meeting, diff)
                });
            }
        });
        
        return opportunities;
    }
}
```

## Principal Component Analysis (PCA)

### Strategy Overview
Decomposing yield curve movements into principal components (level, slope, curvature) for systematic trading.

### Implementation Features
- Historical covariance calculation
- Real-time PCA decomposition
- Component interpretation (level/slope/curvature)
- Mean reversion signals
- Factor-based risk budgeting

```javascript
class PCAStrategy extends Axiom.Strategy {
    constructor(curves, historyDays = 252) {
        this.curves = curves;
        this.history = Axiom.Data.getHistory(curves, historyDays);
        this.pca = this.calculatePCA();
    }
    
    calculatePCA() {
        // Get yield changes
        const changes = this.history.calculateChanges('1D');
        
        // Compute covariance matrix
        const cov = Axiom.Math.covariance(changes);
        
        // Eigenvalue decomposition
        const { eigenvalues, eigenvectors } = Axiom.Math.eigen(cov);
        
        // Sort by explained variance
        const components = eigenvalues
            .map((val, idx) => ({
                eigenvalue: val,
                eigenvector: eigenvectors[idx],
                variance: val / eigenvalues.sum(),
                interpretation: this.interpretComponent(eigenvectors[idx])
            }))
            .sort((a, b) => b.eigenvalue - a.eigenvalue);
        
        return {
            components,
            loadings: this.calculateLoadings(components),
            scores: this.calculateScores(changes, components)
        };
    }
    
    getCurrentExposure() {
        // Decompose current curve into PCA factors
        const currentYields = this.curves.map(c => c.parRate());
        
        return {
            level: this.pca.scores[0].latest,
            slope: this.pca.scores[1].latest,
            curvature: this.pca.scores[2].latest,
            higher: this.pca.scores.slice(3).map(s => s.latest)
        };
    }
}
```

## Cross-Currency Basis

### Strategy Overview
Trading the basis between different currency funding markets (e.g., EUR/USD cross-currency basis swaps).

### Key Features
- Multi-currency curve construction
- FX forward integration
- Basis swap modeling
- Synthetic funding arbitrage detection

```javascript
class CrossCurrencyBasis extends Axiom.Strategy {
    constructor(currencies = ['USD', 'EUR']) {
        this.ccys = currencies;
        this.curves = this.buildMultiCurrencyCurves();
        this.fxForwards = new Axiom.FX.Forwards(currencies);
    }
    
    calculateBasis(ccy1, ccy2, tenor) {
        // Cross-currency basis swap
        const basis = new Axiom.CrossCurrencyBasisSwap({
            notional1: 100e6,
            currency1: ccy1,
            index1: `${ccy1}-LIBOR-3M`,
            currency2: ccy2,
            index2: `${ccy2}-LIBOR-3M`,
            tenor: tenor,
            fxRate: this.fxForwards.spot(ccy1, ccy2)
        });
        
        // Find basis spread that makes NPV = 0
        const solver = new Axiom.Solver();
        const basisSpread = solver.findRoot(
            spread => basis.npv({ basisSpread: spread }),
            { initialGuess: 0, tolerance: 1e-6 }
        );
        
        return {
            spread: basisSpread * 10000,  // in bps
            dv01: basis.dv01(),
            gammaMatrix: basis.crossGamma(),
            carry: basis.theta(),
            fxDelta: basis.fxDelta()
        };
    }
}
```

## Volatility Trading (Gamma & Vega)

### Strategy Overview
Trading interest rate volatility through swaptions, caps/floors, exploiting vol surface dynamics.

### Implementation
```javascript
class VolatilityStrategy extends Axiom.Strategy {
    constructor(surface) {
        this.surface = surface;  // SABR or similar
        this.instruments = new Map();
    }
    
    // Gamma trading - exploit convexity
    gammaScalping(underlying) {
        const option = this.instruments.get(underlying);
        
        return {
            gamma: option.gamma(),
            gammaP&L: 0.5 * option.gamma() * Math.pow(underlying.change(), 2),
            hedgeRatio: -option.delta(),
            rehedgeThreshold: 1 / option.gamma(),
            
            // Optimal rehedge frequency
            optimalFrequency: Math.sqrt(
                (2 * this.transactionCost) / 
                (option.gamma() * Math.pow(underlying.volatility(), 2))
            ),
            
            expectedProfit: this.calculateExpectedGammaProfit(option)
        };
    }
    
    // Vega trading - volatility views
    vegaArbitrage() {
        const mispricing = [];
        
        // Compare implied vs realized vol
        this.surface.points.forEach(point => {
            const implied = point.impliedVol;
            const realized = this.calculateRealizedVol(point.tenor, point.strike);
            const model = this.surface.getVol(point.tenor, point.strike);
            
            if (Math.abs(implied - model) > 0.5) {  // 50bp vol difference
                mispricing.push({
                    instrument: this.createSwaption(point),
                    impliedVol: implied,
                    modelVol: model,
                    realizedVol: realized,
                    vega: this.calculateVega(point),
                    trade: implied > model ? 'SELL_VOL' : 'BUY_VOL',
                    expectedPnL: (model - implied) * this.calculateVega(point)
                });
            }
        });
        
        return mispricing;
    }
}
```

## Performance Metrics

All strategies include:
- Real-time P&L attribution
- Risk decomposition (DV01, gamma, vega, theta)
- Historical performance analysis
- Sharpe ratio calculation
- Maximum drawdown tracking
- Correlation analysis

## Integration Points

- **Bloomberg API**: Real-time market data
- **Excel**: Via PyXLL or RTD for live dashboards
- **Execution**: Smart order routing
- **Risk Systems**: Real-time limit monitoring
- **Compliance**: Pre-trade checks

---

*"From theory to production - strategies that work"*

Axiom RV Strategies
July 4, 2025