# Tokens de data, arrays CSP e parsing de listas

Auditoria de 2026-10-06. Baseline: commit a283cd3bd, build nao minificado.
Candidate: as tres alteracoes abaixo, mesmo tipo de build.

## Alteracoes e compatibilidade

- date: cache local ao filtro, limitado a 16 formatos string de ate 256
  caracteres. Guardar apenas tokens privados imutaveis, sem valores formatados
  nem funcoes/textos resolvidos do locale. Resolver aliases em cada chamada e
  continuar lendo locale e timezone durante formatacao. Formatos longos e
  nao-string mantem tokenizacao por chamada. Invalid dates nao alimentam cache.
  Testes cobrem troca de alias e nome de mes, formatos diversos, literals,
  timezone e formatos longos. Ao atingir capacidade, substituir por ordem de
  insercao apenas quando o formato repete a ultima chave que deu miss, evitando
  expulsar entradas a cada formato diferente. Uma chave adicional de miss e
  mantida, tambem limitada a 256 caracteres. Cache retem memoria limitada; nao
  apresentar como reducao de heap, embora evite novas listas nos hits.
- $parse CSP: array nao vazio com tamanho conhecido, preenchido por indice.
  Array vazio mantem a criacao original com literal [] em funcao especifica.
  Tres elementos usam literal direto, evitando loop e mantendo array packed.
  Continua criando array novo a cada chamada, avaliando elementos na ordem e
  propagando erros. Teste roda nos dois modos e cobre reentrada, locals e mutacao
  do resultado anterior. Nenhum buffer compartilhado foi introduzido.
- ngList: para strings com separador string nao vazio, localizar os campos
  por indice e preencher apenas a lista final. O teste de campo vazio acontece
  antes do trim: um campo com apenas espacos continua produzindo string vazia.
  Separador vazio e callers legados mantem split/forEach. Testes cobrem
  separadores multichar, campos consecutivos/limites, espacos, ngTrim false e
  divisao UTF-16 no fallback com separador vazio.

## Procedimento

Copiar build/angular.js anterior para integration-lab/core-round9/baseline.js,
compilar e copiar novo build para candidate.js. Copiar core-round9-audit.html
para case.html nesse diretorio ignorado. Servidor HTTP na porta 8767 e Chrome
com CDP 9229. Executar node benchmarks/core-round9-audit.js. AUDIT_BASE_URL,
AUDIT_OUTPUT e CDP_PORT permitem outros enderecos. Pagina ng-csp=no-unsafe-eval;
nenhum helper privado exportado. Medir o parser ngList real obtido do ngModel,
isolando-o do custo de eventos/validacao/rendering.

Quatro pares alternados, cinco lotes de aquecimento e 15 amostras por caso,
sem suite concorrente. Resumo usa mediana das quatro medianas. DateChurn
alterna 40 formatos, excedendo o cache. Array vazio e listas de tres itens sao
controles. Diferencial inclui formatos/timezones, troca de locale, identidade
de resultados CSP e parsing com/sem trim, vazio, undefined e UTF-16.
Todas as amostras em tmp/core-round9-results.json; resumo no JSON versionado.

## Validacao e limites

Build, lint e 26.898 execucoes unitarias aprovados. Nao medir ganho total de tela
nem economia numerica de heap. Date troca memoria retida limitada por menos
tokenizacoes. Prealocacao CSP nao reduz a quantidade de arrays de resultado.
NgList evita o array intermediario somente no caminho de leitura por indice.

## Resultados

| Caso | Operacoes por amostra | Antes (ms) | Depois (ms) | Menos tempo |
| --- | ---: | ---: | ---: | ---: |
| Date, formato repetido | 10.000 | 83,35 | 52,20 | 37,4% |
| Date, alias mediumDate | 10.000 | 46,30 | 29,90 | 35,4% |
| Date, 40 formatos em rotacao | 10.000 | 37,15 | 35,25 | 5,1% |
| CSP, array vazio, controle | 200.000 | 7,55 | 7,35 | 2,6% |
| CSP, array de tres elementos | 200.000 | 37,15 | 29,35 | 21,0% |
| CSP, array de 16 elementos | 200.000 | 134,45 | 135,35 | -0,7% |
| ngList, tres campos com trim | 5.000 | 3,95 | 2,15 | 45,6% |
| ngList, 100 campos com trim | 5.000 | 87,20 | 67,65 | 22,4% |
| ngList, tres campos sem trim | 5.000 | 3,15 | 1,85 | 41,3% |
| ngList, 100 campos sem trim | 5.000 | 67,70 | 51,75 | 23,6% |

Saidas diferenciais iguais nas oito execucoes. Prealocacao de 16 elementos nao
mostrou ganho consistente: nao apresentar ganho para todo literal CSP. O vazio
conserva [] por chamada. A primeira variante do cache trocava entradas em cada
miss e piorava a rotacao de formatos; a admissao com repeticao foi acrescentada
antes da entrega. O cache final pode ter custo em outros padroes de misses;
limites de retenção e ganhos de hits nao demonstram economia numerica de heap.
