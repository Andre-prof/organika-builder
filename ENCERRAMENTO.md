# Encerramento

Integrado ao projeto React existente, com registro de acertos dos validadores, bloqueio pelo catálogo completo dos três níveis, cadastro nome/turma, retomada das conquistas por aluno e data fixa na primeira conclusão. O certificado abre em diálogo com teclado, Escape e retorno de foco; animação respeita movimento reduzido. Impressão e salvamento em PDF usam a janela de impressão do navegador.

## Imagens integradas
As duas imagens originais fornecidas foram copiadas para public/mascote/abertura.png e public/mascote/conclusao.png. A área clicável foi posicionada no interior do papel da imagem final (41% esquerda, 43% topo, 26% largura, 24% altura, inclinação de -8 graus). Modelo de referência em output/pdf/Organika-modelo-certificado.pdf, na raiz do projeto de trabalho. Conferência interativa aprovada em desktop e celular, incluindo teclado, troca de aluno e impressão A4 horizontal em uma página.

## Persistência
Nome e turma identificam o aluno localmente. Homônimos na mesma turma compartilham registro; não há autenticação. Conquistas são salvas neste navegador, sem sincronização; a montagem em andamento não é salva. Para certificação institucional verificável, integrar ID individual, persistência e validação no servidor. Armazenamento local pode ser alterado manualmente.

## Validação
node --test --test-isolation=none
node node_modules/vite/bin/vite.js build --configLoader native

Verificação de navegador: node scripts/check-certificate.mjs. A opção Salvar em PDF depende do destino oferecido pelo navegador.
