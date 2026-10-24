/** Single source of truth for router paths (imported by App and tests). */
export const ROUTES = {
  home: '/',
  scan: '/scan',
  explore: '/explore',
  artifact: '/artifact/:id',
  story: '/artifact/:id/story',
  facts: '/artifact/:id/facts',
  print: '/print',
  positioning: '/positioning',
  admin: '/admin'
} as const;

export function artifactPath(id: string, sub?: 'story' | 'facts'): string {
  const base = `/artifact/${encodeURIComponent(id)}`;
  return sub ? `${base}/${sub}` : base;
}

/** All static visitor routes, used by the navigation smoke test. */
export const STATIC_ROUTES: string[] = [
  ROUTES.home,
  ROUTES.scan,
  ROUTES.explore,
  ROUTES.positioning,
  ROUTES.print,
  ROUTES.admin
];
