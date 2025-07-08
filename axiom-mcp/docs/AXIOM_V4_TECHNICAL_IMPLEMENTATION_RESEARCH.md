# Axiom V4: Technical Implementation Research

## Core Technical Challenges

### 1. PTY Session Serialization & Restoration

**Key Questions:**
- Can we access node-pty's internal buffer directly?
- What's the maximum buffer size we need to store?
- How do we handle partial ANSI sequences at save points?
- Which serialization format is fastest for large text buffers?
- Can we fork node-pty to add native serialization support?

[Research findings will go here]
- How to serialize node-pty state to disk
- Capturing complete terminal buffer history
- Restoring cursor position and terminal modes
- Handling ANSI escape sequences in saved state
- Binary-safe storage formats

### 2. Process Lifecycle Management

**Key Questions:**
- How do we keep Claude PTY alive when MCP server crashes?
- Can we use systemd socket activation for persistence?
- What's the best IPC method for Node.js in 2025?
- How do we detect and clean up orphaned Claude processes?
- Should we use PM2, forever, or custom process management?

[Research findings will go here]
- Keeping PTY processes alive across MCP restarts
- Unix domain sockets vs named pipes for IPC
- Process adoption and re-attachment patterns
- Handling zombie processes and cleanup
- systemd integration for process persistence

### 3. Claude Context Window Management

**Key Questions:**
- What's Claude's actual context window size?
- How do we count tokens without calling an API?
- Can we compress conversation history losslessly?
- When should we summarize vs truncate?
- How do we handle code blocks in context management?

[Research findings will go here]
- Tracking token usage in real-time
- Implementing sliding window buffers
- Context compression techniques
- Selective history pruning
- Checkpoint selection for optimal context

### 4. Intervention Detection & Timing

**Key Questions:**
- What's the optimal buffer size for pattern detection?
- How fast can we match patterns without blocking?
- Should we use regex or custom parser for performance?
- How do we handle multi-line patterns?
- What's the minimum intervention delay to avoid races?

[Research findings will go here]
- Character-by-character vs line-buffered detection
- Regex performance optimization for real-time matching
- Probabilistic planning detection algorithms
- Intervention queue management
- Backpressure handling when Claude outputs too fast

### 5. Multi-Session Architecture

**Key Questions:**
- Should we use UUIDs or custom session ID format?
- How many concurrent Claude sessions can one server handle?
- Do we need process isolation per session or thread isolation?
- How do we prevent one session from starving others?
- What's the overhead of context switching between sessions?

[Research findings will go here]
- Session ID generation and management
- Resource limits per session
- Fair scheduling between sessions
- Shared memory for cross-session state
- Session migration between servers

### 6. State Synchronization Protocol

**Key Questions:**
- Should we use CRDT for conflict-free state merging?
- What's the maximum acceptable sync delay between nodes?
- How do we handle network partitions during sync?
- Should state be pushed or pulled between sessions?
- What's the optimal batch size for state updates?

[Research findings will go here]
- Designing state change events
- Conflict resolution for concurrent modifications
- Eventually consistent vs strongly consistent models
- State snapshot intervals
- Delta compression for state updates

### 7. File System State Coordination

**Key Questions:**
- Should we use chokidar or native fs.watch for file monitoring?
- How do we handle symbolic links and hard links?
- Can we use FUSE for virtual filesystem on Linux?
- What's the performance impact of git-tracking every change?
- How do we clean up orphaned temporary files?

[Research findings will go here]
- Tracking file changes made by Claude
- Virtual file system overlays
- Rollback mechanisms for file operations
- Sandbox environments per session
- Git integration for version control

### 8. Output Parsing State Machine

**Key Questions:**
- Should we use XState or build custom FSM?
- What's faster: regex or character-by-character parsing?
- How much lookahead buffer do we need for markdown?
- Can we use WASM for performance-critical parsing?
- How do we handle ANSI escape sequences in output?

[Research findings will go here]
- Building efficient tokenizers for Claude output
- State transition performance optimization
- Handling malformed output gracefully
- Partial match buffering
- Lookahead and lookbehind patterns

