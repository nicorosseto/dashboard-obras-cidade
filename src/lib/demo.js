// Modo demo (portfólio público, decisão de 19/07/2026 — Opção B do
// progresso.md): com a flag VITE_DEMO_MODE=true, o app roda 100% estático,
// sem NENHUMA chamada ao Supabase — nem Auth, nem tabelas. Serve para o
// deploy Vercel do repo público (mirror), sem chave real nem login.
//
// Nos demais ambientes (produção/homologação/dev local), a flag fica
// desligada e nada aqui é usado — comportamento 100% inalterado.

// Verifica a flag a cada chamada (não em módulo-load) para os testes em
// node poderem simular os dois cenários mudando import.meta.env.
export function ehModoDemo() {
  return import.meta.env.VITE_DEMO_MODE === 'true'
}

// ── Sessão/perfil "fake" do visitante da demo ───────────────────────
export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000demo'

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: 'visitante@demo.local',
  user_metadata: {},
}

export const DEMO_SESSION = {
  user: DEMO_USER,
  access_token: 'demo',
  expires_at: null,
}

// `role` propositalmente diferente de 'admin': o visitante da demo nunca
// enxerga o painel de Configurações nem ações administrativas.
export const DEMO_PROFILE = {
  id: DEMO_USER_ID,
  role: 'visitante',
  ativo: true,
  primeiro_acesso: false,
  perfil_acesso_id: null,
}

// Busca um JSON estático de public/demo-data/<nome>.json.
export async function demoFetchJSON(nome) {
  const base = import.meta.env.BASE_URL || '/'
  const resp = await fetch(`${base}demo-data/${nome}.json`)
  if (!resp.ok) {
    throw new Error(
      `Falha ao carregar dado demo "${nome}": HTTP ${resp.status}`
    )
  }
  return resp.json()
}
