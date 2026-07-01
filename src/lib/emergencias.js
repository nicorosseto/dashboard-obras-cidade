// Lógica pura do módulo de Emergências: constantes, parsing, normalização,
// agregações e helpers do SLA 48h. Sem JSX, sem React, sem chamadas ao Supabase.
import * as XLSX from 'xlsx'
import { fmtData, consolidarNorcrest } from './aggregations.js'
import { toIsoDate } from './datas.js'
import { SUBPREFEITURAS } from '../data/subprefeituras-sp.js'

// ── Aparência ────────────────────────────────────────────────────────
export const STATUS_COLOR = {
  Encerrada: '#1F7A4D',
  Informada: '#C00000',
  Cancelada: '#6B7280',
  Revisão: '#F59E0B',
  Revisao: '#F59E0B',
  'Não Autorizada': '#9CA3AF',
  'Nao Autorizada': '#9CA3AF',
  Processando: '#3B82F6',
  'Processando Interferência': '#60A5FA',
  'Processando Interferencia': '#60A5FA',
  Outros: '#1F3864',
}
export const STATUS_PADRAO = '#1F3864'
export const BATCH_SIZE = 2000

// Status fixos exibidos individualmente nos filtros e gráficos de Emergências.
// Todos os demais (raros) são agrupados em "Outros". Decisão de 25/06/2026:
// como o Sistema Geo pode enviar qualquer status, fixamos os 4 mais relevantes e
// agrupamos o resto — sem depender de limiar dinâmico.
export const STATUS_FIXOS_EMERG = ['Encerrada', 'Informada', 'Cancelada', 'Revisão']
export const STATUS_OUTROS_LABEL = 'Outros'
export const STATUS_OUTROS_COR = '#1F3864'

// A partir das linhas, devolve { fixos, outros } onde:
//  - fixos: [{ status, qtd }] na ordem de STATUS_FIXOS_EMERG (qtd pode ser 0)
//  - outros: { status: 'Outros', qtd, detalhe: [{ status, qtd }] desc }
export function agregaStatusComOutros(rows) {
  const m = new Map()
  for (const r of rows) {
    const s = r.status || 'Sem status'
    m.set(s, (m.get(s) || 0) + 1)
  }
  const fixos = STATUS_FIXOS_EMERG.map((s) => ({ status: s, qtd: m.get(s) || 0 }))
  const detalhe = []
  let outrosQtd = 0
  for (const [status, qtd] of m.entries()) {
    if (!STATUS_FIXOS_EMERG.includes(status)) {
      detalhe.push({ status, qtd })
      outrosQtd += qtd
    }
  }
  detalhe.sort((a, b) => b.qtd - a.qtd)
  return {
    fixos,
    outros: { status: STATUS_OUTROS_LABEL, qtd: outrosQtd, detalhe },
  }
}

const MESES_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

export function fmtMesAno(yyyymm) {
  if (!yyyymm) return ''
  const [y, m] = String(yyyymm).split('-')
  const idx = parseInt(m, 10) - 1
  if (isNaN(idx) || idx < 0 || idx > 11) return yyyymm
  return `${MESES_PT[idx]}/${y}`
}

// ── Normalização de status ───────────────────────────────────────────
export function statusUnificado(s) {
  if (!s) return null
  const v = String(s).trim()
  if (['Cancelada', 'Cancelado', 'Não Autorizada', 'Nao Autorizada'].includes(v))
    return 'Cancelamento'
  if (v === 'Encerrada') return 'Obra Realizada'
  if (v === 'Informada') return 'Obra com Aviso de Início'
  if (v === 'Informado') return 'Obra Autorizada'
  if (['Revisão','Revisao','Processando','Processando Interferência','Processando Interferencia'].includes(v))
    return 'Pré Obra'
  return 'Outros'
}

// Forma canônica dos status conhecidos. "Informada" e "Informado" diferem por
// letra — a normalização de caixa NUNCA os funde. São status distintos.
const CANON_STATUS_EMERG = {
  informada: 'Informada',
  informado: 'Informado',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
  cancelado: 'Cancelado',
  revisão: 'Revisão',
  revisao: 'Revisão',
  processando: 'Processando',
  'processando interferência': 'Processando Interferência',
  'processando interferencia': 'Processando Interferência',
  'não autorizada': 'Não Autorizada',
  'nao autorizada': 'Não Autorizada',
}

export function normalizeStatusEmerg(s) {
  if (s === null || s === undefined) return null
  const t = String(s).trim().replace(/\s+/g, ' ')
  if (!t) return null
  return CANON_STATUS_EMERG[t.toLowerCase()] || t
}

// ── Definição das colunas esperadas nos uploads ──────────────────────
export const COLUNAS_EMERG = {
  num_processo: {
    label: 'Nº do Processo', obrigatoria: true,
    aliases: ['numprocesso','num processo','número do processo','numero do processo','numero processo','processo','código aio','codigo aio'],
  },
  status: { label: 'Status', obrigatoria: false, aliases: ['status','status aio'] },
  data_cadastro: { label: 'Data de Cadastro', obrigatoria: false, aliases: ['datacadastro','data cadastro','data de cadastro'] },
  etapa: { label: 'Etapa', obrigatoria: false, aliases: ['etapa'] },
  permissionaria: { label: 'Permissionária', obrigatoria: false, aliases: ['permissionaria','permissionária'] },
  subprefeitura: { label: 'Subprefeitura', obrigatoria: false, aliases: ['subprefeitura','subpref','subpref.'] },
}

