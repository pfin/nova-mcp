# Axiom: Automatic Differentiation for Finance

## The Problem
Every quantitative finance system calculates sensitivities using "bump and revalue":
```javascript
// Current state: Calculate price, bump curve, calculate again, repeat 50x
const dv01 = (bumpedPrice - basePrice) / 0.0001;  // One sensitivity
// Repeat for every market input... 
```

## The Solution
Axiom adds automatic differentiation to any calculation:
```javascript
// With Axiom: Calculate once, get everything
const result = calculatePrice(inputs);
console.log(result.value);        // The price
console.log(result.derivatives);  // ALL sensitivities
```

## How It Works
- Tracks derivatives through calculations automatically
- No code changes to pricing functions
- Works with existing libraries (QuantLib, rateslib)
- 10x faster than bump-and-revalue for full sensitivity grid

## Target Users
- Quant developers tired of writing sensitivity calculations
- Risk systems needing real-time Greeks
- Trading desks wanting faster analytics
- Anyone doing financial calculations who needs derivatives

## Business Model
- **Open Source Core**: MIT licensed, fully functional
- **Enterprise Edition**: $25k/year - Priority support, SLAs, training
- **Consulting**: Implementation help and custom development

## Why Now?
- Modern JavaScript is fast enough
- WebAssembly enables near-native performance
- Cloud deployment needs efficient calculations
- New generation of developers expects better tools

## The Team
**Peter Findley**: 20+ years in rates trading (Credit Suisse, BlackRock), Stanford AI degree
**Vision**: After losing $6M to a precision error, building tools that make risk transparent

## Traction Goals
- Year 1: 1,000 GitHub stars, 10k monthly downloads
- Year 2: 20 enterprise customers, $500k revenue
- Year 3: Industry standard for AD in finance

## Ask
- Beta testers from trading desks
- Feedback on API design
- Introductions to risk system developers
- Enterprise pilot partners

---

**One line:** "Calculate once, get all sensitivities automatically."

**Contact:** axiom@example.com | github.com/axiom-finance