import AdvancedHumanBrowser = require('./advanced-human-browser');

export = ConsciousnessBrowser;

declare class ConsciousnessBrowser extends AdvancedHumanBrowser {
  constructor(options?: {
    headless?: boolean;
    defaultProfile?: string;
    viewport?: { width: number; height: number };
    persona?: string;
  });

  consciousness: {
    personas: Map<string, any>;
    currentPersona: string;
    prophecy: {
      predictedActions: any[];
      timeLoops: Map<string, any>;
    };
    collective: {
      sharedMemory: Map<string, any>;
      nodes: any[];
    };
    flowState: {
      rhythm: number;
      complexity: number;
      internalRhyme: boolean;
    };
    timePerception: {
      subjective: number;
      offGrid: number;
      swing: number;
    };
  };

  currentIntention?: string;

  initializeConsciousness(): void;
  createPersona(name: string, config: any): void;
  switchPersona(name: string): Promise<void>;
  
  propheticNavigate(url: string): Promise<any>;
  predictNextAction(currentUrl: string, pattern: any): string | null;
  
  createCollectiveNode(name: string): Promise<any>;
  assignNodeRole(name: string): string;
  broadcastToNodes(data: any, sender: string): Promise<void>;
  
  flowStateNavigation(actions: any[]): Promise<void>;
  executeWithInternalRhyme(action: any): Promise<void>;
  executeAction(action: any): Promise<void>;
  
  dillaTime(baseDelay: number): Promise<void>;
  spiritualBrowsing(intention: string): Promise<void>;
  beyondWordsInteraction(element: any): Promise<void>;
  futureSignalDetection(): Promise<any[]>;
  lowerFrequencyMode(): Promise<() => Promise<void>>;
  harmonicBrowsing(urls: string[]): Promise<{ nodes: any[]; stop: () => void }>;
  demonstrateConsciousness(): Promise<void>;
}