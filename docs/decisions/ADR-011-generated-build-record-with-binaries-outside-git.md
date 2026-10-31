# ADR-011 — Generated build record, binaries kept out of version control

**Status:** accepted (Milestone 6b)

## Context

The site now publishes factual claims about two game builds: a 38.8 MB browser export and a
35.1 MB Windows archive. Both come from a Godot project outside this repository and together weigh
about 140 MB before packaging. Hand-typed sizes and hashes drift the moment the studio re-exports,
and a wrong number on a download page is exactly the kind of claim this project has promised not to
make. Committing the binaries would also make the repository permanently large: Git history cannot
shrink a committed blob, and every clone would carry every version of a `.exe`.

## Decision

`scripts/stage-game-build.mjs` copies the export folder verbatim into `public/game/web/`, packages
the desktop build into `public/downloads/`, and writes `src/js/data/builds.js` containing measured
byte counts and SHA-256 digests for every file. Those two `public/` directories are ignored; the
generated record is committed. Every page that states a size or hash reads from that record, and
`npm run game:check` plus `tests/game-builds.test.mjs` re-hash the staged files against it, while
`B17` compares the published digests against the studio's source folder rather than against
themselves.

The export is never edited. Godot names its entry file after the executable, so a byte-identical
`index.html` copy is added to give the folder a directory index instead of renaming the studio's
file.

## Consequences

- A published number cannot silently go stale: the tests fail if the record and the staged files
  disagree, and the record fails if the staged files no longer match the studio's export.
- A fresh clone has no playable demo until `npm run game:stage` runs with access to the Godot
  project (`GAME_SOURCE_DIR` overrides the path). Deployment therefore needs a staging step, which
  `docs/deployment-options.md` records rather than hides.
- The evidence screenshots and hashes describe the builds on this machine at staging time. Anyone
  re-exporting must re-run the staging command, and the archive's own hash changes per run because
  it is rebuilt locally — the two files *inside* it are the ones with published digests.
- Reviewers who want to run the demo need the binaries from the studio or from a staged build; the
  repository alone gives them the record, not the game.
