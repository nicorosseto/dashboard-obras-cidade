export const RODAPE_TEXTO =
  'OBRAS · Secretaria das Subprefeituras · Prefeitura de São Paulo'

export default function Rodape({ children }) {
  return (
    <footer className="bg-white border-t border-grey-line py-2 px-6 shrink-0">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{RODAPE_TEXTO}</span>
        {children}
      </div>
    </footer>
  )
}
