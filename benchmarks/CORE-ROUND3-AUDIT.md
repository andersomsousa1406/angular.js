# Selecao multiple, interpolacao e eventos jqLite

Auditoria de 2026-10-06. Os caminhos de digest e debug permanecem iguais.
Os componentes externos do sistema nao foram modificados nesta rodada.

## Escopo e compatibilidade

- ngOptions: com pelo menos 64 opcoes e 16 entradas selecionadas, construir
  um indice temporario de opcoes, depois da avaliacao completa do modelo.
  A comparacao continua sendo por identidade. Entradas ausentes sao ignoradas,
  duplicatas sao preservadas e colisoes entre chaves de opcoes diferentes usam
  a busca anterior. Mapa sem prototipo aceita chaves como __proto__. Chaves que
  nao sao strings/numeros e selecoes pequenas mantem a busca anterior.
  O indice acrescenta memoria temporaria; nao e uma reducao de heap demonstrada.
- Interpolacao direta: duas expressoes sem contexto privilegiado usam valores
  locais e tres trechos literais preparados durante a compilacao. As duas
  expressoes sao avaliadas em ordem, mesmo quando a primeira esta indefinida.
  Se ambas sao strings, nao criar array de valores nem executar join.
  Outros tipos e contextos SCE continuam com compute. O watcher nao mudou.
  Testes verificam reentrancia e avaliacao da segunda expressao com allOrNothing.
- Eventos nativos jqLite: com 32 ou mais listeners, a lista permanece estavel
  durante o dispatch. on/off clonam listas ativas antes de modifica-las.
  Disparos reentrantes podem observar a nova lista; o disparo externo conserva
  a anterior. Um contador e finally garantem liberacao mesmo apos excecoes.
  O wrapper de mouse acompanha a copia. Listas pequenas continuam com snapshot.
  triggerHandler manteve snapshot apos a variante compartilhada medir mais
  tempo. Esse mecanismo nao e utilizado quando Angular integra com jQuery.

## Reproducao

Em uma pasta temporaria ignorada, colocar baseline.js (build anterior aos tres
ajustes), candidate.js (build atual) e uma copia de core-round3-audit.html.
Servir por HTTP. Abrir uma instancia dedicada do Chrome com remote debugging.
Definir AUDIT_BASE_URL para o HTML sem query, CDP_PORT (padrao 9229) e
AUDIT_OUTPUT (padrao tmp/core-round3-results.json, em uma pasta existente).
Executar node benchmarks/core-round3-audit.js. O runner reutiliza o comparador
de core-next-audit.js, espera carregamento, desativa cache e alterna quatro
pares. Executar sem build/testes concorrentes.

Quinze amostras por caso, com aquecimento de cinco lotes. Selecao alterna duas
metades de 32 ou 1.000 opcoes: 1.000 ou 100 escritas por amostra. Interpolacao
mede 500.000 avaliacoes diretas. Eventos medem 10.000 disparos por amostra,
com 2, 8 ou 64 listeners, em eventos nativos e triggerHandler. Os resultados
de selecao, strings e contagens completas de callbacks sao comparados entre
as oito execucoes. Nenhum resultado representa o tempo de uma tela completa.

Build, 26.806 execucoes unitarias e lint do core aprovados, incluindo o teste
de wrapper mouseenter apos clonagem de listeners ativos. Nenhuma economia numerica
de heap foi medida. Interpolacao e dispatch nativo grande evitam alocacoes
de arrays nos caminhos especificados; isso nao implica menor memoria total.

## Resultados

Mediana das quatro medianas, em ms. Reducao negativa significa tempo maior.

| Caso | Antes | Depois | Reducao de tempo |
| --- | ---: | ---: | ---: |
| selection32 | 23,10 | 22,05 | 4,5% |
| selection1000 | 93,20 | 75,75 | 18,7% |
| interpolation0 | 30,95 | 30,60 | 1,1% |
| interpolation1 | 146,55 | 80,10 | 45,3% |
| interpolation2 | 173,80 | 165,95 | 4,5% |
| nativeEvents2 | 29,10 | 26,25 | 9,8% |
| triggerEvents2 | 2,50 | 2,50 | 0,0% |
| nativeEvents8 | 30,05 | 27,95 | 7,0% |
| triggerEvents8 | 6,60 | 6,15 | 6,8% |
| nativeEvents64 | 48,40 | 41,15 | 15,0% |
| triggerEvents64 | 40,35 | 39,35 | 2,5% |

Saidas iguais nas oito execucoes. Cada disparo nativo cria um Event novo.
Controles de um/tres bindings, selecao pequena e eventos com 2/8 listeners
nao recebem os atalhos; seus tempos variaram entre rodadas. Nao extrapolar
para rendering, digests ou todas as telas. Medianas por rodada registradas
em core-round3-audit-results.json.
