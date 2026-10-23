import { create } from 'zustand/react';
import { trackEvent } from './posthog';

export type GameId = 
  | 'cornerstone'
  | 'sequence'
  | 'traitors'
  | 'uno'
  | 'imposter'
  | 'ludo'
  | 'snakes'
  | 'wordgame'
  | 'tambola'
  | 'bingo';

export interface GameMetadata {
  id: GameId;
  title: string;
  category: 'Strategy' | 'Social Deduction' | 'Card Game' | 'Classic' | 'Party';
  icon: string;
  badge?: string;
  minPlayers: number;
  maxPlayers: number;
  description: string;
  bannerGradient: string;
  rating: number;
  plays: string;
}

export const GAME_CATALOG: GameMetadata[] = [
  {
    id: 'cornerstone',
    title: 'Business Tycoons',
    category: 'Strategy',
    icon: '🏙️',
    badge: 'Popular',
    minPlayers: 2,
    maxPlayers: 8,
    description: 'High-stakes metropolitan property trading with dynamic markets and 18+ custom boards.',
    bannerGradient: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    rating: 4.9,
    plays: '124K',
  },
  {
    id: 'tambola',
    title: 'Tambola (Housie)',
    category: 'Party',
    icon: '🎟️',
    badge: 'Hot Party',
    minPlayers: 2,
    maxPlayers: 12,
    description: 'Authentic 3x9 Indian Housie ticket game. Call numbers 1-90, dab tiles, and claim Early 5, Lines, & Full House!',
    bannerGradient: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
    rating: 4.9,
    plays: '185K',
  },
  {
    id: 'bingo',
    title: 'Bingo 75 Champions',
    category: 'Classic',
    icon: '🎱',
    badge: 'Classic 5x5',
    minPlayers: 2,
    maxPlayers: 12,
    description: 'Classic 5x5 B-I-N-G-O grid with center FREE space. Form horizontal, vertical, diagonal lines, and 4 corners!',
    bannerGradient: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    rating: 4.8,
    plays: '142K',
  },
  {
    id: 'uno',
    title: 'Color Blitz (One Card)',
    category: 'Card Game',
    icon: '🃏',
    badge: 'Fast',
    minPlayers: 2,
    maxPlayers: 8,
    description: 'Color & number matching card battle. Draw 4, reverse, skip, and call ONE to win!',
    bannerGradient: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
    rating: 4.8,
    plays: '98K',
  },
  {
    id: 'ludo',
    title: 'Ludo Superstars',
    category: 'Classic',
    icon: '🎲',
    badge: 'Classic',
    minPlayers: 2,
    maxPlayers: 4,
    description: 'Race your four tokens from base to home. Cut opponent tokens and rule the board.',
    bannerGradient: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
    rating: 4.7,
    plays: '150K',
  },
  {
    id: 'snakes',
    title: 'Snakes & Ladders',
    category: 'Classic',
    icon: '🐍',
    badge: 'Family',
    minPlayers: 2,
    maxPlayers: 6,
    description: 'Climb lucky ladders to the 100th tile while dodging treacherous snakes on the board.',
    bannerGradient: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    rating: 4.6,
    plays: '85K',
  },
  {
    id: 'imposter',
    title: 'Imposter Party',
    category: 'Social Deduction',
    icon: '🕵️',
    badge: 'Viral',
    minPlayers: 4,
    maxPlayers: 10,
    description: 'One secret imposter among the crew. Give subtle clues, vote out the bluffer, or guess the secret word!',
    bannerGradient: 'linear-gradient(135deg, #f43f5e 0%, #8b5cf6 100%)',
    rating: 4.9,
    plays: '110K',
  },
  {
    id: 'traitors',
    title: 'Castle of Betrayal',
    category: 'Social Deduction',
    icon: '🗡️',
    badge: '18+ / Spicy',
    minPlayers: 4,
    maxPlayers: 12,
    description: 'Trust no one. Faithfuls build the prize pot by day while Saboteurs eliminate in secret by night.',
    bannerGradient: 'linear-gradient(135deg, #831843 0%, #1e1b4b 100%)',
    rating: 4.9,
    plays: '74K',
  },
  {
    id: 'sequence',
    title: 'Series Five Masters',
    category: 'Strategy',
    icon: '🎯',
    badge: 'Tactical',
    minPlayers: 2,
    maxPlayers: 6,
    description: 'Play playing cards from your hand to place chips on the matching board. Connect 5 in a row!',
    bannerGradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    rating: 4.7,
    plays: '62K',
  },
  {
    id: 'wordgame',
    title: 'Name Place Animal Thing',
    category: 'Party',
    icon: '📝',
    badge: 'Party',
    minPlayers: 2,
    maxPlayers: 8,
    description: 'Spitfire alphabet trivia challenge! Fill out Name, Place, Animal, and Thing before timer runs out.',
    bannerGradient: 'linear-gradient(135deg, #eab308 0%, #ef4444 100%)',
    rating: 4.8,
    plays: '92K',
  },
];

interface HubStoreState {
  activeGame: GameId;
  view: 'dashboard' | 'game';
  searchQuery: string;
  selectedCategory: string;
  showPublicRoomsModal: boolean;
  setActiveGame: (game: GameId) => void;
  setView: (view: 'dashboard' | 'game') => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
  setShowPublicRoomsModal: (show: boolean) => void;
}

export const useHubStore = create<HubStoreState>((set) => ({
  activeGame: 'cornerstone',
  view: 'dashboard', // default to arcade dashboard so user lands on dashboard first
  searchQuery: '',
  selectedCategory: 'All',
  showPublicRoomsModal: false,

  setActiveGame: (game: GameId) => {
    trackEvent('game_selected', { gameId: game });
    set({ activeGame: game, view: 'game' });
  },
  setView: (view: 'dashboard' | 'game') => set({ view }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedCategory: (cat: string) => set({ selectedCategory: cat }),
  setShowPublicRoomsModal: (show: boolean) => set({ showPublicRoomsModal: show }),
}));

if (typeof window !== 'undefined') {
  (window as any).useHubStore = useHubStore;
}

