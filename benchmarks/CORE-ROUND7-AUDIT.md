# Parametros HTTP, statements CSP e grupos pequenos

Auditoria de 2026-10-06. Baseline: commit 95b5fcdb2, build nao minificado.
Candidate: as tres alteracoes descritas abaixo, mesmo tipo de build.

## Alteracoes e compatibilidade

- $httpParamSerializer: guardar a chave codificada na primeira entrada de cada
  array, reutilizando-a nas seguintes. Chaves de forEachSorted sao strings.
  Codificacao continua lazy: arrays vazios e sem entradas presentes nao codificam
  a chave, inclusive quando ela contem surrogate invalido. Manter ordem, arrays
  esparsos, datas/objetos, codificacao de valores e comportamento escalar.
  Teste cobre chave especial, array esparso e conversao de objeto reentrante.
  Nenhum cache persistente foi adicionado; armazenamento local por propriedade.
- $parse CSP: avaliar a lista privada de statements com loop em vez de criar
  callback de forEach a cada chamada. Invocar cada funcao por variavel local para
  preservar chamada sem receptor, ordem, locals e ultimo resultado. Teste nos
  dois modos verifica reentrada e interrupcao imediata depois de excecao.
  Caminho com uma expressao e compilador sem CSP permanecem iguais.
- $watchGroup: alocar oldValues depois do retorno para grupo vazio e
  deregisterFns depois do retorno para grupo de uma expressao. Evita dois arrays
  no grupo vazio e um no grupo unitario. Arrays entregues ao listener permanecem
  reutilizados e observaveis como antes. Teste cobre cancelamento do callback
  vazio, valores antigos, identidade dos arrays e cancelamento do watcher.
  Agendamento de evalAsync/digest e grupos maiores continuam iguais.

## Procedimento

Copiar build/angular.js anterior para integration-lab/core-round7/baseline.js,
compilar alteracoes e copiar novo build para candidate.js. Copiar o harness
core-round7-audit.html para case.html nesse diretorio ignorado pelo Git.
Servidor HTTP na porta 8767 e Chrome com CDP 9229. Executar
node benchmarks/core-round7-audit.js. AUDIT_BASE_URL, AUDIT_OUTPUT e CDP_PORT
permitem outros enderecos. A pagina usa ng-csp="no-unsafe-eval" para avaliar
o interpretador CSP; nao expor helpers privados em nenhuma biblioteca.

Quatro pares alternados, cinco lotes de aquecimento e 15 amostras por caso.
Resumo usa mediana das quatro medianas; rodada sem suite concorrente.
Serializer escalar, array unitario, parser com uma expressao e grupo de tres
expressoes sao controles. Grupos vazios usam lotes de 100 registros cancelados
seguidos por digest; outros tamanhos medem registro/cancelamento sem digest.
Nao comparar os tempos entre tamanhos como se fossem o mesmo trabalho.
Saidas diferenciais incluem queries, parser com locals e identidade/conteudo
dos arrays e contagem final de watchers. Todas as amostras ficam no arquivo
ignorado tmp/core-round7-results.json; resumo versionado no JSON desta auditoria.

## Validacao e limites

Build completo, lint e 26.854 execucoes unitarias aprovados. Nao medir reducao
numerica de heap ou ganho total de tela; alocacoes evitadas sao identificadas no
codigo. Otimizacao CSP beneficia apenas aplicacoes que usam esse modo.

## Resultados

| Caso | Trabalho por amostra | Antes (ms) | Depois (ms) | Menos tempo |
| --- | ---: | ---: | ---: | ---: |
| Serializer, array de 1 valor | 1.000 chamadas | 1,45 | 1,10 | 24,1% |
| Serializer, array de 10 valores | 1.000 chamadas | 9,60 | 5,05 | 47,4% |
| Serializer, array de 100 valores | 1.000 chamadas | 94,60 | 44,30 | 53,2% |
| Serializer escalar, controle | 1.000 chamadas | 0,90 | 0,90 | 0% |
| CSP, tres statements | 200.000 chamadas | 21,50 | 16,55 | 23,0% |
| CSP, uma expressao, controle | 200.000 chamadas | 1,10 | 1,10 | 0% |
| watchGroup vazio | 20.000 registros cancelados e 200 digests | 1,45 | 1,10 | 24,1% |
| watchGroup unitario | 10.000 registros cancelados | 0,75 | 0,80 | -6,7% |
| watchGroup de tres, controle | 10.000 registros cancelados | 3,35 | 3,30 | 1,5% |

Saidas diferenciais iguais nas oito execucoes. Array unitario do serializer teve
outliers em ambas versoes: nao atribuir seu resultado a codificacao evitada,
pois existe apenas uma codificacao por chave nesse caso. Grupo unitario nao
mostrou ganho consistente de velocidade; mantido por evitar um array conhecido.
Tempos pequenos sofrem com resolucao do timer/JIT/GC. Os numeros de grupos medem
registro/cancelamento, nao digests normais de uma aplicacao. Chave HTTP usada
contem espacos e caracteres especiais; ganhos podem variar com outros dados.
