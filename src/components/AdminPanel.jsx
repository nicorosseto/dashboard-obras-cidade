// Painel de Configurações (admin): dispatcher fino entre as 4 abas.
// Cada aba mora em ./admin/ (Fase M5, Frente 3, Etapa 3 — extraído de um
// único arquivo de 1213 linhas).
import AbaUsuarios from './admin/AbaUsuarios.jsx'
import AbaPerfis from './admin/AbaPerfis.jsx'
import AbaLogs from './admin/AbaLogs.jsx'
import AtualizarDados from './AtualizarDados.jsx'

export default function AdminPanel({ abaAtiva = 0 }) {
  return (
    <section className="bg-white rounded-lg shadow-sm p-5">
      {abaAtiva === 0 && <AbaUsuarios />}
      {abaAtiva === 1 && <AbaPerfis />}
      {abaAtiva === 2 && <AtualizarDados />}
      {abaAtiva === 3 && <AbaLogs />}
    </section>
  )
}
