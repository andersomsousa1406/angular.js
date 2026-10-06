# Auditoria de componentes externos — 2026-10-06

Correções de componentes do projeto externo, validadas em um laboratório privado
ignorado pelo Git. O código desses componentes não pertence ao fork AngularJS.
As alterações foram aplicadas aos fontes externos; o projeto usa SVN. Este Git
registra a auditoria, sem versionar cópias privadas nem publicar alterações.
Backups, patches, hashes e resultados completos estão em `integration-lab/`.

## ArquivosJS: variáveis locais e conclusão de getFiles

`clear`, `load` e `processarArquivo` atribuíam `that` sem declaração em modo
estrito. A carga de arquivos lançava ReferenceError. `getFiles` envolvia a
requisição em uma segunda promessa; um erro no processamento deixava essa
promessa pendente, impedindo o chamador de concluir a operação.

Declare `that` localmente nos três métodos. Retorne a cadeia de `$ajax.post`
diretamente, mantendo a resposta original como valor resolvido. Falhas da
requisição e exceções de `load` passam a rejeitar a promessa retornada.

Validação no navegador: carga pela API fictícia, backup/restore, limpeza sem
variável global e erro proposital em `load` rejeitado. Suíte integrada: 53/53
verificações em AngularJS 1.6.9 e 53/53 no build minificado do fork 1.8.4, sem
erros capturados e com estados finais iguais. As execuções incluem também as
outras correções documentadas nesta auditoria.

Os bundles globais do sistema precisam da compilação habitual para consumir
os fontes corrigidos; nenhum arquivo de public/assets ou public/build foi
editado. Nenhum commit SVN ou deploy foi realizado.

## DataTables: regeneração a partir dos fontes modulares

O bundle alternativo de DataTables tinha funções renomeadas cujas chamadas
internas ainda usavam os nomes originais. A resolução de opções com promessas
falhava nas duas versões de AngularJS; os sete fontes modulares funcionavam.

Regenerado o bundle desses mesmos fontes com UglifyJS 3.17.0 já instalado no
projeto externo. O builder `gulp/build-angular-datatables.js` torna a geração
repetível. Renomeação de parâmetros está desativada para preservar a injeção
implícita de dependências do AngularJS; não foram instaladas bibliotecas.
O arquivo compilado foi gerado pelo builder, sem edição manual.

Validação: a página principal usa o bundle regenerado, carregando 40 registros
fictícios por promessa, filtrando 10 registros e ordenando numericamente.
53/53 verificações por versão, sem falha de função ausente. O resultado gerado
no projeto externo é idêntico à cópia validada no laboratório.
