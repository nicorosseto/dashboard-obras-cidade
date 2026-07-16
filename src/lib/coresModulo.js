import { NAVY, NAVY_LIGHT, RED } from './cores.js'

// Vermelho institucional mais claro, para o "to" do gradiente do módulo
// Multas (o "from" é o RED oficial, mesmo padrão dos demais módulos: from
// escuro/institucional → to mais claro).
const RED_LIGHT = '#E23636'

// Cores de acento (de/para do gradiente) por módulo ativo — fonte única usada
// pelo Header.jsx (ícone + barra de rodapé + abas) e pelo TituloTela (App.jsx).
export function coresModulo(secaoAtiva, paginaAtiva, mostrarEmergencias, mostrarRelatorio, mostrarMultas) {
  if (mostrarMultas) return { from: RED, to: RED_LIGHT }
  if (mostrarRelatorio) return { from: '#0f766e', to: '#14b8a6' }
  if (mostrarEmergencias) return { from: '#b45309', to: '#d97706' }
  if (paginaAtiva === 5) return { from: '#334155', to: '#475569' }
  if (secaoAtiva === 'sistemaGeo' && paginaAtiva === 4) return { from: '#4f1d96', to: '#6d28d9' }
  if (secaoAtiva === 'sistemaGeo') return { from: NAVY, to: NAVY_LIGHT }
  return { from: '#064e3b', to: '#065f46' }
}
