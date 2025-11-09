import { defineConfig } from 'vite';
import { htmlElements } from 'vite-plugin-html-elements';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), htmlElements()],
});