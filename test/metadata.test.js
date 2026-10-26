import assert from 'node:assert/strict'
import test from 'node:test'
import { auditRepo } from '../src/audit.js'
import { GOOD_FILES, omit, withRepo } from '../support/helpers.js'

const basePackage = JSON.parse(GOOD_FILES['package.json'])
const packageWith = (overrides) =>
  JSON.stringify({ ...basePackage, ...overrides }, null, 2)

const checkFor = async (root, id) => {
  const result = await auditRepo(root)
  return result.checks.find((check) => check.id === id)
}

test('package check passes for complete metadata', async (t) => {
  const repo = await withRepo(t, GOOD_FILES)
  const check = await checkFor(repo.root, 'package')

  assert.equal(check.status, 'pass')
})

test('package check warns about missing metadata', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'package.json': JSON.stringify(
      { name: 'sparse', version: '0.1.0' },
      null,
      2,
    ),
  })
  const check = await checkFor(repo.root, 'package')

  assert.equal(check.status, 'warn')
  assert.ok(check.details.some((detail) => /description/.test(detail)))
  assert.ok(check.details.some((detail) => /repository/.test(detail)))
})

test('package check fails on invalid JSON', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'package.json': '{\n  "name": "broken",\n',
  })
  const check = await checkFor(repo.root, 'package')

  assert.equal(check.status, 'fail')
  assert.match(check.summary, /not valid JSON/)
})

test('package check is skipped without a package.json', async (t) => {
  const repo = await withRepo(t, omit(GOOD_FILES, 'package.json', 'package-lock.json'))
  const check = await checkFor(repo.root, 'package')

  assert.equal(check.status, 'skip')
})

test('lockfile check passes with a single lockfile', async (t) => {
  const repo = await withRepo(t, GOOD_FILES)
  const check = await checkFor(repo.root, 'lockfile')

  assert.equal(check.status, 'pass')
  assert.match(check.summary, /npm/)
})

test('lockfile check warns when no lockfile exists', async (t) => {
  const repo = await withRepo(t, omit(GOOD_FILES, 'package-lock.json'))
  const check = await checkFor(repo.root, 'lockfile')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /No lockfile/)
})

test('lockfile check warns about multiple lockfiles', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'yarn.lock': '# yarn lockfile v1\n',
  })
  const check = await checkFor(repo.root, 'lockfile')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /Multiple lockfiles/)
})

test('lockfile check warns when packageManager disagrees', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'package.json': packageWith({ packageManager: 'pnpm@9.0.0' }),
  })
  const check = await checkFor(repo.root, 'lockfile')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /packageManager/)
})
