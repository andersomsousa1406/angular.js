# Rodada 10: tabela, propriedades CSP e normalização

As três frentes propostas foram implementadas e testadas. A tabela foi
alterada somente na cópia privada do laboratório; os arquivos de produção
continuam sem alterações. As melhorias do core estão nos commits `3992f2295`
e `e4fa3fee9`. O patch da tabela e sua avaliação estão em `622583c66` e
`TABLE-DATE-AUDIT.md`.

## Alterações e compatibilidade

- Tabela: caminho direto para datas primitivas `YYYY-MM-DD`, evitando o array
  intermediário de separação. Valores de outros formatos mantêm a conversão
  anterior, sem cache de conteúdo. O resultado foi comparado em 80 casos.
- `$parse`: o interpretador CSP escolhe uma função de leitura sem as condições
  de criação de caminho e metadados de contexto quando elas são desnecessárias.
  Getters continuam sendo chamados, com o mesmo número de leituras; locais,
  intermediários nulos, receivers e atribuição são preservados. O parser que
  gera JavaScript não foi alterado por essa melhoria.
- `$compile`: nomes sem separadores retornam diretamente; o prefixo só é
  removido quando o primeiro caractere pode iniciar `x` ou `data`. A função
  de substituição de separadores é compartilhada. Não há cache de diretivas.

Debug e `element.scope()` permanecem habilitados. A frequência dos digests
não foi alterada. Build, ESLint e 26.910 execuções unitárias passaram.

## Medições isoladas

Chrome 154 / Windows, quatro pares alternando versões, mediana de 15 amostras
após aquecimento. Cada linha do core usa 100.000 operações, exceto compilação
com 1.000. Medidas da tabela e suas limitações estão no relatório próprio.
São medianas das quatro medianas, comparando a candidata com o fork anterior,
nunca uma estimativa da velocidade total do sistema.

| Core | Antes | Depois | Redução de tempo |
| --- | ---: | ---: | ---: |
| Cadeia de propriedades CSP | 3,85 ms | 3,15 ms | 18,2% |
| Cadeia com chamada de método CSP | 10,00 ms | 6,55 ms | 34,5% |
| Normalizar nomes sem separadores | 9,85 ms | 2,30 ms | 76,6% |
| Normalizar nomes com hífen/prefixo | 34,00 ms | 34,50 ms | -1,5% |
| Compilar fixture de atributos simples | 14,20 ms | 13,30 ms | 6,3% |

Nomes com separadores mantiveram distribuições sobrepostas. A primeira
normalização candidata os tornou mais lentos e foi ajustada para evitar
remoções de prefixo impossíveis. A tabela melhorou 22% em datas padronizadas
e 15% em timestamps, com custo adicional de aproximadamente 4% em datas
alternativas. O patch da tabela não deve ser descrito como ganho universal.

## Componentes nas três versões

Os arquivos minificados foram gerados com `grunt minall` e copiados para o
laboratório após os commits do core. O fork carregado é exatamente
`1.8.5-local+sha.e4fa3fee9`, build de desenvolvimento após a release 1.8.4.
O teste exige essa identificação exata. A release publicada não foi alterada.

Quatro trios alternados, mesmos componentes candidatos, dados falsos e módulos.
Antes da rodada medida: 5.000 digests de aquecimento e um `runBenchmark()`
completo em cada versão. A versão minificada antiga e a rodada cujo teste
ainda esperava `1.8.4` não foram usadas nos resultados publicados abaixo.
As medições anteriores do projeto têm um protocolo de aquecimento diferente
e não constituem uma comparação direta antes/depois desta rodada.

| Cenário | 1.6.9 | 1.8.3 oficial | Fork atual |
| --- | ---: | ---: | ---: |
| HTML da tabela, 30 chamadas | 0,50 ms | 0,40 ms | 0,65 ms |
| 100 digests estáveis | 11,40 ms | 11,00 ms | 11,45 ms |
| 100 digests com 500 watchers extras | 31,65 ms | 30,50 ms | 32,05 ms |
| Recompilação incluindo espera fixa | 57,05 ms | 58,50 ms | 57,00 ms |
| Heap retido após GC | 8,36 MiB | 8,42 MiB | 8,47 MiB |

Passaram 53 de 53 checks em cada versão: 159 no total, snapshots iguais e
nenhum erro capturado. Watchers permaneceram em 799 antes/depois em todas
as rodadas, assim como os eventos globais. A página dos três painéis também
passou 159 checks após carregar o helper real `findNextField`, necessário
para navegação entre campos no teste manual e copiado apenas para o laboratório.

Os resultados da aplicação continuam mistos. Não há evidência de uma vitória
geral, de redução do heap total ou de uma aceleração grande da tela inteira.
O CSP não é o modo padrão desse projeto; seu ganho isolado não acelera os
digests do parser gerado. A recompilação contém espera de 30 ms e não é uma
medida de CPU puro. Houve variação entre rodadas; diferenças pequenas não
devem ser apresentadas como ganhos garantidos.

## Reprodução e evidência

Para o core, antes das alterações preserve `build/angular.js` em
`integration-lab/core-round10/baseline.js`. Após compilar, copie a candidata
para `candidate.js` e `core-round10-audit.html` para `case.html` nessa pasta.
Execute `node benchmarks/core-round10-audit.js` com servidor local 8767 e
Chrome CDP 9229. Preserve os resultados em `core-round10-audit-results.json`.

O runner da tabela está em `table-date-audit.js`. Para o projeto, o runner
privado `integration-lab/run-three-versions.js` executa a comparação aquecida.
`node benchmarks/summarize-round10-audit.js` gera
`round10-audit-summary.json`, incluindo hashes dos arquivos efetivamente usados,
versões, métricas, contagens e checks. Os componentes completos, fixtures e
perfis privados ficam na pasta ignorada pelo Git.

A tela manual está em `http://127.0.0.1:8767/index.html`, com três painéis e
requisições simuladas. Nenhuma API de produção é usada.
