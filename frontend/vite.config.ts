import { defineConfig } from 'vite';

// One ES module served by the integration (committed, so HACS needs no build step).
export default defineConfig({
  build: {
    lib: { entry: 'src/main.ts', formats: ['es'], fileName: () => 'rugby-live-cards.js' },
    outDir: '../custom_components/rugby_live/frontend',
    emptyOutDir: true,
    target: 'es2021',
    sourcemap: false,
  },
});