export const COLUNAS_OBRAS = {
  codigo_aio: {
    label: 'Código AIO', obrigatoria: true,
    aliases: ['código aio','codigo aio','aio','numprocesso','num processo','processo'],
  },
  data_inicio_obra: {
    label: 'Data Início Obra', obrigatoria: true,
    aliases: ['data início obra','data inicio obra','data início da obra','data inicio da obra','início obra','inicio obra'],
  },
  data_fim_obra: {
    label: 'Data Fim Obra', obrigatoria: true,
    aliases: ['data fim obra','data fim da obra','fim obra','data término obra','data termino obra'],
  },
  tipo_obra: { label: 'Tipo de Obra', obrigatoria: false, aliases: ['tipo obra','tipo da obra'] },
  logradouro: { label: 'Logradouro', obrigatoria: false, aliases: ['logradouro'] },
  numero_obra: { label: 'Número da Obra', obrigatoria: false, aliases: ['número exato obra','numero exato obra','número obra','numero obra'] },
  natureza_obra: { label: 'Natureza da Obra', obrigatoria: false, aliases: ['natureza obra','natureza da obra'] },
  permissionaria: { label: 'Permissionária', obrigatoria: false, aliases: ['permissionaria','permissionária'] },
  executora: { label: 'Executora', obrigatoria: false, aliases: ['executora'] },
}

