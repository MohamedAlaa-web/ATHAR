import type { CrowdLevels, CrowdSource } from './types';

/**
 * Remote crowd feed — STUB, not implemented.
 *
 * The app never calls it and it returns no levels, so no screen can show a
 * crowd number that did not exist. A real implementation would have to obey
 * these rules, which are part of the design, not an afterthought:
 *
 *  1. Opt-in only. The visitor turns the feed on explicitly; it is off by
 *     default and can be turned off again at any time.
 *  2. Hall id only. No visitor id, no device id, no session id, no position,
 *     no path and no dwell time leaves the device.
 *  3. Aggregated counts. The server returns one occupancy bucket per hall,
 *     never per-visitor records.
 *  4. Suppression. A bucket built from fewer than 5 contributors is withheld
 *     (reported as unknown) so a small crowd cannot be de-anonymised.
 *  5. No accounts, no history. The feed is read-only and stores nothing about
 *     the visitor.
 */
export class RemoteCrowdSource implements CrowdSource {
  readonly status = {
    kind: 'remote' as const,
    implemented: false,
    detail: {
      ar: 'غير منفّذ — لا بيانات زحام حقيقية. يعمل النموذج المحاكى فقط.',
      en: 'Not implemented — no real crowd data. Only the simulated model runs.'
    }
  };

  /** Deliberately empty: fabricating levels would break the honesty rule. */
  getLevels(): CrowdLevels {
    return {};
  }
}

export const REMOTE_CROWD_PRIVACY_RULES = [
  'opt-in only',
  'hall id only',
  'no identity',
  'no path',
  'aggregated counts',
  'suppress counts below 5'
] as const;
