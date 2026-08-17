export function parseCsv(csv: string): Record<string,string>[] {
  if (new Blob([csv]).size > 5 * 1024 * 1024) throw new Error('CSV files must not exceed 5 MB.')
  const lines = csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return []
  if (lines.length > 10_001) throw new Error('CSV imports are limited to 10,000 data rows per batch.')
  const parseLine = (line: string) => { const cells: string[]=[]; let value=''; let quoted=false; for (let index=0;index<line.length;index++) { const char=line[index]; if (char==='"') { if (quoted && line[index+1]==='"') { value+='"'; index++ } else quoted=!quoted } else if (char===',' && !quoted) { cells.push(value.trim()); value='' } else value+=char; if (value.length > 10_000) throw new Error('CSV cells must not exceed 10,000 characters.') } if (quoted) throw new Error('CSV contains an unterminated quoted value.'); cells.push(value.trim()); return cells }
  const headers = parseLine(lines[0]).map((value) => value.trim())
  if (!headers.length || headers.some((value) => !value)) throw new Error('CSV headers must be present and unique.')
  if (headers.length > 200) throw new Error('CSV imports are limited to 200 columns.')
  if (new Set(headers).size !== headers.length) throw new Error('CSV headers must be unique.')
  return lines.slice(1).map((line) => { const values=parseLine(line); if (values.length > headers.length) throw new Error('CSV row contains more values than headers.'); return Object.fromEntries(headers.map((header,index) => [header,values[index] ?? ''])) })
}
