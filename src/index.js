// Única porta de entrada pública do domínio, pronta para uso futuro pelo React.
export { Molecule } from './domain/Molecule.js';
export { MoleculaProgressiva, BLOCOS_INTERMEDIARIOS } from './domain/MoleculaProgressiva.js';
export { BLOCOS, obterTemplate } from './data/blocos.js';
export { SCHEMA_VERSION, VALENCIAS, criarMoleculaVazia } from './domain/modelo.js';
export {
  validarLocal, validarEstrutura, contarCarbonos, detectarRamificacao,
  identificarFuncoes, classificarAlcoois, possuiAlcoolPrimario, possuiAlcoolSecundario,
} from './game/ValidadorEstrutura.js';
