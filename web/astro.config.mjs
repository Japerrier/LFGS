// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  redirects: {
    '/tournament': '/tournament/schedule',
    '/tournament/teams': '/tournament/teams/diamond',
    '/tournament/matchups': '/tournament/matchups/diamond',
    '/tournament/standings': '/tournament/standings/diamond',
    '/tournament/bracket': '/tournament/bracket/diamond',
    '/hall-of-fame': '/hall-of-fame/7',
  },

  vite: {
    plugins: [tailwindcss()]
  }
});