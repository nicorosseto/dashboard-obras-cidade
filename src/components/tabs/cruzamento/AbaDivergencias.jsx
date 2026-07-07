// Aba 5 — Divergências. Extraído de PaginaGeo4Cruzamento.jsx (Fase M5, Etapa 2).
import { useState } from 'react'
import { fmtNumero, fmtData } from '../../../lib/aggregations.js'
import { SecaoCard, TabelaPaginada } from './shared.jsx'

export default function AbaDivergencias({ soFisc, divSubpref, soGeo }) {
  const [subAba, setSubAba] = useState('so-fisc')

  const COLS_SO_FISC = [
    { key: 'id_origem',           label: 'Processo' },
    { key: 'permissionaria_orig', label: 'Permissionária', render: r => r.permissionaria_origem || r.permissionaria || '—' },
    { key: 'subprefeitura_orig',  label: 'Sub.',           render: r => r.subprefeitura_origem  || r.subprefeitura  || '—' },
    { key: 'data_inicio',         label: 'Último laudo',   render: r => fmtData(r.data_inicio) },
    { key: 'status_simplificado', label: 'Status' },
    { key: 'nLaudos',             label: 'Laudos',         render: r => fmtNumero(r.nLaudos) },
  ]
  const COLS_DIV_SUB = [
    { key: 'proc',     label: 'Processo',           render: r => r.fisc.id_origem,                                           sortValue: r => r.fisc.id_origem || '' },
    { key: 'fisc_sub', label: 'Sub. (Fisc.)',       render: r => r.fisc.subprefeitura_origem || r.fisc.subprefeitura || '—', sortValue: r => r.fisc.subprefeitura_origem || r.fisc.subprefeitura || '' },
    { key: 'geo_sub',  label: 'Sub. (Sistema Geo)',    render: r => r.geo.subprefeitura || '—',                                sortValue: r => r.geo.subprefeitura || '' },
    { key: 'perm',     label: 'Permissionária',     render: r => r.fisc.permissionaria || r.geo.permissionaria || '—',      sortValue: r => r.fisc.permissionaria || r.geo.permissionaria || '' },
    { key: 'data',     label: 'Últ. laudo',         render: r => fmtData(r.fisc.data_inicio),                               sortValue: r => r.fisc.data_inicio || '' },
  ]
  const COLS_SO_GEO = [
    { key: 'processo',           label: 'Processo' },
    { key: 'permissionaria',     label: 'Permissionária' },
    { key: 'subprefeitura',      label: 'Sub.' },
    { key: 'status_unificado',   label: 'Status Sistema Geo' },
    { key: 'data_cadastro',      label: 'Data cadastro',   render: r => fmtData(r.data_cadastro) },
    { key: 'tipo_processo_nome', label: 'Tipo' },
  ]

  const SUBS = [
    { id: 'so-fisc', label: `Só na Fiscalização (${fmtNumero(soFisc.length)})` },
    { id: 'div-sub', label: `Div. Subprefeitura (${fmtNumero(divSubpref.length)})` },
    { id: 'so-geo',  label: `Só no Sistema Geo (${fmtNumero(soGeo.length)})` },
  ]

  const DESCRICOES = {
    'so-fisc': 'Processos com laudo de fiscalização cujo número não foi encontrado no Sistema Geo. Pode indicar obra fiscalizada mas não cadastrada no sistema de licenciamento.',
    'div-sub': 'Processos presentes nas duas bases com subprefeitura diferente — compara o dado original da planilha de fiscalização com o Sistema Geo.',
    'so-geo':  'Processos cadastrados no Sistema Geo que não possuem nenhum laudo de fiscalização. Volume alto esperado — nem toda obra licenciada é fiscalizada.',
  }

  const rowsMap = { 'so-fisc': soFisc, 'div-sub': divSubpref, 'so-geo': soGeo }
  const colsMap = { 'so-fisc': COLS_SO_FISC, 'div-sub': COLS_DIV_SUB, 'so-geo': COLS_SO_GEO }
  const emptyMap = {
    'so-fisc': 'Todos os processos da Fiscalização estão no Sistema Geo.',
    'div-sub': 'Nenhuma divergência de subprefeitura encontrada.',
    'so-geo':  'Todos os processos do Sistema Geo foram fiscalizados.',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {SUBS.map(s => (
          <button key={s.id} onClick={() => setSubAba(s.id)}
            className={`text-xs px-3 py-1.5 rounded-sm font-medium transition-colors ${subAba === s.id ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s.label}
          </button>
        ))}
      </div>
      <SecaoCard>
        <p className="text-xs text-gray-500 mb-4">{DESCRICOES[subAba]}</p>
        <TabelaPaginada
          key={subAba}
          rows={rowsMap[subAba]}
          colunas={colsMap[subAba]}
          emptyMsg={emptyMap[subAba]}
        />
      </SecaoCard>
    </div>
  )
}
