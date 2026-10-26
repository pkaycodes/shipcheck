const LOCKFILES = new Map([
  ['package-lock.json', 'npm'],
  ['npm-shrinkwrap.json', 'npm'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
])

export const lockfileCheck = {
  id: 'lockfile',
  title: 'Lockfile',
  weight: 5,
  async run(context) {
    if (!context.packageFile) {
      return {
        score: 0,
        skipped: true,
        summary: 'No package.json.',
        details: [],
        fix: null,
      }
    }

    if (context.lockfiles.length === 0) {
      return {
        score: 0.4,
        summary: 'No lockfile found.',
        details: ['A lockfile makes installs reproducible for contributors and CI.'],
        fix: 'Run your package manager install and commit the lockfile.',
      }
    }

    if (context.lockfiles.length > 1) {
      return {
        score: 0.5,
        summary: 'Multiple lockfiles found.',
        details: context.lockfiles.map(
          (file) => `${file} (${LOCKFILES.get(file)})`,
        ),
        fix: 'Keep the lockfile for your package manager and remove the others.',
      }
    }

    const lockfile = context.lockfiles[0]
    const manager = LOCKFILES.get(lockfile)
    const content = await context.read(lockfile, { maxBytes: 1024 * 1024 })
    if (!content || content.trim().length < 10) {
      return {
        score: 0.4,
        summary: `${lockfile} is empty.`,
        fix: 'Regenerate the lockfile with your package manager.',
      }
    }

    const declared = getPackageManager(context.packageJson)
    if (declared && declared !== manager) {
      return {
        score: 0.7,
        summary: `${lockfile} is for ${manager}, but packageManager declares ${declared}.`,
        details: ['Contributors may use a different package manager than CI.'],
        fix: 'Align packageManager with the committed lockfile.',
      }
    }

    return {
      score: 1,
      summary: `${lockfile} found (${manager}).`,
      details: [],
      fix: null,
    }
  },
}

function getPackageManager(packageJson) {
  const value = packageJson?.packageManager
  if (typeof value !== 'string' || !value.trim()) return null
  return value.includes('@') ? value.slice(0, value.lastIndexOf('@')) : value
}
