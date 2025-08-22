import { defineConfig } from 'vite';

// If deploying to GitHub Pages, set BASE_PATH to the repo name
// Example: const BASE_PATH = '/ColonyGame/';
// For local dev and relative builds, keep it './'
const BASE_PATH = process.env.BASE_PATH || './';

export default defineConfig({
  base: BASE_PATH,
});
