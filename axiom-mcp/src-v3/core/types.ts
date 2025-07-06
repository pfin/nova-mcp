/**
 * Core types for Axiom MCP v3
 * Based on expert recommendations from GoodIdeasFromOtherModels.txt
 */

export interface Task {
  id: string;
  parentId: string | null;
  prompt: string;
  priority: number;
  status: 'queued' | 'assigned' | 'running' | 'verifying' | 'complete' | 'failed';
  acceptanceCriteria: AcceptanceCriteria;
  createdAt: number;
  assignedAt?: number;
  completedAt?: number;
  workerId?: string;
  result?: TaskResult;
  mctsNodeId?: string; // For MCTS integration
}

export interface AcceptanceCriteria {
  filesExpected?: string[];
  mustExecute?: boolean;
  mustHaveTests?: boolean;
  testsMustPass?: boolean;
  coverageThreshold?: number;
  customChecks?: string[];
}

export interface TaskResult {
  success: boolean;
  output: string;
  verification?: VerificationResult;
  duration: number;
  filesCreated: string[];
  testsRun: number;
  testsPassed: number;
}

export interface VerificationResult {
  passed: boolean;
  checks: {
    filesCreated: boolean;
    codeExecutes: boolean;
    testsPass: boolean;
    lintPasses: boolean;
    coverageMet: boolean;
    noVulnerabilities: boolean;
  };
  evidence: string[];
  deceptivePatterns?: string[];
}

export interface WorkerMessage {
  type: 'ready' | 'stream' | 'tool_call' | 'complete' | 'error' | 'verification' | 'spawn_child';
  workerId: string;
  taskId?: string;
  payload: any;
}

export interface PortInfo {
  port: number;
  agentId: string;
  parentId?: string;
  status: 'active' | 'idle' | 'terminated';
  createdAt: number;
}

// From expert docs: "parse LLM output for claims"
export interface ToolInvocation {
  tool: string;
  params: Record<string, any>;
  timestamp: number;
  rawText: string;
}