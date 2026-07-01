// Editor de motivos v3 — grupos editáveis (nome, válido/inválido, palavras-chave,
// fundir, excluir) + ver/mover os textos de natureza de cada grupo (override).
// As alterações ficam locais e só são persistidas no "Salvar". Como recálculo
// completo seria pesado, o efeito de mover/fundir aparece de fato no próximo abrir.
import { useState, useMemo } from 'react'
import { normNatureza, slugTermo } from '../../../lib/emergencias.js'

export default function EditorMotivos({ grupos = [], salvando = false, onSalvar, onClose }) {
  // edições locais por termo: { rotulo, invalido, palavras, arquivado, alias_de }
  const [edits, setEdits] = useState({})
  const [novos, setNovos] = useState([]) // [{ termo, rotulo, invalido, palavras }]
  const [moves, setMoves] = useState({}) // chave(normNatureza) → termo
  const [expandido, setExpandido] = useState(null)
  const [filtro, setFiltro] = useState('todos') // todos | pendentes | invalidos
  const [busca, setBusca] = useState('')
  const [novoNome, setNovoNome] = useState('')

  // valor efetivo de um grupo (base + edição local)
  const ef = (g) => ({ ...g, ...(edits[g.termo] || {}) })

  // todos os grupos exibíveis = base (não arquivados/fundidos localmente) + novos
  const todos = useMemo(() => {
    const base = grupos.map(ef).filter((g) => !g.arquivado && !g.alias_de)
    return [...base, ...novos]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupos, edits, novos])

  const ativos = todos // alvos válidos para mover/fundir

  const lista = useMemo(() => {
    let arr = todos
    if (filtro === 'pendentes') arr = arr.filter((g) => !g.classificado)
    else if (filtro === 'invalidos') arr = arr.filter((g) => g.invalido)
    if (busca.trim()) {
      const b = busca.trim().toLowerCase()
      arr = arr.filter((g) => (g.rotulo || '').toLowerCase().includes(b))
    }
    return arr
  }, [todos, filtro, busca])

  const pendentes = todos.filter((g) => !g.classificado).length
  const invalidos = todos.filter((g) => g.invalido).length

  // ── ações ──────────────────────────────────────────────────────────
  function setEdit(termo, patch) { setEdits((m) => ({ ...m, [termo]: { ...(m[termo] || {}), ...patch } })) }
  function setNovo(termo, patch) { setNovos((arr) => arr.map((g) => (g.termo === termo ? { ...g, ...patch } : g))) }
  function patchGrupo(g, patch) { (g._novo ? setNovo : setEdit)(g.termo, patch) }

  function criarGrupo() {
    const nome = novoNome.trim()
    if (!nome) return
    const termo = slugTermo(nome)
    if (todos.some((g) => g.termo === termo)) { setNovoNome(''); return }
    setNovos((arr) => [...arr, { termo, rotulo: nome, invalido: false, palavras: [], classificado: false, qtd: 0, itens: [], _novo: true }])
    setNovoNome('')
  }

  function excluir(g) {
    if (g._novo) setNovos((arr) => arr.filter((x) => x.termo !== g.termo))
    else setEdit(g.termo, { arquivado: true })
  }
  function fundir(g, alvo) {
    if (!alvo || alvo === g.termo) return
    if (g._novo) setNovos((arr) => arr.filter((x) => x.termo !== g.termo))
    else setEdit(g.termo, { alias_de: alvo })
  }
  function moverTexto(texto, alvo) {
    setMoves((m) => ({ ...m, [normNatureza(texto)]: alvo }))
  }

  function addPalavra(g, palavra) {
    const p = palavra.trim()
    if (!p) return
    const cur = ef(g).palavras || []
    if (cur.some((x) => x.toLowerCase() === p.toLowerCase())) return
    patchGrupo(g, { palavras: [...cur, p] })
  }
  function rmPalavra(g, palavra) {
    patchGrupo(g, { palavras: (ef(g).palavras || []).filter((x) => x !== palavra) })
  }

  function salvar() {
    // defs: todos os grupos base (com edições) + novos. Inclui arquivados/fundidos.
    const defsPayload = [
      ...grupos.map((g) => {
        const e = ef(g)
        return { termo: g.termo, rotulo: e.rotulo, invalido: !!e.invalido, palavras: e.palavras || [], arquivado: !!e.arquivado, alias_de: e.alias_de || null }
      }),
      ...novos.map((g) => ({ termo: g.termo, rotulo: g.rotulo, invalido: !!g.invalido, palavras: g.palavras || [], arquivado: false, alias_de: null })),
    ]
    const overridesPayload = Object.entries(moves).map(([chave, termo]) => ({ chave, termo }))
    onSalvar({ defs: defsPayload, overrides: overridesPayload })
  }

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-navy uppercase tracking-wide">Ajustar motivos de natureza</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {todos.length} grupos · {invalidos} inválidos
              {pendentes > 0 && <span className="text-amber-600 font-semibold"> · {pendentes} pendente(s)</span>}
              <span className="text-gray-400"> · alterações aplicadas ao salvar</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none" title="Fechar">✕</button>
        </div>

        {/* Filtros + busca + novo grupo */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-50 text-[11px] flex-wrap">
          {[{ id: 'todos', label: `Todos (${todos.length})` }, { id: 'pendentes', label: `Pendentes (${pendentes})` }, { id: 'invalidos', label: `Inválidos (${invalidos})` }].map((f) => (
            <button key={f.id} onClick={() => setFiltro(f.id)} className={`px-2 py-1 rounded font-semibold ${filtro === f.id ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f.label}</button>
          ))}
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar grupo…" className="ml-auto border border-gray-200 rounded px-2 py-1 text-xs w-32" />
          <div className="flex items-center gap-1">
            <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && criarGrupo()} placeholder="Novo grupo…" className="border border-gray-200 rounded px-2 py-1 text-xs w-28" />
            <button onClick={criarGrupo} className="px-2 py-1 rounded bg-green-600 text-white font-semibold hover:bg-green-700">+ Criar</button>
          </div>
        </div>

        {/* Lista de grupos */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
          {lista.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-400">Nenhum grupo neste filtro.</p>}
          {lista.map((g) => (
            <GrupoLinha
              key={g.termo}
              g={g}
              aberto={expandido === g.termo}
              alvos={ativos.filter((a) => a.termo !== g.termo)}
              moves={moves}
              onToggleAberto={() => setExpandido(expandido === g.termo ? null : g.termo)}
              onRotulo={(v) => patchGrupo(g, { rotulo: v })}
              onInvalido={(v) => patchGrupo(g, { invalido: v })}
              onAddPalavra={(p) => addPalavra(g, p)}
              onRmPalavra={(p) => rmPalavra(g, p)}
              onFundir={(alvo) => fundir(g, alvo)}
              onExcluir={() => excluir(g)}
              onMoverTexto={(t, alvo) => moverTexto(t, alvo)}
            />
          ))}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-4 py-1.5 text-xs font-semibold text-white bg-navy rounded hover:bg-navy-light disabled:opacity-60">
            {salvando ? 'Salvando…' : 'Salvar classificação'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Linha de um grupo (expansível) ───────────────────────────────────
function GrupoLinha({ g, aberto, alvos, moves, onToggleAberto, onRotulo, onInvalido, onAddPalavra, onRmPalavra, onFundir, onExcluir, onMoverTexto }) {
  const [editandoNome, setEditandoNome] = useState(false)
  const [nome, setNome] = useState(g.rotulo)
  const [novaPalavra, setNovaPalavra] = useState('')
  const [buscaTexto, setBuscaTexto] = useState('')

  // textos distintos do grupo (a partir dos itens), top 50 — só quando aberto
  const textos = useMemo(() => {
    if (!aberto) return []
    const m = new Map()
    for (const it of g.itens || []) {
      const t = (it.natureza || '').trim()
      if (!t) continue
      m.set(t, (m.get(t) || 0) + 1)
    }
    let arr = [...m.entries()].map(([texto, qtd]) => ({ texto, qtd })).sort((a, b) => b.qtd - a.qtd)
    if (buscaTexto.trim()) { const b = buscaTexto.trim().toLowerCase(); arr = arr.filter((x) => x.texto.toLowerCase().includes(b)) }
    return arr.slice(0, 50)
  }, [g.itens, buscaTexto, aberto])

  return (
    <div className="px-5 py-2.5">
      <div className="flex items-center gap-2">
        <button onClick={onToggleAberto} className="text-gray-400 hover:text-navy w-4 shrink-0" title="Ver motivos">{aberto ? '▾' : '▸'}</button>
        <div className="flex-1 min-w-0">
          {editandoNome ? (
            <input
              autoFocus value={nome} onChange={(e) => setNome(e.target.value)}
              onBlur={() => { onRotulo(nome.trim() || g.rotulo); setEditandoNome(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onRotulo(nome.trim() || g.rotulo); setEditandoNome(false) } }}
              className="text-xs font-semibold border border-amber-300 rounded px-1.5 py-0.5 w-full max-w-xs"
            />
          ) : (
            <span className="text-xs font-semibold text-gray-800 cursor-pointer hover:text-navy" onClick={() => { setNome(g.rotulo); setEditandoNome(true) }} title="Clique para renomear">
              {g.rotulo} <span className="text-gray-300">✎</span>
            </span>
          )}
          <span className="text-[10px] text-gray-400 ml-2">{(g.qtd || 0).toLocaleString('pt-BR')} processo(s)</span>
          {!g.classificado && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-1">NOVO</span>}
          {g._novo && <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded ml-1">CRIADO</span>}
        </div>
        {/* toggle válido/inválido */}
        <div className="flex rounded-md overflow-hidden border border-gray-200 shrink-0">
          <button onClick={() => onInvalido(false)} className={`px-2.5 py-1 text-[11px] font-semibold ${!g.invalido ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Válido</button>
          <button onClick={() => onInvalido(true)} className={`px-2.5 py-1 text-[11px] font-semibold ${g.invalido ? 'bg-red text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Inválido</button>
        </div>
        {/* fundir */}
        <select defaultValue="" onChange={(e) => { onFundir(e.target.value); e.target.value = '' }} className="text-[10px] border border-gray-200 rounded px-1 py-1 text-gray-500 shrink-0" title="Fundir este grupo em outro">
          <option value="">Fundir…</option>
          {alvos.map((a) => <option key={a.termo} value={a.termo}>{a.rotulo}</option>)}
        </select>
        {/* excluir */}
        <button onClick={onExcluir} className="text-[10px] text-red border border-red/30 rounded px-1.5 py-1 hover:bg-red/5 shrink-0" title="Excluir grupo">Excluir</button>
      </div>

      {aberto && (
        <div className="mt-2 ml-6 space-y-2">
          {/* palavras-chave */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Palavras-chave:</span>
            {(g.palavras || []).length === 0 && <span className="text-[10px] text-gray-300">(nenhuma — usa o vocabulário automático)</span>}
            {(g.palavras || []).map((p) => (
              <span key={p} className="text-[10px] bg-navy/10 text-navy rounded px-1.5 py-0.5 flex items-center gap-1">
                {p}<button onClick={() => onRmPalavra(p)} className="text-navy/50 hover:text-red">×</button>
              </span>
            ))}
            <input
              value={novaPalavra} onChange={(e) => setNovaPalavra(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { onAddPalavra(novaPalavra); setNovaPalavra('') } }}
              placeholder="+ palavra" className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 w-24"
            />
          </div>
          {/* textos do grupo */}
          <div>
            <input value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} placeholder="Buscar no texto da natureza…" className="text-[11px] border border-gray-200 rounded px-2 py-1 w-full mb-1" />
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded divide-y divide-gray-50">
              {textos.length === 0 && <p className="px-2 py-3 text-center text-[11px] text-gray-400">Nenhum texto.</p>}
              {textos.map((t) => {
                const movidoPara = moves[normNatureza(t.texto)]
                return (
                  <div key={t.texto} className="flex items-center gap-2 px-2 py-1">
                    <span className="flex-1 text-[11px] text-gray-600 truncate" title={t.texto}>{t.texto}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{t.qtd}×</span>
                    {movidoPara
                      ? <span className="text-[10px] text-green-700 shrink-0">→ {alvos.find((a) => a.termo === movidoPara)?.rotulo || movidoPara}</span>
                      : (
                        <select defaultValue="" onChange={(e) => { onMoverTexto(t.texto, e.target.value); e.target.value = '' }} className="text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-500 shrink-0" title="Mover este texto para outro grupo">
                          <option value="">mover →</option>
                          {alvos.map((a) => <option key={a.termo} value={a.termo}>{a.rotulo}</option>)}
                        </select>
                      )}
                  </div>
                )
              })}
            </div>
            {(g.itens || []).length > 50 && <p className="text-[10px] text-gray-400 mt-1">Mostrando os 50 textos mais frequentes. Use a busca para achar outros.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
