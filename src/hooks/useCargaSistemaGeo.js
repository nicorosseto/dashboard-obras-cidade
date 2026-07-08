import { useEffect, useRef, useState } from 'react'
import { fetchAll, versaoTabela } from '../lib/supabase.js'
import { lerCache, gravarCache } from '../lib/cache.js'
import { abasPermitidas } from '../lib/permissoes.js'

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
  const sistemaGeoCarregadoRef = useRef(false)

  useEffect(() => {
    if (!session || !permissoes) return
    const podeGeo = abasPermitidas(permissoes, 'sistemaGeo').length > 0
    if (!podeGeo) return
    if (sistemaGeoCarregadoRef.current) return
    sistemaGeoCarregadoRef.current = true

    let cancelado = false

    async function carregar() {
      // try/finally garante que o spinner SEMPRE seja liberado, mesmo se a
      // carga for cancelada por re-render (deps mudam) ou der erro. Antes o
      // setSistemaGeoCarregando(false) ficava num `if (!cancelado)` e, quando o
      // effect re-disparava com a carga em voo, o ref bloqueava uma nova carga
      // e o spinner ficava preso para sempre (só o Shift+F5 resolvia).
      try {
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

        const linhas = await fetchAll('sistemaGeo', GEO_COLS, 1000, (carregadas, total) =>
          setGeoProgresso({ carregadas, total })
        )
        if (cancelado) return
        setSistemaGeoLinhas(linhas)
        // setTimeout cede o event loop para o React re-renderizar (esconder o
        // spinner) ANTES de gravarCache bloquear a thread com structured clone
        // de ~175k objetos — sem isso o spinner nunca some.
        setTimeout(() => gravarCache('sistemaGeo', { versao, linhas }), 0)
      } catch (e) {
        console.error('Erro ao carregar sistemaGeo:', e)
      } finally {
        setSistemaGeoCarregando(false)
      }
    }

    carregar()

    return () => {
      cancelado = true
    }
  }, [session, permissoes])

  function reset() {
    setSistemaGeoLinhas([])
    sistemaGeoCarregadoRef.current = false
  }

  return { sistemaGeoLinhas, sistemaGeoCarregando, geoProgresso, reset }
}
