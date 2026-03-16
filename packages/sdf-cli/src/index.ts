#!/usr/bin/env node
// ─── @etapsky/sdf-cli ─────────────────────────────────────────────────────────
// SDF command-line tool
//
// Commands:
//   sdf inspect  <file.sdf>                        Full inspection report
//   sdf validate <file.sdf>                        Validate only (CI-friendly)
//   sdf convert  --data <f> --schema <f> --issuer <s> --out <f>
//
// Flags:
//   --quiet   (-q)  Suppress output, exit code only
//   --version (-v)  Print version
//   --help    (-h)  Print help

import { inspect }  from './commands/inspect.js'
import { validate } from './commands/validate.js'
import { convert }  from './commands/convert.js'
import { print, blank, clr, divider } from './ui/print.js'

const VERSION = '0.1.0'

// ─── Parse args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

const flags = {
  quiet:   args.includes('--quiet')   || args.includes('-q'),
  version: args.includes('--version') || args.includes('-v'),
  help:    args.includes('--help')    || args.includes('-h'),
}

// Remove flags from positional args
const positional = args.filter(a => !a.startsWith('-'))
const [command, ...rest] = positional

// ─── --version ────────────────────────────────────────────────────────────────

if (flags.version) {
  print(`@etapsky/sdf-cli ${VERSION}`)
  process.exit(0)
}

// ─── --help / no command ──────────────────────────────────────────────────────

if (flags.help || !command) {
  blank()
  print(`  ${clr.bold}${clr.white}SDF${clr.reset}${clr.gray} — Smart Document Format CLI${clr.reset}  ${clr.dim}v${VERSION}${clr.reset}`)
  divider()
  blank()
  print(`  ${clr.white}Usage${clr.reset}`)
  blank()
  print(`  ${clr.cyan}sdf inspect${clr.reset}  ${clr.gray}<file.sdf>${clr.reset}`)
  print(`  ${clr.gray}             Full inspection report — meta, schema, data, layers${clr.reset}`)
  blank()
  print(`  ${clr.cyan}sdf validate${clr.reset} ${clr.gray}<file.sdf>${clr.reset}`)
  print(`  ${clr.gray}             Validate structure, meta, and data against schema${clr.reset}`)
  print(`  ${clr.gray}             Exit 0 = valid · Exit 1 = invalid (CI-friendly)${clr.reset}`)
  blank()
  print(`  ${clr.cyan}sdf convert${clr.reset}  ${clr.gray}--data <f> --schema <f> --issuer <s> --out <f>${clr.reset}`)
  print(`  ${clr.gray}             Convert JSON data + schema into a .sdf archive${clr.reset}`)
  blank()
  print(`  ${clr.white}Flags${clr.reset}`)
  blank()
  print(`  ${clr.gray}--quiet    -q   Suppress output (exit code only)${clr.reset}`)
  print(`  ${clr.gray}--version  -v   Print version${clr.reset}`)
  print(`  ${clr.gray}--help     -h   Print this help${clr.reset}`)
  blank()
  print(`  ${clr.white}Examples${clr.reset}`)
  blank()
  print(`  ${clr.dim}sdf inspect invoice.sdf${clr.reset}`)
  print(`  ${clr.dim}sdf validate invoice.sdf --quiet && echo "ok"${clr.reset}`)
  print(`  ${clr.dim}sdf convert --data invoice.json --schema invoice.schema.json \\${clr.reset}`)
  print(`  ${clr.dim}            --issuer "Acme Corp" --out invoice.sdf${clr.reset}`)
  blank()
  divider()
  blank()
  process.exit(flags.help ? 0 : 1)
}

// ─── Route commands ───────────────────────────────────────────────────────────

switch (command) {

  // ── inspect ────────────────────────────────────────────────────────────────
  case 'inspect': {
    const file = rest[0]
    if (!file) {
      print(`  ${clr.red}✗${clr.reset}  Usage: sdf inspect <file.sdf>`)
      process.exit(1)
    }
    await inspect(file)
    break
  }

  // ── validate ───────────────────────────────────────────────────────────────
  case 'validate': {
    const file = rest[0]
    if (!file) {
      print(`  ${clr.red}✗${clr.reset}  Usage: sdf validate <file.sdf>`)
      process.exit(1)
    }
    await validate(file, { quiet: flags.quiet })
    break
  }

  // ── convert ────────────────────────────────────────────────────────────────
  case 'convert': {
    const getArg = (flag: string) => {
      const i = args.indexOf(flag)
      return i !== -1 ? args[i + 1] : undefined
    }

    const dataPath   = getArg('--data')
    const schemaPath = getArg('--schema')
    const issuer     = getArg('--issuer')
    const out        = getArg('--out')

    if (!dataPath || !schemaPath || !issuer || !out) {
      print(`  ${clr.red}✗${clr.reset}  Usage: sdf convert --data <f> --schema <f> --issuer <s> --out <f>`)
      blank()
      print(`  ${clr.gray}Optional: --issuer-id --document-type --recipient --recipient-id --schema-id${clr.reset}`)
      process.exit(1)
    }

    await convert({
      data:         dataPath,
      schema:       schemaPath,
      issuer,
      issuerId:     getArg('--issuer-id'),
      documentType: getArg('--document-type'),
      recipient:    getArg('--recipient'),
      recipientId:  getArg('--recipient-id'),
      schemaId:     getArg('--schema-id'),
      out,
    })
    break
  }

  // ── unknown ────────────────────────────────────────────────────────────────
  default: {
    print(`  ${clr.red}✗${clr.reset}  Unknown command: ${clr.cyan}${command}${clr.reset}`)
    print(`  ${clr.gray}Run ${clr.white}sdf --help${clr.gray} for usage${clr.reset}`)
    blank()
    process.exit(1)
  }
}