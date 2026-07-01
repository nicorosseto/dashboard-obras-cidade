// Mapeamento das 32 subprefeituras de Sao Paulo.
// Tres formas:
//   - sigla (2-3 letras, como aparece na col G "SUB" do CONTROLE_GERAL)
//   - nome completo (como aparece no GeoJSON, para o mapa casar por nome)
//   - regiao geografica (Norte/Sul/Leste/Oeste/Central)
//
// ⚠️ Padrao OFICIAL das siglas (nao trocar): MP = Sao Miguel, SM = Sao Mateus.
// Ja estiveram trocados aqui; a fonte da verdade e supabase/schema/04-subprefeituras.sql.
// Os 'nome' seguem a grafia do GeoJSON (ex.: "Pirituba/Jaragua"); a tabela do
// banco usa a grafia oficial ("Pirituba-Jaragua"). Os dados (sistemaGeo/fiscalizacao)
// gravam a SIGLA, entao o mapa liga por sigla (nome do GeoJSON -> sigla -> contagem).

export const SUBPREFEITURAS = [
  { sigla: 'PR', nome: 'Perus', regiao: 'Norte' },
  { sigla: 'PJ', nome: 'Pirituba/Jaraguá', regiao: 'Norte' },
  { sigla: 'FB', nome: 'Freguesia do Ó/Brasilândia', regiao: 'Norte' },
  { sigla: 'CV', nome: 'Casa Verde', regiao: 'Norte' },
  { sigla: 'ST', nome: 'Santana/Tucuruvi', regiao: 'Norte' },
  { sigla: 'JT', nome: 'Jaçanã/Tremembé', regiao: 'Norte' },
  { sigla: 'MG', nome: 'Vila Maria/Vila Guilherme', regiao: 'Norte' },

  { sigla: 'VM', nome: 'Vila Mariana', regiao: 'Sul' },
  { sigla: 'IP', nome: 'Ipiranga', regiao: 'Sul' },
  { sigla: 'SA', nome: 'Santo Amaro', regiao: 'Sul' },
  { sigla: 'JA', nome: 'Jabaquara', regiao: 'Sul' },
  { sigla: 'AD', nome: 'Cidade Ademar', regiao: 'Sul' },
  { sigla: 'CL', nome: 'Campo Limpo', regiao: 'Sul' },
  { sigla: 'MB', nome: "M'Boi Mirim", regiao: 'Sul' },
  { sigla: 'CS', nome: 'Capela do Socorro', regiao: 'Sul' },
  { sigla: 'PA', nome: 'Parelheiros', regiao: 'Sul' },

  { sigla: 'PE', nome: 'Penha', regiao: 'Leste' },
  { sigla: 'EM', nome: 'Ermelino Matarazzo', regiao: 'Leste' },
  { sigla: 'MP', nome: 'São Miguel', regiao: 'Leste' },
  { sigla: 'IT', nome: 'Itaim Paulista', regiao: 'Leste' },
  { sigla: 'MO', nome: 'Mooca', regiao: 'Leste' },
  { sigla: 'AF', nome: 'Aricanduva/Vila Formosa', regiao: 'Leste' },
  { sigla: 'IQ', nome: 'Itaquera', regiao: 'Leste' },
  { sigla: 'VP', nome: 'Vila Prudente', regiao: 'Leste' },
  { sigla: 'SM', nome: 'São Mateus', regiao: 'Leste' },
  { sigla: 'CT', nome: 'Cidade Tiradentes', regiao: 'Leste' },
  { sigla: 'SB', nome: 'Sapopemba', regiao: 'Leste' },
  { sigla: 'G', nome: 'Guaianazes', regiao: 'Leste' },

  { sigla: 'LA', nome: 'Lapa', regiao: 'Oeste' },
  { sigla: 'BT', nome: 'Butantã', regiao: 'Oeste' },
  { sigla: 'PI', nome: 'Pinheiros', regiao: 'Oeste' },

  { sigla: 'SE', nome: 'Sé', regiao: 'Central' },
]

// Mapas para lookup O(1)
export const SIGLA_TO_NOME = Object.fromEntries(
  SUBPREFEITURAS.map((s) => [s.sigla, s.nome])
)
export const NOME_TO_SIGLA = Object.fromEntries(
  SUBPREFEITURAS.map((s) => [s.nome, s.sigla])
)
export const SIGLA_TO_REGIAO = Object.fromEntries(
  SUBPREFEITURAS.map((s) => [s.sigla, s.regiao])
)
export const REGIOES = ['Leste', 'Sul', 'Central', 'Oeste', 'Norte']
