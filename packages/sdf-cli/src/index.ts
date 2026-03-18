#!/usr/bin/env node
// ─── @etapsky/sdf-cli ─────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// SDF command-line interface — entry point and command dispatcher.
// Parses argv, resolves the command, and delegates to the corresponding
// command module in ./commands/. All async commands run at the top level
// via Node.js top-level await (ESM).
//
// Commands:
//   sdf inspect  <file.sdf>                             Full inspection report
//   sdf validate <file.sdf>                             Structural + schema validation
//   sdf convert  --data <f> --schema <f> --issuer <s> --out <f>
//   sdf wrap     <file.pdf> --issuer <s> --out <f>      Wrap PDF into .sdf
//   sdf keygen   --algorithm ECDSA --out <base>         Generate signing key pair
//   sdf sign     <file.sdf> --key <private.b64> --out <f>
//   sdf verify   <file.sdf> --key <public.b64>          Verify signature
//   sdf schema   list | versions | diff | validate       Schema registry ops
//
// Flags:
//   --quiet        (-q)  Suppress output, exit code only
//   --version      (-v)  Print version
//   --help         (-h)  Print help
//   --include-pdf        Include visual.pdf in signed content (sign only)

import { inspect }  from './commands/inspect.js'
import { validate } from './commands/validate.js'
import { convert }  from './commands/convert.js'
import { wrap }     from './commands/wrap.js'
import { sign }     from './commands/sign.js'
import { verify }   from './commands/verify.js'
import { keygen }   from './commands/keygen.js'
import { schemaList, schemaVersions, schemaDiff, schemaValidate } from './commands/schema.js'
import { print, blank, clr, divider } from './ui/print.js'
 
const VERSION = '0.3.0'
 
const args = process.argv.slice(2)
 
const flags = {
  quiet:   args.includes('--quiet')   || args.includes('-q'),
  version: args.includes('--version') || args.includes('-v'),
  help:    args.includes('--help')    || args.includes('-h'),
}
 
const positional = args.filter(a => !a.startsWith('-'))
const [command, subcommand, ...rest] = positional
 
if (flags.version) {
  print(`@etapsky/sdf-cli ${VERSION}`)
  process.exit(0)
}
 
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
  print(`  ${clr.cyan}sdf wrap${clr.reset}     ${clr.gray}<file.pdf> --issuer <s> --out <f>${clr.reset}`)
  print(`  ${clr.gray}             Wrap an existing PDF into a .sdf container${clr.reset}`)
  blank()
  print(`  ${clr.cyan}sdf keygen${clr.reset}   ${clr.gray}--algorithm ECDSA --out <base>${clr.reset}`)
  print(`  ${clr.gray}             Generate a signing key pair (ECDSA or RSA)${clr.reset}`)
  blank()
  print(`  ${clr.cyan}sdf sign${clr.reset}     ${clr.gray}<file.sdf> --key <private.b64> --out <signed.sdf>${clr.reset}`)
  print(`  ${clr.gray}             Sign an SDF archive with a private key${clr.reset}`)
  blank()
  print(`  ${clr.cyan}sdf verify${clr.reset}   ${clr.gray}<file.sdf> --key <public.b64>${clr.reset}`)
  print(`  ${clr.gray}             Verify the digital signature of an SDF archive${clr.reset}`)
  print(`  ${clr.gray}             Exit 0 = valid · Exit 1 = invalid (CI-friendly)${clr.reset}`)
  blank()
  print(`  ${clr.cyan}sdf schema${clr.reset}   ${clr.gray}list | versions | diff | validate${clr.reset}`)
  print(`  ${clr.gray}             Schema registry operations — list, diff, validate${clr.reset}`)
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
  print(`  ${clr.dim}sdf wrap document.pdf --issuer "Acme Corp" --out document.sdf${clr.reset}`)
  print(`  ${clr.dim}sdf keygen --algorithm ECDSA --out mykey${clr.reset}`)
  print(`  ${clr.dim}sdf sign invoice.sdf --key mykey.private.b64 --out invoice.signed.sdf${clr.reset}`)
  print(`  ${clr.dim}sdf verify invoice.signed.sdf --key mykey.public.b64${clr.reset}`)
  print(`  ${clr.dim}sdf schema diff --from v0.1.schema.json --to v0.2.schema.json${clr.reset}`)
  print(`  ${clr.dim}sdf schema validate --data invoice.json --schema invoice.schema.json${clr.reset}`)
  blank()
  divider()
  blank()
  process.exit(flags.help ? 0 : 1)
}
 