### 9. Checkpoint & Rollback System

**Key Questions:**
- Should checkpoints be time-based or event-based?
- What's the optimal checkpoint size vs frequency tradeoff?
- Can we use brotli compression for checkpoint storage?
- How do we handle rollback of file system changes?
- Should we use WAL (Write-Ahead Logging) pattern?

[Research findings will go here]
- Defining checkpoint triggers
- Efficient diff algorithms for state comparison
- Storage backend options (SQLite, RocksDB, etc.)
- Checkpoint pruning strategies
- Fast rollback without data loss

### 10. Inter-Process Communication

**Key Questions:**
- Unix sockets vs named pipes vs shared memory for IPC?
- Should we use MessagePack or Protocol Buffers?
- How do we handle backpressure in message queues?
- What's the latency overhead of different IPC methods?
- Can we use io_uring on Linux for async IPC?

[Research findings will go here]
- Message passing protocols between MCP and PTY
- Zero-copy techniques for performance
- Reliable delivery guarantees
- Message ordering and sequencing
- Dead letter queues for failed messages

### 11. Session Suspend/Resume Protocol

**Key Questions:**
- Does SIGSTOP work reliably with node-pty processes?
- How do we handle TCP connections during suspend?
- What happens to setTimeout/setInterval during suspend?
- Can we use cgroups freezer for better control?
- How do we prevent data loss during emergency suspend?

[Research findings will go here]
- SIGSTOP/SIGCONT for process suspension
- Saving in-flight operations
- Network connection preservation
- Timer and timeout handling
- Resource cleanup on suspend

### 12. Monitoring & Observability

**Key Questions:**
- What's the overhead of OpenTelemetry in Node.js?
- Should we use Prometheus or custom metrics?
- How do we correlate logs across multiple sessions?
- Can we use eBPF for zero-overhead monitoring?
- What metrics predict intervention success rate?

[Research findings will go here]
- OpenTelemetry integration for distributed tracing
- Metrics collection without performance impact
- Log aggregation strategies
- Real-time dashboard requirements
- Alert conditions for intervention

### 13. Security & Isolation

**Key Questions:**
- Should we use Docker or native Linux namespaces?
- How do we prevent directory traversal in Claude?
- Can we use seccomp-bpf to limit syscalls?
- What's the performance cost of full isolation?
- How do we handle secrets in Claude's environment?

[Research findings will go here]
- Container/namespace isolation per session
- Resource limits (CPU, memory, disk)
- Preventing prompt injection attacks
- Secure storage of session data
- Access control for multi-user scenarios

### 14. Performance Optimization

**Key Questions:**
- What's the optimal PTY buffer size for Node.js?
- Can we use node:worker_threads for parallelism?
- Should we implement connection pooling for PTYs?
- How do we profile V8 performance in production?
- Is WebGPU viable for pattern matching acceleration?

[Research findings will go here]
- Profiling PTY read/write operations
- Minimizing context switches
- Buffer size tuning
- Parallel session execution
- GPU acceleration for pattern matching

### 15. Error Recovery & Resilience

**Key Questions:**
- How do we detect Claude process death vs hang?
- Should we implement circuit breakers for interventions?
- What's the optimal retry backoff strategy?
- How do we handle EPIPE errors in PTY writes?
- Can we use supervisord patterns in Node.js?

[Research findings will go here]
- Handling Claude process crashes
- Network interruption recovery
- Partial write recovery
- Transaction logs for operations
- Automatic retry mechanisms

### 16. Testing Infrastructure

**Key Questions:**
- How do we mock PTY behavior in Jest/Vitest?
- Can we record/replay PTY sessions for testing?
- Should we use property-based testing for FSMs?
- What's the best way to simulate Claude delays?
- How do we test intervention timing accuracy?

[Research findings will go here]
- Mocking Claude responses for tests
- Deterministic replay for debugging
- Chaos engineering for resilience
- Performance benchmarking harness
- Integration test strategies

### 17. Storage Backend Design

