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
