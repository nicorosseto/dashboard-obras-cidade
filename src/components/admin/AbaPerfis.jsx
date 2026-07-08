// Aba "Perfis de Acesso" do painel de Configurações
// (Fase M5, Frente 3, Etapa 3 — extraído de AdminPanel.jsx).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { traduzErro } from '../../lib/mensagens.js'
import { LoadingInline } from '../Loading.jsx'
import ThSort from '../ThSort.jsx'
import { ModalConfirmacao, sortArr } from './shared.jsx'

const MODULO_LABEL = {
  fiscalizacao:      'Fiscalização',
  sistemaGeo:          'Sistema Geo',
  analise_integrada: 'Análise Integrada',
  emergencias:       'Emergências',
}

// O que cada código de permissão libera na interface (exibido na legenda do formulário)
const PERM_DESCRICAO = {
  'fisc.ver':               'Acessa o módulo de Fiscalização (todas as abas padrão)',
  'fisc.aba_executoras':    'Aba "Executoras" no módulo Fiscalização',
  'geo.ver':                'Acessa o módulo Sistema Geo (todas as abas padrão)',
  'geo.aba_cruzamento':     'Aba "Análise Integrada" no módulo Sistema Geo',
  'geo.aba_subprefeitura':  'Aba "Por Subprefeitura" no módulo Sistema Geo',
  'emerg.ver':              'Acessa o módulo de Emergências',
  'emerg.upload':           'Botão "Atualizar dados" no módulo Emergências (importar planilha)',
  'emerg.aba_processo':     'Aba "Busca por Processo" no módulo Emergências',
  'emerg.aba_prazo48h':     'Aba "Prazo 48h" no módulo Emergências (controle de SLA)',
  'emerg.aba_motivo_invalido': 'Aba "Motivo Inválido" no módulo Emergências (emergências que são manutenção/expansão)',
  'relatorio.ver':          'Acessa o módulo Apresentação (relatório mensal em slides, com download dos dados por slide)',
}

