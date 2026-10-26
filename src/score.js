export function gradeFor(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export function summarise(checks) {
  const active = checks.filter((check) => !check.skipped)
  const totalWeight = active.reduce((total, check) => total + check.weight, 0)
  const earned = active.reduce(
    (total, check) => total + check.weight * check.score,
    0,
  )
  const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0

  const detailed = checks.map((check) => {
    const status = check.skipped
      ? 'skip'
      : check.score >= 0.999
        ? 'pass'
        : check.score <= 0
          ? 'fail'
          : 'warn'
    return {
      ...check,
      points: check.skipped ? 0 : round1(check.weight * check.score),
      status,
    }
  })

  return {
    score,
    grade: gradeFor(score),
    checks: detailed,
    summary: {
      passed: detailed.filter((check) => check.status === 'pass').length,
      warnings: detailed.filter((check) => check.status === 'warn').length,
      failed: detailed.filter((check) => check.status === 'fail').length,
      skipped: detailed.filter((check) => check.status === 'skip').length,
    },
    totalWeight,
    earnedWeight: round1(earned),
  }
}

function round1(value) {
  return Math.round(value * 10) / 10
}
