# Manutenção do fork

Base: AngularJS 1.8.3, upstream sem suporte desde janeiro de 2022.
Este fork ainda não deve ser considerado livre das vulnerabilidades conhecidas.

## Primeira correção

- CVE-2026-11998: agrupar expressões regulares antes de adicionar as âncoras em
  `adjustMatcher()`. Impede que alternativas nas listas de URLs do `$sceDelegate`
  aceitem correspondências parciais. O grupo não capturante preserva referências
  a grupos existentes. As flags continuam sendo removidas conforme o contrato original.
- Testes de regressão: `test/ng/sceSpecs.js`, cobrindo listas de URLs permitidas e
  bloqueadas, prefixos/sufixos indevidos, grupos de captura e flags.
- Aviso e reprodução: https://www.herodevs.com/vulnerability-directory/cve-2026-11998
- Antes de distribuir: executar a suíte de navegador (`yarn grunt test:unit`) e
  validar o sistema consumidor. Mudanças no SCE exigem revisão de segurança.

### Validação em 2026-10-05

- Ambiente: Node 14.16.1, Yarn Classic 1.22.22, dependências instaladas com
  `--frozen-lockfile --non-interactive`; `package.json` e `yarn.lock` preservados.
- `yarn.cmd grunt test:jqlite --browsers=ChromeHeadless`: todos os 6.222 testes
  passaram no Chrome 154, incluindo os testes SCE.
- Corrigidas as três falhas de `datetime-local` em `test/ng/directive/inputSpec.js`:
  os testes verificam a formatação exata de `$viewValue` e aceitam a remoção de zeros
  finais pelo input nativo, preservando o valor dos milissegundos.
- A suíte completa `test:unit` ainda não foi executada.

## Próxima triagem

Inventário inicial, ainda sem confirmação individual ou correção neste fork:

- ReDoS: CVE-2022-25844, CVE-2023-26116, CVE-2023-26117,
  CVE-2023-26118 e CVE-2024-21490.
- Sanitização de mídia: CVE-2024-8372, CVE-2024-8373 e CVE-2025-0716.
- Consultar também CVE-2024-33665, CVE-2025-2336 e CVE-2025-4690.

Fontes iniciais:

- https://lists.debian.org/debian-lts-announce/2025/07/msg00005.html
- https://www.herodevs.com/vulnerability-directory/cve-2026-11998

Para cada item: confirmar versões e módulos afetados, reproduzir no código original,
adicionar teste de regressão, aplicar uma correção pequena, executar testes e registrar
eventuais impactos de compatibilidade. A prioridade também depende dos módulos e dos
dados externos usados pelo sistema consumidor.
