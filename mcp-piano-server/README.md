# MCP Piano Server

A Model Context Protocol (MCP) server providing comprehensive piano functionality with real-time state synchronization, musical analysis, and WebSocket-based collaborative features.

## Features

### 🎹 Piano Functionality

- **88-key piano layout** with accurate note mapping (A0 to C8)
- **MIDI support** with note numbers, velocities, and frequencies
- **Multiple notation formats** (scientific, sharp/flat notations)
- **Chord and scale generation** with musical analysis
- **Real-time note events** via WebSocket connections

### 🔄 State Synchronization (NEW)

- **Real-time state tracking** of currently pressed keys
- **Multi-client synchronization** with conflict resolution
- **Advanced conflict resolution strategies**:
  - `latest_wins`: Most recent timestamp wins
  - `velocity_priority`: Higher velocity takes precedence
  - `client_priority`: Priority clients override regular clients
  - `highest_priority`: Explicit priority values determine winner
- **Priority client system** for teaching/performance scenarios
- **Session management** with unique session IDs
- **State reconciliation** for complex conflict scenarios
- **Comprehensive statistics** and monitoring

### 🎵 Musical Analysis

- **Chord recognition** from note combinations
- **Scale generation** in various modes
- **Progression analysis** with harmonic context
- **Time signature and tempo support**

### 🌐 WebSocket Communication

- **Real-time messaging** with validation
- **Heartbeat monitoring** for connection health
- **Enhanced message types** for state synchronization
- **Client connection management** with unique IDs

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-piano-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Running the System

The MCP Piano system consists of two main components that work together:

#### 1. Piano Web Server (Browser Interface)

Start the piano web server that provides the browser interface and WebSocket server:

```bash
# Start the piano web server
npm start

# Or with more verbose output
npm run start:full
```

This will:
- Start the web server on `http://localhost:3000`
- Enable WebSocket server on `ws://localhost:3000`
- Serve the piano interface at `http://localhost:3000`
- Accept MCP client connections

#### 2. MCP Client Testing

Test the MCP server connection and piano functionality:

```bash
# Run a complete demo (recommended)
npm run demo

# Run basic MCP client test
npm run test-mcp

# Run interactive MCP test mode
npm run test-mcp-interactive
```

### Complete System Test

1. **Start the piano web server** (in one terminal):
   ```bash
   npm start
   ```

2. **Open the browser interface**:
   - Navigate to `http://localhost:3000`
   - You should see the 88-key piano interface
   - Test by clicking keys - they should light up and play sounds

3. **Test MCP client integration** (in another terminal):
   ```bash
   npm run demo
   ```
   - This will play "Twinkle Twinkle Little Star" through the MCP server
   - You should see the piano keys light up in the browser as notes are played
   - The browser will reflect the keys being played in real-time

### Server Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the piano web server (port 3000) |
| `npm run start:full` | Start with verbose output |
| `npm run demo` | Run complete MCP client demo |
| `npm run test-mcp` | Basic MCP client test |
| `npm run test-mcp-interactive` | Interactive MCP testing mode |
| `npm run mcp-server` | Start standalone MCP server |
| `npm run build` | Build TypeScript files |
| `npm run dev` | Development mode with watch |

### Testing State Synchronization

1. **Start the server**:

   ```bash
   npm start
   ```

2. **Open the test interface**:
   Navigate to `http://localhost:3000/test-state-sync.html`

3. **Test multi-client sync**:

   - Open multiple browser tabs/windows
   - Press piano keys in one tab
   - Observe real-time synchronization in other tabs

4. **Test conflict resolution**:
   - Simultaneously press the same key from multiple clients
   - Observe conflict resolution in action
   - Check the event log for detailed information

## API Documentation

### WebSocket Messages

#### State Synchronization

```typescript
// State sync message
{
  "type": "state_sync",
  "activeNotes": [{"midiNumber": 60, "velocity": 64}],
  "lastUpdateTimestamp": 1234567890,
  "activeClientCount": 3,
  "stateVersion": 42,
  "sessionId": "session_1234_abc",
  "statistics": { /* detailed stats */ }
}

// Note events
{
  "type": "note_on",
  "midiNumber": 60,
  "velocity": 64,
  "timestamp": 1234567890,
  "source": "ui"
}

// Priority client request
{
  "type": "priority_client_request",
  "timestamp": 1234567890,
  "source": "ui"
}
```

#### Advanced Features

```typescript
// State reconciliation request
{
  "type": "state_reconciliation_request",
  "data": {
    "remoteState": {
      "activeNotes": [...],
      "stateVersion": 43,
      "sessionId": "different_session"
    }
  }
}

// Statistics request
{
  "type": "client_statistics_request",
  "timestamp": 1234567890,
  "source": "ui"
}
```

### REST API Endpoints

- `GET /api/health` - Server health check
- `GET /api/piano-layout` - Complete piano layout data
- `GET /api/piano-key/:identifier` - Specific key information
- `GET /api/piano-octave/:octave` - Keys in specific octave

## Configuration

### Conflict Resolution Strategy

Configure the state manager with different conflict resolution strategies:

```typescript
// In server initialization
const stateManager = new PianoStateManager("latest_wins");
// Options: "latest_wins", "velocity_priority", "client_priority", "highest_priority"
```

### Environment Variables

```bash
# Server configuration
MCP_PORT=3000          # Main server port (default: 3000)
NODE_ENV=development   # Environment mode

# WebSocket settings
WS_HEARTBEAT_INTERVAL=30000

# State synchronization
CONFLICT_RESOLUTION_STRATEGY=latest_wins
```

