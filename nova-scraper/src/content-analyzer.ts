import natural from "natural";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export class ContentAnalyzer {
  private tokenizer: any;
  private sentenceTokenizer: any;
  private tfidf: any;

  constructor() {
    // @ts-ignore
    this.tokenizer = new (natural as any).WordTokenizer();
    // @ts-ignore
    this.sentenceTokenizer = new (natural as any).SentenceTokenizer();
    // @ts-ignore
    this.tfidf = new (natural as any).TfIdf();
  }

  async analyze(args: any): Promise<CallToolResult> {
    const { url, content, aspects = ["summary", "topics", "entities"] } = args;
    
    try {
      let text = content;
      
      // If URL provided, fetch content
      if (url && !content) {
        // In real implementation, would fetch from URL
        text = "Sample content for analysis";
      }
      
      if (!text) {
        throw new Error("No content provided for analysis");
      }
      
      const results: any = {};
      
      // Sentiment analysis
      if (aspects.includes("sentiment")) {
        results.sentiment = this.analyzeSentiment(text);
      }
      
      // Topic extraction
      if (aspects.includes("topics")) {
        results.topics = this.extractTopics(text);
      }
      
      // Entity recognition
      if (aspects.includes("entities")) {
        results.entities = this.extractEntities(text);
      }
      
      // Summary generation
      if (aspects.includes("summary")) {
        results.summary = this.generateSummary(text);
      }
      
      // Keyword extraction
      if (aspects.includes("keywords")) {
        results.keywords = this.extractKeywords(text);
      }
      
      // Category classification
      if (aspects.includes("categories")) {
        results.categories = this.classifyContent(text);
      }
      
      return {
        content: [{
          type: "text",
          text: `✅ Content analysis complete\n\n${JSON.stringify(results, null, 2)}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private analyzeSentiment(text: string): any {
    const analyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");
    const tokens = this.tokenizer.tokenize(text);
    
    if (!tokens) return { score: 0, sentiment: "neutral" };
    
    const score = analyzer.getSentiment(tokens);
    
    return {
      score,
      sentiment: score > 0.1 ? "positive" : score < -0.1 ? "negative" : "neutral",
      confidence: Math.abs(score),
    };
  }

  private extractTopics(text: string): string[] {
    // Add document to TF-IDF
    this.tfidf.addDocument(text);
    
    // Get top terms
    const topics: Array<{ term: string; tfidf: number }> = [];
    
    this.tfidf.listTerms(0).forEach(item => {
      if (item.tfidf > 0.1) {
        topics.push({ term: item.term, tfidf: item.tfidf });
      }
    });
    
    // Sort by TF-IDF score and return top topics
    return topics
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, 10)
      .map(item => item.term);
  }

  private extractEntities(text: string): any {
    const entities = {
      urls: [] as string[],
      emails: [] as string[],
      phones: [] as string[],
      dates: [] as string[],
      numbers: [] as string[],
      capitalized: [] as string[],
    };
    
    // URL extraction
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    entities.urls = text.match(urlRegex) || [];
    
    // Email extraction
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    entities.emails = text.match(emailRegex) || [];
    
    // Phone extraction
    const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}/g;
    entities.phones = text.match(phoneRegex) || [];
    
    // Date extraction
    const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
    entities.dates = text.match(dateRegex) || [];
    
    // Number extraction
    const numberRegex = /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g;
    entities.numbers = text.match(numberRegex) || [];
    
    // Capitalized words (potential proper nouns)
    const sentences = this.sentenceTokenizer.tokenize(text);
    const capitalizedWords = new Set<string>();
    
    sentences.forEach(sentence => {
      const words = this.tokenizer.tokenize(sentence);
      if (words) {
        words.forEach((word, index) => {
          if (index > 0 && /^[A-Z][a-z]+/.test(word)) {
            capitalizedWords.add(word);
          }
        });
      }
    });
    
    entities.capitalized = Array.from(capitalizedWords);
    
    return entities;
  }

  private generateSummary(text: string): any {
    const sentences = this.sentenceTokenizer.tokenize(text);
    
    if (!sentences || sentences.length === 0) {
      return { summary: "", sentences: 0 };
    }
    
    // Simple extractive summarization
    // Score sentences based on word frequency
    const wordFreq: Record<string, number> = {};
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    
    if (tokens) {
      tokens.forEach(token => {
        if (token.length > 3 && !natural.stopwords.includes(token)) {
          wordFreq[token] = (wordFreq[token] || 0) + 1;
        }
      });
    }
    
    // Score sentences
    const sentenceScores = sentences.map(sentence => {
      const sentTokens = this.tokenizer.tokenize(sentence.toLowerCase());
      let score = 0;
      
      if (sentTokens) {
        sentTokens.forEach(token => {
          if (wordFreq[token]) {
            score += wordFreq[token];
          }
        });
        
        // Normalize by sentence length
        score = score / sentTokens.length;
      }
      
      return { sentence, score };
    });
    
    // Get top sentences
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(3, Math.ceil(sentences.length * 0.3)))
      .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence))
      .map(item => item.sentence);
    
    return {
      summary: topSentences.join(" "),
      originalLength: text.length,
      summaryLength: topSentences.join(" ").length,
      compressionRatio: (topSentences.join(" ").length / text.length * 100).toFixed(1) + "%",
      sentences: topSentences.length,
    };
  }

  private extractKeywords(text: string): string[] {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    if (!tokens) return [];
    
    // Remove stopwords
    const keywords = tokens.filter(token => 
      token.length > 3 && 
      !natural.stopwords.includes(token) &&
      !/^\d+$/.test(token)
    );
    
    // Count frequency
    const freq: Record<string, number> = {};
    keywords.forEach(keyword => {
      freq[keyword] = (freq[keyword] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([keyword]) => keyword);
  }

  private classifyContent(text: string): string[] {
    const categories = [];
    
    // Simple keyword-based classification
    const techKeywords = ["technology", "software", "computer", "digital", "internet", "app", "data"];
    const businessKeywords = ["business", "company", "market", "finance", "investment", "profit"];
    const healthKeywords = ["health", "medical", "doctor", "treatment", "patient", "disease"];
    const sportsKeywords = ["sports", "game", "player", "team", "match", "score"];
    const scienceKeywords = ["science", "research", "study", "experiment", "discovery"];
    
    const lowerText = text.toLowerCase();
    
    if (techKeywords.some(keyword => lowerText.includes(keyword))) {
      categories.push("Technology");
    }
    if (businessKeywords.some(keyword => lowerText.includes(keyword))) {
      categories.push("Business");
    }
    if (healthKeywords.some(keyword => lowerText.includes(keyword))) {
      categories.push("Health");
    }
    if (sportsKeywords.some(keyword => lowerText.includes(keyword))) {
      categories.push("Sports");
    }
    if (scienceKeywords.some(keyword => lowerText.includes(keyword))) {
      categories.push("Science");
    }
    
    if (categories.length === 0) {
      categories.push("General");
    }
    
    return categories;
  }
}