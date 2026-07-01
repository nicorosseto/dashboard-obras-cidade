import * as XLSX from 'xlsx'
import { supabase } from './supabase.js'
import { limparCache } from './cache.js'
import { toIsoDate } from './datas.js'

// Importação do Sistema Geo pela tela (D1) — porta a lógica do notebook do
// Colab (scripts/importar_sistemaGeo_colab.ipynb), que vira backup.
//
// Formato da planilha: aba "DadosSistemaGeo", cabeçalho na linha 1, dados da
// linha 2 em diante, colunas POR POSIÇÃO (0..8):
//   processo | tipo_processo | permissionaria | executora | data_cadastro |
//   etapa | subprefeitura | status | tipo_obra
//
// STATUS e TIPO DE PROCESSO vêm do banco (catálogos status_sistemaGeo e
// tipos_processo_sistemaGeo) — valores desconhecidos são CLASSIFICADOS pelo
// usuário ANTES da importação e gravados no catálogo. Etapa e tipo de obra
// ainda usam os dicionários fixos abaixo (mesmos do notebook).

const ABA_ESPERADA = 'DadosSistemaGeo'
// Lotes: o teto é o statement timeout da API do Supabase (alguns segundos por
// requisição). 5000/1000 é rápido e folgado; afinar depois se preciso.
export const BATCH_UPSERT = 1000
export const BATCH_DELETE = 5000

const ETAPA_NOME = {
  PROJETO: 'Projeto',
  CET: 'CET',
  AIO: 'AIO',
  ATO: 'ATO',
  CCO: 'CCO',
  'AS BUILT': 'As Built',
  AS_BUILT: 'As Built',
  PRORROGACAO: 'Prorrogação',
}

const TIPO_OBRA_NOME = {
  SUBTERRANEO: 'Subterrâneo',
  AEREO: 'Aéreo',
  POLO_GERADOR: 'Polo Gerador',
  POCO_MONITORAMENTO: 'Poço de Monitoramento',
  PORTARIA_OBRAS: 'Portaria Obras',
  PORTARIASMTGAB: 'Portaria SMT/GAB',
  OBRASPUBLICAS: 'Obras Públicas',
}

// Limpa célula: tira espaços e descarta placeholders de vazio ('---' etc.)
function clean(v) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || /^-+$/.test(s)) return null
  return s
}

function rotulo(dicionario, bruto) {
  if (!bruto) return null
  return dicionario[bruto] ?? dicionario[bruto.toUpperCase()] ?? bruto
}

// Carrega os catálogos do banco para a tela:
//   - status: Map<status_origem, {nome, grupo}>
//   - grupos: lista de grupos unificados (para classificar status novos)
//   - tiposProcesso: Map<tipo_origem, tipo_nome>
export async function carregarCatalogos() {
  const [rStatus, rGrupos, rTipos] = await Promise.all([
    supabase
      .from('status_sistemaGeo')
      .select('status_origem, status_nome, status_unificado'),
    supabase.from('status_grupos').select('nome, ordem').order('ordem'),
    supabase.from('tipos_processo_sistemaGeo').select('tipo_origem, tipo_nome'),
  ])
  if (rStatus.error) throw rStatus.error
  if (rGrupos.error) throw rGrupos.error
  if (rTipos.error) throw rTipos.error
  const status = new Map()
  for (const s of rStatus.data || []) {
    status.set(s.status_origem, {
      nome: s.status_nome,
      grupo: s.status_unificado,
    })
  }
  const tiposProcesso = new Map()
  for (const t of rTipos.data || [])
    tiposProcesso.set(t.tipo_origem, t.tipo_nome)
  return {
    status,
    grupos: (rGrupos.data || []).map((g) => g.nome),
    tiposProcesso,
  }
}

