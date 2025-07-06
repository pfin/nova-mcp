# Axiom MCP MCP Test Examples

## Test 1: Simple Goal Clarification (Quick)

Tool: `axiom_mcp_goal`

Arguments:
```json
{
  "goal": "Learn Rust programming",
  "depth": "quick"
}
```

Expected: 5-minute analysis with clarifying questions and approach

## Test 2: Complex Goal Clarification (Standard)

Tool: `axiom_mcp_goal`

Arguments:
```json
{
  "goal": "Migrate a Node.js monolith to microservices",
  "context": "E-commerce platform, 50k daily users, 5 developers",
  "depth": "standard"
}
```

Expected: 15-minute comprehensive analysis

## Test 3: Parallel Research (2 branches)

Tool: `axiom_mcp_explore`

Arguments:
```json
{
  "mainGoal": "Choose between React and Vue for new project",
  "topics": [
    "React ecosystem and learning curve",
    "Vue.js capabilities and community"
  ],
  "synthesize": true
}
```

Expected: Two parallel branches, then synthesis

## Test 4: Complex Parallel Research (4 branches)

Tool: `axiom_mcp_explore`

Arguments:
```json
{
  "mainGoal": "Design a secure authentication system for 2025",
  "topics": [
    "Modern authentication methods (passkeys, WebAuthn)",
    "OAuth 2.0 and OIDC best practices",
    "Session management and JWT strategies",
    "Security threats and mitigation"
  ],
  "tools": ["WebSearch", "Read"],
  "synthesize": true
}
```

Expected: 40+ minutes total (10 min per branch + synthesis)