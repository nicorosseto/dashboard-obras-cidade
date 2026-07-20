// Versão somente-leitura de AtualizarDados.jsx para o modo demo (portfólio
// público). Não simula o fluxo completo de upload (pré-visualização,
// validação e gravação em lotes) — é complexo e arriscado de fingir de
// forma convincente. Mostra só o histórico de importações, reaproveitando
// o mesmo layout visual (`TabelaHistoricoImportacoes`), alimentado por
// SNAPSHOTS_DEMO em vez de uma consulta ao Supabase.
import { TabelaHistoricoImportacoes } from './AtualizarDados.jsx'
import { SNAPSHOTS_DEMO } from '../lib/demoAdminData.js'

export default function AtualizarDadosDemo() {
  return (
    <div>
      <div className="text-xs rounded-sm p-3 mb-4 bg-amber-50 border border-amber-200 text-amber-700">
        Nesta demonstração, mostramos apenas o histórico de importações. O fluxo
        completo de upload (com pré-visualização, validação e gravação em lotes)
        é uma funcionalidade interna, exclusiva para administradores — o código
        está em{' '}
        <code className="font-mono">src/components/AtualizarDados.jsx</code>.
      </div>
      <TabelaHistoricoImportacoes linhas={SNAPSHOTS_DEMO} />
    </div>
  )
}