**Key Questions:**
- SQLite vs LevelDB vs RocksDB for embedded storage?
- Should we shard sessions across multiple DBs?
- What's the write amplification of different backends?
- How do we handle hot partition problems?
- Can we use TimescaleDB for time-series session data?

[Research findings will go here]
- Schema design for session data
- Index strategies for fast queries
- Compression algorithms comparison
- Backup and restore procedures
- Data retention policies

### 18. API Design for Control

**Key Questions:**
- Should we use tRPC for type-safe APIs?
- How do we stream PTY output over HTTP/2?
- What's the best pattern for long-polling vs SSE?
- Should we implement GraphQL subscriptions?
- How do we handle API backwards compatibility?

[Research findings will go here]
- RESTful vs GraphQL vs gRPC
- Webhook patterns for events
- Pagination for large outputs
- Rate limiting strategies
- API versioning approach

---

## Implementation Priority Matrix

| Component | Priority | Complexity | Dependencies |
|-----------|----------|------------|--------------|
| PTY Serialization | HIGH | HIGH | node-pty internals |
| Process Lifecycle | HIGH | MEDIUM | OS-specific |
| Output Parsing | HIGH | LOW | Regex engine |
| State Sync | MEDIUM | HIGH | Storage backend |
| Multi-Session | MEDIUM | MEDIUM | IPC design |
| Checkpoints | LOW | HIGH | Storage + State |

---

## Key Technical Decisions Needed

1. **Storage Technology**: SQLite vs RocksDB vs Custom
2. **IPC Method**: Unix sockets vs Named pipes vs Shared memory
3. **Serialization Format**: JSON vs MessagePack vs Protobuf
4. **Process Manager**: systemd vs custom supervisor
5. **Session Limits**: Hard limits vs elastic scaling
6. **API Protocol**: REST vs GraphQL vs gRPC vs WebSocket

---

## Node.js/JavaScript Specific Research (2025)

### 19. node-pty Advanced Patterns

**Key Questions:**
- Can we access node-pty's internal pty.fd directly?
- What happens if we dup() the PTY file descriptor?
- How do we serialize termios settings?
- Can we hot-swap PTY instances without Claude noticing?
- What's the impact of NODE_PTY_DEBUG mode?

[Research findings will go here]
- Accessing internal PTY file descriptors
- Custom node-pty forks with serialization support
- Monkey-patching node-pty for state access
- PTY resize handling during session restore
- Raw mode vs cooked mode implications

### 20. V8 Memory Management for Long Sessions

**Key Questions:**
- How big do Node.js Buffers get with hours of PTY output?
- Should we use --max-old-space-size limits?
- Can we trigger manual GC between sessions?
- What's the memory overhead per EventEmitter listener?
- How do we detect and fix memory leaks in production?

[Research findings will go here]
- Preventing memory leaks in event emitters
- WeakMap/WeakSet for session tracking
- Buffer pooling for PTY I/O
- Heap snapshot analysis for Claude sessions
- Memory pressure handling strategies

### 21. Stream Backpressure in Node.js

**Key Questions:**
- What's the default highWaterMark for PTY streams?
- How do we detect when Claude is outputting too fast?
- Should we use pipeline() or pipe() for transforms?
- Can backpressure cause Claude to hang?
- What's the overhead of PassThrough streams?

[Research findings will go here]
- Handling fast Claude output streams
- Transform streams for real-time intervention
- Implementing proper pause/resume
- Buffer highWaterMark tuning
- Stream pipeline error handling

### 22. Worker Threads for Session Isolation

**Key Questions:**
- Can node-pty work inside worker threads?
- What's the overhead of MessagePort communication?
- Should we use Piscina for worker pooling?
- How do we share PTY file descriptors between workers?
- Can we use Atomics.wait() without blocking?

[Research findings will go here]
- Running each Claude session in a worker
- SharedArrayBuffer for fast IPC
- Atomics for synchronization
- Worker pool management
- Transferable objects for zero-copy

### 23. AsyncLocalStorage for Request Context

