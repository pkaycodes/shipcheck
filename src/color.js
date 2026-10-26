const CODES = {
  bold: 1,
  dim: 2,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  gray: 90,
}

/**
 * Build a small set of styling helpers. When colour is disabled every helper
 * is the identity function, so the same report code works for pipes and JSON.
 */
export function createStyles(enabled) {
  const style = {}
  for (const [name, code] of Object.entries(CODES)) {
    style[name] = enabled
      ? (value) => `\u001b[${code}m${value}\u001b[0m`
      : (value) => String(value)
  }
  return style
}

/** Whether ANSI colour should be used for the given stream. */
export function supportsColor(stream = process.stdout) {
  if (Object.hasOwn(process.env, 'NO_COLOR')) return false
  if (Object.hasOwn(process.env, 'FORCE_COLOR')) {
    return process.env.FORCE_COLOR !== '0'
  }
  return Boolean(stream?.isTTY) && process.env.TERM !== 'dumb'
}
