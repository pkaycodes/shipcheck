import { buildContext } from './context.js'
import { CHECKS } from './checks/index.js'
import { summarise } from './score.js'
import { VERSION } from './version.js'

/**
 * Audit a repository. Checks are independent; one throwing does not stop the
 * rest of the report.
 */
export async function auditRepo(input, { checks = CHECKS } = {}) {
  const started = performance.now()
  const context = await buildContext(input)
  const results = []

  for (const check of checks) {
    try {
      const result = await check.run(context)
      results.push({
        id: check.id,
        title: check.title,
        weight: check.weight,
        score: clamp(result.score ?? 0),
        skipped: result.skipped === true,
        summary: result.summary ?? '',
        details: Array.isArray(result.details) ? result.details : [],
        fix: result.fix ?? null,
      })
    } catch (error) {
      results.push({
        id: check.id,
        title: check.title,
        weight: check.weight,
        score: 0,
        skipped: false,
        summary: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
        details: [],
        fix: 'Report this as a bug with the repository that triggered it.',
      })
    }
  }

  const scored = summarise(results)
  return {
    tool: 'shipcheck',
    schemaVersion: 1,
    version: VERSION,
    root: context.root,
    files: context.files.length,
    durationMs: Math.round(performance.now() - started),
    ...scored,
  }
}

function clamp(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(1, Math.max(0, number))
}
