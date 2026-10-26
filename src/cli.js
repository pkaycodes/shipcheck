import path from 'node:path'
import { auditRepo } from './audit.js'
import { CHECKS } from './checks/index.js'
import { supportsColor } from './color.js'
import { renderJson, renderReport } from './report.js'
import { VERSION } from './version.js'

export class UsageError extends Error {}

export function parseArgs(argv) {
  const options = {
    path: '.',
    json: false,
    failUnder: 0,
    strict: false,
    verbose: false,
    noColor: false,
    help: false,
    version: false,
    listChecks: false,
  }
  let pathSet = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--') {
      const rest = argv.slice(index + 1)
      if (rest.length > 1) {
        throw new UsageError('Only one repository path can be audited at a time.')
      }
      if (rest.length === 1) {
        if (pathSet) {
          throw new UsageError('Only one repository path can be audited at a time.')
        }
        options.path = rest[0]
        pathSet = true
      }
      break
    }

    if (arg === '--json') {
      options.json = true
    } else if (arg === '--strict') {
      options.strict = true
    } else if (arg === '--verbose') {
      options.verbose = true
    } else if (arg === '--no-color') {
      options.noColor = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--version' || arg === '-v') {
      options.version = true
    } else if (arg === '--list-checks') {
      options.listChecks = true
    } else if (arg === '--fail-under' || arg.startsWith('--fail-under=')) {
      const value =
        arg === '--fail-under' ? argv[(index += 1)] : arg.slice('--fail-under='.length)
      options.failUnder = parseScore(value)
    } else if (arg.startsWith('-')) {
      throw new UsageError(`Unknown option: ${arg}`)
    } else if (pathSet) {
      throw new UsageError('Only one repository path can be audited at a time.')
    } else {
      options.path = arg
      pathSet = true
    }
  }

  return options
}

export async function runCli(
  argv,
  { stdout = process.stdout, stderr = process.stderr, cwd = process.cwd() } = {},
) {
  let options
  try {
    options = parseArgs(argv)
  } catch (error) {
    stderr.write(`shipcheck: ${error.message}\n\nRun 'shipcheck --help' for usage.\n`)
    return 2
  }

  if (options.help) {
    stdout.write(`${helpText()}\n`)
    return 0
  }
  if (options.version) {
    stdout.write(`${VERSION}\n`)
    return 0
  }
  if (options.listChecks) {
    stdout.write(`${listChecks()}\n`)
    return 0
  }

  try {
    const result = await auditRepo(path.resolve(cwd, options.path))
    const output = options.json
      ? renderJson(result)
      : renderReport(result, {
          color: !options.noColor && supportsColor(stdout),
          verbose: options.verbose,
          cwd,
        })
    stdout.write(`${output}\n`)

    if (result.score < options.failUnder) {
      stderr.write(
        `\nshipcheck: score ${result.score} is below --fail-under ${options.failUnder}.\n`,
      )
      return 1
    }
    if (
      options.strict &&
      (result.summary.warnings > 0 || result.summary.failed > 0)
    ) {
      stderr.write('\nshipcheck: --strict found warnings or failures.\n')
      return 1
    }
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    stderr.write(`shipcheck: ${message}\n`)
    return 2
  }
}

export async function main() {
  return runCli(process.argv.slice(2))
}

function parseScore(value) {
  if (value === undefined || value === '') {
    throw new UsageError('--fail-under requires a score between 0 and 100.')
  }
  const score = Number(value)
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new UsageError('--fail-under must be a number between 0 and 100.')
  }
  return score
}

function listChecks() {
  const width = Math.max(...CHECKS.map((check) => check.id.length))
  return CHECKS.map(
    (check) =>
      `${check.id.padEnd(width)}  ${String(check.weight).padStart(3)}  ${check.title}`,
  ).join('\n')
}

function helpText() {
  return `shipcheck v${VERSION} — audit a repository's shipping readiness

Usage
  shipcheck [path] [options]

Options
  --json                Print a machine-readable JSON report
  --fail-under <score>  Exit 1 when the score is below <score> (0–100)
  --strict              Exit 1 on any warning or failure
  --verbose             Show details for every check
  --no-color            Disable colour
  --list-checks         List check ids and weights
  -h, --help            Show this help
  -v, --version         Print the version

Examples
  shipcheck .
  shipcheck ../my-app --fail-under 80
  shipcheck . --json > report.json

Exit codes
  0  audit completed and met the threshold
  1  score below --fail-under, or --strict found warnings/failures
  2  invalid usage or an unreadable path`
}
