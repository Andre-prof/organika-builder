# Orgânika Builder

Jogo com modos iniciante, intermediário e avançado em React + Vite, JavaScript
e Zustand. O domínio químico permanece independente da interface e dos gestos.
Subtítulo: **Solucionando o quebra-cabeça da Química Orgânica**. A interface usa
tons de azul e SVGs de peças de quebra-cabeça, sem imagens externas.

## Executar

Jogue online: **https://andre-prof.github.io/organika-builder/**.

A publicação é feita pelo GitHub Pages após cada envio à branch `main`.
O fluxo `.github/workflows/pages.yml` instala as versões do lockfile,
executa os testes e publica a pasta `dist` com o caminho do repositório.

Com Node.js 22.13 ou superior e npm:

```sh
npm install
npm run dev
npm test
npm run exemplos
npm run build
```

A prévia local abre em http://127.0.0.1:5175. `npm run preview` serve a versão
compilada em http://127.0.0.1:4175. Também é possível usar pnpm; o arquivo
`pnpm-lock.yaml` registra as versões verificadas.

A abertura mostra a página inicial. **Começar a jogar** inicia a trilha de dez
desafios; **Área do professor** permite preparar outra sequência. A navegação
usa `#inicio`, `#laboratorio`, `#intermediario`, `#avancado` e `#professor`, incluindo os botões de voltar e
avançar do navegador. Voltar ao início preserva a montagem da sessão e oferece
**Continuar atividade**. Acessar uma nova atividade com montagem em curso pede
confirmação antes de descartar o trabalho.

Os testes de domínio, store e geometria usam `node:test` e `node:assert/strict`.
Os exemplos montam etanol e ácido etanoico e demonstram uma recusa de OH com OH.
Com a prévia ativa e Chrome instalado, executar `npm run test:browser` para
testar mouse, toque e teclado. Esse script usa Playwright em Chrome oculto;
`ORGANIKA_URL` e `ORGANIKA_BROWSER_CHANNEL` permitem escolher outro endereço
ou navegador compatível. Capturas de conferência ficam em `test-results/`.
`npm run test:formula` monta os dez desafios pela interface e confere átomos,
H, ligações duplas, enquadramento, alternância de vistas e uso no celular.

## O que já funciona

- Dez desafios com inventário finito, peças extras progressivas e desbloqueio.
- Arraste da paleta e movimentação rígida de conjuntos conectados.
- Snap em até 28 pixels CSS com alinhamento e giro em passos de 90 graus.
- Operação por toque e alternativa por botões de seleção de portas.
- Seleção, giro do conjunto, devolução de peça e desconexão explícita.
- Conectores livres sempre visíveis, destino destacado e prévia desde a paleta.
- Botão **Girar peça** na bancada (90° por toque), com atalho **R**.
- Desfazer/refazer com histórico de até 50 ações, incluindo poses da cena.
- Verificação química e comparação de conectividade com o desafio.
- Cancelamento de arraste com Escape e confirmação ao limpar a bancada.
- Página inicial com instruções, entrada para alunos e acesso do professor.
- **Recomeçar** encerra a sessão e volta ao início, com confirmação.
- Área do professor com seleção de desafios, gabaritos e roteiro de aula.
- Roteiro docente salvo em localStorage, importável/exportável como JSON.
- Impressão da lista do aluno sem respostas e da lista com gabarito comentado.
- Texto de uso ampliado para 16–18 px e controles com alvos maiores.
- Fórmula estrutural plana completa na própria bancada após Verificar.
- Alternância entre quebra-cabeça e fórmula, com controles de ampliação.

O progresso dura a sessão atual; recarregar a página reinicia os desafios.
O roteiro salvo do professor é independente da sessão e permanece ao
recomeçar ou recarregar. A importação altera apenas a seleção em revisão,
sem iniciar uma sessão nem sobrescrever o roteiro salvo automaticamente.
**Limpar bancada** mantém o progresso e pode ser desfeito; **Recomeçar** limpa
montagem, histórico e conclusões e não permite recuperá-los com Desfazer.
Ao verificar uma molécula completa, a própria bancada exibe sua fórmula
estrutural plana completa, com cada H e cada ligação explícitos. Os botões
**Quebra-cabeça** e **Fórmula plana completa** permitem comparar as vistas
sem perder a montagem. Uma alteração química retorna ao puzzle e exige
nova verificação; movimento visual mantém o resultado. A entrada da fórmula
usa uma transição suave, desativada com a preferência de movimento reduzido.

