/**
 * Deployment configuration.
 *
 * DEPLOY_BASE_URL: the public origin encoded in production QR codes
 * (e.g. "https://athar-museum.org"). When empty, the app uses the
 * runtime `window.location.origin`, which is always correct for the
 * environment actually serving the app (dev, LAN demo, or production).
 * Set VITE_DEPLOY_URL at build time to bake in a production origin.
 */
export const DEPLOY_BASE_URL: string =
  (import.meta.env?.VITE_DEPLOY_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export function publicOrigin(): string {
  if (DEPLOY_BASE_URL) return DEPLOY_BASE_URL;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

/** Stable QR destination for an artifact demo code, e.g. MUMMY-001. */
export function artifactUrl(base: string, code: string): string {
  const b = (base || '').replace(/\/$/, '');
  return `${b}/#/artifact/${encodeURIComponent(code)}`;
}

export function currentArtifactUrl(code: string): string {
  return artifactUrl(publicOrigin(), code);
}
