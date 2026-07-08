// Aba "Usuários" do painel de Configurações
// (Fase M5, Frente 3, Etapa 3 — extraído de AdminPanel.jsx).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { traduzErro } from '../../lib/mensagens.js'
import { isInternalUser } from '../../lib/auth.js'
import { fmtDataSP } from '../../lib/aggregations.js'
import { LoadingInline } from '../Loading.jsx'
import ThSort from '../ThSort.jsx'
import { ModalConfirmacao, sortArr } from './shared.jsx'

// Login exibido na tela: usuário interno aparece só pelo username (o
// domínio @obras.app é detalhe técnico); externo mostra o e-mail cru.
function loginDisplay(u) {
  return isInternalUser(u.email)
    ? u.username || u.email?.split('@')[0] || ''
    : u.email || ''
}

export default function AbaUsuarios() {
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
        if (k === 'login') return loginDisplay(u)
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
    const nome = loginDisplay(u) || u.id
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
          className="text-xs bg-navy text-white px-3 py-1.5 rounded-sm hover:bg-navy-light transition-colors"
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
                className="w-full border border-grey-line rounded-sm px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-navy"
              />
              {msgReset && (
                <p
                  className={`text-xs rounded-sm p-2 ${msgReset.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
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
                  className="w-full py-1.5 bg-navy text-white text-xs rounded-sm hover:bg-navy-light transition-colors"
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
                    className="flex-1 py-1.5 border border-grey-line text-navy text-xs rounded-sm hover:bg-grey-bg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetando}
                    className="flex-1 py-1.5 bg-navy text-white text-xs rounded-sm hover:bg-navy-light disabled:opacity-50 transition-colors"
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
          className="mb-4 p-3 bg-grey-bg rounded-sm border border-grey-line space-y-3"
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
                className="w-full border border-grey-line rounded-sm px-2 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-navy"
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
                className="w-full border border-grey-line rounded-sm px-2 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-navy"
              />
            </div>
          </div>

          {/* Perfil */}
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">
              Perfil
            </label>
            <div className="flex rounded-sm border border-grey-line overflow-hidden text-[11px] w-fit">
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
                className="border border-grey-line rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-navy"
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
              className="bg-navy text-white px-4 py-1.5 rounded-sm text-xs hover:bg-navy-light disabled:opacity-50 transition-colors"
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
          className={`text-xs rounded-sm p-2 mb-3 ${msgCriacao.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
        >
          {msgCriacao.texto}
        </p>
      )}

      {msgAcao && (
        <div className="text-xs rounded-sm p-2 mb-3 flex items-start justify-between gap-2 bg-red-50 text-red-600 border border-red-200">
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
              const isInterno = isInternalUser(u.email)
              const displayLogin = loginDisplay(u)
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
                        className={`border rounded px-1.5 py-0.5 text-[10px] bg-white focus:outline-hidden focus:ring-1 focus:ring-navy max-w-[170px] ${
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
