# Filter, orderBy e interpretador CSP

Auditoria de 2026-10-06. As alteracoes iniciais foram registradas no commit
ce8caff66 durante a validacao. O ajuste posterior do caminho sem argumentos
do CSP e registrado separadamente; o commit existente foi preservado.

## Regras preservadas

- `filter`: o cache da ultima expectativa normalizada vive apenas na funcao
  de comparacao de uma chamada do filtro. Aceita apenas strings;
  criterios diferentes invalidam o valor anterior. Objetos e funcoes nao sao
  normalizados antecipadamente. A conversao de actual acontece primeiro,
  preservando efeitos de toString e getters dos criterios. Comparadores
  personalizados e comparacao por igualdade continuam no caminho anterior.
- `orderBy`: o vetor de valores de criterios continua novo para cada item.
  Um loop substitui o callback de map nesse vetor, mantendo ordem de avaliacao,
  slots ausentes e presentes herdados. Comparadores, desempates, reverse e
  tratamento de um criterio nao foram alterados. Nao reutilizar vetores entre
  itens: eles sao necessarios durante a ordenacao.
- CSP: chamadas com dois argumentos constroem um array literal novo em ordem,
  evitando o loop e os push. Chamadas sem argumentos usam um caminho selecionado
  na preparacao da expressao e continuam passando um array vazio novo ao apply.
  Chamadas com outras quantidades de argumentos mantem o caminho original.
  Receiver, apply personalizado, argumentos reentrantes e excecoes continuam
  preservados. O compilador que utiliza new Function nao foi modificado.

Essas mudancas nao desativam debug, nao agrupam digests e nao alteram os
componentes externos do sistema.

## Reproducao

Copiar core-next-audit.html para uma pasta temporaria ignorada junto de
baseline.js (build anterior aos tres ajustes) e candidate.js (build atual).
Servir por HTTP. Usar um perfil dedicado do Chrome com remote debugging.
O HTML ativa ng-csp="no-unsafe-eval" em ambas as variantes.

Definir AUDIT_BASE_URL para o HTML sem query; CDP_PORT tem padrao 9229.
Definir AUDIT_OUTPUT para um JSON em uma pasta existente, ou utilizar
tmp/core-next-results.json. Executar node benchmarks/core-next-audit.js.
O runner navega a primeira pagina da instancia, desativa cache e alterna a
ordem das variantes em quatro pares. Executar sem testes ou build concorrentes.

Cada caso tem aquecimento de cinco lotes e 15 amostras. Ha 5.000 registros:
30 filtragens por amostra, 20 ordenacoes por texto ou 50 por tres predicados
numericos. CSP mede 200.000 avaliacoes por amostra, com 0, 1, 2 ou 8 argumentos
e uma chamada de filtro. As listas completas de IDs filtrados e ordenados,
alem dos resultados CSP, sao comparadas entre as oito execucoes.

Os resultados abaixo sao medianas das quatro medianas, em milissegundos.
Nao representam latencia de uma tela completa. O controle de um criterio
nao recebe a alteracao de orderBy e ajuda a observar variacao de timing/JIT.
Nao foi medida reducao de heap; evitar callbacks e crescimento de arrays
nao demonstra, sozinho, economia de memoria total da aplicacao.

| Cenario | Antes (ms) | Depois (ms) | Reducao de tempo |
| --- | ---: | ---: | ---: |
| 30 buscas por texto | 92,95 | 76,15 | 18,1% |
| 30 buscas por campo | 34,85 | 33,15 | 4,9% |
| 30 buscas com negacao | 98,85 | 90,85 | 8,1% |
| 20 ordenacoes por tres criterios de texto | 230,20 | 221,55 | 3,8% |
| 50 ordenacoes por tres criterios numericos | 66,45 | 61,05 | 8,1% |
| 20 ordenacoes por um criterio (controle) | 36,00 | 35,35 | 1,8% |
| CSP: zero argumentos | 9,40 | 8,90 | 5,3% |
| CSP: um argumento (controle) | 30,50 | 31,95 | -4,8% |
| CSP: dois argumentos | 37,00 | 26,65 | 28,0% |
| CSP: oito argumentos (controle) | 80,10 | 86,75 | -8,3% |
| CSP: filtro com dois argumentos | 45,60 | 30,55 | 33,0% |

Saidas completas iguais nas oito execucoes. Controles CSP com um e oito
argumentos ficaram mais lentos apesar de manterem o caminho anterior; isso
limita a conclusao a zero/dois argumentos e impede afirmar ganho geral no CSP.
A pre-alocacao generica de argumentos foi descartada apos medir resultados
mistos. Estes dados nao medem CSP versus compilacao por new Function.

Build e todas as 26.786 execucoes unitarias passaram, incluindo os testes de
getters mutaveis do filtro, ordenacao reentrante, ordem de argumentos e
apply personalizado. Assertions adicionais para os arrays de zero/dois
argumentos passaram em mais 6.317 testes jqLite. Lint do core e runner Node
aprovado. Medianas de cada rodada em core-next-audit-results.json.
