# Project Structure

## Root Structure

- `src/` - Main application source code
- `tests/` - Test files mirroring src structure
- `chrome-extension/` - Browser extension for content processing
- `sdk/` - Plugin SDK for extensibility
- `plugins/` - Plugin implementations
- `docs/` - Documentation and requirements
- `dist/` - Built output (generated)

## Source Code Organization (`src/`)

```
src/
├── cli.tsx              # Main CLI entry point
├── index.ts             # Library entry point
├── components/          # React/Ink UI components
├── commands/            # CLI command implementations
├── models/              # Data models and types
├── services/            # Business logic and external integrations
├── types/               # TypeScript type definitions
└── utils/               # Utility functions and helpers
```

## Key Directories

### Components (`src/components/`)
- React components using Ink for CLI UI
- `App.tsx` - Main application component
- `SearchView.tsx` - Search interface
- `CategoryManager.tsx` - Category management UI

### Services (`src/services/`)
- Business logic and external service integrations
- `claude-ai.ts` - AI integration
- `journal-service.ts` - Core journaling functionality
- `search-service.ts` - Search implementation
- `storage.ts` - Data persistence

### Models (`src/models/`)
- TypeScript interfaces and data structures
- `journal.ts` - Journal entry models
- `category.ts` - Category definitions
- `plugin.ts` - Plugin system models

## Testing Structure

Tests mirror the `src/` structure:
- Unit tests: `tests/services/`, `tests/models/`, `tests/utils/`
- Integration tests: `tests/integration/`
- Component tests: `tests/components/`

## Configuration Files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tsup.config.ts` - Build configuration
- `vitest.config.ts` - Test configuration
- `eslint.config.js` - Linting rules

## Data Storage

- `kotori-journal-data/` - User data directory (created at runtime)
- `.temp/` - Temporary files for auto-save
- Daily reports: `YYYY/MM/DD.md` format