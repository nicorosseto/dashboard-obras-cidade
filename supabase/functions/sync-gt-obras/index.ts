// ============================================================
// sync-gt-obras — Edge Function (módulo "GT Obras")
// ============================================================
// Baixa a planilha "[GT - Obras]" (PROCESSOS_SISTEMA GEO - 2026.xlsx, Google
// Drive, .xlsx em modo de compatibilidade Office) via Google Drive API,
// autenticando como a conta de serviço `obras-multas-leitor`
// (reaproveitada — D5), faz o parsing SELETIVO de DUAS abas —
// "COMPATIB. CAMILA" (base granular) e "DASH (GT)" (painel consolidado) —
// e grava (upsert) em `public.gt_obras` e `public.gt_dash`.
//
// Dashboard é READ-ONLY — esta função é o ÚNICO caminho de escrita das
// duas tabelas. Ver docs/plano-modulo-gt-obras.md para o contrato completo.
//
// ⚠️ Diferente do sync-multas: SEM CRON (D4, decisão do usuário em
// 27/07/2026) — só roda quando o admin clica "Atualizar agora". Por isso
// não há lógica de auto-limite por intervalo aqui; toda invocação executa.
//
// Secrets exigidos (Project Settings → Edge Functions → Secrets):
//   GOOGLE_SERVICE_ACCOUNT_JSON — o MESMO secret já cadastrado para o
//   sync-multas (conta de serviço `obras-multas-leitor`). Não precisa
//   cadastrar nada novo (D5).
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetados
// automaticamente pelo runtime das Edge Functions.
//
// ── Parser XML seletivo (mesmo motivo do sync-multas, 13/07/2026) ───
// SheetJS descomprime o workbook INTEIRO (17 abas, 9 MB comprimido / 33
// MB descomprimido neste arquivo — 3× maior que o de Multas) e estoura
// o limite de memória do runtime. Este parser descompacta SÓ os 2
// arquivos XML das abas do escopo + sharedStrings.xml, nunca as outras
// 15 abas. A lógica de negócio (mapeamento de colunas, datas, status)
// é 100% própria deste módulo — não há import de src/ (runtime Deno
// separado do bundle do front).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6'
import { unzipSync } from 'https://esm.sh/fflate@0.8.2'

const DRIVE_FILE_ID = '1TbsDO6ETfz_ESIVUJVuEM_w1otIHPZec'
const ABA_BASE = 'COMPATIB. CAMILA'
const ABA_DASH = 'DASH (GT)'
const LINHA_CABECALHO = 2 // nomes das colunas; linha 3 = sub-cabeçalho DE/ATÉ (ignorada — mapeamos por posição)
const PRIMEIRA_LINHA_DADOS = 4
const LINHA_TETO_SANIDADE = 5000 // planilhas "fantasma" (formatação colada sem dado) — não ler além disso

