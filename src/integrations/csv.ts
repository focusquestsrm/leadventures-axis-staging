export function parseCsv(csv: string): Record<string,string>[] {
  const lines = csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return []
  const parseLine = (line: string) => { const cells: string[]=[]; let value=''; let quoted=false; for (let index=0;index<line.length;index++) { const char=line[index]; if (char==='"') { if (quoted && line[index+1]==='"') { value+='"'; index++ } else quoted=!quoted } else if (char===',' && !quoted) { cells.push(value.trim()); value='' } else value+=char } cells.push(value.trim()); return cells }
  const headers = parseLine(lines[0]).map((value) => value.trim())
  if (!headers.length || headers.some((value) => !value)) throw new Error('CSV headers must be present and unique.')
  if (new Set(headers).size !== headers.length) throw new Error('CSV headers must be unique.')
  return lines.slice(1).map((line) => { const values=parseLine(line); return Object.fromEntries(headers.map((header,index) => [header,values[index] ?? ''])) })
}
