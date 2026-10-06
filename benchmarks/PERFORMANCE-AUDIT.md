# Auditoria inicial de desempenho — 2026-10-05

Medições locais no ChromeHeadless 154, Windows, build
`1.8.4-local+sha.fc2e10309`. Mediana de sete amostras após uma amostra de aquecimento.
Os números são de cenários sintéticos e variam com máquina, navegador e JIT.
Não medem layout/pintura, rede, retenção de memória nem o sistema consumidor.

## Resultados

| Cenário | Mediana (ms) |
| --- | ---: |
| Registrar 1.000 watchers em um scope | 0,20 |
| Registrar 10.000 watchers em um scope | 2,80 |
| Registrar 50.000 watchers em um scope | 105,30 |
| Registrar 50.000 watchers em 50 scopes filhos | 7,10 |
| Digest estável, 10.000 watchers simples | 0,047 |
| Digest estável, 50.000 watchers simples | 0,203 |
| Digest estável, 500 watches profundos de 100 objetos | 6,595 |
| Digest estável, 500 watches de coleção de 100 objetos | 0,150 |
| Parsing sem cache, array de 1.000 identificadores | 6,50 |
| Parsing sem cache, array de 5.000 identificadores | 40,60 |
| Parsing sem cache, array de 10.000 identificadores | 87,20 |
| Consulta ao cache do parser, 10.000 identificadores | < 0,001 |
| Digest estável, ngRepeat de 1.000 linhas com binding dinâmico | 0,051 |
| Mesmo cenário com binding de leitura única (`::`) | 0,012 |

O cenário de ngRepeat usa DOM separado do documento. Mede a verificação de scopes e
bindings, sem renderização visual. Os watchers simples observam apenas uma propriedade;
getters que fazem cálculos, filtros ou alocam objetos têm outros custos.

## Oportunidades e prioridades

1. **Registro de watchers em scopes muito grandes.** `src/ng/rootScope.js` insere
   cada watcher com `unshift()`, deslocando os anteriores. As medições são compatíveis
   com esse custo crescente; o digest estável não apresentou o mesmo crescimento.
   Candidato a otimização interna, mas exige preservar ordem de execução, remoção e
   inclusão durante o digest e `$$digestWatchIndex`. Não basta trocar `unshift` por `push`.
   Os 50 scopes filhos são um cenário comparativo, não uma proposta de mudar automaticamente
   a estrutura de scopes do sistema.
2. **Watches profundos de objetos grandes.** O digest chama `equals()` e, quando há
   alteração, `copy()`. Neste cenário estável, a comparação profunda custou cerca de
   44 vezes a observação de coleção. `$watchCollection` não detecta alterações internas
   nos objetos: a troca só é válida quando essa diferença atende à aplicação.
3. **Bindings de valores que não mudam.** O binding `::` remove o watcher após a
   estabilização do valor. Reduziu o custo da lista sintética, mas impede atualizações
   posteriores daquele binding. Priorizar dados realmente imutáveis.
4. **Parsing de expressões grandes e novas.** O parser consome tokens com `shift()`
   em `src/ng/parse.js`. Um cursor sobre os tokens é candidato a investigação, mas estas
   medições incluem lexer, AST e geração de código; não isolam o custo de `shift()`.
   Expressões já analisadas usam cache. Só priorizar uma mudança depois de medir
   templates com expressões usuais e comparar uma implementação candidata.

## Como repetir

Gerar o build com `yarn.cmd grunt build:angular` e abrir
`benchmarks/performance-audit.html` no navegador. A página usa apenas arquivos locais
e apresenta versão, navegador, mediana, mínimo e máximo. Não precisa do Benchpress.

O script também permite medir builds candidatos: executar a mesma página antes e
depois, no mesmo navegador/máquina, e repetir processos para reduzir efeitos de JIT/GC.
As medições desta revisão foram repetidas em processos do Chrome; o custo alto de
registro concentrado e de watches profundos apareceu em ambas as execuções.

## Otimizações internas validadas

Após a auditoria inicial, foram implementadas duas mudanças sem alterar os resultados
das expressões nem a ordem de execução dos watchers:

- O parser consome tokens por cursor, limpa referências consumidas e esvazia o array
  ao concluir a AST, inclusive em erros de sintaxe. Evita deslocar todos os tokens a
  cada consumo. O benchmark agora inclui `$$getAst()` para medir lexer + AST separados
  da geração de código e do cache.
- Funções de cancelamento de watchers liberam suas referências ao scope, array de
  watchers e watcher após o primeiro uso. Chamadas repetidas continuam válidas e o
  reset de `lastDirtyWatch` continua ocorrendo em todas as chamadas.

| Medição no Chrome 154 | Original | Otimizado |
| --- | ---: | ---: |
| Lexer + AST, array de 1.000 identificadores | 0,3 ms | 0,4 ms |
| Lexer + AST, array de 10.000 identificadores | 3,8 ms | 3,5 ms |
| Lexer + AST, array de 50.000 identificadores | 406,6 ms | 17,8 ms |
| Heap retido por cancelamentos já usados | 20.462.456 bytes | 150.376 bytes |

Não há ganho demonstrado em expressões pequenas: diferenças submilissegundo estão
na faixa de variação. O parsing completo de 10 mil identificadores ficou perto de
82 ms contra aproximadamente 87 ms na auditoria inicial; o ganho expressivo ocorre
na etapa de tokens em entradas extremas, não em todo parsing cotidiano.

A comparação da AST usou o mesmo build com o corpo do parser substituído pelo original
de `HEAD` em uma cópia temporária, preservando as demais mudanças. Ambos os cenários
usaram sete amostras após aquecimento. O benchmark Node isolado não foi usado para
as conclusões, pois o motor legado apresentou custos distintos do Chrome.

Para repetir a medição de memória, abrir `benchmarks/memory-audit.html` no Chrome
iniciado com `--js-flags=--expose-gc --enable-precise-memory-info`. O cenário mantém
1.000 funções de cancelamento após cancelar watchers e destruir seus scopes,
cada um contendo um array de 5.000 valores. As duas medidas são deltas após GC,
em processos separados. Representam retenção evitável nesse cenário, não uma redução
de memória de toda aplicação.

Validação: lint dos arquivos alterados e `yarn.cmd grunt test:unit --browsers=ChromeHeadless`
passaram, com 26.448 execuções. Foram acrescentados testes de ordem de tokens, reutilização
do parser após erros, limpeza de tokens e cancelamentos repetidos antes/depois de destruir
scopes. A suíte existente cobre remoção e inclusão de watchers durante o digest.

## Cancelamentos de eventos e filas internas

Foram otimizados três caminhos adicionais em `src/ng/rootScope.js`:

- `$on`: depois de remover um listener, a função de cancelamento passa a usar
  referências fracas ao scope, à lista e ao callback quando o navegador suporta
  `WeakRef`. Registros ativos mantêm as referências fortes necessárias. Callbacks
  duplicados e registrados novamente continuam podendo ser removidos por chamadas
  repetidas, conforme o comportamento anterior. Sem `WeakRef`, o caminho original
  é preservado e esta redução de retenção não se aplica. A primeira remoção acrescenta
  a criação de três referências fracas; a melhoria é de retenção de memória, não uma
  promessa de acelerar o cancelamento de cada evento.
- `$applyAsync`: um cursor compartilhado substitui `shift()`. Cada entrada consumida
  é limpa antes da chamada; tarefas adicionadas durante o processamento entram no
  mesmo turno. O cursor e o array são reiniciados ao terminar.
- `$watchGroup`: o cursor dos cancelamentos também é compartilhado, para preservar
  chamadas reentrantes e permitir continuar após um cancelamento que lança exceção.
  As funções consumidas são liberadas e o array é esvaziado ao concluir.

| Cenário no Chrome 154 | Original | Otimizado |
| --- | ---: | ---: |
| Retenção de 1.000 cancelamentos de eventos, scopes destruídos | 20.511.232 bytes | 204.236 bytes |
| Processar fila de 50.000 tarefas de applyAsync | 96,7 ms | 0,4 ms |
| Cancelar 10.000 watchers reais por watchGroup | 7,3 ms | 7,3 ms |
| Percorrer 50.000 callbacks de cancelamento, isolado | 97,0 ms | 0,2 ms |

