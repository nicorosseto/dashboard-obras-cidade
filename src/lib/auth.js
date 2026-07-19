import { supabase } from './supabase.js'
import { ehModoDemo, DEMO_PROFILE } from './demo.js'

// Domínio fictício usado apenas para usuários internos (login por username).
// Não há restrição de domínio no login: quem tem conta criada pelo admin entra.
// O cadastro público está desabilitado no painel do Supabase (Authentication →
// Sign In / Up), então só o admin cria contas — esse é o controle de acesso.
const INTERNAL_DOMAIN = 'obras.app'

// Converte username (sem @) em email interno
export function usernameToEmail(input) {
  return `${input.trim().toLowerCase()}@${INTERNAL_DOMAIN}`
}

// Recebe o que o usuário digitou e retorna o email que será usado no Supabase Auth
export function resolveEmail(input) {
  if (!input) return ''
  const s = input.trim()
  // Se contém @, é tratado como e-mail direto
  if (s.includes('@')) return s.toLowerCase()
  // Sem @: é username interno
  return usernameToEmail(s)
}

// ── Expiração da sessão (decisão de 11/06/2026) ─────────────────────
// O Supabase renova a sessão indefinidamente ("manter conectado").
// Em máquina compartilhada de repartição isso é risco: limitamos a
// sessão a um tempo máximo desde o login — depois disso o app desloga
// sozinho e pede as credenciais de novo.
export const SESSAO_MAX_HORAS = 12
const LOGIN_EM_KEY = 'obras_login_em'

function marcarLogin() {
  localStorage.setItem(LOGIN_EM_KEY, String(Date.now()))
}

// Sessões criadas antes desta versão não têm marca: ganham uma agora
// (passam a contar as horas a partir daqui).
export function garantirMarcaLogin() {
  if (!localStorage.getItem(LOGIN_EM_KEY)) marcarLogin()
}

export function sessaoExpirada() {
  // Modo demo: sessão do visitante nunca expira sozinha.
  if (ehModoDemo()) return false
  const t = Number(localStorage.getItem(LOGIN_EM_KEY) || 0)
  if (!t) return false
  return Date.now() - t > SESSAO_MAX_HORAS * 60 * 60 * 1000
}

export async function signIn(input, password) {
  const email = resolveEmail(input)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error

  marcarLogin()
  await logAccess(data.user, 'login')
  return data
}

export async function signOut(user) {
  // Modo demo: não há sessão real no Supabase Auth para encerrar.
  if (ehModoDemo()) return
  if (user) await logAccess(user, 'logout')
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  localStorage.removeItem(LOGIN_EM_KEY)
}

export async function logAccess(user, evento) {
  if (!user) return
  await supabase.from('access_logs').insert({
    user_id: user.id,
    email: user.email,
    evento,
    user_agent: navigator.userAgent,
  })
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getProfile(userId) {
  if (ehModoDemo()) return DEMO_PROFILE
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function isAdmin(userId) {
  if (ehModoDemo()) return false
  const profile = await getProfile(userId)
  // `ativo` só indica conclusão do 1º acesso, não bloqueio: admin é admin
  // mesmo com 1º acesso pendente.
  return profile?.role === 'admin'
}

// Retorna true se o e-mail é de um usuário interno (username@obras.interno)
export function isInternalUser(email) {
  return !!email?.toLowerCase().endsWith('@' + INTERNAL_DOMAIN)
}

// Nome exibido na interface: usuário interno aparece só pelo username
// (o domínio @obras.app é detalhe técnico, não deve aparecer na tela).
export function nomeExibicao(email) {
  if (!email) return ''
  return isInternalUser(email) ? email.split('@')[0] : email
}
