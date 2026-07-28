import { useMemo, useState } from 'react'
import { fmtNumero, fmtAreaDecimal } from '../../../lib/aggregations.js'
import {
  inconsistenciasGt,
  conferirDashVsBase,
  textoTrechoGt,
} from '../../../lib/gtObras.js'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'
import { KpiCard, PaginacaoBusca } from '../emerg/shared.jsx'
import { StatusGrupoBadge } from './shared.jsx'
import { NAVY, RED } from '../../../lib/cores.js'

const PAGE_SIZE = 30

const COLUNAS = [
  { key: 'linha_planilha', label: 'Linha da Planilha' },
  { key: 'num_processo', label: 'Nº Processo (cru)' },
  { key: 'permissionaria', label: 'Permissionária' },
  { key: 'subprefeitura', label: 'Subprefeitura' },
  { key: 'nome_via', label: 'Via' },
  { key: 'status', label: 'Status' },
  { key: 'area_m2', label: 'Área (m²)', transform: (v) => fmtAreaDecimal(v) },
]

// Mesmo padrão de colunas da aba Lista (AbaGtLista.jsx), com a "Linha da
// Planilha" a mais (útil aqui: as tabelas de inconsistência existem para
// achar e corrigir a linha errada direto na planilha [GT - Obras]).
// ⚠️ Cada linha destas tabelas é uma VIA crua (não agrupada por processo,
// ao contrário da Lista) — por isso "Vias" mostra uma via só, sem o "N
// vias" da Lista, e a metragem é a da própria via, não um total somado.
const COLUNAS_ESTILO_LISTA = [
  { key: 'linha_planilha', label: 'Linha da Planilha' },
  { key: 'num_processo', label: 'Nº Processo' },
  {
    key: '_permissionaria_exibir',
    label: 'Permissionária',
    transform: (v, r) => v || r?.permissionaria || '—',
  },
  { key: 'subprefeitura', label: 'Subprefeitura' },
  {
    key: 'nome_via',
    label: 'Vias (nome — trecho — recape)',
    transform: (_, r) => {
      const trecho = textoTrechoGt(r)
      return (
        <>
          {r.nome_via ? (
            <strong>{r.nome_via}</strong>
          ) : (
            !trecho && <span className="text-gray-400">(via não informada)</span>
          )}
          {r.nome_via && trecho && ' — '}
          {trecho}
          {r.situacao_recape_norm && (
            <span className="text-gray-400"> ({r.situacao_recape_norm})</span>
          )}
        </>
      )
    },
  },
  { key: 'status', label: 'Status' },
  {
    key: 'status_grupo',
    label: 'Situação',
    transform: (v) => <StatusGrupoBadge grupo={v} />,
  },
  { key: 'area_m2', label: 'Metragem (m²)', transform: (v) => fmtAreaDecimal(v) },
  { key: '_status_geo', label: 'Status Sistema Geo', transform: (v) => v || '—' },
]