function normCabecalho(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function detectarColunas(headerKeys, colunas = COLUNAS_EMERG) {
  const normToOrig = new Map()
  for (const k of headerKeys) normToOrig.set(normCabecalho(k), k)
  const mapeamento = {}
  const faltando = []
  for (const [campo, cfg] of Object.entries(colunas)) {
    let achou = null
    for (const a of cfg.aliases) {
      if (normToOrig.has(a)) { achou = normToOrig.get(a); break }
    }
    mapeamento[campo] = achou
    if (!achou && cfg.obrigatoria) faltando.push(campo)
  }
  return { mapeamento, faltando }
}

export function mapearLinhas(rows, mapeamento) {
  const get = (r, campo) => { const col = mapeamento[campo]; return col ? r[col] : null }
  return rows.map((r) => {
    const np = get(r, 'num_processo')
    if (np === null || np === undefined || String(np).trim() === '') return null
    const status = normalizeStatusEmerg(get(r, 'status'))
    return {
      num_processo: String(np).trim(),
      data_cadastro: toIsoDate(get(r, 'data_cadastro')),
      etapa: get(r, 'etapa') ?? null,
      permissionaria: get(r, 'permissionaria') ?? null,
      status,
      status_unificado: statusUnificado(status),
      subprefeitura: get(r, 'subprefeitura') ?? null,
    }
  }).filter(Boolean)
}

export function dedupPorProcesso(linhas) {
  const porProc = new Map()
  for (const r of linhas) {
    const atual = porProc.get(r.num_processo)
    if (!atual || (r.data_cadastro || '') >= (atual.data_cadastro || ''))
      porProc.set(r.num_processo, r)
  }
  return Array.from(porProc.values())
}

export function mapearObras(rows, mapeamento) {
  const get = (r, campo) => { const col = mapeamento[campo]; return col ? r[col] : null }
  return rows.map((r) => {
    const aio = get(r, 'codigo_aio')
    if (aio === null || aio === undefined || String(aio).trim() === '') return null
    return {
      codigo_aio: String(aio).trim(),
      data_inicio_obra: toIsoDate(get(r, 'data_inicio_obra')),
      data_fim_obra: toIsoDate(get(r, 'data_fim_obra')),
      tipo_obra: get(r, 'tipo_obra') ?? null,
      logradouro: get(r, 'logradouro') ?? null,
      numero_obra: get(r, 'numero_obra') != null ? String(get(r, 'numero_obra')) : null,
      natureza_obra: get(r, 'natureza_obra') ?? null,
      permissionaria: get(r, 'permissionaria') ?? null,
      executora: get(r, 'executora') ?? null,
    }
  }).filter(Boolean)
}

export function dedupPorAio(linhas) {
  const porAio = new Map()
  for (const r of linhas) {
    const atual = porAio.get(r.codigo_aio)
    if (!atual || r.data_inicio_obra || !atual.data_inicio_obra)
      porAio.set(r.codigo_aio, r)
  }
  return Array.from(porAio.values())
}

// ── Motivo Inválido ──────────────────────────────────────────────────
export const COLUNAS_RECLASS = {
  codigo_aio: {
    label: 'Nº do Processo / Código AIO', obrigatoria: true,
    aliases: ['código aio','codigo aio','aio','numprocesso','num processo','número do processo','numero do processo','processo'],
  },
  permissionaria: { label: 'Permissionária', obrigatoria: false, aliases: ['permissionaria','permissionária'] },
  subprefeitura: { label: 'Subprefeitura', obrigatoria: false, aliases: ['subprefeitura','subpref','subpref.'] },
  data_aio: {
    label: 'Data AIO', obrigatoria: false,
    aliases: ['data aio','data do aio','data_aio','data cadastro','data de cadastro','datacadastro'],
  },
  status: { label: 'Status', obrigatoria: false, aliases: ['status','status aio'] },
  logradouro: { label: 'Logradouro', obrigatoria: false, aliases: ['logradouro'] },
  natureza_obra: { label: 'Natureza da Obra', obrigatoria: false, aliases: ['natureza obra','natureza da obra'] },
  motivo_natureza: {
    label: 'Motivo / Natureza', obrigatoria: false,
    aliases: ['motivo natureza','motivo de natureza','motivo','motivo/natureza','motivo_natureza'],
  },
}

export function mapearReclass(rows, mapeamento) {
  const get = (r, campo) => { const col = mapeamento[campo]; return col ? r[col] : null }
  return rows.map((r) => {
    const aio = get(r, 'codigo_aio')
    if (aio === null || aio === undefined || String(aio).trim() === '') return null
    return {
      codigo_aio: String(aio).trim(),
      permissionaria: get(r, 'permissionaria') != null ? String(get(r, 'permissionaria')).trim() : null,
      subprefeitura: get(r, 'subprefeitura') != null ? String(get(r, 'subprefeitura')).trim() : null,
      data_aio: toIsoDate(get(r, 'data_aio')),
      status: normalizeStatusEmerg(get(r, 'status')),
      logradouro: get(r, 'logradouro') != null ? String(get(r, 'logradouro')).trim() : null,
      natureza_obra: get(r, 'natureza_obra') != null ? String(get(r, 'natureza_obra')).trim() : null,
      motivo_natureza: get(r, 'motivo_natureza') != null ? String(get(r, 'motivo_natureza')).trim() : null,
    }
  }).filter(Boolean)
}

export function dedupReclassPorAio(rows) {
  const m = new Map()
  for (const r of rows) {
    const key = r.codigo_aio
    if (!m.has(key)) { m.set(key, r); continue }
    const atual = m.get(key)
    if (r.data_aio && (!atual.data_aio || r.data_aio > atual.data_aio)) m.set(key, r)
  }
  return Array.from(m.values())
}

// ── Nome curto da permissionária + sigla da subprefeitura (display) ───
// Usados na aba "Motivo Inválido". Regra: na planilha de emergências o nome já
// vem tratado (curto) — preferir aquele. Quando o processo não está naquela
// base, derivamos o nome curto aqui com um dicionário de marcas consagradas
// (siglas não deriváveis por regra) + um limpador genérico de ruído corporativo.

const _semAcento = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Marcas cujo nome curto NÃO é derivável algoritmicamente (siglas consagradas).
// Testadas contra o nome em MAIÚSCULAS e sem acento; o primeiro match vence.
const APELIDOS_PERMISSIONARIA = [
  [/NORCREST|SANEAMENTO BASICO/, 'NORCREST'],
  [/WINSLOW|COMPANHIA DE GAS DE SAO PAULO|GAS DE SAO PAULO/, 'WINSLOW'],
  [/HARGROVE|\bHARGROVE\b/, 'HARGROVE'],
]

// Tokens de ruído corporativo (comparados sem acento/minúsculos, token a token).
const RUIDO_TOKENS = new Set([
  'ltda', 'me', 'epp', 'eireli', 'cia', 'companhia',
  'comunicacao', 'comunicacoes', 'telecomunicacao', 'telecomunicacoes',
  'participacao', 'participacoes', 'empreendimentos', 'servico', 'servicos',
  'brasil', 's/a', 's.a', 's.a.',
])
// Conectores soltos que sobram nas pontas após remover o ruído.
const CONECTORES = new Set(['de', 'do', 'da', 'das', 'dos', 'e'])

export function nomeCurtoPermissionaria(nome) {
  if (nome == null) return nome
  let s = String(nome).trim().replace(/\s+/g, ' ')
  if (!s) return s

  // 1) Separa a unidade regional final "/XXX" (ex.: ".../MLG"). Exige 2+ chars,
  //    então o "/A" de "S/A" não é capturado por engano.
  let unidade = ''
  const mu = s.match(/\/\s*([A-Za-zÀ-ÿ0-9]{2,6})\s*$/)
  if (mu) {
    unidade = mu[1].toUpperCase()
    s = s.slice(0, mu.index).trim()
  }

  // 2) Dicionário de marcas consagradas (siglas não deriváveis).
  const alvo = _semAcento(s).toUpperCase()
  for (const [re, curto] of APELIDOS_PERMISSIONARIA) {
    if (re.test(alvo)) return unidade ? `${curto}/${unidade}` : curto
  }

  // 3) Fallback genérico: remove o ruído corporativo (preserva acentos dos
  //    tokens mantidos).
  let base = _semRuido(s)
  if (!base) base = s
  return unidade ? `${base}/${unidade}` : base
}

const _limpaTok = (tok) => _semAcento(tok).toLowerCase().replace(/[.,;]+$/g, '')

function _semRuido(s) {
  const kept = s.split(/\s+/).filter((tok) => !RUIDO_TOKENS.has(_limpaTok(tok)))
  while (kept.length && CONECTORES.has(_limpaTok(kept[0]))) kept.shift()
  while (kept.length && CONECTORES.has(_limpaTok(kept[kept.length - 1]))) kept.pop()
  return kept.join(' ').replace(/^[\s,.;/-]+|[\s,.;/-]+$/g, '').trim()
}

const _normSub = (t) =>
  _semAcento(String(t || '')).toUpperCase().replace(/[/\-'.]/g, ' ').replace(/\s+/g, ' ').trim()

// Mapa nome (qualquer grafia) → sigla. Cobre a grafia do GeoJSON, a oficial do
// banco (com hífen) e a própria sigla; mantém o valor original se não reconhece.
const _SUB_TO_SIGLA = (() => {
  const m = new Map()
  for (const s of SUBPREFEITURAS) {
    m.set(s.sigla.toUpperCase(), s.sigla)
    m.set(_normSub(s.nome), s.sigla)
  }
  // Grafias oficiais do banco (04-subprefeituras.sql) que diferem do GeoJSON.
  const extra = {
    AF: 'Aricanduva Formosa Carrao', ST: 'Santana Tucuruvi', MG: 'Vila Maria Vila Guilherme',
    PJ: 'Pirituba Jaragua', CV: 'Casa Verde Cachoeirinha', FB: 'Freguesia Brasilandia',
    JT: 'Jacana Tremembe', G: 'Guaianases', MB: 'M Boi Mirim',
  }
  for (const [sig, nome] of Object.entries(extra)) m.set(_normSub(nome), sig)
  m.set('GU', 'G') // alias herdado (GU → G)
  return m
})()

export function siglaSubpref(valor) {
  if (valor == null) return valor
  const raw = String(valor).trim()
  if (!raw) return raw
  const up = raw.toUpperCase()
  if (_SUB_TO_SIGLA.has(up)) return _SUB_TO_SIGLA.get(up)
  const norm = _normSub(raw)
  if (_SUB_TO_SIGLA.has(norm)) return _SUB_TO_SIGLA.get(norm)
  return raw
}

// ── Agrupamento inteligente de motivos de natureza ───────────────────
// O campo "natureza" vem como texto livre digitado pela empresa, ex.:
//   "MANUTENÇÃO EM REDE DE ÁGUA - OS 2623889270 - AVENIDA VITAL BRASIL, 991…"
//   "REPOR CAPA ASFALTICA /AVENIDA ELLIS MAAS NÚMERO 355"
// Para agrupar sem lista fixa, extraímos a palavra-cabeça do motivo (a ação:
// "manutenção", "repor", "nivelar"…) descartando endereço, nº de processo e
// ruído. O agrupamento é por essa palavra-cabeça; o rótulo do grupo é o maior
// trecho inicial COMUM a todos os itens (ex.: "Repor capa asfáltica" quando
// todos compartilham, "Manutenção" quando as continuações divergem).

const STOPWORDS_NATUREZA = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'a', 'o',
  'as', 'os', 'um', 'uma', 'para', 'por', 'com', 'sem', 'que', 'se', 'ao',
  'referente', 'trata', 'sobre', 'sera', 'foi',
])

// Marcadores que indicam início de endereço/observação — cortamos o texto aqui.
// Aplicado ao texto já em MAIÚSCULAS e sem acento.
const CORTE_NATUREZA =
  /\s-\s|\s\/\s|\/(?=[A-Z])| AV\b| AVENIDA\b| RUA\b| ESTRADA\b| ROD\b| RODOVIA\b| PRACA\b| PCA\b| OS \d| N[º°]\s?\d| NUMERO\b| A PEDIDO\b| SENTIDO\b| FAIXA\b| ALTURA\b/

// Sequência de tokens significativos (preserva acentos para exibição).
function tokensSignificativos(texto, max = 6) {
  let t = String(texto || '')
  const alvo = _semAcento(t).toUpperCase()
  const corte = alvo.search(CORTE_NATUREZA)
  if (corte > 0) t = t.slice(0, corte)
  const out = []
  for (const w of t.split(/[^A-Za-zÀ-ÿ]+/)) {
    if (w.length <= 2) continue
    if (STOPWORDS_NATUREZA.has(_semAcento(w).toLowerCase())) continue
    out.push(w)
    if (out.length >= max) break
  }
  return out
}

// Palavra-cabeça canônica (sem acento, minúscula) — a chave de agrupamento.
export function termoNatureza(texto) {
  const toks = tokensSignificativos(texto)
  return toks.length ? _semAcento(toks[0]).toLowerCase() : null
}

// Maior trecho inicial comum a todos os itens do grupo, em forma legível.
function rotuloComum(listaTokens) {
  if (!listaTokens.length) return ''
  let prefixo = listaTokens[0]
  for (const toks of listaTokens.slice(1)) {
    let i = 0
    while (
      i < prefixo.length && i < toks.length &&
      _semAcento(prefixo[i]).toLowerCase() === _semAcento(toks[i]).toLowerCase()
    ) i++
    prefixo = prefixo.slice(0, i)
    if (!prefixo.length) break
  }
  const base = prefixo.length ? prefixo : listaTokens[0].slice(0, 1)
  return base
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(' ')
}

// itens: [{ codigo_aio, natureza, permissionaria, origem }]
// Devolve [{ key, label, qtd, itens }] ordenado por qtd desc, top `limite`.
export function agruparMotivosNatureza(itens, limite = 8) {
  const grupos = new Map()
  for (const it of itens || []) {
    const toks = tokensSignificativos(it.natureza)
    if (!toks.length) continue
    const key = _semAcento(toks[0]).toLowerCase()
    if (!grupos.has(key)) grupos.set(key, { key, qtd: 0, itens: [], _toks: [] })
    const g = grupos.get(key)
    g.qtd++
    g.itens.push(it)
    g._toks.push(toks)
  }
  return Array.from(grupos.values())
    .map((g) => ({ key: g.key, label: rotuloComum(g._toks), qtd: g.qtd, itens: g.itens }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, limite)
}

// ── Classificação de motivo de natureza (v2) ─────────────────────────
// Vocabulário de obra: âncora para achar a AÇÃO no texto inteiro (resolve o
// caso em que o texto começa pelo endereço, ex.: "RUA … VAZAMENTO DE ÁGUA").
// Ordem = prioridade (1º match vence). `invalidoPadrao` é o palpite inicial da
// heurística: obra programada (manutenção/recape/ampliação/nivelamento) começa
// como INVÁLIDA; o resto como válida. O usuário ajusta e a escolha é salva.
export const VOCABULARIO_MOTIVO = [
  { termo: 'manutencao',    rotulo: 'Manutenção',                  re: /MANUTEN/,                          invalidoPadrao: true },
  { termo: 'recape',        rotulo: 'Recape / Repor capa asfáltica', re: /RECAPE|REPAVIMENT|REPOR CAPA|CAPA ASFALT/, invalidoPadrao: true },
  { termo: 'ampliacao',     rotulo: 'Ampliação / Expansão',        re: /AMPLIA|EXPANSAO|EXTENSAO DE REDE/, invalidoPadrao: true },
  { termo: 'nivelamento',   rotulo: 'Nivelamento',                 re: /NIVELA/,                           invalidoPadrao: true },
  { termo: 'remanejamento', rotulo: 'Remanejamento',               re: /REMANEJ/,                          invalidoPadrao: true },
  { termo: 'vazamento',     rotulo: 'Vazamento',                   re: /VAZAMENT|VAZANDO/,                 invalidoPadrao: false },
  { termo: 'rompimento',    rotulo: 'Rompimento',                  re: /ROMPIMENT|ROMPID|ROMPEU/,          invalidoPadrao: false },
  { termo: 'reparo',        rotulo: 'Reparo',                      re: /REPARO|REPARAR|REPARANDO/,         invalidoPadrao: false },
  { termo: 'conserto',      rotulo: 'Conserto',                    re: /CONSERT/,                          invalidoPadrao: false },
  { termo: 'troca',         rotulo: 'Troca / Substituição',        re: /\bTROCA|SUBSTITU/,                 invalidoPadrao: false },
  { termo: 'ramal',         rotulo: 'Ramal',                       re: /\bRAMAL/,                          invalidoPadrao: false },
  { termo: 'ligacao',       rotulo: 'Ligação',                     re: /LIGACAO|LIGACOES/,                 invalidoPadrao: false },
  { termo: 'desobstrucao',  rotulo: 'Desobstrução / Limpeza',      re: /DESOBSTRU|DESENTUP|LIMPEZA/,       invalidoPadrao: false },
  { termo: 'sondagem',      rotulo: 'Sondagem',                    re: /\bSOND/,                           invalidoPadrao: false },
  { termo: 'instalacao',    rotulo: 'Instalação',                  re: /INSTALA/,                          invalidoPadrao: false },
  { termo: 'afundamento',   rotulo: 'Afundamento / Buraco',        re: /AFUNDAMENT|BURACO|CRATERA|EROSAO/, invalidoPadrao: false },
  { termo: 'anomalia',      rotulo: 'Anomalia',                    re: /ANOMALIA/,                         invalidoPadrao: false },
  { termo: 'pavimentacao',  rotulo: 'Pavimentação',                re: /PAVIMENT/,                         invalidoPadrao: false },
]

// Palavras descartadas na descoberta automática (logradouro, localização, genéricos)
// — evita grupos sem sentido como "Rua", "Obra", "Local".
const LOGRADOURO_GENERICO = new Set([
  'rua', 'avenida', 'av', 'travessa', 'trav', 'praca', 'pca', 'alameda', 'al',
  'estrada', 'estr', 'rodovia', 'rod', 'via', 'largo', 'beco', 'viela', 'vila',
  'jardim', 'jd', 'parque', 'pq', 'conjunto', 'cj', 'numero', 'obra', 'obras',
  'servico', 'servicos', 'local', 'area', 'regiao', 'trecho', 'altura', 'proximo',
  'sentido', 'faixa', 'lado', 'esquina', 'cruzamento', 'passeio', 'leito',
  'pavimentado', 'calcada', 'margem', 'ponte', 'viaduto', 'agua', 'esgoto', 'rede',
])

// Classifica uma natureza num motivo canônico. Vocabulário tem prioridade;
// se nada bater, descobre a 1ª palavra significativa (ignorando logradouro/genérico).
// Descoberta automática: 1ª palavra significativa que não seja logradouro/genérico.
// `defs` opcional: pula termos arquivados (grupo "excluído" não é recriado).
function _descobrir(alvo, defs = null) {
  for (const w of alvo.split(/[^A-Z]+/)) {
    if (w.length <= 2) continue
    const lw = w.toLowerCase()
    if (STOPWORDS_NATUREZA.has(lw) || LOGRADOURO_GENERICO.has(lw)) continue
    if (defs?.get(lw)?.arquivado) continue
    return { termo: lw, rotulo: lw.charAt(0).toUpperCase() + lw.slice(1), invalidoPadrao: false, descoberto: true }
  }
  return null
}

export function classificarNatureza(texto) {
  if (!texto) return null
  const alvo = _semAcento(String(texto)).toUpperCase()
  for (const v of VOCABULARIO_MOTIVO) {
    if (v.re.test(alvo)) return { termo: v.termo, rotulo: v.rotulo, invalidoPadrao: v.invalidoPadrao, descoberto: false }
  }
  return _descobrir(alvo)
}

// Agrupa itens [{ codigo_aio, natureza, ... }] por motivo canônico.
// classifMap: Map termo → { invalido } (classificação salva no banco). Cada grupo
// recebe `invalido` (salvo, senão palpite) e `classificado` (já salvo?).
export function agruparPorMotivo(itens, classifMap = null) {
  const grupos = new Map()
  for (const it of itens || []) {
    const c = classificarNatureza(it.natureza)
    if (!c) continue
    if (!grupos.has(c.termo)) {
      grupos.set(c.termo, { termo: c.termo, rotulo: c.rotulo, descoberto: c.descoberto, invalidoPadrao: c.invalidoPadrao, qtd: 0, itens: [] })
    }
    const g = grupos.get(c.termo)
    g.qtd++
    g.itens.push(it)
  }
  return Array.from(grupos.values())
    .map((g) => {
      const salvo = classifMap?.get?.(g.termo)
      return { ...g, invalido: salvo ? !!salvo.invalido : g.invalidoPadrao, classificado: !!salvo }
    })
    .sort((a, b) => b.qtd - a.qtd)
}

// ── Editor v3: grupos editáveis (palavras-chave) + override por texto ──

// Chave de override: o texto da natureza normalizado (sem acento, maiúsculo,
// espaços colapsados). Mover um texto = um override desta chave para um termo.
export function normNatureza(texto) {
  return _semAcento(String(texto || '')).toUpperCase().replace(/\s+/g, ' ').trim()
}

// Slug (termo) a partir de um rótulo, para grupos criados pelo usuário.
export function slugTermo(rotulo) {
  const s = _semAcento(String(rotulo || '')).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return s || `grupo_${Date.now()}`
}

// Resolve as DEFINIÇÕES dos grupos: parte do vocabulário (seed) e sobrepõe as
// linhas salvas (rótulo, invalido, palavras, arquivado, alias_de).
// classifRows: [{ termo, rotulo, invalido, palavras, arquivado, alias_de }]
export function resolverDefs(classifRows = []) {
  const defs = new Map()
  for (const v of VOCABULARIO_MOTIVO) {
    defs.set(v.termo, {
      termo: v.termo, rotulo: v.rotulo, invalido: v.invalidoPadrao, invalidoPadrao: v.invalidoPadrao,
      palavras: [], arquivado: false, alias_de: null, builtin: true,
    })
  }
  for (const c of classifRows) {
    const cur = defs.get(c.termo) || { termo: c.termo, invalidoPadrao: false, builtin: false }
    defs.set(c.termo, {
      ...cur,
      rotulo: c.rotulo ?? cur.rotulo ?? c.termo,
      invalido: !!c.invalido,
      palavras: Array.isArray(c.palavras) ? c.palavras : [],
      arquivado: !!c.arquivado,
      alias_de: c.alias_de || null,
      builtin: cur.builtin || false,
    })
  }
  return defs
}

// Segue a cadeia de alias (grupo fundido em outro), com proteção contra ciclo.
function _resolverAlias(termo, defs) {
  let t = termo
  const visto = new Set()
  while (t && defs.get(t)?.alias_de && !visto.has(t)) {
    visto.add(t)
    t = defs.get(t).alias_de
  }
  return t
}

// Classifica um texto no termo final (com override, palavras-chave do usuário,
// vocabulário e descoberta — e resolvendo alias). ctx = { overrideMap, defs }.
export function classificarMotivo(texto, ctx = {}) {
  if (!texto) return null
  const { overrideMap, defs } = ctx
  const alvo = _semAcento(String(texto)).toUpperCase()
  let termo = null

  // 1) override por texto
  if (overrideMap) {
    const o = overrideMap.get(normNatureza(texto))
    if (o) termo = o
  }
  // 2) palavras-chave do usuário (captura mesmo se fundido — o alias redireciona
  //    depois; só pula grupo arquivado/excluído)
  if (!termo && defs) {
    for (const d of defs.values()) {
      if (d.arquivado || !d.palavras?.length) continue
      if (d.palavras.some((p) => { const pn = _semAcento(p).toUpperCase().trim(); return pn && alvo.includes(pn) })) {
        termo = d.termo; break
      }
    }
  }
  // 3) vocabulário (captura mesmo se fundido; pula só arquivado)
  if (!termo) {
    for (const v of VOCABULARIO_MOTIVO) {
      if (defs?.get(v.termo)?.arquivado) continue
      if (v.re.test(alvo)) { termo = v.termo; break }
    }
  }
  // 4) descoberta
  let descoberto = false
  if (!termo) {
    const dsc = _descobrir(alvo, defs)
    if (!dsc) return null
    termo = dsc.termo
    descoberto = true
  }
  // resolve alias
  if (defs) termo = _resolverAlias(termo, defs)
  return { termo, descoberto }
}

// Agrupa itens por motivo (v3). ctx = { overrideMap, defs, savedTermos }.
// Cada grupo carrega a definição (rótulo, invalido, palavras, builtin) + itens.
export function agruparMotivos(itens, ctx = {}) {
  const { defs = new Map(), savedTermos = new Set() } = ctx
  const grupos = new Map()
  for (const it of itens || []) {
    const r = classificarMotivo(it.natureza, ctx)
    if (!r) continue
    if (!grupos.has(r.termo)) {
      const d = defs.get(r.termo)
      grupos.set(r.termo, {
        termo: r.termo,
        rotulo: d?.rotulo || (r.termo.charAt(0).toUpperCase() + r.termo.slice(1)),
        invalido: d ? !!d.invalido : false,
        palavras: d?.palavras || [],
        builtin: !!d?.builtin,
        descoberto: !d && r.descoberto,
        classificado: savedTermos.has(r.termo),
        qtd: 0,
        itens: [],
      })
    }
    const g = grupos.get(r.termo)
    g.qtd++
    g.itens.push(it)
  }
  return Array.from(grupos.values()).sort((a, b) => b.qtd - a.qtd)
}

// Evolução mensal dos motivos inválidos (por mês da data-base = AIO, senão cadastro).
// processos: [{ _data_base }]. Devolve [{ mes: 'AAAA-MM', qtd }] em ordem cronológica.
export function evolucaoMotivosPorMes(processos) {
  const m = new Map()
  for (const p of processos || []) {
    const d = p._data_base
    if (!d) continue
    const mes = String(d).slice(0, 7)
    if (mes.length === 7) m.set(mes, (m.get(mes) || 0) + 1)
  }
  return [...m.entries()].map(([mes, qtd]) => ({ mes, qtd })).sort((a, b) => a.mes.localeCompare(b.mes))
}

// ── SLA 48h ─────────────────────────────────────────────────────────
export function normProc(s) {
  if (s === null || s === undefined) return ''
  return String(s).trim().replace(/^0+/, '').toUpperCase()
}

const MS_48H = 48 * 60 * 60 * 1000

export function buildObrasMap(obras) {
  const m = new Map()
  for (const o of obras || []) {
    const k = normProc(o.codigo_aio)
    if (!k) continue
    const cur = m.get(k)
    if (!cur || (o.data_inicio_obra && !cur.data_inicio_obra)) m.set(k, o)
  }
  return m
}

export function parseDataPrazo(iso) {
  if (!iso) return null
  const [y, mo, d] = String(iso).slice(0, 10).split('-').map(Number)
  if (!y || !mo || !d) return null
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))
}

