# Grafos copiados, filtros aninhados e race

Auditoria de 2026-10-06. Baseline: commit 29c70e423, build nao minificado.
Candidate: as tres alteracoes abaixo, mesmo tipo de build.

## Alteracoes e compatibilidade

- angular.copy: depois de 128 objetos registrados e quando window.WeakMap esta
  disponivel, migrar pares source/destination para indice por identidade. Limpar
  as listas anteriores e registrar novos pares no mapa antes da recursao.
  Copias pequenas e browsers sem WeakMap usam indexOf original. Sem cache global.
  Teste cobre grafo de 200 itens, ciclos, aliases, destino fornecido, hashKey,
  limite de profundidade e fallback sem WeakMap. Suite existente cobre tipos
  especiais, prototypes, getters, buffers e erros para Window/Scope.
- filter: usar loop para some padrao capturado ao carregar a biblioteca.
  Capturar length uma vez e usar i in actual para preservar holes, entradas
  herdadas e mutacao durante a iteracao. Encerrar no primeiro match. Metodos
  some personalizados conservam callback e receptor; ler o metodo uma vez,
  sem invocar uma propriedade call personalizada do metodo.
  Testes cobrem arrays esparsos, mutacao, early match e getter de some custom.
- $q.race: criar diretamente Promise e dois callbacks de settlement. Evitar
  objeto Deferred e callback notify nao utilizados. when/then, iteracao e
  agendamento permanecem iguais. Teste cobre valor simples com settlement
  assincrono e thenable que tenta resolver/rejeitar. Suite existente cobre arrays,
  hashes, vazio, rejeicoes e settlement tardio. Promises por entrada continuam.

## Procedimento

Copiar build/angular.js anterior para integration-lab/core-round8/baseline.js,
compilar e copiar build novo para candidate.js. Copiar core-round8-audit.html
para case.html nesse diretorio ignorado. Servidor HTTP na porta 8767 e Chrome
com CDP 9229. Executar node benchmarks/core-round8-audit.js. AUDIT_BASE_URL,
AUDIT_OUTPUT e CDP_PORT permitem outros enderecos. Nao expor helpers privados.

Quatro pares alternados, cinco lotes de aquecimento e 15 amostras por caso.
Resumo usa mediana das quatro medianas, sem suite concorrente. Copia inclui
objetos distintos com ciclo na raiz e referencias compartilhadas. Filtro usa
100 entradas com tres niveis de arrays e cinco strings, com match final ou
ausente. RaceValues inclui digest por operacao; RaceEmpty mede criacao isolada.
Saidas diferenciais incluem identidades/ciclos/hashKey, contagens filtradas e
settlement de race. Amostras completas em tmp/core-round8-results.json; resumo
versionado em core-round8-audit-results.json.

## Validacao e limites

Build, lint e 26.870 execucoes unitarias aprovados. Saidas iguais nas
oito execucoes. Sem medicao numerica de heap ou ganho total de tela. WeakMap
tem overhead proprio; eliminar buscas lineares nao demonstra economia de heap.
Filtro evita callbacks apenas no caminho some padrao. Race evita um objeto e
um callback conhecidos; nao elimina a maquinaria das promises por entrada.

## Resultados

| Caso | Operacoes por amostra | Antes (ms) | Depois (ms) | Menos tempo |
| --- | ---: | ---: | ---: | ---: |
| Copia, 16 objetos | 1.000 | 8,00 | 8,20 | -2,5% |
| Copia, 256 objetos | 100 | 12,70 | 12,80 | -0,8% |
| Copia, 2.000 objetos | 20 | 32,70 | 20,50 | 37,3% |
| Filtro aninhado, match final | 1.000 | 72,75 | 64,00 | 12,0% |
| Filtro aninhado, sem match | 1.000 | 63,50 | 52,65 | 17,1% |
| Filtro plano, controle | 1.000 | 14,75 | 14,40 | 2,4% |
| race vazio | 50.000 | 4,75 | 3,80 | 20,0% |
| race com valores e digest | 1.000 | 8,25 | 8,75 | -6,1% |

Controle com 16 objetos nao usa WeakMap. Copias pequenas e 256 objetos nao
demonstraram ganho. O ganho pequeno do filtro plano tambem
indica variacao fora do caminho aninhado. Race com valores nao mostrou ganho
consistente de velocidade e ficou 6,1% mais lento nesta rodada; a reducao conhecida
de estruturas foi mantida. Nao apresentar race como ganho universal de velocidade.
