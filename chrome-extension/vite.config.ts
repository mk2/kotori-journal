import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, existsSync } from 'fs'

// Check build target
const buildTarget = process.env.BUILD_TARGET

export default defineConfig({
  plugins: [
    {
      name: 'copy-static-files',
      writeBundle() {
        // Copy static files only once (during main build)
        if (!buildTarget) {
          // Copy manifest.json
          copyFileSync(
            resolve(__dirname, 'manifest.json'),
            resolve(__dirname, 'dist/manifest.json')
          )

          // Copy popup.html
          copyFileSync(resolve(__dirname, 'popup.html'), resolve(__dirname, 'dist/popup.html'))

          // Copy patterns.html
          copyFileSync(
            resolve(__dirname, 'patterns.html'),
            resolve(__dirname, 'dist/patterns.html')
          )

          // Copy icons if they exist
          const iconSizes = ['16', '48', '128']
          iconSizes.forEach(size => {
            const iconPath = resolve(__dirname, `icon${size}.png`)
            if (existsSync(iconPath)) {
              copyFileSync(iconPath, resolve(__dirname, `dist/icon${size}.png`))
            }
          })
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: buildTarget ? false : true, // Only clean on main build
    rollupOptions: (() => {
      if (buildTarget === 'content') {
        return {
          input: {
            content: resolve(__dirname, 'src/content.ts'),
          },
          output: {
            entryFileNames: '[name].js',
            format: 'iife',
            inlineDynamicImports: true,
          },
          external: ['chrome'],
        }
      } else if (buildTarget === 'auto-processor') {
        return {
          input: {
            'auto-processor': resolve(__dirname, 'src/content-scripts/auto-processor.ts'),
          },
          output: {
            entryFileNames: '[name].js',
            format: 'iife',
            inlineDynamicImports: true,
          },
          external: ['chrome'],
        }
      } else {
        // Main build (ES modules)
        return {
          input: {
            background: resolve(__dirname, 'src/background.ts'),
            popup: resolve(__dirname, 'src/popup.ts'),
            patterns: resolve(__dirname, 'src/patterns.ts'),
            'remote-logger': resolve(__dirname, 'src/services/remote-logger.ts'),
          },
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: '[name].js',
            assetFileNames: '[name].[ext]',
            format: 'es',
          },
          external: ['chrome'],
        }
      }
    })(),
  },
})
