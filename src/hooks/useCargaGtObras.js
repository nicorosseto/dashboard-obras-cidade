import { useEffect, useRef, useState } from 'react'
import { fetchAll } from '../lib/supabase.js'
import { ehModoDemo, demoFetchJSON } from '../lib/demo.js'
import { traduzErro } from '../lib/mensagens.js'

// ── Carga GT Obras — módulo de topo "GT Obras" ────────────────────────
// Gateada por `gt.ver` (mesmo padrão de useCargaMultas). Sem cache
// IndexedDB: volume baixo (~1.9k linhas em gt_obras, ~100 em gt_dash) e o
// módulo é dominado por sincronizações manuais da planilha (D4 — sem
// cron) — sempre busca fresco. Carrega as DUAS tabelas em paralelo.
//
// ⚠️ Expõe `gtErro` + `retry()` (lição de 22/07/2026, ver dominio.md
// "Erro de carga silencioso" e useCargaSistemaGeo.js) — nunca deixar o
// catch só com console.error.
export function useCargaGtObras(session, permissoes) {
  const [gtLinhas, setGtLinhas] = useState([])
  const [gtDash, setGtDash] = useState([])
  const [gtCarregando, setGtCarregando] = useState(true)
  const [gtErro, setGtErro] = useState(null)
  const gtCarregadoRef = useRef(false)

  async function buscar() {
    try {
      setGtErro(null)
      if (ehModoDemo()) {
        const [linhas, dash] = await Promise.all([
          demoFetchJSON('gt_obras'),
          demoFetchJSON('gt_dash'),
        ])
        setGtLinhas(linhas)
        setGtDash(dash)
        return
      }
      const [linhas, dash] = await Promise.all([
        fetchAll('gt_obras', '*', 1000),
        fetchAll('gt_dash', '*', 1000),
      ])
      setGtLinhas(linhas)
      setGtDash(dash)
    } catch (e) {
      console.error('Erro ao carregar GT Obras:', e)
      setGtErro(traduzErro(e.message || String(e)))
    } finally {
      setGtCarregando(false)
    }
  }

  useEffect(() => {
    if (!session || !permissoes) return
    if (!permissoes.has('gt.ver')) {
      setGtCarregando(false)
      return
    }
    if (gtCarregadoRef.current) return
    gtCarregadoRef.current = true

    buscar()
  }, [session, permissoes])

  function reset() {
    setGtLinhas([])
    setGtDash([])
    setGtErro(null)
    gtCarregadoRef.current = false
  }

  // Rebusca sob demanda (botão "Atualizar agora", após a Edge Function rodar).
  async function refetch() {
    setGtCarregando(true)
    await buscar()
  }

  function retry() {
    setGtCarregando(true)
    buscar()
  }

  return { gtLinhas, gtDash, gtCarregando, gtErro, reset, refetch, retry }
}
