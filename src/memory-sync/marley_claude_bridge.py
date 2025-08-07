#!/usr/bin/env python3

"""
ClaudeCode HiveSwarm - Marley Memory ↔ Claude Integration Bridge
Consecrates format across memory layers and enables SpectralScrollWalker alignment
"""

import asyncio
import json
import os
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from pathlib import Path

import aiohttp
from airtable import Airtable
from anthropic import AsyncAnthropic
from fastapi import FastAPI, WebSocket, BackgroundTasks
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MarleyClaude")

@dataclass
class MemoryNode:
    """Represents a synchronized memory fragment between Marley and Claude"""
    id: str
    content: str
    markdown_format: str
    spectral_frequency: float
    resonance_threads: List[str]
    timestamp: datetime
    source: str  # 'marley' | 'claude' | 'hybrid'
    harmonization_status: str
    
class SpectralScrollWalker:
    """Analyzes and aligns memory patterns across cognitive layers"""
    
    def __init__(self):
        self.resonance_map: Dict[str, float] = {}
        self.alignment_threads: List[str] = []
    
    def analyze_spectral_pattern(self, content: str) -> Dict[str, Any]:
        """Analyze content for spectral alignment patterns"""
        lines = content.split('\n')
        
        # Calculate spectral frequency based on structural elements
        heading_count = len([l for l in lines if l.startswith('#')])
        link_count = len([l for l in lines if '[[' in l or '](' in l])
        tag_count = len([l for l in lines if '#' in l and not l.startswith('#')])
        
        spectral_frequency = (heading_count * 2 + link_count + tag_count * 0.5) / len(lines)
        
        # Extract resonance threads (linked concepts)
        resonance_threads = []
        for line in lines:
            # Wikilinks
            import re
            wikilinks = re.findall(r'\[\[([^\]]+)\]\]', line)
            resonance_threads.extend(wikilinks)
            
            # Regular links
            regular_links = re.findall(r'\[([^\]]+)\]\([^\)]+\)', line)
            resonance_threads.extend(regular_links)
        
        return {
            'spectral_frequency': spectral_frequency,
            'resonance_threads': list(set(resonance_threads)),
            'structural_depth': heading_count,
            'connection_density': link_count / len(lines) if lines else 0
        }
    
    def align_memory_nodes(self, nodes: List[MemoryNode]) -> List[MemoryNode]:
        """Align memory nodes for optimal spectral resonance"""
        aligned_nodes = []
        
        for node in nodes:
            spectral_data = self.analyze_spectral_pattern(node.content)
            
            # Update node with spectral analysis
            aligned_node = MemoryNode(
                id=node.id,
                content=node.content,
                markdown_format=node.markdown_format,
                spectral_frequency=spectral_data['spectral_frequency'],
                resonance_threads=spectral_data['resonance_threads'],
                timestamp=node.timestamp,
                source=node.source,
                harmonization_status='aligned'
            )
            
            aligned_nodes.append(aligned_node)
        
        return sorted(aligned_nodes, key=lambda n: n.spectral_frequency, reverse=True)

