import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT for GitHub Pages: if you're deploying to
// https://<username>.github.io/<repo-name>/ (a project page, not a user/org
// page), set `base` to '/<repo-name>/' below. Skip this if you're using a
// custom domain or a github.io *user* page (username.github.io repo).
export default defineConfig({
  base: '/Memory-universe1/',, // <-- change this to match your repo name
  plugins: [react()],
  server: { port: 5173 },
});
