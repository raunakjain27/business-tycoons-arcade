import { create } from 'zustand/react';
import { subscribeWithSelector } from 'zustand/middleware';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

/**
 * Floating reaction representation emitted by the overlay.
 */
export interface FloatingReaction {
  id: string;
  emoji: string;
  text: string | undefined;
  senderName: string;
  senderAvatar: string;
  stage: number;
}

/**
 * Shape of the reaction subsystem state.
 */
export type ReactionState = {
  showFloatingEmoji: boolean;
  floatingEmojiMap: Record<string, { id: string; x: number; y: number; text: string; stage: number }>;
  reactionsPalette: string[];
  lastReactionRefKey: string | null;
  // derived
  reactions: FloatingReaction[];
} | null;

export type ReactionStore = {
  getState: () => ReactionState;
  setState: (patch: Partial<ReactionState>, replace?: boolean) => void;
  subscribe: (listener: (state: ReactionState, prevState: ReactionState) => void) => () => void;
};

const TIMEOUT_MS = 3500;

function nowMs(): number {
  return Date.now();
}

/**
 * Singleton reaction store instance.
 */
const reactionStoreInstance = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create<ReactionState>()(
    subscribeWithSelector<ReactionState>()((set, get) => ({
      showFloatingEmoji: true,
      floatingEmojiMap: {},
      reactionsPalette: ['❤️', '🔥', '😂', '🎉', '👏', '💯', '🥳'],
      lastReactionRefKey: null,
      reactions: [],

      triggerReaction: function (
        this: unknown,
        emoji: string,
        text: string | undefined,
        senderName: string,
        senderAvatar: string
      ) {
        const storeGet = (get as AnyFn);
        const state = storeGet();
        if (!state) return;

        const id = `r_${nowMs()}_${Math.random().toString(36).slice(2, 8)}`;
        const stage = 0;

        set((prev) => {
          if (!prev) return { reactions: [], floatingEmojiMap: {}, showFloatingEmoji: true, reactionsPalette: [], lastReactionRefKey: null };
          const map = new Map(Object.entries(prev.floatingEmojiMap));
          map.set(id, { id, x: 0, y: 0, text: text ?? '', stage });
          const entry: FloatingReaction = { id, emoji, text, senderName, senderAvatar, stage };
          return {
            ...prev,
            floatingEmojiMap: Object.fromEntries(map),
            reactions: [...prev.reactions, entry],
          };
        });

        set({ lastReactionRefKey: id });

        setTimeout(() => {
          set((prev) => {
            if (!prev) return prev;
            const map = new Map(Object.entries(prev.floatingEmojiMap));
            map.delete(id);
            return {
              ...prev,
              floatingEmojiMap: Object.fromEntries(map),
              reactions: prev.reactions.filter((r) => r.id !== id),
            };
          });
        }, TIMEOUT_MS);
      },

      clearOldReactions: function () {
        // reactions are cleaned up by their individual timeouts
      },
    }))
  )
) as unknown as {
  getState: () => ReactionState;
  setState: (patch: Partial<ReactionState>, replace?: boolean) => void;
  subscribe: (listener: (state: ReactionState, prevState: ReactionState) => void) => () => void;
  triggerReaction: (emoji: string, text?: string, senderName?: string, senderAvatar?: string) => void;
  clearOldReactions: () => void;
};

export const reactionStore = reactionStoreInstance;

export function createReactionStore(): ReactionStore {
  return reactionStore as unknown as ReactionStore;
}

/**
 * Hook-compatible reaction store facade used by the overlay.
 * Returns the same shape the React hook expects.
 */
export function useReactionStore() {
  const store = reactionStore;
  const state = store.getState();

  return {
    reactions: state?.reactions ?? [],
    triggerReaction: (
      emoji: string,
      text?: string,
      senderName = 'You',
      senderAvatar = '👑'
    ) => {
      store.triggerReaction(emoji, text, senderName, senderAvatar);
    },
    clearOldReactions: () => {
      // no-op: timeouts handle cleanup
    },
  };
}
