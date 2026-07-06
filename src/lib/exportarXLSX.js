import * as XLSX from 'xlsx'

// Exporta um array de objetos como .xlsx via SheetJS.
// colunas: [{ key, label }] — define quais campos incluir e o cabeçalho.
export function exportarXLSX(rows, colunas, nomeArquivo) {
  const header = colunas.map((c) => c.label)
  const corpo = rows.map((r) =>
    colunas.map((c) => {
      const v = r[c.key]
      if (v == null) return ''
      if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
      return v
    })
  )
  const ws = XLSX.utils.aoa_to_sheet([header, ...corpo])
  ws['!cols'] = colunas.map((c) => ({
    wch: Math.min(40, Math.max(c.label.length + 2, 12)),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Dados')
  const nome = nomeArquivo.endsWith('.xlsx') ? nomeArquivo : nomeArquivo + '.xlsx'
  XLSX.writeFile(wb, nome, { compression: true })
}

// Exporta várias abas num único .xlsx (uma aba por slide, no módulo Apresentação).
// abas: [{ nome, rows, colunas }] — `nome` é truncado a 31 chars (limite do Excel)
// e deduplicado, senão o book_append_sheet lança erro.
export function exportarXLSXMultiAba(abas, nomeArquivo) {
  const wb = XLSX.utils.book_new()
  const usados = new Set()
  for (const aba of abas) {
    const header = aba.colunas.map((c) => c.label)
    const corpo = (aba.rows || []).map((r) =>
      aba.colunas.map((c) => {
        const v = r[c.key]
        if (v == null) return ''
        if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
        return v
      })
    )
    const ws = XLSX.utils.aoa_to_sheet([header, ...corpo])
    ws['!cols'] = aba.colunas.map((c) => ({
      wch: Math.min(40, Math.max(c.label.length + 2, 12)),
    }))
    let nome = String(aba.nome || 'Dados')
      .replace(/[\\/?*[\]:]/g, ' ')
      .slice(0, 31)
      .trim() || 'Dados'
    let base = nome
    let i = 2
    while (usados.has(nome)) nome = `${base.slice(0, 28)} ${i++}`
    usados.add(nome)
    XLSX.utils.book_append_sheet(wb, ws, nome)
  }
  const nome = nomeArquivo.endsWith('.xlsx') ? nomeArquivo : nomeArquivo + '.xlsx'
  XLSX.writeFile(wb, nome, { compression: true })
}

// Fallback CSV (BOM para compatibilidade Excel).
export function exportarCSV(rows, colunas, nomeArquivo) {
  const header = colunas.map((c) => `"${c.label}"`).join(',')
  const corpo = rows
    .map((r) =>
      colunas
        .map((c) => {
          let v = r[c.key]
          if (v == null) v = ''
          if (typeof v === 'boolean') v = v ? 'Sim' : 'Não'
          return `"${String(v).replace(/"/g, '""')}"`
        })
        .join(',')
    )
    .join('\n')
  const bom = '﻿'
  const blob = new Blob([bom + header + '\n' + corpo], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : nomeArquivo + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}
