import * as XLSX from 'xlsx'

// ────────────────────────────────────────────────────────────────────
// Conversão de datas de planilha → 'YYYY-MM-DD' (fonte ÚNICA da verdade)
// ────────────────────────────────────────────────────────────────────
//
// Esta função vivia DUPLICADA em três arquivos (importarSistemaGeo.js,
// importarFiscalizacao.js e PaginaEmergencias.jsx) — exatamente a função que
// já causou os bugs de data documentados no `dominio.md`. Unificada aqui para
// que uma correção valha para todos os importadores de uma vez.
//
// Aceita (superset de tudo que os três importadores precisavam):
//   - Date (objeto): usa métodos UTC. O SheetJS cria Date em UTC midnight;
//     ler em UTC evita o shift de fuso (UTC-3 faria Jan 1 virar Dez 31).
//   - número: serial Excel, via XLSX.SSF.parse_date_code (canônico da lib).
//   - texto ISO: 'YYYY-MM-DD' (aceita mês/dia com 1 ou 2 dígitos).
//   - texto brasileiro: 'DD/MM/AAAA' ou 'DD-MM-AAAA' (barra OU traço; a
//     planilha de emergências usa traço). Sempre dia→mês→ano; ano com 2 ou 4
//     dígitos (2 dígitos vira 20xx).
//
// ⚠️ Nunca usar `new Date(string)` como fallback: ele lê "DD-MM-AAAA" como
// formato americano e inverte dia/mês (bug que zerou ~75k linhas).
export function toIsoDate(v) {
  if (v == null || v === '') return null

  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    const y = v.getUTCFullYear()
    const m = String(v.getUTCMonth() + 1).padStart(2, '0')
    const d = String(v.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return null
    const mm = String(d.m).padStart(2, '0')
    const dd = String(d.d).padStart(2, '0')
    return `${d.y}-${mm}-${dd}`
  }

  const s = String(v).trim()
  if (!s) return null

  // ISO: ano primeiro (YYYY-MM-DD), mês/dia com 1 ou 2 dígitos.
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`

  // Brasileiro: dia primeiro (DD/MM/AAAA ou DD-MM-AAAA — barra ou traço).
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }

  return null
}
