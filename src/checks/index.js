import { ciCheck } from './ci.js'
import { envCheck } from './env.js'
import { gitignoreCheck } from './gitignore.js'
import { licenseCheck } from './license.js'
import { lockfileCheck } from './lockfile.js'
import { packageCheck } from './package.js'
import { readmeCheck } from './readme.js'
import { secretsCheck } from './secrets.js'
import { testsCheck } from './tests.js'

export const CHECKS = [
  readmeCheck,
  licenseCheck,
  testsCheck,
  ciCheck,
  secretsCheck,
  gitignoreCheck,
  envCheck,
  packageCheck,
  lockfileCheck,
]
