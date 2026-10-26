import { isScannable } from './files.js'

const PATTERNS = [
  {
    id: 'private-key',
    label: 'Private key block',
    severity: 'error',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
  },
  {
    id: 'aws-access-key',
    label: 'AWS access key ID',
    severity: 'error',
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    id: 'github-token',
    label: 'GitHub token',
    severity: 'error',
    regex: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/,
  },
  {
    id: 'gitlab-token',
    label: 'GitLab token',
    severity: 'error',
    regex: /\bglpat-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    id: 'npm-token',
    label: 'npm access token',
    severity: 'error',
    regex: /\bnpm_[A-Za-z0-9]{36}\b/,
  },
  {
    id: 'stripe-secret',
    label: 'Stripe live secret key',
    severity: 'error',
    regex: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/,
  },
  {
    id: 'slack-token',
    label: 'Slack token',
    severity: 'warning',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  },
  {
    id: 'google-api-key',
    label: 'Google API key',
    severity: 'warning',
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    id: 'openai-key',
    label: 'OpenAI or Anthropic API key',
    severity: 'warning',
    regex: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}\b/,
  },
  {
    id: 'aws-secret-key',
    label: 'AWS secret access key',
    severity: 'warning',
    regex: /aws_secret_access_key\s*[:=]\s*['"]?[A-Za-z0-9/+=]{40}/i,
  },
  {
    id: 'generic-secret',
    label: 'Possible hard-coded secret',
    severity: 'warning',
    regex:
      /(?:api[_-]?key|client[_-]?secret|secret|token|password|passwd)\s*[:=]\s*['"][A-Za-z0-9_\-./+=]{16,}['"]/i,
  },
]

const PLACEHOLDER =
  /example|placeholder|dummy|sample|fake|mock|redacted|your[_-]|xxxx|\.\.\.|process\.env|import\.meta\.env|os\.environ|os\.getenv|<[^>]+>|\$\{|\{\{/i

const MAX_FILES = 600
const MAX_FINDINGS = 100

export async function scanSecrets(context) {
  const candidates = context.files.filter(isScannable).slice(0, MAX_FILES)
  const findings = []
  let scannedFiles = 0

  for (const file of candidates) {
    const content = await context.read(file)
    if (content === null) continue
    scannedFiles += 1

    const lines = content.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      if (!line.trim() || isPlaceholder(line)) continue
      for (const pattern of PATTERNS) {
        const match = pattern.regex.exec(line)
        if (!match) continue
        findings.push({
          file,
          line: index + 1,
          column: match.index + 1,
          id: pattern.id,
          label: pattern.label,
          severity: pattern.severity,
          preview: redact(match[0]),
        })
        if (findings.length >= MAX_FINDINGS) {
          return { findings, scannedFiles, truncated: true }
        }
      }
    }
  }

  return { findings, scannedFiles, truncated: false }
}

function isPlaceholder(line) {
  return PLACEHOLDER.test(line)
}

function redact(value) {
  if (value.startsWith('-----BEGIN')) return '-----BEGIN … PRIVATE KEY-----'
  if (value.length <= 6) return '…'
  return `${value.slice(0, 4)}…`
}
