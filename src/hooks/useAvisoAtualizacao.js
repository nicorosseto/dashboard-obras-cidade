import { useEffect, useState } from 'react'
import { fetchDatasModulos } from '../lib/supabase.js'

const DATAS_VAZIAS = { sistemaGeo: null, fiscalizacoes: null, emergencias: null }
const INTERVALO_POLLING_MS = 3 * 60 * 1000

// ── Datas de atualização por módulo + aviso de "dados atualizados por
// outro usuário" ────────────────────────────────────────────────────
// 3 efeitos relacionados: (1) busca inicial ao logar; (2) re-busca após
// upload do próprio usuário (evita falso positivo do polling pra quem
// acabou de importar); (3) polling a cada 3 min comparando uploaded_at
// contra o que foi carregado na sessão.
export function useAvisoAtualizacao(session) {
  const [datasModulos, setDatasModulos] = useState(DATAS_VAZIAS)
  const [modulosAtualizados, setModulosAtualizados] = useState([])

  function atualizarDatasModulos() {
    return fetchDatasModulos().then(setDatasModulos)
  }

  useEffect(() => {
    if (!session) return
    atualizarDatasModulos().catch(() => {})
  }, [session])

  // Após upload do próprio usuário: re-fetch para que o polling não dispare
  // falso positivo ("dados de outro usuário") para quem acabou de importar.
  useEffect(() => {
    function handleUploadConcluido() {
      atualizarDatasModulos().catch(() => {})
    }
    window.addEventListener('obras:upload-concluido', handleUploadConcluido)
    return () => window.removeEventListener('obras:upload-concluido', handleUploadConcluido)
  }, [])

  // Checa se outro usuário atualizou os dados enquanto este estava logado.
  // Compara uploaded_at atual do banco com o que foi carregado na sessão.
  // Não dispara durante uploads do próprio usuário (datasModulos é atualizado
  // pelo confirmarUpload → setDatasModulos, então o "novo" upstream === local).
  useEffect(() => {
    if (!session) return
    const checar = async () => {
      try {
        const novo = await fetchDatasModulos()
        setDatasModulos((prev) => {
          const atualizados = []
          if (novo.sistemaGeo && novo.sistemaGeo !== prev.sistemaGeo) atualizados.push('Sistema Geo')
          if (novo.fiscalizacoes && novo.fiscalizacoes !== prev.fiscalizacoes) atualizados.push('Fiscalização')
          if (novo.emergencias && novo.emergencias !== prev.emergencias) atualizados.push('Emergências')
          if (atualizados.length > 0) setModulosAtualizados(atualizados)
          return prev // não altera datasModulos — mantém a referência local para comparar
        })
      } catch {
        // falha silenciosa — polling não-crítico
      }
    }
    const id = setInterval(checar, INTERVALO_POLLING_MS)
    return () => clearInterval(id)
  }, [session])

  return {
    datasModulos,
    modulosAtualizados,
    limparModulosAtualizados: () => setModulosAtualizados([]),
  }
}
