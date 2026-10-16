import { create } from 'zustand';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  avatar: string;
  isVip: boolean; // Unlocks 18+ After Dark, Custom Friends, VIP pegs, and removes ads
  coins: number; // In-app currency for microtransactions
  unlockedBoards: string[];
  unlockedPegs: string[];
  unlockedSoundPacks: string[];
  activeSoundPack: string; // 'arcade' | 'lasvegas' | 'retro8bit' | 'cyberpunk'
  unlockedCelebrations: string[];
  activeCelebration: string; // 'confetti' | 'fireworks' | 'moneyrain' | 'neonwaves'
  friendNames: string[]; // For custom 18+ friends board
  dailyStreak: number;
  lastClaimDate?: string;
  gamesWon: number;
  level: number;
  xp: number;
  maxXp: number;
}

const STORAGE_KEY = 'cornerstone_user_account';

function loadInitialUser(): UserAccount {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        unlockedSoundPacks: ['arcade'],
        activeSoundPack: 'arcade',
        unlockedCelebrations: ['confetti'],
        activeCelebration: 'confetti',
        dailyStreak: 1,
        gamesWon: 0,
        level: 1,
        xp: 120,
        maxXp: 300,
        ...parsed,
      };
    }
  } catch (e) {
    // fallback
  }
  return {
    id: `usr_${Math.random().toString(36).substring(2, 8)}`,
    username: 'Tycoon Boss',
    email: 'player@cornerstone.game',
    avatar: '👑',
    isVip: false,
    coins: 500,
    unlockedBoards: ['default', 'india', 'usa', 'uk', 'uae', 'mixed'],
    unlockedPegs: ['alien', 'rocket', 'car', 'jet', 'cat', 'robot'],
    unlockedSoundPacks: ['arcade'],
    activeSoundPack: 'arcade',
    unlockedCelebrations: ['confetti'],
    activeCelebration: 'confetti',
    dailyStreak: 1,
    gamesWon: 12,
    level: 1,
    xp: 120,
    maxXp: 300,
    friendNames: [
      'Rohan', 'Sneha', 'Kabir', 'Ananya', 'Aarav',
      'Pooja', 'Vikram', 'Tara', 'Aditya', 'Neha',
      'Rahul', 'Rhea', 'Arjun', 'Simran', 'Karan',
      'Meera', 'Zayn', 'Isha', 'Dev', 'Alia', 'Samir', 'Kavya'
    ],
  };
}

export interface UserStoreState {
  user: UserAccount;
  showAccountModal: boolean;
  showCustomFriendsModal: boolean;
  showStoreModal: boolean;
  showDailyModal: boolean;
  showRulesModal: boolean;
  rulesGameId: string;
  setShowAccountModal: (show: boolean) => void;
  setShowCustomFriendsModal: (show: boolean) => void;
  setShowStoreModal: (show: boolean) => void;
  setShowDailyModal: (show: boolean) => void;
  openRulesModal: (gameId?: string) => void;
  closeRulesModal: () => void;
  updateUsername: (name: string) => void;
  updateAvatar: (avatar: string) => void;
  updateFriendNames: (names: string[]) => void;
  upgradeToVip: () => void;
  addCoins: (amount: number) => void;
  addXp: (amount: number) => { leveledUp: boolean; newLevel: number };
  claimDailyReward: () => { success: boolean; reward: number; streak: number };
  unlockItem: (type: 'board' | 'peg' | 'sound' | 'celebration', id: string, cost: number) => boolean;
  setActiveSoundPack: (id: string) => void;
  setActiveCelebration: (id: string) => void;
  recordGameWin: () => void;
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  user: loadInitialUser(),
  showAccountModal: false,
  showCustomFriendsModal: false,
  showStoreModal: false,
  showDailyModal: false,
  showRulesModal: false,
  rulesGameId: 'cornerstone',

