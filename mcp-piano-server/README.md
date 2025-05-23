# MCP Piano Server

A Model Context Protocol (MCP) server that provides piano and music theory functionality. This server enables AI assistants to work with musical concepts like chords, scales, progressions, and music analysis.

## Features

- **Chord Analysis**: Analyze and identify chords from note combinations
- **Scale Generation**: Generate various musical scales (major, minor, modes, pentatonic, etc.)
- **Chord Progressions**: Create and analyze common chord progressions
- **Music Theory**: Access to comprehensive music theory knowledge
- **Note Utilities**: Convert between different note representations

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd mcp-piano-server
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Usage

### Development

Run the server in development mode with hot reload:

```bash
npm run dev
```

### Production

Build and start the server:

```bash
npm run build
npm start
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start the compiled server
- `npm run dev` - Run in development mode with nodemon
- `npm run watch` - Watch for changes and recompile
- `npm run clean` - Remove compiled output
- `npm run lint` - Type check without emitting files

## Project Structure

```
mcp-piano-server/
├── src/
│   ├── server.ts        # Main server implementation
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts     # Musical type definitions
│   └── config/          # Configuration files
│       └── index.ts     # Musical constants and server config
├── dist/                # Compiled JavaScript output
├── package.json         # Package configuration
├── tsconfig.json        # TypeScript configuration
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Configuration

The server uses TypeScript with strict mode enabled and includes:

- **Strict Type Checking**: Full TypeScript strict mode
- **ES2020 Target**: Modern JavaScript features
- **Source Maps**: For debugging support
- **Declaration Files**: For type definitions

## MCP Integration

This server implements the Model Context Protocol specification and can be used with any MCP-compatible client. The server provides tools for:

- Musical analysis and theory
- Chord and scale generation
- Progression creation
- Note manipulation

## Musical Concepts

### Supported Scales

- Major and minor scales
- Church modes (Dorian, Phrygian, Lydian, Mixolydian, Locrian)
- Pentatonic scales
- Blues scale
- Harmonic and melodic minor

### Supported Chords

- Triads (major, minor, diminished, augmented)
- Seventh chords (major7, minor7, dominant7, etc.)
- Suspended chords (sus2, sus4)
- Extended chords (add9, 6th chords)

### Common Progressions

- I-V-vi-IV (Pop progression)
- vi-IV-I-V (Popular modern progression)
- ii-V-I (Jazz standard)
- And many more...

## Development

### Type Safety

This project uses TypeScript with strict mode enabled, ensuring:

- No implicit any types
- Strict null checks
- Comprehensive type checking
- Runtime type safety

### Code Organization

- **Types**: All musical types and interfaces in `src/types/`
- **Configuration**: Musical constants and server config in `src/config/`
- **Server Logic**: Main MCP server implementation in `src/server.ts`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with proper TypeScript types
4. Test your changes: `npm run lint`
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] MIDI file import/export
- [ ] Audio synthesis capabilities
- [ ] Advanced harmonic analysis
- [ ] Rhythm and timing tools
- [ ] Integration with external music APIs
- [ ] Web interface for testing

## Support

For questions, issues, or contributions, please:

- Open an issue on GitHub
- Check the documentation
- Review existing issues for solutions

---

Built with ❤️ for the music community using the Model Context Protocol.
