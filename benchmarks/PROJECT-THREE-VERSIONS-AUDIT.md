# Comparacao dos componentes nas tres versoes

2026-10-07. Fork no commit c99191bb7. Chrome 154 / Windows.

| Medida | Producao 1.6.9 | Oficial 1.8.3 | Fork atual 1.8.5-local |
| --- | ---: | ---: | ---: |
| Testes funcionais | 53/53 | 53/53 | 53/53 |
| TabelaJS.getHtml, 30 chamadas (ms) | 0.95 | 1.00 | 1.20 |
| Digest estavel, 100 ciclos (ms) | 57.05 | 57.95 | 59.35 |
| Digest com 500 watchers extras, uma alteracao por ciclo, 100 ciclos (ms) | 141.35 | 148.10 | 138.90 |
| Recompilar tabela incluindo espera de 30 ms (ms) | 94.50 | 94.25 | 93.10 |
| Heap JS retido depois de GC (MiB) | 8.35 | 8.42 | 8.46 |
| Crescimento de heap no lote depois de GC (KiB) | 344.27 | 338.54 | 330.32 |
| Crescimento apos 100 recompilacoes adicionais (KiB) | 512.18 | 509.17 | 455.97 |

Dispersao das medianas de digest estavel entre as quatro rodadas (ms): Producao 1.6.9: 64.80, 61.80, 52.30, 23.00; Oficial 1.8.3: 55.70, 62.70, 46.60, 60.20; Fork 1.8.5-local / c99191bb7: 41.70, 62.40, 58.30, 60.40. Nao ha evidencia robusta de superioridade global nesta execucao.

Mesmos componentes privados e mesmos dados ficticios nas tres versoes. Modulos carregados: core, animate, resource e sanitize correspondentes a cada versao. As 75 copias privadas dos componentes permaneceram intactas nesta rodada, verificadas por SHA-256 antes e depois dos testes. Producao nao modificada.

Serie adicional: cinco lotes aquecidos, 100 recompilacoes adicionais por versao, apos 5.000 digests e um lote de aquecimento, GC entre lotes; uma serie por versao na ordem 1.6.9, 1.8.3, fork. Crescimento total desde o baseline aquecido: producao 512.18 KiB; oficial 509.17 KiB; fork 455.97 KiB. A serie registra a evolucao de heap apos GC; cinco lotes nao demonstram ausencia de vazamentos. Os valores absolutos e o crescimento devem ser avaliados separadamente.

53 testes por versao, incluindo 22 factories, consulta, selecao/limpeza, recompilacao, DataTables, mascaras, arquivos, erros de API e element.scope(). Snapshots iguais: true; testes aprovados: true; sem erros JS/Angular: true.

Maquina compartilhada com Chrome de uso normal e backup_sync.py ativos. A dispersao entre rodadas limita conclusoes sobre velocidade; nao comparar estes tempos absolutos com rodadas de outros dias.

Quatro rodadas com ordem alternada, 5.000 digests e um lote de benchmark para aquecimento antes de cada medicao, nove amostras internas por caso; resumo usa mediana das quatro medianas. Cada lote recompila a tabela 20 vezes. Watchers e eventos globais permaneceram estaveis nas tres versoes.

Heap medido com Runtime.getHeapUsage depois de GC e limpeza do console, com BackForwardCache desativado no Chrome de automacao. Heap retido nao mede pico ou memoria total do navegador. Crescimento num unico lote nao prova ausencia de vazamentos. Digest com 500 watchers adicionais e um stress sintetico, separado dos componentes reais. Recompilacao inclui espera fixa de 30 ms, portanto nao isola CPU de compilacao. Diferencas pequenas podem ser variacao do navegador e nao demonstram ganho global do sistema.

Pacotes 1.8.3 oficiais obtidos de https://cdn.jsdelivr.net/npm/angular@1.8.3/angular.min.js e modulos npm da mesma versao. Hashes por biblioteca no JSON resumido. Dados completos privados em integration-lab/three-version-functional.json e three-version-performance.json. Laboratorio ignorado no Git. Abrir http://127.0.0.1:8767/index.html para os tres paineis com APIs simuladas.