// Lê e analisa o arquivo. NÃO grava nada — devolve o material para a tela
// mostrar o resumo, pedir a classificação de status/tipos novos e confirmar.
export function analisarPlanilha(workbook, catalogoStatus, catalogoTipos) {
  const nomeAba = workbook.SheetNames.includes(ABA_ESPERADA)
    ? ABA_ESPERADA
    : workbook.SheetNames[0]
  const ws = workbook.Sheets[nomeAba]
  if (!ws) throw new Error('Planilha vazia ou ilegível.')

  // Matriz crua (linha 1 = cabeçalho; colunas por posição, como o notebook)
  const matriz = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true,
  })
  if (matriz.length < 2)
    throw new Error(
      `A aba "${nomeAba}" não tem linhas de dados (esperado: cabeçalho na linha 1, dados a partir da linha 2).`
    )

  const linhas = []
  let semProcesso = 0
  for (let i = 1; i < matriz.length; i++) {
    const c = matriz[i]
    const processo = clean(c[0])
    if (!processo) {
      semProcesso++
      continue
    }
    const status = clean(c[7])
    const etapa = clean(c[5])
    const tipoProcesso = clean(c[1])
    const tipoObra = clean(c[8])
    linhas.push({
      processo,
      tipo_processo: tipoProcesso,
      // tipo_processo_nome e status_nome/status_unificado são preenchidos na
      // importação, depois da classificação dos desconhecidos (vêm do catálogo)
      permissionaria: clean(c[2]),
      executora: clean(c[3]),
      data_cadastro: toIsoDate(c[4]),
      etapa,
      etapa_nome: rotulo(ETAPA_NOME, etapa),
      subprefeitura: clean(c[6]),
      status,
      tipo_obra: tipoObra,
      tipo_obra_nome: rotulo(TIPO_OBRA_NOME, tipoObra),
    })
  }
  if (!linhas.length)
    throw new Error(
      `Nenhuma linha com nº de processo na aba "${nomeAba}". Confira se a planilha está no formato do Sistema Geo.`
    )

  // Deduplica por processo: vence a linha com data_cadastro mais recente
  // (ISO ordena como texto; sem data perde; empate = última do arquivo)
  const porProcesso = new Map()
  for (const r of linhas) {
    const atual = porProcesso.get(r.processo)
    if (!atual || (r.data_cadastro || '') >= (atual.data_cadastro || ''))
      porProcesso.set(r.processo, r)
  }
  const dedup = Array.from(porProcesso.values())

  // Status e tipos de processo fora do catálogo → precisam de classificação
  const statusDesc = new Map() // status → qtd de linhas
  const tiposDesc = new Map() // tipo_processo → qtd de linhas
  for (const r of dedup) {
    if (r.status && !catalogoStatus.has(r.status))
      statusDesc.set(r.status, (statusDesc.get(r.status) || 0) + 1)
    if (r.tipo_processo && !catalogoTipos.has(r.tipo_processo))
      tiposDesc.set(r.tipo_processo, (tiposDesc.get(r.tipo_processo) || 0) + 1)
  }

  return {
    nomeAba,
    linhas: dedup,
    totalBrutas: linhas.length,
    duplicadosRemovidos: linhas.length - dedup.length,
    semProcesso,
    statusDesconhecidos: Array.from(statusDesc.entries()).map(
      ([status, qtd]) => ({ status, qtd })
    ),
    tiposProcessoDesconhecidos: Array.from(tiposDesc.entries()).map(
      ([tipo, qtd]) => ({ tipo, qtd })
    ),
  }
}

// Grava as classificações de status novos no catálogo do banco.
// classificacoes: [{ status, nome, grupo }]
export async function salvarClassificacoes(classificacoes) {
  if (!classificacoes.length) return
  const { error } = await supabase.from('status_sistemaGeo').insert(
    classificacoes.map((c) => ({
      status_origem: c.status,
      status_nome: c.nome,
      status_unificado: c.grupo,
    }))
  )
  if (error) throw error
}

// Grava as classificações de tipos de processo novos no catálogo.
// classificacoes: [{ tipo, nome }]
export async function salvarClassificacoesTipoProcesso(classificacoes) {
  if (!classificacoes.length) return
  const { error } = await supabase.from('tipos_processo_sistemaGeo').insert(
    classificacoes.map((c) => ({
      tipo_origem: c.tipo,
      tipo_nome: c.nome,
    }))
  )
  if (error) throw error
}

// Trava de pré-voo (mesma ideia do notebook): testa ESCRITA com uma linha
// sentinela antes de apagar qualquer dado real. Sem permissão → aborta.
async function preflight() {
  const SENTINELA = '__preflight_tela__'
  await supabase.from('sistemaGeo').delete().eq('processo', SENTINELA)
  const { error } = await supabase
    .from('sistemaGeo')
    .insert({ processo: SENTINELA })
  if (error) {
    throw new Error(
      'Sem permissão de escrita no Sistema Geo — a importação foi abortada SEM apagar nada. ' +
        'Confirme que o script 07-atualizar-dados.sql foi rodado no banco e que você tem a permissão de upload.'
    )
  }
  await supabase.from('sistemaGeo').delete().eq('processo', SENTINELA)
}

