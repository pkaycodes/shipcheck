import assert from 'node:assert/strict'
import test from 'node:test'
import { isIgnored, parseGitignore } from '../src/ignore.js'

const patterns = parseGitignore(`# dependencies
node_modules/
.env.*
!.env.example
/dist
**/coverage
*.log
`)

test('gitignore matches directory and basename patterns', () => {
  assert.equal(isIgnored(patterns, 'node_modules'), true)
  assert.equal(isIgnored(patterns, 'packages/app/node_modules'), true)
  assert.equal(isIgnored(patterns, '.env.local'), true)
  assert.equal(isIgnored(patterns, '.env.example'), false)
  assert.equal(isIgnored(patterns, 'dist'), true)
  assert.equal(isIgnored(patterns, 'packages/app/dist'), false)
  assert.equal(isIgnored(patterns, 'coverage'), true)
  assert.equal(isIgnored(patterns, 'packages/app/coverage'), true)
  assert.equal(isIgnored(patterns, 'debug.log'), true)
  assert.equal(isIgnored(patterns, 'README.md'), false)
})

test('gitignore comments and blank lines are ignored', () => {
  const parsed = parseGitignore('\n# comment\n.env\n\n')
  assert.equal(parsed.length, 1)
  assert.equal(isIgnored(parsed, '.env'), true)
})

test('a later negation overrides an earlier match', () => {
  const parsed = parseGitignore('.env\n!.env.example\n')
  assert.equal(isIgnored(parsed, '.env'), true)
  assert.equal(isIgnored(parsed, '.env.example'), false)
})
