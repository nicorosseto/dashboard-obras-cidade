// Conteúdo do pop-up de ajuda do Sistema Geo (D1) — extraído de
// AtualizarDados.jsx na Fase M5 (é só conteúdo estático, sem lógica).
import { Regra } from '../AjudaUpload.jsx'

export default function AjudaSistemaGeo() {
  return (
    <>
      <p className="text-gray-600">
        Ao enviar a planilha, o sistema faz uma série de tratamentos
        automáticos.{' '}
        <strong>Nada é gravado no banco antes da sua confirmação</strong> —
        primeiro você vê o resumo e classifica o que for novo.
      </p>

      <Regra titulo="1. Qual aba e quais colunas são lidas">
        Usa a <strong>primeira aba</strong> da planilha (se existir uma aba
        chamada "DadosSistemaGeo", ela tem preferência). Cabeçalho na linha 1,
        dados a partir da linha 2. As colunas são lidas{' '}
        <strong>pela posição</strong>, nesta ordem: processo, tipo de processo,
        permissionária, executora, data de cadastro, etapa, subprefeitura,
        status e tipo de obra.
      </Regra>

      <Regra titulo="2. Limpeza de cada célula">
        Espaços em branco nas pontas são removidos. Células só com traços (
        <code>---</code>, <code>--</code>) ou vazias viram "sem valor".
      </Regra>

      <Regra titulo="3. Datas">
        A data de cadastro é padronizada para <strong>AAAA-MM-DD</strong>,
        aceitando data do Excel, número serial, texto DD/MM/AAAA ou já em ISO.
      </Regra>

      <Regra titulo="4. Rótulos legíveis">
        Tipo de processo, etapa e tipo de obra são traduzidos do código bruto
        para o nome legível (ex.: <code>MANUTENCAO_CORRETIVA</code> →
        "Manutenção Corretiva"). Códigos desconhecidos mantêm o valor original.
      </Regra>

      <Regra titulo="5. Linhas sem nº de processo">
        São <strong>descartadas</strong> (e contadas no resumo). O nº de
        processo é a chave de tudo.
      </Regra>

      <Regra titulo="6. Deduplicação por processo">
        A planilha repete o mesmo processo (uma linha por etapa). Mantém-se{' '}
        <strong>uma linha por processo</strong>: vence a de{' '}
        <strong>data de cadastro mais recente</strong>. Sem data perde; em
        empate, vence a última do arquivo.
      </Regra>

      <Regra titulo="7. Status e tipos de processo novos">
        Cada status e cada tipo de processo é comparado com o catálogo do banco.
        Os já conhecidos recebem nome e grupo automaticamente. Os{' '}
        <strong>novos</strong> aparecem para você classificar antes de importar
        — o botão de importar só libera depois. A classificação fica salva para
        as próximas vezes.
      </Regra>

      <Regra titulo="8. Gravação com rede de segurança">
        Antes de apagar qualquer coisa, o sistema faz um{' '}
        <strong>teste de permissão de escrita</strong> (insere e remove uma
        linha de teste). Se você não tiver permissão, ele aborta{' '}
        <strong>sem apagar nada</strong>. Em seguida substitui todos os dados em
        lotes e registra a importação no histórico (quem, quando, totais).
      </Regra>

      <Regra titulo="9. E se a janela fechar no meio?">
        A importação roda no seu navegador — se a aba fechar ou a internet cair
        no meio, o banco fica <strong>incompleto</strong> (só com as linhas já
        enviadas). Nada se corrompe, e a recuperação é simples:{' '}
        <strong>reenvie a mesma planilha</strong>, que o processo recomeça e
        restaura tudo. Importação interrompida não entra no histórico. Por
        garantia, o navegador pede confirmação se você tentar fechar durante o
        envio.
      </Regra>
    </>
  )
}
