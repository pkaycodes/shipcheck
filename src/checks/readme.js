const EXPECTED = [
  {
    key: 'install',
    label: 'install or getting-started',
    aliases: [
      'install',
      'installation',
      'getting started',
      'quick start',
      'quickstart',
      'setup',
      'set up',
    ],
  },
  {
    key: 'usage',
    label: 'usage or examples',
    aliases: ['usage', 'example', 'examples', 'how to use'],
  },
  {
    key: 'tests',
    label: 'testing',
    aliases: ['test', 'tests', 'testing', 'development', 'contributing'],
  },
  {
    key: 'license',
    label: 'license',
    aliases: ['license', 'licence', 'licensing'],
  },
]

export const readmeCheck = {
  id: 'readme',
  title: 'README',
  weight: 15,
  run(context) {
    if (!context.readmeFile || context.readmeContent === null) {
      return {
        score: 0,
        summary: 'No README found.',
        details: ['A README is the front door of a repository.'],
        fix: 'Add a README.md with install, usage, testing and license sections.',
      }
    }

    const content = context.readmeContent
    const headings = extractHeadings(content)
    const present = EXPECTED.filter((section) =>
      headings.some((heading) =>
        section.aliases.some(
          (alias) => heading === alias || heading.startsWith(`${alias} `),
        ),
      ),
    )
    const missing = EXPECTED.filter((section) => !present.includes(section))

    let score = 0.35
    const details = []
    if (/^#\s+\S/m.test(content) || /^\S[^\n]*\n=+\s*$/m.test(content)) {
      score += 0.1
    } else {
      details.push('No top-level heading.')
    }

    if (content.trim().length >= 500) {
      score += 0.1
    } else {
      details.push('README is shorter than 500 characters.')
    }

    const weights = { install: 0.12, usage: 0.12, tests: 0.08, license: 0.06 }
    for (const section of present) score += weights[section.key]
    if (missing.length > 0) {
      details.push(
        `Missing sections: ${missing.map((section) => section.label).join(', ')}.`,
      )
    }

    if (/```|~~~|(?:^|\n) {4}\S/.test(content)) {
      score += 0.07
    } else {
      details.push('No code block or example command.')
    }

    const rounded = Math.min(1, Math.round(score * 100) / 100)
    return {
      score: rounded,
      summary:
        rounded === 1
          ? 'Install, usage, testing and license are documented.'
          : `README covers ${present.length} of 4 expected sections.`,
      details,
      fix:
        rounded === 1
          ? null
          : `Add the missing sections to ${context.readmeFile}.`,
    }
  },
}

function extractHeadings(content) {
  const lines = content.split(/\r?\n/)
  const headings = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (/^#{1,6}\s+/.test(line)) {
      headings.push(line.replace(/^#{1,6}\s+/, '').trim().toLowerCase())
    } else if (
      line &&
      lines[index + 1] &&
      /^[=-]{3,}\s*$/.test(lines[index + 1].trim())
    ) {
      headings.push(line.toLowerCase())
    }
  }
  return headings
}
