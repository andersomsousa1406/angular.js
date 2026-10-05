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

Nenhuma otimização foi aplicada ao runtime nesta auditoria. A primeira melhoria interna
recomendada para um experimento é o registro de watchers, acompanhada de testes da
ordem e das mutações durante o digest e comparação com esses benchmarks.
