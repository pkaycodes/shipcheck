import assert from 'node:assert/strict'
import test from 'node:test'
import { auditRepo } from '../src/audit.js'
import { GOOD_FILES, omit, withRepo } from '../support/helpers.js'

const packageWith = (overrides) =>
  JSON.stringify(
    { ...JSON.parse(GOOD_FILES['package.json']), ...overrides },
    null,
    2,
  )

async function resultFor(root) {
  return auditRepo(root)
}

test('README check rewards complete documentation', async (t) => {
  const repo = await withRepo(t, GOOD_FILES)
  const result = await resultFor(repo.root)
  const check = result.checks.find((item) => item.id === 'readme')

  assert.equal(check.status, 'pass')
  assert.equal(check.points, 15)
  assert.match(check.summary, /Install, usage, testing and license/)
})

test('README check fails when the file is missing', async (t) => {
  const repo = await withRepo(t, omit(GOOD_FILES, 'README.md'))
  const result = await resultFor(repo.root)
  const check = result.checks.find((item) => item.id === 'readme')

  assert.equal(check.status, 'fail')
  assert.match(check.summary, /No README/)
})

test('README check warns about missing sections and examples', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'README.md': '# Tiny\n\nA short readme.\n',
  })
  const result = await resultFor(repo.root)
  const check = result.checks.find((item) => item.id === 'readme')

  assert.equal(check.status, 'warn')
  assert.ok(check.details.some((detail) => /Missing sections/.test(detail)))
  assert.ok(check.details.some((detail) => /code block/.test(detail)))
})

test('license check recognises MIT', async (t) => {
  const repo = await withRepo(t, GOOD_FILES)
  const result = await resultFor(repo.root)
  const check = result.checks.find((item) => item.id === 'license')

  assert.equal(check.status, 'pass')
  assert.match(check.summary, /MIT/)
})

test('license check flags a mismatch with package.json', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'package.json': packageWith({ license: 'Apache-2.0' }),
  })
  const result = await resultFor(repo.root)
  const check = result.checks.find((item) => item.id === 'license')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /Apache-2\.0/)
  assert.match(check.summary, /MIT/)
})

test('license check accepts a package declaration without a file with a warning', async (t) => {
  const repo = await withRepo(t, omit(GOOD_FILES, 'LICENSE'))
  const result = await resultFor(repo.root)
  const check = result.checks.find((item) => item.id === 'license')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /No LICENSE file/)
})

test('license check warns on unrecognised text', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    LICENSE:
      'This is my own license. Please be nice, share improvements, and do not blame me if something breaks.\n',
  })
  const result = await resultFor(repo.root)
  const check = result.checks.find((item) => item.id === 'license')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /could not be identified/)
})

test('license check fails when there is no license at all', async (t) => {
  const repo = await withRepo(t, {
    ...omit(GOOD_FILES, 'LICENSE', 'package.json'),
  })
  const result = await resultFor(repo.root)
  const check = result.checks.find((item) => item.id === 'license')

  assert.equal(check.status, 'fail')
  assert.match(check.summary, /No license/)
})