export function buildPrazoRows(linhas, obrasMap, vistoriaMap = null, agora = Date.now()) {
  return linhas.map((r) => {
    const obra = obrasMap.get(normProc(r.num_processo)) || null
    const avisoInicio = obra?.data_inicio_obra || null
    const avisoTermino = obra?.data_fim_obra || null
    const baseIso = avisoInicio || r.data_cadastro || null
    const estimado = !avisoInicio && !!r.data_cadastro
    const baseDate = parseDataPrazo(baseIso)
    const prazoMs = baseDate ? baseDate.getTime() + MS_48H : null
    const isInformada = r.status === 'Informada'
    const vencido = prazoMs != null && isInformada && agora > prazoMs
    const diasAtraso = vencido ? Math.floor((agora - prazoMs) / 86400000) : null
    const vist = vistoriaMap?.get?.(normProc(r.num_processo))
    return {
      ...r,
      _aviso_inicio: avisoInicio,
      _aviso_termino: avisoTermino,
      _prazo_iso: prazoMs ? new Date(prazoMs).toISOString().slice(0, 10) : null,
      _prazo_ms: prazoMs,
      _estimado: estimado,
      _vencido: vencido,
      _dias_atraso: diasAtraso,
      _tipo_atraso: vencido ? (estimado ? 'estimado' : 'real') : null,
      _situacao: vencido ? 'Vencido' : 'Dentro do prazo',
      _possui_vistoria: vist ? 'Sim' : 'Não',
      _status_vistoria: vist ? statusVistoriaDe(vist) : '—',
    }
  })
}