O percurso isolado usa um `$watch` substituído apenas no scope do benchmark por uma
função que retorna `noop`, para retirar o custo de busca/remoção dos watchers. Não é
representativo do cancelamento completo. Com watchers reais, a busca por `indexOf()`
continua dominando, e não houve ganho mensurável nessa carga.

Comparação antes/depois com cópia temporária do build contendo o rootScope original
de `HEAD`; demais componentes iguais. Medianas de sete amostras para tempo, após
aquecimento. O modo `memory-audit.html?mode=events` mede o heap após GC, mantendo as
funções de cancelamento já usadas. Os ganhos representam cargas sintéticas grandes.

Validação: lint aprovado e `test:unit` com ChromeHeadless passou nas sete suítes,
totalizando 26.468 execuções. Novos testes cobrem callbacks duplicados/re-registrados,
fallback sem WeakRef, cancelamento reentrante, recuperação de cancelamentos após
exceção e tarefas enfileiradas após erro. Os testes existentes de `$emit`/`$broadcast`
também passaram, incluindo remoção durante a propagação.

## Registro/remoção de watchers e destruição de LRU

- Watchers passam a ser acrescentados com `push()` e percorridos do início ao fim,
  mantendo a ordem pública de registro. Um índice em cada watcher permite limpar
  sua entrada sem `indexOf()` ou `splice()`. O índice faz parte do objeto desde sua
  criação; não há um mapa adicional por watcher.
- Entradas removidas são substituídas por `null`, liberando o watcher. As entradas
  mortas no fim são retiradas imediatamente; outras são compactadas antes de iniciar
  um percurso ou, fora do digest, quando ocupam pelo menos metade do array (sempre
  nas listas pequenas). A compactação atualiza os índices dos sobreviventes.
- Se a remoção encurta o fim do array durante um digest, o cursor é ajustado para
  permitir executar watchers acrescentados em seguida no mesmo turno. O percurso
  ativo não é deslocado por compactação.
- `$cacheFactory.destroy()` também limpa `freshEnd` e `staleEnd`. Limpar somente
  os mapas deixava os nós LRU e suas chaves vivos enquanto alguém guardava o cache.

O índice acrescenta metadados por watcher, e pode haver espaços vazios temporários
no array. A melhoria de memória medida neste conjunto é do cache LRU; não se afirma
que todo scope use menos heap. `$$watchers` é armazenamento privado: agora sua ordem
física é a de registro, e seu comprimento pode incluir entradas removidas até a
compactação. Para contar watchers ativos, usar `$$watchersCount` (também interno).

| Cenário no Chrome 154 | Original | Otimizado |
| --- | ---: | ---: |
| Registrar 50.000 watchers em um scope | 98,9 ms | 1,0 ms |
| Cancelar 10.000 watchers reais por watchGroup | 19,8 ms | 0,5 ms |
| Digest estável, 10.000 watchers simples | 0,047 ms | 0,043 ms |
| Retenção de LRU destruído, 1.000 chaves longas | 5.074.844 bytes | 18.816 bytes |

Comparação usando o mesmo build com rootScope/cacheFactory originais de `HEAD` em
uma cópia temporária. Sete amostras após aquecimento para tempo; GC explícito para
memória. Foram repetidas as medições e a comparação de traces na versão final.

O benchmark de memória aceita `memory-audit.html?mode=lru`, mantendo o objeto do
cache após destruí-lo. As chaves têm aproximadamente 5.000 caracteres cada; a retenção
original era principalmente dessas chaves e da lista de nós, não dos valores do mapa.

Além dos testes unitários, 300 sequências determinísticas de inclusão/remoção durante
getters produziram traces idênticos no original e candidato: mesma ordem e quantidade
de avaliações e listeners, incluindo watchers novos e visita a scopes filhos.
Testes adicionais cobrem substituição do último watcher durante o digest, remoção
após compactação e recriação de um id de cache LRU destruído.
Lint e `yarn.cmd grunt test:unit --browsers=ChromeHeadless` passaram na versão final,
totalizando 26.480 execuções em sete suítes.