**Note**: The `.env` file in the project root contains these settings. All components (web server, MCP server, browser client) use the same port (3000) for seamless communication.

## Architecture

### Core Components

1. **PianoStateManager** (`src/utils/piano-state-manager.ts`)

   - Manages real-time piano state
   - Handles conflict resolution
   - Tracks client connections and priorities

2. **WebSocket Manager** (`src/server.ts`)

   - Handles client connections
   - Routes messages between clients
   - Manages state synchronization

3. **Piano Model** (`src/models/piano.js`)

   - 88-key piano representation
   - MIDI note mapping
   - Musical calculations

4. **Message Protocol** (`src/types/messages.ts`)
   - Typed message definitions
   - Validation schemas
   - Serialization helpers

### State Synchronization Flow

1. **Client Connection**

   - Server assigns unique client ID
   - Sends welcome message with state info
   - Delivers current piano state
   - Notifies other clients

2. **Note Events**

   - Client sends note press/release
   - Server validates and applies to state
   - Conflict resolution if needed
   - Broadcast to other clients

3. **Conflict Resolution**
   - Multiple strategies available
   - Detailed conflict logging
   - State version tracking
   - Automatic reconciliation

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing

- Use the web interface at `/test-state-sync.html`
- Open multiple browser instances
- Test various conflict scenarios
- Monitor the event log for debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

## Advanced Usage

### Priority Client System

Some clients can be granted priority status for teaching or performance scenarios:

```javascript
// Request priority status
websocket.send(
  JSON.stringify({
    type: "priority_client_request",
    timestamp: Date.now(),
    source: "ui",
  })
);
```

Priority clients can:

- Override regular client actions
- Remove notes pressed by other clients
- Have their events take precedence in conflicts

### State Reconciliation

For complex scenarios, clients can request state reconciliation:

```javascript
// Request reconciliation with custom state
websocket.send(
  JSON.stringify({
    type: "state_reconciliation_request",
    data: { remoteState: customState },
    timestamp: Date.now(),
    source: "ui",
  })
);
```

### Statistics Monitoring

Get detailed statistics about the piano state:

```javascript
// Request comprehensive statistics
websocket.send(
  JSON.stringify({
    type: "client_statistics_request",
    timestamp: Date.now(),
    source: "ui",
  })
);
```

## Troubleshooting

### Common Issues

1. **MCP Client Cannot Connect**

   - Ensure the piano web server is running: `npm start`
   - Check that port 3000 is available: `lsof -i:3000`
   - Verify the `.env` file has `MCP_PORT=3000`
   - Look for "✅ Connected to piano web server" in MCP client output

2. **Browser Piano Not Reflecting Key Presses**

   - Ensure both servers are running on the same port (3000)
   - Check browser console for WebSocket connection errors
   - Verify the WebSocket status indicator shows "Connected"
   - Test browser piano keys manually first

3. **Port Configuration Issues**

   - All components must use port 3000 (check `.env` file)
   - Kill any processes using port 3000: `lsof -ti:3000 | xargs kill -9`
   - Restart the piano web server: `npm start`

4. **State Synchronization Not Working**

   - Check WebSocket connection status
   - Verify message format in browser console
   - Check server logs for validation errors

5. **Conflict Resolution Issues**

   - Review conflict resolution strategy
   - Check client priority settings
   - Monitor state version numbers

6. **Performance Issues**
   - Monitor client count and active notes
   - Check heartbeat interval settings
   - Review state history size

### Debug Information

Enable detailed logging:

```bash
DEBUG=piano:* npm start
```

## Documentation

- [State Synchronization Guide](docs/state-synchronization.md)
- [API Reference](docs/api-reference.md)
- [Architecture Overview](docs/architecture.md)

## License

MIT License - see LICENSE file for details.

## MCP Piano Server

The Simple MCP Piano Server (`src/simple-piano-mcp.ts`) provides basic piano note playing tools that any MCP client can use.

### Available Tools

- **`play_piano_note`** - Play a single piano note

  - `note`: Note in scientific notation (e.g., "C4", "F#3")
  - `velocity`: MIDI velocity 0-127 (optional, default: 80)
  - `duration`: Duration in milliseconds (optional, default: 1000ms)

- **`stop_piano_note`** - Stop a specific note
- **`stop_all_piano_notes`** - Stop all currently playing notes
- **`get_currently_playing_notes`** - Get list of currently playing notes
- **`get_piano_info`** - Get piano information and capabilities

### Usage

```bash
# Start the MCP piano server
npm run piano-server

# Test the server with the included test client
npm run test-client

# Interactive testing mode
npm run test-interactive
```

### Example: Playing "Twinkle Twinkle Little Star"

When connected to an MCP client like Claude, you can request songs and the model will use the basic note tools to play them:

```typescript
// The model can call these tools in sequence:
await callTool("play_piano_note", { note: "C4", duration: 500 });
await callTool("play_piano_note", { note: "C4", duration: 500 });
await callTool("play_piano_note", { note: "G4", duration: 500 });
await callTool("play_piano_note", { note: "G4", duration: 500 });
// ... and so on
```

### Architecture

- **MCP Server**: Uses the official TypeScript SDK
- **Note Tracking**: In-memory tracking of currently playing notes
- **Scientific Notation**: Standard piano notation (A0 to C8)
- **MIDI Standard**: Velocity range 0-127
- **Real-time**: WebSocket support for live updates (on port 3000)

The server is built with the [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) and follows MCP best practices.

---

## Original Piano Web App
