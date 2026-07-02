import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { traduzErro } from '../lib/mensagens.js'
import { LoadingInline } from './Loading.jsx'
import { fmtDataHora, fmtDataSP } from '../lib/aggregations.js'
import AtualizarDados from './AtualizarDados.jsx'
import ThSort from './ThSort.jsx'

function ModalConfirmacao({ titulo, mensagem, alerta, onConfirmar, onCancelar }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-conf-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-red-100">
            <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 id="modal-conf-titulo" className="text-base font-bold text-gray-900">{titulo}</h2>
            <p className="text-sm text-gray-600 mt-1">{mensagem}</p>
            {alerta && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2">{alerta}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm rounded border border-grey-line text-gray-600 hover:bg-grey-bg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm rounded bg-red font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

function sortArr(arr, key, dir, getValue) {
  if (!key) return arr
  return [...arr].sort((a, b) => {
    const va = getValue ? getValue(a, key) : (a[key] ?? '')
    const vb = getValue ? getValue(b, key) : (b[key] ?? '')
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', {
            sensitivity: 'base',
          })
    return dir === 'asc' ? cmp : -cmp
  })
}

// "Histórico de Uploads" (emergências) saiu daqui: é a mesma informação da
// aba "Histórico" dentro da tela de Emergências (decisão de 12/06). O
// histórico de imports do Sistema Geo fica na aba "Atualizar Dados".
const TABS = [
  { label: 'Usuários', icon: '👤' },
  { label: 'Perfis de Acesso', icon: '🛡️' },
  { label: 'Atualizar Dados', icon: '🔄' },
  { label: 'Log de Acessos', icon: '📋' },
]

