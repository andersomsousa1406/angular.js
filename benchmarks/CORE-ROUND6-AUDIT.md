# Interpolacao observada, orderBy e ngRepeat

Auditoria de 2026-10-06. Baseline: commit 9885813c9, build nao minificado.
Candidate: as tres alteracoes descritas abaixo, no mesmo tipo de build.

## Alteracoes e compatibilidade

- Interpolacao: compute concatena diretamente prefixo, duas strings, separador
  e sufixo em contexto sem trustedContext. O caminho de watchers tambem usa
  esse helper. Valores nao-string, allOrNothing e contextos SCE conservam o
  caminho existente. Teste cobre transicoes string/undefined/numero e valor antigo.
- orderBy: o comparador padrao usa o indice numerico para desempate, evitando
  um objeto por item. Comparadores personalizados continuam recebendo os objetos
  value/type/index, com fallback estavel original. Teste verifica ambos, inclusive
  reverse e varios criterios. Nao alterar a lista recebida nem ordem de getters.
- ngRepeat: nao excluir blocos reutilizados do mapa anterior. Detectar duplicatas
  pelo mapa seguinte e remover apenas blocos ausentes nele. Uma falha deixa o
  mapa anterior intacto. Teste cobre recuperacao depois de duplicata reordenada,
  identidade de todos os blocos sobreviventes e remocao posterior. Suite existente
  cobre insercao, remocao, track by e animacoes. Mapas e array de ordem continuam
  sendo criados em cada atualizacao; nao afirmar sua eliminacao.

## Procedimento

Copiar build/angular.js anterior para integration-lab/core-round6/baseline.js,
compilar alteracoes e copiar build novo para candidate.js. Copiar este harness
core-round6-audit.html para case.html no mesmo diretorio ignorado pelo Git.
Usar servidor HTTP na porta 8767 e Chrome com CDP 9229. Executar
node benchmarks/core-round6-audit.js; variaveis AUDIT_BASE_URL, AUDIT_OUTPUT e
CDP_PORT permitem outros enderecos. Nenhum helper privado precisa ser exportado.

Quatro pares alternados baseline/candidate, cinco lotes de aquecimento e 15
amostras por caso. Resumo usa a mediana das quatro medianas. Rodada final sem
suite de testes concorrente. Comparacao automatica de outputs inclui resultados
de sorting padrao/personalizado, reverso e varios criterios, texto DOM e contagem
de watchers do ngRepeat depois de reordenacao/remocao e interpolacao observada.

## Validacao e limites

Build completo aprovado. 26.838 execucoes unitarias com SUCCESS e lint aprovado.
Debug e agendamento de digest preservados. Nao medir reducao numerica de heap;
apenas orderBy evita um objeto conhecido por item no caminho padrao. Resultados
nao demonstram ganho total no sistema, rede ou paint. Controles de interpolacao
estavel e sorting personalizado permitem observar variacao fora do caminho alvo.
Dados de todas as amostras e saidas ficam em tmp/core-round6-results.json.

## Resultados

Ver core-round6-audit-results.json para medianas por rodada e resumo final.

| Caso | Operacoes por amostra | Antes (ms) | Depois (ms) | Menos tempo |
| --- | ---: | ---: | ---: | ---: |
| Interpolacao, 1.000 watchers com mudancas | 100 digests | 27,45 | 23,55 | 14,2% |
| Interpolacao estavel, controle | 100 digests | 4,20 | 4,35 | -3,6% |
| orderBy, 1.000 itens, um criterio | 100 sorts | 14,60 | 14,40 | 1,4% |
| orderBy, dois criterios | 100 sorts | 26,00 | 26,45 | -1,7% |
| orderBy personalizado, controle | 100 sorts | 19,10 | 18,15 | 5,0% |
| ngRepeat, rotacao de 50 itens | 50 updates | 2,85 | 2,90 | -1,8% |
| ngRepeat, substituicao de 50 objetos | 50 updates | 0,55 | 0,50 | 9,1% |
| ngRepeat, rotacao de 500 itens | 50 updates | 36,05 | 35,25 | 2,2% |
| ngRepeat, substituicao de 500 objetos | 50 updates | 4,50 | 4,05 | 10,0% |

Saidas diferenciais iguais. orderBy nao demonstrou ganho consistente de tempo:
mantido pela eliminacao conhecida de objetos de desempate. Valores pequenos e
controles mostram ruido; nao atribuir o ganho do comparador customizado a essa
eliminacao, pois ele continua criando os objetos. Rotacao de listas tambem nao
demonstrou ganho consistente. Substituicao conserva IDs e reutiliza os nos DOM.
