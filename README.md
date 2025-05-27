# MCP Piano - 88-Key Piano Interface

A comprehensive 88-key piano interface built with Model Context Protocol (MCP) support, featuring a static web server that serves an interactive piano interface and provides REST API endpoints for piano key data.

## Features

- **Complete 88-Key Piano Layout** - From A0 to C8, just like a real piano
- **Static Web Server** - Serves the piano interface and static assets
- **REST API Endpoints** - Access piano key data programmatically
- **CORS Support** - Enabled for local development
- **Responsive Design** - Works on desktop and mobile devices
- **Real-time Connection Status** - Shows server connectivity
- **Interactive Piano Keys** - Click or touch to play notes

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm (comes with Node.js)

### Installation & Running

1. **Clone and navigate to the project:**

   ```bash
   git clone <repository-url>
   cd mcpiano
   ```

2. **Install dependencies:**

   ```bash
   npm run install-deps
   ```

3. **Build the project:**

   ```bash
   npm run build
   ```

4. **Start the server:**

   ```bash
   npm start
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

The server provides several REST API endpoints:

### Health Check

```
GET /api/health
```

Returns server status and basic information.

### Complete Piano Layout

```
GET /api/piano-layout
```

Returns all 88 piano keys with complete data including:

- MIDI note numbers (21-108)
- Note names in scientific notation (A0-C8)
- Frequencies in Hz
- Key colors (white/black)
- Octave numbers
- Visual positions for UI rendering
- Statistics (total keys, white/black counts, frequency range)

### Individual Piano Key

```
GET /api/piano-key/:identifier
```

Get specific piano key by note name or MIDI number.

Examples:

- `/api/piano-key/C4` - Middle C
- `/api/piano-key/60` - Middle C (MIDI number)
- `/api/piano-key/A4` - Concert A (440 Hz)

### Keys by Octave

```
GET /api/piano-octave/:octave
```

Get all keys in a specific octave (0-8).

Examples:

- `/api/piano-octave/4` - Middle octave (C4-B4)
- `/api/piano-octave/0` - Lowest octave (A0-B0)

## Project Structure

```
mcpiano/
├── package.json                 # Root package.json with convenience scripts
├── README.md                   # This file
└── mcp-piano-server/           # Main server application
    ├── src/                    # TypeScript source code
    │   ├── server.ts          # Main static server with Express
    │   ├── models/            # Piano data models
    │   ├── types/             # TypeScript type definitions
    │   ├── config/            # Server configuration
    │   └── utils/             # Utility functions
    ├── public/                # Static web assets
    │   ├── index.html         # Main piano interface
    │   ├── css/               # Stylesheets
    │   ├── js/                # JavaScript files
    │   └── assets/            # Images and other assets
    ├── dist/                  # Compiled JavaScript (generated)
    └── package.json           # Server dependencies and scripts
```

## Development

### Available Scripts

From the root directory:

- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build the TypeScript project
- `npm test` - Run tests
- `npm run install-deps` - Install server dependencies

### Development Server

For development with auto-reload:

```bash
npm run dev
```

This will start the server with TypeScript watching for changes.

## Technical Details

### Server Implementation

- **Express.js** - Web server framework
- **TypeScript** - Type-safe development
- **CORS** - Cross-Origin Resource Sharing enabled
- **Static File Serving** - Serves HTML, CSS, JS, and assets
- **RESTful API** - Clean API design with proper HTTP status codes

### Piano Model

- **88 Keys Total** - Complete piano range (A0 to C8)
- **52 White Keys** - Natural notes
- **36 Black Keys** - Sharp/flat notes
- **Scientific Notation** - Standard note naming (C4 = Middle C)
- **Equal Temperament Tuning** - Standard 440 Hz tuning
- **Visual Positioning** - Calculated positions for UI rendering

### Frontend Features

- **Semantic HTML5** - Accessible markup with ARIA labels
- **CSS BEM Methodology** - Clean, maintainable styles
- **Mobile-First Design** - Responsive across all devices
- **No Inline Styles** - Separation of concerns
- **Canvas/SVG Rendering** - High-performance piano visualization

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please open an issue on the GitHub repository.
