// Conteúdo do pop-up de ajuda da Fiscalização (D2) — extraído de
// AtualizarDados.jsx na Fase M5 (é só conteúdo estático, sem lógica).
import { Regra } from '../AjudaUpload.jsx'

export default function AjudaFiscalizacao() {
  return (
    <>
      <p className="text-gray-600">
        Ao enviar a planilha, o sistema faz uma série de tratamentos
        automáticos.{' '}
        <strong>Nada é gravado no banco antes da sua confirmação</strong> —
        primeiro você vê o resumo e confere os números.
      </p>

      <Regra titulo="1. Qual arquivo enviar">
        Envie o arquivo exportado pelo{' '}
        <strong>Consolidador de Fiscalização</strong> (ferramenta HTML externa).
        O arquivo deve conter a aba{' '}
        <strong>"DADOS_CONSOLIDADOS"</strong> com cabeçalho na linha 1 e dados
        a partir da linha 2. Se essa aba não for encontrada, o sistema
        interrompe com erro.
      </Regra>

      <Regra titulo="2. Quais colunas são lidas e por quê pela posição">
        As colunas são lidas <strong>pela posição</strong>, no formato do
        Consolidador de Fiscalização (29 colunas de dados + 9 auxiliares):
        PROCESSOS/VIA (A), permissionária (D), data da vistoria (F),
        subprefeitura (H), classificação viária (I), área m² (J),{' '}
        <strong>indicador de NC</strong> "Obras com Falhas" (O), tipos de falha
        individuais (P–X e AA), status em andamento/legislação/solucionado
        (Y, Z, AB) e data de encerramento (AC). Colunas auxiliares (AD em
        diante: FONTE, ANO, MES…) são ignoradas automaticamente.
      </Regra>

      <Regra titulo="3. Limpeza de cada célula">
        Espaços nas pontas são removidos. Células só com traços (
        <code>---</code>, <code>--</code>) ou vazias viram valor nulo.
        Permissionária <strong>NORCREST</strong> é sempre normalizada para
        maiúsculas — "Norcrest S/A" vira "NORCREST S/A" — para o agrupamento
        funcionar corretamente.
      </Regra>

      <Regra titulo="4. Datas">
        A data da vistoria e a data de encerramento são padronizadas para{' '}
        <strong>AAAA-MM-DD</strong>, aceitando data do Excel, número serial,
        texto DD/MM/AAAA ou já em ISO. Data inválida vira nulo (não bloqueia
        a importação, mas aparece no resumo).
      </Regra>

      <Regra titulo="5. Campos booleanos (falhas e status)">
        Aceita <code>X</code>, <code>SIM</code>, <code>S</code>,{' '}
        <code>1</code>, <code>TRUE</code> e <code>VERDADEIRO</code> como{' '}
        <strong>verdadeiro</strong>; qualquer outro valor (inclusive célula
        vazia) é falso. Funciona com os marcadores "X" típicos das planilhas
        e com TRUE/FALSE exportados pelo consolidador.
      </Regra>

      <Regra titulo="6. Área m²">
        Aceita número direto ou texto no formato brasileiro{' '}
        <strong>"1.234,56"</strong> (ponto de milhar, vírgula decimal).
        Valores não numéricos viram nulo.
      </Regra>

      <Regra titulo="7. Linhas sem PROCESSOS/VIA">
        São <strong>descartadas</strong> (contadas no resumo). O
        PROCESSOS/VIA é a chave de tudo — sem ele a linha não pode ser
        identificada.
      </Regra>

      <Regra titulo="8. Deduplicação por PROCESSOS/VIA">
        Se o mesmo PROCESSOS/VIA aparecer em mais de uma linha, mantém-se{' '}
        <strong>a de data de vistoria mais recente</strong>. Sem data perde;
        em empate, vence a última do arquivo. O total de duplicatas removidas
        aparece no resumo.
      </Regra>

      <Regra titulo="9. Status simultâneos">
        Se uma linha tiver mais de um status marcado (ex.: Solucionado E Em
        andamento), o banco aplica a precedência:{' '}
        <strong>Solucionado {">"} Legislação Atendida {">"} Em andamento</strong>.
        O distribuição mostrada no resumo já segue essa mesma regra.
      </Regra>

      <Regra titulo="10. Gravação com rede de segurança">
        Antes de apagar qualquer coisa, o sistema faz um{' '}
        <strong>teste de permissão de escrita</strong> (insere e remove uma
        linha de teste). Se você não tiver permissão, ele aborta{' '}
        <strong>sem apagar nada</strong>. Em seguida substitui todos os dados
        em lotes e registra a importação no histórico (quem, quando, totais).
      </Regra>

      <Regra titulo="11. E se a janela fechar no meio?">
        A importação roda no seu navegador — se a aba fechar ou a internet
        cair no meio, o banco fica <strong>incompleto</strong>. A recuperação
        é simples: <strong>reenvie a mesma planilha</strong>. O navegador pede
        confirmação se você tentar fechar durante o envio.
      </Regra>
    </>
  )
}
