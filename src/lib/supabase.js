import { createClient } from '@supabase/supabase-js'

// Le as variaveis de ambiente do Vite (prefixo VITE_ e obrigatorio para
// o valor ficar disponivel no codigo do navegador).
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Faltam variaveis de ambiente: VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Crie um arquivo .env.local (local) ou configure no painel da Vercel (producao).'
  )
}

export const supabase = createClient(url, key)

// Busca todas as linhas de uma tabela grande (ex.: sistemaGeo ~175k).
//
// PAGINAÇÃO POR CURSOR (keyset), não por OFFSET. O `range(ini, fim)` antigo
// virava `LIMIT/OFFSET` no Postgres: para devolver a página N o banco precisa
// percorrer e DESCARTAR as N×pageSize linhas anteriores — custo que cresce de
// forma quadrática (O(n²)) e era a causa da lentidão do Sistema Geo. Aqui usamos
// `WHERE id > cursor ORDER BY id LIMIT pageSize`, que é um índice-seek de custo
// constante por página (a tabela tem `id` como PK). Custo total: O(n).
//
// Para manter o paralelismo (keyset é sequencial por natureza), particionamos o
// intervalo de `id` em `concurrency` FAIXAS contíguas e percorremos cada uma por
// cursor em paralelo. Cada query é um range-scan no índice — rápido e estável,
// independente da posição.
//
// ⚠️ NÃO confiar no `count` para saber quando parar: em tabelas grandes o
// Supabase às vezes devolve `count` SUBESTIMADO (já parou em 93k de 175k —
// 11/06/2026). A parada real é por ESGOTAMENTO de cada faixa (página menor que
// `pageSize`). O `count` serve só para a barra de progresso.
//
// onProgress(carregadas, totalEstimado) é chamado a cada página (opcional).
// orderColumn: coluna usada como cursor (precisa ser indexada e única; default 'id').
export async function fetchAll(
  table,
  columns = '*',
  pageSize = 1000,
  onProgress = null,
  orderColumn = 'id'
) {
  const concurrency = 8

  // Estimativa só para o progresso (instantânea — lê reltuples do pg_class).
  let totalEstimado = 0
  try {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'estimated', head: true })
      .abortSignal(AbortSignal.timeout(10000))
    totalEstimado = count || 0
  } catch {
    // sem contagem, o progresso fica indeterminado — segue mesmo assim
  }

  // Extremos da chave, para dividir o intervalo entre os workers.
  async function extremo(asc) {
    const { data, error } = await supabase
      .from(table)
      .select(orderColumn)
      .order(orderColumn, { ascending: asc })
      .limit(1)
      .abortSignal(AbortSignal.timeout(15000))
    if (error) throw error
    return data?.[0]?.[orderColumn] ?? null
  }

  let minId = null
  let maxId = null
  try {
    ;[minId, maxId] = await Promise.all([extremo(true), extremo(false)])
  } catch {
    minId = maxId = null
  }

  const linhas = []
  let carregadas = 0
  // Reporta o total ESTIMADO cru (pode ser 0/subestimado). Quem consome decide
  // como exibir — nunca forçamos total = carregadas (isso fazia a barra marcar
  // 100% / "Finalizando…" o tempo todo quando o count vinha subestimado).
  const reportar = () => {
    if (onProgress) onProgress(carregadas, totalEstimado)
  }

  // Percorre a faixa [lo, hi) por cursor (keyset). `hi` null = até o fim.
  // Coleta no array `destino` (cada faixa tem o seu, para preservar a ordem).
  async function percorreFaixa(lo, hi, destino) {
    let cursor = null // null = primeira página da faixa
    for (;;) {
      let pagina = []
      for (let tentativa = 0; ; tentativa++) {
        let q = supabase
          .from(table)
          .select(columns)
          .order(orderColumn, { ascending: true })
          .limit(pageSize)
        if (cursor == null) {
          if (lo != null) q = q.gte(orderColumn, lo)
        } else {
          q = q.gt(orderColumn, cursor)
        }
        if (hi != null) q = q.lt(orderColumn, hi)
        // Timeout por requisição: sem isso, uma conexão estancada (sem erro)
        // deixa o Promise.all pendurado para sempre — a carga "trava" e nunca
        // termina. Com AbortSignal.timeout a request vira erro e cai no retry.
        const { data, error } = await q.abortSignal(AbortSignal.timeout(30000))
        if (!error) {
          pagina = data ?? []
          break
        }
        if (tentativa >= 5) throw error
        // backoff exponencial: 0,5s, 1s, 2s, 4s, 8s
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, tentativa)))
      }
      if (pagina.length === 0) break
      destino.push(...pagina)
      carregadas += pagina.length
      reportar()
      if (pagina.length < pageSize) break // faixa esgotada
      cursor = pagina[pagina.length - 1][orderColumn]
    }
  }

  const numerico =
    typeof minId === 'number' && typeof maxId === 'number' && maxId >= minId

  if (numerico && maxId > minId) {
    // Divide [minId, maxId] em `concurrency` faixas contíguas (hi exclusivo).
    const span = maxId - minId + 1
    const passo = Math.ceil(span / concurrency)
    const faixas = []
    for (let lo = minId; lo <= maxId; lo += passo) {
      faixas.push([lo, Math.min(lo + passo, maxId + 1)])
    }
    const baldes = faixas.map(() => [])
    await Promise.all(
      faixas.map((f, i) => percorreFaixa(f[0], f[1], baldes[i]))
    )
    for (const b of baldes) linhas.push(...b)
  } else {
    // Fallback robusto: keyset sequencial do início ao fim (tabela pequena,
    // vazia, ou chave não-numérica).
    await percorreFaixa(minId, null, linhas)
  }

  reportar()
  return linhas
}

// Versão "barata" de uma tabela, para validar cache local (IndexedDB).
// Combina a contagem estimada (instantânea) com o maior `created_at`: se a
// tabela recebeu novas linhas (todo INSERT carimba `created_at = now()`), o
// token muda e o cache é considerado obsoleto. Retorna null se não der para
// determinar (nesse caso o chamador deve rebuscar por segurança).
export async function versaoTabela(table, colData = 'created_at') {
  try {
    const [cnt, mx] = await Promise.all([
      supabase
        .from(table)
        .select('*', { count: 'estimated', head: true })
        .abortSignal(AbortSignal.timeout(10000)),
      supabase
        .from(table)
        .select(colData)
        .order(colData, { ascending: false })
        .limit(1)
        .abortSignal(AbortSignal.timeout(10000)),
    ])
    const maxData = mx.data?.[0]?.[colData] ?? ''
    return `${cnt.count ?? 0}|${maxData}`
  } catch {
    return null
  }
}
