import { isIgnored } from '../ignore.js'

export const envCheck = {
  id: 'env',
  title: 'Environment',
  weight: 8,
  run(context) {
    const hasEnvFile = context.envFiles.length > 0
    const hasExample = Boolean(context.envExampleFile)
    const usesEnv =
      hasEnvFile || hasExample || context.envUsageFiles.length > 0

    if (!usesEnv) {
      return {
        score: 0,
        skipped: true,
        summary: 'No environment files or env-loading patterns detected.',
        details: [],
        fix: null,
      }
    }

    const envIgnored = isIgnored(context.gitignore, '.env')

    if (hasEnvFile) {
      if (!envIgnored) {
        return {
          score: 0,
          summary: 'A .env file is present and not ignored.',
          details: [
            `Found: ${context.envFiles.join(', ')}.`,
            '.gitignore does not cover .env.',
          ],
          fix: 'Add .env to .gitignore; if it was committed, remove it from the index and rotate any secrets.',
        }
      }

      if (!hasExample) {
        return {
          score: 0.85,
          summary: 'A local .env is ignored, but there is no .env.example.',
          details: ['Document the required variables without their real values.'],
          fix: 'Add a .env.example with the variable names and safe defaults.',
        }
      }

      return {
        score: 1,
        summary: 'Local .env is ignored and documented by .env.example.',
        details: [],
        fix: null,
      }
    }

    if (hasExample) {
      return {
        score: 1,
        summary: `Environment variables are documented in ${context.envExampleFile}.`,
        details: [],
        fix: null,
      }
    }

    return {
      score: 0.6,
      summary: 'Environment variables are used, but there is no .env.example.',
      details: context.envUsageFiles.slice(0, 3),
      fix: 'Add a .env.example with the required variable names (no real values).',
    }
  },
}
