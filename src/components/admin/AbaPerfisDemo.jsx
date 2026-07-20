// Versão somente-leitura de AbaPerfis.jsx para o modo demo (portfólio
// público). Lista os perfis fictícios (PERFIS_DEMO) e a matriz de
// permissões marcadas de cada um (PERFIL_PERMISSOES_DEMO), usando os
// códigos REAIS do catálogo (TODAS_PERMISSOES) para a matriz sair coerente
// — sem NENHUMA chamada ao Supabase e sem modo de criação/edição.
import { useMemo, useState } from 'react'
import ThSort from '../ThSort.jsx'
import { sortArr } from './shared.jsx'
import {
  PERFIS_DEMO,
  PERFIL_PERMISSOES_DEMO,
  CATALOGO_DEMO,
  USUARIOS_DEMO,
} from '../../lib/demoAdminData.js'
import { MODULO_LABEL, PERM_DESCRICAO } from './AbaPerfis.jsx'

const AVISO = 'Indisponível nesta demonstração pública'

const MODULO_ORDEM = [
  'fiscalizacao',
  'sistemaGeo',
  'analise_integrada',
  'emergencias',
  'multas',
]

export default function AbaPerfisDemo() {
  const [sortKeyPerfil, setSortKeyPerfil] = useState(null)
  const [sortDirPerfil, setSortDirPerfil] = useState('asc')
  const [perfilSelecionado, setPerfilSelecionado] = useState(
    PERFIS_DEMO[0]?.id ?? null
  )

  function handleSortPerfil(key) {
    if (key === sortKeyPerfil)
      setSortDirPerfil((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKeyPerfil(key)
      setSortDirPerfil('asc')
    }
  }

  const usuariosPorPerfil = useMemo(() => {
    const up = {}
    for (const u of USUARIOS_DEMO) {
      if (u.perfil_acesso_id != null)
        up[u.perfil_acesso_id] = (up[u.perfil_acesso_id] || 0) + 1
    }
    return up
  }, [])

  const perfisOrdenados = useMemo(
    () =>
      sortArr(PERFIS_DEMO, sortKeyPerfil, sortDirPerfil, (p, k) => {
        if (k === 'permissoes')
          return (PERFIL_PERMISSOES_DEMO[p.id] || new Set()).size
        if (k === 'usuarios') return usuariosPorPerfil[p.id] || 0
        return p[k] ?? ''
      }),
    [sortKeyPerfil, sortDirPerfil, usuariosPorPerfil]
  )

  const modulos = useMemo(() => {
    const presentes = [...new Set(CATALOGO_DEMO.map((c) => c.modulo))]
    return presentes.sort(
      (a, b) =>
        (MODULO_ORDEM.indexOf(a) + 1 || 99) -
        (MODULO_ORDEM.indexOf(b) + 1 || 99)
    )
  }, [])

  const permsSelecionado =
    perfilSelecionado != null
      ? PERFIL_PERMISSOES_DEMO[perfilSelecionado] || new Set()
      : new Set()

  return (
    <div>
      <div className="text-xs rounded-sm p-2 mb-3 bg-amber-50 border border-amber-200 text-amber-700">
        Dados fictícios — somente leitura nesta demonstração pública (sem
        criação/edição/exclusão de perfis).
      </div>

      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-gray-500">
          {PERFIS_DEMO.length} perfil(is) de acesso · Administradores enxergam
          tudo e não precisam de perfil
        </p>
        <button
          type="button"
          disabled
          title={AVISO}
          className="text-xs bg-navy text-white px-3 py-1.5 rounded-sm opacity-50 cursor-not-allowed"
        >
          + Novo perfil
        </button>
      </div>

      {/* Matriz de permissões do perfil selecionado (somente leitura) */}
      {perfilSelecionado != null && (
        <div className="mb-4 p-3 bg-grey-bg rounded-sm border border-grey-line space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-gray-500 font-semibold uppercase">
              Ver permissões do perfil
            </label>
            <select
              value={perfilSelecionado}
              onChange={(e) => setPerfilSelecionado(Number(e.target.value))}
              className="border border-grey-line rounded-sm px-2 py-1 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-navy"
            >
              {PERFIS_DEMO.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {modulos.map((mod) => {
              const itens = CATALOGO_DEMO.filter((c) => c.modulo === mod)
              const marcadas = itens.filter((c) =>
                permsSelecionado.has(c.codigo)
              ).length
              const todas = marcadas === itens.length && itens.length > 0
              return (
                <div
                  key={mod}
                  className="bg-white rounded-sm border border-grey-line p-2"
                >
                  <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-grey-line">
                    <input
                      type="checkbox"
                      disabled
                      checked={todas}
                      ref={(el) => {
                        if (el) el.indeterminate = marcadas > 0 && !todas
                      }}
                      className="accent-navy"
                    />
                    <span className="text-xs font-bold text-navy uppercase">
                      {MODULO_LABEL[mod] || mod}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {itens.map((c) => (
                      <label
                        key={c.codigo}
                        className="flex items-start gap-2 px-1 py-0.5"
                        title={PERM_DESCRICAO[c.codigo] || c.codigo}
                      >
                        <input
                          type="checkbox"
                          disabled
                          checked={permsSelecionado.has(c.codigo)}
                          className="accent-navy mt-0.5"
                        />
                        <span className="text-[11px] text-gray-700 leading-tight">
                          {PERM_DESCRICAO[c.codigo] || c.codigo}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
                  {(PERFIL_PERMISSOES_DEMO[p.id] || new Set()).size}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {usuariosPorPerfil[p.id] || 0}
                </td>
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setPerfilSelecionado(p.id)}
                      className="text-[10px] text-navy hover:text-navy-light font-semibold hover:underline"
                    >
                      Ver permissões
                    </button>
                    <span
                      title={AVISO}
                      className="text-[10px] text-gray-300 font-semibold cursor-not-allowed pointer-events-none"
                    >
                      Excluir
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
