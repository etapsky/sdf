import { clr, print } from './print.js'

interface Column {
  key:   string;
  label: string;
  width: number;
  color?: string;
}

export function renderTable(
  rows:    Record<string, string>[],
  columns: Column[],
) {
  // Header
  const header = columns
    .map(c => c.label.padEnd(c.width))
    .join('  ')
  print(`  ${clr.gray}${header}${clr.reset}`)
  print('  ' + clr.gray + '─'.repeat(header.length) + clr.reset)

  // Rows
  for (const row of rows) {
    const line = columns
      .map(c => {
        const val = (row[c.key] ?? '').slice(0, c.width).padEnd(c.width)
        return c.color ? `${c.color}${val}${clr.reset}` : `${clr.white}${val}${clr.reset}`
      })
      .join('  ')
    print(`  ${line}`)
  }
}