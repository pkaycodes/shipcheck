import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { parseArgs, UsageError } from '../src/cli.js'
import { GOOD_FILES, withRepo } from '../support/helpers.js'

const BIN = fileURLToPath(new URL('../bin/shipcheck.js', import.meta.url))

function runBin(args, options = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
    ...options,
  })
}

test('parseArgs applies defaults', () => {
  assert.deepEqual(parseArgs([]), {
    path: '.',
    json: false,
    failUnder: 0,
    strict: false,
    verbose: false,
    noColor: false,
    help: false,
    version: false,
    listChecks: false,
  })
})

test('parseArgs reads options in either fail-under form', () => {
  assert.equal(parseArgs(['--fail-under', '80']).failUnder, 80)
  assert.equal(parseArgs(['--fail-under=90']).failUnder, 90)
  assert.equal(parseArgs(['--json', '--strict', '--verbose', '--no-color']).json, true)
  assert.equal(parseArgs(['--strict']).strict, true)
  assert.equal(parseArgs(['--verbose']).verbose, true)
  assert.equal(parseArgs(['--no-color']).noColor, true)
})

test('parseArgs supports a path after --', () => {
  assert.equal(parseArgs(['--', '-weird-path']).path, '-weird-path')
})

test('parseArgs rejects invalid options', () => {
  assert.throws(() => parseArgs(['--wat']), UsageError)
  assert.throws(() => parseArgs(['one', 'two']), UsageError)
  assert.throws(() => parseArgs(['--fail-under', '101']), UsageError)
  assert.throws(() => parseArgs(['--fail-under', 'no']), UsageError)
})

test('the CLI prints JSON for a clean repository', async (t) => {
  const repo = await withRepo(t, GOOD_FILES)
  const result = runBin([repo.root, '--json'])

  assert.equal(result.status, 0)
  const report = JSON.parse(result.stdout)
  assert.equal(report.tool, 'shipcheck')
  assert.equal(report.score, 100)
  assert.equal(report.grade, 'A')
  assert.equal(result.stderr, '')
})

test('--fail-under exits 1 when the score is lower', async (t) => {
  const repo = await withRepo(t, { 'README.md': '# Hello\n' })
  const result = runBin([repo.root, '--fail-under', '80'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /below --fail-under 80/)
})

test('--strict exits 1 on warnings', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'README.md': '# Tiny\n\nA short readme.\n',
  })
  const result = runBin([repo.root, '--strict'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /--strict/)
})

test('--help, --version and --list-checks are useful', () => {
  const help = runBin(['--help'])
  assert.equal(help.status, 0)
  assert.match(help.stdout, /Usage/)
  assert.match(help.stdout, /--fail-under/)

  const version = runBin(['--version'])
  assert.equal(version.status, 0)
  assert.match(version.stdout, /^1\.0\.0/m)

  const list = runBin(['--list-checks'])
  assert.equal(list.status, 0)
  assert.match(list.stdout, /readme/)
  assert.match(list.stdout, /secrets/)
})

test('a missing path exits 2', () => {
  const result = runBin(['/definitely/not/here'])
  assert.equal(result.status, 2)
  assert.match(result.stderr, /shipcheck:/)
})

test('an unknown option exits 2', () => {
  const result = runBin(['--wat'])
  assert.equal(result.status, 2)
  assert.match(result.stderr, /Unknown option/)
})
