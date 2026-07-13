// ============================================================
// sync-multas — Edge Function (Trilha A, A1 — spike de sincronização)
// ============================================================
// Baixa a planilha "CONTROLE DE AÇÕES FISCAIS - OBRAS / CORBETT"
// (Google Drive, arquivo .xlsx em modo de compatibilidade Office) via
// Google Drive API, autenticando como a conta de serviço
// `obras-multas-leitor`, faz o parsing da aba "PENALIDADES CORBETT"
// (cabeçalho na linha 8) com SheetJS e grava (upsert) em `public.multas`.
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

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const DRIVE_FILE_ID = '1ExemploDriveFileIdFicticio000AA'
const ABA_PLANILHA = 'PENALIDADES CORBETT'
const LINHA_CABECALHO = 8 // 1-based, na planilha original

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

function parseValorReal(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v
  const s = String(v).trim().replace(/^R\$\s*/i, '').replace(/,/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function normalizeHeader(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
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
    throw new Error(`Falha ao obter token Google (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  return data.access_token as string
}

async function baixarPlanilha(accessToken: string): Promise<ArrayBuffer> {
  const url = `https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) {
    throw new Error(`Falha ao baixar planilha do Drive (${res.status}): ${await res.text()}`)
  }
  return await res.arrayBuffer()
}

function parseLinhas(buffer: ArrayBuffer) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = wb.Sheets[ABA_PLANILHA]
  if (!sheet) {
    throw new Error(`Aba "${ABA_PLANILHA}" não encontrada. Abas disponíveis: ${wb.SheetNames.join(', ')}`)
  }
  // range: LINHA_CABECALHO - 1 (0-based) → sheet_to_json usa essa linha como header
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: LINHA_CABECALHO - 1,
    defval: null,
  })

  const linhas = []
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i]
    const linha_planilha = LINHA_CABECALHO + 1 + i // linha real na planilha
    const mapeada: Record<string, unknown> = {
      linha_planilha,
      atualizado_em: new Date().toISOString(),
    }
    for (const [headerBruto, valor] of Object.entries(row)) {
      const key = COLUMN_MAP[normalizeHeader(headerBruto)]
      if (!key) continue
      if (DATE_FIELDS.has(key)) {
        mapeada[key] = toIsoDate(valor)
      } else if (key === 'valor') {
        mapeada[key] = parseValorReal(valor)
      } else if (key === 'area_m2') {
        const n = typeof valor === 'number' ? valor : parseFloat(String(valor ?? '').replace(',', '.'))
        mapeada[key] = isNaN(n) ? null : n
      } else {
        mapeada[key] = valor == null ? null : String(valor).trim()
      }
    }

    // Linha totalmente vazia (rodapé/linha em branco da planilha) — ignora.
    const temAlgumDado = Object.keys(mapeada).some(
      (k) => !['linha_planilha', 'atualizado_em'].includes(k) && mapeada[k] != null && mapeada[k] !== ''
    )
    if (!temAlgumDado) continue

    const numProcessoBruto = mapeada.num_processo as string | null
    const semProcesso =
      !numProcessoBruto || /NAO CONTEM|NÃO CONTÉM/i.test(numProcessoBruto) || numProcessoBruto === '-'
    mapeada.num_processo_normalizado = semProcesso ? null : normProc(numProcessoBruto)
    mapeada.situacao_vinculo = semProcesso ? 'sem_processo' : 'nao_avaliado'

    linhas.push(mapeada)
  }
  return linhas
}

Deno.serve(async (req: Request) => {
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
  const ultimaSync = config?.ultima_sync_em ? new Date(config.ultima_sync_em) : null
  const minutosDesdeUltima = ultimaSync ? (Date.now() - ultimaSync.getTime()) / 60000 : Infinity

  if (!force && minutosDesdeUltima < intervaloMinutos) {
    return new Response(
      JSON.stringify({
        executado: false,
        motivo: 'intervalo_nao_atingido',
        minutos_desde_ultima: Math.round(minutosDesdeUltima),
        intervalo_minutos: intervaloMinutos,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if (!serviceAccountJson) throw new Error('Secret GOOGLE_SERVICE_ACCOUNT_JSON não configurado.')

    const accessToken = await getGoogleAccessToken(serviceAccountJson)
    const buffer = await baixarPlanilha(accessToken)
    const linhas = parseLinhas(buffer)

    // Upsert por lotes (500), on conflict auto_multa. Linhas sem
    // auto_multa não têm chave de dedup confiável — inseridas à parte.
    const comChave = linhas.filter((l) => l.auto_multa)
    const semChave = linhas.filter((l) => !l.auto_multa)

    const LOTE = 500
    for (let i = 0; i < comChave.length; i += LOTE) {
      const lote = comChave.slice(i, i + LOTE)
      const { error } = await supabase.from('multas').upsert(lote, { onConflict: 'auto_multa' })
      if (error) throw new Error(`Upsert falhou (lote ${i}): ${error.message}`)
    }
    if (semChave.length > 0) {
      // Sem chave estável: spike não deduplica esse subconjunto — A2
      // decide a estratégia definitiva (ex.: chave composta).
      const { error } = await supabase.from('multas').insert(semChave)
      if (error) throw new Error(`Insert (sem auto_multa) falhou: ${error.message}`)
    }

    await supabase
      .from('multas_sync_config')
      .update({
        ultima_sync_em: new Date().toISOString(),
        ultima_sync_status: 'sucesso',
        ultima_sync_detalhe: `${linhas.length} linhas processadas (${comChave.length} com chave, ${semChave.length} sem chave)`,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', 1)

    return new Response(
      JSON.stringify({
        executado: true,
        total_linhas: linhas.length,
        com_chave: comChave.length,
        sem_chave: semChave.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err)
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
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