## Fila de templates assincronos

`$compile` passa a consumir os quatro campos de cada linking por cursor, sem
`shift()` repetido. As entradas consumidas sao limpas antes do linking, incluindo
scopes destruidos. Instancias adicionadas durante o linking continuam na mesma fila.
O cursor pertence a compilacao, preservando entradas restantes se houver erro.

No Chrome 154, a mediana de sete amostras apos aquecimento para processar 5.000
clones aguardando um template em cache caiu de 21,6 ms para 15,8 ms. O tempo inclui
linking e digest, mas exclui criar a fila e limpar clones. Carga sintetica; nao
representa uma tela real. Comparacao com o build anterior salvo antes das alteracoes.
Reproduzir com `queue-audit.html` apos gerar o core. O benchmark tambem mede rejeicoes.

Validacao conjunta das filas: sete suites unitarias, 26.500 execucoes aprovadas.
Novo teste cobre FIFO, scopes destruidos e clones adicionados durante linking.


## Referencias consumidas de evalAsync e postDigest

As filas deixam de manter tarefas ja consumidas enquanto os callbacks seguintes
executam. Cada entrada vira `null` antes da chamada. O cursor compartilhado de
postDigest, o contexto `this` original dos callbacks, erros e tarefas acrescentadas
continuam preservados; a frequencia de digest nao muda.

Os testes verificam a limpeza das entradas, novas tarefas e digest reentrante.
A suite completa passou e a suite jqLite foi repetida apos reforcar a preservacao
de `this`: 6.248 testes aprovados. Lint dos arquivos alterados aprovado com
terminadores Windows. O lint global encontrou CRLF em arquivos nao alterados.
Nao foi medido ganho de heap apos GC; esta mudanca reduz referencias na fila
durante o processamento, nao garante reducao da memoria total da aplicacao.
As filas privadas `$$asyncQueue` e `$$postDigestQueue` exibem entradas consumidas
como `null` durante callbacks; aplicacoes nao devem depender dessas entradas internas.


## Fila de verificacao de rejeicoes de promises

`$q` substitui `shift()` por cursor compartilhado e limpa cada estado consumido.
A fila so e esvaziada ao terminar; se o handler criar trabalho de promises,
interromper por excecao ou adicionar rejeicoes, a retomada preserva a ordem.
O teste de fila vazia usa entradas restantes, para manter o agendamento original.

Chrome 154: 50.000 rejeicoes, mediana de sete amostras apos aquecimento, 450,5 ms
antes e 9,0 ms depois. O benchmark `queue-audit.html` usa `$q` real com handler
que conta avisos sem registrar no console; mede o digest que processa a fila,
excluindo a criacao das promises. Sao lotes sinteticos grandes, nao desempenho
de requisicoes HTTP ou promises em geral. Testes novos cobrem retomada apos
trabalho de promises criado pelo handler e apos handler que lanca excecao.
Validacao conjunta: 26.500 testes nas sete suites, lint dos arquivos modificados
com terminadores Windows e verificacao de whitespace aprovados.


## Interpolacao direta com uma expressao

A chamada direta de `$interpolate` usa um valor escalar local quando existe uma
expressao, inclusive com prefixo/sufixo. Evita o array temporario sem acrescentar
closure persistente. Avalia o getter antes de atualizar o buffer, preservando
reentrada, allOrNothing, stringificacao, erros e verificacoes de SCE. O delegate
de watchers e o percurso de multiplas expressoes permanecem os anteriores.

Benchmark `internal-audit.html`, Chrome 154, sete amostras apos aquecimento,
500.000 chamadas diretas: duas rodadas com ordem dos builds invertida mediram
25,5/27,2 ms antes e 22,9/22,7 ms depois. Multiplas expressoes: 41,4/50,7 ms antes
e 42,3/50,9 ms depois; nao houve ganho consistente nesse controle. Tempos variam
entre processos. Nao representa todos os bindings e nao mede heap apos GC.

