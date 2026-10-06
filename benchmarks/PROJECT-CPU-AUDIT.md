# Perfil de CPU dos componentes do projeto

Continuação da comparação entre AngularJS 1.6.9, 1.8.3 oficial e o fork
1.8.4 no commit `96e85519f`. Os componentes, fixtures e perfis brutos ficam
no laboratório ignorado pelo Git. Nenhum arquivo de produção foi alterado.

## Método e limites

Chrome 154, CDP Profiler, intervalo solicitado de 100 microssegundos.
Uma captura por versão para 10.000 digests após aquecimento e outra para
`runBenchmark()`, que também recria a tabela. As três versões usam os mesmos
componentes, dados falsos e módulos. O script privado
`integration-lab/profile-project.js` coleta os perfis; executar
`node benchmarks/summarize-project-cpu.js` gera os agregados públicos.

Os números representam tempo próprio amostrado, não tempo inclusivo nem um
benchmark de velocidade. Inlining do JIT pode atribuir trabalho de uma função
à chamadora. Capturas únicas servem para localizar custos, não para declarar
uma versão vencedora. A recompilação contém esperas fixas de 30 ms; elas foram
excluídas dos percentuais de CPU ativa.

## Custos observados no fork

| Grupo | 10.000 digests | Benchmark com recompilação |
| --- | ---: | ---: |
| Componentes e helpers | 36,65% | 14,03% |
| Core Angular | 31,91% | 33,03% |
| Expressões geradas | 11,55% | 8,95% |
| jQuery | 2,42% | 17,92% |
| Runtime, GC e chamadas sem URL | 17,47% | 19,84% |
| Outros scripts | 0,00% | 6,23% |

`TabelaJS.isValid` aparece com 518,851 ms de tempo próprio no perfil de
digests do fork. Formatação e validação da tabela são alvos relevantes,
junto com avaliação de expressões e travessia dos watchers. A classificação
usa a URL do frame, sem depender dos mapas de código minificado.

O core não pode memorizar resultados de chamadas arbitrárias a métodos dos
componentes: elas podem depender de estado externo ou ter efeitos colaterais.
Preservar o comportamento exige continuar avaliando essas chamadas.
O perfil não mede consumo de memória nem substitui a comparação de heap.

## Candidata avaliada e descartada

Foi testado verificar `oldItem !== newItem` antes das duas comparações de
`NaN` em `$watchCollection`, tanto para arrays como para objetos. A expressão
lógica manteve a semântica, e a suíte completa passou: 26.898 execuções.

Comparação isolada entre o fork anterior e a candidata, sem compilação ou
suíte concorrendo: seis rodadas alternando a ordem das versões, nove amostras
por rodada, 1.000 digests sobre uma coleção estável de 5.000 itens após
200 digests de aquecimento. Valores abaixo são medianas das seis medianas.

| Coleção | Antes | Candidata | Redução |
| --- | ---: | ---: | ---: |
| Array | 8,65 ms | 8,60 ms | 0,58% |
| Objeto com chaves numéricas | 123,00 ms | 122,05 ms | 0,77% |

A distribuição das rodadas se sobrepõe. Uma primeira execução, concorrendo
com a compilação e testes, sugeriu 4% em objetos, mas esse resultado não se
repetiu no teste isolado. A candidata foi revertida e os artefatos recompilados;
não há uma otimização nova no core nesta rodada.

Os dados estão em `project-cpu-audit-results.json` e
`watch-collection-candidate-results.json`. O próximo alvo apoiado pelos perfis
é reduzir trabalho repetido de formatação da tabela, verificando cuidadosamente
dependências e invalidação antes de qualquer cache. Ganhos no core devem ser
avaliados novamente nos componentes, sem alterar frequência do digest ou debug.
