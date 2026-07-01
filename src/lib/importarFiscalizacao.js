import * as XLSX from 'xlsx'
import { supabase } from './supabase.js'
import { toIsoDate } from './datas.js'

// Importação de Fiscalização pela tela (D2).
//
// Formato esperado: arquivo produzido pelo Consolidador de Fiscalização
// (ferramenta HTML+JS externa). Aba obrigatória: "DADOS_CONSOLIDADOS".
// Cabeçalho na linha 1, dados a partir da linha 2. Total: 38 colunas (29
// de dados + 9 auxiliares adicionadas pelo consolidador).
//
// Mapeamento real verificado no arquivo de produção (ref 30-05-2026):
//   0 (A) = PROCESSOS/VIA         →  id_origem  (chave de dedup)
//   1 (B) = TIPO DE PROCESSO       →  (ignorado)
//   2 (C) = LOTE/OBRAS           →  (ignorado)
//   3 (D) = PERMISSIONÁRIA         →  permissionaria
//   4 (E) = EXECUTANTE             →  executante (fallback p/ executora do Sistema Geo)
//   5 (F) = DATA DA VISTORIA       →  data_inicio
//   6 (G) = VIA PRINCIPAL          →  (ignorado)
//   7 (H) = SUB                    →  subprefeitura
//   8 (I) = CLASSIFICAÇÃO VIÁRIA   →  classificacao_viaria
//   9 (J) = ÁREA APROX. (M²)       →  area_m2
//  10 (K) = Vistoria Visual Pav.   →  (ignorado)
//  11 (L) = Vistoria Lab. Pav.     →  (ignorado)
//  12 (M) = Vistoria Visual Cal.   →  (ignorado)
//  13 (N) = Vistoria Lab. Cal.     →  (ignorado)
//  14 (O) = Obras com Falhas       →  indicador primário de NC (ver lógica abaixo)
//  15 (P) = Geometria              →  falha_geometria
//  16 (Q) = Recomposição           →  falha_recomposicao
//  17 (R) = Sinalização            →  falha_sinalizacao
//  18 (S) = Sarjeta                →  falha_sarjeta
//  19 (T) = Guia                   →  falha_guia
//  20 (U) = Falha na reposição     →  falha_reposicao
//  21 (V) = Trincas                →  falha_trincas
//  22 (W) = Afundamento            →  falha_afundamento
//  23 (X) = Nivelamento            →  falha_nivelamento
//  24 (Y) = Em andamento           →  (ignorado — status vem de AK)
//  25 (Z) = Legislação Atendida    →  (ignorado — status vem de AK; Leg.Atendida é por exclusão)
//  26 (AA) = Outros                →  STATUS = Leg.Atendida (ignorado; status vem de AK)
//  27 (AB) = Solucionados          →  (ignorado — status vem de AK)
//  28 (AC) = Data do Encerramento  →  data_conclusao
//  29..37  = FONTE/ANO/MES/…/TEM_NAO_CONF/STATUS_SIMPL/NORCREST → ver abaixo:
//  35 (AJ) = TEM_NAO_CONF          →  (ignorado — NC derivado de obras/falha_*)
//  36 (AK) = STATUS_SIMPL          →  em_andamento / legislacao_atendida / solucionado
//
// Lógica de não conformidade (NC):
//   - Col O (pos 14) é o INDICADOR PRIMÁRIO de NC: se marcado, há falha de execução.
//   - Os tipos individuais (pos 15-23, P-X) são DETALHE OPCIONAL de falha.
//   - Col AA (pos 26) "Outros" é STATUS = Leg.Atendida — NÃO é tipo de falha.
//   - obras=X + nenhum tipo (P-X) marcado → falha_outros=true (catch-all para o banco
//     computar tem_nao_conformidade=true via GENERATED, que usa falha_* como fonte).
//   - obras=vazia → todos falha_* ficam false (o banco computaria tem_nao_conformidade
//     incorretamente se importássemos tipos isolados).
//   - Solucionado deve ter data de encerramento (reportado no resumo, não bloqueia).
//
// Campos calculados (tem_nao_conformidade, status_simplificado, grupo_norcrest)
// são GENERATED ALWAYS no banco — não enviar no INSERT.

