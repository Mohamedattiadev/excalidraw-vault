#!/usr/bin/env node
// The dev-101 courses live in their own repo and are copied in here. The copy is
// meant to be word for word: only the H1 moves into frontmatter and the relative
// links become wikilinks. Nothing else may differ.
//
// That property is invisible. It held the day the port ran and then quietly broke
// when dev-101 replaced a real email address with an example one, so the vault
// went on serving the real address on a public page. Nothing failed, because
// nothing was looking. This looks.
//
// Usage:
//   node scripts/check-parity.mjs            # report drift, exit 1 if any
//   node scripts/check-parity.mjs --quiet    # only print when something is wrong
//   DEV101=/path/to/dev-101 node scripts/check-parity.mjs
//
// Exits 0 and says so if dev-101 is not on this machine, so CI does not fail over
// a repo it was never given.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const DEV101 = path.resolve(process.env.DEV101 ?? '../dev-101')
const COURSES = path.resolve('content/02-Personal/11-Dev-101')
const QUIET = process.argv.includes('--quiet')

const red = (s) => `\x1b[31m${s}\x1b[0m`
const green = (s) => `\x1b[32m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`

// Strip exactly what the port is allowed to change, and nothing else. What is left
// has to match character for character, so a changed word or address cannot hide
// behind the link rewriting.
function normalise(text) {
  return text
    .replace(/^---\n[\s\S]*?\n---\n/, '') // frontmatter the port adds
    .replace(/^# .*\n/, '') // H1 the port moves into the title
    .replace(/\[\[[^\]|]+\\\|([^\]]*)\]\]/g, '<link>$1') // wikilink -> its label
    .replace(/\[([^\]\n]*)\]\((?!http)[^)\s]+\)/g, '<link>$1') // relative md link -> its label
}

// A chapter is a numbered folder holding a README in the course repo.
function chaptersOf(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((n) => /^\d\d-/.test(n) && statSync(path.join(dir, n)).isDirectory())
    .sort()
}

function pairsFor(course) {
  const src = path.join(DEV101, course)
  const pairs = [['CHEATSHEET.md', 'CHEATSHEET.md']]
  for (const ch of chaptersOf(src)) {
    pairs.push([`${ch}/README.md`, `${ch}/index.md`])
    pairs.push([`${ch}/solutions.md`, `${ch}/solutions.md`])
  }
  return pairs
}

// First differing line, with enough context to recognise it without opening an editor.
function firstDifference(a, b) {
  const la = a.split('\n')
  const lb = b.split('\n')
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      return {
        line: i + 1,
        src: la[i] ?? '(end of file)',
        vault: lb[i] ?? '(end of file)',
        more: Math.abs(la.length - lb.length),
      }
    }
  }
  return null
}

if (!existsSync(DEV101)) {
  console.log(dim(`dev-101 not found at ${DEV101}, nothing to compare. Set DEV101= to point at it.`))
  process.exit(0)
}

const courses = existsSync(COURSES)
  ? readdirSync(COURSES).filter((n) => existsSync(path.join(DEV101, n)))
  : []

let checked = 0
const drift = []
const missing = []

for (const course of courses) {
  for (const [srcRel, dstRel] of pairsFor(course)) {
    const src = path.join(DEV101, course, srcRel)
    const dst = path.join(COURSES, course, dstRel)
    if (!existsSync(src)) continue
    if (!existsSync(dst)) {
      missing.push(`${course}/${srcRel} is in dev-101 but was never ported here`)
      continue
    }
    checked++
    const a = normalise(readFileSync(src, 'utf8'))
    const b = normalise(readFileSync(dst, 'utf8'))
    if (a !== b) drift.push({ course, srcRel, dstRel, ...firstDifference(a, b) })
  }
}

if (!drift.length && !missing.length) {
  if (!QUIET) {
    console.log(green(`parity ok`) + dim(` — ${checked} files across ${courses.join(', ')} match dev-101`))
  }
  process.exit(0)
}

console.log(red(bold('\nthe vault and dev-101 have drifted\n')))
for (const d of drift) {
  console.log(`  ${bold(d.course + '/' + d.dstRel)}  ${dim('line ' + d.line)}`)
  console.log(`    ${dim('dev-101')}  ${d.src.trim().slice(0, 120)}`)
  console.log(`    ${dim('vault  ')}  ${d.vault.trim().slice(0, 120)}`)
  if (d.more) console.log(dim(`    (and ${d.more} more line(s) of length difference)`))
  console.log()
}
for (const m of missing) console.log(`  ${red('missing')}  ${m}`)

console.log(
  dim(
    `\n${drift.length} file(s) differ out of ${checked} checked.\n` +
      `Whichever side is right, make the other match it. If dev-101 is newer, re-port;\n` +
      `the vault copy is not supposed to say anything dev-101 does not.\n`,
  ),
)
process.exit(1)
