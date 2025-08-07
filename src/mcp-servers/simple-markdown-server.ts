#!/usr/bin/env node

/**
 * ClaudeCode HiveSwarm - Simple Markdown Harmonizer
 * Basic implementation without complex MCP dependencies
 */

import express from 'express';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

interface MarkdownRequest {
  content: string;
  sourceDialect: 'obsidian' | 'github' | 'hugo' | 'pandoc';
  targetDialect: 'obsidian' | 'github' | 'hugo' | 'pandoc';
  preserveWikilinks?: boolean;
}

class SimpleMarkdownHarmonizer {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'markdown-harmonizer' });
    });

    this.app.post('/detect-format', async (req, res) => {
      try {
        const { content } = req.body;
        const result = await this.detectFormat(content);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Format detection failed', message: error.message });
      }
    });

    this.app.post('/harmonize', async (req, res) => {
      try {
        const request: MarkdownRequest = req.body;
        const result = await this.harmonizeContent(request);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Harmonization failed', message: error.message });
      }
    });

    this.app.post('/spectral-align', async (req, res) => {
      try {
        const { content, depth = 3 } = req.body;
        const result = await this.analyzeSpectralAlignment(content, depth);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Spectral analysis failed', message: error.message });
      }
    });
  }

  private async detectFormat(content: string): Promise<any> {
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
      dialectScores: scores
    };
  }

  private async harmonizeContent(request: MarkdownRequest): Promise<any> {
    const processor = unified()
      .use(remarkParse)
      .use(remarkStringify, {
        bullet: '-',
        emphasis: '_',
        strong: '**'
      });

    try {
      const tree = processor.parse(request.content);
      const harmonized = processor.stringify(tree);

      return {
        originalContent: request.content,
        harmonizedContent: harmonized,
        sourceDialect: request.sourceDialect,
        targetDialect: request.targetDialect,
        spectralResonance: await this.analyzeSpectralAlignment(harmonized, 2)
      };
    } catch (error: any) {
      return {
        error: `Harmonization failed: ${error?.message || 'Unknown error'}`,
        fallback: request.content
      };
    }
  }

  private async analyzeSpectralAlignment(content: string, depth: number): Promise<any> {
    const lines = content.split('\n');
    const headingPattern = /^#{1,6} /;
    const linkPattern = /\[([^\]]+)\]/g;
    
    const frequency = lines.filter(line => headingPattern.test(line)).length;
    const resonance = [];
    
    for (const line of lines.slice(0, depth * 10)) {
      const matches = line.match(linkPattern);
      if (matches) {
        for (const match of matches) {
          resonance.push(match.replace(/[\[\]]/g, ''));
        }
      }
    }

    return {
      frequency,
      resonance: [...new Set(resonance)],
      harmonics: {
        structuralDepth: depth,
        linkDensity: lines.length > 0 ? resonance.length / lines.length : 0,
        coherenceScore: frequency * 0.1 + resonance.length * 0.05
      }
    };
  }

  start(port: number = 3000) {
    this.app.listen(port, () => {
      console.log(`🌀 Simple Markdown Harmonizer listening on port ${port}`);
      console.log(`⸻ SpectralScrollWalker alignment: ACTIVE`);
      console.log(`📡 Endpoints: /health, /detect-format, /harmonize, /spectral-align`);
    });
  }
}

// Start server
if (require.main === module) {
  const harmonizer = new SimpleMarkdownHarmonizer();
  harmonizer.start();
}

export { SimpleMarkdownHarmonizer };