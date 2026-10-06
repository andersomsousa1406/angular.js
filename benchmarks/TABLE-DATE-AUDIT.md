# Formatação de datas da tabela no laboratório

O patch `patches/tabela-date-format.patch` foi aplicado somente à cópia
ignorada de `TabelaJS.js` em `integration-lab`. Os arquivos do sistema em
produção não foram alterados. O patch contém apenas as alterações necessárias;
o componente completo e seu backup continuam fora do Git.

Para datas primitivas no formato `YYYY-MM-DD`, a conversão usa fatias da string
em vez de `split('-').reverse().join('/')`. Uma expressão regular compartilhada
valida apenas o formato, mantendo inclusive o resultado anterior para datas
numericamente inválidas. Datas de formatos diferentes e objetos com conversão
personalizada continuam no caminho original. Prefixos, sufixos e timestamps
mantêm suas regras anteriores. Não foi adicionado cache de valores.

O caminho otimizado elimina o array intermediário de separação da data. Não
foi medida uma redução do heap total decorrente dessa alteração.

## Validação e medidas

Chrome 154, mesmo objeto de tabela, função original extraída do backup e
função candidata carregada pelo laboratório. Quatro pares alternados,
50.000 chamadas de aquecimento por cenário, 15 amostras de 100.000 chamadas.
Os 80 casos comparados passaram, incluindo datas não padronizadas, valores
inválidos, strings encapsuladas, prefixos e sufixos dependentes da linha.

| Cenário | Original | Candidata | Variação de tempo |
| --- | ---: | ---: | ---: |
| Data `YYYY-MM-DD` | 14,75 ms | 11,50 ms | -22,0% |
| Timestamp | 20,70 ms | 17,55 ms | -15,2% |
| Data `DD-MM-YYYY`, caminho original | 14,65 ms | 15,25 ms | +4,1% |
| Texto | 2,95 ms | 3,10 ms | +5,1% |

As distribuições de texto se sobrepõem. O caminho de formato alternativo
paga as verificações de admissão do caminho rápido. Portanto, o patch é uma
melhoria dirigida a datas padronizadas, não uma aceleração universal. O teste
do projeto com os três cores e o mesmo componente candidato passou 159 checks,
com snapshots iguais, sem erros e sem alteração dos watchers ou eventos globais.

## Reprodução

É necessário o laboratório local, seu servidor na porta 8767 e o Chrome
automatizado com CDP na porta 9229. Antes de aplicar o patch à cópia do
componente, preserve o original em
`integration-lab/backups/TabelaJS-before-date-optimization.js`.
Execute `node benchmarks/table-date-audit.js`. Ele compara as duas funções,
salva o resultado privado em `integration-lab/table-date-performance.json`
e falha se um resultado de formatação mudar. A cópia pública de evidência está
em `table-date-audit-results.json`. A página manual é
`http://127.0.0.1:8767/index.html`; recarregue-a para carregar a candidata.
