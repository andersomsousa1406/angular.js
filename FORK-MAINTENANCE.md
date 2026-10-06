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


## Diretivas em comentarios

O regex permitia que o whitespace separador tambem fosse consumido pelo grupo
que captura o valor, causando retrocesso excessivo em valores multiline invalidos.
O grupo de valor agora comeca em um caractere nao whitespace ou fica vazio,
preservando a escolha gulosa anterior do separador e a semantica de fim de linha.

100.000 entradas deterministicas produziram os mesmos matches e grupos que o
regex anterior. Um teste com 50.000 espacos confirma rejeicao de valor multiline.
Chrome 154: 4.000 espacos, mediana de tres amostras, 6,7 ms antes e abaixo da
resolucao de aproximadamente 0,1 ms depois. Nao mede compilacao de uma tela real.
Suites conjuntas: 26.621 testes aprovados; lint e whitespace aprovados.

Fonte de triagem: https://docs.herodevs.com/angularjs/release-notes/angularjs-1-9


## CSS Animations Level 2

`animation-duration` pode come?ar com `auto`. O codigo anterior deixava a lista
como string e perdia duracoes numericas posteriores, por exemplo `auto, 2s`.
Agora sempre normaliza animationDuration usando o leitor de tempos existente;
`auto` equivale a zero em animacoes dirigidas pelo tempo. Testes cobrem auto
isolado, listas mistas e duracoes numericas anteriores. Nao introduzir suporte
completo a scroll timelines, nem mudar transitionProperty/animationName.
Fonte: https://www.w3.org/TR/css-animations-2/#animation-duration

## Resultado da triagem NES em 2026-10-06

Esta rodada investigou os itens identificados nos registros publicos citados
na conversa, com implementacoes proprias, sem copiar patches comerciais.

| Item | Resultado |
| --- | --- |
| SVG no compile, CVE-2025-0716 | Corrigido, incluindo RESOURCE_URL confiado |
| SVG no sanitize, CVE-2025-2336 | Corrigido, sem habilitar SVG por padrao |
| linky, CVE-2025-4690 | Leitor linear e regressao |
| Comentarios no injector | Busca linear e regressao |
| Diretivas em comentarios | Sobreposicao de whitespace removida |
| ngAnimate / animation-duration auto | Normalizacao de listas mistas corrigida |
| srcset, CVE-2024-8372 | Coberto pelas correcoes existentes; matriz de oito caminhos aprovada |
| srcset, CVE-2024-8373 / CVE-2024-21490 | Correcoes existentes mantidas; leitores ja otimizados |
| SCE, CVE-2026-11998 | Correcao existente mantida |
| Barras finais do ngMocks | Sem alteracao: routeToRegExp escapa cada barra antes do regex; nao ha run longo de barras consecutivas no padrao |
| Vazamento de memoria NES | Nenhum item especifico identificado no changelog publico consultado; sem alegar reproduzir um patch nao identificado |

Validacao final: 26.621 execucoes aprovadas nas sete suites ChromeHeadless.
Comparacao diferencial: 100.000 entradas para links, remocao de comentarios e
matches de diretivas em comentarios, com resultados iguais aos anteriores.
O harness local esta em `tmp/nes-differential.js` (nao versionado). O benchmark
versionado `benchmarks/nes-audit.html` passou em 11 checks; a copia do build
anterior falhou em oito checks de politica SVG. Lint dos arquivos modificados
aprovado com a regra de terminadores de linha desativada no Windows; whitespace
aprovado. Core, sanitizer e animate regenerados com debug habilitado.

Limites: validacao no Chrome 154, sem certificacao NES e sem demonstrar eliminacao
de todas as vulnerabilidades conhecidas. As CVEs do inventario inicial que nao
constam como corrigidas acima continuam pendentes de triagem. Memoria total nao
foi medida nesta rodada. Politicas de imagens mais estritas podem exigir ajustes
na aplicacao consumidora; os demais leitores preservam o comportamento anterior.

