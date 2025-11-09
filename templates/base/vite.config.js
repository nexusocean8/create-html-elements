import { defineConfig } from 'vite';
import { htmlElements } from 'vite-plugin-html-elements';

export default defineConfig({
  plugins: [htmlElements()],
});