  setShowAccountModal: (show: boolean) => set({ showAccountModal: show }),
  setShowCustomFriendsModal: (show: boolean) => set({ showCustomFriendsModal: show }),
  setShowStoreModal: (show: boolean) => set({ showStoreModal: show }),
  setShowDailyModal: (show: boolean) => set({ showDailyModal: show }),
  openRulesModal: (gameId?: string) => set({ showRulesModal: true, rulesGameId: gameId || 'cornerstone' }),
  closeRulesModal: () => set({ showRulesModal: false }),

  addXp: (amount: number) => {
    const { user } = get();
    let currentXp = user.xp + amount;
    let currentLevel = user.level;
    let currentMaxXp = user.maxXp;
    let leveledUp = false;

    while (currentXp >= currentMaxXp) {
      currentXp -= currentMaxXp;
      currentLevel += 1;
      currentMaxXp = Math.round(currentMaxXp * 1.35);
      leveledUp = true;
    }

    const updated = { ...user, xp: currentXp, level: currentLevel, maxXp: currentMaxXp };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ user: updated });
    return { leveledUp, newLevel: currentLevel };
  },

  updateUsername: (name: string) => {
    const user = { ...get().user, username: name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  updateAvatar: (avatar: string) => {
    const user = { ...get().user, avatar };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  updateFriendNames: (names: string[]) => {
    const user = { ...get().user, friendNames: names };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  addCoins: (amount: number) => {
    const user = { ...get().user, coins: get().user.coins + amount };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  recordGameWin: () => {
    get().addXp(150);
    const user = { ...get().user, gamesWon: (get().user.gamesWon || 0) + 1, coins: get().user.coins + 100 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  claimDailyReward: () => {
    const today = new Date().toISOString().slice(0, 10);
    const { user } = get();
    if (user.lastClaimDate === today) {
      return { success: false, reward: 0, streak: user.dailyStreak };
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = user.lastClaimDate === yesterday ? user.dailyStreak + 1 : 1;
    const baseReward = 100;
    const streakBonus = Math.min(newStreak * 25, 250);
    const totalReward = baseReward + streakBonus;

    const updatedUser = {
      ...user,
      coins: user.coins + totalReward,
      dailyStreak: newStreak,
      lastClaimDate: today,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    set({ user: updatedUser });
    return { success: true, reward: totalReward, streak: newStreak };
  },

  upgradeToVip: () => {
    const user = {
      ...get().user,
      isVip: true,
      coins: get().user.coins + 1000,
      unlockedBoards: [...new Set([...get().user.unlockedBoards, 'afterdark', 'customfriends', 'dubai', 'tokyo'])],
      unlockedPegs: [...new Set([...get().user.unlockedPegs, 'crown', 'diamond', 'fire', 'ghost', 'shark', 'yacht', 'goldentrophy', 'neonstar'])],
      unlockedSoundPacks: [...new Set([...get().user.unlockedSoundPacks, 'arcade', 'lasvegas', 'retro8bit', 'cyberpunk'])],
      unlockedCelebrations: [...new Set([...get().user.unlockedCelebrations, 'confetti', 'fireworks', 'moneyrain', 'neonwaves'])],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  setActiveSoundPack: (id: string) => {
    const user = { ...get().user, activeSoundPack: id };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  setActiveCelebration: (id: string) => {
    const user = { ...get().user, activeCelebration: id };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  unlockItem: (type: 'board' | 'peg' | 'sound' | 'celebration', id: string, cost: number) => {
    const { user } = get();
    if (user.coins < cost) return false;
    const updatedUser = {
      ...user,
      coins: user.coins - cost,
      unlockedBoards: type === 'board' ? [...new Set([...user.unlockedBoards, id])] : user.unlockedBoards,
      unlockedPegs: type === 'peg' ? [...new Set([...user.unlockedPegs, id])] : user.unlockedPegs,
      unlockedSoundPacks: type === 'sound' ? [...new Set([...user.unlockedSoundPacks, id])] : user.unlockedSoundPacks,
      unlockedCelebrations: type === 'celebration' ? [...new Set([...user.unlockedCelebrations, id])] : user.unlockedCelebrations,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    set({ user: updatedUser });
    return true;
  },
}));