// Executa a importação: preflight → DELETE em lotes → UPSERT em lotes →
// snapshot. onProgresso({ fase, feito, total }) atualiza a tela.
export async function executarImportacao({
  linhas,
  catalogoStatus,
  catalogoTipos,
  nomeArquivo,
  duplicadosRemovidos,
  statusNovos,
  tiposNovos,
  user,
  onProgresso,
}) {
  // Preenche os rótulos pelo catálogo (já com as classificações novas)
  const prontas = linhas.map((r) => {
    const m = r.status ? catalogoStatus.get(r.status) : null
    return {
      ...r,
      status_nome: m?.nome ?? null,
      status_unificado: m?.grupo ?? (r.status ? 'Verificar Novo Status' : null),
      tipo_processo_nome: r.tipo_processo
        ? (catalogoTipos.get(r.tipo_processo) ?? r.tipo_processo)
        : null,
    }
  })

  onProgresso({ fase: 'Testando permissão de escrita…', feito: 0, total: 1 })
  await preflight()

  // DELETE em lotes (apagar 175k de uma vez estoura o timeout da API)
  onProgresso({ fase: 'Removendo dados antigos…', feito: 0, total: 1 })
  let apagados = 0
  for (;;) {
    const { data, error } = await supabase
      .from('sistemaGeo')
      .select('id')
      .order('id', { ascending: true })
      .range(BATCH_DELETE - 1, BATCH_DELETE - 1)
    if (error) throw error
    if (data?.length) {
      const { error: e2 } = await supabase
        .from('sistemaGeo')
        .delete()
        .lte('id', data[0].id)
      if (e2) throw e2
      apagados += BATCH_DELETE
      onProgresso({
        fase: `Removendo dados antigos… (~${apagados.toLocaleString('pt-BR')})`,
        feito: 0,
        total: 1,
      })
    } else {
      const { error: e3 } = await supabase
        .from('sistemaGeo')
        .delete()
        .neq('id', -1)
      if (e3) throw e3
      break
    }
  }

  // UPSERT em lotes (idempotente pela chave única `processo`)
  for (let i = 0; i < prontas.length; i += BATCH_UPSERT) {
    const lote = prontas.slice(i, i + BATCH_UPSERT)
    const { error } = await supabase
      .from('sistemaGeo')
      .upsert(lote, { onConflict: 'processo' })
    if (error) throw error
    onProgresso({
      fase: 'Enviando dados…',
      feito: Math.min(i + BATCH_UPSERT, prontas.length),
      total: prontas.length,
    })
  }

  // Snapshot de auditoria (falha aqui não desfaz a importação)
  onProgresso({ fase: 'Registrando no histórico…', feito: 1, total: 1 })
  const porGrupo = new Map()
  for (const r of prontas) {
    const g = r.status_unificado || '(sem)'
    porGrupo.set(g, (porGrupo.get(g) || 0) + 1)
  }
  const { error: errSnap } = await supabase
    .from('importacoes_snapshots')
    .insert({
      fonte: 'sistemaGeo',
      nome_arquivo: nomeArquivo,
      total_linhas: prontas.length,
      duplicados_removidos: duplicadosRemovidos,
      status_novos:
        statusNovos?.length || tiposNovos?.length
          ? [
              ...(statusNovos || []).map((s) => ({ ...s, tipo: 'status' })),
              ...(tiposNovos || []).map((t) => ({
                status: t.tipo,
                grupo: t.nome,
                tipo: 'tipo_processo',
              })),
            ]
          : null,
      resumo: {
        por_status_unificado: Array.from(porGrupo.entries()).map(
          ([grupo, qtd]) => ({ grupo, qtd })
        ),
      },
      uploaded_by: user?.id || null,
      uploaded_by_email: user?.email || null,
    })
  if (errSnap) console.warn('Falha ao gravar snapshot:', errSnap.message)

  // Os dados do Sistema Geo mudaram: invalida o cache local para a próxima
  // abertura rebuscar a versão definitiva.
  limparCache('sistemaGeo')

  return { importadas: prontas.length }
}
