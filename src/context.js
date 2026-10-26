import { stat } from 'node:fs/promises'
import path from 'node:path'
import {
  findRootFile,
  isCodeFile,
  isTestFile,
  listFiles,
  readText,
} from './files.js'
import { parseGitignore } from './ignore.js'

const README_NAMES = [
  'README.md',
  'README.markdown',
  'README.rst',
  'README.txt',
  'README',
]

const LICENSE_NAMES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'COPYING',
  'COPYING.md',
]

const LOCKFILE_NAMES = [
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'bun.lock',
]

const ENV_EXAMPLE_NAMES = [
  '.env.example',
  '.env.sample',
  '.env.template',
  '.env.dist',
]

const ENV_LOADING_PATTERN =
  /require\(\s*['"]dotenv|from\s+['"]dotenv|import\s+['"]dotenv|dotenv\/config|import\.meta\.env|os\.environ|os\.getenv|ENV\.fetch|ENV\[/

const CI_FILES = new Set([
  '.gitlab-ci.yml',
  '.travis.yml',
  'azure-pipelines.yml',
  'bitbucket-pipelines.yml',
  'appveyor.yml',
  'Jenkinsfile',
  '.circleci/config.yml',
  '.buildkite/pipeline.yml',
  '.drone.yml',
])

export async function buildContext(input) {
  const root = path.resolve(input)
  const info = await stat(root)
  if (!info.isDirectory()) throw new Error(`Not a directory: ${root}`)

  const files = await listFiles(root)
  const cache = new Map()

  async function read(relativePath, options = {}) {
    if (!relativePath) return null
    const key = `${relativePath}:${options.maxBytes ?? ''}`
    if (cache.has(key)) return cache.get(key)
    const value = await readText(root, relativePath, options)
    cache.set(key, value)
    return value
  }

  const readmeFile = findRootFile(files, README_NAMES)
  const licenseFile = findRootFile(files, LICENSE_NAMES)
  const gitignoreFile = findRootFile(files, ['.gitignore'])
  const packageFile = findRootFile(files, ['package.json'])
  const ciFiles = files.filter(isCiFile)
  const envExampleFile = findRootFile(files, ENV_EXAMPLE_NAMES)
  const envFiles = files.filter(
    (file) => !file.includes('/') && /^\.env(?:\.[^/]+)?$/.test(file),
  ).filter((file) => file !== envExampleFile)

  const [readmeContent, licenseContent, gitignoreContent, packageRaw] =
    await Promise.all([
      read(readmeFile, { maxBytes: 1024 * 1024 }),
      read(licenseFile, { maxBytes: 1024 * 1024 }),
      read(gitignoreFile),
      read(packageFile, { maxBytes: 1024 * 1024 }),
    ])

  let packageJson = null
  let packageError = null
  if (packageRaw !== null) {
    try {
      const parsed = JSON.parse(packageRaw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('package.json must contain a JSON object')
      }
      packageJson = parsed
    } catch (error) {
      packageError = error.message
    }
  } else if (packageFile) {
    packageError = 'Could not read package.json.'
  }

  const codeFiles = files.filter(isCodeFile)
  const envUsageFiles = await findEnvUsage(codeFiles, read)

  return {
    root,
    files,
    read,
    readmeFile,
    readmeContent,
    licenseFile,
    licenseContent,
    gitignoreFile,
    gitignore: gitignoreContent ? parseGitignore(gitignoreContent) : [],
    packageFile,
    packageJson,
    packageError,
    ciFiles,
    envExampleFile,
    envFiles,
    lockfiles: files.filter(
      (file) => !file.includes('/') && LOCKFILE_NAMES.includes(file),
    ),
    codeFiles,
    testFiles: files.filter(isTestFile),
    envUsageFiles,
  }
}

function isCiFile(file) {
  return (
    /^\.github\/workflows\/[^/]+\.ya?ml$/.test(file) || CI_FILES.has(file)
  )
}

async function findEnvUsage(files, read) {
  const found = []
  const candidates = files.slice(0, 400)
  for (const file of candidates) {
    if (!isCodeFile(file)) continue
    const content = await read(file, { maxBytes: 256 * 1024 })
    if (content && ENV_LOADING_PATTERN.test(content)) found.push(file)
    if (found.length >= 20) break
  }
  return found
}
