import { useStore } from 'zustand';
import { criarProgressiveStore } from './progressiveStore.js';

// Navegar entre páginas preserva cada montagem durante a sessão.
export const progressiveStores = {
  intermediario: criarProgressiveStore('intermediario'),
  avancado: criarProgressiveStore('avancado'),
};
export const useProgressiveStore = (nivel) => useStore(progressiveStores[nivel]);
