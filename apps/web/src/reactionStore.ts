import { create } from 'zustand/react';

export interface FloatingReaction {
  id: string;
  emoji: string;
  text: string | undefined;
  senderName: string;
  senderAvatar: string;
  stage: number;
}

export interface ReactionStoreState {
  reactions: FloatingReaction[];
  triggerReaction: (
    emoji: string,
    text?: string,
    senderName?: string,
    senderAvatar?: string
  ) => void;
  clearOldReactions: () => void;
}

export const useReactionStore = create<ReactionStoreState>((set) => ({
  reactions: [],

  triggerReaction: (
    emoji: string,
    text?: string,
    senderName = 'You',
    senderAvatar = '👑'
  ) => {
    const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newReaction: FloatingReaction = {
      id,
      emoji,
      text,
      senderName,
      senderAvatar,
      stage: 0,
    };

    set((state) => ({
      reactions: [...state.reactions, newReaction],
    }));

    setTimeout(() => {
      set((state) => ({
        reactions: state.reactions.filter((r) => r.id !== id),
      }));
    }, 3500);
  },

  clearOldReactions: () => {
    // Individual timeouts handle cleanup automatically
  },
}));

export const reactionStore = useReactionStore;
