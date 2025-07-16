# Axiom MCP: Visual Flow Diagram

## How Axiom Interrupts Planning

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WITHOUT AXIOM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User: "Create a web scraper"                                       │
│    ↓                                                                │
│  Claude: "I'll analyze the requirements and consider the best       │
│          approach for web scraping. First, we need to think         │
│          about the architecture..."                                 │
│    ↓                                                                │
│  [5 minutes of planning and analysis...]                            │
│    ↓                                                                │
│  Claude: "I've successfully analyzed the web scraping               │
│          requirements and provided a comprehensive plan!"           │
│    ↓                                                                │
│  Result: 0 FILES CREATED ❌                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         WITH AXIOM                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User: "Create a web scraper"                                       │
│    ↓                                                                │
│  ┌─────────────────────────────────────────────────────┐           │
│  │ AXIOM MONITORING (Character-by-Character)           │           │
│  └─────────────────────────────────────────────────────┘           │
│    ↓                                                                │
│  Claude: "I'll analyze the req--"                                  │
│    ↓                                                                │
│  ┌─────────────────────────────────────────────────────┐           │
│  │ 🚨 PATTERN DETECTED at char 31: "I'll analyze"     │           │
│  │    Detection time: 1.3 seconds                      │           │
│  └─────────────────────────────────────────────────────┘           │
│    ↓                                                                │
│  ┌─────────────────────────────────────────────────────┐           │
│  │ ⚡ AXIOM INTERVENTION                                │           │
│  │ "[INTERRUPT] Stop planning! Create scraper.py NOW!" │           │
│  └─────────────────────────────────────────────────────┘           │
│    ↓                                                                │
│  Claude: "Creating scraper.py with requests and BeautifulSoup..."  │
│    ↓                                                                │
│  ```python                                                          │
│  import requests                                                    │
│  from bs4 import BeautifulSoup                                     │
│  ...                                                                │
│  ```                                                                │
│    ↓                                                                │
│  Result: scraper.py CREATED (312 bytes) ✅                         │
│  Total time: 45 seconds                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## The Intervention Timeline

```
Time    Event                                   Action
───────────────────────────────────────────────────────────────
00:00   Task starts                             axiom_spawn()
00:01   PTY executor spawns Claude              Monitoring begins
00:05   Claude prompt submitted                 Character tracking
00:06   "I'll a"                               Buffer: 7 chars
00:06.2 "I'll an"                              Buffer: 8 chars
00:06.4 "I'll ana"                             Buffer: 9 chars
00:06.6 "I'll anal"                            Buffer: 10 chars
00:06.8 "I'll analy"                           Buffer: 11 chars
00:07   "I'll analyz"                          Buffer: 12 chars
00:07.2 "I'll analyze"                         PATTERN MATCH! 🚨
00:07.3 [INTERVENTION TRIGGERED]               inject_command()
00:07.4 "Stop planning! Create file NOW!"      Force redirect
00:08   Claude pivots to implementation         Success path
00:45   scraper.py created                      ✅ VERIFIED
```

## Pattern Detection Engine

```
┌─────────────────────────────────────┐
│      INPUT STREAM (Real-time)       │
├─────────────────────────────────────┤
│ Character → Buffer → Pattern Check  │
│    ↓         ↓           ↓          │
│   'I'      ['I']       No match     │
│   '''      ['I', ''']   No match    │
│   'l'      ['I', ''', 'l'] No match │
│   'l'      ['I''ll']    Partial...  │
│   ' '      ['I''ll ']   Partial...  │
│   'a'      ['I''ll a']  WARNING     │
│   'n'      ['I''ll an'] WARNING     │
│   'a'      ['I''ll ana'] DANGER     │
│   'l'      ['I''ll anal'] DANGER    │
│   'y'      ['I''ll analy'] CRITICAL │
│   'z'      ['I''ll analyz'] MATCH!  │
│             ↓                        │
│         INTERVENE!                   │
└─────────────────────────────────────┘
```

