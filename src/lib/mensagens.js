// Tradução das mensagens de erro do Supabase/GoTrue (que vêm em inglês do
// servidor) para português do Brasil. Usar SEMPRE que for exibir uma mensagem
// de erro vinda do `supabase.*` (auth, RPC, queries) na interface.
//
// Estratégia: primeiro tenta casar a frase exata; se não achar, tenta por
// trecho (substring); se ainda assim não casar, devolve a mensagem original
// (para não esconder um erro novo — quando aparecer, é só adicionar aqui).

// Frases exatas (minúsculas, sem espaços nas pontas)
const EXATAS = {
  'new password should be different from the old password.':
    'A nova senha deve ser diferente da senha atual.',
  'new password should be different from the old password':
    'A nova senha deve ser diferente da senha atual.',
  'invalid login credentials': 'Usuário ou senha inválidos.',
  'email not confirmed': 'E-mail ainda não confirmado.',
  'user already registered': 'Este usuário já está cadastrado.',
  'signups not allowed for this instance':
    'O cadastro público está desabilitado. Só o administrador cria contas.',
  'email rate limit exceeded':
    'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.',
  'database error querying schema':
    'Erro no banco ao consultar o cadastro. Avise o administrador do sistema.',
}

// Trechos (substring, minúsculo) → mensagem. Para casos com partes variáveis.
const TRECHOS = [
  ['password should be at least', 'A senha deve ter no mínimo 6 caracteres.'],
  [
    'should be different from the old password',
    'A nova senha deve ser diferente da senha atual.',
  ],
  ['invalid login credentials', 'Usuário ou senha inválidos.'],
  [
    'for security purposes, you can only request this after',
    'Por segurança, aguarde alguns segundos antes de tentar de novo.',
  ],
  ['unable to validate email address', 'Formato de e-mail inválido.'],
  ['email rate limit exceeded', 'Muitas tentativas. Aguarde e tente de novo.'],
  ['token has expired or is invalid', 'Sua sessão expirou. Entre novamente.'],
  [
    'failed to fetch',
    'Falha de conexão. Verifique a internet e tente de novo.',
  ],
  [
    'network request failed',
    'Falha de conexão. Verifique a internet e tente de novo.',
  ],
]

export function traduzErro(mensagem) {
  if (!mensagem) return 'Ocorreu um erro. Tente novamente.'
  const texto = String(mensagem).trim()
  const chave = texto.toLowerCase()

  if (EXATAS[chave]) return EXATAS[chave]
  for (const [trecho, traducao] of TRECHOS) {
    if (chave.includes(trecho)) return traducao
  }
  // Mensagem desconhecida: devolve a original (não esconder erro novo).
  return texto
}
