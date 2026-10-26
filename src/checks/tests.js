import { isTestFile } from '../files.js'

const TEST_CONFIG =
  /(^|\/)(?:pytest\.ini|tox\.ini|noxfile\.py|phpunit\.xml|jest\.config\.[^/]+|vitest\.config\.[^/]+|karma\.conf\.[^/]+|\.mocharc(?:\.[^/]+)?)$/i

export const testsCheck = {
  id: 'tests',
  title: 'Tests',
  weight: 15,
  run(context) {
    const sourceFiles = context.codeFiles.filter((file) => !isTestFile(file))
    if (sourceFiles.length === 0) {
      return {
        score: 0,
        skipped: true,
        summary: 'No source files to test.',
        details: [],
        fix: null,
      }
    }

    const isNodeProject = Boolean(context.packageFile)
    const testScript = getTestScript(context.packageJson)
    const testFiles = context.testFiles.length
    const hasTestFiles = testFiles > 0
    const hasTestConfig = context.files.some((file) => TEST_CONFIG.test(file))
    const details = []
    let score = 0

    if (isNodeProject) {
      if (testScript) score += 0.35
      else details.push('package.json has no usable "test" script.')
      if (hasTestFiles) score += 0.65
      else details.push('No test files found (tests/, *.test.*, *_test.go, test_*.py).')
    } else {
      if (hasTestFiles) score = 1
      else if (hasTestConfig) score = 0.5
      else details.push('No test files or test configuration found.')
    }

    score = Math.round(score * 100) / 100
    return {
      score,
      summary: summarise({
        isNodeProject,
        testScript,
        testFiles,
      }),
      details,
      fix:
        score === 1
          ? null
          : isNodeProject && !testScript
            ? 'Add a "test" script to package.json and make it run the suite.'
            : 'Add tests for the main behaviour and run them in CI.',
    }
  },
}

function getTestScript(packageJson) {
  const script = packageJson?.scripts?.test
  if (typeof script !== 'string') return null
  const value = script.trim()
  if (!value || /no test specified|exit 1/i.test(value)) return null
  return value
}

function summarise({ isNodeProject, testScript, testFiles }) {
  if (isNodeProject) {
    if (testScript && testFiles > 0) {
      return `Test script and ${testFiles} test file${testFiles === 1 ? '' : 's'} found.`
    }
    if (testScript) return 'Test script found, but no test files could be found.'
    if (testFiles > 0) {
      return `${testFiles} test file${testFiles === 1 ? '' : 's'} found, but package.json has no test script.`
    }
    return 'No tests detected.'
  }

  if (testFiles > 0) {
    return `${testFiles} test file${testFiles === 1 ? '' : 's'} found.`
  }
  return 'No tests detected.'
}
