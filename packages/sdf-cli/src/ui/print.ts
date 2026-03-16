// ─── Terminal UI ──────────────────────────────────────────────────────────────
// ANSI color codes — no external dependency

const c = {
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
    dim:     '\x1b[2m',
    // Foreground
    white:   '\x1b[97m',
    gray:    '\x1b[90m',
    red:     '\x1b[91m',
    green:   '\x1b[92m',
    yellow:  '\x1b[93m',
    blue:    '\x1b[94m',
    magenta: '\x1b[95m',
    cyan:    '\x1b[96m',
  }
  
  export const clr = c
  
  // ─── Print helpers ────────────────────────────────────────────────────────────
  
  export function print(msg: string) {
    process.stdout.write(msg + '\n')
  }
  
  export function blank() {
    process.stdout.write('\n')
  }
  
  export function divider(width = 60) {
    print(c.gray + '─'.repeat(width) + c.reset)
  }
  
  export function sectionHeader(title: string) {
    blank()
    print(c.gray + '  ' + title.toUpperCase() + c.reset)
    divider()
  }
  
  export function kv(
    key: string,
    value: string,
    valueColor = c.white,
    keyWidth = 22,
  ) {
    const paddedKey = key.padEnd(keyWidth)
    print(`  ${c.gray}${paddedKey}${c.reset}${valueColor}${value}${c.reset}`)
  }
  
  export function badge(text: string, color = c.cyan) {
    return `${color}[${text}]${c.reset}`
  }
  
  export function success(msg: string) {
    print(`  ${c.green}✓${c.reset}  ${msg}`)
  }
  
  export function warn(msg: string) {
    print(`  ${c.yellow}⚠${c.reset}  ${msg}`)
  }
  
  export function error(msg: string) {
    print(`  ${c.red}✗${c.reset}  ${msg}`)
  }
  
  export function info(msg: string) {
    print(`  ${c.gray}·${c.reset}  ${msg}`)
  }
  
  export function header() {
    blank()
    print(
      `  ${c.bold}${c.white}SDF${c.reset}${c.gray} — Smart Document Format${c.reset}  ` +
      `${c.dim}@etapsky/sdf-cli${c.reset}`
    )
    divider()
  }