export const FAIXAS_ATRASO = [
  { id: '0-2',  label: '0–2 dias',   min: 0,  max: 2 },
  { id: '3-7',  label: '3–7 dias',   min: 3,  max: 7 },
  { id: '8-30', label: '8–30 dias',  min: 8,  max: 30 },
  { id: '31+',  label: '31+ dias',   min: 31, max: Infinity },
]

export function faixaAtrasoDe(dias) {
  if (dias == null) return null
  return FAIXAS_ATRASO.find((f) => dias >= f.min && dias <= f.max)?.id || null
}

export function sortPrazo(rows, key, dir, tipo) {
  const fator = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (tipo === 'num') {
      const va = a[key] == null ? -Infinity : a[key]
      const vb = b[key] == null ? -Infinity : b[key]
      return (va - vb) * fator
    }
    const va = a[key] == null ? '' : String(a[key])
    const vb = b[key] == null ? '' : String(b[key])
    return va.localeCompare(vb, 'pt-BR', { sensitivity: 'base' }) * fator
  })
}

const SIGLA_ALIAS = { GU: 'G' }
export function normSubpref(sigla) { return SIGLA_ALIAS[sigla] ?? sigla }

export const COLS_PRAZO = [
  { key: 'num_processo',    label: 'Nº Processo',     tipo: 'str' },
  { key: 'permissionaria',  label: 'Permissionária',  tipo: 'str' },
  { key: 'subprefeitura',   label: 'Subpref.',        tipo: 'str' },
  { key: 'status',          label: 'Status',          tipo: 'str' },
  { key: 'data_cadastro',   label: 'Data Cadastro',   tipo: 'date' },
  { key: '_aviso_inicio',   label: 'Aviso Início',    tipo: 'date' },
  { key: '_aviso_termino',  label: 'Aviso Término',   tipo: 'date' },
  { key: '_prazo_iso',      label: 'Prazo (48h)',      tipo: 'date' },
  { key: '_dias_atraso',    label: 'Dias em atraso',  tipo: 'num' },
  { key: '_situacao',       label: 'Situação',        tipo: 'str' },
  { key: '_possui_vistoria',label: 'Possui Vistoria', tipo: 'str', sepBefore: true },
  { key: '_status_vistoria',label: 'Status Vistoria', tipo: 'str' },
]

