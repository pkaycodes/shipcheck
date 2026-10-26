import assert from 'node:assert/strict'
import test from 'node:test'
import { auditRepo } from '../src/audit.js'
import { GOOD_FILES, withRepo } from '../support/helpers.js'

const checkFor = async (root, id) => {
  const result = await auditRepo(root)
  return result.checks.find((check) => check.id === id)
}

test('secrets check reports a GitHub token without leaking it', async (t) => {
  const token = `ghp_${'A'.repeat(36)}`
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'src/config.js': `export const token = '${token}'\n`,
  })
  const check = await checkFor(repo.root, 'secrets')

  assert.equal(check.status, 'fail')
  assert.match(check.summary, /potential secret/)
  assert.ok(check.details.some((detail) => /src\/config\.js:1/.test(detail)))
  assert.ok(check.details.some((detail) => /GitHub token/.test(detail)))
  assert.ok(!check.details.join(' ').includes(token))
  assert.ok(check.details.some((detail) => /ghp_…/.test(detail)))
})

test('secrets check detects a private key block', async (t) => {
  const marker = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ')
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'src/key.js': `export const key = '${marker}'\n`,
  })
  const check = await checkFor(repo.root, 'secrets')

  assert.equal(check.status, 'fail')
  assert.ok(check.details.some((detail) => /Private key block/.test(detail)))
})

test('secrets check ignores obvious placeholders', async (t) => {
  const placeholder = `ghp_${'x'.repeat(36)}`
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'src/config.js': `export const token = '${placeholder}'\n`,
  })
  const check = await checkFor(repo.root, 'secrets')

  assert.equal(check.status, 'pass')
})

test('secrets check warns about a generic hard-coded secret', async (t) => {
  const secret = ['abcdef1234567890', 'abcdef'].join('')
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'src/config.js': `export const apiKey = '${secret}'\n`,
  })
  const check = await checkFor(repo.root, 'secrets')

  assert.equal(check.status, 'warn')
  assert.ok(check.details.some((detail) => /hard-coded secret/.test(detail)))
})

test('secrets check passes on the clean fixture', async (t) => {
  const repo = await withRepo(t, GOOD_FILES)
  const check = await checkFor(repo.root, 'secrets')

  assert.equal(check.status, 'pass')
  assert.match(check.summary, /No hard-coded secrets/)
})
