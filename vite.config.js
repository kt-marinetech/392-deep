import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

function resolveBasePath() {
  if (process.env.VITE_BASE_PATH) {
    const normalized = process.env.VITE_BASE_PATH.trim();
    return normalized.endsWith('/') ? normalized : `${normalized}/`;
  }

  if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    if (repo && repo.toLowerCase() !== `${owner.toLowerCase()}.github.io`) {
      return `/${repo}/`;
    }
  }

  return '/';
}

export default defineConfig(({ command }) => {
  return {
    base: command === 'build' ? resolveBasePath() : '/',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