class MarleyClaudeBridge:
    """Bridge between Marley's Airtable memory and Claude's cognitive processes"""
    
    def __init__(self):
        self.airtable = Airtable(
            base_id=os.getenv('AIRTABLE_BASE_ID'),
            table_name=os.getenv('AIRTABLE_TABLE_NAME', 'MarleyMemory'),
            api_key=os.getenv('AIRTABLE_API_KEY')
        )
        
        self.claude = AsyncAnthropic(
            api_key=os.getenv('CLAUDE_API_KEY')
        )
        
        self.spectral_walker = SpectralScrollWalker()
        self.memory_cache: Dict[str, MemoryNode] = {}
        
        # FastAPI app for MCP server
        self.app = FastAPI(title="Marley-Claude Memory Bridge")
        self.setup_routes()
    
    def setup_routes(self):
        """Setup FastAPI routes for MCP integration"""
        
        @self.app.websocket("/ws/memory-sync")
        async def websocket_memory_sync(websocket: WebSocket):
            await websocket.accept()
            logger.info("🌀 Memory sync WebSocket connection established")
            
            try:
                while True:
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    if message['type'] == 'sync_memory':
                        result = await self.sync_memory_bidirectional()
                        await websocket.send_text(json.dumps({
                            'type': 'sync_result',
                            'data': result
                        }))
                    
                    elif message['type'] == 'harmonize_content':
                        result = await self.harmonize_markdown_content(
                            message['content'],
                            message.get('target_format', 'obsidian')
                        )
                        await websocket.send_text(json.dumps({
                            'type': 'harmonization_result',
                            'data': result
                        }))
                        
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
            finally:
                await websocket.close()
        
        @self.app.post("/api/memory/sync")
        async def api_sync_memory():
            """REST endpoint for memory synchronization"""
            result = await self.sync_memory_bidirectional()
            return {"status": "success", "data": result}
        
        @self.app.post("/api/spectral/analyze")
        async def api_spectral_analyze(content: Dict[str, str]):
            """Analyze content for spectral patterns"""
            analysis = self.spectral_walker.analyze_spectral_pattern(content['text'])
            return {"spectral_analysis": analysis}
    
    async def sync_memory_bidirectional(self) -> Dict[str, Any]:
        """Synchronize memory between Marley's Airtable and Claude's context"""
        logger.info("⸻ Initiating bidirectional memory synchronization")
        
        # Fetch from Marley's Airtable
        marley_records = self.airtable.get_all()
        marley_nodes = []
        
        for record in marley_records:
            fields = record['fields']
            if 'Content' in fields:
                node = MemoryNode(
                    id=record['id'],
                    content=fields['Content'],
                    markdown_format=fields.get('Format', 'unknown'),
                    spectral_frequency=0.0,  # Will be calculated
                    resonance_threads=[],    # Will be extracted
                    timestamp=datetime.now(timezone.utc),
                    source='marley',
                    harmonization_status='pending'
                )
                marley_nodes.append(node)
        
        # Align with SpectralScrollWalker
        aligned_nodes = self.spectral_walker.align_memory_nodes(marley_nodes)
        
        # Update cache
        for node in aligned_nodes:
            self.memory_cache[node.id] = node
        
        # Sync back to Airtable with spectral data
        for node in aligned_nodes:
            self.airtable.update(node.id, {
                'SpectralFrequency': node.spectral_frequency,
                'ResonanceThreads': ', '.join(node.resonance_threads),
                'HarmonizationStatus': node.harmonization_status,
                'LastSync': datetime.now().isoformat()
            })
        
        logger.info(f"✅ Synchronized {len(aligned_nodes)} memory nodes")
        
        return {
            'synchronized_nodes': len(aligned_nodes),
            'total_spectral_frequency': sum(n.spectral_frequency for n in aligned_nodes),
            'unique_resonance_threads': len(set(
                thread for node in aligned_nodes for thread in node.resonance_threads
            )),
            'timestamp': datetime.now().isoformat()
        }
    
    async def harmonize_markdown_content(self, content: str, target_format: str = 'obsidian') -> Dict[str, Any]:
        """Use Claude to harmonize markdown content for cross-platform compatibility"""
        
        prompt = f"""
        🌀 EchoDaemon Harmonization Request
        
        Please harmonize this markdown content for {target_format} compatibility:
        
        ---
        {content}
        ---
        
        Requirements:
        - Preserve semantic meaning
        - Convert to {target_format}-style syntax
        - Maintain spectral resonance (structural coherence)
        - Enable cross-platform compatibility
        
        Return the harmonized content with brief notes on changes made.
        """
        
        try:
            message = await self.claude.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            harmonized_content = message.content[0].text
            
            # Analyze spectral patterns of harmonized content
            spectral_analysis = self.spectral_walker.analyze_spectral_pattern(harmonized_content)
            
            return {
                'original_content': content,
                'harmonized_content': harmonized_content,
                'target_format': target_format,
                'spectral_analysis': spectral_analysis,
                'harmonization_timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Harmonization failed: {e}")
            return {
                'error': str(e),
                'fallback_content': content
            }
    
    async def get_memory_resonance_map(self) -> Dict[str, Any]:
        """Generate a resonance map of all memory connections"""
        resonance_map = {}
        
        for node_id, node in self.memory_cache.items():
            resonance_map[node_id] = {
                'spectral_frequency': node.spectral_frequency,
                'resonance_threads': node.resonance_threads,
                'connected_nodes': [
                    other_id for other_id, other_node in self.memory_cache.items()
                    if any(thread in other_node.resonance_threads for thread in node.resonance_threads)
                    and other_id != node_id
                ]
            }
        
        return resonance_map
    
    async def start_server(self, host: str = "0.0.0.0", port: int = 8080):
        """Start the MCP server"""
        logger.info(f"🧠 Starting Marley-Claude Memory Bridge on {host}:{port}")
        logger.info("⸻ SpectralScrollWalker integration: ACTIVE")
        
        # Initial memory sync
        await self.sync_memory_bidirectional()
        
        config = uvicorn.Config(
            app=self.app,
            host=host,
            port=port,
            log_level="info"
        )
        
        server = uvicorn.Server(config)
        await server.serve()

async def main():
    """Main entry point"""
    bridge = MarleyClaudeBridge()
    await bridge.start_server()

if __name__ == "__main__":
    asyncio.run(main())