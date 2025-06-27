# Chrome Extension Build Troubleshooting

This document contains solutions to common build issues encountered during Chrome extension development.

## Issue 1: ES6 Import Statement Outside Module Error

### Problem
```
Uncaught SyntaxError: Cannot use import statement outside a module (at auto-processor.js:3:165)
```

### Root Cause
Chrome extension content scripts do not support ES6 modules natively. When Vite builds TypeScript files with ES6 imports, the generated JavaScript still contains `import` statements that browsers cannot execute in content script context.

### Initial Failed Approach
- Used custom Vite plugin to wrap content scripts in IIFE and convert imports to `require()` statements
- This approach was fragile and broke with syntax errors like "Unexpected end of input"

### Solution
1. **Separate Build Process**: Create dedicated build targets for different script types
2. **Content Script Isolation**: Make content scripts completely self-contained without external dependencies
3. **IIFE Format**: Use Vite's native IIFE format for content scripts

#### Implementation Details
```typescript
// vite.config.ts
const buildTarget = process.env.BUILD_TARGET

export default defineConfig({
  build: {
    emptyOutDir: buildTarget ? false : true, // Only clean on main build
    rollupOptions: (() => {
      if (buildTarget === 'content' || buildTarget === 'auto-processor') {
        return {
          input: { [buildTarget]: resolve(__dirname, `src/${buildTarget}.ts`) },
          output: {
            entryFileNames: '[name].js',
            format: 'iife',
            inlineDynamicImports: true,
          },
          external: ['chrome'],
        }
      } else {
        // Main build for background scripts, etc.
        return {
          input: { /* ES module entries */ },
          output: { format: 'es' },
        }
      }
    })(),
  },
})
```

#### Package.json Scripts
```json
{
  "scripts": {
    "build": "npm run build:main && npm run build:content && npm run build:auto-processor",
    "build:main": "vite build",
    "build:content": "BUILD_TARGET=content vite build",
    "build:auto-processor": "BUILD_TARGET=auto-processor vite build"
  }
}
```

## Issue 2: Require is Not Defined Error

### Problem
```
Uncaught ReferenceError: require is not defined at auto-processor.js:3:179
```

### Root Cause
Browser environments (including Chrome extensions) do not have CommonJS `require()` function. Converting ES6 imports to `require()` statements does not solve the module loading issue.

### Solution
**Inline All Dependencies**: Instead of trying to use module systems, inline all dependencies directly into content scripts.

#### Example: Self-Contained Content Script
```typescript
// Before: Using imports (problematic)
import { ContentExtractor } from '../services/content-extractor'
import { remoteLogger } from '../services/remote-logger'

// After: Inline everything (works)
interface ExtractedContent {
  title: string
  mainContent: string
  metadata?: { /* ... */ }
}

class ContentExtractor {
  // Inline implementation
}

const logger = {
  info: (message: string, data?: any) => console.log(`[AutoProcessor] ${message}`, data),
  error: (message: string, data?: any) => console.error(`[AutoProcessor] ${message}`, data)
}

class AutoContentProcessor {
  // Implementation using inlined dependencies
}
```

## Issue 3: Build Output Files Missing

### Problem
Running sequential build commands resulted in only the last built file remaining in the `dist` directory.

### Root Cause
Vite's default behavior is to empty the output directory (`emptyOutDir: true`) before each build, causing previous build artifacts to be deleted.

### Solution
**Conditional Directory Cleaning**: Only clean the output directory during the main build, preserve files for subsequent builds.

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: buildTarget ? false : true, // Only clean on main build
    // ...
  }
})
```

## Issue 4: Multiple Input IIFE Build Constraints

### Problem
```
Invalid value for option "output.inlineDynamicImports" - multiple inputs are not supported when "output.inlineDynamicImports" is true.
```

### Root Cause
Rollup does not support `inlineDynamicImports: true` with multiple entry points when using IIFE format.

### Solution
**Single Entry Per Build**: Build each content script individually with its own build target.

```typescript
// Instead of:
input: {
  content: '...',
  'auto-processor': '...'  // Multiple entries - fails
}

// Use:
if (buildTarget === 'content') {
  input: { content: '...' }  // Single entry - works
} else if (buildTarget === 'auto-processor') {
  input: { 'auto-processor': '...' }  // Single entry - works
}
```

## Best Practices Learned

### 1. Architecture Design
- **Minimize Dependencies**: Keep content scripts as self-contained as possible
- **Separate Concerns**: Use different build strategies for different script types
- **Avoid Complex Module Graphs**: Chrome extension content scripts work best with flat dependency structures

### 2. Build Process Design
- **Multi-Stage Builds**: Separate builds for different output formats (ES modules vs IIFE)
- **Incremental Builds**: Preserve previous build artifacts when building additional targets
- **Native Tooling**: Use Vite/Rollup's native features instead of custom post-processing

### 3. Debugging Approach
- **Inspect Build Output**: Always verify the actual generated JavaScript
- **Test in Browser Context**: Content script errors only appear in browser console
- **Validate Each Stage**: Test each build target individually before combining

## File Structure
After successful build, the `dist` directory should contain:

```
dist/
├── manifest.json           # Extension manifest
├── background.js          # Background script (ES module)
├── content.js            # Content script (IIFE)
├── auto-processor.js     # Auto-processor script (IIFE)
├── popup.js              # Popup script (ES module)
├── patterns.js           # Patterns script (ES module)
├── remote-logger.js      # Remote logger (ES module)
├── popup.html            # Popup HTML
├── patterns.html         # Patterns HTML
├── icon16.png            # Extension icons
├── icon48.png
└── icon128.png
```

## Prevention Tips
1. **Always test builds locally** before deploying
2. **Use TypeScript strict mode** to catch potential issues early
3. **Lint your build configuration** to ensure consistency
4. **Document build dependencies** and their purposes
5. **Keep build scripts simple** and avoid over-engineering