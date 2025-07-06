# Axiom Project Overview

*The Self-Evident Truth in Quantitative Finance*

## Project Vision

Axiom is a next-generation quantitative finance library that combines:
- **QuantLib's** comprehensive coverage and computational accuracy
- **Rateslib's** elegant API and automatic differentiation
- **Modern** cloud-native architecture for real-time trading

Built by traders, for traders.

## Core Principles

1. **Speed is Non-Negotiable**: RV opportunities disappear in seconds
2. **Accuracy is Fundamental**: Basis points matter when leverage is 100:1
3. **Clarity Prevents Errors**: Complex strategies need simple interfaces
4. **Real-Time Risk**: Greeks must update as fast as markets move
5. **Cross-Asset by Design**: Modern RV spans rates, FX, and vol

## Key Features

### Automatic Differentiation Throughout
```javascript
// Every calculation returns value AND sensitivities
const swap = new Axiom.InterestRateSwap(params);
const result = swap.calculate();
console.log(result.value);    // NPV
console.log(result.delta);    // All DV01s automatically
console.log(result.gamma);    // Cross-gamma matrix
```

### Strategy Framework
```javascript
class TreasuryBasis extends Axiom.Strategy {
    calculateCTD() { /* ... */ }
    tradePnL(position, carryDays = 1) { /* ... */ }
    analyze() { /* ... */ }
}
```

### Real-Time Integration
- Bloomberg Desktop API support
- Event-driven architecture
- Parallel computation capabilities
- Web Workers for CPU-intensive calculations

## Supported Strategies

### 1. Treasury Basis Trading
- Precise CTD calculation with delivery option value
- Real-time repo rate integration
- Carry and roll analytics
- Complete P&L attribution

### 2. Butterfly Strategies
- Automatic DV01-neutral weighting
- Cross-gamma risk matrices
- Historical z-score analysis
- Carry/roll decomposition

### 3. Fed Expectations Trading
- Meeting-date precision
- Probability-weighted scenarios
- Optimal trade structure selection
- Real-time Fed Funds futures integration

### 4. Principal Component Analysis (PCA)
- Yield curve decomposition
- Factor-based risk attribution
- Mean reversion signals
- Systematic trading rules

### 5. Cross-Currency Basis
- Multi-currency curve construction
- FX forward integration
- Synthetic funding arbitrage
- Collateral optimization

### 6. Volatility Trading
- Full surface modeling (SABR, etc.)
- Gamma scalping optimization
- Vega arbitrage detection
- Dynamic hedging calculations

## Technical Architecture

### Core Components
```javascript
Axiom.Market        // Unified market data model
Axiom.Dual          // Automatic differentiation
Axiom.Strategy      // Base strategy class
Axiom.Execution     // Smart order routing
```

### Performance Optimizations
- Parallel scenario analysis via Web Workers
- GPU acceleration for matrix operations
- Incremental update algorithms
- Smart caching strategies

## Implementation Roadmap

### Phase 1: Core Library (Current)
- [ ] Define core abstractions
- [ ] Implement automatic differentiation
- [ ] Create base strategy framework
- [ ] Build curve construction engine

### Phase 2: Strategy Implementation
- [ ] Treasury basis trading
- [ ] Butterfly strategies
- [ ] Fed expectations
- [ ] PCA framework

### Phase 3: Integration
- [ ] Bloomberg API integration
- [ ] Excel connectivity (PyXLL/RTD)
- [ ] Real-time risk dashboard
- [ ] Execution layer

### Phase 4: Production
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Client deployment

## Why "Axiom"?

In mathematics, an axiom is a statement accepted as true without proof. In quantitative finance, certain truths are self-evident:
- Markets tend to mean-revert
- Arbitrage opportunities get competed away
- Risk must be measured in real-time
- Complexity requires clarity

Axiom embodies these fundamental truths.

## Project Status

- ✅ Comprehensive analysis of rateslib and QuantLib completed
- ✅ Detailed strategy implementations designed
- ✅ Architecture decisions documented
- 🔄 Beginning core implementation
- ⏳ Seeking feedback on API design

## Next Steps

1. Implement `Axiom.Dual` for automatic differentiation
2. Create `Axiom.Curve` with multiple interpolation methods
3. Build `Axiom.Strategy` base class
4. Develop first strategy (Treasury Basis)
5. Integrate with Bloomberg API

## Contributing

This project represents the synthesis of decades of trading experience and modern software engineering. We welcome contributions that:
- Enhance performance without sacrificing clarity
- Add new strategies with real-world applications
- Improve the developer experience
- Extend integration capabilities

## License

To be determined. Likely open-source with commercial support options.

---

*"Self-evident financial calculations"*

Last Updated: July 4, 2025