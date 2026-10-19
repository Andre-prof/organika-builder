import { useStore } from 'zustand';
import { criarGameStore } from './gameStore.js';

export const gameStore = criarGameStore();
export function useGameStore(selector) { return useStore(gameStore, selector); }