**Key Questions:**
- What's the performance hit of AsyncLocalStorage?
- How do we prevent context loss in EventEmitters?
- Can we use AsyncLocalStorage with worker threads?
- Should we use cls-hooked as fallback?
- How deep can we nest async contexts safely?

[Research findings will go here]
- Tracking intervention context across async calls
- Performance impact of AsyncLocalStorage
- Alternative context propagation methods
- Integration with MCP request handling
- Context loss prevention strategies

### 24. Native Addons for Performance

**Key Questions:**
- Is N-API stable enough for production PTY control?
- Should we use Rust (neon) or C++ for addons?
- Can WASM match native addon performance?
- How do we distribute prebuilt binaries safely?
- What's the overhead of JS-to-native boundary?

[Research findings will go here]
- N-API for pattern matching acceleration
- Rust/C++ addons for state machines
- WASM modules for portability
- Node-gyp vs node-addon-api
- Prebuilt binaries distribution

---

## Claude-Specific Technical Challenges

### 25. Claude CLI Behavior Analysis

**Key Questions:**
- What exact check does Claude use for TTY detection (isatty())?
- Does Claude use line buffering or full buffering in PTY mode?
- Which signals does Claude handle (SIGINT, SIGTERM, etc)?
- Are there undocumented environment variables we can use?
- What happens if we fake TTY dimensions (0x0, 999x999)?

[Research findings will go here]
- How Claude detects TTY vs pipe
- Claude's internal buffering behavior
- Signal handling in Claude CLI
- Environment variables Claude respects
- Hidden flags and debug modes

### 26. Prompt Injection Prevention

**Key Questions:**
- What characters can break out of Claude's context?
- How do we detect attempts to override system prompts?
- Should we use allowlists or denylists for input filtering?
- Can we sandbox Claude's file system access per session?
- How do we log attempts without storing sensitive data?

[Research findings will go here]
- Sanitizing user inputs to Claude
- Detecting prompt injection attempts
- Escaping special characters safely
- Context isolation techniques
- Monitoring for anomalous outputs

### 27. Claude Response Parsing

**Key Questions:**
- How do we handle triple backticks inside code blocks?
- What's the fastest way to detect code block languages?
- How do we parse streaming responses without buffering all?
- Can we detect when Claude is "done" vs "thinking"?
- How do we handle Claude's error messages vs normal output?

[Research findings will go here]
- Detecting markdown code blocks reliably
- Handling incomplete responses
- Multi-language code block detection
- Streaming JSON parsing
- Error message patterns

### 28. Optimal Intervention Windows

**Key Questions:**
- How long is Claude's typical "thinking" pause?
- Can we detect token generation rate changes?
- What's the success rate of interventions at different timings?
- Should we use statistical models to predict pauses?
- How do we A/B test without disrupting users?

[Research findings will go here]
- Measuring Claude's "thinking" phases
- Token generation rate analysis
- Pause detection algorithms
- Intervention success rate tracking
- A/B testing framework for timing

### 29. Session State Machines

**Key Questions:**
- Is XState worth the bundle size for our use case?
- How do we visualize state machines in real-time?
- Can we hot-reload state machine definitions?
- Should states be persisted to disk or just memory?
- How do we replay events for debugging?

[Research findings will go here]
- XState for Claude session management
- State chart visualization
- Hierarchical state machines
- State persistence strategies
- Event sourcing patterns

### 30. Real-time Pattern Matching

**Key Questions:**
- Can we use RE2 for safe regex without backtracking?
- What's the optimal lookahead buffer size?
- Should we compile patterns to state machines?
- Is Hyperscan viable for Node.js pattern matching?
- How do we update patterns without restart?

[Research findings will go here]
- Streaming regex engines
- Incremental pattern matching
- Lookahead buffer management
- Pattern compilation optimization
- GPU regex acceleration

---

## MCP Integration Challenges

### 31. MCP Tool Streaming

**Key Questions:**
- Does MCP SDK support true streaming responses?
- How do we implement backpressure in SSE?
- What's the chunk size limit for MCP protocols?
- Can we cancel in-flight tool executions?
- How do we handle partial JSON in streams?

