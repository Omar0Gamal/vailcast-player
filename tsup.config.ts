import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react/index.ts',
    angular: 'src/angular/public-api.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  treeshake: true,
  external: ['hls.js', 'react', 'react-dom', '@angular/core', '@angular/common'],
});