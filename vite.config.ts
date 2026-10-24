import { createHash } from 'node:crypto';
import { cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Emit a list of every built asset so sw.js can precache the whole app —
 * including the self-hosted font files, whose names are fingerprinted by Vite.
 * The list is generated from the real bundle, never hand-maintained.
 *
 * A content hash of that list is also stamped into the service worker's cache
 * version, so every deploy produces a new worker that replaces the old cache.
 */
function precacheManifest(): Plugin {
  let outDir = path.resolve(process.cwd(), 'dist');
  let buildHash = 'dev';

  return {
    name: 'athar-precache-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      const urls = Object.values(bundle)
        .map((item) => item.fileName)
        .filter((name) => !name.endsWith('.map'))
        .map((name) => `./${name.replace(/\\/g, '/')}`);
      buildHash = createHash('sha256').update(urls.join('|')).digest('hex').slice(0, 8);
      this.emitFile({
        type: 'asset',
        fileName: 'precache-manifest.json',
        source: JSON.stringify({ urls }, null, 2)
      });
    },
    async closeBundle() {
      const swPath = path.join(outDir, 'sw.js');
      try {
        const sw = await readFile(swPath, 'utf8');
        const next = sw.replace(/const VERSION = '[^']+';/, `const VERSION = 'athar-${buildHash}';`);
        if (next !== sw) await writeFile(swPath, next);
      } catch {
        /* A build without the public directory has nothing to stamp. */
      }
    }
  };
}

/**
 * Demo build (VITE_DEMO_BUILD=1): a kiosk-sized dist/ for the museum demo.
 *
 * Skips Vite's copy of public/ entirely and copies back only what the nav app
 * needs — the PWA icons, the web manifest and the service worker. The 33 MB
 * legacy media library (public/assets/media) and the legacy photo assets stay
 * in the repository but never reach dist/, and the legacy routes are compiled
 * out of App.tsx by the same flag. `npm run build` (no flag) still ships
 * everything.
 */
function demoBuild(): Plugin {
  let root = process.cwd();
  let outDir = path.resolve(root, 'dist');

  return {
    name: 'athar-demo-build',
    apply: 'build',
    config() {
      return { build: { copyPublicDir: false } };
    },
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    /* writeBundle runs after the bundle is written but before the
     * precache-stamping closeBundle, so dist/sw.js exists by then. */
    async writeBundle() {
      const keep = ['icons', 'manifest.webmanifest', 'sw.js'];
      await Promise.all(
        keep.map((entry) =>
          cp(path.join(root, 'public', entry), path.join(outDir, entry), { recursive: true })
        )
      );
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  /* `.env.demo` for `--mode demo`, or the flag exported in the shell. The mode
   * alone is enough too: CI runs `vite build --mode demo`, and it must not fall
   * back to the 41 MB bundle just because `.env.demo` was not committed. */
  const demoBuildEnabled =
    mode === 'demo' || (env.VITE_DEMO_BUILD ?? process.env.VITE_DEMO_BUILD) === '1';

  return {
    base: './',
    /* Only the plugin below reads `mode`; the routes are gated on
     * `import.meta.env.VITE_DEMO_BUILD`, so make the flag itself true whenever
     * the demo build is on — a hosted CI job must not depend on whether
     * `.env.demo` was committed. */
    define: demoBuildEnabled ? { 'import.meta.env.VITE_DEMO_BUILD': '"1"' } : undefined,
    plugins: demoBuildEnabled ? [react(), demoBuild(), precacheManifest()] : [react(), precacheManifest()],
    server: { port: 5173, host: true },
    preview: { port: 4173 },
    /* `.backup-audit/` is a working copy taken before the audit fixes; it must
     * not be collected as a second test suite. */
    test: { exclude: ['**/node_modules/**', '**/dist/**', '.backup-audit/**'] }
  };
});
