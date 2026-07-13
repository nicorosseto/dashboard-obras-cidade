export const RODAPE_TEXTO =
  'OBRAS · Secretaria das Subprefeituras · Prefeitura de São Paulo'

export default function Rodape({ children }) {
  return (
    <footer className="bg-white border-t border-grey-line py-2 px-6 shrink-0">
      <div className="max-w-6xl mx-auto relative flex items-center justify-center">
        <span className="text-[10px] text-gray-400">{RODAPE_TEXTO}</span>
        {children && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2">{children}</div>
        )}
      </div>
    </footer>
  )
}
