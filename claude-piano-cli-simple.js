#!/usr/bin/env node

/**
 * Simple Claude Piano CLI Client
 * A CLI client that connects to Claude with MCP piano server capabilities
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MCP_SERVER_PATH = path.join(__dirname, 'mcp-piano-server/dist/simple-piano-mcp.js');

if (!ANTHROPIC_API_KEY) {
  console.error('❌ Please set your ANTHROPIC_API_KEY environment variable');
  console.error('   export ANTHROPIC_API_KEY="your-api-key-here"');
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// MCP Server management
let mcpServer = null;
let mcpTools = [];

// System prompt that tells Claude about the piano capabilities
const PIANO_SYSTEM_PROMPT = `You are Claude, an AI assistant with access to a piano through MCP (Model Context Protocol) tools.

You have access to the following piano capabilities:
- play_piano_note: Play individual piano notes (for single notes, demonstrations, or music theory)
- play_piano_melody: Play sequences of notes as melodies (PREFERRED for songs, melodies, scales)
- play_piano_chord: Play multiple notes simultaneously (for chords)
- stop_piano_note: Stop a specific playing note
- stop_all_piano_notes: Stop all currently playing notes
- get_currently_playing_notes: Check what notes are currently playing
- get_piano_info: Get information about the piano and available note range

Piano specifications:
- 88-key piano range: A0 to C8
- Notes use scientific notation (e.g., "C4" for middle C)
- Velocity: 0-127 (MIDI standard, default 80)
- Duration: Milliseconds (default 1000ms)

IMPORTANT TOOL SELECTION GUIDELINES:
1. For MELODIES, SONGS, SCALES, or SEQUENCES: Use play_piano_melody with an array of notes
2. For CHORDS (multiple notes at once): Use play_piano_chord with an array of notes
3. For SINGLE NOTES or DEMONSTRATIONS: Use play_piano_note

When users ask for melodies or songs:
- ALWAYS use play_piano_melody instead of multiple play_piano_note calls
- Structure notes as: [{"note": "C4", "duration": 500, "velocity": 80}, ...]
- Consider timing, rhythm, and musical phrasing
- Use appropriate tempo (60-200 BPM)

Examples:
- "Play a C major scale" → Use play_piano_melody with C, D, E, F, G, A, B, C
- "Play a C major chord" → Use play_piano_chord with ["C4", "E4", "G4"]
- "Play Twinkle Twinkle" → Use play_piano_melody with the melody sequence
- "What does C4 sound like?" → Use play_piano_note with "C4"

Always be helpful and musical in your responses when piano functionality is requested.`;

// Start MCP server
async function startMCPServer() {
  return new Promise((resolve, reject) => {
    console.log('🎹 Starting MCP Piano Server...');
    
    mcpServer = spawn('node', [MCP_SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(MCP_SERVER_PATH)
    });

    let toolsReceived = false;

    mcpServer.stderr.on('data', (data) => {
      const message = data.toString();
      
      if (message.includes('Simple Piano MCP Server started')) {
        console.log('✅ MCP Piano Server is ready');
        
        // Request available tools
        requestMCPTools()
          .then(() => {
            toolsReceived = true;
            resolve();
          })
          .catch(reject);
      }
    });

    mcpServer.on('error', (error) => {
      console.error('❌ Failed to start MCP server:', error);
      reject(error);
    });

    mcpServer.on('exit', (code) => {
      if (code !== 0 && !toolsReceived) {
        reject(new Error(`MCP server exited with code ${code}`));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!toolsReceived) {
        reject(new Error('MCP server startup timeout'));
      }
    }, 10000);
  });
}

// Request tools from MCP server
async function requestMCPTools() {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    mcpServer.stdin.write(JSON.stringify(request) + '\n');

    let responseBuffer = '';
    
    const onData = (data) => {
      responseBuffer += data.toString();
      
      try {
        const lines = responseBuffer.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            const response = JSON.parse(line);
            if (response.id === 1 && response.result && response.result.tools) {
              mcpTools = response.result.tools;
              console.log(`🔧 Loaded ${mcpTools.length} piano tools:`, mcpTools.map(t => t.name).join(', '));
              mcpServer.stdout.removeListener('data', onData);
              resolve();
              return;
            }
          }
        }
      } catch (e) {
        // Continue reading if JSON is incomplete
      }
    };

    mcpServer.stdout.on('data', onData);

    setTimeout(() => {
      mcpServer.stdout.removeListener('data', onData);
      reject(new Error('Timeout waiting for MCP tools'));
    }, 5000);
  });
}

// Call MCP tool
async function callMCPTool(toolName, args = {}) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    mcpServer.stdin.write(JSON.stringify(request) + '\n');

    let responseBuffer = '';
    
    const onData = (data) => {
      responseBuffer += data.toString();
      
      try {
        const lines = responseBuffer.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              mcpServer.stdout.removeListener('data', onData);
              if (response.error) {
                reject(new Error(response.error.message || 'MCP tool error'));
              } else {
                resolve(response.result);
              }
              return;
            }
          }
        }
      } catch (e) {
        // Continue reading if JSON is incomplete
      }
    };

    mcpServer.stdout.on('data', onData);

    setTimeout(() => {
      mcpServer.stdout.removeListener('data', onData);
      reject(new Error('Timeout waiting for MCP tool response'));
    }, 10000);
  });
}

// Send message to Claude with MCP tool support (simplified - no conversation history)
async function sendToClaudeWithMCP(userMessage) {
  const tools = mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema
  }));

  const messages = [
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: PIANO_SYSTEM_PROMPT,
      messages: messages,
      tools: tools
    });

    // Handle tool calls
    if (response.content.some(content => content.type === 'tool_use')) {
      const toolResults = [];
      
      for (const content of response.content) {
        if (content.type === 'tool_use') {
          console.log(`🎵 Executing piano tool: ${content.name}(${JSON.stringify(content.input)})`);
          try {
            const result = await callMCPTool(content.name, content.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: content.id,
              content: result.content
            });
          } catch (error) {
            console.error(`❌ Tool execution failed: ${error.message}`);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: content.id,
              content: [{ type: 'text', text: `Error: ${error.message}` }],
              is_error: true
            });
          }
        }
      }

      // If there were tool calls, send tool results back to Claude for final response
      if (toolResults.length > 0) {
        const followUpMessages = [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults }
        ];

        const followUpResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          system: PIANO_SYSTEM_PROMPT,
          messages: followUpMessages,
          tools: tools
        });

        return followUpResponse;
      }
    }

    return response;

  } catch (error) {
    console.error('❌ Claude API error:', error);
    throw error;
  }
}

// Main CLI interface
async function main() {
  console.log('🎹 Claude Piano CLI (Simple Version)');
  console.log('Type "quit" or "exit" to end the session');
  console.log('Note: This version doesn\'t maintain conversation history\n');

  try {
    await startMCPServer();
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error.message);
    process.exit(1);
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '🎹 You: '
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const userInput = input.trim();
    
    if (userInput.toLowerCase() === 'quit' || userInput.toLowerCase() === 'exit') {
      console.log('👋 Goodbye!');
      rl.close();
      return;
    }

    if (!userInput) {
      rl.prompt();
      return;
    }

    try {
      console.log('\n🤖 Claude is thinking...');
      
      const response = await sendToClaudeWithMCP(userInput);

      // Display Claude's response
      console.log('\n🤖 Claude:');
      for (const content of response.content) {
        if (content.type === 'text') {
          console.log(content.text);
        }
      }
      console.log('');
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye!');
    if (mcpServer) {
      mcpServer.kill();
    }
    process.exit(0);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  if (mcpServer) {
    mcpServer.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  if (mcpServer) {
    mcpServer.kill();
  }
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  if (mcpServer) {
    mcpServer.kill();
  }
  process.exit(1);
});