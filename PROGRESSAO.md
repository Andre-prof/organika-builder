# Progressão dos níveis

Os três níveis estão acessíveis pela página inicial e pela navegação da bancada. Cada nível mantém montagem e progresso durante a sessão, inclusive ao visitar a área do professor. Recarregar a página encerra a sessão.

## Iniciante

O domínio 1.1, a bancada e os dez desafios foram preservados. Peças CH₃, CH₂, CH, OH, CHO e COOH, cadeias abertas, ligações externas simples e H internos fixos.

## Intermediário

O domínio 2.0 acrescenta cinco fragmentos: CH₂ com porta dupla; CH com simples e dupla; C com duas simples e uma dupla; CH com tripla; C com simples e tripla. Cada H permanece explícito no grafo e fixo na peça. As duas portas e a ordem selecionada precisam ser compatíveis. Não há anéis.

Os conectores exibem 1, 2 ou 3. Selecione a ordem e conecte por clique/toque, pelos botões de portas ou por aproximação durante o arraste. O encaixe orienta e alinha o conjunto, preservando espaço entre os corpos. O alcance é medido em pixels de tela; empates entre destinos distintos exigem escolha explícita. Girar conjunto e tecla R estão disponíveis; setas movem o conjunto focado.

Desafios: eteno, propeno, but-1-eno, but-2-eno, 2-metilpropeno, etino, propino, but-1-ino, but-2-ino e penta-1,3-dieno.

## Avançado

Átomos individuais C, H, O e N neutros, com valências 4, 1, 2 e 3. Ligações simples, duplas e triplas. Fechar anéis é permitido quando há valência disponível. O editor não acrescenta H automaticamente: cada H é adicionado e conectado pelo aluno.

Escolha a ordem e dois átomos, no desenho ou nos botões abaixo da bancada. Arraste para reposicionar ou use as setas no átomo focado. Escape cancela a origem selecionada. Delete devolve o item focado; o botão Devolver seleção oferece a mesma ação por mouse ou toque. A lista de ligações permite desconexão explícita.

Desafios: propanona, metoximetano, metilamina, etanamida, etanoato de metila, etanonitrila, ciclopropano, ciclobutano, ciclohexano e benzeno. O benzeno usa uma representação de Kekulé, com explicação sobre a deslocalização real. Não se infere aromaticidade de qualquer anel.

## Validação e gabaritos

Uma estrutura completa exige pelo menos um átomo, um único componente e valências exatas; no intermediário, também todas as portas ocupadas. Comandos recusados preservam a montagem. Ligações internas não podem ser removidas. Remover uma peça/átomo elimina suas ligações e libera portas vizinhas. Devolver itens repõe o inventário.

O comparador usa isomorfismo por elemento e ordem da ligação, incluindo H. Não depende dos IDs nem da ordem de criação e trata ciclos. Distingue posições de insaturação e isômeros de mesma fórmula molecular. O reconhecimento de funções identifica álcool, aldeído, ácido, cetona, éter, éster, amina, amida e nitrila por vizinhança atômica.

Somente o gabarito correto conclui e desbloqueia o desafio seguinte. Uma estrutura completa diferente do objetivo também revela sua própria fórmula, sem conceder conclusão. Estruturas incompletas permanecem na montagem.

## Fórmula e histórico

Verificar revela a fórmula estrutural plana completa no mesmo quadro. H e ordens vêm do grafo; triplas têm três traços. A fórmula molecular é uma legenda complementar. Alternar a vista não modifica a química. Há zoom e respeito à preferência por movimento reduzido.

No avançado, verificar uma estrutura completa também organiza as posições da montagem a partir do próprio grafo, com cadeias alinhadas, H distribuídos e anéis regulares. Voltar a Montagem por átomos mostra esse arranjo. A organização pode ser desfeita/refeita e não altera átomos, ligações ou revisão química. Estruturas incompletas mantêm as posições manuais.

Cadeias abertas usam uma malha para cadeia e ramificações. Anéis simples são percorridos em ordem topológica e desenhados como polígonos. Um arranjo geral de iterações limitadas trata outras topologias, sem recursão ilimitada em ciclos. A apresentação não mostra geometria espacial real. Topologias fora dos vinte gabaritos não têm garantia geral de ausência de cruzamentos.

O histórico de até 50 alterações inclui molécula, posições e representação. Alterações químicas invalidam a verificação; mover/girar preserva o resultado. Desfazer não retira conclusões obtidas na sessão. Limpar pede confirmação e preserva desafios concluídos; Recomeçar pede confirmação, limpa somente o nível atual e retorna ao início.

## Área do professor

Os vinte novos desafios têm gabarito completo, explicação e botão para iniciar individualmente qualquer desafio. Roteiro salvo, importação/exportação JSON e impressão da seleção continuam destinados ao iniciante. Ainda não há roteiros mistos com os novos níveis.

## Arquitetura e verificação

MoleculaProgressiva separa as novas políticas do domínio iniciante. Coordenadas ficam na cena. As stores Zustand são independentes e publicam snapshots congelados. O histórico restaura cópias e inspeciona IDs, ligações, valências e integridade dos templates.

npm test cobre domínio, progressão, gabaritos, equivalência com ciclos, classificação e layouts. npm run test:progressive monta os vinte novos desafios no Chrome e confere H e traços, navegação, sessões independentes, recomeço, toque, teclado, arraste e recusas. npm run test:browser e npm run test:formula verificam a regressão do iniciante.

Limites: sem cargas, radicais, estereoquímica, gerador geral de nomes ou backend. N é trivalente neutro. Os nomes são dados revisáveis. Progresso dura a sessão; somente o roteiro docente do iniciante é persistido.
