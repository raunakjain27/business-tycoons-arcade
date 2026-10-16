import { create } from 'zustand';
import { soundFx } from './soundEffects';
import { useUserStore } from './userStore';

export interface Trophy {
  id: string;
  title: string;
  game: string;
  icon: string;
  desc: string;
  rewardCoins: number;
  rewardXp: number;
  unlocked: boolean;
  claimed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  title: string;
  value: string | number;
  badge?: string;
  isCurrentUser?: boolean;
}

interface TrophyStoreState {
  showLeaderboardModal: boolean;
  activeTab: 'leaderboard' | 'trophies';
  trophies: Trophy[];
  setShowLeaderboardModal: (show: boolean) => void;
  setActiveTab: (tab: 'leaderboard' | 'trophies') => void;
  unlockTrophy: (trophyId: string) => void;
  claimTrophyReward: (trophyId: string) => boolean;
}

const STORAGE_KEY = 'cornerstone_arcade_trophies';

const INITIAL_TROPHIES: Trophy[] = [
  {
    id: 'monopoly_king',
    title: 'Monopoly King',
    game: 'Business Tycoons',
    icon: '👑',
    desc: 'Own 3 complete color districts simultaneously.',
    rewardCoins: 250,
    rewardXp: 200,
    unlocked: true,
    claimed: true,
  },
  {
    id: 'full_house_hero',
    title: 'Full House Hero',
    game: 'Tambola',
    icon: '🎟️',
    desc: 'Dab all 15 numbers on your ticket and win Full House.',
    rewardCoins: 300,
    rewardXp: 250,
    unlocked: false,
    claimed: false,
  },
  {
    id: 'high_roller',
    title: 'High Roller',
    game: 'Business Tycoons',
    icon: '🎲',
    desc: 'Roll doubles 2 times in a single turn without going to audit.',
    rewardCoins: 150,
    rewardXp: 120,
    unlocked: true,
    claimed: false,
  },
  {
    id: 'color_clash_master',
    title: 'Color Clash Master',
    game: 'UNO',
    icon: '🌈',
    desc: 'Play a Wild Draw 4 card and call UNO on your next turn.',
    rewardCoins: 200,
    rewardXp: 180,
    unlocked: false,
    claimed: false,
  },
  {
    id: 'ludo_striker',
    title: 'Ludo Royale Striker',
    game: 'Ludo',
    icon: '⚔️',
    desc: 'Capture 3 opponent tokens in a single match.',
    rewardCoins: 200,
    rewardXp: 150,
    unlocked: true,
    claimed: false,
  },
  {
    id: 'ladder_climber',
    title: 'Ladder Climber',
    game: 'Snakes & Ladders',
    icon: '🪜',
    desc: 'Climb 3 ladders in a single match.',
    rewardCoins: 150,
    rewardXp: 100,
    unlocked: false,
    claimed: false,
  },
  {
    id: 'castle_survivor',
    title: 'Castle Survivor',
    game: 'The Traitors',
    icon: '🏰',
    desc: 'Survive until the final roundtable and banish a traitor.',
    rewardCoins: 350,
    rewardXp: 300,
    unlocked: false,
    claimed: false,
  },
  {
    id: 'sherlock_holmes',
    title: 'Sherlock Holmes',
    game: "Who's The Imposter?",
    icon: '🕵️',
    desc: 'Correctly identify the imposter on Round 1.',
    rewardCoins: 250,
    rewardXp: 200,
    unlocked: false,
    claimed: false,
  },
  {
    id: 'lexicon_legend',
    title: 'Lexicon Legend',
    game: 'Word Master',
    icon: '🔤',
    desc: 'Fill all 4 word categories before 20s remaining.',
    rewardCoins: 150,
    rewardXp: 120,
    unlocked: false,
    claimed: false,
  },
  {
    id: 'sequence_sniper',
    title: 'Sequence Sniper',
    game: 'Sequence',
    icon: '🎯',
    desc: 'Complete 5 chips in a row using a corner wildcard.',
    rewardCoins: 200,
    rewardXp: 150,
    unlocked: false,
    claimed: false,
  },
  {
    id: 'bingo_master',
    title: 'Bingo Master',
    game: 'Bingo Blitz',
    icon: '🎱',
    desc: 'Complete a diagonal Bingo crossing the center FREE space.',
    rewardCoins: 200,
    rewardXp: 160,
    unlocked: true,
    claimed: true,
  },
  {
    id: 'streak_titan',
    title: 'Streak Titan',
    game: 'Arcade Daily',
    icon: '🔥',
    desc: 'Maintain a 7-day login streak.',
    rewardCoins: 500,
    rewardXp: 400,
    unlocked: false,
    claimed: false,
  },
];

function loadSavedTrophies(): Trophy[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // fallback
  }
  return INITIAL_TROPHIES;
}

export const useTrophyStore = create<TrophyStoreState>((set, get) => ({
  showLeaderboardModal: false,
  activeTab: 'leaderboard',
  trophies: loadSavedTrophies(),

  setShowLeaderboardModal: (show: boolean) => set({ showLeaderboardModal: show }),
  setActiveTab: (tab: 'leaderboard' | 'trophies') => set({ activeTab: tab }),

  unlockTrophy: (trophyId: string) => {
    const updated = get().trophies.map((t) => (t.id === trophyId ? { ...t, unlocked: true } : t));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ trophies: updated });
    soundFx.playVictory();
  },

  claimTrophyReward: (trophyId: string) => {
    const trophy = get().trophies.find((t) => t.id === trophyId);
    if (!trophy || !trophy.unlocked || trophy.claimed) return false;

    soundFx.playCoin();
    useUserStore.getState().addCoins(trophy.rewardCoins);
    useUserStore.getState().addXp(trophy.rewardXp);

    const updated = get().trophies.map((t) => (t.id === trophyId ? { ...t, claimed: true } : t));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ trophies: updated });
    return true;
  },
}));
