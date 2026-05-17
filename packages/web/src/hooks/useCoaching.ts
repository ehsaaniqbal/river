'use client';

import { useGameStore } from '@/stores/gameStore';

export function useCoaching() {
  return useGameStore((state) => ({
    enabled: state.coachingEnabled,
    advice: state.lastCoachingAdvice,
    toggle: state.toggleCoaching,
  }));
}
