// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  redirects: {
    '/tournament': '/tournament/schedule',
    '/tournament/bracket': '/tournament/bracket/diamond',
    '/hall-of-fame': '/hall-of-fame/7',
    '/tournament/rulebook': '/rulebook',
    '/tournament/rulebook/full': '/rulebook',
  },

  vite: {
    plugins: [tailwindcss()]
  }
});