export const COLS_PRAZO_EXPORT = [
  { key: 'num_processo',   label: 'Processo' },
  { key: 'permissionaria', label: 'Permissionária' },
  { key: 'subprefeitura',  label: 'Subprefeitura' },
  { key: 'status',         label: 'Status' },
  { key: 'data_cadastro',  label: 'Data Cadastro',   transform: (v) => fmtData(v) || '' },
  { key: '_aviso_inicio',  label: 'Aviso Início',    transform: (v) => fmtData(v) || '' },
  { key: '_aviso_termino', label: 'Aviso Término',   transform: (v) => fmtData(v) || '' },
  { key: '_prazo_iso',     label: 'Prazo (48h)',     transform: (v) => fmtData(v) || '' },
  { key: '_dias_atraso',   label: 'Dias em atraso',  transform: (v) => (v == null ? '' : v) },
  { key: '_possui_vistoria',label: 'Possui Vistoria' },
  { key: '_status_vistoria',label: 'Status Vistoria' },
  { key: '_situacao',      label: 'Situação' },
  { key: '_tipo_atraso',   label: 'Tipo de prazo',   transform: (_, r) => r._estimado ? 'Estimado (cadastro)' : 'Real (início)' },
]

// ── Vistorias (cruzamento com Fiscalização) ──────────────────────────
export function statusVistoriaDe(r) {
  if (r.legislacao_atendida) return 'Legislação Atendida'
  if (r.tem_nao_conformidade) {
    if (r.solucionado) return 'Solucionado'
    if (r.em_andamento) return 'Em Andamento'
    return 'Não Conformidade'
  }
  return r.status_simplificado || '—'
}