## Estrutura

```text
src/
  data/blocos.js                 Seis templates imutáveis e instanciação
  domain/modelo.js              Contratos JSDoc, versão e valências
  domain/Molecule.js            Agregado e alterações controladas
  game/ValidadorEstrutura.js     V1, V2 e identificação de funções
  game/integridade.js            Integridade e correspondência com templates
  game/grafo.js                  Índices, conectividade e ciclos
  game/resultados.js             Resultado padronizado
  game/AvaliadorDesafio.js       Comparação canônica de árvores moleculares
  data/desafios.js               Dez receitas, inventários e dicas
  data/gabaritos.js              Fórmulas semidesenvolvidas e comentários
  game/roteiroProfessor.js       Validação e portabilidade do roteiro docente
  scene/geometria.js             Poses, componentes e snap sem dependência de React
  scene/formulaPlana.js          Layout 2D do mesmo grafo com H explícitos
  components/FormulaPlana.jsx    Átomos, ligações simples/duplas e zoom da fórmula
  store/gameStore.js             Store vanilla e ações da sessão
  store/useGameStore.js          Integração com React
  hooks/useArraste.js            Gestos de mouse e toque
  components/                   Peças SVG e ícones
  pages/Inicio.jsx              Entrada e instruções
  pages/Professor.jsx           Seleção, gabaritos, salvamento e impressão
  components/FichaAtividade.jsx Conteúdo de impressão sem controles do jogo
  App.jsx                       Navegação, sessão e bancada
  styles.css                    Tema azul e layout responsivo
  index.js                      API pública do domínio
examples/montagens.js
scripts/check-browser.mjs
scripts/check-formula.mjs
tests/
```

## API de construção

```js
import { Molecule, validarEstrutura } from './src/index.js';

const molecule = new Molecule();
const a = molecule.adicionarFragmento('ch3');
const b = molecule.adicionarFragmento('cooh');

// Verificar resultado.valido antes de consumir fragmento ou ligacao.
const ligacao = molecule.conectarPortas(
  a.fragmento.ports[0].id,
  b.fragmento.ports[0].id,
);

console.log(validarEstrutura(molecule.obterMolecula()));
molecule.desconectar(ligacao.ligacao.id);
```

`adicionarFragmento`, `conectarPortas` e `desconectar` retornam
`{ valido, codigo, mensagem, detalhes }`. Sucessos de adição incluem `fragmento`;
sucessos de conexão incluem `ligacao`. Recusas preservam integralmente o estado
e sua revisão. Não há método para modificar H ou ligações internas. IDs usam um
namespace UUID por agregado e contadores sem reuso; átomos, ligações internas e
portas recebem o prefixo do fragmento. Requer `crypto.randomUUID` e
`structuredClone`, disponíveis no Node indicado e nos navegadores modernos em
contexto seguro.

`obterMolecula()` devolve cópia profunda. Editar essa cópia não altera o agregado.
Cada operação aceita incrementa `revision` uma vez. Não há importação de
snapshots sem validação: `Molecule.restaurar(snapshot)` confere a integridade,
faz cópia profunda e usa um novo namespace para futuras adições. A store usa
essa operação para desfazer/refazer. `removerFragmento(id)` devolve uma peça,
remove suas ligações e libera as portas dos vizinhos, preservando as demais.

## Validações e erros

V1 usa exatamente um argumento, que contém o snapshot:

```js
validarLocal({ molecule: snapshot, portA: 'id-da-porta', portB: 'outro-id', order: 1 });
```

V2 usa `validarEstrutura(snapshot)` e acrescenta `completa: true|false` ao
resultado. Incompletude também usa `valido: false`; um snapshot parcial pode
ser íntegro mesmo sem ser uma molécula completa. Ambos são puros.

