import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.tsx'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  shims: true,
  dts: true,
  outDir: 'dist',
  splitting: false,
})