function TabelaGrupo({ titulo, linhas, cor, modulo, colunasExtra }) {
  const [pag, setPag] = useState(0)
  const colunas = colunasExtra || COLUNAS
  const pagina = linhas.slice(pag * PAGE_SIZE, (pag + 1) * PAGE_SIZE)
  const totalPag = Math.ceil(linhas.length / PAGE_SIZE)

  return (
    <div
      className="bg-white rounded-md shadow-card p-4 space-y-3"
      data-tour="gt-inconsistencias-tabela"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: cor }}>
          {titulo} ({fmtNumero(linhas.length)})
        </h3>
        <BotaoExportarGrafico
          dados={linhas}
          colunas={colunas}
          titulo={titulo}
          modulo={modulo}
        />
      </div>
      {linhas.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">
          Nenhuma linha nesta situação.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-sm border border-grey-line">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-navy text-white text-left">
                  {colunas.map((c) => (
                    <th key={c.key} className="p-2 whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagina.map((l, i) => (
                  <tr key={l.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}>
                    {colunas.map((c) => (
                      <td key={c.key} className="p-2 whitespace-nowrap">
                        {c.transform
                          ? c.transform(l[c.key], l)
                          : (l[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginacaoBusca pag={pag} total={totalPag} onChange={setPag} count={linhas.length} />
        </>
      )}
    </div>
  )
}

// "Raio-x" das inconsistências achadas na análise da planilha (seção 8.3 do
// plano) — o diferencial do módulo: aponta o erro da própria planilha em vez
// de escondê-lo. Dashboard é read-only, a correção é sempre feita na
// planilha [GT - Obras] (a próxima sincronização traz o dado corrigido).
export default function AbaGtInconsistencias({ linhasCruzadas, gtDash }) {
  const grupos = useMemo(() => inconsistenciasGt(linhasCruzadas), [linhasCruzadas])
  const divergenciasDash = useMemo(() => conferirDashVsBase(gtDash), [gtDash])

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-grey-line bg-white px-4 py-3 text-xs text-gray-600 shadow-card">
        <span aria-hidden className="text-sm leading-none">
          💡
        </span>
        <span>
          Este dashboard é <strong>somente leitura</strong>: a correção destas
          linhas é feita <strong>na planilha "[GT - Obras]"</strong> (Google
          Drive) — a próxima sincronização traz o dado já corrigido.
        </span>
      </div>

      <div
        className="bg-white rounded-md shadow-card p-4 space-y-3"
        data-tour="gt-inconsistencias-dash"
      >
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: RED }}>
          Divergência DASH × Base Recalculada ({fmtNumero(divergenciasDash.length)})
        </h3>
        {divergenciasDash.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            Nenhuma divergência encontrada entre o painel DASH e a base recalculada.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-grey-line">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-navy text-white text-left">
                  <th className="p-2 whitespace-nowrap">Campo</th>
                  <th className="p-2 whitespace-nowrap text-right">Soma dos Anos</th>
                  <th className="p-2 whitespace-nowrap text-right">Total Geral (DASH)</th>
                  <th className="p-2 whitespace-nowrap text-right">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {divergenciasDash.map((d, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}>
                    <td className="p-2 whitespace-nowrap">{d.campo}</td>
                    <td className="p-2 whitespace-nowrap text-right tabular-nums">
                      {fmtNumero(d.somaDosAnos)}
                    </td>
                    <td className="p-2 whitespace-nowrap text-right tabular-nums">
                      {fmtNumero(d.totalGeralDeclarado)}
                    </td>
                    <td className="p-2 whitespace-nowrap text-right tabular-nums font-bold text-red">
                      {d.diferenca > 0 ? '+' : ''}
                      {fmtNumero(d.diferenca)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-gray-400">
          Compara a soma dos 3 blocos anuais (2023 + 2024 + 2025/2026) do
          painel DASH contra o bloco "Total Geral" da mesma planilha — quando
          divergem, é erro de fórmula da própria planilha, não do dashboard.
        </p>
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        data-tour="gt-inconsistencias-kpis"
      >
        <KpiCard label="Sem Nº de Processo" valor={grupos.semProcesso.length} cor={NAVY} />
        <KpiCard
          label="Processo Não Encontrado"
          valor={grupos.processoNaoEncontrado.length}
          cor={RED}
        />
        <KpiCard label="Duplicados" valor={grupos.duplicados.length} cor="#D97706" />
        <KpiCard
          label="Grafias Ambíguas"
          valor={grupos.situacaoRecapeAmbigua.length}
          cor="#8B5CF6"
        />
      </div>

      <TabelaGrupo
        titulo="Sem número de processo"
        linhas={grupos.semProcesso}
        cor={NAVY}
        modulo="gt-sem-processo"
      />
      <TabelaGrupo
        titulo="Processo não encontrado (não bate com Sistema Geo/Fiscalização)"
        linhas={grupos.processoNaoEncontrado}
        cor={RED}
        modulo="gt-processo-nao-encontrado"
        colunasExtra={COLUNAS_ESTILO_LISTA}
      />
      <TabelaGrupo
        titulo="Processos duplicados (mesmo processo e via repetidos)"
        linhas={grupos.duplicados}
        cor="#D97706"
        modulo="gt-duplicados"
        colunasExtra={COLUNAS_ESTILO_LISTA}
      />
      <TabelaGrupo
        titulo="Grafias ambíguas na situação do recape"
        linhas={grupos.situacaoRecapeAmbigua}
        cor="#8B5CF6"
        modulo="gt-grafias-ambiguas"
        colunasExtra={[
          { key: 'linha_planilha', label: 'Linha da Planilha' },
          { key: 'num_processo', label: 'Nº Processo (cru)' },
          { key: 'permissionaria', label: 'Permissionária' },
          { key: 'situacao_recape', label: 'Situação Recape (cru)' },
          { key: 'situacao_recape_norm', label: 'Situação Recape (normalizada)' },
        ]}
      />
    </div>
  )
}