| Código | Significado |
| --- | --- |
| `PORT_NOT_FOUND` | Porta inexistente |
| `SAME_PORT` | A mesma porta foi escolhida duas vezes |
| `PORT_OCCUPIED` | Porta já consumida |
| `SAME_FRAGMENT_CONNECTION` | União dentro da mesma peça |
| `UNSUPPORTED_PARTNER` | Par não permitido pelo catálogo didático |
| `EXTERNAL_BOND_ORDER_NOT_SUPPORTED` | Ligação externa diferente de simples |
| `CYCLE_NOT_SUPPORTED` | Ciclo existente ou que seria criado |
| `VALENCE_EXCEEDED` | Soma das ordens maior que a valência permitida |
| `EMPTY_WORKSPACE` | Nenhum fragmento |
| `DISCONNECTED_COMPONENTS` | Mais de um componente |
| `OPEN_PORTS` | Ainda há conexões livres |
| `INVALID_VALENCE` | Valência final incompleta |
| `INTERNAL_BOND_IMMUTABLE` | Tentativa de desfazer ligação interna |
| `TEMPLATE_MISMATCH` | H, portas ou estrutura interna não correspondem à peça |

A inspeção também retorna erros de integridade, como `INVALID_MOLECULE`,
`DUPLICATE_ID`, `INVALID_BOND_REFERENCE`, `INVALID_PORT_OCCUPANCY`,
`UNSUPPORTED_ELEMENT` e `UNSUPPORTED_CHARGE`. A prioridade é: formato e
referências, consistência de portas e ligações, excesso de valência, templates,
ciclos; depois vêm as regras locais ou de completude. V1 verifica ocupação
antes da restrição de parceiro. V2 aponta componentes antes de portas livres.

## Análise química

`contarCarbonos` inclui os carbonos de CHO e COOH. `detectarRamificacao`
considera somente vizinhos de carbono, evitando classificar o OH como uma
ramificação carbônica. `identificarFuncoes` retorna ocorrências de `alcool`,
`aldeido` e `acido_carboxilico`; um mesmo grafo pode conter mais de uma.

`classificarAlcoois`, `possuiAlcoolPrimario` e `possuiAlcoolSecundario` avaliam
os vizinhos de carbono do carbono que porta o OH. Metanol é um caso explícito
(`classificacao: 'metanol'`, zero vizinhos C), seguindo a especificação 1.1.
A classificação também prevê o grau terciário, embora o catálogo atual não
contenha a peça C sem H necessária para montar um álcool terciário saturado.
O OH carboxílico não é classificado como álcool. Estes auxiliares aceitam
montagens parciais íntegras; em grafo corrompido lançam `Error` com `codigo`.
Padrões detectados numa montagem parcial não indicam que ela esteja completa.

## Limites desta etapa

Cadeias abertas com C, H e O neutros; somente seis templates. H internos são
explícitos e fixos. Conexões externas são simples; a carbonila interna tem
ordem 2. OH, CHO e COOH só aceitam carbono como parceiro. Bloquear OH com OH é
uma decisão deste modo, não uma afirmação de que ligações O–O são impossíveis.

Não há pontuação por estrelas, campo de nomenclatura nem persistência do
progresso nesta versão. Os nomes dos dez desafios são dados
revisáveis, não a saída de um gerador IUPAC geral. Na tela atual os H estão
agrupados nos rótulos das peças; no grafo continuam explícitos e fixos.
Na vista da fórmula completa, os H são desenhados individualmente, com suas
ligações. A notação semidesenvolvida continua identificada dessa forma nos
gabaritos do professor; não substitui a fórmula completa da bancada.

## Fórmula plana na bancada

O layout encontra uma cadeia carbônica principal no grafo e posiciona suas
ramificações e heteroátomos em uma malha ortogonal. Uma busca limitada impede
cruzamentos de ligações entre átomos pesados; os H do grafo ocupam direções
livres com ligações mais curtas. C=O é uma única aresta de ordem 2, renderizada
com dois traços. Todos os IDs e origens dos fragmentos são preservados.

