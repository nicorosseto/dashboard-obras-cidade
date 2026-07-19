import { useEffect, useRef, useState } from 'react'
import { fetchAll } from '../lib/supabase.js'
import { traduzErro } from '../lib/mensagens.js'
import { ehModoDemo, demoFetchJSON } from '../lib/demo.js'

// ── Carga OBRAS/Fiscalização (só após login) ───────────────────────
export function useCargaFiscalizacao(session) {
  const [todasLinhas, setTodasLinhas] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const carregadasRef = useRef(false)

  useEffect(() => {
    if (!session) return
    if (carregadasRef.current) return
    carregadasRef.current = true
    setCarregando(true)
    const promessa = ehModoDemo()
      ? demoFetchJSON('fiscalizacoes')
      : fetchAll('vw_fiscalizacao_enriquecida')
    promessa
      .then(setTodasLinhas)
      .catch((e) => setErro(traduzErro(e.message || String(e))))
      .finally(() => setCarregando(false))
  }, [session])

  function reset() {
    setTodasLinhas([])
    setCarregando(false)
    setErro(null)
    carregadasRef.current = false
  }

  return { todasLinhas, carregando, erro, reset }
}
