import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { games } from '../src/js/data/games.js'
import { gameBuilds } from '../src/js/data/builds.js'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const BSD_TAR = path.join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'tar.exe')
const ARCHIVE = path.join(ROOT, 'public/downloads', path.basename(gameBuilds.desktop.servedAt))
const WEB_DIR = path.join(ROOT, 'public/game/web')

const sha256file = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256')
  const stream = createReadStream(filePath)
  stream.on('error', reject)
  stream.on('data', (chunk) => hash.update(chunk))
  stream.on('end', () => resolve(hash.digest('hex')))
})

test('the committed build record still matches what is staged in public/', async () => {
  const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts/stage-game-build.mjs'), '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  assert.equal(run.status, 0, `game:check failed:\n${run.stdout}${run.stderr}`)
})

test('the browser export is served with the exact bytes that were measured', async () => {
  for (const member of gameBuilds.web.files) {
    const filePath = path.join(WEB_DIR, member.name)
    assert.ok(existsSync(filePath), `missing ${member.name}`)
    const stat = await fs.stat(filePath)
    assert.equal(stat.size, member.bytes, `${member.name} size drifted from the record`)
    assert.equal(await sha256file(filePath), member.sha256, `${member.name} content drifted from the record`)
  }
  const entryCopy = gameBuilds.web.files.find((member) => member.name === 'index.html')
  const exportedEntry = gameBuilds.web.files.find((member) => member.name !== 'index.html' && member.name.endsWith('.html'))
  assert.equal(entryCopy.sha256, exportedEntry.sha256, 'the directory-index copy must be identical to the exported entry file')
})

test('the desktop archive unpacks to the recorded files, unchanged', async () => {
  const temp = await fs.mkdtemp(path.join(ROOT, '.archive-test-'))
  try {
    const extract = spawnSync(BSD_TAR, ['-xf', ARCHIVE, '-C', temp], { encoding: 'utf8' })
    assert.equal(extract.status, 0, `could not unpack: ${extract.stderr}`)
    for (const member of gameBuilds.desktop.contents) {
      const filePath = path.join(temp, ...member.name.split('/'))
      assert.ok(existsSync(filePath), `archive is missing ${member.name}`)
      const stat = await fs.stat(filePath)
      assert.equal(stat.size, member.bytes, `${member.name} unpacked at a different size`)
      assert.equal(await sha256file(filePath), member.sha256, `${member.name} unpacked with different content`)
    }
  } finally {
    await fs.rm(temp, { recursive: true, force: true })
  }
})

test('the archive carries the font licence text that the bundled fonts require', async () => {
  const names = gameBuilds.desktop.contents.map((member) => member.name)
  assert.ok(names.includes('LICENSE/upheaval.txt'), 'Upheaval requires its own licence file to travel with the font')
  assert.ok(names.includes('LICENSE/font-licenses.md'), 'the studio licence record should ship with the build')
  assert.ok(names.includes('README-WINDOWS.txt'), 'the archive needs run instructions because nothing is installed')
})

test('the site states build numbers taken from the measured record, not retyped ones', () => {
  const game = games.find((entry) => entry.id === 'the-last-witness')
  assert.equal(game.availability.browserDemo.bytes, gameBuilds.web.bytes)
  assert.equal(game.availability.download.bytes, gameBuilds.desktop.archiveBytes)
  assert.equal(game.availability.browserDemo.url, gameBuilds.web.playPage)
  assert.equal(game.availability.download.url, gameBuilds.desktop.servedAt)
  assert.equal(game.builds, gameBuilds)
  const webTotal = gameBuilds.web.files.filter((member) => !member.note).reduce((total, member) => total + member.bytes, 0)
  assert.equal(webTotal, gameBuilds.web.bytes, 'the stated browser payload must equal the sum of the files it loads')
})

test('staged binaries still match the studio export folder when it is present', async (t) => {
  const source = path.resolve(process.env.GAME_SOURCE_DIR ?? 'D:/the_last_witness_godot/the_last_witness')
  if (!existsSync(source)) {
    t.skip(`Godot export folder not present at ${source}`)
    return
  }
  const pairs = [
    [path.join(source, 'Web/The Last Witness.wasm'), gameBuilds.web.files.find((member) => member.name === 'The Last Witness.wasm')],
    [path.join(source, 'Web/The Last Witness.pck'), gameBuilds.web.files.find((member) => member.name === 'The Last Witness.pck')],
    [path.join(source, 'Game/The Last Witness.exe'), gameBuilds.desktop.contents.find((member) => member.name === 'The Last Witness.exe')],
    [path.join(source, 'assets/fonts/upheaval.txt'), gameBuilds.desktop.contents.find((member) => member.name === 'LICENSE/upheaval.txt')],
  ]
  for (const [filePath, member] of pairs) {
    assert.ok(existsSync(filePath), `the supplied file ${path.basename(filePath)} is no longer where it was staged from`)
    assert.equal(await sha256file(filePath), member.sha256, `${member.name} differs from the studio export`)
  }
})
