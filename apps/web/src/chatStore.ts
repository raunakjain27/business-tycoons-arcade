import { create } from 'zustand';
import { soundFx } from './soundEffects';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isShoutout?: boolean;
}

export const QUICK_SHOUTOUTS = [
  '🍀 Good luck!',
  '🎲 Nice roll!',
  '💥 Ouch!',
  '🤝 Trade with me?',
  '⏳ Hurry up!',
  '😱 No way!',
  '👑 GG!',
  '🚀 Let\'s go!',
  '💸 Big spender!',
  '🏛️ Monopolized!',
];

interface ChatStoreState {
  isOpen: boolean;
  unreadCount: number;
  messages: ChatMessage[];
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (text: string, isShoutout?: boolean, senderInfo?: { id?: string; name?: string; avatar?: string; color?: string }) => void;
  addSystemMessage: (text: string) => void;
  clearMessages: () => void;
}

const chatSyncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('tycoons_arcade_chat_sync')
  : null;

const BOT_BANTER_LIST = [
  'I have my eyes on the Boardwalk! 🏙️',
  'Don\'t you dare land on my hotels! 💥',
  'Who wants to make a deal? 🤝',
  'Double dice baby! Let\'s go! 🎲',
  'Ouch, that audit stung a bit! 😬',
  'Playing for keeps this round! 👑',
];

export const useChatStore = create<ChatStoreState>((set, get) => {
  // Listen for messages from other player tabs
  if (chatSyncChannel) {
    chatSyncChannel.onmessage = (event) => {
      if (event.data?.type === 'NEW_CHAT_MESSAGE' && event.data?.message) {
        const msg: ChatMessage = event.data.message;
        set((state) => ({
          messages: [...state.messages, msg],
          unreadCount: state.isOpen ? 0 : state.unreadCount + 1,
        }));
        soundFx.playChime();
      }
    };
  }

  const initialMessages: ChatMessage[] = [
    {
      id: 'sys-welcome',
      senderId: 'system',
      senderName: 'SYSTEM',
      senderAvatar: '⚡',
      senderColor: '#00f0ff',
      text: 'Tactical Arena Comms Link established. Broadcast chat or use preset tactical shoutouts.',
      timestamp: Date.now() - 30000,
      isSystem: true,
    },
    {
      id: 'bot-greeting',
      senderId: 'bot-1',
      senderName: 'Atlas Bot',
      senderAvatar: '🚀',
      senderColor: '#3b82f6',
      text: 'Good luck everyone! Let the best tycoon win 🏆',
      timestamp: Date.now() - 15000,
      isShoutout: true,
    },
  ];

  return {
    isOpen: false,
    unreadCount: 0,
    messages: initialMessages,

    toggleChat: () => {
      const nextOpen = !get().isOpen;
      set({ isOpen: nextOpen, unreadCount: nextOpen ? 0 : get().unreadCount });
    },

    openChat: () => set({ isOpen: true, unreadCount: 0 }),
    closeChat: () => set({ isOpen: false }),

    sendMessage: (text: string, isShoutout = false, senderInfo) => {
      const cleanText = text.trim();
      if (!cleanText) return;

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderId: senderInfo?.id || 'player-1',
        senderName: senderInfo?.name || 'You',
        senderAvatar: senderInfo?.avatar || '👑',
        senderColor: senderInfo?.color || '#ec4899',
        text: cleanText,
        timestamp: Date.now(),
        isShoutout,
      };

      set((state) => ({
        messages: [...state.messages, newMsg],
      }));

      // Broadcast to other tabs
      try {
        chatSyncChannel?.postMessage({ type: 'NEW_CHAT_MESSAGE', message: newMsg });
      } catch (err) {
        console.error('Chat broadcast error:', err);
      }

      // Random bot reaction after 1.5s - 3s to keep chat active and engaging
      if (Math.random() > 0.45) {
        setTimeout(() => {
          const randomBanter = BOT_BANTER_LIST[Math.floor(Math.random() * BOT_BANTER_LIST.length)];
          const botMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            senderId: 'bot-atlas',
            senderName: 'Atlas Bot',
            senderAvatar: '🚀',
            senderColor: '#3b82f6',
            text: randomBanter,
            timestamp: Date.now(),
            isShoutout: true,
          };
          set((state) => ({
            messages: [...state.messages, botMsg],
            unreadCount: state.isOpen ? 0 : state.unreadCount + 1,
          }));
          soundFx.playChime();
          try {
            chatSyncChannel?.postMessage({ type: 'NEW_CHAT_MESSAGE', message: botMsg });
          } catch (_) {}
        }, 1800);
      }
    },

    addSystemMessage: (text: string) => {
      const sysMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'ARENA',
        senderAvatar: '⚡',
        senderColor: '#00f0ff',
        text,
        timestamp: Date.now(),
        isSystem: true,
      };
      set((state) => ({
        messages: [...state.messages, sysMsg],
      }));
    },

    clearMessages: () => set({ messages: [] }),
  };
});