[Research findings will go here]
- Implementing proper SSE for tools
- Chunked transfer encoding
- Progress notification protocols
- Cancellation token propagation
- Partial result handling

### 32. MCP Resource Management

**Key Questions:**
- Can MCP resources be updated dynamically?
- How do we version resources per session?
- What's the memory cost of resource caching?
- Should resources be stored in-memory or on disk?
- How do we garbage collect unused resources?

[Research findings will go here]
- Dynamic resource registration
- Resource versioning for sessions
- Lazy resource loading
- Resource access control
- Caching strategies

### 33. MCP Error Recovery

**Key Questions:**
- How does MCP handle transport-level errors?
- Should we implement exponential backoff?
- Can we make all operations idempotent?
- How do we correlate errors across sessions?
- What context should error reports include?

[Research findings will go here]
- Handling disconnections gracefully
- Request retry mechanisms
- Idempotency tokens
- Transaction rollback
- Error context preservation

---

## Practical Implementation Patterns

### 34. Session Replay System

**Key Questions:**
- Should we use ttyrec format or custom?
- How do we compress months of session data?
- Can we implement seeking in compressed streams?
- What's the storage cost per hour of recording?
- How do we anonymize sensitive data in replays?

[Research findings will go here]
- Recording all PTY I/O with timestamps
- Compression for replay files
- Fast-forward/rewind implementation
- Diff generation between runs
- Replay file format design

### 35. Intervention Combo System

**Key Questions:**
- How do we define combo timing windows?
- Should combos be hard-coded or learned?
- What's the UI for combo creation?
- Can we use Markov chains for combo prediction?
- How do we share successful combos between users?

[Research findings will go here]
- Defining combo grammar
- Combo recognition engine
- Success rate tracking
- Combo discovery through ML
- User-defined combo macros

### 36. Claude "Save States" Implementation

**Key Questions:**
- How large do save states get with full conversation history?
- Should we use deltas between saves or full snapshots?
- How do we version save states for compatibility?
- Can we compress save states without losing fidelity?
- How do we validate save state integrity on load?

[Research findings will go here]
```javascript
// Conceptual save state structure
{
  sessionId: string,
  timestamp: Date,
  ptyState: {
    buffer: string,
    cursor: { x: number, y: number },
    size: { cols: number, rows: number },
    mode: 'raw' | 'cooked'
  },
  claudeState: {
    lastPrompt: string,
    outputBuffer: string,
    detectedState: 'idle' | 'thinking' | 'coding',
    tokenCount: number
  },
  fileSystemState: {
    createdFiles: string[],
    modifiedFiles: Map<string, string>,
    workingDirectory: string
  },
  interventionHistory: Array<{
    timestamp: Date,
    type: string,
    success: boolean
  }>
}
```

### 37. Intervention Priority Queue

**Key Questions:**
- What makes one intervention higher priority than another?
- How do we prevent intervention spam/loops?
- Should interventions have timeouts?
- How do we handle conflicting interventions?
- What's the maximum queue size before dropping?

[Research findings will go here]
- Binary heap implementation
- Priority calculation algorithms
- Queue overflow handling
- Intervention deduplication
- Emergency intervention fast-path

### 38. Session Migration Protocol

**Key Questions:**
- Can we migrate PTY file descriptors between processes?
- What's the protocol for zero-downtime handoff?
- Should we use TCP or Unix sockets for migration?
- How do we verify state integrity after migration?
- What's the rollback strategy if migration fails?

[Research findings will go here]
- Serializing live PTY sessions
- Network transport for migration
- Session handoff coordination
- State verification post-migration
- Rollback on migration failure

---

## Additional Technical Areas

### 39. Event-Driven Architecture Patterns

**Key Questions:**
- Should we use EventEmitter3 for performance?
- How do we guarantee event ordering across workers?
- Can we implement event sourcing efficiently?
- What's the max listeners limit we need?
- How do we validate events without overhead?

