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

export const TACTICAL_CALLOUTS = [
  'TRADE REQUEST',
  'COUNTER-OFFER',
  'WELL PLAYED',
  'HIGH STAKES',
  'CAREFUL HERE',
  'AFFIRMATIVE',
  'DECLINED',
  'GOOD MATCH',
  'PRESSURE ON',
  'NEGOTIATE',
];

export const QUICK_SHOUTOUTS = TACTICAL_CALLOUTS;

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
  'Monitoring high-yield properties across this district.',
  'Careful stepping into developed sectors.',
  'Trading desk open for strategic asset exchanges.',
  'Strong liquidity position established.',
  'Analyzing monopoly formations along this corridor.',
  'I have a strategic trade proposal pending review.',
  'Every property has a valuation—make your offer.',
  'Pacing investments carefully this round.',
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
      senderAvatar: 'SYS',
      senderColor: '#00f0ff',
      text: 'Tactical Arena Comms link established. Transmit strategic messages or tactical callouts.',
      timestamp: Date.now() - 30000,
      isSystem: true,
    },
    {
      id: 'bot-greeting',
      senderId: 'bot-1',
      senderName: 'Atlas Bot',
      senderAvatar: 'AI',
      senderColor: '#38bdf8',
      text: 'Good luck operators. Trading desk is active for the match.',
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
      const cleanText = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\s+/g, ' ').trim();
      if (!cleanText) return;

      const cleanName = (senderInfo?.name || 'You').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() || 'You';
      const cleanAvatar = (senderInfo?.avatar || 'YOU').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() || 'OP';

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderId: senderInfo?.id || 'player-1',
        senderName: cleanName,
        senderAvatar: cleanAvatar,
        senderColor: senderInfo?.color || '#00f0ff',
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

      // Random bot reaction after 2s - 3.5s to keep chat active and engaging
      if (Math.random() > 0.45) {
        setTimeout(() => {
          const randomBanter = BOT_BANTER_LIST[Math.floor(Math.random() * BOT_BANTER_LIST.length)];
          const botMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            senderId: 'bot-atlas',
            senderName: 'Atlas Bot',
            senderAvatar: 'AI',
            senderColor: '#38bdf8',
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
        }, 2200);
      }
    },

    addSystemMessage: (text: string) => {
      const cleanText = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\s+/g, ' ').trim();
      const sysMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'ARENA',
        senderAvatar: 'SYS',
        senderColor: '#00f0ff',
        text: cleanText,
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
