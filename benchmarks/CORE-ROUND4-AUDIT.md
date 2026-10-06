# Datas, fila core de classes e validacao ngModel

Auditoria de 2026-10-06. Build, 26.814 execucoes unitarias e lint do core/runner
passaram. As oito execucoes do comparador tiveram todas as saidas iguais.

## Alteracoes e limites

- date: o array local de tokens recebe apenas match[1], e match[2] fornece o
  restante do formato. Elimina slice/concat/pop que recopiavam tokens em cada
  etapa. Resolucao dinamica de locale, alias, timezone e renderizacao continuam
  iguais. Foram comparados 444 casos de formatos/datas/timezones e um alias
  de locale alterado entre chamadas. A suite existente cobre datas invalidas.
- Fila core: postDigestElements recebe uma entrada para cada elemento pendente
  em postDigestQueue. Classes continuam combinadas em ordem e o elemento pode
  voltar a fila depois do flush. Teste cobre dois elementos intercalados e
  ciclos sucessivos. Esse caminho e o padrao sem o modulo ngAnimate, que usa
  uma implementacao distinta de fila.
- ngModel: validatorPromises nasce somente depois de encontrar uma promise
  valida e definir o estado pending. A iteracao de asyncValidators continua
  igual; nao antecipar conclusoes pela contagem de validadores. Nenhum
  validador assincrono: a conclusao continua sincrona; validadores presentes
  conservam $q.all, ordem, pending e controle de execucoes obsoletas. Teste
  cobre adicionar um async em um sync e remover o async apos sua conclusao.

Nao houve alteracao no debug, agendamento de digest ou componentes externos.
Nao foi medida economia numerica de heap. O codigo evita arrays temporarios
por token de formato, referencias duplicadas na fila pendente e um array vazio
por validacao sem async; isso nao demonstra reducao de memoria total da tela.

## Reproducao

Copiar core-round4-audit.html para uma pasta temporaria ignorada junto de
baseline.js (build anterior aos tres ajustes) e candidate.js (build atual).
Servir por HTTP. Abrir um perfil dedicado de Chrome com remote debugging.
Definir AUDIT_BASE_URL para o HTML sem query, CDP_PORT (padrao 9229) e
AUDIT_OUTPUT (padrao tmp/core-round4-results.json, pasta existente).
Executar node benchmarks/core-round4-audit.js. Esse wrapper reutiliza o runner
core-next-audit.js: espera carregamento, desativa cache, aquece cinco lotes
e mede 15 amostras em quatro pares de ordem alternada. Executar isoladamente.

O injector do benchmark usa um $$AnimateRunner simulado, identico em ambos os
builds, para isolar o agrupamento das classes e evitar acumular finalizacoes
pendentes enquanto a medicao sincrona bloqueia o event loop. Nao mede runners
reais, duracao de animacoes nem rendering. Os testes completos usam runners
normais e cobrem seu comportamento. O caso async de ngModel tambem pode receber
efeitos da fila de classes; nao atribuir sua variacao apenas ao array lazy.

Datas: 10.000 formatacoes por amostra, usando timezone +0300. Classes: 1.000
lotes pequenos ou 100 lotes de 500 pares add/remove e um add final, cada lote
seguido de digest. Validacao: 50.000 rodadas sync ou 1.000 rodadas async com
digest. Comparacao inclui resultados de datas, classes finais, contagens de
callbacks, validade e ausencia de pending apos conclusao.

As tabelas usam medianas das quatro medianas, em ms. Nao extrapolar os
percentuais para latencia de uma tela completa. Medianas de cada rodada em
core-round4-audit-results.json.

| Caso | Antes | Depois | Reducao de tempo |
| --- | ---: | ---: | ---: |
| date yyyy-MM-dd | 64,50 | 41,65 | 35,4% |
| date formato longo | 198,20 | 121,30 | 38,8% |
| date mediumDate | 70,80 | 44,40 | 37,3% |
| classes: lote pequeno | 9,35 | 8,25 | 11,8% |
| classes: 500 pares por lote | 31,95 | 21,90 | 31,5% |
| ngModel: sync | 99,45 | 94,30 | 5,2% |
| ngModel: async | 33,10 | 31,00 | 6,3% |
