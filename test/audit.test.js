import assert from 'node:assert/strict'
import test from 'node:test'
import { auditRepo } from '../src/audit.js'
import { GOOD_FILES, withRepo } from '../support/helpers.js'

test('a complete repository scores 100', async (t) => {
  const repo = await withRepo(t, GOOD_FILES)
  const result = await auditRepo(repo.root)

  assert.equal(result.score, 100)
  assert.equal(result.grade, 'A')
  assert.equal(result.summary.failed, 0)
  assert.equal(result.summary.warnings, 0)
  assert.equal(result.summary.passed, 8)
  assert.equal(result.summary.skipped, 1)
  assert.equal(
    result.checks.find((check) => check.id === 'env').status,
    'skip',
  )
  assert.equal(result.checks.find((check) => check.id === 'readme').points, 15)
})

test('a nearly empty repository scores poorly', async (t) => {
  const repo = await withRepo(t, { 'README.md': '# Hello\n' })
  const result = await auditRepo(repo.root)

  assert.ok(result.score < 60)
  assert.equal(result.grade, 'F')
  assert.equal(result.checks.find((check) => check.id === 'license').status, 'fail')
  assert.equal(result.checks.find((check) => check.id === 'ci').status, 'fail')
  assert.equal(result.checks.find((check) => check.id === 'package').status, 'skip')
  assert.equal(result.checks.find((check) => check.id === 'tests').status, 'skip')
})

test('a failing check does not stop the rest of the audit', async (t) => {
  const repo = await withRepo(t, {})
  const result = await auditRepo(repo.root, {
    checks: [
      {
        id: 'boom',
        title: 'Boom',
        weight: 10,
        run() {
          throw new Error('nope')
        },
      },
      {
        id: 'ok',
        title: 'Okay',
        weight: 10,
        run() {
          return { score: 1, summary: 'fine' }
        },
      },
    ],
  })

  assert.equal(result.checks[0].status, 'fail')
  assert.match(result.checks[0].summary, /nope/)
  assert.equal(result.checks[1].status, 'pass')
  assert.equal(result.score, 50)
})

test('a missing path rejects', async () => {
  await assert.rejects(
    () => auditRepo('/definitely/not/a/shipcheck/repository'),
    /ENOENT|no such file/i,
  )
})
