/**
 * A deliberately small .gitignore matcher. It supports the patterns Shipcheck
 * needs for hygiene checks: comments, negation, anchoring, ** and basenames.
 */
export function parseGitignore(content) {
  return String(content)
    .split(/\r?\n/)
    .map((line) => {
      let value = line.trim()
      if (!value || value.startsWith('#')) return null

      let negated = false
      if (value.startsWith('!')) {
        negated = true
        value = value.slice(1)
      } else if (value.startsWith('\\#') || value.startsWith('\\!')) {
        value = value.slice(1)
      }

      const directoryOnly = value.endsWith('/')
      if (directoryOnly) value = value.slice(0, -1)
      const anchored = value.startsWith('/')
      if (anchored) value = value.slice(1)
      if (!value) return null

      return {
        pattern: value,
        negated,
        directoryOnly,
        regex: globToRegExp(value, { anchored }),
      }
    })
    .filter(Boolean)
}

function globToRegExp(pattern, { anchored = false } = {}) {
  let source = ''
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        index += 1
        if (pattern[index + 1] === '/') {
          index += 1
          source += '(?:.*/)?'
        } else {
          source += '.*'
        }
      } else {
        source += '[^/]*'
      }
    } else if (character === '?') {
      source += '[^/]'
    } else if ('\\^$+.|(){}[]'.includes(character)) {
      source += `\\${character}`
    } else {
      source += character
    }
  }

  const prefix = anchored || pattern.includes('/') ? '^' : '(?:^|/)'
  return new RegExp(`${prefix}${source}(?:$|/)`, 'i')
}

/** Return true when the last matching rule ignores the given path. */
export function isIgnored(patterns, target) {
  const path = String(target).replace(/^\/+/, '')
  let ignored = false
  for (const entry of patterns) {
    if (entry.regex.test(path)) ignored = !entry.negated
  }
  return ignored
}
