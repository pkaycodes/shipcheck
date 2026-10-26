import path from 'node:path'
import { createStyles } from './color.js'

const ICONS = {
  pass: '✓',
  warn: '!',
  fail: '✗',
  skip: '–',
}

export function renderReport(
  result,
  { color = false, verbose = false, cwd = process.cwd() } = {},
) {
  const s = createStyles(color)
  const shownRoot = path.relative(cwd, result.root) || '.'
  const lines = []

  lines.push(
    `${s.bold('shipcheck')} ${s.dim(`v${result.version}`)} ${s.dim('·')} ${shownRoot}`,
  )
  lines.push(s.dim(`${result.checks.length} checks · ${result.files} files`))
  lines.push('')

  const gradeColour =
    result.grade === 'A'
      ? s.green
      : result.grade === 'B'
        ? s.cyan
        : result.grade === 'F'
          ? s.red
          : s.yellow
  lines.push(
    `  Score  ${s.bold(`${result.score}/100`)}   ${s.dim('Grade')} ${gradeColour(s.bold(result.grade))}`,
  )
  lines.push(`  ${s.dim(joinCounts(result.summary))}`)
  lines.push('')

  const titleWidth = Math.max(...result.checks.map((check) => check.title.length), 5)

  for (const check of result.checks) {
    const colour =
      check.status === 'pass'
        ? s.green
        : check.status === 'warn'
          ? s.yellow
          : check.status === 'fail'
            ? s.red
            : s.dim
    const icon = colour(ICONS[check.status])
    const title = check.title.padEnd(titleWidth)
    const points =
      check.status === 'skip'
        ? '—'.padStart(7)
        : `${check.points.toFixed(1)}/${check.weight}`.padStart(7)
    lines.push(`  ${icon} ${title}  ${s.dim(points)}  ${check.summary}`)

    if (verbose || check.status === 'warn' || check.status === 'fail') {
      for (const detail of check.details) {
        wrap(detail, 84).forEach((line, index) => {
          lines.push(`      ${index === 0 ? s.dim('•') : ' '} ${line}`)
        })
      }
      if (check.fix) {
        wrap(check.fix, 82).forEach((line, index) => {
          lines.push(`      ${index === 0 ? s.cyan('→') : ' '} ${line}`)
        })
      }
    }
  }

  const actionable = result.checks.filter(
    (check) =>
      (check.status === 'warn' || check.status === 'fail') && check.fix,
  )
  const fixes = [...new Set(actionable.map((check) => check.fix))]

  lines.push('')
  if (fixes.length === 0 && result.summary.warnings === 0 && result.summary.failed === 0) {
    lines.push(`  ${s.green(s.bold('Ready to ship.'))}`)
  } else if (fixes.length > 0) {
    lines.push(`  ${s.bold('Next steps')}`)
    fixes.slice(0, 3).forEach((fix, index) => {
      const wrapped = wrap(fix, 82)
      lines.push(`  ${index + 1}. ${wrapped[0]}`)
      for (const line of wrapped.slice(1)) lines.push(`     ${line}`)
    })
    if (fixes.length > 3) {
      lines.push(`  ${s.dim(`…and ${fixes.length - 3} more in the check details.`)}`)
    }
  } else {
    lines.push(`  ${s.yellow('Review the warnings above before shipping.')}`)
  }

  lines.push('')
  lines.push(s.dim('Run with --json for machine-readable output.'))
  return lines.join('\n')
}

export function renderJson(result) {
  return JSON.stringify(
    {
      tool: result.tool,
      schemaVersion: result.schemaVersion,
      version: result.version,
      root: result.root,
      score: result.score,
      grade: result.grade,
      summary: result.summary,
      files: result.files,
      durationMs: result.durationMs,
      checks: result.checks.map((check) => ({
        id: check.id,
        title: check.title,
        weight: check.weight,
        score: check.score,
        points: check.points,
        status: check.status,
        summary: check.summary,
        details: check.details,
        fix: check.fix,
      })),
    },
    null,
    2,
  )
}

function joinCounts(summary) {
  const parts = [
    `${summary.passed} passed`,
    `${summary.warnings} warning${summary.warnings === 1 ? '' : 's'}`,
    `${summary.failed} failed`,
  ]
  if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`)
  return parts.join(' · ')
}

function wrap(text, width) {
  const words = String(text).split(/\s+/)
  const lines = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
    } else if (current.length + word.length + 1 <= width) {
      current += ` ${word}`
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}