// ── Duplicação deliberada de toIsoDate/normProc (src/lib/) ──────────
// Ver dominio.md, "toIsoDate unificado". Qualquer correção de parsing de
// data feita em src/lib/datas.js deve ser replicada aqui (e no sync-multas).
function toIsoDate(v: unknown): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    const y = v.getUTCFullYear()
    const m = String(v.getUTCMonth() + 1).padStart(2, '0')
    const d = String(v.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof v === 'number') {
    if (!isFinite(v) || v < 1) return null
    const dias = Math.floor(v)
    const epoch = Date.UTC(1899, 11, dias < 61 ? 31 : 30)
    const d = new Date(epoch + dias * 86400000)
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${d.getUTCFullYear()}-${mm}-${dd}`
  }
  const s = String(v).trim()
  if (!s) return null
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return null
}

function normProc(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s).trim().replace(/^0+/, '').toUpperCase()
}

// Base de toda normalização de texto do módulo: trim + colapso de
// espaços + remoção de acento (NFD) + caixa alta. Unifica sozinho casos
// como "CONCLUÍDO"/"CONCLUIDO" e "Daniela"/"DANIELA" (achados 2.4) —
// só variações de grafia mais estruturais (ex.: abreviações de
// "Manutenção Preventiva") precisam de canonização à parte (ver
// canonizarObraServico).
function normalizaTexto(v: unknown): string {
  if (v == null) return ''
  return String(v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeHeader(s: string): string {
  return s
    .replace(/[°º]/g, '')
    .replace(/²/g, '2')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// D1 (27/07/2026): "compatibilizada" = AEO EMITIDO ou LIBERAR; os outros
// 8 status contam todos como "paralisada" (dicotomia binária). Chaves já
// normalizadas (normalizaTexto). Status fora deste mapa (planilha viva,
// pode trazer um valor novo) caem em 'nao_classificado' — rede de
// segurança, nunca quebram a sincronização nem viram um dos dois grupos
// por adivinhação.
const STATUS_GRUPO: Record<string, 'compatibilizada' | 'paralisada'> = {
  'AEO EMITIDO': 'compatibilizada',
  LIBERAR: 'compatibilizada',
  'AGUARDANDO DELIBERACAO': 'paralisada',
  CANCELADO: 'paralisada',
  'DOCS ASSINADOS': 'paralisada',
  'AGUARDANDO COMUNIQUE-SE': 'paralisada',
  'CAMILA VERIFICAR': 'paralisada',
  SEGURAR: 'paralisada',
  'NAO EMITIR': 'paralisada',
  'AGUARDANDO ASSINATURA': 'paralisada',
}

// Canoniza só as variações de grafia já confirmadas na análise (seção
// 2.4 item 5) — abreviações de "Manutenção Preventiva" e as 2 formas de
// "Ligação Domiciliar". Qualquer outro valor passa normalizado, mas sem
// canonizar (regra de ouro: nunca inventar uma correspondência não vista).
function canonizarObraServico(norm: string): string {
  if (norm.startsWith('MANUT') && norm.includes('PREVENT'))
    return 'MANUTENCAO PREVENTIVA'
  if (norm.includes('LIGACAO') && norm.includes('DOMICILIAR'))
    return 'LIGACAO DOMICILIAR'
  return norm
}

// Chave sintética (6.3 do plano): nº de processo NÃO é único na aba
// "COMPATIB. CAMILA" (48 processos aparecem em mais de uma linha, um por
// trecho) — usa-se hash de campos estáveis, mesmo padrão já validado no
// sync-multas para linhas sem auto_multa.
async function chaveSinteticaGt(l: Record<string, unknown>): Promise<string> {
  const partes = [l.num_processo, l.nome_via, l.trecho_de, l.trecho_ate, l.linha_planilha]
    .map((v) => (v == null ? '' : String(v)))
    .join('|')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(partes)
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Mapa de colunas por POSIÇÃO (0-based) da aba "COMPATIB. CAMILA" — não
// por nome, porque a aba tem cabeçalhos repetidos (TRECHO 4×, ÁREA TOTAL
// DA VIA (m²) 2×). Ver docs/plano-modulo-gt-obras.md, seção 2.5.
const POSICAO_COMPATIB: Record<number, string> = {
  0: 'permissionaria',
  1: 'num_processo',
  2: 'obra_servico',
  3: 'executora',
  4: 'subprefeitura',
  5: 'nome_via',
  6: 'trecho_de',
  7: 'trecho_ate',
  9: 'previsao_execucao', // texto livre, nunca data
  10: 'status',
  11: 'observacao',
  13: 'area_m2', // a "metragem" (coluna 8/I é lixo — não ingerida)
  14: 'revestimento',
  15: 'recape_trecho_de',
  16: 'recape_trecho_ate',
  17: 'responsavel_recape',
  18: 'situacao_recape',
  19: 'data_conclusao',
  21: 'observacao_obras',
  23: 'tecnica_analise',
  25: 'observacao_gt',
}

async function getGoogleAccessToken(
  serviceAccountJson: string
): Promise<string> {
  const creds = JSON.parse(serviceAccountJson) as {
    client_email: string
    private_key: string
    token_uri?: string
  }
  const key = await importPKCS8(creds.private_key, 'RS256')
  const now = Math.floor(Date.now() / 1000)
  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/drive.readonly',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(creds.client_email)
    .setSubject(creds.client_email)
    .setAudience(creds.token_uri || 'https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) {
    throw new Error(
      `Falha ao obter token Google (${res.status}): ${await res.text()}`
    )
  }
  const data = await res.json()
  return data.access_token as string
}

async function baixarPlanilha(accessToken: string): Promise<ArrayBuffer> {
  const url = `https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(
      `Falha ao baixar planilha do Drive (${res.status}): ${await res.text()}`
    )
  }
  return await res.arrayBuffer()
}

// ── Helpers de XML mínimo (idênticos ao sync-multas — sem DOM, só regex) ──

function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function colLetraParaIndice(letras: string): number {
  let idx = 0
  for (let i = 0; i < letras.length; i++) {
    idx = idx * 26 + (letras.charCodeAt(i) - 64)
  }
  return idx - 1
}

function extrairAtributo(tag: string, nome: string): string | null {
  const m = tag.match(new RegExp(nome + '="([^"]*)"'))
  return m ? m[1] : null
}

