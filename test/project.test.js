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

const checkFor = async (root, id) => {
  const result = await auditRepo(root)
  return result.checks.find((check) => check.id === id)
}

test('tests check passes with a test script and test files', async (t) => {
  const repo = await withRepo(t, GOOD_FILES)
  const check = await checkFor(repo.root, 'tests')

  assert.equal(check.status, 'pass')
  assert.equal(check.points, 15)
})

test('tests check warns when package.json has no test script', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'package.json': packageWith({ scripts: {} }),
  })
  const check = await checkFor(repo.root, 'tests')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /no test script/)
})

test('tests check warns when only a script exists', async (t) => {
  const repo = await withRepo(t, omit(GOOD_FILES, 'test/index.test.js'))
  const check = await checkFor(repo.root, 'tests')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /no test files/)
})

test('tests check is skipped when there is no source code', async (t) => {
  const repo = await withRepo(t, {
    'README.md': GOOD_FILES['README.md'],
    LICENSE: GOOD_FILES.LICENSE,
  })
  const check = await checkFor(repo.root, 'tests')

  assert.equal(check.status, 'skip')
  assert.match(check.summary, /No source files/)
})

test('CI check fails when there is no CI configuration', async (t) => {
  const repo = await withRepo(t, omit(GOOD_FILES, '.github/workflows/ci.yml'))
  const check = await checkFor(repo.root, 'ci')

  assert.equal(check.status, 'fail')
  assert.match(check.summary, /No CI/)
})

test('CI check warns when the workflow does not run tests', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    '.github/workflows/ci.yml': `name: Build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
`,
  })
  const check = await checkFor(repo.root, 'ci')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /does not run the test suite/)
})

test('CI check detects common test commands', async (t) => {
  const repo = await withRepo(t, {
    ...omit(GOOD_FILES, '.github/workflows/ci.yml'),
    '.github/workflows/test.yml': `name: Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test
`,
  })
  const check = await checkFor(repo.root, 'ci')

  assert.equal(check.status, 'pass')
})

test('gitignore check fails when the file is missing', async (t) => {
  const repo = await withRepo(t, omit(GOOD_FILES, '.gitignore'))
  const check = await checkFor(repo.root, 'gitignore')

  assert.equal(check.status, 'fail')
  assert.match(check.summary, /No \.gitignore/)
})

test('gitignore check warns about incomplete coverage', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    '.gitignore': 'node_modules/\n',
  })
  const check = await checkFor(repo.root, 'gitignore')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /missing/)
})

test('env check fails when .env is not ignored', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    '.env': 'API_URL=http://localhost:3000\n',
    '.gitignore': `node_modules/
dist/
coverage/
*.log
.DS_Store
`,
  })
  const check = await checkFor(repo.root, 'env')

  assert.equal(check.status, 'fail')
  assert.match(check.summary, /not ignored/)
})

test('env check warns when variables are used without an example file', async (t) => {
  const usage = ['import', '.meta.env.VITE_API_URL'].join('')
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    'src/config.js': `export const url = ${usage}\n`,
  })
  const check = await checkFor(repo.root, 'env')

  assert.equal(check.status, 'warn')
  assert.match(check.summary, /no \.env\.example/)
})

test('env check passes when a local .env is ignored and documented', async (t) => {
  const repo = await withRepo(t, {
    ...GOOD_FILES,
    '.env': 'API_URL=http://localhost:3000\n',
    '.env.example': 'API_URL=\n',
  })
  const check = await checkFor(repo.root, 'env')

  assert.equal(check.status, 'pass')
  assert.match(check.summary, /documented/)
})
