import { useEffect, useRef, useState } from 'react'
import { fetchAll, versaoTabela } from '../lib/supabase.js'
import { lerCache, gravarCache } from '../lib/cache.js'

// ── Carga Emergências (após login, junto com os demais módulos) ────
// Carrega assim que as permissões chegam (não espera o usuário entrar no
// módulo) — evita a 2ª espera de carregamento ao abrir Emergências.
// Mesma estratégia stale-while-revalidate do Sistema Geo (cache 'emergencias').
export function useCargaEmergencias(session, permissoes) {
  const [emergLinhas, setEmergLinhas] = useState([])
  const [emergObras, setEmergObras] = useState([])
  const [motivoClassif, setMotivoClassif] = useState([])
  const [motivoOverrides, setMotivoOverrides] = useState([])
  const [emergCarregando, setEmergCarregando] = useState(true)
  const [emergProgresso, setEmergProgresso] = useState({ carregadas: 0, total: 0 })
  const emergCarregadasRef = useRef(false)

  useEffect(() => {
    if (!session || !permissoes) return
    if (!permissoes.has('emerg.ver')) {
      setEmergCarregando(false)
      return
    }
    if (emergCarregadasRef.current) return
    emergCarregadasRef.current = true

    let cancelado = false

    async function carregar() {
      // Mesmo motivo do Sistema Geo: try/finally garante que o emergCarregando
      // sempre seja liberado, mesmo se a carga for cancelada por re-render ou
      // der erro. Antes o setEmergCarregando(false) ficava sob `if (!cancelado)`
      // e o ref-guard prendia a tela de Emergências em "Carregando" para sempre.
      try {
        const cache = await lerCache('emergencias')
        if (cache?.linhas?.length && !cancelado) setEmergLinhas(cache.linhas)

        const versao = await versaoTabela('emergencias')
        const temCache = !!cache?.linhas?.length
        if (!(temCache && versao && cache.versao === versao)) {
          if (!temCache) setEmergCarregando(true)
          const linhas = await fetchAll('emergencias', '*', 1000, (c, t) => {
            setEmergProgresso({ carregadas: c, total: t })
          })
          if (!cancelado) {
            setEmergLinhas(linhas)
            setTimeout(() => gravarCache('emergencias', { versao, linhas }), 0)
          }
        }

        // Planilha auxiliar de posicionamento (tabela pequena, sem cache dedicado).
        const obras = await fetchAll('emergencias_obras', '*', 1000)
        if (!cancelado) setEmergObras(obras)

        // Classificação dos motivos de natureza (válido/inválido por termo) + overrides.
        const classif = await fetchAll('motivo_natureza_classificacao', '*', 1000)
        if (!cancelado) setMotivoClassif(classif)
        const overrides = await fetchAll('motivo_natureza_override', '*', 1000)
        if (!cancelado) setMotivoOverrides(overrides)
      } catch (e) {
        console.error('Erro ao carregar emergencias:', e)
      } finally {
        setEmergCarregando(false)
      }
    }

    carregar()

    return () => {
      cancelado = true
    }
  }, [session, permissoes])

  return {
    emergLinhas,
    setEmergLinhas,
    emergObras,
    setEmergObras,
    motivoClassif,
    setMotivoClassif,
    motivoOverrides,
    setMotivoOverrides,
    emergCarregando,
    emergProgresso,
  }
}