[Research findings will go here]
- EventEmitter vs EventTarget in Node.js
- Event ordering guarantees
- Event replay for debugging
- Dead letter event handling
- Event schema validation

### 40. Debugging & Development Tools

**Key Questions:**
- Can we extend Chrome DevTools for PTY inspection?
- How do we debug Worker Thread communication?
- Is rr (record-replay) viable for Node.js?
- What's the best profiler for production use?
- Can we auto-detect memory leaks in CI?

[Research findings will go here]
- Chrome DevTools integration for Node.js
- Custom inspector protocol extensions
- Time-travel debugging for sessions
- Performance profiling strategies
- Memory leak detection tools

### 41. Load Testing & Benchmarking

**Key Questions:**
- How do we simulate realistic Claude behavior?
- What's the baseline latency we should target?
- Can we use k6 or Artillery for PTY load testing?
- How many concurrent sessions per CPU core?
- What metrics matter most for user experience?

[Research findings will go here]
- Simulating multiple Claude sessions
- Measuring intervention latency
- Resource usage profiling
- Bottleneck identification
- Scalability testing frameworks

### 42. Claude Version Compatibility

**Key Questions:**
- How do we detect Claude CLI version programmatically?
- What Claude behaviors change between versions?
- Should we maintain compatibility matrix?
- Can we auto-update intervention patterns?
- How do we test against multiple Claude versions?

[Research findings will go here]
- Detecting Claude CLI version
- Handling behavior changes
- Feature detection patterns
- Graceful degradation strategies
- Version-specific workarounds

### 43. Integration with Existing Axiom Components

**Key Questions:**
- How do we migrate v3 hooks to v4 architecture?
- Can we run v3 and v4 side-by-side?
- What's the database migration strategy?
- Should we version the component interfaces?
- How do we deprecate v3 features gracefully?

[Research findings will go here]
- Hook system integration
- Database schema evolution
- Migrating from v3 to v4
- Backwards compatibility
- Component interface design

### 44. Production Deployment Considerations

**Key Questions:**
- Should we use Alpine or Ubuntu for containers?
- How do we handle PTY in Kubernetes pods?
- What's the log volume per session per day?
- Which metrics trigger auto-scaling?
- Can we do blue-green deployments with PTYs?

[Research findings will go here]
- Docker containerization strategies
- Kubernetes operator patterns
- Log aggregation and analysis
- Monitoring and alerting
- Zero-downtime updates

### 45. Client SDK Design

**Key Questions:**
- Should we auto-generate SDK from OpenAPI?
- How do we handle WebSocket reconnection?
- Can clients work offline and sync later?
- What state should be client-side vs server?
- How do we version SDK without breaking changes?

[Research findings will go here]
- TypeScript SDK generation
- Real-time client updates
- Offline capability
- Client-side state management
- SDK versioning strategy

### 46. Testing Strategies

**Key Questions:**
- How do we unit test PTY code deterministically?
- Should we use real Claude or mocks for CI?
- Can fast-check handle state machine properties?
- What's the snapshot size for hour-long sessions?
- How do we inject chaos without breaking CI?

[Research findings will go here]
- Unit testing PTY interactions
- Integration testing with real Claude
- Property-based testing for state machines
- Snapshot testing for outputs
- Chaos testing for resilience

### 47. Performance Optimizations

**Key Questions:**
- Which V8 flags improve PTY performance?
- How do we identify the critical path?
- Should we use Redis or in-memory caching?
- Where can we apply lazy evaluation safely?
- Is object pooling worth it in modern V8?

[Research findings will go here]
- JIT optimization strategies
- Critical path analysis
- Caching layer design
- Lazy evaluation patterns
- Memory pool management

### 48. Security Hardening

**Key Questions:**
- How do we sanitize prompts without breaking them?
- Can we detect secrets in Claude's output?
- What's the right rate limit for interventions?
- How do we prevent PTY resource exhaustion?
- What events must be logged for compliance?

[Research findings will go here]
- Input sanitization strategies
- Output filtering for secrets
- Rate limiting implementation
- DOS attack prevention
- Audit logging requirements