function extrairTextoDeTs(xml: string): string {
  let texto = ''
  const reT = /<t[^>]*>([\s\S]*?)<\/t>|<t[^>]*\/>/g
  let mt: RegExpExecArray | null
  while ((mt = reT.exec(xml))) {
    if (mt[1]) texto += decodeXml(mt[1])
  }
  return texto
}

function acharSheetRid(workbookXml: string, nomeAba: string): string {
  const re = /<sheet\b[^>]*\/>/g
  const nomes: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(workbookXml))) {
    const tag = m[0]
    const nameAttr = extrairAtributo(tag, 'name')
    if (nameAttr == null) continue
    const nome = decodeXml(nameAttr)
    nomes.push(nome)
    if (nome === nomeAba) {
      const rid = extrairAtributo(tag, 'r:id')
      if (!rid)
        throw new Error(
          `Aba "${nomeAba}" encontrada em workbook.xml mas sem atributo r:id.`
        )
      return rid
    }
  }
  throw new Error(
    `Aba "${nomeAba}" não encontrada. Abas disponíveis: ${nomes.join(', ')}`
  )
}

function acharWorksheetPath(relsXml: string, rid: string): string {
  const re = /<Relationship\b[^>]*\/>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(relsXml))) {
    const tag = m[0]
    const id = extrairAtributo(tag, 'Id')
    if (id !== rid) continue
    const targetAttr = extrairAtributo(tag, 'Target')
    if (!targetAttr) continue
    const target = decodeXml(targetAttr)
    if (target.startsWith('/')) return target.replace(/^\//, '')
    return `xl/${target.replace(/^\.?\//, '')}`
  }
  throw new Error(`Relationship "${rid}" não encontrado em workbook.xml.rels.`)
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = []
  const reSi = /<si>([\s\S]*?)<\/si>|<si\/>/g
  let m: RegExpExecArray | null
  while ((m = reSi.exec(xml))) {
    strings.push(m[1] == null ? '' : extrairTextoDeTs(m[1]))
  }
  return strings
}

type Celula = { col: number; valor: unknown }
type Linha = { r: number; celulas: Celula[] }