Fonte da lista: https://docs.herodevs.com/angularjs/release-notes/angularjs-1-9

## Digest e ciclo de vida das animacoes (2026-10-06)

Correcoes proprias, sem atribuir equivalencia a patches NES:

- $digest preserva a continuacao antes que $destroy remova os vinculos do scope
  ativo ou ancestral; ignora watchers removidos e estabiliza scopes sobreviventes.
- $$rAFScheduler consome lotes por cursor, limpa slots e compacta armazenamento;
  reentrada e waitUntilQuiet mantiveram traces iguais em 100 cenarios comparativos.
- $animateCss cancela o timeout de inicio de stagger em end/cancel. Antes, o
  callback nao animava depois de fechado, mas mantinha elementos ate vencer o
  atraso. Heap do caso sintetico: 4.045.724 -> 44.157 bytes apos remover o elemento.

Auditoria de fechamento: listeners de fim e timeout final ja sao removidos;
callbacks done ja sao esvaziados. Hosts de runners explicitamente mantidos pelo
consumidor continuam acessiveis para preservar seus metodos. Isso nao demonstra
ausencia de todas as retencoes ou vazamentos possiveis.

Validacao: 26.689 execucoes aprovadas, suites de modulos repetidas apos ajuste do
teste de drenagem; lint, whitespace e builds core/ngAnimate aprovados. Debug
permanece habilitado e a frequencia de digest nao muda. Medicoes, limites e
harnesses estao em benchmarks/PERFORMANCE-AUDIT.md.

## Inputs do parser e filas auxiliares de animacao (2026-10-06)

- Analise de dependencias binarias evita copias repetidas da lista crescente.
  Uma estrutura intermediaria e materializada somente nos limites necessarios.
  10.000 ASTs diferenciais preservaram ordem, duplicatas, constantes e pureza;
  testes cobrem CSP e compilacao de funcoes. Metadata temporaria de 1.000 inputs
  no harness Node/GC: 4.187.696 -> 195.032 bytes; nao e memoria do cache permanente.
- $$animateAsyncRun libera slots consumidos e recupera trabalho pendente em um
  novo frame apos excecao. Preserva propagacao do erro e reentrada sem erro no
  mesmo frame; nao altera todos os caminhos de erro dentro de runners.
- Chaves de $$animateCache usam construcao direta no caminho de strings, com
  array/join de fallback para outros argumentos. Chrome, 100.000 chamadas:
  11,7 -> 6,6 ms; nao mede renderizacao.

26.718 execucoes aprovadas; lint dos arquivos alterados, whitespace e builds
core/ngAnimate aprovados. Cada melhoria tem commit independente. Debug habilitado
e agendamento do digest preservados. Detalhes em benchmarks/PERFORMANCE-AUDIT.md.

## Cleanup one-time, callbacks done e classes (2026-10-06)

- Bindings :: agendam apenas um cleanup pendente, verificando o valor final e
  permitindo retry no digest seguinte. Testes CSP/compilado cobrem undefined.
- Runners marcam conclusao e destacam callbacks antes de executa-los, evitando
  resolucao recursiva. Executam os restantes mesmo apos falha e propagam o primeiro
  erro. done registrado durante a resolucao observa conclusao imediatamente;
  erros posteriores nao substituem o primeiro. Hosts nao foram modificados.
- jqLite usa lookup temporario em adicoes grandes de classes regulares. Mantem
  ordem e semantica de whitespace, duplicatas e tokens vazios. 10.000 comparacoes
  tiveram resultado e quantidade de escritas iguais. O lookup usa memoria
  temporaria em troca de menos buscas; nao afirmar economia de heap nesse caminho.

26.734 execucoes aprovadas; lint, whitespace e core build aprovados. Benchmark
isolado de classes e limites documentados em benchmarks/PERFORMANCE-AUDIT.md.
Debug e frequencia de digest preservados; tres commits separados.
