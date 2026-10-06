# Comparacao dos componentes nas tres versoes

2026-10-06. Fork no commit 96e85519f. Chrome 154 / Windows.

| Medida | Producao 1.6.9 | Oficial 1.8.3 | Fork atualizado 1.8.4 |
| --- | ---: | ---: | ---: |
| Testes funcionais | 53/53 | 53/53 | 53/53 |
| TabelaJS.getHtml, 30 chamadas (ms) | 0.55 | 0.65 | 0.35 |
| Digest estavel, 100 ciclos (ms) | 11.55 | 12.15 | 11.80 |
| Stress: 500 watchers alterados, 100 ciclos (ms) | 31.45 | 32.90 | 31.30 |
| Recompilar tabela incluindo espera de 30 ms (ms) | 57.80 | 56.10 | 54.05 |
| Heap JS retido depois de GC (MiB) | 8.34 | 8.39 | 8.44 |
| Crescimento de heap no lote depois de GC (KiB) | 326.92 | 326.87 | 318.75 |

Mesmos componentes privados e mesmos dados ficticios nas tres versoes. Modulos carregados: core, animate, resource e sanitize correspondentes a cada versao. Componentes locais conferidos com a pasta C:\xampp\htdocs\resources\assets\js\helper\plugin\angular, sem diferencas. Producao nao modificada.

Serie adicional: cinco lotes aquecidos, 100 recompilacoes por versao, GC entre lotes. Crescimento total desde o baseline aquecido: producao 531.68 KiB; oficial 505.18 KiB; fork 462.84 KiB. O crescimento diminuiu nos lotes seguintes, mas nao confirmou estabilizacao completa. Watchers/eventos permaneceram constantes, sem erros. O fork reteve um pouco mais de heap no comparativo principal, embora tenha acumulado menos nesta serie; nao afirmar consumo total menor nem ausencia de vazamentos.

53 testes por versao, incluindo 22 factories, consulta, selecao/limpeza, recompilacao, DataTables, mascaras, arquivos, erros de API e element.scope(). Snapshots iguais: true; testes aprovados: true; sem erros JS/Angular: true.

Quatro rodadas com ordem alternada, benchmark aquecido antes de cada medicao, nove amostras internas por caso; resumo usa mediana das quatro medianas. Cada lote recompila a tabela 20 vezes. Watchers e eventos globais permaneceram estaveis nas tres versoes.

Heap medido com Runtime.getHeapUsage depois de GC e limpeza do console, com BackForwardCache desativado no Chrome de automacao. Heap retido nao mede pico ou memoria total do navegador. Crescimento num unico lote nao prova ausencia de vazamentos. Digest com 500 watchers adicionais e um stress sintetico, separado dos componentes reais. Recompilacao inclui espera fixa de 30 ms, portanto nao isola CPU de compilacao. Diferencas pequenas podem ser variacao do navegador e nao demonstram ganho global do sistema.

Pacotes 1.8.3 oficiais obtidos de https://cdn.jsdelivr.net/npm/angular@1.8.3/angular.min.js e modulos npm da mesma versao. Hashes por biblioteca no JSON resumido. Dados completos privados em integration-lab/three-version-functional.json e three-version-performance.json. Laboratorio ignorado no Git. Abrir http://127.0.0.1:8767/index.html para os tres paineis com APIs simuladas.
