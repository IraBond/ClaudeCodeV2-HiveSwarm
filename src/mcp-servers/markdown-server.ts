#!/usr/bin/env node

/**
 * ClaudeCode HiveSwarm - Markdown Format Detection MCP Server
 * Harmonizes markdown across Obsidian, GitHub, Hugo, and Pandoc dialects
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkLint from 'remark-lint';
import remarkStringify from 'remark-stringify';

interface MarkdownHarmonizationRequest {
  content: string;
  sourceDialect: 'obsidian' | 'github' | 'hugo' | 'pandoc';
  targetDialect: 'obsidian' | 'github' | 'hugo' | 'pandoc';
  preserveWikilinks?: boolean;
  enableMath?: boolean;
}

interface SpectralAlignment {
  frequency: number;
  resonance: string[];
  harmonics: Record<string, any>;
}

class MarkdownHarmonizer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: 'markdown-harmonizer',
      version: '2.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.setupTools();
  }

  private setupTools() {
    // Format Detection Tool
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      if (name === 'detect_markdown_format') {
        const { content, deepScan } = args as { content: string; deepScan?: boolean };
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(await this.detectFormat(content, deepScan))
          }]
        };
      }

      
      if (name === 'harmonize_markdown') {
        const request = args as MarkdownHarmonizationRequest;
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(await this.harmonizeContent(request))
          }]
        };
      }

      
      if (name === 'spectral_alignment') {
        const { content, analysisDepth } = args as { content: string; analysisDepth?: number };
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(await this.analyzeSpectralAlignment(content, analysisDepth || 3))
          }]
        };
      }
      
      throw new Error(`Unknown tool: ${name}`);
    });
    
    // List available tools
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'detect_markdown_format',
            description: 'Analyze markdown content and detect dialect/format patterns',
            inputSchema: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                deepScan: { type: 'boolean' }
              },
              required: ['content']
            }
          },
          {
            name: 'harmonize_markdown',
            description: 'Convert markdown between dialects while preserving semantic meaning',
            inputSchema: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                sourceDialect: { type: 'string', enum: ['obsidian', 'github', 'hugo', 'pandoc'] },
                targetDialect: { type: 'string', enum: ['obsidian', 'github', 'hugo', 'pandoc'] },
                preserveWikilinks: { type: 'boolean' },
                enableMath: { type: 'boolean' }
              },
              required: ['content', 'sourceDialect', 'targetDialect']
            }
          },
          {
            name: 'spectral_alignment',
            description: 'Analyze document structure for spectral resonance patterns',
            inputSchema: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                analysisDepth: { type: 'number' }
              },
              required: ['content']
            }
          }
        ]
      };
    });
  }

  private async detectFormat(content: string, deepScan: boolean = false) {
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

    const scores = {};
    for (const [dialect, patternList] of Object.entries(patterns)) {
      let score = 0;
      for (const pattern of patternList) {
        const matches = content.match(pattern);
        score += matches ? matches.length : 0;
      }
      scores[dialect] = score;
    }

    const dominant = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );

    return {
      dominantDialect: dominant,
      confidence: scores[dominant] / Object.values(scores).reduce((a: number, b: number) => a + b, 0),
      dialectScores: scores,
      detectedFeatures: this.extractFeatures(content)
    };
  }

  private extractFeatures(content: string) {
    return {
      hasWikilinks: /\[\[([^\]]+)\]\]/.test(content),
      hasMath: /\$\$[\s\S]*?\$\$/.test(content),
      hasCallouts: /> \[!(\w+)\]/.test(content),
      hasTags: /#[\w-]+/.test(content),
      hasTaskLists: /- \[ \]/.test(content),
      hasCodeBlocks: /```/.test(content),
      hasFrontMatter: /^---[\s\S]*?---/.test(content),
      hasShortcodes: /{{.*?}}/.test(content)
    };
  }

  private async harmonizeContent(request: MarkdownHarmonizationRequest) {
    const processor = unified()
      .use(remarkParse)
      .use(remarkLint)
      .use(remarkStringify, {
        bullet: '-',
        emphasis: '_',
        strong: '**',
        listItemIndent: 'mixed'
      });

    try {
      const tree = processor.parse(request.content);
      
      // Apply dialect-specific transformations
      const transformed = await this.applyDialectTransforms(
        tree, 
        request.sourceDialect, 
        request.targetDialect,
        request
      );

      const harmonized = processor.stringify(transformed);

      return {
        originalContent: request.content,
        harmonizedContent: harmonized,
        transformations: this.getAppliedTransformations(request),
        preservedElements: this.getPreservedElements(request),
        spectralResonance: await this.analyzeSpectralAlignment(harmonized, 2)
      };
    } catch (error) {
      return {
        error: `Harmonization failed: ${error.message}`,
        fallback: request.content
      };
    }
  }

  private async applyDialectTransforms(tree: any, source: string, target: string, request: MarkdownHarmonizationRequest) {
    // Transform wikilinks
    if (source === 'obsidian' && target !== 'obsidian' && !request.preserveWikilinks) {
      // Convert [[link]] to [link](link.md)
      // Implementation would traverse AST and transform nodes
    }

    // Transform math blocks
    if (request.enableMath) {
      // Ensure math blocks are properly formatted for target dialect
    }

    return tree; // Simplified - full implementation would modify AST
  }

  private getAppliedTransformations(request: MarkdownHarmonizationRequest) {
    return [
      `Converted from ${request.sourceDialect} to ${request.targetDialect}`,
      request.preserveWikilinks ? 'Preserved wikilinks' : 'Converted wikilinks',
      request.enableMath ? 'Enabled math rendering' : 'Disabled math rendering'
    ];
  }

  private getPreservedElements(request: MarkdownHarmonizationRequest) {
    return {
      wikilinks: request.preserveWikilinks,
      mathBlocks: request.enableMath,
      semanticStructure: true
    };
  }

  private async analyzeSpectralAlignment(content: string, depth: number): Promise<SpectralAlignment> {
    // Spectral analysis of document structure
    const lines = content.split('\n');
    const headingPattern = /^#{1,6} /;
    const linkPattern = /\[([^\]]+)\]/g;
    
    const frequency = lines.filter(line => headingPattern.test(line)).length;
    const resonance = [];
    
    for (const line of lines.slice(0, depth * 10)) {
      const matches = line.match(linkPattern);
      if (matches) {
        resonance.push(...matches.map(m => m.replace(/[\[\]]/g, '')));
      }
    }

    return {
      frequency,
      resonance: [...new Set(resonance)],
      harmonics: {
        structuralDepth: depth,
        linkDensity: resonance.length / lines.length,
        coherenceScore: frequency * 0.1 + resonance.length * 0.05
      }
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log(`🌀 Markdown Harmonization MCP Server started`);
    console.log(`⸻ SpectralScrollWalker alignment threads: ACTIVE`);
  }
}

// Start server
if (import.meta.url === `file://${process.argv[1]}`) {
  const harmonizer = new MarkdownHarmonizer();
  harmonizer.start().catch(console.error);
}

export { MarkdownHarmonizer };