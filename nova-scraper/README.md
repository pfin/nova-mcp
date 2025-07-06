# Nova Scraper - AI-Powered Web Scraping MCP Server

🎯 **"Extract meaning, not just data"** - Advanced scraping with intelligence

## Overview

Nova Scraper is an MCP server that combines traditional web scraping with AI-powered content understanding. It doesn't just extract data - it understands context, relationships, and meaning.

## Features

### 🧠 Intelligent Extraction
- **Auto-Structure Detection**: Identifies tables, lists, articles automatically
- **Semantic Understanding**: Extracts meaning, not just text
- **Relationship Mapping**: Finds connections between data points
- **Content Classification**: Categorizes extracted content

### 🛠️ Powerful Tools
- **nova_scrape**: Smart scraping with multiple strategies
- **nova_extract_article**: Clean article extraction (Readability)
- **nova_extract_structured**: Tables, lists, and structured data
- **nova_extract_metadata**: Schema.org, OpenGraph, JSON-LD
- **nova_extract_links**: Smart link extraction with categorization
- **nova_extract_images**: Image extraction with context
- **nova_convert**: Convert HTML to Markdown/Text/JSON
- **nova_analyze**: AI-powered content analysis
- **nova_monitor**: Track changes over time
- **nova_batch**: Bulk scraping with patterns

### 📊 Data Formats
- **JSON**: Structured data output
- **Markdown**: Clean, readable text
- **CSV**: Tabular data export
- **XML**: Hierarchical data
- **PDF**: Document extraction

## Installation

```bash
cd nova-scraper
npm install
npm run build
```

## Usage

### Basic Scraping
```javascript
// Smart scrape with auto-detection
await nova_scrape({
  url: "https://example.com",
  strategy: "auto"
});
```

### Article Extraction
```javascript
// Extract clean article content
await nova_extract_article({
  url: "https://example.com/article",
  includeMetadata: true
});
```

### Structured Data
```javascript
// Extract tables and lists
await nova_extract_structured({
  url: "https://example.com/data",
  types: ["table", "list", "dl"]
});
```

### Content Analysis
```javascript
// AI-powered analysis
await nova_analyze({
  url: "https://example.com",
  aspects: ["sentiment", "topics", "entities", "summary"]
});
```

## Extraction Strategies

### 1. **Auto Mode** (Default)
- Detects content type automatically
- Applies best extraction method
- Handles various formats

### 2. **Article Mode**
- Uses Mozilla Readability
- Cleans ads and navigation
- Preserves main content

### 3. **Data Mode**
- Focuses on structured data
- Extracts tables, lists
- Preserves data relationships

### 4. **Full Mode**
- Extracts everything
- Maintains structure
- Includes metadata

## Advanced Features

### Smart Selectors
```javascript
await nova_scrape({
  url: "https://example.com",
  selectors: {
    title: "h1, h2:first-of-type",
    price: "[class*=price], [id*=price]",
    description: "meta[name=description], .description"
  }
});
```

### Pattern Recognition
```javascript
await nova_batch({
  urls: ["url1", "url2", "url3"],
  pattern: "auto-detect",
  merge: true
});
```

### Change Monitoring
```javascript
await nova_monitor({
  url: "https://example.com",
  selector: ".price",
  interval: "1h",
  notify: true
});
```

## AI Capabilities

### Content Understanding
- Topic extraction
- Entity recognition
- Sentiment analysis
- Key phrase extraction

### Data Structuring
- Automatic schema generation
- Relationship discovery
- Data normalization
- Format conversion

### Quality Enhancement
- Data validation
- Duplicate detection
- Error correction
- Missing data inference

## Output Examples

### Article Extraction
```json
{
  "title": "Article Title",
  "author": "John Doe",
  "date": "2024-01-01",
  "content": "Clean article text...",
  "summary": "AI-generated summary",
  "topics": ["tech", "ai"],
  "readingTime": 5
}
```

### Structured Data
```json
{
  "tables": [{
    "headers": ["Name", "Price", "Stock"],
    "rows": [
      ["Product A", "$19.99", "In Stock"],
      ["Product B", "$29.99", "Limited"]
    ]
  }],
  "lists": [{
    "type": "ordered",
    "items": ["First", "Second", "Third"]
  }]
}
```

## Performance

- Concurrent scraping support
- Response caching
- Rate limiting
- Proxy rotation ready
- Error recovery

## Ethics & Compliance

- Respects robots.txt
- Rate limiting built-in
- User-agent rotation
- Session management

## Hip Hop Philosophy

"We don't just scrape the surface, we extract the essence. Like sampling in hip hop - we find the gems and remix them into something meaningful."

## Future Enhancements

- Visual scraping (screenshots + OCR)
- API endpoint detection
- GraphQL extraction
- WebSocket monitoring
- ML model training from scraped data