Validacao conjunta: 26.520 execucoes nas sete suites; apos finalizar o caminho
escalar, jqLite repetido com 6.253 testes aprovados. Novos testes verificam
reentrada e valores ausentes/validos sucessivos. Lint dos arquivos alterados com
terminadores Windows e verificacao de whitespace aprovados.


## Montagem dos interceptors HTTP

Pares de interceptors de entrada usam `push()` e sao encadeados na ordem inversa,
preservando ordem publica e ordem/quantidade de leituras de getters. A lista de
resposta mantem sua ordem. Sem interceptors, as duas listas temporarias nao sao
criadas. Nao alterar o timing dos callbacks nem agrupar respostas.

Benchmark isolado `internal-audit.html?mode=http`, Chrome 154, sete amostras apos
aquecimento, tempo de montar 1.000 requisicoes:

| Interceptors por requisicao | Antes | Depois |
| --- | ---: | ---: |
| 0 | 2,3 ms | 1,8 ms |
| 20 | 4,4 ms | 3,7 ms |
| 200 | 43,8 ms | 29,6 ms |

O backend sintetico retorna sucesso; o digest e respostas ficam fora do tempo
medido, mas todos os 1.000 callbacks sao conferidos. Nao mede rede nem latencia
real. Medir separado de eventos evita interferencia das grandes cargas anteriores
de alocacao/GC; tempos do modo completo nao devem ser atribuidos apenas ao HTTP.
Nenhuma medicao de heap foi feita. Novo teste verifica getters e ordem de execucao;
testes existentes de rejeicoes, recuperacao e requisicoes pendentes passaram.
Validacao conjunta: 26.520 testes, repeticao final jqLite com 6.253, lint aprovado.


## Compactacao de listeners em emit e broadcast

A propagacao agrupa somente entradas removidas consecutivas ja encontradas na
posicao atual e faz um unico `splice()` para esse trecho. Nao compactar antes do
primeiro callback nem mudar o limite capturado do percurso. Dessa forma, eventos
aninhados observam a mesma lista que anteriormente, sem metadados adicionais.
Remocoes intercaladas ainda podem exigir multiplos deslocamentos.

Benchmark com 20.000 listeners cancelados consecutivos seguidos por 5.000 ativos;
somente o dispatch e medido, excluindo registros/cancelamentos. Sete amostras apos
aquecimento em Chrome 154, duas rodadas invertendo a ordem dos builds:

| Evento | Antes (duas rodadas) | Depois (duas rodadas) |
| --- | ---: | ---: |
| emit | 173,3 / 133,0 ms | 0,2 / 0,2 ms |
| broadcast | 82,8 / 81,4 ms | 0,2 / 0,1 ms |

Variacao entre processos significativa. Esta carga extrema favorece o agrupamento;
nao representa o custo normal de emitir eventos, nem cancela listeners mais rapido.
Benchmark `internal-audit.html` confere os 5.000 callbacks executados.

300 sequencias deterministicas em processos isolados por iframe compararam o
build anterior e candidato. Traces identicas para inclusoes, cancelamentos
repetidos, erros, eventos aninhados, stopPropagation/preventDefault, scopes
visitados, flags retornadas e estado final das listas. Harness e snapshots locais
em `tmp/events-differential.html` (nao versionados). Testes novos cobrem trechos
cancelados e reentrada nos dois metodos. Validacao conjunta: 26.520 testes em sete
suites e 6.253 na repeticao final jqLite, lint e whitespace aprovados.


## Investigacao de itens publicos do NES

Resultados independentes, sem patches comerciais. Gerar core/sanitize/animate e
abrir `nes-audit.html`. Alem dos 11 checks SVG/debug, mede tres entradas adversas
em tamanhos 1.000/2.000/4.000, mediana de tres amostras apos aquecimento, Chrome 154.
Snapshot anterior salvo antes das alteracoes; fontes de ambos os builds iguais
exceto pelas correcoes desta rodada.

