import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-static-files',
      writeBundle() {
        // Copy manifest.json
        copyFileSync(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'))

        // Copy popup.html
        copyFileSync(resolve(__dirname, 'popup.html'), resolve(__dirname, 'dist/popup.html'))

        // Copy patterns.html
        copyFileSync(resolve(__dirname, 'patterns.html'), resolve(__dirname, 'dist/patterns.html'))

        // Copy icons if they exist
        const iconSizes = ['16', '48', '128']
        iconSizes.forEach(size => {
          const iconPath = resolve(__dirname, `icon${size}.png`)
          if (existsSync(iconPath)) {
            copyFileSync(iconPath, resolve(__dirname, `dist/icon${size}.png`))
          }
        })
      },
    },
    {
      name: 'wrap-content-scripts-in-iife',
      writeBundle() {
        // コンテンツスクリプトをIIFEでラップして変数名衝突を防ぐ
        const contentScriptsToWrap = ['auto-processor.js', 'content.js']

        contentScriptsToWrap.forEach(filename => {
          const filePath = resolve(__dirname, 'dist', filename)
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8')

            // すでにIIFEでラップされている場合はスキップ
            if (content.trim().startsWith('(function()') || content.trim().startsWith('(()=>')) {
              console.log(`${filename} is already wrapped in IIFE, skipping`)
              return
            }

            const wrappedContent = `(function() {
'use strict';
${content}
})();`

            writeFileSync(filePath, wrappedContent)
            console.log(`Wrapped ${filename} in IIFE to prevent variable conflicts`)
          }
        })
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        popup: resolve(__dirname, 'src/popup.ts'),
        patterns: resolve(__dirname, 'src/patterns.ts'),
        'auto-processor': resolve(__dirname, 'src/content-scripts/auto-processor.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
})
