export interface GeminiConfig {
  enabled: boolean;
  autoConsult: boolean;
  cliCommand: string;
  timeout: number;
  rateLimitDelay: number;
  model: string;
  maxContext?: number;
  debug?: boolean;
  enableStreaming?: boolean;
  enableToolChaining?: boolean;
  maxRecursionDepth?: number;
}

export interface ConsultationResult {
  response: string;
  timestamp: number;
  query: string;
  context?: string;
  model: string;
  executionTime: number;
  error?: string;
}

export interface GeminiStatus {
  enabled: boolean;
  autoConsult: boolean;
  model: string;
  consultationCount: number;
  lastConsultation?: Date;
  rateLimitDelay: number;
  timeout: number;
}

export interface UncertaintyDetection {
  hasUncertainty: boolean;
  uncertaintyType?: 'basic' | 'complex_decision' | 'critical_operation';
  matches: string[];
}

export interface StreamingOptions {
  onData: (chunk: string) => void;
  onError?: (error: Error) => void;
  onEnd?: () => void;
}

export interface ToolChainRequest {
  steps: Array<{
    id: string;
    tool: string;
    params: any;
    dependsOn?: string[];
  }>;
  context?: string;
  maxDepth?: number;
}