/* ------------------------------------------------------------------ */
/* Aba Perfis de Acesso                                                 */
/* ------------------------------------------------------------------ */
export default function AbaPerfis() {
  const [perfis, setPerfis] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [permPorPerfil, setPermPorPerfil] = useState({}) // {perfilId: Set}
  const [usuariosPorPerfil, setUsuariosPorPerfil] = useState({}) // {perfilId: n}
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [msg, setMsg] = useState(null)
  // Editor (criação ou edição)
  const [editando, setEditando] = useState(null) // null | 'novo' | perfilId
  const [formNome, setFormNome] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formPerms, setFormPerms] = useState(new Set())
  const [salvando, setSalvando] = useState(false)
  const [sortKeyPerfil, setSortKeyPerfil] = useState(null)
  const [sortDirPerfil, setSortDirPerfil] = useState('asc')
  const [confirmarExclusaoPerfil, setConfirmarExclusaoPerfil] = useState(null)

  function handleSortPerfil(key) {
    if (key === sortKeyPerfil)
      setSortDirPerfil((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKeyPerfil(key)
      setSortDirPerfil('asc')
    }
  }

  async function carregar() {
    setCarregando(true)
    setErro(null)
    const [rPerfis, rCat, rPP, rUsers] = await Promise.all([
      supabase.from('perfis_acesso').select('*').order('nome'),
      supabase
        .from('permissoes_catalogo')
        .select('*')
        .order('modulo')
        .order('ordem'),
      supabase.from('perfil_permissoes').select('perfil_id, permissao'),
      supabase.from('profiles').select('id, perfil_acesso_id'),
    ])
    const falha = rPerfis.error || rCat.error || rPP.error || rUsers.error
    if (falha) {
      setErro(traduzErro(falha.message))
      setCarregando(false)
      return
    }
    setPerfis(rPerfis.data || [])
    setCatalogo(rCat.data || [])
    const pp = {}
    for (const { perfil_id, permissao } of rPP.data || []) {
      if (!pp[perfil_id]) pp[perfil_id] = new Set()
      pp[perfil_id].add(permissao)
    }
    setPermPorPerfil(pp)
    const up = {}
    for (const { perfil_acesso_id } of rUsers.data || []) {
      if (perfil_acesso_id != null)
        up[perfil_acesso_id] = (up[perfil_acesso_id] || 0) + 1
    }
    setUsuariosPorPerfil(up)
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const MODULO_ORDEM = ['fiscalizacao', 'sistemaGeo', 'analise_integrada', 'emergencias']
  const modulos = [...new Set(catalogo.map((c) => c.modulo))].sort(
    (a, b) => (MODULO_ORDEM.indexOf(a) + 1 || 99) - (MODULO_ORDEM.indexOf(b) + 1 || 99)
  )

  const perfisOrdenados = useMemo(
    () =>
      sortArr(perfis, sortKeyPerfil, sortDirPerfil, (p, k) => {
        if (k === 'permissoes') return (permPorPerfil[p.id] || new Set()).size
        if (k === 'usuarios') return usuariosPorPerfil[p.id] || 0
        return p[k] ?? ''
      }),
    [perfis, permPorPerfil, usuariosPorPerfil, sortKeyPerfil, sortDirPerfil]
  )

  function abrirNovo() {
    setEditando('novo')
    setFormNome('')
    setFormDescricao('')
    setFormPerms(new Set())
    setMsg(null)
  }

  function abrirEdicao(perfil) {
    setEditando(perfil.id)
    setFormNome(perfil.nome)
    setFormDescricao(perfil.descricao || '')
    setFormPerms(new Set(permPorPerfil[perfil.id] || []))
    setMsg(null)
  }

  function togglePerm(codigo) {
    const next = new Set(formPerms)
    if (next.has(codigo)) next.delete(codigo)
    else next.add(codigo)
    setFormPerms(next)
  }

  // Marcar o módulo marca/desmarca todas as permissões dele de uma vez
  function toggleModulo(modulo) {
    const codigos = catalogo
      .filter((c) => c.modulo === modulo)
      .map((c) => c.codigo)
    const todasMarcadas = codigos.every((c) => formPerms.has(c))
    const next = new Set(formPerms)
    codigos.forEach((c) => (todasMarcadas ? next.delete(c) : next.add(c)))
    setFormPerms(next)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    const nome = formNome.trim()
    if (!nome) return
    setSalvando(true)
    setMsg(null)
    try {
      const { error } = await supabase.rpc('salvar_perfil_acesso', {
        p_nome: nome,
        p_descricao: formDescricao.trim() || null,
        p_permissoes: [...formPerms],
        p_id: editando === 'novo' ? null : editando,
      })
      if (error) throw error
      setMsg({
        tipo: 'ok',
        texto: `Perfil "${nome}" salvo com ${formPerms.size} permissão(ões). Vale imediatamente para todos os usuários deste perfil.`,
      })
      setEditando(null)
      carregar()
    } catch (err) {
      setMsg({ tipo: 'erro', texto: traduzErro(err.message) })
    } finally {
      setSalvando(false)
    }
  }

  function handleExcluir(perfil) {
    const nUsuarios = usuariosPorPerfil[perfil.id] || 0
    setConfirmarExclusaoPerfil({ perfil, nUsuarios })
  }

  async function confirmarExcluirPerfil() {
    const { perfil } = confirmarExclusaoPerfil
    setConfirmarExclusaoPerfil(null)
    setMsg(null)
    const { error } = await supabase
      .from('perfis_acesso')
      .delete()
      .eq('id', perfil.id)
    if (error) setMsg({ tipo: 'erro', texto: traduzErro(error.message) })
    else {
      setMsg({ tipo: 'ok', texto: `Perfil "${perfil.nome}" excluído.` })
      carregar()
    }
  }

  if (carregando) return <LoadingInline mensagem="Carregando perfis..." />
  if (erro) return <p className="text-xs text-red-600">{erro}</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-gray-500">
          {perfis.length} perfil(is) de acesso · Administradores enxergam tudo e
          não precisam de perfil
        </p>
        <button
          onClick={() => (editando !== null ? setEditando(null) : abrirNovo())}
          className="text-xs bg-navy text-white px-3 py-1.5 rounded-sm hover:bg-navy-light transition-colors"
        >
          {editando !== null ? 'Cancelar' : '+ Novo perfil'}
        </button>
      </div>

      {msg && (
        <div
          className={`flex items-start justify-between gap-2 text-xs rounded-sm p-2 mb-3 ${msg.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
        >
          <span>{msg.texto}</span>
          <button
            onClick={() => setMsg(null)}
            className="shrink-0 opacity-60 hover:opacity-100 font-bold leading-none"
            title="Fechar"
          >
            ×
          </button>
        </div>
      )}

      {/* Editor de perfil (criar/editar) */}
      {editando !== null && (
        <form
          onSubmit={handleSalvar}
          className="mb-4 p-3 bg-grey-bg rounded-sm border border-grey-line space-y-3"
        >
          <p className="text-xs font-semibold text-gray-600 uppercase">
            {editando === 'novo' ? 'Novo perfil' : 'Editar perfil'}
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                Nome do perfil
              </label>
              <input
                type="text"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                required
                placeholder="ex: Equipe Sistema Geo"
                className="w-full border border-grey-line rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-navy"
              />
            </div>
            <div className="flex-2">
              <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="ex: Acesso de leitura aos dados do Sistema Geo"
                className="w-full border border-grey-line rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-navy"
              />
            </div>
          </div>

          {/* Matriz de permissões por módulo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {modulos.map((mod) => {
              const itens = catalogo.filter((c) => c.modulo === mod)
              const marcadas = itens.filter((c) =>
                formPerms.has(c.codigo)
              ).length
              const todas = marcadas === itens.length
              return (
                <div
                  key={mod}
                  className="bg-white rounded-sm border border-grey-line p-2"
                >
                  <label className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-grey-line cursor-pointer">
                    <input
                      type="checkbox"
                      checked={todas}
                      ref={(el) => {
                        if (el) el.indeterminate = marcadas > 0 && !todas
                      }}
                      onChange={() => toggleModulo(mod)}
                      className="accent-navy"
                    />
                    <span className="text-xs font-bold text-navy uppercase">
                      {MODULO_LABEL[mod] || mod}
                    </span>
                  </label>
                  <div className="space-y-1">
                    {itens.map((c) => (
                      <label
                        key={c.codigo}
                        className="flex items-start gap-2 cursor-pointer hover:bg-grey-bg rounded-sm px-1 py-0.5"
                        title={c.descricao || ''}
                      >
                        <input
                          type="checkbox"
                          checked={formPerms.has(c.codigo)}
                          onChange={() => togglePerm(c.codigo)}
                          className="accent-navy mt-0.5"
                        />
                        <span className="text-[11px] text-gray-700 leading-tight">
                          {c.nome}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legenda do que cada permissão libera */}
          {catalogo.length > 0 && (
            <details className="border border-grey-line rounded-sm bg-grey-bg/50">
              <summary className="text-[10px] text-gray-500 px-3 py-2 cursor-pointer select-none hover:text-navy">
                ℹ️ O que cada permissão libera na interface?
              </summary>
              <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {catalogo.map((c) => (
                  <div key={c.codigo} className="flex gap-1.5 items-start text-[10px] text-gray-600">
                    <span className="font-mono text-navy/70 shrink-0">{c.codigo}</span>
                    <span>— {PERM_DESCRICAO[c.codigo] || c.descricao || c.nome}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="bg-navy text-white px-4 py-1.5 rounded-sm text-xs hover:bg-navy-light disabled:opacity-50 transition-colors"
            >
              {salvando ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de perfis */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-grey-line text-gray-500 uppercase text-[10px]">
              <ThSort
                colKey="nome"
                label="Perfil"
                sortKey={sortKeyPerfil}
                sortDir={sortDirPerfil}
                onSort={handleSortPerfil}
                className="text-left pb-2 pr-4"
              />
              <ThSort
                colKey="descricao"
                label="Descrição"
                sortKey={sortKeyPerfil}
                sortDir={sortDirPerfil}
                onSort={handleSortPerfil}
                className="text-left pb-2 pr-4"
              />
              <ThSort
                colKey="permissoes"
                label="Permissões"
                sortKey={sortKeyPerfil}
                sortDir={sortDirPerfil}
                onSort={handleSortPerfil}
                className="text-right pb-2 pr-4"
              />
              <ThSort
                colKey="usuarios"
                label="Usuários"
                sortKey={sortKeyPerfil}
                sortDir={sortDirPerfil}
                onSort={handleSortPerfil}
                className="text-right pb-2 pr-4"
              />
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {perfisOrdenados.map((p) => (
              <tr
                key={p.id}
                className="border-b border-grey-line/50 hover:bg-grey-bg/50"
              >
                <td className="py-2 pr-4 font-medium text-gray-700">
                  {p.nome}
                </td>
                <td className="py-2 pr-4 text-gray-500 max-w-[300px] truncate">
                  {p.descricao || '—'}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {(permPorPerfil[p.id] || new Set()).size}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {usuariosPorPerfil[p.id] || 0}
                </td>
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => abrirEdicao(p)}
                      className="text-[10px] text-navy hover:text-navy-light font-semibold hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleExcluir(p)}
                      className="text-[10px] text-red-600 hover:text-red-800 font-semibold hover:underline"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirmarExclusaoPerfil && (
        <ModalConfirmacao
          titulo={`Excluir perfil "${confirmarExclusaoPerfil.perfil.nome}"?`}
          mensagem="Esta ação é permanente e não pode ser desfeita."
          alerta={
            confirmarExclusaoPerfil.nUsuarios > 0
              ? `${confirmarExclusaoPerfil.nUsuarios} usuário(s) usam este perfil e ficarão sem acesso a nenhum módulo até receberem outro perfil.`
              : undefined
          }
          onConfirmar={confirmarExcluirPerfil}
          onCancelar={() => setConfirmarExclusaoPerfil(null)}
        />
      )}
    </div>
  )
}
