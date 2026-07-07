// Fonte única da paleta institucional para uso em JavaScript — onde uma
// classe Tailwind não serve porque a lib exige um valor de cor literal (props
// de gráfico do Recharts, gradientes inline, defaults de componente…).
//
// Os valores espelham o bloco @theme de src/index.css. CSS não pode importar
// de JS (e vice-versa), então ao mudar uma cor institucional é preciso
// atualizar os dois lugares — mas pelo menos cada um vira UMA fonte, não os
// ~150 hex literais espalhados que existiam antes (Fase M5).
// ⚠️ Só exporta cores com uso real duplicado e nome semântico claro no
// contexto (ver Fase M5). `#7030A0` (norcrest) e `#ED7D31` (accent) do @theme
// também se repetem em 2 arquivos cada, mas só por coincidência numérica —
// são usadas como "cor arbitrária de ano/região", não como identidade da
// NORCREST/accent; nomear a constante como tal confundiria mais do que ajuda.
// Ficam como hex literal nesses casos (não são duplicação real a resolver).
export const NAVY = '#1F3864'
export const NAVY_LIGHT = '#2E4F7F'
export const NAVY_MID = '#4472C4'
export const RED = '#C00000'