export default function AdminPanel({ abaAtiva = 0 }) {
  return (
    <section className="bg-white rounded-lg shadow p-5">
      {abaAtiva === 0 && <AbaUsuarios />}
      {abaAtiva === 1 && <AbaPerfis />}
      {abaAtiva === 2 && <AtualizarDados />}
      {abaAtiva === 3 && <AbaLogs />}
    </section>
  )
}

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
function AbaPerfis() {
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
          className="text-xs bg-navy text-white px-3 py-1.5 rounded hover:bg-navy-light transition-colors"
        >
          {editando !== null ? 'Cancelar' : '+ Novo perfil'}
        </button>
      </div>

      {msg && (
        <div
          className={`flex items-start justify-between gap-2 text-xs rounded p-2 mb-3 ${msg.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
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
          className="mb-4 p-3 bg-grey-bg rounded border border-grey-line space-y-3"
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
                className="w-full border border-grey-line rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            <div className="flex-[2]">
              <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="ex: Acesso de leitura aos dados do Sistema Geo"
                className="w-full border border-grey-line rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy"
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
                  className="bg-white rounded border border-grey-line p-2"
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
                        className="flex items-start gap-2 cursor-pointer hover:bg-grey-bg rounded px-1 py-0.5"
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
            <details className="border border-grey-line rounded bg-grey-bg/50">
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
              className="bg-navy text-white px-4 py-1.5 rounded text-xs hover:bg-navy-light disabled:opacity-50 transition-colors"
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

const INTERNAL_DOMAIN = 'obras.app'

/* ------------------------------------------------------------------ */
/* Aba Usuários                                                         */
/* ------------------------------------------------------------------ */
function AbaUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [perfis, setPerfis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [meuId, setMeuId] = useState(null)
  // Form de criação (apenas username interno; e-mail só o usuário mestre)
  const [novoLogin, setNovoLogin] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoRole, setNovoRole] = useState('user') // 'user' | 'admin'
  const [novoPerfilId, setNovoPerfilId] = useState('')
  const [criando, setCriando] = useState(false)
  const [msgCriacao, setMsgCriacao] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  // Reset de senha
  const [resetUserId, setResetUserId] = useState(null)
  const [resetNome, setResetNome] = useState('')
  const [resetSenha, setResetSenha] = useState('')
  const [resetando, setResetando] = useState(false)
  const [msgReset, setMsgReset] = useState(null)
  // Exclusão
  const [excluindoId, setExcluindoId] = useState(null)
  // Mensagem de ação (troca de perfil / exclusão) — substitui os alert() nativos
  const [msgAcao, setMsgAcao] = useState(null)
  const [confirmarExclusaoUser, setConfirmarExclusaoUser] = useState(null)
  const [sortKeyUser, setSortKeyUser] = useState(null)
  const [sortDirUser, setSortDirUser] = useState('asc')

  function handleSortUser(key) {
    if (key === sortKeyUser)
      setSortDirUser((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKeyUser(key)
      setSortDirUser('asc')
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeuId(data?.user?.id || null))
  }, [])

  async function carregar() {
    setCarregando(true)
    setErro(null)
    const [rUsuarios, rPerfis] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('perfis_acesso').select('id, nome').order('nome'),
    ])
    if (rUsuarios.error) setErro(traduzErro(rUsuarios.error.message))
    else setUsuarios(rUsuarios.data || [])
    if (!rPerfis.error) setPerfis(rPerfis.data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const usuariosOrdenados = useMemo(
    () =>
      sortArr(usuarios, sortKeyUser, sortDirUser, (u, k) => {
        if (k === 'login') {
          const interno = u.email?.endsWith('@' + INTERNAL_DOMAIN)
          return interno
            ? (u.username || u.email?.split('@')[0] || '')
            : (u.email || '')
        }
        if (k === 'ativo') return u.ativo ? 1 : 0
        if (k === 'primeiro_acesso') return u.primeiro_acesso ? 1 : 0
        return u[k] ?? ''
      }),
    [usuarios, sortKeyUser, sortDirUser]
  )

  async function toggleAtivo(id, atual) {
    const { error } = await supabase
      .from('profiles')
      .update({ ativo: !atual })
      .eq('id', id)
    if (!error)
      setUsuarios((us) =>
        us.map((u) => (u.id === id ? { ...u, ativo: !atual } : u))
      )
  }

  async function toggleRole(id, atual) {
    const novoRole = atual === 'admin' ? 'user' : 'admin'
    const { error } = await supabase
      .from('profiles')
      .update({ role: novoRole })
      .eq('id', id)
    if (!error)
      setUsuarios((us) =>
        us.map((u) => (u.id === id ? { ...u, role: novoRole } : u))
      )
  }

  async function trocarPerfilAcesso(id, perfilId) {
    const valor = perfilId === '' ? null : Number(perfilId)
    const { error } = await supabase
      .from('profiles')
      .update({ perfil_acesso_id: valor })
      .eq('id', id)
    if (error)
      setMsgAcao({
        tipo: 'erro',
        texto: `Erro ao trocar o perfil de acesso: ${traduzErro(error.message)}`,
      })
    else
      setUsuarios((us) =>
        us.map((u) => (u.id === id ? { ...u, perfil_acesso_id: valor } : u))
      )
  }

  async function handleCriar(e) {
    e.preventDefault()
    setCriando(true)
    setMsgCriacao(null)
    try {
      // Cadastro só por username interno. O único usuário por e-mail é o
      // mestre (já existente); novos acessos são sempre por username, criados
      // via RPC que insere direto em auth.users, pulando a validação de
      // e-mail do Supabase Auth (e o sign-up público, que fica desabilitado).
      const username = novoLogin.trim().toLowerCase()
      const { error } = await supabase.rpc('admin_create_internal_user', {
        p_username: username,
        p_password: novaSenha,
        p_role: novoRole,
        p_perfil_id:
          novoRole === 'user' && novoPerfilId ? Number(novoPerfilId) : null,
      })
      if (error) throw error
      const nomePerfil =
        novoRole === 'admin'
          ? 'Admin (acesso total)'
          : perfis.find((p) => p.id === Number(novoPerfilId))?.nome ||
            'sem perfil de acesso (não verá nenhum módulo)'
      setMsgCriacao({
        tipo: 'ok',
        texto: `Usuário "${username}" criado — ${nomePerfil}. 1º acesso pendente até o usuário definir a senha pessoal no primeiro login.`,
      })
      setNovoLogin('')
      setNovaSenha('')
      setNovoRole('user')
      setNovoPerfilId('')
      setMostrarForm(false)
      setTimeout(carregar, 500)
    } catch (err) {
      setMsgCriacao({ tipo: 'erro', texto: traduzErro(err.message) })
    } finally {
      setCriando(false)
    }
  }

  function handleExcluirUsuario(u) {
    const nome =
      (u.email?.endsWith('@' + INTERNAL_DOMAIN)
        ? u.username || u.email?.split('@')[0]
        : u.email) || u.id
    setConfirmarExclusaoUser({ u, nome })
  }

  async function confirmarExcluirUser() {
    const { u } = confirmarExclusaoUser
    setConfirmarExclusaoUser(null)
    setExcluindoId(u.id)
    const { error } = await supabase.rpc('admin_delete_user', {
      p_user_id: u.id,
    })
    if (error) {
      setMsgAcao({
        tipo: 'erro',
        texto: `Erro ao excluir: ${traduzErro(error.message)}`,
      })
    } else {
      setUsuarios((us) => us.filter((x) => x.id !== u.id))
    }
    setExcluindoId(null)
  }

  async function handleReset(e) {
    e.preventDefault()
    if (!resetSenha || resetSenha.length < 6) {
      setMsgReset({ tipo: 'erro', texto: 'Mínimo 6 caracteres.' })
      return
    }
    setResetando(true)
    setMsgReset(null)
    const { error } = await supabase.rpc('admin_reset_user_password', {
      p_user_id: resetUserId,
      p_new_password: resetSenha,
    })
    if (error) {
      setMsgReset({ tipo: 'erro', texto: traduzErro(error.message) })
    } else {
      setMsgReset({
        tipo: 'ok',
        texto:
          'Senha redefinida. O usuário será solicitado a criar uma nova senha no próximo acesso.',
      })
      setResetSenha('')
      setUsuarios((us) =>
        us.map((u) =>
          u.id === resetUserId ? { ...u, primeiro_acesso: true } : u
        )
      )
    }
    setResetando(false)
  }

  if (carregando) return <LoadingInline mensagem="Carregando usuários..." />
  if (erro) return <p className="text-xs text-red-600">{erro}</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-gray-500">
          {usuarios.length} usuário(s) cadastrado(s)
        </p>
        <button
          onClick={() => {
            setMostrarForm((v) => !v)
            setMsgCriacao(null)
          }}
          className="text-xs bg-navy text-white px-3 py-1.5 rounded hover:bg-navy-light transition-colors"
        >
          {mostrarForm ? 'Cancelar' : '+ Novo usuário'}
        </button>
      </div>

      {/* Modal de reset de senha */}
      {resetUserId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-sm font-bold text-navy uppercase mb-1">
              Redefinir senha
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Definir senha temporária para <strong>{resetNome}</strong>. O
              usuário deverá criar uma nova senha no próximo acesso.
            </p>
            <form onSubmit={handleReset} className="space-y-3">
              <input
                type="text"
                value={resetSenha}
                onChange={(e) => setResetSenha(e.target.value)}
                required
                minLength={6}
                placeholder="Nova senha temporária (mín. 6 caracteres)"
                autoFocus
                className="w-full border border-grey-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
              />
              {msgReset && (
                <p
                  className={`text-xs rounded p-2 ${msgReset.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
                >
                  {msgReset.texto}
                </p>
              )}
              {msgReset?.tipo === 'ok' ? (
                <button
                  type="button"
                  onClick={() => {
                    setResetUserId(null)
                    setMsgReset(null)
                    setResetSenha('')
                  }}
                  className="w-full py-1.5 bg-navy text-white text-xs rounded hover:bg-navy-light transition-colors"
                >
                  Ok
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetUserId(null)
                      setMsgReset(null)
                      setResetSenha('')
                    }}
                    className="flex-1 py-1.5 border border-grey-line text-navy text-xs rounded hover:bg-grey-bg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetando}
                    className="flex-1 py-1.5 bg-navy text-white text-xs rounded hover:bg-navy-light disabled:opacity-50 transition-colors"
                  >
                    {resetando ? 'Salvando...' : 'Redefinir'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {mostrarForm && (
        <form
          onSubmit={handleCriar}
          className="mb-4 p-3 bg-grey-bg rounded border border-grey-line space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 uppercase">
              Novo usuário
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={novoLogin}
                onChange={(e) =>
                  setNovoLogin(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))
                }
                required
                placeholder="ex: joao.silva"
                className="w-full border border-grey-line rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                Senha temporária
              </label>
              <input
                type="text"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                className="w-full border border-grey-line rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
          </div>

          {/* Perfil */}
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
              Perfil
            </label>
            <div className="flex rounded border border-grey-line overflow-hidden text-[11px] w-fit">
              <button
                type="button"
                onClick={() => setNovoRole('user')}
                className={`px-3 py-1 ${novoRole === 'user' ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-grey-bg'}`}
              >
                Usuário
              </button>
              <button
                type="button"
                onClick={() => setNovoRole('admin')}
                className={`px-3 py-1 border-l border-grey-line ${novoRole === 'admin' ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-grey-bg'}`}
              >
                Admin
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {novoRole === 'admin'
                ? 'Admins enxergam o sistema inteiro e têm acesso ao painel de configurações.'
                : 'Usuários comuns enxergam apenas os módulos do perfil de acesso escolhido abaixo.'}
            </p>
          </div>

          {/* Perfil de acesso — define quais módulos o usuário enxerga */}
          {novoRole === 'user' && (
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
                Perfil de acesso
              </label>
              <select
                value={novoPerfilId}
                onChange={(e) => setNovoPerfilId(e.target.value)}
                className="border border-grey-line rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="">Sem perfil (não verá nenhum módulo)</option>
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Os perfis são gerenciados na aba "Perfis de Acesso".
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={criando}
              className="bg-navy text-white px-4 py-1.5 rounded text-xs hover:bg-navy-light disabled:opacity-50 transition-colors"
            >
              {criando ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400">
            O usuário fará login com o username (sem @). O 1º acesso fica
            pendente até ele definir a senha pessoal no primeiro login.
          </p>
        </form>
      )}

      {msgCriacao && (
        <p
          className={`text-xs rounded p-2 mb-3 ${msgCriacao.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
        >
          {msgCriacao.texto}
        </p>
      )}

      {msgAcao && (
        <div className="text-xs rounded p-2 mb-3 flex items-start justify-between gap-2 bg-red-50 text-red-600 border border-red-200">
          <span>{msgAcao.texto}</span>
          <button
            onClick={() => setMsgAcao(null)}
            title="Fechar aviso"
            aria-label="Fechar aviso"
            className="text-red-400 hover:text-red-700 font-bold leading-none shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-grey-line text-gray-500 uppercase text-[10px]">
              <ThSort
                colKey="login"
                label="Login / E-mail"
                sortKey={sortKeyUser}
                sortDir={sortDirUser}
                onSort={handleSortUser}
                className="text-left pb-2 pr-4"
              />
              <ThSort
                colKey="role"
                label="Tipo"
                sortKey={sortKeyUser}
                sortDir={sortDirUser}
                onSort={handleSortUser}
                className="text-left pb-2 pr-4"
              />
              <th className="text-left pb-2 pr-4">Perfil de Acesso</th>
              <ThSort
                colKey="ativo"
                label="1º acesso concluído"
                title="Indica se o usuário já concluiu o 1º acesso (definiu a senha pessoal). NÃO é bloqueio de conta — contas são removidas em Excluir, não desativadas."
                sortKey={sortKeyUser}
                sortDir={sortDirUser}
                onSort={handleSortUser}
                className="text-left pb-2 pr-4"
              />
              <ThSort
                colKey="created_at"
                label="Cadastro"
                sortKey={sortKeyUser}
                sortDir={sortDirUser}
                onSort={handleSortUser}
                className="text-left pb-2 pr-4"
              />
              <th className="text-left pb-2 pr-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuariosOrdenados.map((u) => {
              const isInterno = u.email?.endsWith('@' + INTERNAL_DOMAIN)
              const displayLogin = isInterno
                ? u.username || u.email?.split('@')[0]
                : u.email
              return (
                <tr
                  key={u.id}
                  className="border-b border-grey-line/50 hover:bg-grey-bg/50"
                >
                  <td className="py-2 pr-4 max-w-[220px]">
                    <div className="font-medium text-gray-700 truncate">
                      {displayLogin}
                    </div>
                    {isInterno && (
                      <div className="text-[10px] text-gray-400">
                        usuário interno
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => toggleRole(u.id, u.role)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        u.role === 'admin'
                          ? 'bg-navy text-white hover:bg-navy-light'
                          : 'bg-grey-line text-gray-600 hover:bg-grey-bg'
                      }`}
                    >
                      {u.role === 'admin' ? 'Admin' : 'Usuário'}
                    </button>
                  </td>
                  <td className="py-2 pr-4">
                    {u.role === 'admin' ? (
                      <span className="text-[10px] text-gray-400 italic">
                        Acesso total
                      </span>
                    ) : (
                      <select
                        value={u.perfil_acesso_id ?? ''}
                        onChange={(e) =>
                          trocarPerfilAcesso(u.id, e.target.value)
                        }
                        className={`border rounded px-1.5 py-0.5 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-navy max-w-[170px] ${
                          u.perfil_acesso_id == null
                            ? 'border-amber-400 text-amber-700'
                            : 'border-grey-line text-gray-700'
                        }`}
                        title={
                          u.perfil_acesso_id == null
                            ? 'Sem perfil: este usuário não vê nenhum módulo'
                            : 'Trocar o perfil de acesso deste usuário'
                        }
                      >
                        <option value="">Sem perfil</option>
                        {perfis.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => toggleAtivo(u.id, u.ativo)}
                      title={
                        u.ativo
                          ? '1º acesso concluído. Clique para marcar como pendente.'
                          : '1º acesso pendente (usuário ainda não definiu a senha pessoal). Clique para marcar como concluído.'
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        u.ativo
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {u.ativo ? 'Concluído' : 'Pendente'}
                    </button>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">
                    {fmtDataSP(u.created_at)}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setResetUserId(u.id)
                          setResetNome(displayLogin)
                          setResetSenha('')
                          setMsgReset(null)
                        }}
                        className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold hover:underline"
                        title="Redefinir senha deste usuário"
                      >
                        Redefinir senha
                      </button>
                      {u.id !== meuId && (
                        <button
                          onClick={() => handleExcluirUsuario(u)}
                          disabled={excluindoId === u.id}
                          className="text-[10px] text-red-600 hover:text-red-800 font-semibold hover:underline disabled:opacity-50"
                          title="Excluir este usuário"
                        >
                          {excluindoId === u.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {confirmarExclusaoUser && (
        <ModalConfirmacao
          titulo={`Excluir usuário "${confirmarExclusaoUser.nome}"?`}
          mensagem="Esta ação é permanente e remove o login e o perfil de acesso."
          onConfirmar={confirmarExcluirUser}
          onCancelar={() => setConfirmarExclusaoUser(null)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Aba Log de Acessos                                                   */
/* ------------------------------------------------------------------ */
function AbaLogs() {
  const [logs, setLogs] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(key) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) setErro(traduzErro(error.message))
      else setLogs(data || [])
      setCarregando(false)
    }
    carregar()
  }, [])

  const logsOrdenados = useMemo(
    () => sortArr(logs, sortKey, sortDir),
    [logs, sortKey, sortDir]
  )

  if (carregando) return <LoadingInline mensagem="Carregando logs..." />
  if (erro) return <p className="text-xs text-red-600">{erro}</p>

  const thProps = { sortKey, sortDir, onSort: handleSort }

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-gray-500 mb-3">
        {logs.length} registro(s) mais recentes
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-grey-line text-gray-500 uppercase text-[10px]">
            <ThSort colKey="email" label="Email" {...thProps} className="text-left pb-2 pr-4" />
            <ThSort colKey="evento" label="Evento" {...thProps} className="text-left pb-2 pr-4" />
            <ThSort colKey="created_at" label="Data / Hora" {...thProps} className="text-left pb-2" />
          </tr>
        </thead>
        <tbody>
          {logsOrdenados.map((l) => (
            <tr
              key={l.id}
              className="border-b border-grey-line/50 hover:bg-grey-bg/50"
            >
              <td className="py-2 pr-4 text-gray-700">{l.email}</td>
              <td className="py-2 pr-4">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    l.evento === 'login'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {l.evento}
                </span>
              </td>
              <td className="py-2 text-gray-500">
                {l.created_at ? fmtDataHora(l.created_at) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
