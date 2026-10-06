# Numeros, tokens de classes e query strings

Auditoria de 2026-10-06. Build, 26.826 execucoes unitarias e lint do core
passaram. Debug, agendamento de digest e componentes externos permanecem iguais.

## Escopo

- number/currency: percorrer os digitos internos diretamente para propagacao
  do carry e deteccao de zero, mantendo a ordem e operacoes aritmeticas do
  arredondamento. O buffer de decimais nao recebe um array vazio que seria
  substituido imediatamente. Grupos inteiros sao adicionados com push e
  invertidos antes do join, conservando as leituras de gSize/lgSize e seus
  casos incomuns. Arrays de grupos e splice ainda existem; nao afirmar sua
  eliminacao. Teste verifica getters de agrupamento e lgSize zero. A suite
  existente cobre arredondamento, negativos, infinito e formatos de locale.
- tokenDifference: para strings, ao menos 16 tokens na segunda lista e
  produto dos comprimentos de pelo menos 1.024, criar um indice sem prototipo.
  A primeira lista continua determinando ordem e duplicatas. Espacos e tokens
  vazios conservam o resultado anterior. Listas pequenas mantem o loop antigo.
  O indice aumenta memoria temporaria; nao afirmar reducao de heap nesse item.
- parseKeyValue: consultas strings sem + sao lidas por posicoes, evitando o
  array de split e as substituicoes por regex. Com + ou em chamadas legadas
  nao-string, manter split/forEach e conversao de + anterior. A tentativa de
  usar cursor em todas as consultas nao mostrou ganho consistente e foi
  refinada para esse caminho especifico. Flags, vazios, pares repetidos,
  escapes invalidos e valores com = conservam a ordem e tipos anteriores.

Nenhuma economia numerica de heap foi medida. Mudancas de arrays/callbacks
no codigo nao demonstram memoria total menor no sistema.

## Reproducao

Usar um perfil dedicado do Chrome com remote debugging e um servidor HTTP.
Em uma pasta temporaria ignorada, copiar core-round5-audit.html, baseline.js
(build anterior aos tres ajustes) e candidate.js (build atual).

Para medir os dois helpers privados isoladamente, em AMBOS os builds de teste,
inserir as seguintes linhas imediatamente apos publishExternalAPI(angular):

```js
angular.$$auditTokenDifference = tokenDifference;
angular.$$auditParseKeyValue = parseKeyValue;
```

Essas exposicoes existem apenas nas copias do laboratorio, nao no source nem
no build normal. Os corpos dos helpers nao recebem instrumentacao de timing.
Definir AUDIT_BASE_URL para o HTML sem query, CDP_PORT (padrao 9229) e
AUDIT_OUTPUT (padrao tmp/core-round5-results.json, em uma pasta existente).
Executar node benchmarks/core-round5-audit.js. Ele reutiliza core-next-audit.js,
espera carregamento, desativa cache e alterna quatro pares com 15 amostras e
aquecimento de cinco lotes. Executar sem build/testes concorrentes.

Numeros: 50.000 chamadas por amostra, variando o valor. Tokens: 10.000 chamadas
com quatro tokens ou 1.000 com 100 tokens. URLs: 10.000 parses de tres campos
ou 1.000 de 100 campos, separando valores com + de valores com %20.
Comparacao inclui 4.120 resultados numericos, seis resultados com agrupamento
alterado, classes com espacos e consultas repetidas/vazias/invalidas.

Os resultados sao medianas das quatro medianas, em ms. Nao extrapolar para
rendering, tempo de requisicoes ou latencia de uma tela completa.

| Caso | Antes | Depois | Reducao de tempo |
| --- | ---: | ---: | ---: |
| numberSmall | 62,50 | 58,85 | 5,8% |
| numberLarge | 125,95 | 116,55 | 7,5% |
| currency | 115,55 | 107,20 | 7,2% |
| tokens4 | 9,65 | 9,55 | 1,0% |
| tokens100 | 68,65 | 40,40 | 41,2% |
| query3Plain | 42,60 | 33,80 | 20,7% |
| query3Plus | 50,45 | 46,30 | 8,2% |
| query100Plain | 144,30 | 127,75 | 11,5% |
| query100Plus | 166,10 | 164,95 | 0,7% |

Saidas comparadas iguais nas oito execucoes. Controles com quatro tokens e
consultas com + tiveram tempos mistos. Nao atribuir toda variacao ao atalho.
Medianas de cada rodada em core-round5-audit-results.json.
