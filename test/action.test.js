import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { GOOD_FILES, withRepo } from '../support/helpers.js'

const ACTION = fileURLToPath(new URL('../src/action.js', import.meta.url))

async function runAction(t, repo, inputs = {}) {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'shipcheck-output-'))
  t.after(() => rm(outputDir, { recursive: true, force: true }))
  const outputFile = path.join(outputDir, 'github-output')
  const result = spawnSync(process.execPath, [ACTION], {
    encoding: 'utf8',
    env: {
      ...process.env,
      NO_COLOR: '1',
      INPUT_PATH: repo.root,
      INPUT_FAIL_UNDER: '80',
      INPUT_STRICT: 'false',
      GITHUB_OUTPUT: outputFile,
      ...inputs,
    },
  })
  const output = await readFile(outputFile, 'utf8').catch(() => '')
  return { ...result, output }
}

test('the action writes outputs and passes a clean repository', async (t) => {
  const repo = await withRepo(t, GOOD_FILES)
  const result = await runAction(t, repo)

  assert.equal(result.status, 0)
  assert.match(result.stdout, /::group::Shipcheck report/)
  assert.match(result.output, /score=100/)
  assert.match(result.output, /grade=A/)
  assert.match(result.output, /warnings=0/)
  assert.match(result.output, /failed=0/)
})

test('the action fails below the requested score', async (t) => {
  const repo = await withRepo(t, { 'README.md': '# Hello\n' })
  const result = await runAction(t, repo)

  assert.equal(result.status, 1)
  assert.match(result.stdout, /::error title=Shipcheck::Score/)
})

test('the action can fail on warnings with strict mode', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'README.md': '# Tiny\n\nA short readme.\n',
  })
  const result = await runAction(t, repo, {
    INPUT_STRICT: 'true',
    INPUT_FAIL_UNDER: '0',
  })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /--strict found warnings/)
})
