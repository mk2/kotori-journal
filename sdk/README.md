# Kotori Journal SDK

TypeScript SDK for developing Kotori Journal plugins.

## Installation

```bash
npm install @kotori-journal/sdk
```

## Quick Start

```typescript
import { createSimplePlugin, createTextCommand } from '@kotori-journal/sdk'

const myPlugin = createSimplePlugin(
  'my-plugin',
  '1.0.0',
  'A simple example plugin',
  'Your Name',
  [
    createTextCommand(
      'hello',
      ['hello', /^hi$/],
      'Say hello',
      async (context) => {
        return `Hello! You have ${context.entries.length} entries.`
      }
    )
  ]
)

export default myPlugin
```

## API Reference

### Core Types

- `Plugin` - Main plugin interface
- `PluginContext` - Context provided to plugins
- `Command` - Command interface
- `CommandContext` - Context for command execution
- `JournalEntry` - Journal entry structure

### Helper Functions

- `createPlugin()` - Type-safe plugin creation
- `createCommand()` - Type-safe command creation
- `createTextCommand()` - Quick text command creation
- `createSimplePlugin()` - Minimal plugin setup

## Plugin Structure

```typescript
import { Plugin, PluginContext } from '@kotori-journal/sdk'

const plugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Plugin description',
  author: 'Your Name',
  
  async initialize(context: PluginContext) {
    // Plugin initialization logic
  },
  
  commands: [
    // Your commands here
  ],
  
  hooks: {
    // Optional hooks
    beforeSave: async (entry) => entry,
    afterSave: async (entry) => { /* ... */ }
  }
}

export default plugin
```

## Available Services

In command context, you have access to:

```typescript
context.services.journal.addEntry(content, category)
context.services.journal.getEntries()
context.services.journal.searchEntries(query)
context.services.storage.read(key)
context.services.storage.write(key, value)
context.services.search.search(query)
```

## Development Tips

1. Use `createSimplePlugin()` for basic plugins
2. Use `createTextCommand()` for simple text-based commands
3. Access plugin storage via `context.storage` in the plugin context
4. Use `context.logger` for debugging
5. All operations are async - use `await` 