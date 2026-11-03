/**
 * Evidence filenames are milestone-stamped, because re-running a suite must not overwrite the
 * screenshots an earlier milestone reported on. Every harness already writes names like
 * `m6-gate-desk-integrated.png`; setting `EVIDENCE_PREFIX=m7` swaps the stamp to
 * `m7-gate-desk-integrated.png` without editing the call sites, so a regression run on the current
 * build leaves the previous milestone's evidence intact.
 *
 * With no prefix set the stamp stays `m6`, which is what the M6 documents cite.
 */
import { fileURLToPath } from 'node:url'

const PREFIX = process.env.EVIDENCE_PREFIX ?? 'm6'

/** The milestone-stamped file name, for the detail strings a test prints. */
export const evidenceName = (name) => name.replace(/^m[0-9b]+-/, `${PREFIX}-`)

export const OUT = (name) => fileURLToPath(
  new URL(`../../docs/evidence/${evidenceName(name)}`, import.meta.url),
)
