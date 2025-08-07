#!/usr/bin/env node

/**
 * ClaudeCode HiveSwarm - Basic Express Server
 * Simple implementation for markdown processing
 */

import express from 'express';

interface MarkdownRequest {
  content: string;
  sourceDialect: string;
  targetDialect: string;
}

class BasicServer {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'hiveswarm-basic-server',
        version: '2.0.0'
      });
    });

    this.app.post('/detect-format', (req, res) => {
      try {
        const { content } = req.body;
        const result = this.detectFormat(content || '');
        res.json(result);
      } catch (err) {
        const error = err as Error;
        res.status(500).json({ 
          error: 'Format detection failed', 
          message: error.message || 'Unknown error' 
        });
      }
    });

    this.app.post('/harmonize', (req, res) => {
      try {
        const request: MarkdownRequest = req.body;
        const result = this.harmonizeContent(request);
        res.json(result);
      } catch (err) {
        const error = err as Error;
        res.status(500).json({ 
          error: 'Harmonization failed', 
          message: error.message || 'Unknown error' 
        });
      }
    });

    this.app.post('/spectral-align', (req, res) => {
      try {
        const { content, depth = 3 } = req.body;
        const result = this.analyzeSpectralAlignment(content || '', depth);
        res.json(result);
      } catch (err) {
        const error = err as Error;
        res.status(500).json({ 
          error: 'Spectral analysis failed', 
          message: error.message || 'Unknown error' 
        });
      }
    });
  }

  private detectFormat(content: string): any {
    const patterns = {
      obsidian: [
        /\[\[([^\]]+)\]\]/g,  // Wikilinks
        /\$\$[\s\S]*?\$\$/g,   // Math blocks
        /> \[!(\w+)\]/g,       // Callouts
        /#[\w-]+/g             // Tags
      ],
      github: [
        /```[\s\S]*?```/g,     // Code blocks
        /- \[ \]/g,            // Task lists
        /@[\w-]+/g,            // Mentions
        /#{1,6} /g             // Headers
      ],
      hugo: [
        /{{.*?}}/g,            // Shortcodes
        /---[\s\S]*?---/g,     // Front matter
        /<!--.*?-->/g          // Comments
      ],
      pandoc: [
        /\[@[\w-]+\]/g,        // Citations
        /^::: /gm,             // Divs
        /\^[\w-]+/g            // Footnotes
      ]
    };

    const scores: Record<string, number> = {};
    
    for (const [dialect, patternList] of Object.entries(patterns)) {
      let score = 0;
      for (const pattern of patternList) {
        const matches = content.match(pattern);
        score += matches ? matches.length : 0;
      }
      scores[dialect] = score;
    }

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const dominant = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );

    return {
      dominantDialect: dominant,
      confidence: totalScore > 0 ? scores[dominant] / totalScore : 0,
      dialectScores: scores,
      timestamp: new Date().toISOString()
    };
  }

  private harmonizeContent(request: MarkdownRequest): any {
    // Simple harmonization - just return processed content
    const processed = this.processMarkdown(request.content);

    return {
      originalContent: request.content,
      harmonizedContent: processed,
      sourceDialect: request.sourceDialect,
      targetDialect: request.targetDialect,
      spectralResonance: this.analyzeSpectralAlignment(processed, 2),
      timestamp: new Date().toISOString()
    };
  }

  private processMarkdown(content: string): string {
    // Basic markdown processing
    return content
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .replace(/\n\n+/g, '\n\n'); // Clean up multiple newlines
  }

  private analyzeSpectralAlignment(content: string, depth: number): any {
    const lines = content.split('\n');
    const headingPattern = /^#{1,6} /;
    const linkPattern = /\[([^\]]+)\]/g;
    
    const frequency = lines.filter(line => headingPattern.test(line)).length;
    const resonance: string[] = [];
    
    for (const line of lines.slice(0, depth * 10)) {
      const matches = line.match(linkPattern);
      if (matches) {
        for (const match of matches) {
          resonance.push(match.replace(/[\[\]]/g, ''));
        }
      }
    }

    const uniqueResonance = Array.from(new Set(resonance));

    return {
      frequency,
      resonance: uniqueResonance,
      harmonics: {
        structuralDepth: depth,
        linkDensity: lines.length > 0 ? resonance.length / lines.length : 0,
        coherenceScore: frequency * 0.1 + resonance.length * 0.05
      }
    };
  }

  start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`🌀 HiveSwarm Basic Server listening on port ${port}`);
      console.log(`⸻ SpectralScrollWalker alignment: ACTIVE`);
      console.log(`📡 Endpoints: /health, /detect-format, /harmonize, /spectral-align`);
      console.log(`🚀 Ready for markdown processing!`);
    });
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new BasicServer();
  server.start();
}

export { BasicServer };