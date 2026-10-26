import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const README = `# Fixture Project

A small, deliberately boring repository used by the Shipcheck test suite. It
has documentation, a license, a test suite, CI and package metadata so that a
clean audit can be exercised end to end. The extra prose below exists only to
make the README long enough for the documentation check.

## Installation

Install the package with npm:

\`\`\`bash
npm install
\`\`\`

## Usage

Import the exported value:

\`\`\`js
import { answer } from './src/index.js'
console.log(answer)
\`\`\`

## Testing

Run the test suite with:

\`\`\`bash
npm test
\`\`\`

## License

MIT. See the LICENSE file for the full text. The project is intentionally
small, but the documentation covers installation, usage, testing and licensing
so that every README section is present.
`

const LICENSE = `MIT License

Copyright (c) 2026 Shipcheck Tests

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`

export const GOOD_FILES = {
  'README.md': README,
  LICENSE,
  'package.json': JSON.stringify(
    {
      name: 'fixture-project',
      version: '1.0.0',
      description: 'A well-documented fixture project for Shipcheck tests.',
      type: 'module',
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'https://github.com/example/fixture-project',
      },
      engines: { node: '>=20' },
      files: ['src', 'bin'],
      keywords: ['fixture', 'test', 'example'],
      author: 'Test Author',
      main: 'src/index.js',
      bin: { fixture: './bin/fixture.js' },
      scripts: { test: 'node --test' },
    },
    null,
    2,
  ),
  'package-lock.json': JSON.stringify(
    { name: 'fixture-project', version: '1.0.0', lockfileVersion: 3, packages: {} },
    null,
    2,
  ),
  '.gitignore': `node_modules/
dist/
coverage/
.env
*.log
.DS_Store
`,
  'src/index.js': 'export const answer = 42\n',
  'bin/fixture.js': "#!/usr/bin/env node\nconsole.log('fixture')\n",
  'test/index.test.js': `import test from 'node:test'
import assert from 'node:assert/strict'
import { answer } from '../src/index.js'

test('exports the answer', () => {
  assert.equal(answer, 42)
})
`,
  '.github/workflows/ci.yml': `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci
      - run: npm test
`,
}

export async function makeRepo(files = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'shipcheck-'))
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath)
    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, content)
  }
  return {
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}

export async function withRepo(t, files) {
  const repo = await makeRepo(files)
  t.after(repo.cleanup)
  return repo
}

export function omit(files, ...keys) {
  return Object.fromEntries(
    Object.entries(files).filter(([key]) => !keys.includes(key)),
  )
}

