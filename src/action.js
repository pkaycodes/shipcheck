import { appendFileSync } from 'node:fs'
import { auditRepo } from './audit.js'
import { renderReport } from './report.js'

try {
  const path = process.env.INPUT_PATH || '.'
  const failUnder = Number(process.env.INPUT_FAIL_UNDER || 70)
  const strict = /^(1|true|yes)$/i.test(process.env.INPUT_STRICT || 'false')

  if (!Number.isFinite(failUnder) || failUnder < 0 || failUnder > 100) {
    throw new Error('fail-under must be a number between 0 and 100')
  }

  const result = await auditRepo(path)
  const report = renderReport(result, {
    color: !Object.hasOwn(process.env, 'NO_COLOR'),
  })

  console.log('::group::Shipcheck report')
  console.log(report)
  console.log('::endgroup::')

  setOutput('score', result.score)
  setOutput('grade', result.grade)
  setOutput('passed', result.summary.passed)
  setOutput('warnings', result.summary.warnings)
  setOutput('failed', result.summary.failed)
  setOutput('skipped', result.summary.skipped)

  for (const check of result.checks) {
    if (check.status !== 'warn' && check.status !== 'fail') continue
    const level = check.status === 'fail' ? 'error' : 'warning'
    const message = [check.summary, check.fix].filter(Boolean).join(' ')
    console.log(
      `::${level} title=Shipcheck: ${escapeData(check.title)}::${escapeData(message)}`,
    )
  }

  if (result.score < failUnder) {
    console.log(
      `::error title=Shipcheck::Score ${result.score} is below the required ${failUnder}.`,
    )
    process.exitCode = 1
  } else if (
    strict &&
    (result.summary.warnings > 0 || result.summary.failed > 0)
  ) {
    console.log('::error title=Shipcheck::--strict found warnings or failures.')
    process.exitCode = 1
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.log(`::error title=Shipcheck::${escapeData(message)}`)
  process.exitCode = 2
}

function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
}

function escapeData(value) {
  return String(value)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
}
