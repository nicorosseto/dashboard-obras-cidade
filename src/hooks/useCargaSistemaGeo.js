import { useEffect, useRef, useState } from 'react'
import { fetchAll, versaoTabela } from '../lib/supabase.js'
import { lerCache, gravarCache } from '../lib/cache.js'
import { abasPermitidas } from '../lib/permissoes.js'
import { ehModoDemo, demoFetchJSON } from '../lib/demo.js'
import { traduzErro } from '../lib/mensagens.js'

// Colunas do sistemaGeo usadas pelo dashboard (exclui 'etapa' e 'created_at').
const GEO_COLS =
  'id,processo,tipo_processo,tipo_processo_nome,permissionaria,executora,' +
  'data_cadastro,etapa_nome,subprefeitura,status,status_nome,status_unificado,' +
  'tipo_obra,tipo_obra_nome'

// ── Carga Sistema Geo (após login, para popular totais da Home) ──────
// Só baixa as ~175k linhas se o usuário tiver alguma aba do Sistema Geo
// liberada (espera as permissões carregarem antes de decidir).
//
// Estratégia "stale-while-revalidate": mostra o cache local na hora
// (abertura instantânea) e só rebusca pela rede se a versão da tabela mudou
// (ver `versaoTabela`). A barra de progresso só aparece na 1ª carga (sem
// cache). O Sistema Geo é atualizado ~1×/mês, então o cache acerta quase sempre.
export function useCargaSistemaGeo(session, permissoes) {
  const [sistemaGeoLinhas, setSistemaGeoLinhas] = useState([])
  const [sistemaGeoCarregando, setSistemaGeoCarregando] = useState(false)
  const [geoProgresso, setGeoProgresso] = useState({ carregadas: 0, total: 0 })
  const [sistemaGeoErro, setSistemaGeoErro] = useState(null)
  const sistemaGeoCarregadoRef = useRef(false)

  // Extraída do effect para poder ser chamada de novo por `retry()` — antes,
  // qualquer erro (timeout do Supabase, rate limit, falha de rede) durante a
  // carga das ~175k linhas era só um `console.error` invisível ao usuário: o
  // `sistemaGeoCarregadoRef` ficava travado em `true` e os dados nunca mais eram
  // buscados nessa sessão, deixando o Sistema Geo permanentemente zerado (Home e
  // o módulo inteiro) até um reload completo da página (achado de 22/07/2026 —
  // o usuário via "0" sem nenhum aviso e precisava de Shift+F5 pra recuperar).
  async function carregar() {
    let cancelado = false

    // try/finally garante que o spinner SEMPRE seja liberado, mesmo se a
    // carga for cancelada por re-render (deps mudam) ou der erro. Antes o
    // setSistemaGeoCarregando(false) ficava num `if (!cancelado)` e, quando o
    // effect re-disparava com a carga em voo, o ref bloqueava uma nova carga
    // e o spinner ficava preso para sempre (só o Shift+F5 resolvia).
    try {
      setSistemaGeoErro(null)

      // Modo demo: sem cache IndexedDB, lê direto do JSON estático.
      if (ehModoDemo()) {
        setSistemaGeoCarregando(true)
        const linhas = await demoFetchJSON('sistemaGeo')
        if (!cancelado) {
          setSistemaGeoLinhas(linhas)
          setGeoProgresso({ carregadas: linhas.length, total: linhas.length })
        }
        return
      }

      const cache = await lerCache('sistemaGeo')
      if (cache?.linhas?.length && !cancelado) {
        setSistemaGeoLinhas(cache.linhas) // mostra na hora
      }

      const versao = await versaoTabela('sistemaGeo')
      // Cache fresco (versão bate) → nada a rebaixar.
      if (cache?.linhas?.length && versao && cache.versao === versao) return

      // Sem cache: mostra a barra de progresso. Com cache obsoleto: revalida
      // em silêncio (os dados antigos seguem na tela até chegar o novo).
      const tinhaCache = !!cache?.linhas?.length
      if (!tinhaCache) setSistemaGeoCarregando(true)

      const linhas = await fetchAll(
        'sistemaGeo',
        GEO_COLS,
        1000,
        (carregadas, total) => setGeoProgresso({ carregadas, total })
      )
      if (cancelado) return
      setSistemaGeoLinhas(linhas)
      // setTimeout cede o event loop para o React re-renderizar (esconder o
      // spinner) ANTES de gravarCache bloquear a thread com structured clone
      // de ~175k objetos — sem isso o spinner nunca some.
      setTimeout(() => gravarCache('sistemaGeo', { versao, linhas }), 0)
    } catch (e) {
      console.error('Erro ao carregar sistemaGeo:', e)
      // Sem cache prévio na tela, os dados ficam vazios (0) — por isso o erro
      // precisa aparecer explicitamente, não só no console.
      setSistemaGeoErro(traduzErro(e.message || String(e)))
    } finally {
      setSistemaGeoCarregando(false)
    }
  }

  useEffect(() => {
    if (!session || !permissoes) return
    const podeGeo = abasPermitidas(permissoes, 'sistemaGeo').length > 0
    if (!podeGeo) return
    if (sistemaGeoCarregadoRef.current) return
    sistemaGeoCarregadoRef.current = true
    carregar()
  }, [session, permissoes])

  function reset() {
    setSistemaGeoLinhas([])
    setSistemaGeoErro(null)
    sistemaGeoCarregadoRef.current = false
  }

  function retry() {
    setSistemaGeoErro(null)
    carregar()
  }

  return {
    sistemaGeoLinhas,
    sistemaGeoCarregando,
    geoProgresso,
    sistemaGeoErro,
    reset,
    retry,
  }
}