export const ABA_ESPERADA = 'DADOS_CONSOLIDADOS'
export const BATCH_INSERT = 1000
export const BATCH_DELETE = 5000

// Limpa célula: remove espaços e descarta placeholders ("---", "--", "-")
function clean(v) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || /^-+$/.test(s)) return null
  return s
}

// Converte para boolean: "X"/"SIM"/"S"/1/true/etc. → true; resto → false
function toBoolean(v) {
  if (v == null || v === '') return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const s = String(v).trim().toUpperCase()
  return (
    s === 'X' || s === 'SIM' || s === 'S' || s === '1' ||
    s === 'TRUE' || s === 'VERDADEIRO'
  )
}

// Converte para número.
// Aceita:
//   - número JS diretamente
//   - texto BR "1.234,56" (ponto=milhar, vírgula=decimal)
//   - texto neutro/americano "1234.56" ou "6.81" (ponto=decimal, sem vírgula)
//
// ⚠️ NÃO remove pontos quando não há vírgula — os valores da área no
// consolidador chegam como texto com ponto decimal (ex.: "6.8100000000000005")
// por imprecisão de float do JS. Remover o ponto causaria overflow em
// NUMERIC(12,2) do Postgres ("6.81" → "681" → ok; "6.8100000000000005" → erro).
function toNumeric(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') return isNaN(v) ? null : v
  const s = String(v).trim()
  if (s.includes(',')) {
    // Formato BR: remove pontos de milhar, troca vírgula por ponto
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
    return isNaN(n) ? null : n
  }
  // Sem vírgula: ponto é separador decimal — parseFloat diretamente
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// Normaliza permissionária: garante que "NORCREST" apareça em maiúsculas
// (case-insensitive), pois o campo calculado `grupo_norcrest` usa LIKE '%NORCREST%'
// (case-sensitive no PostgreSQL). "Norcrest S/A" → "NORCREST S/A".
function normalizarPermissionaria(v) {
  if (!v) return null
  return v.replace(/norcrest/gi, 'NORCREST')
}

// Formata YYYY-MM-DD → DD/MM/AAAA (para exibição no resumo)
export function fmtDataBR(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Lê e analisa a planilha. NÃO grava nada — devolve o material para a tela
// mostrar o resumo e confirmar antes de importar.
//
// Edge cases tratados:
//   - Aba DADOS_CONSOLIDADOS ausente → erro claro (arquivo errado)
//   - Planilha com < 29 colunas → erro (formato incorreto)
//   - Linhas completamente vazias (fantasmas do Excel) → ignoradas
//   - id_origem (PROCESSOS/VIA) vazio → linha descartada + contagem
//   - permissionaria vazia → substitui por '(sem permissionária)' + contagem
//   - permissionaria com NORCREST em caixa baixa → normaliza para MAIÚSCULAS
//   - Datas inválidas → null (não bloqueia; avisa se muitas)
//   - area_m2 em formato BR "1.234,56" → converte corretamente
//   - Booleanos como "X", "SIM", 1, TRUE, VERDADEIRO → true
//   - Duplicatas por id_origem → dedup (vence a de data_inicio mais recente)
//   - obras=X (col O) sem nenhum tipo marcado → falha_outros=true (catch-all NC)
//   - obras=vazia → todos falha_* em false (DB calcula tem_nao_conformidade de falha_*)
//   - Solucionado sem data_conclusao → contado e exibido no resumo (não bloqueia)
export function analisarPlanilha(workbook) {
  if (!workbook.SheetNames.includes(ABA_ESPERADA)) {
    throw new Error(
      `Aba "${ABA_ESPERADA}" não encontrada no arquivo. ` +
        `Confira se é o arquivo exportado pelo Consolidador de Fiscalização. ` +
        `Abas encontradas: ${workbook.SheetNames.join(', ')}.`
    )
  }

  const ws = workbook.Sheets[ABA_ESPERADA]
  if (!ws) throw new Error('Aba vazia ou ilegível.')

  const matriz = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true,
  })

  if (matriz.length < 2)
    throw new Error(
      `A aba "${ABA_ESPERADA}" não tem linhas de dados ` +
        `(esperado: cabeçalho na linha 1, dados a partir da linha 2).`
    )

  // Valida largura mínima: precisa chegar até col AC (posição 28 = Data do Encerramento)
  const cabecalho = matriz[0] || []
  if (cabecalho.length < 29) {
    throw new Error(
      `A planilha tem apenas ${cabecalho.length} coluna(s), mas o formato do ` +
        `Consolidador de Fiscalização requer pelo menos 29 colunas (A até AC). ` +
        `Confira se o arquivo correto foi enviado.`
    )
  }

  const linhas = []
  let semId = 0
  let semPermissionaria = 0
  let semData = 0

  for (let i = 1; i < matriz.length; i++) {
    const c = matriz[i]
    // Linha completamente vazia (Excel gera linhas fantasma ao final)
    if (!c || c.every((v) => v == null || v === '')) continue

    const idOrigem = clean(c[0])
    if (!idOrigem) {
      semId++
      continue
    }

    const permBruta = clean(c[3])   // D = PERMISSIONÁRIA
    if (!permBruta) semPermissionaria++

    const dataInicio = toIsoDate(c[5])  // F = DATA DA VISTORIA
    if (!dataInicio) semData++

    // Col O (pos 14) = "Obras/Serviços com Falhas de Execução": INDICADOR PRIMÁRIO de NC.
    // Quando obras=false, mantemos todos os falha_* em false para que o banco compute
    // tem_nao_conformidade corretamente (GENERATED usa falha_*). Os tipos individuais
    // são detalhe opcional e não indicam inconsistência em nenhuma combinação.
    const obrasComFalhas = toBoolean(c[14])

    // Tipos individuais (P-X, pos 15-23): só valem quando obras=X.
    // Col AA (pos 26) "Outros" = STATUS (Leg.Atendida), NÃO tipo de falha — não lemos aqui.
    const falha_geometria    = obrasComFalhas ? toBoolean(c[15]) : false
    const falha_recomposicao = obrasComFalhas ? toBoolean(c[16]) : false
    const falha_sinalizacao  = obrasComFalhas ? toBoolean(c[17]) : false
    const falha_sarjeta      = obrasComFalhas ? toBoolean(c[18]) : false
    const falha_guia         = obrasComFalhas ? toBoolean(c[19]) : false
    const falha_reposicao    = obrasComFalhas ? toBoolean(c[20]) : false
    const falha_trincas      = obrasComFalhas ? toBoolean(c[21]) : false
    const falha_afundamento  = obrasComFalhas ? toBoolean(c[22]) : false
    const falha_nivelamento  = obrasComFalhas ? toBoolean(c[23]) : false

    // obras=X sem nenhum tipo específico (P-X) → falha_outros=true (catch-all NC)
    // Garante que o banco compute tem_nao_conformidade=true para essas linhas.
    const falha_outros = obrasComFalhas && !(
      falha_geometria || falha_recomposicao || falha_sinalizacao ||
      falha_sarjeta || falha_guia || falha_reposicao ||
      falha_trincas || falha_afundamento || falha_nivelamento
    )

    // STATUS_SIMPL (col AK, pos 36): fonte de verdade para status do laudo.
    // O consolidador já resolve precedência e trata Leg.Atendida por exclusão.
    const statusSimpl = String(c[36] || '').trim()

    linhas.push({
      id_origem: idOrigem,
      permissionaria: normalizarPermissionaria(permBruta) || '(sem permissionária)',
      lote: clean(c[2]),                   // C = LOTE/OBRAS
      executante: clean(c[4]),             // E = EXECUTANTE (fallback p/ executora do Sistema Geo)
      data_inicio: dataInicio,
      subprefeitura: clean(c[7]),          // H = SUB
      classificacao_viaria: clean(c[8]),   // I = CLASSIFICAÇÃO VIÁRIA
      area_m2: toNumeric(c[9]),            // J = ÁREA APROX. (M²)
      falha_geometria,
      falha_recomposicao,
      falha_sinalizacao,
      falha_sarjeta,
      falha_guia,
      falha_reposicao,
      falha_trincas,
      falha_afundamento,
      falha_nivelamento,
      falha_outros,
      // Status: lidos de STATUS_SIMPL (col AK, pos 36) — fonte de verdade do consolidador.
      // Leg.Atendida é tratada por exclusão (6.903 laudos têm col Z vazia mas AK correto).
      em_andamento: statusSimpl === 'Em andamento',
      legislacao_atendida: statusSimpl === 'Legislacao Atendida',
      solucionado: statusSimpl === 'Solucionado',
      data_conclusao: toIsoDate(c[28]),     // AC = Data do Encerramento
    })
  }

  if (!linhas.length)
    throw new Error(
      `Nenhuma linha com PROCESSOS/VIA válido na aba "${ABA_ESPERADA}". ` +
        `Confira se o arquivo é o exportado pelo Consolidador de Fiscalização.`
    )

  // Deduplica por id_origem: vence a linha com data_inicio mais recente
  // (ISO ordena como texto; sem data perde; empate = última do arquivo)
  const porId = new Map()
  for (const r of linhas) {
    const atual = porId.get(r.id_origem)
    if (!atual || (r.data_inicio || '') >= (atual.data_inicio || ''))
      porId.set(r.id_origem, r)
  }
  const dedup = Array.from(porId.values())

  // Estatísticas para o resumo da tela
  const datas = dedup.map((r) => r.data_inicio).filter(Boolean).sort()

  let solucionado = 0, legAtendida = 0, emAndamento = 0, semStatus = 0
  let comNaoConformidade = 0
  let solucionadoSemData = 0
  // Detalhamento para a "prova real" (cruzamento NC × status)
  let ncSolucionado = 0, ncEmAndamento = 0, ncSemStatus = 0
  let semNcLegAtendida = 0, semNcSemStatus = 0

  for (const r of dedup) {
    // Status pelo critério de precedência do GENERATED status_simplificado do banco
    if (r.solucionado) solucionado++
    else if (r.legislacao_atendida) legAtendida++
    else if (r.em_andamento) emAndamento++
    else semStatus++

    // NC real = qualquer falha_* true (já corrigido pela lógica das obras acima)
    const temNC =
      r.falha_geometria || r.falha_recomposicao || r.falha_sinalizacao ||
      r.falha_sarjeta || r.falha_guia || r.falha_reposicao ||
      r.falha_trincas || r.falha_afundamento || r.falha_nivelamento ||
      r.falha_outros

    if (temNC) {
      comNaoConformidade++
      if (r.solucionado) ncSolucionado++
      else if (r.em_andamento) ncEmAndamento++
      else ncSemStatus++
    } else {
      if (r.legislacao_atendida) semNcLegAtendida++
      else semNcSemStatus++
    }

    // Solucionado sem data de encerramento: inconsistência a mostrar no resumo
    if (r.solucionado && !r.data_conclusao) solucionadoSemData++
  }

  return {
    linhas: dedup,
    totalBrutas: linhas.length,
    duplicadosRemovidos: linhas.length - dedup.length,
    semId,
    semPermissionaria,
    semData,
    solucionadoSemData,
    dataIni: datas[0] || null,
    dataFim: datas[datas.length - 1] || null,
    porStatus: { solucionado, legAtendida, emAndamento, semStatus },
    comNaoConformidade,
    validacao: { ncSolucionado, ncEmAndamento, ncSemStatus, semNcLegAtendida, semNcSemStatus },
  }
}

