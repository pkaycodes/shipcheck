import { isIgnored } from '../ignore.js'

export const gitignoreCheck = {
  id: 'gitignore',
  title: '.gitignore',
  weight: 8,
  run(context) {
    if (!context.gitignoreFile) {
      return {
        score: 0,
        summary: 'No .gitignore found.',
        details: [
          'Dependencies, build output and local secrets can end up in version control.',
        ],
        fix: 'Add a .gitignore for dependencies, build output, environment files and OS files.',
      }
    }

    const patterns = context.gitignore
    const requirements = [
      {
        label: 'dependencies',
        weight: 25,
        applies: Boolean(context.packageFile),
        ignored: isIgnored(patterns, 'node_modules'),
      },
      {
        label: 'environment files',
        weight: 20,
        applies: true,
        ignored: isIgnored(patterns, '.env'),
      },
      {
        label: 'build output',
        weight: 15,
        applies: true,
        ignored:
          isIgnored(patterns, 'dist') ||
          isIgnored(patterns, 'build') ||
          isIgnored(patterns, 'out'),
      },
      {
        label: 'coverage',
        weight: 10,
        applies: true,
        ignored: isIgnored(patterns, 'coverage'),
      },
      {
        label: 'OS files',
        weight: 10,
        applies: true,
        ignored:
          isIgnored(patterns, '.DS_Store') ||
          isIgnored(patterns, 'Thumbs.db') ||
          isIgnored(patterns, 'Desktop.ini'),
      },
      {
        label: 'logs',
        weight: 5,
        applies: true,
        ignored:
          isIgnored(patterns, 'debug.log') ||
          isIgnored(patterns, 'npm-debug.log'),
      },
    ]

    const applicable = requirements.filter((item) => item.applies)
    const covered = applicable.filter((item) => item.ignored)
    const missing = applicable.filter((item) => !item.ignored)
    const totalWeight =
      15 + applicable.reduce((total, item) => total + item.weight, 0)
    let earned = 15 + covered.reduce((total, item) => total + item.weight, 0)
    const details = missing.map((item) => `Missing: ${item.label}.`)

    if (
      context.envExampleFile &&
      isIgnored(patterns, context.envExampleFile)
    ) {
      earned -= 5
      details.push(
        `${context.envExampleFile} is ignored; add !${context.envExampleFile} so the template is committed.`,
      )
    }

    const score = Math.max(0, Math.round((earned / totalWeight) * 100) / 100)
    return {
      score,
      summary:
        score === 1
          ? 'Covers dependencies, environment files, build output and OS files.'
          : `.gitignore is missing ${missing.map((item) => item.label).join(', ') || 'a template exception'}.`,
      details,
      fix:
        score === 1
          ? null
          : 'Add the missing patterns to .gitignore.',
    }
  },
}
