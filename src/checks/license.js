const LICENSES = [
  {
    id: 'AGPL-3.0',
    test: /GNU AFFERO GENERAL PUBLIC LICENSE[\s\S]*Version 3/i,
  },
  {
    id: 'LGPL-3.0',
    test: /GNU LESSER GENERAL PUBLIC LICENSE[\s\S]*Version 3/i,
  },
  {
    id: 'GPL-3.0',
    test: /GNU GENERAL PUBLIC LICENSE[\s\S]*Version 3/i,
  },
  {
    id: 'GPL-2.0',
    test: /GNU GENERAL PUBLIC LICENSE[\s\S]*Version 2/i,
  },
  {
    id: 'Apache-2.0',
    test: /Apache License[\s\S]*Version 2\.0/i,
  },
  {
    id: 'MPL-2.0',
    test: /Mozilla Public License[\s\S]*Version 2\.0/i,
  },
  {
    id: 'BSD-3-Clause',
    test: /BSD 3-Clause|Neither the name of/i,
  },
  {
    id: 'BSD-2-Clause',
    test: /BSD 2-Clause|Redistribution and use in source and binary forms/i,
  },
  {
    id: 'ISC',
    test: /ISC License|Permission to use, copy, modify, and\/or distribute/i,
  },
  {
    id: 'MIT',
    test: /MIT License|Permission is hereby granted, free of charge/i,
  },
  {
    id: 'Unlicense',
    test: /This is free and unencumbered software/i,
  },
  {
    id: 'CC0-1.0',
    test: /CC0 1\.0|Creative Commons Zero/i,
  },
]

export const licenseCheck = {
  id: 'license',
  title: 'License',
  weight: 12,
  run(context) {
    const packageLicense = getPackageLicense(context.packageJson)
    const content = context.licenseContent

    if (!context.licenseFile || content === null) {
      if (packageLicense) {
        return {
          score: 0.4,
          summary: `No LICENSE file; package.json declares ${packageLicense}.`,
          details: ['A package.json declaration is not a license text.'],
          fix: 'Add a LICENSE file with the full license text.',
        }
      }
      return {
        score: 0,
        summary: 'No license found.',
        details: ['Without a license, others cannot safely reuse the code.'],
        fix: 'Add a LICENSE file (MIT is a good default).',
      }
    }

    if (content.trim().length < 50) {
      return {
        score: 0,
        summary: 'The LICENSE file is empty.',
        fix: 'Write the full license text into the LICENSE file.',
      }
    }

    const detected = LICENSES.find((license) => license.test.test(content))
    if (!detected) {
      return {
        score: 0.6,
        summary: 'LICENSE found, but the license could not be identified.',
        details: ['Use a standard, recognisable license such as MIT or Apache-2.0.'],
        fix: 'Replace the LICENSE file with a standard license text.',
      }
    }

    if (context.packageFile && !packageLicense) {
      return {
        score: 0.9,
        summary: `${detected.id} license detected, but package.json has no license field.`,
        fix: `Set "license": "${detected.id}" in package.json.`,
      }
    }

    if (packageLicense && !sameLicense(packageLicense, detected.id)) {
      return {
        score: 0.8,
        summary: `LICENSE is ${detected.id}, but package.json declares ${packageLicense}.`,
        fix: 'Make the package.json license field match the LICENSE file.',
      }
    }

    return {
      score: 1,
      summary: `${detected.id} license detected.`,
      details: [],
      fix: null,
    }
  },
}

function getPackageLicense(packageJson) {
  const value = packageJson?.license
  const license = typeof value === 'string' ? value : value?.type
  if (!license || /^UNLICENSED$/i.test(license)) return null
  return license.trim()
}

function sameLicense(left, right) {
  const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  return normalize(left) === normalize(right)
}
