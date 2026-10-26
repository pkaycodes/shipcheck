#!/usr/bin/env node

import { main } from '../src/cli.js'

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`shipcheck: ${message}`)
    process.exitCode = 2
  })
