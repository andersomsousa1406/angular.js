# AngularJS fork 1.8.4

Versao interna deste fork, baseada em AngularJS 1.8.3, preparada em 2026-10-06.
Nao e uma publicacao oficial do projeto AngularJS ou uma distribuicao NES.
Correcoes e limites: CHANGELOG.md, FORK-MAINTENANCE.md e benchmarks/PERFORMANCE-AUDIT.md.

A tag Git anotada v1.8.4 define angular.version.full. package.json registra a
mesma versao. Commits posteriores voltam a gerar snapshots pelo mecanismo atual.

Build com Node 14.16.1 e Yarn 1.22.22:

```powershell
$env:CI='true'
$env:NG1_BUILD_NO_REMOTE_VERSION_REQUESTS='true'
yarn.cmd grunt buildall minall collect-errors write copy:i18n
```

Pacote: build/releases/angularjs-fork-1.8.4.zip. Inclui core e modulos normais e
minificados, source maps, i18n, manifesto e checksums SHA-256; exclui bundles de
testes e docs. Os checksums e manifesto sao gerados durante o empacotamento.

Substitua angular.js/angular.min.js e os modulos usados pelo sistema por arquivos
da mesma distribuicao. Inclua angular-csp.css se usar CSP. Debug permanece
habilitado por padrao, inclusive na versao minificada; element.scope() permanece
disponivel. O agendamento do digest nao muda.

Confirme angular.version.full === '1.8.4' no navegador. Valide formularios,
selecoes, listas, templates, HTTP, imagens SVG/srcset, animacoes e element.scope().
As politicas de imagens endurecidas podem bloquear URLs antes aceitas; consulte
FORK-MAINTENANCE.md para as alteracoes e limites.

Commit e tag apenas locais; sem publicacao em npm ou GitHub.
