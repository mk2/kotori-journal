# Technology Stack

## Core Technologies

- **TypeScript** - Primary language with strict type checking
- **Node.js** - Runtime environment (minimum version 22.16.0)
- **React** - UI framework via Ink for CLI interfaces
- **Ink** - React renderer for CLI applications
- **Express** - Web server for API and server mode
- **Anthropic SDK** - Claude AI integration

## Build System & Tools

- **tsup** - TypeScript bundler for production builds
- **tsx** - TypeScript execution for development
- **Vitest** - Testing framework with coverage support
- **ESLint** - Code linting with TypeScript and React rules
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit checks

## Common Commands

```bash
# Development
npm run dev          # Start development CLI
npm run server       # Start server mode
npm run watch        # Watch mode for development

# Building
npm run build        # Production build
npm run typecheck    # Type checking only

# Testing
npm test             # Run all tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting
npm run verify       # Run all checks (test, typecheck, lint, format)
```

## Configuration

- **ES Modules** - Project uses `"type": "module"`
- **Target**: ES2022 with Node.js 18+ compatibility
- **JSX**: React JSX transform
- **Module Resolution**: Bundler strategy
- **Strict TypeScript** - All strict options enabled