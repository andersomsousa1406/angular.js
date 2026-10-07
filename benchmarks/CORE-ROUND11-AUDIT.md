# Rodada 11: somente o core AngularJS

Nenhum componente foi editado, inclusive nas cópias do laboratório. O patch
da tabela da rodada anterior não foi ampliado ou reaplicado nesta rodada.
Os componentes serviram apenas para validar o minificado atualizado. Foram
comparados os hashes dos 75 arquivos privados antes/depois dessa validação;
todos permaneceram iguais. O hash da tabela também coincide com a rodada 10.

## Alterações mantidas

1. `3d399de7d`, `$parse`: criar a regex de escape de propriedades somente
   quando o identificador exige acesso por colchetes. Para nomes seguros,
   evita uma regex temporária antes desnecessária. O código do avaliador
   gerado é idêntico; nenhum valor ou resultado de getter foi memorizado.
2. `f36e82254`, vinculação: preservar os nós vinculados em um snapshot denso,
   na ordem de vinculação, antes de qualquer diretiva poder alterar os irmãos.
   Quando existe apenas uma entrada de vinculação, não criar snapshot.
3. `c99191bb7`, atributos/interpolação: reutilizar o nome já normalizado
   quando o atributo não foi reescrito e passar o nome do elemento já
   coletado para a preparação da interpolação. `ng-attr` e atributos `-start`
   continuam sendo normalizados novamente após a reescrita.

SCE, sanitização de URLs, restrições de eventos, aliases de atributos,
ordem das diretivas, observers e watchers foram preservados. Debug e
`element.scope()` continuam habilitados. Não houve debounce ou alteração
da frequência dos digests.

## Medição local

Chrome 154, quatro pares alternando a ordem, 15 amostras por cenário após
aquecimento de cinco vezes a quantidade de operações da amostra. A tabela
mostra medianas das quatro medianas. Os resultados completos incluem controles
de execução do parser e construção de interpolação que não foram alterados.

| Cenário | Antes | Depois | Redução de tempo |
| --- | ---: | ---: | ---: |
| Compilar 500 expressões em 20 injetores novos | 281,85 ms | 279,95 ms | 0,7% |
| Vincular 100 clones com 1 nó ligado entre 100 irmãos | 34,15 ms | 32,15 ms | 5,9% |
| Vincular 100 clones com 100 nós ligados | 64,35 ms | 64,80 ms | -0,7% |
| Compilar 1.000 fixtures com atributos interpolados | 59,65 ms | 54,95 ms | 7,9% |
| Vincular 1.000 fixtures com atributos interpolados | 31,50 ms | 31,10 ms | 1,3% |

Não houve ganho relevante confirmado na compilação do parser, na vinculação
densa ou na vinculação isolada de atributos. As diferenças pequenas se
sobrepõem à variação entre rodadas e controles. O avaliador gerado para a
cadeia de propriedades permaneceu com 196 caracteres em ambas as versões;
seu texto e o texto da chamada de método fazem parte dos outputs comparados
e foram exatamente iguais. Não atribuir diferenças do controle de execução
dos getters à alteração do parser.

Os ganhos observados são locais e dirigidos a esses cenários, não uma
aceleração geral do sistema ou uma vitória sobre todas as versões anteriores.
O fixture de vinculação inclui clonagem, digest e limpeza dos elementos,
executados igualmente nas duas versões.

### Armazenamento temporário

Contagens derivadas do código, não de heap retido: para 100 irmãos com uma
entrada vinculada, o snapshot anterior reservava 100 posições; agora não há
array. Com duas entradas, reserva duas posições em vez de 100. Com 100
entradas, ambos reservam 100 posições. Os nós ainda são capturados antes
de qualquer vinculação quando mais de uma entrada exige proteção.

Os testes novos cobrem remoção de irmão sem link, remoção de um nó que ainda
precisa receber link e um único nó ligado depois de irmãos sem diretivas.
O parser tem cobertura para nomes personalizados escapados e repetidos,
getters vivos, atribuição e compilação de um segundo caminho.
Não foi medida redução do heap total ou permanente da aplicação.

## Candidatas descartadas

- Gerar leituras com ternários reduziu o texto, mas trouxe resultados
  instáveis/regressões nas chamadas de métodos; código revertido.
- Reutilizar regex globalmente ou guardar sufixos de nomes durante a
  compilação não mostrou benefício confiável; alterações revertidas.
- Trocar `map()` por loop na construção de interpolação não demonstrou
  ganho consistente; `src/ng/interpolate.js` permaneceu intacto.

## Validação

Node 14.16.1 selecionado apenas no ambiente dos comandos. `buildall` e
`minall` concluídos; fonte, specs e runners passaram no ESLint.
`grunt test:unit --browsers=ChromeHeadless` passou **26.930 execuções**,
incluindo jqLite, três configurações de jQuery, módulos, ngAnimate e ngMock.
Uma execução inicial com janela passou em jqLite e falhou em 232 casos de
animação/RAF com jQuery; a repetição headless passou sem alterar os mocks.
Esse resultado não confirma a causa das falhas na execução com janela.

O minificado identifica exatamente `1.8.5-local+sha.c99191bb7`. A tela de
três painéis passou **159 checks**, 53 por versão: produção 1.6.9, oficial
1.8.3 e fork atualizado, sem erros capturados. Apenas os arquivos Angular
da pasta `integration-lab/new` e a identificação esperada no harness foram
atualizados; nenhum arquivo do projeto em produção foi escrito.

## Reprodução

Preservar o core anterior em `integration-lab/core-round11/baseline.js`,
compilar a candidata em `candidate.js` e copiar `core-round11-audit.html`
para `case.html` nessa pasta. Com servidor local 8767 e Chrome CDP 9229,
executar `node benchmarks/core-round11-audit.js`. O runner falha se qualquer
output diferir, inclusive o código dos avaliadores de controle.

`core-round11-audit-results.json` contém as amostras. Executar
`node benchmarks/summarize-round11-audit.js` com os arquivos privados de
validação para gerar `round11-audit-summary.json`, que inclui hashes, commits,
medianas por rodada, contagens de snapshot e checks de integridade.
Fontes dos componentes, backups e fixtures permanecem ignorados pelo Git.
