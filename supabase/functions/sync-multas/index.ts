// ============================================================
// sync-multas — Edge Function (Trilha A, A1 — spike de sincronização)
// ============================================================
// Baixa a planilha "CONTROLE DE AÇÕES FISCAIS - OBRAS / CORBETT"
// (Google Drive, arquivo .xlsx em modo de compatibilidade Office) via
// Google Drive API, autenticando como a conta de serviço
// `obras-multas-leitor`, faz o parsing da aba "PENALIDADES CORBETT"
// (cabeçalho na linha 8) e grava (upsert) em `public.multas`.
//
// Dashboard é READ-ONLY (decisão do A0) — esta função é o ÚNICO
// caminho de escrita da tabela.
//
// Chamada por: (a) cron do Supabase, em intervalo curto e fixo — a
// função se AUTO-LIMITA lendo `multas_sync_config.intervalo_minutos` e
// só sincronizando se já passou tempo suficiente desde a última
// execução; (b) botão "Atualizar agora" da UI, passando `?force=1` no
// corpo/query para ignorar o intervalo.
//
// Secrets exigidos (Project Settings → Edge Functions → Secrets):
//   GOOGLE_SERVICE_ACCOUNT_JSON — conteúdo INTEIRO do JSON da conta de
//   serviço `obras-multas-leitor` (client_email + private_key).
//   NUNCA commitar esse JSON no repositório.
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetados
// automaticamente pelo runtime das Edge Functions — não precisam ser
// cadastrados como secret.
//
// ── Por que NÃO usamos mais SheetJS (13/07/2026) ────────────────────
// A primeira versão deste spike usava `XLSX.read` (SheetJS). Mesmo com
// todas as opções de economia de memória (dense, cellDates:false,
// sheetRows), a função estourava "Memory limit exceeded" (heap ~233MB)
// no runtime das Edge Functions (limite baixo, ~150-256MB). Causa: a
// versão gratuita do SheetJS SEMPRE descomprime e parseia o workbook
// INTEIRO — as 3 abas do arquivo, estilos e sharedStrings — não existe
// opção para restringir a leitura a 1 aba só.
//
// Solução: um parser mínimo e seletivo, escrito à mão, que aproveita a
// estrutura do .xlsx (é um ZIP com XML dentro): descompacta SOMENTE os
// arquivos internos necessários (workbook.xml + rels para descobrir
// qual sheetN.xml corresponde à aba "PENALIDADES CORBETT", depois só
// esse sheetN.xml + sharedStrings.xml) e faz o parsing do XML na mão
// com regex (sem carregar um DOM). Isso evita descomprimir/parsear as
// outras 2 abas e os estilos, que são a maior parte do custo de
// memória. A lógica de NEGÓCIO (mapeamento de colunas, datas, valor
// monetário, sem_processo etc.) permanece idêntica à versão anterior —
// só mudou a fonte dos valores brutos.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6'
import { unzipSync } from 'https://esm.sh/fflate@0.8.2'

const DRIVE_FILE_ID = '1ExemploDriveFileIdFicticio000AA'
const ABA_PLANILHA = 'PENALIDADES CORBETT'
const LINHA_CABECALHO = 8 // 1-based, na planilha original
const LINHA_TETO_SANIDADE = 20000 // planilhas "fantasma" (formatação colada sem dado) — não ler além disso

// ── Duplicação deliberada de toIsoDate/normProc (src/lib/) ──────────
// Edge Functions rodam em runtime Deno separado do bundle do front —
// não há como importar diretamente de src/. Mantém a MESMA lógica
// (ver dominio.md, "toIsoDate unificado"); qualquer correção de
// parsing de data feita em src/lib/datas.js deve ser replicada aqui.
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