A fórmula só é oferecida após uma verificação de completude. Uma molécula
válida que não atende ao objetivo também revela sua estrutura real, sem
conceder conclusão do desafio. A fórmula molecular é apenas uma legenda
complementar. A vista inicial enquadra todos os átomos verticalmente; no
celular, estruturas largas podem ser percorridas horizontalmente para manter
os símbolos legíveis. Os botões de zoom ampliam ou reduzem o desenho.

Os testes verificam as dez fórmulas quanto a conservação de átomos e arestas,
ausência de cruzamentos e sobreposição de símbolos, além da contagem de H e
dos dois traços das carbonilas na interface. A disposição é uma representação
no plano, sem pretender mostrar a geometria espacial da molécula.

## Separação entre química e cena

Os snapshots de `Molecule` não contêm coordenadas. A store mantém `molecule`
e `poses` separados. Mover e girar preserva a revisão química e um resultado
já verificado; uma alteração de conectividade invalida a verificação anterior.
Snapshots expostos pela store são congelados. O histórico inclui o domínio,
a cena e o resultado, mas não desfaz conquistas já registradas na sessão.

A geometria usa a matriz inversa do SVG para coordenadas do ponteiro e mede
o alcance do snap em pixels CSS, usando a escala real da matriz do SVG,
inclusive quando há margens por diferença de proporções. A distância é o
deslocamento que falta ao corpo para sua posição já orientada de encaixe:
não é necessário coincidir dois conectores virados para o mesmo lado nem
sobrepor os corpos. O candidato passa por V1 antes de aplicar o alinhamento.
Portas equivalentes de uma peça solta na mesma posição final preferem o
menor giro; empates entre destinos distintos inferiores a 4 pixels não
confirmam uma ligação: o aluno escolhe origem e destino pelos controles.
Colisões de corpos e falta de espaço na bancada geram recusas de layout,
sem afirmar que a ligação química é impossível. Ao arrastar, não há alteração
de domínio até soltar; cancelamento restaura a cena anterior.

A comparação de desafios codifica a árvore molecular por elemento e ordem de
ligação, ignorando IDs e sequência de montagem. Ela distingue butano de
2-metilpropano. Ciclos permanecem fora do escopo. O desafio final admite a
conectividade do butan-2-ol; estereoquímica não é avaliada no modo iniciante.

## Roteiro do professor

O arquivo portátil contém somente `{ tipo: 'organika-roteiro', versao: 1,
desafiosIds: [...] }`. São aceitos IDs existentes, sem repetições, normalizados
na ordem didática do catálogo. O arquivo é limitado a 64 KB. O JSON não inclui
nomes de alunos, progresso, poses ou grafos arbitrários. O armazenamento usa
a chave `organika.roteiro-professor.v1`; falhas ou conteúdo corrompido preservam
o acesso ao catálogo e permitem exportar a seleção atual.

Na atividade selecionada, o primeiro desafio do roteiro fica liberado, mesmo
que os desafios anteriores do catálogo tenham sido omitidos. O desbloqueio
seguinte considera a trilha selecionada. A página do professor permite
imprimir a seleção sem respostas ou acrescentar uma seção de gabaritos em
outra página. O conteúdo é gerado localmente; o navegador abre sua opção de
imprimir ou salvar em PDF.

## Intermediário e avançado

A página inicial oferece três níveis, com dez desafios cada. O intermediário
usa fragmentos com portas simples, duplas e triplas; o avançado usa átomos C, H,
O e N e permite anéis. As montagens são independentes durante a sessão.
Ambos têm controles para mouse, toque e teclado, desfazer/refazer e revelação
da fórmula completa no mesmo quadro. A área docente contém os novos gabaritos
e permite iniciar cada desafio individualmente.

Os limites e as regras estão em [PROGRESSAO.md](./PROGRESSAO.md).
As seções anteriores descrevem o domínio e as ferramentas do iniciante;
a proibição de ciclos e o comparador de árvores não se aplicam ao avançado.
O roteiro salvo e a impressão da seleção continuam destinados ao iniciante.
Para conferir os novos níveis, execute `npm run test:progressive`
com o servidor local em execução.

Referências de integração: [Vite](https://vite.dev/guide/) e
[Zustand createStore](https://zustand.docs.pmnd.rs/reference/apis/create-store.html).
