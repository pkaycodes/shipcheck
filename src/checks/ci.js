const TEST_COMMAND =
  /(?:\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test(?::[\w-]+)?\b|\bnode\s+--test\b|\b(?:pytest|vitest|jest|phpunit|rspec)\b|\bgo\s+test\b|\bcargo\s+(?:test|nextest)\b|\b(?:mvn|gradle|\.\/gradlew)\b[^\n]*\b(?:test|check)\b|\bdotnet\s+test\b|\bmix\s+test\b|\bbundle\s+exec\s+rake\s+test\b|\bmake\s+test\b)/

export const ciCheck = {
  id: 'ci',
  title: 'CI',
  weight: 12,
  async run(context) {
    if (context.ciFiles.length === 0) {
      return {
        score: 0,
        summary: 'No CI configuration found.',
        details: [
          'Looked for GitHub Actions, GitLab CI, CircleCI, Travis, Azure Pipelines, Buildkite and Jenkins.',
        ],
        fix: 'Add a CI workflow that installs dependencies and runs the test suite.',
      }
    }

    const contents = await Promise.all(
      context.ciFiles.map((file) => context.read(file)),
    )
    const runsTests = contents.some(
      (content) =>
        typeof content === 'string' &&
        TEST_COMMAND.test(content.replace(/^\s*#.*$/gm, '')),
    )

    if (runsTests) {
      return {
        score: 1,
        summary: `CI runs the test suite (${context.ciFiles.length} config file${context.ciFiles.length === 1 ? '' : 's'}).`,
        details: context.ciFiles.slice(0, 4),
        fix: null,
      }
    }

    return {
      score: 0.6,
      summary: 'CI found, but it does not run the test suite.',
      details: context.ciFiles.slice(0, 4),
      fix: `Add the test command to ${context.ciFiles[0]}.`,
    }
  },
}
