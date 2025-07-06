export = AdvancedHumanBrowser;

declare class AdvancedHumanBrowser {
  constructor(options?: {
    headless?: boolean;
    defaultProfile?: string;
    viewport?: { width: number; height: number };
    biometrics?: any;
    autoBreaks?: boolean;
  });

  biometrics: {
    heartRate: number;
    breathingRate: number;
    stress: number;
    fatigueFactor: number;
    caffeineLevel: number;
    attention: number;
    typingSpeed?: number;
  };

  emotionalState: {
    mood: string;
    patience: number;
    curiosity: number;
    confidence?: number;
  };

  memory: {
    typingPatterns: Map<string, any>;
  };

  page: any;
  browser: any;
  deviceProfile: any;
  readingSpeed: number;
  mouseSpeed: number;

  launch(profileName?: string): Promise<{ browser: any; page: any }>;
  newPage(): Promise<void>;
  goto(url: string): Promise<void>;
  close(): Promise<void>;
  wait(min: number, max?: number): Promise<void>;
  
  updateBiometrics(updates?: any): string;
  updateEmotionalState(event: { type: string }): void;
  breathingPattern(): number;
  
  typeWithPersonality(selector: string, text: string, options?: { clear?: boolean }): Promise<void>;
  moveMouseBiometrically(x: number, y: number): Promise<void>;
  intelligentClick(selector: string): Promise<void>;
  organicScroll(direction: string): Promise<void>;
  contextualWait(context: string): Promise<void>;
  readWithAttention(selector: string): Promise<void>;
  performClick(): Promise<void>;
}