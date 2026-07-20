// Versão somente-leitura de AbaUsuarios.jsx para o modo demo (portfólio
// público). Mesma tabela/colunas do painel real, alimentada por
// USUARIOS_DEMO/PERFIS_DEMO (src/lib/demoAdminData.js) — sem NENHUMA
// chamada ao Supabase e sem nenhuma ação (criar/editar/excluir/redefinir
// senha) funcionando de verdade.
import { useMemo, useState } from 'react'
import { fmtDataSP } from '../../lib/aggregations.js'
import { USUARIOS_DEMO, PERFIS_DEMO } from '../../lib/demoAdminData.js'
import ThSort from '../ThSort.jsx'
import { sortArr } from './shared.jsx'
import { loginDisplay } from './AbaUsuarios.jsx'

const AVISO = 'Indisponível nesta demonstração pública'

export default function AbaUsuariosDemo() {
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

  const usuariosOrdenados = useMemo(
    () =>
      sortArr(USUARIOS_DEMO, sortKeyUser, sortDirUser, (u, k) => {
        if (k === 'login') return loginDisplay(u)
        if (k === 'ativo') return u.ativo ? 1 : 0
        return u[k] ?? ''
      }),
    [sortKeyUser, sortDirUser]
  )

  return (
    <div>
      <div className="text-xs rounded-sm p-2 mb-3 bg-amber-50 border border-amber-200 text-amber-700">
        Dados fictícios — ações desabilitadas nesta demonstração pública.
      </div>

      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-gray-500">
          {USUARIOS_DEMO.length} usuário(s) cadastrado(s)
        </p>
        <button
          type="button"
          disabled
          title={AVISO}
          className="text-xs bg-navy text-white px-3 py-1.5 rounded-sm opacity-50 cursor-not-allowed"
        >
          + Novo usuário
        </button>
      </div>

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
                    <div className="text-[10px] text-gray-400">
                      usuário interno
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.role === 'admin'
                          ? 'bg-navy text-white'
                          : 'bg-grey-line text-gray-600'
                      }`}
                    >
                      {u.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {u.role === 'admin' ? (
                      <span className="text-[10px] text-gray-400 italic">
                        Acesso total
                      </span>
                    ) : (
                      <select
                        disabled
                        value={u.perfil_acesso_id ?? ''}
                        title={AVISO}
                        onChange={() => {}}
                        className={`border rounded px-1.5 py-0.5 text-[10px] bg-gray-50 max-w-[170px] cursor-not-allowed ${
                          u.perfil_acesso_id == null
                            ? 'border-amber-400 text-amber-700'
                            : 'border-grey-line text-gray-700'
                        }`}
                      >
                        <option value="">Sem perfil</option>
                        {PERFIS_DEMO.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      title="1º acesso concluído. Indisponível para alterar nesta demonstração pública."
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.ativo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {u.ativo ? 'Concluído' : 'Pendente'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">
                    {fmtDataSP(u.created_at)}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <span
                        title={AVISO}
                        className="text-[10px] text-gray-300 font-semibold cursor-not-allowed pointer-events-none"
                      >
                        Redefinir senha
                      </span>
                      <span
                        title={AVISO}
                        className="text-[10px] text-gray-300 font-semibold cursor-not-allowed pointer-events-none"
                      >
                        Excluir
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
