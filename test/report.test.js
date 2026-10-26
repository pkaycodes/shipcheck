import assert from 'node:assert/strict'
import test from 'node:test'
import { renderJson, renderReport } from '../src/report.js'

const checks = [
  {
    id: 'readme',
    title: 'README',
    weight: 15,
    score: 1,
    points: 15,
    status: 'pass',
    summary: 'Install, usage and license are documented.',
    details: [],
    fix: null,
  },
  {
    id: 'ci',
    title: 'CI',
    weight: 12,
    score: 0.6,
    points: 7.2,
    status: 'warn',
    summary: 'CI found, but it does not run the test suite.',
    details: ['.github/workflows/build.yml'],
    fix: 'Add npm test to the CI workflow.',
  },
]

const result = {
  tool: 'shipcheck',
  schemaVersion: 1,
  version: '1.0.0',
  root: '/tmp/example',
  score: 84,
  grade: 'B',
  summary: { passed: 1, warnings: 1, failed: 0, skipped: 0 },
  files: 12,
  durationMs: 4,
  checks,
}

test('the text report has a score, checks and next steps', () => {
  const output = renderReport(result, { cwd: '/tmp/example', color: false })

  assert.match(output, /shipcheck v1\.0\.0/)
  assert.match(output, /84\/100/)
  assert.match(output, /Grade B/)
  assert.match(output, /README/)
  assert.match(output, /Next steps/)
  assert.match(output, /Add npm test/)
  assert.ok(!output.includes('\u001b['))
})

test('the text report uses colour when asked', () => {
  const output = renderReport(result, { cwd: '/tmp/example', color: true })
  assert.ok(output.includes('\u001b['))
})

test('the text report says ready when there are no issues', () => {
  const clean = {
    ...result,
    score: 100,
    grade: 'A',
    summary: { passed: 2, warnings: 0, failed: 0, skipped: 0 },
    checks: checks.map((check) => ({
      ...check,
      score: 1,
      points: check.weight,
      status: 'pass',
      fix: null,
    })),
  }
  const output = renderReport(clean, { cwd: '/tmp/example', color: false })

  assert.match(output, /Ready to ship/)
  assert.equal(clean.checks[1].points, 12)
})

test('JSON output is machine readable and stable', () => {
  const parsed = JSON.parse(renderJson(result))

  assert.equal(parsed.tool, 'shipcheck')
  assert.equal(parsed.schemaVersion, 1)
  assert.equal(parsed.score, 84)
  assert.equal(parsed.checks.length, 2)
  assert.equal(parsed.checks[1].status, 'warn')
  assert.equal(parsed.summary.warnings, 1)
})
