'use client';

import { useGameStore } from '@/stores/gameStore';

export function useGameState() {
  return useGameStore((state) => state.gameState);
}
