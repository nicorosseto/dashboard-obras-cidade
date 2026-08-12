# Fontes do Dashboard

`manrope-variable-latin.woff2` — fonte **Manrope** (fonte variável, pesos
400–800, subconjunto latino), baixada do Google Fonts
(`fonts.gstatic.com`) e servida localmente (self-hosted).

## Por que self-hosted, e por que Manrope

- A Identidade Visual da Prefeitura de São Paulo usa a fonte oficial
  **Axiforma**, que é **comercial paga** (fundição Kastelov) — sem licença
  web disponível, não pode ser usada. Decisão do usuário (02/08/2026,
  Frente 4 de `docs/plano-melhorias-2026-08.md`): usar **Manrope** como
  substituta livre (proporções e terminais próximos da Axiforma).
- Self-hosted (não via CDN do Google Fonts) para não depender de rede
  externa — a CSP do projeto e o modo demo (`VITE_DEMO_MODE`) não devem
  depender de terceiros para renderizar a tipografia.

## Licença

Manrope é licenciada sob a **SIL Open Font License 1.1** (livre para uso
comercial, redistribuição e modificação). Fonte:
[Google Fonts — Manrope](https://fonts.google.com/specimen/Manrope).

## Como foi gerado

Baixado direto do endpoint do Google Fonts (subconjunto `latin`, que já
cobre a acentuação do português — á, ã, ç, é, í, ó, ô, ú etc. estão dentro
de U+0000–00FF):

```bash
curl -sL "https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2" \
  -o public/fonts/manrope-variable-latin.woff2
```

Registrado em `src/index.css` via `@font-face` com
`font-weight: 400 800` (fonte variável — um arquivo cobre todos os pesos).