export function buildVistoriaMap(fiscalizacoes) {
  const m = new Map()
  if (!Array.isArray(fiscalizacoes)) return m
  for (const r of fiscalizacoes) {
    const key = normProc(r.id_origem)
    if (!key) continue
    const existing = m.get(key)
    if (!existing) {
      m.set(key, r)
    } else {
      const a = r.data_inicio || ''
      const b = existing.data_inicio || ''
      if (a > b) m.set(key, r)
    }
  }
  return m
}

// ── Filtros ──────────────────────────────────────────────────────────
export const STATUS_VISTORIA_OPTS = [
  'Legislação Atendida',
  'Solucionado',
  'Em Andamento',
  'Não Conformidade',
  'Sem vistoria',
]

export const FILTROS_VAZIOS_EMERG = {
  dataIni: null,
  dataFim: null,
  permissionarias: new Set(),
  possuiVistoria: 'todas',
  statusVistoria: new Set(),
  statusSistemaGeo: new Set(),
}

export function aplicarFiltrosEmerg(rows, filtros, vistoriaMap = null) {
  const { dataIni, dataFim, permissionarias, possuiVistoria, statusVistoria, statusSistemaGeo } = filtros
  const permSet = permissionarias instanceof Set ? permissionarias : new Set()
  const stVistSet = statusVistoria instanceof Set ? statusVistoria : new Set()
  const stGeoSet = statusSistemaGeo instanceof Set ? statusSistemaGeo : new Set()
  const usaNorcrestCons = permSet.has('NORCREST')
  const filtraVist = possuiVistoria && possuiVistoria !== 'todas'
  const filtraStVist = stVistSet.size > 0

  return rows.filter((r) => {
    if (dataIni && (!r.data_cadastro || r.data_cadastro < dataIni)) return false
    if (dataFim && (!r.data_cadastro || r.data_cadastro > dataFim)) return false
    if (permSet.size > 0) {
      const p = r.permissionaria || ''
      if (usaNorcrestCons && String(p).toUpperCase().startsWith('NORCREST')) {
        // ok
      } else if (!permSet.has(p)) {
        return false
      }
    }
    if (stGeoSet.size > 0) {
      if (!stGeoSet.has(r.status)) return false
    }
    if ((filtraVist || filtraStVist) && vistoriaMap) {
      const key = normProc(r.num_processo)
      const v = vistoriaMap.get(key)
      const tem = !!v
      if (filtraVist) {
        if (possuiVistoria === 'sim' && !tem) return false
        if (possuiVistoria === 'nao' && tem) return false
      }
      if (filtraStVist) {
        const st = tem ? statusVistoriaDe(v) : 'Sem vistoria'
        if (!stVistSet.has(st)) return false
      }
    }
    return true
  })
}

