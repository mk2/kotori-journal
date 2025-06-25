import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.tsx', 'src/commands/server-runner.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  shims: true,
  dts: true,
  outDir: 'dist',
  splitting: false,
})