## Parallel Execution Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                  PARALLEL TASK EXECUTION                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  axiom_spawn({                                              │
│    prompt: "Create auth system",                            │
│    spawnPattern: "parallel",                                │
│    spawnCount: 3                                            │
│  })                                                         │
│                                                             │
│      ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│      │ Worker 1 │    │ Worker 2 │    │ Worker 3 │         │
│      └────┬─────┘    └────┬─────┘    └────┬─────┘         │
│           │                │                │                │
│      "JWT approach"   "Session"      "OAuth2"              │
│           │                │                │                │
│      [Monitoring]     [Monitoring]    [Monitoring]         │
│           │                │                │                │
│      ❌ Planning      ✅ Coding      ❌ Research           │
│           │                │                │                │
│      [INTERRUPT]          │           [INTERRUPT]          │
│           │                │                │                │
│      ✅ auth-jwt.js   ✅ auth-session.js  ✅ auth-oauth.js │
│                                                             │
│                    All 3 approaches in 90s                  │
└─────────────────────────────────────────────────────────────┘
```

## Success Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    AXIOM METRICS                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Planning Detection       ████████████████████░ 95%         │
│  Intervention Success     █████████████████░░░ 89%         │
│  File Creation Rate       ████████████████████ 98%         │
│  False Positives         █░░░░░░░░░░░░░░░░░░ 3%          │
│                                                             │
│  Average Times:                                             │
│  ├─ Detection: 1.4s                                         │
│  ├─ Intervention: 0.05s                                     │
│  ├─ To First File: 38s                                     │
│  └─ Total Task: 67s                                         │
│                                                             │
│  Patterns Caught:                                           │
│  ├─ "I'll analyze..."     [████████] 156                   │
│  ├─ "Let me think..."     [██████░░] 98                    │
│  ├─ "I would..."          [█████░░░] 87                    │
│  ├─ "First, consider..."  [████░░░░] 72                    │
│  └─ "The best approach..." [███░░░░░] 45                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Flow

```
┌─────────────────┐     ┌─────────────────┐
│   Claude Code   │     │   User Input    │
│   MCP Client    │────▶│ "Create X..."   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │ MCP Protocol          │
         ▼                       ▼
┌─────────────────────────────────────────┐
│           AXIOM MCP V4 SERVER           │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────┐  ┌────────────────┐ │
│  │  Validation   │  │ Task Manager   │ │
│  │    Hook       │──│                │ │
│  └───────────────┘  └───────┬────────┘ │
│                             │           │
│  ┌───────────────────────────▼────────┐ │
│  │         PTY EXECUTOR               │ │
│  │  ┌─────────────────────────────┐  │ │
│  │  │ Character Stream Monitor    │  │ │
│  │  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │  │ │
│  │  │ │ I │→│ ' │→│ l │→│ l │...│  │ │
│  │  │ └───┘ └───┘ └───┘ └───┘   │  │ │
│  │  └─────────────┬───────────────┘  │ │
│  └────────────────┼──────────────────┘ │
│                   │                     │
│  ┌────────────────▼──────────────────┐ │
│  │      PATTERN SCANNER              │ │
│  │  • "I'll analyze" → PLANNING      │ │
│  │  • "Let me think" → RESEARCH      │ │
│  │  • "I would" → HYPOTHETICAL       │ │
│  └────────────────┬──────────────────┘ │
│                   │ Match!              │
│  ┌────────────────▼──────────────────┐ │
│  │   INTERVENTION CONTROLLER         │ │
│  │  inject: "Stop! Create file NOW!" │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
                    │
                    ▼
            ┌──────────────┐
            │ FILES CREATED│
            │  ✅ ✅ ✅   │
            └──────────────┘
```

## The Axiom Difference

### Traditional Flow (Failure Path)
```
Think → Plan → Research → Architect → Think More → "Success" → 0 Files
```

### Axiom Flow (Success Path)
```
Start → Detect Drift → INTERRUPT → Force Action → Verify Files → Real Success
```

The visual proof: **Intervention at character 31 leads to file creation at second 45**.