// ── Agregações ───────────────────────────────────────────────────────
export function agregaPorStatus(rows) {
  const m = {}
  for (const r of rows) { const s = r.status || 'Sem status'; m[s] = (m[s] || 0) + 1 }
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([status, qtd]) => ({ status, qtd }))
}

export function agregaPorPermissionaria(rows, { consolidar = true, somenteInformadas = false } = {}) {
  const m = new Map()
  for (const r of rows) {
    if (somenteInformadas && r.status !== 'Informada') continue
    const key = consolidar ? consolidarNorcrest(r.permissionaria) : r.permissionaria || '(sem)'
    if (!key) continue
    if (!m.has(key)) m.set(key, { nome: key, total: 0, por_status: {} })
    const o = m.get(key)
    o.total++
    const s = r.status || 'Sem status'
    o.por_status[s] = (o.por_status[s] || 0) + 1
  }
  return Array.from(m.values()).sort((a, b) => {
    if (somenteInformadas) return b.total - a.total
    return (b.por_status['Informada'] || 0) - (a.por_status['Informada'] || 0)
  })
}

// Colunas fixas da tabela cruzada (na ordem de exibição).
// Status que não estão aqui são somados na coluna "_Outros".
export const COLUNAS_CRUZADA = STATUS_FIXOS_EMERG  // ['Encerrada','Informada','Cancelada','Revisão']

export function tabelaCruzada(rows, consolidar = true) {
  const m = {}
  for (const r of rows) {
    const key = consolidar ? consolidarNorcrest(r.permissionaria) : r.permissionaria || '(sem)'
    if (!key) continue
    if (!m[key]) m[key] = { _total: 0, _Outros: 0 }
    const st = r.status || 'Sem status'
    if (COLUNAS_CRUZADA.includes(st)) {
      m[key][st] = (m[key][st] || 0) + 1
    } else {
      m[key]._Outros += 1
    }
    m[key]._total += 1
  }
  const linhas = Object.entries(m)
    .map(([perm, vals]) => ({ permissionaria: perm, ...vals }))
    .sort((a, b) => (b['Informada'] || 0) - (a['Informada'] || 0))
  // colunasStatus: ordem fixa + "Outros" só se houver algum valor
  const temOutros = linhas.some((l) => l._Outros > 0)
  const colunasStatus = temOutros ? [...COLUNAS_CRUZADA, '_Outros'] : [...COLUNAS_CRUZADA]
  return { linhas, colunasStatus }
}

export function agregaPorSubprefeitura(rows, { somenteInformadas = false } = {}) {
  const m = {}
  for (const r of rows) {
    if (somenteInformadas && r.status !== 'Informada') continue
    const k = r.subprefeitura || '(sem)'
    m[k] = (m[k] || 0) + 1
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([nome, qtd]) => ({ nome, qtd }))
}

export function agregaPorEtapa(rows) {
  const m = {}
  for (const r of rows) {
    const k = r.etapa || '(sem)'
    if (!m[k]) m[k] = { etapa: k, Informada: 0, Encerrada: 0, Outras: 0 }
    if (r.status === 'Informada') m[k].Informada++
    else if (r.status === 'Encerrada') m[k].Encerrada++
    else m[k].Outras++
  }
  return Object.values(m).sort(
    (a, b) => b.Informada + b.Encerrada + b.Outras - (a.Informada + a.Encerrada + a.Outras)
  )
}

export function evolucaoMensal(rows) {
  const m = {}
  for (const r of rows) {
    if (!r.data_cadastro) continue
    const mes = r.data_cadastro.slice(0, 7)
    if (!m[mes]) m[mes] = { mes, total: 0, informadas: 0, encerradas: 0 }
    m[mes].total++
    if (r.status === 'Informada') m[mes].informadas++
    else if (r.status === 'Encerrada') m[mes].encerradas++
  }
  return Object.values(m).sort((a, b) => a.mes.localeCompare(b.mes))
}

export const COLUNAS_EXPORT = [
  { key: 'num_processo',   label: 'Processo' },
  { key: 'data_cadastro',  label: 'Data Cadastro',  transform: (v) => fmtData(v) || '' },
  { key: 'etapa',          label: 'Etapa' },
  { key: 'permissionaria', label: 'Permissionária' },
  { key: 'status',         label: 'Status' },
  { key: 'subprefeitura',  label: 'Subprefeitura' },
  { key: 'possui_vistoria',label: 'Possui Vistoria?' },
  { key: 'status_vistoria',label: 'Status Vistoria' },
]

export function enrichRow(r, vistoriaMap) {
  const key = normProc(r.num_processo)
  const v = vistoriaMap?.get?.(key)
  return { ...r, possui_vistoria: v ? 'Sim' : 'Não', status_vistoria: v ? statusVistoriaDe(v) : '—' }
}

// Export Excel com suporte a transform por coluna e auto-largura baseada em dados.
// Mantido separado do exportarXLSX.js genérico por ter assinatura diferente (transform).
export function exportXLSX(rows, columns, filename, sheetName = 'Dados') {
  const data = rows.map((r) => {
    const o = {}
    for (const c of columns) {
      const v = r[c.key]
      o[c.label] = c.transform ? c.transform(v, r) : (v ?? '')
    }
    return o
  })
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.label) })
  ws['!cols'] = columns.map((c) => {
    const max = data.reduce((m, row) => Math.max(m, String(row[c.label] ?? '').length), c.label.length)
    return { wch: Math.min(Math.max(max + 2, 10), 40) }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, filename)
}
