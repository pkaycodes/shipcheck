import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

/** Directories that never contain useful source or documentation. */
export const SKIP_DIRS = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  'vendor',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.cache',
  '.parcel-cache',
  '.turbo',
  'target',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.venv',
  'venv',
  'Pods',
  'DerivedData',
])

const BINARY_EXTENSIONS =
  /\.(?:png|jpe?g|gif|webp|ico|icns|pdf|zip|gz|tgz|bz2|xz|7z|rar|tar|woff2?|ttf|otf|eot|mp3|mp4|webm|mov|avi|mkv|wav|ogg|flac|so|dylib|dll|exe|bin|wasm|class|jar|pyc|o|a|sqlite|db|svg)$/i

const LOCKFILES = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'bun.lock',
])

const CODE_EXTENSIONS =
  /\.(?:[cm]?[jt]sx?|py|rb|go|rs|java|kt|kts|cs|php|swift|c|cc|cpp|h|hpp|sh|bash|zsh|fish|scala|clj|cljs|ex|exs|erl|hs|lua|r|vue|svelte|astro|dart)$/i

const MAX_READ_BYTES = 512 * 1024
const MAX_FILES = 10_000

/** Recursively list files as POSIX paths relative to the repository root. */
export async function listFiles(root, { maxFiles = MAX_FILES } = {}) {
  const files = []
  const queue = ['']

  while (queue.length > 0 && files.length < maxFiles) {
    const relativeDir = queue.shift()
    const absoluteDir = path.join(root, relativeDir)
    let entries
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true })
    } catch {
      continue
    }

    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      if (files.length >= maxFiles) break
      if (entry.isSymbolicLink()) continue
      const relativePath = relativeDir
        ? `${relativeDir}/${entry.name}`
        : entry.name

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) queue.push(relativePath)
      } else if (entry.isFile()) {
        files.push(relativePath)
      }
    }
  }

  return files
}

/**
 * Read a UTF-8 text file, returning null for binaries and oversized files.
 * Used by the secret scanner so it never has to guess at file types.
 */
export async function readText(
  root,
  relativePath,
  { maxBytes = MAX_READ_BYTES } = {},
) {
  try {
    const info = await stat(path.join(root, relativePath))
    if (!info.isFile() || info.size > maxBytes) return null
    const buffer = await readFile(path.join(root, relativePath))
    if (buffer.includes(0)) return null
    return buffer.toString('utf8').replace(/^\uFEFF/, '')
  } catch {
    return null
  }
}

/** Files that are worth scanning for hard-coded credentials. */
export function isScannable(relativePath) {
  const basename = path.posix.basename(relativePath)
  if (LOCKFILES.has(basename)) return false
  if (/\.min\.(?:js|css)$/i.test(relativePath)) return false
  if (/\.(?:map|snap)$/i.test(relativePath)) return false
  return !BINARY_EXTENSIONS.test(relativePath)
}

export function isCodeFile(relativePath) {
  return CODE_EXTENSIONS.test(relativePath)
}

export function isTestFile(relativePath) {
  return (
    /(^|\/)(?:tests?|__tests__|spec)\//i.test(relativePath) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(relativePath) ||
    /(^|\/)test_[^/]+\.py$/i.test(relativePath) ||
    /_test\.py$/i.test(relativePath) ||
    /_test\.go$/i.test(relativePath) ||
    /(^|\/)[^/]*(?:Tests?|IT)\.(?:java|kt|cs)$/i.test(relativePath) ||
    /\.test\.rs$/i.test(relativePath)
  )
}

/** Find one of several names at the repository root, case-insensitively. */
export function findRootFile(files, candidates) {
  const rootFiles = files.filter((file) => !file.includes('/'))
  const byLowercase = new Map(rootFiles.map((file) => [file.toLowerCase(), file]))
  for (const candidate of candidates) {
    const match = byLowercase.get(candidate.toLowerCase())
    if (match) return match
  }
  return null
}

export function basename(relativePath) {
  return path.posix.basename(relativePath)
}
