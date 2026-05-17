'use client';

import { getLegalActions } from '@river/engine';
import { useGameStore } from '@/stores/gameStore';

export function useLegalActions() {
  return useGameStore((state) => state.gameState ? getLegalActions(state.gameState) : null);
}
