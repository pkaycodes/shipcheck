import assert from 'node:assert/strict'
import test from 'node:test'
import { gradeFor, summarise } from '../src/score.js'

test('grade boundaries are stable', () => {
  assert.equal(gradeFor(100), 'A')
  assert.equal(gradeFor(90), 'A')
  assert.equal(gradeFor(89), 'B')
  assert.equal(gradeFor(80), 'B')
  assert.equal(gradeFor(79), 'C')
  assert.equal(gradeFor(70), 'C')
  assert.equal(gradeFor(69), 'D')
  assert.equal(gradeFor(60), 'D')
  assert.equal(gradeFor(59), 'F')
})

test('skipped checks are removed from the score denominator', () => {
  const result = summarise([
    {
      id: 'a',
      title: 'A',
      weight: 10,
      score: 1,
      skipped: false,
      summary: '',
      details: [],
      fix: null,
    },
    {
      id: 'b',
      title: 'B',
      weight: 10,
      score: 0,
      skipped: true,
      summary: '',
      details: [],
      fix: null,
    },
  ])

  assert.equal(result.score, 100)
  assert.equal(result.grade, 'A')
  assert.equal(result.summary.skipped, 1)
  assert.equal(result.summary.passed, 1)
  assert.equal(result.checks[1].points, 0)
})

test('partial scores become warnings with weighted points', () => {
  const result = summarise([
    {
      id: 'a',
      title: 'A',
      weight: 10,
      score: 0.5,
      skipped: false,
      summary: '',
      details: [],
      fix: null,
    },
  ])

  assert.equal(result.score, 50)
  assert.equal(result.grade, 'F')
  assert.equal(result.checks[0].status, 'warn')
  assert.equal(result.checks[0].points, 5)
  assert.equal(result.summary.warnings, 1)
})

test('a zero score becomes a failure', () => {
  const result = summarise([
    {
      id: 'a',
      title: 'A',
      weight: 10,
      score: 0,
      skipped: false,
      summary: '',
      details: [],
      fix: null,
    },
  ])

  assert.equal(result.checks[0].status, 'fail')
  assert.equal(result.summary.failed, 1)
})
