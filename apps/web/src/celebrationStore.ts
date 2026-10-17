import { create } from 'zustand';
import { soundFx } from './soundEffects';
import { useUserStore } from './userStore';
import { trackEvent } from './posthog';

export interface VictoryData {
  gameTitle: string;
  winnerName: string;
  winnerAvatar: string;
  rank?: number;
  coinsAwarded: number;
  xpAwarded: number;
  reason?: string;
  scores?: { name: string; avatar: string; score: number | string; rank: number }[];
}

interface CelebrationStoreState {
  isOpen: boolean;
  data: VictoryData | null;
  triggerVictory: (data: VictoryData) => void;
  closeCelebration: () => void;
}

export const useCelebrationStore = create<CelebrationStoreState>((set) => ({
  isOpen: false,
  data: null,

  triggerVictory: (data: VictoryData) => {
    soundFx.playVictory();
    soundFx.playFanfare();

    // Automatically award coins & XP in userStore
    if (data.coinsAwarded > 0) {
      useUserStore.getState().addCoins(data.coinsAwarded);
    }
    if (data.xpAwarded > 0) {
      useUserStore.getState().addXp(data.xpAwarded);
    }

    trackEvent('game_victory_celebration', {
      gameTitle: data.gameTitle,
      winnerName: data.winnerName,
      winnerAvatar: data.winnerAvatar,
      coinsAwarded: data.coinsAwarded,
      xpAwarded: data.xpAwarded,
      reason: data.reason,
    });

    set({ isOpen: true, data });
  },

  closeCelebration: () => {
    set({ isOpen: false, data: null });
  },
}));