function parseValorCelula(
  attrs: string,
  inner: string | undefined,
  sharedStrings: string[]
): unknown {
  if (inner === undefined) return null
  const tipo = extrairAtributo(attrs, 't')

  if (tipo === 's') {
    const v = extrairTag(inner, 'v')
    if (v == null) return null
    const idx = parseInt(v, 10)
    return isNaN(idx) ? null : (sharedStrings[idx] ?? null)
  }
  if (tipo === 'str') {
    const v = extrairTag(inner, 'v')
    return v == null ? null : decodeXml(v)
  }
  if (tipo === 'inlineStr') {
    const isMatch = inner.match(/<is>([\s\S]*?)<\/is>/)
    return isMatch ? extrairTextoDeTs(isMatch[1]) : null
  }
  if (tipo === 'b') {
    const v = extrairTag(inner, 'v')
    return v === '1'
  }
  if (tipo === 'e') {
    return null // célula com erro de fórmula (#N/A, #REF!...) — descarta
  }
  const v = extrairTag(inner, 'v')
  if (v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function extrairTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  return m ? m[1] : null
}

function parseWorksheetXml(xml: string, sharedStrings: string[]): Linha[] {
  const linhas: Linha[] = []
  const reRow = /<row\b([^>]*?)\/>|<row\b([^>]*?)>([\s\S]*?)<\/row>/g
  let m: RegExpExecArray | null
  while ((m = reRow.exec(xml))) {
    const attrs = m[1] ?? m[2] ?? ''
    const conteudo = m[3]
    const rAttr = extrairAtributo(attrs, 'r')
    const r = rAttr ? parseInt(rAttr, 10) : NaN
    if (isNaN(r)) continue
    if (r > LINHA_TETO_SANIDADE) break

    const celulas: Celula[] = []
    if (conteudo) {
      const reCell = /<c\b([^>]*?)\/>|<c\b([^>]*?)>([\s\S]*?)<\/c>/g
      let mc: RegExpExecArray | null
      while ((mc = reCell.exec(conteudo))) {
        const cAttrs = mc[1] ?? mc[2] ?? ''
        const cInner = mc[3]
        const refAttr = extrairAtributo(cAttrs, 'r')
        if (!refAttr) continue
        const letrasMatch = refAttr.match(/^([A-Z]+)/)
        if (!letrasMatch) continue
        const col = colLetraParaIndice(letrasMatch[1])
        const valor = parseValorCelula(cAttrs, cInner, sharedStrings)
        celulas.push({ col, valor })
      }
    }
    linhas.push({ r, celulas })
  }
  return linhas
}

// Validação de sanidade do cabeçalho (6.4 do plano): aborta a
// sincronização se alguém inseriu/removeu uma coluna no meio da
// planilha — nunca grava dado deslocado.
function validarCabecalhoCompatib(linhaCabecalho: Linha) {
  const esperado: Record<number, string> = {
    0: 'PERMISSIONARIA',
    1: 'PROCESSO',
    10: 'STATUS',
    13: 'AREA TOTAL DA VIA (M2)',
    18: 'SITUACAO RECAPE',
  }
  const valoresPorColuna = new Map(
    linhaCabecalho.celulas.map((c) => [c.col, c.valor])
  )
  for (const [posStr, esperadoTxt] of Object.entries(esperado)) {
    const pos = Number(posStr)
    const bruto = valoresPorColuna.get(pos)
    const norm = normalizeHeader(String(bruto ?? ''))
    if (norm !== esperadoTxt) {
      throw new Error(
        `Cabeçalho da aba "${ABA_BASE}" mudou — posição ${pos} esperava "${esperadoTxt}", achou "${norm}". Abortando sincronização (a planilha pode ter tido uma coluna inserida/removida).`
      )
    }
  }
}

// Campos "de processo" — no Excel, quando um processo tem mais de uma
// via/trecho, essas colunas vêm como CÉLULA MESCLADA (o valor só existe na
// 1ª linha do grupo; as linhas de continuação chegam vazias aqui, mesmo a
// planilha "mostrando" o mesmo valor visualmente). Achado do usuário em
// 27/07/2026 (screenshot com um processo em 3 linhas — permissionária/
// processo/status só na 1ª). "Preenchidos para baixo" a partir da última
// linha que tinha o dado — nunca as colunas específicas de cada via
// (nome_via/trechos/área), que continuam genuinamente uma por linha.
const CAMPOS_PROCESSO = [
  'permissionaria',
  'num_processo',
  'obra_servico',
  'executora',
  'subprefeitura',
  'status',
  'tecnica_analise',
] as const

// ── Parsing da aba "COMPATIB. CAMILA" (base granular) ────────────────
function parseCompatibCamila(linhasXml: Linha[]): Record<string, unknown>[] {
  const linhaCabecalho = linhasXml.find((l) => l.r === LINHA_CABECALHO)
  if (!linhaCabecalho) {
    throw new Error(
      `Linha de cabeçalho (${LINHA_CABECALHO}) não encontrada na aba "${ABA_BASE}".`
    )
  }
  validarCabecalhoCompatib(linhaCabecalho)

  const linhas: Record<string, unknown>[] = []
  let ultimoProcesso: Record<string, unknown> | null = null
  for (const linhaXml of linhasXml) {
    if (linhaXml.r < PRIMEIRA_LINHA_DADOS) continue

    const valoresPorColuna = new Map<number, unknown>()
    for (const { col, valor } of linhaXml.celulas) valoresPorColuna.set(col, valor)

    const mapeada: Record<string, unknown> = {
      linha_planilha: linhaXml.r,
      atualizado_em: new Date().toISOString(),
    }
    for (const [posStr, key] of Object.entries(POSICAO_COMPATIB)) {
      const col = Number(posStr)
      const valor = valoresPorColuna.has(col) ? valoresPorColuna.get(col) : null
      if (key === 'data_conclusao') {
        mapeada[key] = toIsoDate(valor)
      } else if (key === 'area_m2') {
        const n =
          typeof valor === 'number'
            ? valor
            : parseFloat(String(valor ?? '').replace(',', '.'))
        mapeada[key] = isNaN(n) ? null : n
      } else {
        const s = valor == null ? '' : String(valor).trim()
        mapeada[key] = s === '' ? null : s
      }
    }

    const temDadoProcesso = CAMPOS_PROCESSO.some(
      (k) => mapeada[k] != null && mapeada[k] !== ''
    )
    const temDadoVia =
      (mapeada.trecho_de != null && mapeada.trecho_de !== '') ||
      (mapeada.trecho_ate != null && mapeada.trecho_ate !== '') ||
      (mapeada.nome_via != null && mapeada.nome_via !== '') ||
      (mapeada.area_m2 != null && mapeada.area_m2 !== 0)

    if (temDadoProcesso) {
      ultimoProcesso = Object.fromEntries(
        CAMPOS_PROCESSO.map((k) => [k, mapeada[k]])
      )
    } else if (temDadoVia && ultimoProcesso) {
      // Linha de continuação (célula mesclada) — herda os campos do
      // processo da última linha "âncora", mantendo os dados da via
      // (trechos/área) só desta linha.
      for (const k of CAMPOS_PROCESSO) mapeada[k] = ultimoProcesso[k]
    }

    // Linha válida = tem PERMISSIONÁRIA OU PROCESSO (critério da própria
    // planilha — seção 2.1 do plano: "1.856 linhas com permissionária ou
    // processo, de 3.102 linhas de grade"), já considerando o preenchimento
    // acima. Um "algum campo preenchido" genérico contava também
    // linhas-fantasma da grade (só com uma observação solta, sem processo
    // nem empresa) — achado em produção em 27/07/2026 (total_linhas veio
    // 2.238 em vez de ~1.856, quase todo o excesso caindo em sem_processo).
    const temPermissionariaOuProcesso =
      (mapeada.permissionaria != null && mapeada.permissionaria !== '') ||
      (mapeada.num_processo != null && mapeada.num_processo !== '')
    if (!temPermissionariaOuProcesso) continue

    const numProcessoBruto = mapeada.num_processo as string | null
    const semProcesso = !numProcessoBruto
    mapeada.num_processo_normalizado = semProcesso
      ? null
      : normProc(numProcessoBruto)
    mapeada.situacao_vinculo = semProcesso ? 'sem_processo' : 'nao_avaliado'

    const anoMatch = numProcessoBruto
      ? String(numProcessoBruto).match(/6012\.(\d{4})/)
      : null
    mapeada.ano_processo = anoMatch ? parseInt(anoMatch[1], 10) : null

    const statusNorm = normalizaTexto(mapeada.status)
    mapeada.status_norm = statusNorm || null
    mapeada.status_grupo = STATUS_GRUPO[statusNorm] ?? 'nao_classificado'

    mapeada.obra_servico_norm =
      canonizarObraServico(normalizaTexto(mapeada.obra_servico)) || null
    mapeada.situacao_recape_norm = normalizaTexto(mapeada.situacao_recape) || null

    const permissionariaBruta = String(mapeada.permissionaria ?? '')
    if (/^NORCREST/i.test(permissionariaBruta.trim()) && permissionariaBruta.includes('/')) {
      const [base, unidade] = permissionariaBruta.split('/')
      mapeada.permissionaria_norm = normalizaTexto(base)
      mapeada.unidade_norcrest = unidade ? unidade.trim().toUpperCase() : null
    } else {
      mapeada.permissionaria_norm = normalizaTexto(mapeada.permissionaria) || null
      mapeada.unidade_norcrest = null
    }

    linhas.push(mapeada)
  }
  return linhas
}

// ── Parsing da aba "DASH (GT)" (painel consolidado, 4 blocos) ───────
// Não é uma tabela uniforme: varre linha a linha procurando a linha de
// cabeçalho de cada bloco (coluna B = "Qtde de Obras"; o rótulo do
// bloco fica na coluna A da MESMA linha). Ver seção 6.6 do plano.
function normalizarRotuloBloco(
  txt: string
): 'total_geral' | '2025_2026' | '2024' | '2023' | null {
  const n = normalizaTexto(txt)
  if (n.includes('GERAL')) return 'total_geral'
  if (n.includes('2025') && n.includes('2026')) return '2025_2026'
  if (n === '2024') return '2024'
  if (n === '2023') return '2023'
  return null
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? null : n
}

function parseDash(linhasXml: Linha[]): Record<string, unknown>[] {
  const linhas: Record<string, unknown>[] = []
  let blocoAtual: string | null = null

  for (const linhaXml of linhasXml) {
    const valoresPorColuna = new Map<number, unknown>()
    for (const { col, valor } of linhaXml.celulas) valoresPorColuna.set(col, valor)

    const colBNorm = normalizaTexto(valoresPorColuna.get(1))
    if (colBNorm === 'QTDE DE OBRAS') {
      const bloco = normalizarRotuloBloco(String(valoresPorColuna.get(0) ?? ''))
      if (bloco) blocoAtual = bloco
      continue // linha de cabeçalho do bloco — não é dado
    }
    if (!blocoAtual) continue // ainda não achamos o 1º bloco

    const permissionariaBruta = valoresPorColuna.get(0)
    const permissionaria =
      permissionariaBruta == null ? '' : String(permissionariaBruta).trim()
    if (!permissionaria) continue // linha em branco entre blocos

    const qtdeObras = numOrNull(valoresPorColuna.get(1))
    const obrasCompat = numOrNull(valoresPorColuna.get(2))
    const obrasParal = numOrNull(valoresPorColuna.get(3))
    const metragemCompat = numOrNull(valoresPorColuna.get(4))
    const pctCompat = numOrNull(valoresPorColuna.get(5))
    const valorEstimado = numOrNull(valoresPorColuna.get(6))

    const permissionariaNorm = normalizaTexto(permissionaria)
    let tipoLinha: 'permissionaria' | 'total' | 'agrupamento' = 'permissionaria'
    if (permissionariaNorm.startsWith('TOTAL GERAL')) tipoLinha = 'total'
    else if (permissionariaNorm.includes('NORCREST') && permissionariaNorm.includes('WINSLOW'))
      tipoLinha = 'agrupamento'
    else if (permissionariaNorm === 'OUTROS') tipoLinha = 'agrupamento'

    // tem_erro_formula (D2): valor negativo, ou
    // compatibilizadas + paralisadas ≠ qtde_obras — rede de segurança
    // geral (nenhum caso real confirmado até 27/07/2026; o exemplo
    // citado inicialmente, AXWELL TELECOM, era erro de leitura
    // do screenshot pelo executor — a linha real está zerada). A
    // divergência de soma entre os 3 blocos anuais e o "total_geral" é
    // checada à parte, no front-end (conferirDashVsBase, Fase 2) — não
    // dá para comparar blocos aqui, linha a linha.
    let temErro = false
    if (qtdeObras != null && qtdeObras < 0) temErro = true
    if (obrasCompat != null && obrasCompat < 0) temErro = true
    if (obrasParal != null && obrasParal < 0) temErro = true
    if (
      qtdeObras != null &&
      obrasCompat != null &&
      obrasParal != null &&
      obrasCompat + obrasParal !== qtdeObras
    )
      temErro = true

    linhas.push({
      bloco: blocoAtual,
      permissionaria,
      tipo_linha: tipoLinha,
      qtde_obras: qtdeObras,
      obras_compatibilizadas: obrasCompat,
      obras_paralisadas: obrasParal,
      metragem_compatibilizada: metragemCompat,
      pct_compatibilizada: pctCompat,
      valor_estimado: valorEstimado,
      tem_erro_formula: temErro,
      linha_planilha: linhaXml.r,
      atualizado_em: new Date().toISOString(),
    })
  }
  return linhas
}

// Validação de sanidade dos blocos do DASH (achado de 30/07/2026): o
// `parseDash` acima só avança `blocoAtual` quando reconhece a linha de
// cabeçalho de um bloco (coluna B === "QTDE DE OBRAS" + rótulo da coluna A
// batendo em `normalizarRotuloBloco`). Se o cabeçalho de UM bloco não bater
// por qualquer motivo (espaço extra, variação de texto…), `blocoAtual` NÃO
// avança e as linhas seguintes ficam marcadas com o bloco ANTERIOR — sem
// nenhum erro visível. Sintoma real observado no gráfico "Série Histórica
// por Ano" (Visão Geral do GT Obras): o bloco "2025/2026" mostrava um total
// muito maior que o esperado, perto da soma dos 3 blocos anuais — indício
// de que a linha "Total Geral" (bloco à parte) ficou marcada como se fosse
// do bloco "2025/2026" e sobrescreveu a linha certa no dedup por
// `bloco|permissionaria` (upsert). Trava aqui: cada um dos 4 blocos
// esperados precisa ter EXATAMENTE 1 linha com `tipo_linha === 'total'` —
// zero indica que o cabeçalho do bloco não foi reconhecido (linhas foram
// parar no bloco anterior); mais de uma indica a mesma coisa no bloco que
// "roubou" as linhas.
function validarBlocosDash(linhas: Record<string, unknown>[]) {
  const BLOCOS_ESPERADOS = ['2023', '2024', '2025_2026', 'total_geral']
  for (const bloco of BLOCOS_ESPERADOS) {
    const totais = linhas.filter(
      (l) => l.bloco === bloco && l.tipo_linha === 'total'
    )
    if (totais.length !== 1) {
      throw new Error(
        `Bloco "${bloco}" da aba "${ABA_DASH}" tem ${totais.length} linha(s) "Total Geral" (esperado: 1). Isso costuma indicar que o cabeçalho de um bloco vizinho não foi reconhecido e as linhas ficaram marcadas com o bloco errado. Abortando sincronização (senão a "Série Histórica por Ano" fica incorreta).`
      )
    }
  }
}

// ── CORS ────────────────────────────────────────────────────────────
// O botão "Atualizar agora" chama esta função DO NAVEGADOR — sem estes
// headers o preflight OPTIONS falha (mesma lição do sync-multas,
// 16/07/2026).
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if (!serviceAccountJson)
      throw new Error('Secret GOOGLE_SERVICE_ACCOUNT_JSON não configurado.')

    const accessToken = await getGoogleAccessToken(serviceAccountJson)
    console.log('[sync-gt-obras] token Google OK')

    const buffer = await baixarPlanilha(accessToken)
    console.log(
      `[sync-gt-obras] download OK: ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB`
    )

    // Carimbo do início desta sincronização — usado depois para achar
    // linhas "órfãs" em AMBAS as tabelas (ver DELETEs mais abaixo).
    const inicioSync = new Date()

    const bytes = new Uint8Array(buffer)
    const decoder = new TextDecoder('utf-8')

    // 1ª passada: só workbook.xml + rels — descobre os sheetN.xml das
    // DUAS abas do escopo. Descompactar só esses 2 arquivos (pequenos) é
    // praticamente grátis.
    const passo1 = unzipSync(bytes, {
      filter: (file) =>
        file.name === 'xl/workbook.xml' ||
        file.name === 'xl/_rels/workbook.xml.rels',
    })
    const workbookXmlBytes = passo1['xl/workbook.xml']
    const relsXmlBytes = passo1['xl/_rels/workbook.xml.rels']
    if (!workbookXmlBytes)
      throw new Error('xl/workbook.xml não encontrado dentro do .xlsx.')
    if (!relsXmlBytes)
      throw new Error(
        'xl/_rels/workbook.xml.rels não encontrado dentro do .xlsx.'
      )
    const workbookXml = decoder.decode(workbookXmlBytes)
    const relsXml = decoder.decode(relsXmlBytes)

    const ridBase = acharSheetRid(workbookXml, ABA_BASE)
    const ridDash = acharSheetRid(workbookXml, ABA_DASH)
    const pathBase = acharWorksheetPath(relsXml, ridBase)
    const pathDash = acharWorksheetPath(relsXml, ridDash)
    console.log(
      `[sync-gt-obras] abas encontradas: ${pathBase} (base), ${pathDash} (dash)`
    )

    // 2ª passada: só as DUAS worksheets certas + sharedStrings — as
    // outras 15 abas do arquivo nunca são descompactadas (seção 2.6).
    const passo2 = unzipSync(bytes, {
      filter: (file) =>
        file.name === pathBase ||
        file.name === pathDash ||
        file.name === 'xl/sharedStrings.xml',
    })
    const worksheetBaseBytes = passo2[pathBase]
    const worksheetDashBytes = passo2[pathDash]
    if (!worksheetBaseBytes)
      throw new Error(`Worksheet "${pathBase}" (${ABA_BASE}) não encontrada.`)
    if (!worksheetDashBytes)
      throw new Error(`Worksheet "${pathDash}" (${ABA_DASH}) não encontrada.`)
    const sharedStringsBytes = passo2['xl/sharedStrings.xml']
    const sharedStrings = sharedStringsBytes
      ? parseSharedStrings(decoder.decode(sharedStringsBytes))
      : []

    const linhasBaseXml = parseWorksheetXml(
      decoder.decode(worksheetBaseBytes),
      sharedStrings
    )
    const linhasDashXml = parseWorksheetXml(
      decoder.decode(worksheetDashBytes),
      sharedStrings
    )

    const linhasBase = parseCompatibCamila(linhasBaseXml)
    const linhasDashParsed = parseDash(linhasDashXml)
    validarBlocosDash(linhasDashParsed)
    console.log(
      `[sync-gt-obras] parsing OK: ${linhasBase.length} linhas (base), ${linhasDashParsed.length} linhas (dash)`
    )

    // ── gt_obras: dedup por chave sintética + upsert em lotes ─────────
    const porChave = new Map<string, Record<string, unknown>>()
    for (const l of linhasBase) {
      l.chave_sintetica = await chaveSinteticaGt(l)
      porChave.set(l.chave_sintetica as string, l)
    }
    const linhasBaseDedup = [...porChave.values()]
    const duplicadosBase = linhasBase.length - linhasBaseDedup.length
    if (duplicadosBase > 0) {
      console.log(
        `[sync-gt-obras] ${duplicadosBase} linha(s) duplicada(s) na base (mesma chave sintética) — mantida a última ocorrência`
      )
    }

    const LOTE = 500
    for (let i = 0; i < linhasBaseDedup.length; i += LOTE) {
      const lote = linhasBaseDedup.slice(i, i + LOTE)
      const { error } = await supabase
        .from('gt_obras')
        .upsert(lote, { onConflict: 'chave_sintetica' })
      if (error)
        throw new Error(`Upsert gt_obras falhou (lote ${i}): ${error.message}`)
      console.log(
        `[sync-gt-obras] upsert gt_obras OK: ${i}-${i + lote.length} de ${linhasBaseDedup.length}`
      )
    }

    // Limpeza de linhas órfãs em gt_obras (mesmo padrão do sync-multas,
    // 20/07/2026) — best-effort, só depois de todos os upserts OK.
    let orfasObras = 0
    try {
      const { error: errLimpeza, count } = await supabase
        .from('gt_obras')
        .delete({ count: 'exact' })
        .lt('atualizado_em', inicioSync.toISOString())
      if (errLimpeza) throw errLimpeza
      orfasObras = count ?? 0
      if (orfasObras > 0) {
        console.log(`[sync-gt-obras] ${orfasObras} linha(s) órfã(s) removida(s) de gt_obras`)
      }
    } catch (errLimpeza) {
      console.error(
        `[sync-gt-obras] limpeza de gt_obras falhou (não bloqueia a sincronização): ${errLimpeza instanceof Error ? errLimpeza.message : String(errLimpeza)}`
      )
    }

    // ── gt_dash: dedup por (bloco, permissionaria) + upsert ───────────
    const porBlocoPerm = new Map<string, Record<string, unknown>>()
    for (const l of linhasDashParsed) {
      porBlocoPerm.set(`${l.bloco}|${l.permissionaria}`, l)
    }
    const linhasDashDedup = [...porBlocoPerm.values()]
    const duplicadosDash = linhasDashParsed.length - linhasDashDedup.length
    if (duplicadosDash > 0) {
      // Mesmo padrão do log de `duplicadosBase` acima — antes deste achado
      // (30/07/2026) essa colisão era silenciosa; `validarBlocosDash` já
      // aborta se a colisão for do tipo "bloco inteiro perdido", mas vale
      // saber se sobrou alguma colisão pontual (ex.: permissionária citada
      // 2x dentro do mesmo bloco).
      console.log(
        `[sync-gt-obras] ${duplicadosDash} linha(s) duplicada(s) no dash (mesma bloco+permissionária) — mantida a última ocorrência`
      )
    }

    for (let i = 0; i < linhasDashDedup.length; i += LOTE) {
      const lote = linhasDashDedup.slice(i, i + LOTE)
      const { error } = await supabase
        .from('gt_dash')
        .upsert(lote, { onConflict: 'bloco,permissionaria' })
      if (error)
        throw new Error(`Upsert gt_dash falhou (lote ${i}): ${error.message}`)
    }
    console.log(`[sync-gt-obras] upsert gt_dash OK: ${linhasDashDedup.length} linhas`)

    let orfasDash = 0
    try {
      const { error: errLimpezaDash, count } = await supabase
        .from('gt_dash')
        .delete({ count: 'exact' })
        .lt('atualizado_em', inicioSync.toISOString())
      if (errLimpezaDash) throw errLimpezaDash
      orfasDash = count ?? 0
      if (orfasDash > 0) {
        console.log(`[sync-gt-obras] ${orfasDash} linha(s) órfã(s) removida(s) de gt_dash`)
      }
    } catch (errLimpezaDash) {
      console.error(
        `[sync-gt-obras] limpeza de gt_dash falhou (não bloqueia a sincronização): ${errLimpezaDash instanceof Error ? errLimpezaDash.message : String(errLimpezaDash)}`
      )
    }

    const comProcesso = linhasBaseDedup.filter(
      (l) => l.situacao_vinculo !== 'sem_processo'
    ).length
    const semProcesso = linhasBaseDedup.length - comProcesso
    const linhasDashComErro = linhasDashDedup.filter((l) => l.tem_erro_formula).length

    await supabase
      .from('gt_sync_config')
      .update({
        ultima_sync_em: new Date().toISOString(),
        ultima_sync_status: 'sucesso',
        ultima_sync_detalhe: `${linhasBaseDedup.length} linhas na base (${comProcesso} com processo, ${semProcesso} sem processo), ${linhasDashDedup.length} linhas no dash (${linhasDashComErro} com divergência)`,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', 1)

    console.log(
      `[sync-gt-obras] sync concluída: ${linhasBaseDedup.length} linhas base, ${linhasDashDedup.length} linhas dash`
    )

    return new Response(
      JSON.stringify({
        executado: true,
        total_linhas: linhasBaseDedup.length,
        com_processo: comProcesso,
        sem_processo: semProcesso,
        linhas_dash: linhasDashDedup.length,
        linhas_dash_com_erro: linhasDashComErro,
        orfas_removidas_obras: orfasObras,
        orfas_removidas_dash: orfasDash,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err)
    console.error(`[sync-gt-obras] erro: ${mensagem}`)
    await supabase
      .from('gt_sync_config')
      .update({
        ultima_sync_em: new Date().toISOString(),
        ultima_sync_status: 'erro',
        ultima_sync_detalhe: mensagem,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', 1)

    return new Response(JSON.stringify({ executado: false, erro: mensagem }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
