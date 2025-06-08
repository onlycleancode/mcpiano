# Claude Piano CLI

A command-line interface that connects Claude AI to an MCP (Model Context Protocol) piano server, enabling Claude to play music through piano tools.

## Features

- **Direct Claude Integration**: Chat with Claude AI that has access to piano capabilities
- **MCP Piano Tools**: Claude can play notes, chords, melodies, and songs using the piano server
- **Real-time Music**: Claude can respond to music requests by actually playing the piano
- **Interactive CLI**: Simple command-line interface for conversational interaction

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Your Anthropic API Key

**Option A: Environment Variable**
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

**Option B: Add to your shell profile**
```bash
echo 'export ANTHROPIC_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

**Option C: Create a .env file** (not recommended for security)
```bash
echo 'ANTHROPIC_API_KEY=your-api-key-here' > .env
```

### 3. Build the MCP Server

```bash
cd mcp-piano-server
npm install
npm run build
cd ..
```

## Usage

### Start the CLI

```bash
npm run cli
```

Or if installed globally:
```bash
claude-piano
```

### Example Conversations

```
🎹 You: Play a C major chord

🤖 Claude: I'll play a C major chord for you! A C major chord consists of the notes C, E, and G.
[Executes piano tools to play C4, E4, G4]

🎹 You: Can you play Twinkle Twinkle Little Star?

🤖 Claude: I'll play "Twinkle Twinkle Little Star" for you! This classic melody uses simple notes.
[Plays the melody note by note]

🎹 You: Play a minor scale starting from A

🤖 Claude: I'll play an A minor natural scale for you...
[Plays A, B, C, D, E, F, G, A]
```

## How It Works

1. **MCP Server**: The CLI starts the piano MCP server (`simple-piano-mcp.js`) which provides piano tools
2. **Tool Registration**: Claude receives the available piano tools and their schemas
3. **Intelligent Tool Use**: When you ask for music, Claude decides which piano tools to use
4. **Real-time Execution**: Claude's tool calls are executed on the piano server in real-time
5. **Musical Context**: Claude understands music theory and can play complex songs and progressions

## Available Piano Tools

Claude has access to these piano capabilities:

- `play_piano_note`: Play individual notes (e.g., "C4", "F#3")
- `stop_piano_note`: Stop specific notes
- `stop_all_piano_notes`: Stop all playing notes
- `get_currently_playing_notes`: Check what's currently playing
- `get_piano_info`: Get piano specifications and help

## Piano Specifications

- **Range**: 88-key piano (A0 to C8)
- **Notation**: Scientific notation (C4 = middle C)
- **Velocity**: 0-127 (MIDI standard)
- **Duration**: Specified in milliseconds

## Requirements

- Node.js 18.0.0 or higher
- Anthropic API key
- WebSocket-capable environment for piano server

## Installation Options

### Local Use
```bash
npm run cli
```

### Global Installation
```bash
npm run install-global
claude-piano
```

### Uninstall Global
```bash
npm run uninstall-global
```

## Troubleshooting

### "ANTHROPIC_API_KEY not set"
Make sure your API key is properly set in your environment variables.

### "Failed to start MCP server"
Ensure the mcp-piano-server is built:
```bash
cd mcp-piano-server && npm run build
```

### Piano server connection issues
The MCP server connects to the piano web server on localhost. Make sure the piano web server is running if you want to hear audio.

## Architecture

```
User Input → Claude Piano CLI → Claude API (with MCP tools) → MCP Piano Server → Piano Web Server
```

The CLI acts as a bridge between you and Claude, while the MCP server provides the piano capabilities that Claude can use when responding to your musical requests.