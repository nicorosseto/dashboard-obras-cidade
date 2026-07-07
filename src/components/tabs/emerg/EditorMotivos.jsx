// Editor de motivos v3 — grupos editáveis (nome, válido/inválido, palavras-chave,
// fundir, excluir) + ver/mover os textos de natureza de cada grupo (override).
// As alterações ficam locais e só são persistidas no "Salvar".
//
// Performance: a lista é PAGINADA (20/página) e os seletores de grupo (fundir /
// mover) são buscáveis e sob demanda — antes cada linha renderizava um <select>
// com milhares de <option>, o que travava o modal com muitos grupos.
import { useState, useMemo, useCallback } from 'react'
import { normNatureza, slugTermo } from '../../../lib/emergencias.js'

const PAGE = 20

export default function EditorMotivos({ grupos = [], salvando = false, onSalvar, onClose }) {
  const [edits, setEdits] = useState({})
  const [novos, setNovos] = useState([]) // [{ termo, rotulo, invalido, palavras }]
  const [moves, setMoves] = useState({}) // chave(normNatureza) → termo
  const [expandido, setExpandido] = useState(null)
  const [filtro, setFiltro] = useState('todos') // todos | pendentes | invalidos
  const [busca, setBusca] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [pag, setPag] = useState(0)

  // valor efetivo de um grupo (base + edição local)
  const ef = useCallback((g) => (g._novo ? g : { ...g, ...(edits[g.termo] || {}) }), [edits])

  const todos = useMemo(() => {
    const base = grupos.map(ef).filter((g) => !g.arquivado && !g.alias_de)
    return [...base, ...novos]
  }, [grupos, ef, novos])

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

  const pendentes = useMemo(() => todos.filter((g) => !g.classificado).length, [todos])
  const invalidos = useMemo(() => todos.filter((g) => g.invalido).length, [todos])

  // alvos para fundir/mover (termo + rótulo apenas) — lista leve
  const alvos = useMemo(() => todos.map((g) => ({ termo: g.termo, rotulo: g.rotulo })), [todos])

  const totalPags = Math.max(1, Math.ceil(lista.length / PAGE))
  const pagAtual = Math.min(pag, totalPags - 1)
  const visiveis = lista.slice(pagAtual * PAGE, (pagAtual + 1) * PAGE)

  function trocarFiltro(f) { setFiltro(f); setPag(0) }
  function trocarBusca(v) { setBusca(v); setPag(0) }

  // ── ações (dispatcher estável) ─────────────────────────────────────
  const setEdit = useCallback((termo, patch) => setEdits((m) => ({ ...m, [termo]: { ...(m[termo] || {}), ...patch } })), [])
  const setNovo = useCallback((termo, patch) => setNovos((arr) => arr.map((g) => (g.termo === termo ? { ...g, ...patch } : g))), [])

  const dispatch = useCallback((termo, novo, acao, payload) => {
    const patch = (p) => (novo ? setNovo(termo, p) : setEdit(termo, p))
    switch (acao) {
      case 'rotulo': patch({ rotulo: payload }); break
      case 'invalido': patch({ invalido: payload }); break
      case 'addPalavra': {
        const g = (novo ? novos : grupos).find((x) => x.termo === termo)
        const cur = (novo ? g?.palavras : (edits[termo]?.palavras ?? g?.palavras)) || []
        const p = String(payload || '').trim()
        if (p && !cur.some((x) => x.toLowerCase() === p.toLowerCase())) patch({ palavras: [...cur, p] })
        break
      }
      case 'rmPalavra': {
        const g = (novo ? novos : grupos).find((x) => x.termo === termo)
        const cur = (novo ? g?.palavras : (edits[termo]?.palavras ?? g?.palavras)) || []
        patch({ palavras: cur.filter((x) => x !== payload) })
        break
      }
      case 'excluir':
        if (novo) setNovos((arr) => arr.filter((x) => x.termo !== termo))
        else setEdit(termo, { arquivado: true })
        break
      case 'fundir':
        if (!payload || payload === termo) break
        if (novo) setNovos((arr) => arr.filter((x) => x.termo !== termo))
        else setEdit(termo, { alias_de: payload })
        break
      case 'moverTexto':
        setMoves((m) => ({ ...m, [normNatureza(payload.texto)]: payload.alvo }))
        break
      default: break
    }
  }, [setEdit, setNovo, grupos, novos, edits])

  function criarGrupo() {
    const nome = novoNome.trim()
    if (!nome) return
    const termo = slugTermo(nome)
    if (todos.some((g) => g.termo === termo)) { setNovoNome(''); return }
    setNovos((arr) => [...arr, { termo, rotulo: nome, invalido: false, palavras: [], classificado: false, qtd: 0, itens: [], _novo: true }])
    setNovoNome('')
  }

  function salvar() {
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
            <button key={f.id} onClick={() => trocarFiltro(f.id)} className={`px-2 py-1 rounded-sm font-semibold ${filtro === f.id ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f.label}</button>
          ))}
          <input value={busca} onChange={(e) => trocarBusca(e.target.value)} placeholder="Buscar grupo…" aria-label="Buscar grupo de motivo" className="ml-auto border border-gray-200 rounded-sm px-2 py-1 text-xs w-32" />
          <div className="flex items-center gap-1">
            <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && criarGrupo()} placeholder="Novo grupo…" aria-label="Nome do novo grupo" className="border border-gray-200 rounded-sm px-2 py-1 text-xs w-28" />
            <button onClick={criarGrupo} className="px-2 py-1 rounded-sm bg-green-600 text-white font-semibold hover:bg-green-700">+ Criar</button>
          </div>
        </div>

        {/* Lista de grupos (paginada) */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
          {visiveis.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-400">Nenhum grupo neste filtro.</p>}
          {visiveis.map((g) => (
            <GrupoLinha
              key={g.termo}
              g={g}
              aberto={expandido === g.termo}
              alvos={alvos}
              moves={moves}
              onToggleAberto={() => setExpandido(expandido === g.termo ? null : g.termo)}
              dispatch={dispatch}
            />
          ))}
        </div>

        {/* Paginação + rodapé */}
        <div className="flex items-center justify-between gap-2 px-5 py-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            {totalPags > 1 && (
              <>
                <button onClick={() => setPag((p) => Math.max(0, p - 1))} disabled={pagAtual === 0} className="px-2 py-1 rounded-sm border border-gray-200 disabled:opacity-40">‹ Anterior</button>
                <span>Pág. {pagAtual + 1}/{totalPags}</span>
                <button onClick={() => setPag((p) => Math.min(totalPags - 1, p + 1))} disabled={pagAtual >= totalPags - 1} className="px-2 py-1 rounded-sm border border-gray-200 disabled:opacity-40">Próxima ›</button>
                <span className="text-gray-400">({lista.length.toLocaleString('pt-BR')} grupos)</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-sm hover:bg-gray-50">Cancelar</button>
            <button onClick={salvar} disabled={salvando} className="px-4 py-1.5 text-xs font-semibold text-white bg-navy rounded-sm hover:bg-navy-light disabled:opacity-60">
              {salvando ? 'Salvando…' : 'Salvar classificação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Seletor de grupo buscável (sob demanda, no máx. 40 itens) ─────────
function SeletorGrupo({ alvos, onPick, onCancel, placeholder = 'Buscar grupo…' }) {
  const [q, setQ] = useState('')
  const filtrados = useMemo(() => {
    const b = q.trim().toLowerCase()
    const arr = b ? alvos.filter((a) => a.rotulo.toLowerCase().includes(b)) : alvos
    return arr.slice(0, 40)
  }, [alvos, q])
  return (
    <div className="absolute right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl w-60 p-1.5">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="w-full text-[11px] border border-gray-200 rounded-sm px-2 py-1 mb-1" />
      <div className="max-h-44 overflow-y-auto">
        {filtrados.map((a) => (
          <button key={a.termo} onClick={() => onPick(a.termo)} className="block w-full text-left text-[11px] px-2 py-1 hover:bg-amber-50 rounded-sm truncate">{a.rotulo}</button>
        ))}
        {filtrados.length === 0 && <p className="text-[11px] text-gray-400 px-2 py-1">Nada encontrado.</p>}
      </div>
      <button onClick={onCancel} className="text-[10px] text-gray-400 px-2 py-0.5 mt-0.5 hover:text-gray-600">fechar</button>
    </div>
  )
}

// ── Linha de um grupo (expansível) ───────────────────────────────────
function GrupoLinha({ g, aberto, alvos, moves, onToggleAberto, dispatch }) {
  const [editandoNome, setEditandoNome] = useState(false)
  const [nome, setNome] = useState(g.rotulo)
  const [novaPalavra, setNovaPalavra] = useState('')
  const [buscaTexto, setBuscaTexto] = useState('')
  const [fundirAberto, setFundirAberto] = useState(false)
  const [fundirAlvo, setFundirAlvo] = useState(null)   // pendente de confirmar
  const [moverTextoAtivo, setMoverTextoAtivo] = useState(null)

  const outros = useMemo(() => alvos.filter((a) => a.termo !== g.termo), [alvos, g.termo])
  const rotAlvo = (t) => alvos.find((a) => a.termo === t)?.rotulo || t

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
              onBlur={() => { dispatch(g.termo, g._novo, 'rotulo', nome.trim() || g.rotulo); setEditandoNome(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { dispatch(g.termo, g._novo, 'rotulo', nome.trim() || g.rotulo); setEditandoNome(false) } }}
              className="text-xs font-semibold border border-amber-300 rounded-sm px-1.5 py-0.5 w-full max-w-xs"
            />
          ) : (
            <span className="text-xs font-semibold text-gray-800 cursor-pointer hover:text-navy" onClick={() => { setNome(g.rotulo); setEditandoNome(true) }} title="Clique para renomear">
              {g.rotulo} <span className="text-gray-300">✎</span>
            </span>
          )}
          <span className="text-[10px] text-gray-400 ml-2">{(g.qtd || 0).toLocaleString('pt-BR')} processo(s)</span>
          {!g.classificado && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm ml-1">NOVO</span>}
          {g._novo && <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-sm ml-1">CRIADO</span>}
        </div>

        {/* toggle válido/inválido */}
        <div className="flex rounded-md overflow-hidden border border-gray-200 shrink-0">
          <button onClick={() => dispatch(g.termo, g._novo, 'invalido', false)} className={`px-2.5 py-1 text-[11px] font-semibold ${!g.invalido ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Válido</button>
          <button onClick={() => dispatch(g.termo, g._novo, 'invalido', true)} className={`px-2.5 py-1 text-[11px] font-semibold ${g.invalido ? 'bg-red text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Inválido</button>
        </div>

        {/* fundir (seletor buscável + confirmação com ✓) */}
        <div className="relative shrink-0">
          {fundirAlvo ? (
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-gray-500 truncate max-w-[90px]" title={rotAlvo(fundirAlvo)}>→ {rotAlvo(fundirAlvo)}</span>
              <button onClick={() => { dispatch(g.termo, g._novo, 'fundir', fundirAlvo); setFundirAlvo(null) }} className="w-5 h-5 rounded-sm bg-green-600 text-white font-bold hover:bg-green-700" title="Confirmar fusão">✓</button>
              <button onClick={() => setFundirAlvo(null)} className="w-5 h-5 rounded-sm border border-gray-200 text-gray-400 hover:text-red" title="Cancelar">✕</button>
            </div>
          ) : (
            <button onClick={() => setFundirAberto((v) => !v)} className="text-[10px] border border-gray-200 rounded-sm px-1.5 py-1 text-gray-500 hover:bg-gray-50" title="Fundir este grupo em outro">Fundir…</button>
          )}
          {fundirAberto && !fundirAlvo && (
            <SeletorGrupo alvos={outros} placeholder="Fundir em…" onPick={(alvo) => { setFundirAlvo(alvo); setFundirAberto(false) }} onCancel={() => setFundirAberto(false)} />
          )}
        </div>

        {/* excluir */}
        <button onClick={() => dispatch(g.termo, g._novo, 'excluir')} className="text-[10px] text-red border border-red/30 rounded-sm px-1.5 py-1 hover:bg-red/5 shrink-0" title="Excluir grupo">Excluir</button>
      </div>

      {aberto && (
        <div className="mt-2 ml-6 space-y-2">
          {/* palavras-chave */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Palavras-chave:</span>
            {(g.palavras || []).length === 0 && <span className="text-[10px] text-gray-300">(nenhuma — usa o vocabulário automático)</span>}
            {(g.palavras || []).map((p) => (
              <span key={p} className="text-[10px] bg-navy/10 text-navy rounded-sm px-1.5 py-0.5 flex items-center gap-1">
                {p}<button onClick={() => dispatch(g.termo, g._novo, 'rmPalavra', p)} className="text-navy/50 hover:text-red" aria-label={`Remover palavra-chave ${p}`}>×</button>
              </span>
            ))}
            <input
              value={novaPalavra} onChange={(e) => setNovaPalavra(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { dispatch(g.termo, g._novo, 'addPalavra', novaPalavra); setNovaPalavra('') } }}
              placeholder="+ palavra" aria-label="Nova palavra-chave" className="text-[10px] border border-gray-200 rounded-sm px-1.5 py-0.5 w-24"
            />
          </div>
          {/* textos do grupo */}
          <div>
            <input value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} placeholder="Buscar no texto da natureza…" aria-label="Buscar no texto da natureza" className="text-[11px] border border-gray-200 rounded-sm px-2 py-1 w-full mb-1" />
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-sm divide-y divide-gray-50">
              {textos.length === 0 && <p className="px-2 py-3 text-center text-[11px] text-gray-400">Nenhum texto.</p>}
              {textos.map((t) => {
                const movidoPara = moves[normNatureza(t.texto)]
                const ativo = moverTextoAtivo === t.texto
                return (
                  <div key={t.texto} className="flex items-center gap-2 px-2 py-1 relative">
                    <span className="flex-1 text-[11px] text-gray-600 truncate" title={t.texto}>{t.texto}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{t.qtd}×</span>
                    {movidoPara
                      ? <span className="text-[10px] text-green-700 shrink-0">→ {rotAlvo(movidoPara)}</span>
                      : (
                        <div className="relative shrink-0">
                          <button onClick={() => setMoverTextoAtivo(ativo ? null : t.texto)} className="text-[10px] border border-gray-200 rounded-sm px-1 py-0.5 text-gray-500 hover:bg-gray-50" title="Mover este texto para outro grupo">mover →</button>
                          {ativo && (
                            <SeletorGrupo alvos={outros} placeholder="Mover para…" onPick={(alvo) => { dispatch(g.termo, g._novo, 'moverTexto', { texto: t.texto, alvo }); setMoverTextoAtivo(null) }} onCancel={() => setMoverTextoAtivo(null)} />
                          )}
                        </div>
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
