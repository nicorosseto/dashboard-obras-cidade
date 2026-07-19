import { useEffect, useRef, useState } from 'react'
import { fetchAll } from '../lib/supabase.js'
import { ehModoDemo, demoFetchJSON } from '../lib/demo.js'

// ── Carga Multas (A4) — módulo de topo "Multas" ───────────────────────
// Gateada por `multas.ver` (mesmo padrão de useCargaEmergencias). Sem cache
// IndexedDB: a tabela `multas` tem volume pequeno (~8.2k linhas) e o módulo é
// dominado por sincronizações periódicas da planilha — sempre busca fresco.
export function useCargaMultas(session, permissoes) {
  const [multasLinhas, setMultasLinhas] = useState([])
  const [multasCarregando, setMultasCarregando] = useState(true)
  const multasCarregadasRef = useRef(false)

  async function buscar() {
    // try/finally garante que o setter de loading sempre seja liberado, mesmo
    // com erro ou re-render (mesma regra dos demais hooks de carga — ver
    // dominio.md, "Cards da Home travados em carregamento indefinido").
    try {
      const linhas = ehModoDemo()
        ? await demoFetchJSON('multas')
        : await fetchAll('multas', '*', 1000)
      setMultasLinhas(linhas)
    } catch (e) {
      console.error('Erro ao carregar multas:', e)
    } finally {
      setMultasCarregando(false)
    }
  }

  useEffect(() => {
    if (!session || !permissoes) return
    if (!permissoes.has('multas.ver')) {
      setMultasCarregando(false)
      return
    }
    if (multasCarregadasRef.current) return
    multasCarregadasRef.current = true

    buscar()
  }, [session, permissoes])

  function reset() {
    setMultasLinhas([])
    setMultasCarregando(true)
    multasCarregadasRef.current = false
  }

  // Rebusca sob demanda (botão "Atualizar agora", após a Edge Function rodar).
  async function refetch() {
    setMultasCarregando(true)
    await buscar()
  }

  return { multasLinhas, multasCarregando, reset, refetch }
}
