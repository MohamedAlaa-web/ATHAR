import { ARTIFACTS, getArtifact, getArtifactByCode } from '../data/artifacts';

export interface QrResolution {
  /** The raw string that was decoded. */
  raw: string;
  /** Artifact code found in the payload (e.g. MUMMY-001), if any. */
  code: string | null;
  /** Resolved artifact id, or null when the payload is not an ATHAR artifact. */
  artifactId: string | null;
  /** How the value was recognised — useful for the demo diagnostics. */
  form: 'url-hash' | 'url-path' | 'url-query' | 'plain-code' | 'unknown';
}

const ARTIFACT_PATH = /(?:^|\/)artifact\/([A-Za-z0-9_-]+)/;

/**
 * Accepts what a real printed ATHAR code can contain:
 *   ATHAR-MUMMY-001
 *   MUMMY-001
 *   https://host/#/artifact/MUMMY-001
 *   https://host/artifact/MUMMY-001
 *   https://host/?code=MUMMY-001#/...
 * Anything else resolves to `invalid` and must not navigate.
 */
export function resolveQrPayload(rawInput: string): QrResolution {
  const raw = (rawInput ?? '').trim();
  if (!raw) return { raw, code: null, artifactId: null, form: 'unknown' };

  if (!raw.includes('://') && !raw.startsWith('/')) {
    const artifact = getArtifactByCode(raw);
    return {
      raw,
      code: artifact?.demoCode ?? raw.toUpperCase(),
      artifactId: artifact?.id ?? null,
      form: artifact ? 'plain-code' : 'unknown'
    };
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'https://example.invalid');
  } catch {
    return { raw, code: null, artifactId: null, form: 'unknown' };
  }

  const hash = parsed.hash.replace(/^#/, '');
  const hashMatch = hash.match(ARTIFACT_PATH);
  if (hashMatch) {
    const artifact = getArtifact(hashMatch[1]) ?? getArtifactByCode(hashMatch[1]);
    return {
      raw,
      code: artifact?.demoCode ?? hashMatch[1],
      artifactId: artifact?.id ?? null,
      form: 'url-hash'
    };
  }

  const query = parsed.searchParams.get('code') ?? parsed.searchParams.get('artifact');
  if (query) {
    const artifact = getArtifactByCode(query) ?? getArtifact(query);
    return {
      raw,
      code: artifact?.demoCode ?? query,
      artifactId: artifact?.id ?? null,
      form: 'url-query'
    };
  }

  const pathMatch = parsed.pathname.match(ARTIFACT_PATH);
  if (pathMatch) {
    const artifact = getArtifact(pathMatch[1]) ?? getArtifactByCode(pathMatch[1]);
    return {
      raw,
      code: artifact?.demoCode ?? pathMatch[1],
      artifactId: artifact?.id ?? null,
      form: 'url-path'
    };
  }

  return { raw, code: null, artifactId: null, form: 'unknown' };
}

/** True when the payload belongs to one of this app's artifacts. */
export function isKnownQrPayload(raw: string): boolean {
  return resolveQrPayload(raw).artifactId != null;
}

/** Sanity check used by the print page tests: every artifact has a scannable code. */
export function allArtifactPayloads(): string[] {
  return ARTIFACTS.map((a) => a.demoCode);
}
