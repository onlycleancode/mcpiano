# Agent Guidelines for MCPiano

## Commands

- `npm run build`: Build TypeScript in mcp-piano-server
- `npm run dev`: Watch mode for development 
- `npm run start`: Build and start the MCP server
- `npm run test`: Run tests with Jest
- `npm run test:watch`: Run tests in watch mode
- `npm run lint`: TypeScript type checking
- `npm run cli`: Run the Claude piano CLI client

## Code Style

- **TypeScript**: Primary language, ES modules (`type: "module"`)
- **Imports**: Use .js extensions for local imports (TS compilation requirement)
- **Types**: Import types from ./types/ directory, use proper interfaces
- **Classes**: Use readonly properties and private fields, comprehensive JSDoc
- **Error handling**: Detailed error messages with context
- **Naming**: camelCase for functions/variables, PascalCase for classes/types
- **Structure**: Organized in src/ with models/, utils/, types/, config/ directories
- **Constants**: Use UPPER_SNAKE_CASE, define in constants files
- **Node.js**: Target >=18.0.0, use modern async/await patterns

## Testing

- **Framework**: Jest with ts-jest
- **Single test**: `npm run test -- --testNamePattern="test name"`
- **Coverage**: `npm run test:coverage`
