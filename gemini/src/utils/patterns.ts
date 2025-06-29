import { UncertaintyDetection } from '../types/index.js';

// Uncertainty patterns based on the GitHub Gist
export const UNCERTAINTY_PATTERNS = [
  /\bI'm not sure\b/i,
  /\bI think\b/i,
  /\bpossibly\b/i,
  /\bprobably\b/i,
  /\bmight be\b/i,
  /\bcould be\b/i,
  /\buncertain\b/i,
  /\bnot certain\b/i,
  /\bhard to say\b/i,
  /\bdepends on\b/i,
];

export const COMPLEX_DECISION_PATTERNS = [
  /\bmultiple approaches\b/i,
  /\bseveral options\b/i,
  /\btrade-offs?\b/i,
  /\balternatives?\b/i,
  /\bpros and cons\b/i,
  /\bconsider(?:ing)?\b/i,
  /\bweigh(?:ing)? the options\b/i,
  /\bdifferent ways\b/i,
  /\bvarious methods\b/i,
];

export const CRITICAL_OPERATION_PATTERNS = [
  /\bproduction\b/i,
  /\bdatabase migration\b/i,
  /\bsecurity\b/i,
  /\bauthentication\b/i,
  /\bauthorization\b/i,
  /\bencryption\b/i,
  /\bdeployment\b/i,
  /\bscaling\b/i,
  /\bperformance critical\b/i,
  /\bdata loss\b/i,
  /\bbackup\b/i,
];

export function detectUncertainty(text: string): UncertaintyDetection {
  const matches: string[] = [];
  let uncertaintyType: 'basic' | 'complex_decision' | 'critical_operation' | undefined;

  // Check for basic uncertainty
  for (const pattern of UNCERTAINTY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0]);
      uncertaintyType = 'basic';
    }
  }

  // Check for complex decision patterns
  for (const pattern of COMPLEX_DECISION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0]);
      uncertaintyType = 'complex_decision';
    }
  }

  // Check for critical operation patterns (highest priority)
  for (const pattern of CRITICAL_OPERATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0]);
      uncertaintyType = 'critical_operation';
    }
  }

  return {
    hasUncertainty: matches.length > 0,
    uncertaintyType,
    matches: [...new Set(matches)], // Remove duplicates
  };
}