// Chave sintética (A2, 13/07/2026) para linhas sem `auto_multa` — hash de
// campos estáveis, usada como alvo do upsert em vez de apagar/regravar todo
// o subconjunto a cada sincronização (ver `multas-chave-sintetica-sem-auto.sql`).
async function chaveSinteticaSemAuto(
  l: Record<string, unknown>
): Promise<string> {
  const partes = [l.num_processo, l.data_infracao, l.valor, l.linha_planilha]
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

function parseValorReal(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v
  const s = String(v)
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/,/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function normalizeHeader(s: string): string {
  return s
    .replace(/[°º]/g, '') // "N° PROCESSO"/"Nº PROCESSO" → "N PROCESSO" (chave do COLUMN_MAP)
    .replace(/²/g, '2') // "ÁREA (M²)" → "AREA (M2)"
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Chaves já normalizadas (sem acento, espaços colapsados, maiúsculas)
const COLUMN_MAP: Record<string, string> = {
  'N PROCESSO/ PROTOCOLO SISTEMA GEO': 'num_processo',
  'TIPO DE PROCESSO': 'tipo_processo',
  LOTE: 'lote',
  'PERMISSIONARIA/ CONCESSIONARIA': 'permissionaria',
  LOGRADOURO: 'logradouro',
  SUB: 'subprefeitura',
  'DATA DO RELATORIO': 'data_relatorio',
  'AREA (M2)': 'area_m2',
  'DATA DO ENCAMINHAMENTO': 'data_encaminhamento',
  'N PROCESSO SEI': 'num_processo_sei',
  'STATUS SEI': 'status_sei',
  'DATA DA INFRACAO': 'data_infracao',
  'HORA DA INFRACAO': 'hora_infracao',
  'AUTO DA MULTA': 'auto_multa',
  'DATA DO AUTO DA MULTA': 'data_auto_multa',
  'N DEMANDA': 'num_demanda',
  'SEI SGF': 'sei_sgf',
  'GERADA POR': 'gerada_por',
  STATUS: 'status',
  'VALOR (R$)': 'valor',
  DEFESA: 'defesa',
  RECURSO: 'recurso',
  FISCAL: 'fiscal',
  MOTIVO: 'motivo',
}

const DATE_FIELDS = new Set([
  'data_relatorio',
  'data_encaminhamento',
  'data_infracao',
  'data_auto_multa',
])

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

// ── Helpers de XML mínimo (sem DOM — só regex sobre strings) ────────

// Decodifica as 5 entidades XML padrão + entidades numéricas
// (&#NNN; / &#xHH;). Ordem importa: numéricas e as 4 "simples" antes
// de &amp;, senão "&amp;lt;" viraria "<" em vez de "&lt;".
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

// "A" -> 0, "B" -> 1, "AB" -> 27 (índice de coluna 0-based, estilo Excel)
function colLetraParaIndice(letras: string): number {
  let idx = 0
  for (let i = 0; i < letras.length; i++) {
    idx = idx * 26 + (letras.charCodeAt(i) - 64) // 'A'.charCodeAt(0) === 65
  }
  return idx - 1
}

function extrairAtributo(tag: string, nome: string): string | null {
  // nome pode conter ":" (ex.: "r:id") — escapar não é necessário aqui
  // porque ":" não é caractere especial de regex.
  const m = tag.match(new RegExp(nome + '="([^"]*)"'))
  return m ? m[1] : null
}

// Concatena o texto de todos os <t>...</t> (ou <t/>) dentro de um
// trecho de XML — usado tanto para <si> (sharedStrings) quanto para
// <is> (inlineStr), que têm a mesma estrutura interna (rich text pode
// ter vários <r><t>...</t></r>).
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

// Interpreta uma célula <c r="A9" t="s"><v>123</v></c> (ou
// self-closing <c r="A9" s="1"/>) de acordo com o atributo `t`.
function parseValorCelula(
  attrs: string,
  inner: string | undefined,
  sharedStrings: string[]
): unknown {
  if (inner === undefined) return null // célula self-closing, sem valor
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
  // sem `t` (ou t="n"): número
  const v = extrairTag(inner, 'v')
  if (v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function extrairTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  return m ? m[1] : null
}

// Faz o parsing do XML da worksheet linha por linha, célula por
// célula, via regex (sem DOM). Para de iterar assim que uma linha
// ultrapassa LINHA_TETO_SANIDADE.
function parseWorksheetXml(xml: string, sharedStrings: string[]): Linha[] {
  const linhas: Linha[] = []
  const reRow = /<row\b([^>]*?)\/>|<row\b([^>]*?)>([\s\S]*?)<\/row>/g
  let m: RegExpExecArray | null
  while ((m = reRow.exec(xml))) {
    const attrs = m[1] ?? m[2] ?? ''
    const conteudo = m[3] // undefined se a <row> for self-closing (sem células)
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
        const cInner = mc[3] // undefined se self-closing
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

function parseLinhas(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const decoder = new TextDecoder('utf-8')

  // 1ª passada: só workbook.xml + rels — descobre qual sheetN.xml
  // corresponde à aba "PENALIDADES CORBETT". Descompactar só esses 2
  // arquivos (pequenos) é praticamente grátis; o custo caro é
  // descompactar as worksheets/sharedStrings, então evitamos abrir
  // tudo de uma vez.
  const passo1 = unzipSync(bytes, {
    filter: (file) =>
      file.name === 'xl/workbook.xml' ||
      file.name === 'xl/_rels/workbook.xml.rels',
  })
  const workbookXml = passo1['xl/workbook.xml']
  const relsXml = passo1['xl/_rels/workbook.xml.rels']
  if (!workbookXml)
    throw new Error('xl/workbook.xml não encontrado dentro do .xlsx.')
  if (!relsXml)
    throw new Error(
      'xl/_rels/workbook.xml.rels não encontrado dentro do .xlsx.'
    )

  const rid = acharSheetRid(decoder.decode(workbookXml), ABA_PLANILHA)
  const worksheetPath = acharWorksheetPath(decoder.decode(relsXml), rid)
  console.log(`[sync-multas] aba encontrada: ${worksheetPath}`)

  // 2ª passada: só a worksheet certa + sharedStrings — o resto do
  // arquivo (as outras 2 abas, estilos, etc.) nunca é descompactado.
  const passo2 = unzipSync(bytes, {
    filter: (file) =>
      file.name === worksheetPath || file.name === 'xl/sharedStrings.xml',
  })
  const worksheetXmlBytes = passo2[worksheetPath]
  if (!worksheetXmlBytes)
    throw new Error(
      `Worksheet "${worksheetPath}" não encontrada dentro do .xlsx.`
    )
  const sharedStringsBytes = passo2['xl/sharedStrings.xml']
  const sharedStrings = sharedStringsBytes
    ? parseSharedStrings(decoder.decode(sharedStringsBytes))
    : []

  const linhasXml = parseWorksheetXml(
    decoder.decode(worksheetXmlBytes),
    sharedStrings
  )

  // Monta o mapa índice-de-coluna → chave interna a partir da linha
  // de cabeçalho (LINHA_CABECALHO). Mesma lógica de normalização/
  // mapeamento de antes (normalizeHeader + COLUMN_MAP).
  const linhaCabecalho = linhasXml.find((l) => l.r === LINHA_CABECALHO)
  if (!linhaCabecalho) {
    throw new Error(
      `Linha de cabeçalho (${LINHA_CABECALHO}) não encontrada na worksheet.`
    )
  }
  const colIndexParaChave = new Map<number, string>()
  for (const { col, valor } of linhaCabecalho.celulas) {
    if (valor == null || valor === '') continue
    const key = COLUMN_MAP[normalizeHeader(String(valor))]
    if (key) colIndexParaChave.set(col, key)
  }

  const linhas: Record<string, unknown>[] = []
  for (const linhaXml of linhasXml) {
    if (linhaXml.r <= LINHA_CABECALHO) continue // ignora linhas de título/cabeçalho

    const valoresPorColuna = new Map<number, unknown>()
    for (const { col, valor } of linhaXml.celulas)
      valoresPorColuna.set(col, valor)

    const mapeada: Record<string, unknown> = {
      linha_planilha: linhaXml.r,
      atualizado_em: new Date().toISOString(),
    }
    for (const [col, key] of colIndexParaChave) {
      const valor = valoresPorColuna.has(col) ? valoresPorColuna.get(col) : null
      if (DATE_FIELDS.has(key)) {
        mapeada[key] = toIsoDate(valor)
      } else if (key === 'valor') {
        mapeada[key] = parseValorReal(valor)
      } else if (key === 'area_m2') {
        const n =
          typeof valor === 'number'
            ? valor
            : parseFloat(String(valor ?? '').replace(',', '.'))
        mapeada[key] = isNaN(n) ? null : n
      } else {
        // Texto vazio vira NULL — importante para o auto_multa: o índice
        // único é total, e '' repetido conflitaria (NULLs não conflitam).
        const s = valor == null ? '' : String(valor).trim()
        mapeada[key] = s === '' ? null : s
      }
    }

    // Linha totalmente vazia (rodapé/linha em branco da planilha) — ignora.
    const temAlgumDado = Object.keys(mapeada).some(
      (k) =>
        !['linha_planilha', 'atualizado_em'].includes(k) &&
        mapeada[k] != null &&
        mapeada[k] !== ''
    )
    if (!temAlgumDado) continue

    const numProcessoBruto = mapeada.num_processo as string | null
    const semProcesso =
      !numProcessoBruto ||
      /NAO CONTEM|NÃO CONTÉM/i.test(numProcessoBruto) ||
      numProcessoBruto === '-'
    mapeada.num_processo_normalizado = semProcesso
      ? null
      : normProc(numProcessoBruto)
    mapeada.situacao_vinculo = semProcesso ? 'sem_processo' : 'nao_avaliado'

    linhas.push(mapeada)
  }

  console.log(`[sync-multas] parsing OK: ${linhas.length} linhas`)
  return linhas
}

// ── CORS ────────────────────────────────────────────────────────────
// O botão "Atualizar agora" (A4) chama esta função DO NAVEGADOR via
// supabase.functions.invoke — o browser manda um preflight OPTIONS antes
// do POST. Sem estes headers o preflight falha e o front vê "Failed to
// send a request to the Edge Function" (bug achado na validação de
// 16/07/2026). Chamadas de cron/Invoke do painel não passam por CORS.
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

  let force = false
  try {
    const url = new URL(req.url)
    force = url.searchParams.get('force') === '1'
    if (!force && req.method === 'POST') {
      const body = await req.json().catch(() => null)
      if (body?.force) force = true
    }
  } catch {
    // ignora — força fica false
  }

  const { data: config } = await supabase
    .from('multas_sync_config')
    .select('*')
    .eq('id', 1)
    .single()

  const intervaloMinutos = config?.intervalo_minutos ?? 30
  const ultimaSync = config?.ultima_sync_em
    ? new Date(config.ultima_sync_em)
    : null
  const minutosDesdeUltima = ultimaSync
    ? (Date.now() - ultimaSync.getTime()) / 60000
    : Infinity

  if (!force && minutosDesdeUltima < intervaloMinutos) {
    return new Response(
      JSON.stringify({
        executado: false,
        motivo: 'intervalo_nao_atingido',
        minutos_desde_ultima: Math.round(minutosDesdeUltima),
        intervalo_minutos: intervaloMinutos,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if (!serviceAccountJson)
      throw new Error('Secret GOOGLE_SERVICE_ACCOUNT_JSON não configurado.')

    const accessToken = await getGoogleAccessToken(serviceAccountJson)
    console.log('[sync-multas] token Google OK')

    const buffer = await baixarPlanilha(accessToken)
    console.log(
      `[sync-multas] download OK: ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB`
    )

    // Carimbo do início desta sincronização — usado no final para achar
    // linhas "órfãs" (ver comentário perto do DELETE abaixo). Capturado
    // ANTES do parse porque cada linha ganha seu próprio `atualizado_em`
    // durante o parse (linha a linha) — precisa ser garantidamente mais
    // antigo que o de qualquer linha desta sincronização.
    const inicioSync = new Date()
    const linhas = parseLinhas(buffer)

    // Upsert por lotes (500), on conflict auto_multa. Linhas sem
    // auto_multa não têm chave de dedup confiável — tratadas à parte.
    // Dedup por auto_multa DENTRO da carga (a planilha tem 1 duplicado
    // real, levantado no A0): o mesmo valor duas vezes num upsert gera
    // "ON CONFLICT DO UPDATE command cannot affect row a second time".
    // Mantém a última ocorrência (linha mais abaixo na planilha).
    const porAuto = new Map<string, Record<string, unknown>>()
    const semAuto: Record<string, unknown>[] = []
    for (const l of linhas) {
      if (l.auto_multa) porAuto.set(l.auto_multa as string, l)
      else semAuto.push(l)
    }
    const comChave = [...porAuto.values()]

    // Linhas sem auto_multa (A2, 13/07/2026): chave sintética via hash de
    // campos estáveis, upsert como as demais — nunca mais apaga/regrava o
    // subconjunto inteiro a cada sync (regra de ouro: dado cru não some se
    // um passo falhar no meio do caminho). Dedup dentro da carga igual ao
    // padrão acima, mantendo a última ocorrência.
    const porSintetica = new Map<string, Record<string, unknown>>()
    for (const l of semAuto) {
      l.chave_sintetica = await chaveSinteticaSemAuto(l)
      porSintetica.set(l.chave_sintetica as string, l)
    }
    const semChave = [...porSintetica.values()]

    const duplicadosUnificados =
      linhas.length - semChave.length - comChave.length
    if (duplicadosUnificados > 0) {
      console.log(
        `[sync-multas] ${duplicadosUnificados} linha(s) duplicada(s) na planilha (mesma chave) — mantida a última ocorrência`
      )
    }

    const LOTE = 500
    for (let i = 0; i < comChave.length; i += LOTE) {
      const lote = comChave.slice(i, i + LOTE)
      const { error } = await supabase
        .from('multas')
        .upsert(lote, { onConflict: 'auto_multa' })
      if (error) throw new Error(`Upsert falhou (lote ${i}): ${error.message}`)
      console.log(
        `[sync-multas] upsert lote OK: ${i}-${i + lote.length} de ${comChave.length}`
      )
    }
    for (let i = 0; i < semChave.length; i += LOTE) {
      const lote = semChave.slice(i, i + LOTE)
      const { error } = await supabase
        .from('multas')
        .upsert(lote, { onConflict: 'chave_sintetica' })
      if (error)
        throw new Error(
          `Upsert (sem auto_multa) falhou (lote ${i}): ${error.message}`
        )
      console.log(
        `[sync-multas] upsert lote (sem auto_multa) OK: ${i}-${i + lote.length} de ${semChave.length}`
      )
    }

    // Limpeza de linhas órfãs (achado 20/07/2026): upsert sozinho NUNCA
    // remove uma multa que saiu da planilha — ela ficava "fantasma" no
    // banco pra sempre, inflando "Total de Multas"/Inconsistências de
    // forma diferente em cada ambiente, conforme o histórico de
    // sincronizações de cada um (homologação acumulou mais ao longo do
    // desenvolvimento; produção, recém-criada, tinha menos). Toda linha
    // desta sincronização tem `atualizado_em >= inicioSync` (setado
    // durante o parse/upsert acima) — o que sobrou mais velho que isso
    // não estava mais na planilha lida agora. Roda só AQUI, depois que
    // TODOS os upserts acima terminaram sem erro — se o parse ou algum
    // lote tivesse falhado, o catch já teria interrompido antes de
    // chegar aqui, preservando a regra de ouro (nunca perder dado por
    // uma sincronização que falha no meio do caminho). Best-effort: uma
    // falha aqui não derruba a sincronização (os dados corretos já
    // foram gravados) — só tenta de novo no próximo sync.
    let orfasRemovidas = 0
    try {
      const { error: errorLimpeza, count } = await supabase
        .from('multas')
        .delete({ count: 'exact' })
        .lt('atualizado_em', inicioSync.toISOString())
      if (errorLimpeza) throw errorLimpeza
      orfasRemovidas = count ?? 0
      if (orfasRemovidas > 0) {
        console.log(
          `[sync-multas] ${orfasRemovidas} linha(s) órfã(s) removida(s) (não estavam mais na planilha)`
        )
      }
    } catch (errLimpeza) {
      console.error(
        `[sync-multas] limpeza de linhas órfãs falhou (não bloqueia a sincronização): ${errLimpeza instanceof Error ? errLimpeza.message : String(errLimpeza)}`
      )
    }

    await supabase
      .from('multas_sync_config')
      .update({
        ultima_sync_em: new Date().toISOString(),
        ultima_sync_status: 'sucesso',
        ultima_sync_detalhe: `${linhas.length} linhas processadas (${comChave.length} com chave, ${semChave.length} sem chave, ${orfasRemovidas} órfã(s) removida(s))`,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', 1)

    console.log(
      `[sync-multas] sync concluída: ${linhas.length} linhas (${comChave.length} com chave, ${semChave.length} sem chave, ${orfasRemovidas} órfã(s) removida(s))`
    )

    // Contagem compatível com o card "Total de Multas" da Visão Geral do
    // front (que exclui `situacao_vinculo === 'sem_processo'`) — diferente
    // de com_chave/sem_chave, que é sobre AUTO DA MULTA (chave técnica de
    // dedup), não sobre nº de processo. Feedback de 16/07/2026.
    const comProcesso = linhas.filter(
      (l) => l.situacao_vinculo !== 'sem_processo'
    ).length
    const semProcessoTotal = linhas.length - comProcesso

    return new Response(
      JSON.stringify({
        executado: true,
        total_linhas: linhas.length,
        com_processo: comProcesso,
        sem_processo: semProcessoTotal,
        com_chave: comChave.length,
        sem_chave: semChave.length,
        orfas_removidas: orfasRemovidas,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err)
    console.error(`[sync-multas] erro: ${mensagem}`)
    await supabase
      .from('multas_sync_config')
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
