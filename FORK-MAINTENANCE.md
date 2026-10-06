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
- A suíte completa `test:unit` foi executada após as correções de srcset abaixo.

## Correções de srcset

- CVE-2024-8373: aplicar a sanitização de mídia também a `source[srcset]` no
  caminho de `Attributes.$set()`, usado pela interpolação e por `ng-attr-srcset`.
  URLs que antes escapavam à política configurada passam a receber `unsafe:`.
- CVE-2024-21490: substituir a expressão regular de separação por uma leitura
  sequencial de espaços, dígitos e vírgulas, sem tentativas repetidas em cada espaço.
  Preservados os separadores e a formatação existentes, incluindo o tratamento
  legado de vírgulas em URLs. Esta mudança não reimplementa a gramática de srcset.
- Regressões em `test/ng/compileSpec.js`: domínio permitido/proibido, data URL
  bloqueada, atualização do binding e descritores malformados com 50 mil caracteres
  em `img` e `source`, por `srcset`, `ng-srcset` e `ng-prop-srcset`.
- Comparação de 50 mil entradas determinísticas: mesmos separadores que o algoritmo
  original. Entrada com 100 mil espaços: novo algoritmo aproximadamente 4 ms;
  algoritmo original excedeu o limite de 1,5 segundo em processo isolado.
- Validação: ESLint nos dois arquivos alterados e
  `yarn.cmd grunt test:unit --browsers=ChromeHeadless` passaram. Total de 26.428
  execuções em sete suítes (jqLite, três versões de jQuery e módulos), no Chrome 154.
- Fontes: https://www.herodevs.com/vulnerability-directory/cve-2024-8373
  e https://www.herodevs.com/vulnerability-directory/cve-2024-21490.

## Próxima triagem

Inventário inicial, ainda sem confirmação individual ou correção neste fork:

- ReDoS: CVE-2022-25844, CVE-2023-26116, CVE-2023-26117,
  CVE-2023-26118.
- Sanitização de mídia: CVE-2024-8372 e CVE-2025-0716.
- Consultar também CVE-2024-33665, CVE-2025-2336 e CVE-2025-4690.

Fontes iniciais:

- https://lists.debian.org/debian-lts-announce/2025/07/msg00005.html
- https://www.herodevs.com/vulnerability-directory/cve-2026-11998

Para cada item: confirmar versões e módulos afetados, reproduzir no código original,
adicionar teste de regressão, aplicar uma correção pequena, executar testes e registrar
eventuais impactos de compatibilidade. A prioridade também depende dos módulos e dos
dados externos usados pelo sistema consumidor.


## Imagens SVG: CVE-2025-0716 e CVE-2025-2336

Investigacao independente baseada nos avisos publicos, sem usar codigo do NES.
`image[href]` e `ng-href` passam a usar MEDIA_URL na interpolacao; `$set()` reaplica
as regras de imagens para href/xlinkHref apos desempacotar o valor, inclusive
quando foi confiado como RESOURCE_URL. `$sanitize` identifica href/xlink:href em
`image` como fontes de imagem, preservando a politica de links em anchors SVG.

Impacto intencional: URLs fora da politica de imagens deixam de ser exibidas,
mesmo quando confiadas como RESOURCE_URL. `trustAsResourceUrl()` nao substitui
`imgSrcSanitizationTrustedUrlList()` nesse caminho. SVG continua desabilitado por
padrao no sanitizer; nao habilitamos SVG nem desabilitamos SCE ou debug.

Testes cobrem URLs permitidas/bloqueadas, atualizacoes, valores confiados, href,
ng-href, ng-attr-href e xlink:href; a matriz srcset confirma a protecao ja existente
contra CVE-2024-8372 em img/source por srcset/ng-srcset/ng-attr-srcset/ng-prop-srcset.
Validacao conjunta final: 26.621 testes em sete suites, lint dos arquivos alterados
com terminadores de linha ignorados no Windows e whitespace aprovados. Onze
verificacoes no Chrome aprovadas; o build anterior falhou em oito verificacoes SVG.

Fontes:
- https://www.herodevs.com/vulnerability-directory/cve-2025-0716
- https://www.herodevs.com/vulnerability-directory/cve-2025-2336
- https://docs.herodevs.com/angularjs/release-notes/angularjs-1-9


## linky: CVE-2025-4690

O regex original tentava identificar emails a partir de cada sufixo de uma longa
sequencia sem `@`, com crescimento superlinear. O leitor independente verifica
inicio de protocolos e runs de caracteres de email; somente runs iniciados ou
precedidos por mailto sao examinados como candidatos de email. Sufixos finais
preservam a exclusao de pontuacao, e o resultado continua passando pelo `$sanitize`.

100.000 entradas deterministicas produziram os mesmos links, indices e tipos
que o regex anterior. A comparacao descobriu o caso `-www.@`, preservado em teste.
Regressoes cobrem texto de 100.000 caracteres, emails longos e inicios concorrentes.

Benchmark Chrome 154, mediana de tres amostras apos aquecimento para 4.000 letras
sem @: 10,0 ms antes e 0,6 ms depois. Carga sintetica, nao latencia de telas reais.
`benchmarks/nes-audit.html` reproduz o caso e os checks SVG. Suites conjuntas:
26.621 testes aprovados; lint aprovado (somente a regra de terminadores de linha
foi ignorada no Windows). O conjunto nao implica eliminacao de todas as CVEs.

Fonte: https://www.herodevs.com/vulnerability-directory/cve-2025-4690


## Injector: remocao de comentarios na anotacao implicita

Uma funcao valida pode conter muitos marcadores `/*a` sem fechamento dentro de
uma string. A remocao de comentarios anterior tentava repetidamente encontrar
`*/` ausente. O novo leitor usa indexOf para saltar aos delimitadores e lembra
quando nao ha nenhum fechamento restante. Preserva a semantica textual antiga,
inclusive tratar marcadores em strings como o regex original; nao e um parser JS.
Funcoes sem barras retornam diretamente. Arrays e anotacoes explicitas nao mudam.

100.000 entradas deterministicas de comentarios produziram texto igual ao regex
anterior. Testes conferem dependencias com comentarios de linha/bloco e com
20.000 marcadores sem fechamento. Chrome 154, 4.000 marcadores na funcao,
mediana de tres amostras: 62,8 ms antes e aproximadamente 0,1 ms depois.
Nenhum ganho foi demonstrado para toda criacao de injectors ou aplicacao.
Suites conjuntas: 26.621 testes aprovados; lint e whitespace aprovados.

Fonte de triagem: https://docs.herodevs.com/angularjs/release-notes/angularjs-1-9
