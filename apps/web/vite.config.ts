import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

let reactPlugin: any = null;
try {
  const mod = await import('@vitejs/plugin-react');
  reactPlugin = mod.default;
} catch {
  // Built-in esbuild automatic JSX fallback when plugin is not installed in local environment
}

const hasColyseusInstalled = fs.existsSync(path.resolve(__dirname, 'node_modules/colyseus.js'));

export default defineConfig({
  plugins: reactPlugin ? [reactPlugin()] : [],
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ...(!hasColyseusInstalled ? { 'colyseus.js': path.resolve(__dirname, './src/shims/colyseus.ts') } : {}),
    },
  },
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});