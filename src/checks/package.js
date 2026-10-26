const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

export const packageCheck = {
  id: 'package',
  title: 'Package',
  weight: 10,
  run(context) {
    if (!context.packageFile) {
      return {
        score: 0,
        skipped: true,
        summary: 'No package.json.',
        details: [],
        fix: null,
      }
    }

    if (context.packageError) {
      return {
        score: 0,
        summary: 'package.json is not valid JSON.',
        details: [context.packageError],
        fix: 'Fix the JSON syntax in package.json.',
      }
    }

    const pkg = context.packageJson
    const binPaths = getBinPaths(pkg.bin)
    const missing = []

    const requirements = [
      {
        label: 'name',
        weight: 8,
        ok:
          typeof pkg.name === 'string' &&
          /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(pkg.name),
      },
      {
        label: 'version',
        weight: 8,
        ok: typeof pkg.version === 'string' && SEMVER.test(pkg.version),
      },
      {
        label: 'description',
        weight: 14,
        ok: typeof pkg.description === 'string' && pkg.description.trim().length >= 20,
      },
      {
        label: 'license',
        weight: 14,
        ok:
          typeof pkg.license === 'string' &&
          pkg.license.trim().length > 0 &&
          !/^UNLICENSED$/i.test(pkg.license),
      },
      {
        label: 'repository or homepage',
        weight: 14,
        ok: Boolean(getRepository(pkg)),
      },
      {
        label: 'engines.node',
        weight: 10,
        ok: typeof pkg.engines?.node === 'string' && pkg.engines.node.trim().length > 0,
      },
      {
        label: 'files or .npmignore',
        weight: 10,
        ok:
          pkg.private === true ||
          (Array.isArray(pkg.files) && pkg.files.length > 0) ||
          context.files.includes('.npmignore'),
      },
      ...(binPaths.length > 0
        ? [
            {
              label: 'bin file',
              weight: 7,
              ok: binPaths.every((binPath) => context.files.includes(binPath)),
            },
          ]
        : []),
      {
        label: 'keywords',
        weight: 5,
        ok: Array.isArray(pkg.keywords) && pkg.keywords.length >= 3,
      },
      {
        label: 'author',
        weight: 5,
        ok:
          (typeof pkg.author === 'string' && pkg.author.trim().length > 0) ||
          (typeof pkg.author?.name === 'string' && pkg.author.name.trim().length > 0),
      },
      {
        label: 'main, exports or bin',
        weight: 5,
        ok: Boolean(pkg.main || pkg.exports || binPaths.length > 0),
      },
    ]

    let earned = 0
    let total = 0
    for (const requirement of requirements) {
      total += requirement.weight
      if (requirement.ok) earned += requirement.weight
      else missing.push(requirement.label)
    }

    if (binPaths.some((binPath) => !context.files.includes(binPath))) {
      for (const binPath of binPaths) {
        if (!context.files.includes(binPath)) {
          missing.push(`bin file not found: ${binPath}`)
        }
      }
    }

    const score = Math.round((earned / total) * 100) / 100
    return {
      score,
      summary:
        score === 1
          ? 'Package metadata is complete.'
          : `Package metadata is missing ${missing.length} required field${missing.length === 1 ? '' : 's'}.`,
      details: missing.map((item) => `Missing: ${item}.`),
      fix:
        score === 1
          ? null
          : 'Add the missing fields to package.json before publishing.',
    }
  },
}

function getRepository(pkg) {
  if (typeof pkg.repository === 'string' && pkg.repository.trim()) return true
  if (typeof pkg.repository?.url === 'string' && pkg.repository.url.trim()) {
    return true
  }
  if (typeof pkg.homepage === 'string' && pkg.homepage.trim()) return true
  if (typeof pkg.bugs === 'string' && pkg.bugs.trim()) return true
  if (typeof pkg.bugs?.url === 'string' && pkg.bugs.url.trim()) return true
  return false
}

function getBinPaths(bin) {
  if (typeof bin === 'string') return [normalisePath(bin)]
  if (!bin || typeof bin !== 'object' || Array.isArray(bin)) return []
  return Object.values(bin)
    .filter((value) => typeof value === 'string')
    .map(normalisePath)
}

function normalisePath(value) {
  return value.replace(/^\.\//, '')
}