const getArg = (flag: string) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : undefined
}
 
switch (command) {
 
  case 'inspect': {
    const file = rest[0] ?? subcommand
    if (!file) { print(`  ${clr.red}✗${clr.reset}  Usage: sdf inspect <file.sdf>`); process.exit(1) }
    await inspect(file)
    break
  }
 
  case 'validate': {
    const file = rest[0] ?? subcommand
    if (!file) { print(`  ${clr.red}✗${clr.reset}  Usage: sdf validate <file.sdf>`); process.exit(1) }
    await validate(file, { quiet: flags.quiet })
    break
  }
 
  case 'convert': {
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
      data: dataPath, schema: schemaPath, issuer,
      issuerId:     getArg('--issuer-id'),
      documentType: getArg('--document-type'),
      recipient:    getArg('--recipient'),
      recipientId:  getArg('--recipient-id'),
      schemaId:     getArg('--schema-id'),
      out,
    })
    break
  }
 
  case 'wrap': {
    const pdfPath = subcommand
    const issuer  = getArg('--issuer')
    const out     = getArg('--out')
    if (!pdfPath || !issuer || !out) {
      print(`  ${clr.red}✗${clr.reset}  Usage: sdf wrap <file.pdf> --issuer <s> --out <f>`)
      blank()
      print(`  ${clr.gray}Optional: --issuer-id --document-type --recipient --recipient-id${clr.reset}`)
      process.exit(1)
    }
    await wrap({
      pdf: pdfPath, issuer,
      issuerId:     getArg('--issuer-id'),
      documentType: getArg('--document-type'),
      recipient:    getArg('--recipient'),
      recipientId:  getArg('--recipient-id'),
      out,
    })
    break
  }
 
  case 'keygen': {
    const algorithmRaw = getArg('--algorithm') ?? 'ECDSA'
    const out          = getArg('--out')
    if (!out) {
      print(`  ${clr.red}✗${clr.reset}  Usage: sdf keygen --algorithm ECDSA --out <base>`)
      blank()
      print(`  ${clr.gray}Algorithms: ECDSA (default), RSASSA-PKCS1-v1_5${clr.reset}`)
      process.exit(1)
    }
    if (algorithmRaw !== 'ECDSA' && algorithmRaw !== 'RSASSA-PKCS1-v1_5') {
      print(`  ${clr.red}✗${clr.reset}  Unknown algorithm: ${algorithmRaw}`)
      process.exit(1)
    }
    await keygen({ algorithm: algorithmRaw, out })
    break
  }
 
  case 'sign': {
    const file         = subcommand
    const keyPath      = getArg('--key')
    const out          = getArg('--out')
    const algorithmRaw = getArg('--algorithm') ?? 'ECDSA'
    const includePDF   = args.includes('--include-pdf')
    if (!file || !keyPath || !out) {
      print(`  ${clr.red}✗${clr.reset}  Usage: sdf sign <file.sdf> --key <private.b64> --out <signed.sdf>`)
      blank()
      print(`  ${clr.gray}Optional: --algorithm ECDSA|RSASSA-PKCS1-v1_5  --include-pdf${clr.reset}`)
      process.exit(1)
    }
    if (algorithmRaw !== 'ECDSA' && algorithmRaw !== 'RSASSA-PKCS1-v1_5') {
      print(`  ${clr.red}✗${clr.reset}  Unknown algorithm: ${algorithmRaw}`); process.exit(1)
    }
    await sign({ file, keyPath, algorithm: algorithmRaw, includePDF, out })
    break
  }
 
  case 'verify': {
    const file         = subcommand
    const keyPath      = getArg('--key')
    const algorithmRaw = getArg('--algorithm') ?? 'ECDSA'
    if (!file || !keyPath) {
      print(`  ${clr.red}✗${clr.reset}  Usage: sdf verify <file.sdf> --key <public.b64>`)
      blank()
      print(`  ${clr.gray}Optional: --algorithm ECDSA|RSASSA-PKCS1-v1_5  --quiet${clr.reset}`)
      process.exit(1)
    }
    if (algorithmRaw !== 'ECDSA' && algorithmRaw !== 'RSASSA-PKCS1-v1_5') {
      print(`  ${clr.red}✗${clr.reset}  Unknown algorithm: ${algorithmRaw}`); process.exit(1)
    }
    await verify({ file, keyPath, algorithm: algorithmRaw, quiet: flags.quiet })
    break
  }
 
  // ── schema subcommands ───────────────────────────────────────────────────────
  case 'schema': {
    switch (subcommand) {
 
      case 'list': {
        await schemaList({
          type:         getArg('--type'),
          registryPath: getArg('--registry'),
        })
        break
      }
 
      case 'versions': {
        const type = getArg('--type')
        if (!type) {
          print(`  ${clr.red}✗${clr.reset}  Usage: sdf schema versions --type <doctype>`)
          process.exit(1)
        }
        await schemaVersions({ type, registryPath: getArg('--registry') })
        break
      }
 
      case 'diff': {
        const from = getArg('--from')
        const to   = getArg('--to')
        if (!from || !to) {
          print(`  ${clr.red}✗${clr.reset}  Usage: sdf schema diff --from <file|url> --to <file|url>`)
          process.exit(1)
        }
        await schemaDiff({ from, to })
        break
      }
 
      case 'validate': {
        const dataPath   = getArg('--data')
        const schemaPath = getArg('--schema')
        if (!dataPath || !schemaPath) {
          print(`  ${clr.red}✗${clr.reset}  Usage: sdf schema validate --data <f> --schema <f>`)
          process.exit(1)
        }
        await schemaValidate({ dataPath, schemaPath, quiet: flags.quiet })
        break
      }
 
      default: {
        blank()
        print(`  ${clr.white}sdf schema${clr.reset} — Schema registry operations`)
        blank()
        print(`  ${clr.cyan}sdf schema list${clr.reset}      ${clr.gray}[--type <doctype>] [--registry <file>]${clr.reset}`)
        print(`  ${clr.cyan}sdf schema versions${clr.reset}  ${clr.gray}--type <doctype>${clr.reset}`)
        print(`  ${clr.cyan}sdf schema diff${clr.reset}      ${clr.gray}--from <file|url> --to <file|url>${clr.reset}`)
        print(`  ${clr.cyan}sdf schema validate${clr.reset}  ${clr.gray}--data <f> --schema <f>${clr.reset}`)
        blank()
        print(`  ${clr.white}Examples${clr.reset}`)
        blank()
        print(`  ${clr.dim}sdf schema diff --from v0.1.json --to v0.2.json${clr.reset}`)
        print(`  ${clr.dim}sdf schema validate --data invoice.json --schema invoice.schema.json${clr.reset}`)
        blank()
        process.exit(subcommand ? 1 : 0)
      }
    }
    break
  }
 
  default: {
    print(`  ${clr.red}✗${clr.reset}  Unknown command: ${clr.cyan}${command}${clr.reset}`)
    print(`  ${clr.gray}Run ${clr.white}sdf --help${clr.gray} for usage${clr.reset}`)
    blank()
    process.exit(1)
  }
}