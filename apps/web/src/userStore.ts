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
  friendNames: string[]; // For custom 18+ friends board
}

const STORAGE_KEY = 'cornerstone_user_account';

function loadInitialUser(): UserAccount {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {
    id: `usr_${Math.random().toString(36).substring(2, 8)}`,
    username: 'My Daddy',
    email: 'player@cornerstone.game',
    avatar: '👾',
    isVip: false,
    coins: 250,
    unlockedBoards: ['default', 'india', 'usa', 'uk', 'uae', 'mixed'],
    unlockedPegs: ['alien', 'rocket', 'car', 'jet', 'cat', 'robot'],
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
  setShowAccountModal: (show: boolean) => void;
  setShowCustomFriendsModal: (show: boolean) => void;
  updateUsername: (name: string) => void;
  updateAvatar: (avatar: string) => void;
  updateFriendNames: (names: string[]) => void;
  upgradeToVip: () => void;
  unlockItem: (type: 'board' | 'peg', id: string, cost: number) => boolean;
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  user: loadInitialUser(),
  showAccountModal: false,
  showCustomFriendsModal: false,

  setShowAccountModal: (show: boolean) => set({ showAccountModal: show }),
  setShowCustomFriendsModal: (show: boolean) => set({ showCustomFriendsModal: show }),

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

  upgradeToVip: () => {
    const user = {
      ...get().user,
      isVip: true,
      unlockedBoards: [...new Set([...get().user.unlockedBoards, 'afterdark', 'customfriends'])],
      unlockedPegs: [...new Set([...get().user.unlockedPegs, 'crown', 'diamond', 'fire', 'ghost', 'shark', 'yacht'])],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  unlockItem: (type: 'board' | 'peg', id: string, cost: number) => {
    const { user } = get();
    if (user.coins < cost) return false;
    const updatedUser = {
      ...user,
      coins: user.coins - cost,
      unlockedBoards: type === 'board' ? [...user.unlockedBoards, id] : user.unlockedBoards,
      unlockedPegs: type === 'peg' ? [...user.unlockedPegs, id] : user.unlockedPegs,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    set({ user: updatedUser });
    return true;
  },
}));
