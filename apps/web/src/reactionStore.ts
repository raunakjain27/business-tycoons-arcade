import { create } from 'zustand';
import { soundFx } from './soundEffects';

export interface FloatingReaction {
  id: string;
  emoji: string;
  text?: string;
  senderName: string;
  senderAvatar: string;
  timestamp: number;
}

interface ReactionStoreState {
  reactions: FloatingReaction[];
  triggerReaction: (emoji: string, text?: string, senderName?: string, senderAvatar?: string) => void;
  clearOldReactions: () => void;
}

// Cross-tab broadcast channel for reactions
const REACTION_CHANNEL_NAME = 'tycoons_arcade_reactions';
let reactionChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    reactionChannel = new BroadcastChannel(REACTION_CHANNEL_NAME);
  } catch (e) {
    // fallback
  }
}

export const useReactionStore = create<ReactionStoreState>((set, get) => {
  if (reactionChannel) {
    reactionChannel.onmessage = (event) => {
      if (event.data?.type === 'NEW_REACTION' && event.data.reaction) {
        soundFx.playCardSpecial();
        set((state) => ({
          reactions: [...state.reactions.slice(-9), event.data.reaction],
        }));
      }
    };
  }

  return {
    reactions: [],

    triggerReaction: (emoji: string, text?: string, senderName: string = 'You', senderAvatar: string = '👑') => {
      soundFx.playCardSpecial();
      const reaction: FloatingReaction = {
        id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        emoji,
        text,
        senderName,
        senderAvatar,
        timestamp: Date.now(),
      };

      set((state) => ({
        reactions: [...state.reactions.slice(-9), reaction],
      }));

      // Broadcast to other tabs
      try {
        reactionChannel?.postMessage({
          type: 'NEW_REACTION',
          reaction,
        });
      } catch (e) {
        // channel error fallback
      }
    },

    clearOldReactions: () => {
      const now = Date.now();
      set((state) => ({
        reactions: state.reactions.filter((r) => now - r.timestamp < 3500),
      }));
    },
  };
});
