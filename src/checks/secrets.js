import { scanSecrets } from '../secrets.js'

export const secretsCheck = {
  id: 'secrets',
  title: 'Secrets',
  weight: 15,
  async run(context) {
    const result = await scanSecrets(context)
    if (result.scannedFiles === 0) {
      return {
        score: 0,
        skipped: true,
        summary: 'No text files to scan.',
        details: [],
        fix: null,
      }
    }

    const errors = result.findings.filter(
      (finding) => finding.severity === 'error',
    )
    const warnings = result.findings.filter(
      (finding) => finding.severity === 'warning',
    )
    const all = [...errors, ...warnings]
    const details = all
      .slice(0, 5)
      .map(
        (finding) =>
          `${finding.file}:${finding.line} — ${finding.label} (${finding.preview})`,
      )
    if (all.length > 5) details.push(`…and ${all.length - 5} more.`)
    if (result.truncated) details.push('Scan stopped after 100 findings.')

    if (errors.length > 0) {
      return {
        score: 0,
        summary: `${all.length} potential secret${all.length === 1 ? '' : 's'} found.`,
        details,
        fix: 'Remove the secret, rotate it, and load it from an environment variable.',
      }
    }

    if (warnings.length > 0) {
      return {
        score: 0.5,
        summary: `${warnings.length} value${warnings.length === 1 ? '' : 's'} worth reviewing.`,
        details,
        fix: 'Review the flagged values; if they are real, rotate and remove them.',
      }
    }

    return {
      score: 1,
      summary: `No hard-coded secrets found in ${result.scannedFiles} files.`,
      details: [],
      fix: null,
    }
  },
}