// Trava de pré-voo: testa escrita com uma linha-sentinela antes de apagar
// qualquer dado real. Sem permissão → aborta sem destruir nada.
async function preflight() {
  const SENTINELA = '__preflight_tela_fisc__'
  await supabase.from('fiscalizacoes').delete().eq('id_origem', SENTINELA)
  const { error } = await supabase
    .from('fiscalizacoes')
    .insert({ id_origem: SENTINELA, permissionaria: SENTINELA })
  if (error) {
    throw new Error(
      'Sem permissão de escrita na Fiscalização — importação abortada SEM apagar nada. ' +
        'Confirme que o script 07-atualizar-dados.sql foi rodado no banco e que você tem a permissão "fisc.upload".'
    )
  }
  await supabase.from('fiscalizacoes').delete().eq('id_origem', SENTINELA)
}

// Executa a importação: preflight → DELETE em lotes → INSERT em lotes →
// snapshot de auditoria. onProgresso({ fase, feito, total }) atualiza a tela.
export async function executarImportacao({
  linhas,
  nomeArquivo,
  duplicadosRemovidos,
  porStatus,
  dataIni,
  dataFim,
  comNaoConformidade,
  user,
  onProgresso,
}) {
  onProgresso({ fase: 'Testando permissão de escrita…', feito: 0, total: 1 })
  await preflight()

  // DELETE em lotes (apagar tudo de uma vez estoura o timeout da API)
  onProgresso({ fase: 'Removendo dados antigos…', feito: 0, total: 1 })
  let apagados = 0
  for (;;) {
    const { data, error } = await supabase
      .from('fiscalizacoes')
      .select('id')
      .order('id', { ascending: true })
      .range(BATCH_DELETE - 1, BATCH_DELETE - 1)
    if (error) throw error
    if (data?.length) {
      const { error: e2 } = await supabase
        .from('fiscalizacoes')
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
      // Apaga o restante (menos de BATCH_DELETE linhas)
      const { error: e3 } = await supabase
        .from('fiscalizacoes')
        .delete()
        .neq('id', -1)
      if (e3) throw e3
      break
    }
  }

  // INSERT em lotes
  for (let i = 0; i < linhas.length; i += BATCH_INSERT) {
    const lote = linhas.slice(i, i + BATCH_INSERT)
    const { error } = await supabase.from('fiscalizacoes').insert(lote)
    if (error) throw error
    onProgresso({
      fase: 'Enviando dados…',
      feito: Math.min(i + BATCH_INSERT, linhas.length),
      total: linhas.length,
    })
  }

  // Snapshot de auditoria (falha aqui não desfaz a importação)
  onProgresso({ fase: 'Registrando no histórico…', feito: 1, total: 1 })
  const { error: errSnap } = await supabase.from('importacoes_snapshots').insert({
    fonte: 'fiscalizacoes',
    nome_arquivo: nomeArquivo,
    total_linhas: linhas.length,
    duplicados_removidos: duplicadosRemovidos,
    status_novos: null,
    resumo: {
      por_status: [
        { s: 'Solucionado', qtd: porStatus.solucionado },
        { s: 'Legislação Atendida', qtd: porStatus.legAtendida },
        { s: 'Em andamento', qtd: porStatus.emAndamento },
        { s: 'Sem status', qtd: porStatus.semStatus },
      ],
      com_nao_conformidade: comNaoConformidade,
      periodo: { de: dataIni, ate: dataFim },
    },
    uploaded_by: user?.id || null,
    uploaded_by_email: user?.email || null,
  })
  if (errSnap) console.warn('Falha ao gravar snapshot:', errSnap.message)

  return { importadas: linhas.length }
}
