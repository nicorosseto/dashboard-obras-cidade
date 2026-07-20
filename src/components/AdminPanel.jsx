// Painel de Configurações (admin): dispatcher fino entre as 4 abas.
// Cada aba mora em ./admin/ (Fase M5, Frente 3, Etapa 3 — extraído de um
// único arquivo de 1213 linhas).
//
// Modo demo (19/07/2026, ampliação "Configurações somente leitura"): o
// visitante da demo pública também abre este painel (ver App.jsx,
// `podeVerConfiguracoes`), mas nunca é admin de verdade — então despacha
// para versões *Demo*, alimentadas por dados fictícios (demoAdminData.js),
// sem nenhuma chamada ao Supabase. A aba "Log de Acessos" (3) some no modo
// demo — ver Header.jsx.
import AbaUsuarios from './admin/AbaUsuarios.jsx'
import AbaPerfis from './admin/AbaPerfis.jsx'
import AbaLogs from './admin/AbaLogs.jsx'
import AtualizarDados from './AtualizarDados.jsx'
import AbaUsuariosDemo from './admin/AbaUsuariosDemo.jsx'
import AbaPerfisDemo from './admin/AbaPerfisDemo.jsx'
import AtualizarDadosDemo from './AtualizarDadosDemo.jsx'
import { ehModoDemo } from '../lib/demo.js'

export default function AdminPanel({ abaAtiva = 0 }) {
  const demo = ehModoDemo()
  return (
    <section className="bg-white rounded-lg shadow-sm p-5">
      {abaAtiva === 0 && (demo ? <AbaUsuariosDemo /> : <AbaUsuarios />)}
      {abaAtiva === 1 && (demo ? <AbaPerfisDemo /> : <AbaPerfis />)}
      {abaAtiva === 2 && (demo ? <AtualizarDadosDemo /> : <AtualizarDados />)}
      {abaAtiva === 3 && !demo && <AbaLogs />}
    </section>
  )
}