| Carga de tamanho 4.000 | Antes | Depois |
| --- | ---: | ---: |
| linky, letras sem @ | 10,0 ms | 0,6 ms |
| annotate, marcadores /*a sem fechamento em string | 62,8 ms | cerca de 0,1 ms |
| compile, espacos antes de valor multiline em comentario | 6,7 ms | abaixo de cerca de 0,1 ms |

O texto permanece sem links; a dependencia inferida permanece a mesma e o
comentario multiline continua invalido. Os resultados representam casos de
crescimento excessivo, nao velocidade de templates comuns. Valores perto da
resolucao do relogio nao devem ser usados para calcular fatores de aceleracao.
Nao medir criacao de funcao no tempo de annotate; remover $inject antes de cada
amostra para impedir que o cache esconda o custo da inferencia.

100.000 entradas diferenciais confirmaram links/posicoes/tipos, texto sem
comentarios e matches/grupos de diretivas. Suites finais: 26.621 testes aprovados.
Nenhuma medicao de heap foi feita nesta rodada. Detalhes, fontes, compatibilidade
SVG e itens sem mudanca em [FORK-MAINTENANCE.md](../FORK-MAINTENANCE.md).

## Retencao no ciclo de vida (2026-10-06)

`lifecycle-memory-audit.html` mede heap apos GC explicito no Chrome 154.
Comparacao com o build anterior, em processos separados; valores em bytes:

| Cenario | Antes | Depois |
| --- | ---: | ---: |
| Template rejeitado, 500 scopes destruidos com 5.000 valores cada | 10.364.952 | 171.032 |
| Ultimo watcher, scope destruido com 1.000.000 valores | 4.045.862 | 45.470 |

O primeiro modo mantem a funcao de link viva para detectar a fila retida apos
falha. O segundo mantem o injector vivo, sem executar outro digest antes da
medicao. Os deltas incluem infraestrutura, e variam entre execucoes; nao sao
estimativas de economia para toda aplicacao. O campo `afterRelease` remove a
referencia explicita ao link e executa outro digest, sem garantir que outras
referencias internas ao compilador sejam liberadas.

Filas rejeitadas agora sao liberadas antes de reportar o erro. Clones posteriores
continuam sem link; scopes e DOM nao sao destruidos automaticamente. O ultimo
watcher e liberado apenas ao terminar o digest ou atingir o limite de iteracoes,
preservando a otimização de curto-circuito durante a travessia.

Achado separado identificado nesta rodada: destruir o proprio scope em seu
listener pode causar TypeError na travessia quando o parent ja foi limpo.
Corrigido na rodada de travessia abaixo.

Validacao desta rodada: 26.645 execucoes aprovadas nas suites jqLite, jQuery,
modulos, ngAnimate e ngMock; ESLint dos arquivos alterados e git diff --check.

## Digest com destruicao durante a travessia (2026-10-06)

A continuacao fora do subtree destruido e salva antes de limpar seus vinculos.
Isso permite destruir o scope ativo ou um ancestral, inclusive em getters e
descendentes isolados. Watchers restantes do subtree destruido sao ignorados;
scopes sobreviventes continuam e as alteracoes do evento de destruicao sao
estabilizadas, incluindo scopes novos. Cleanup continua sincrono.

Um contexto e alocado por digest, reutilizado entre scopes e removido ao limpar
a fase; nao ha debounce nem mudanca de agendamento. Regressões cobrem alvo do
digest, getter/listener, ancestral isolado, criacao de scopes e destruicao da
continuacao salva pelo evento $destroy.

Auditoria existente, Chrome 154, sete amostras: 50.000 watchers estaveis tiveram
medianas de 0,182 ms antes e 0,181 ms depois; ngRepeat com 1.000 linhas e bindings
ativos, 0,066 -> 0,064 ms. Outros cenarios variaram, sem demonstrar ganho geral
no digest; esta e uma correcao de estabilidade com verificacoes adicionais.

Validacao conjunta: 26.689 execucoes aprovadas, mais nova execucao das suites de
modulos apos ajuste no teste de drenagem de frames. Lint dos arquivos alterados
e whitespace aprovados.
