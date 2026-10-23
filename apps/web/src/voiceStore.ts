import { create } from 'zustand/react';
import { webRTCVoiceManager } from './webrtcVoice';

export interface VoiceUser {
  id: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isSpeaking: boolean;
  canSpeak: boolean; // Turn-gated (e.g. in The Traitors)
  audioLevel: number; // 0 to 100 for visualizer waves
}

interface VoiceStoreState {
  isVoiceConnected: boolean;
  isMicMuted: boolean;
  activeSpeakerId: string | null;
  audioAllowedForUser: boolean;
  turnRestricted: boolean; // whether turn-wise speaking is enforced
  activeTurnSpeakerId: string | null;
  voiceUsers: Record<string, VoiceUser>;

  toggleMic: () => void;
  connectVoice: (initialUsers: { id: string; name: string; avatar: string }[]) => void;
  disconnectVoice: () => void;
  setTurnSpeaker: (userId: string | null) => void;
  setTurnRestricted: (restricted: boolean) => void;
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => ({
  isVoiceConnected: true,
  isMicMuted: false,
  activeSpeakerId: null,
  audioAllowedForUser: true,
  turnRestricted: false,
  activeTurnSpeakerId: null,
  voiceUsers: {},

  toggleMic: () => {
    set((state) => {
      const newMuted = !state.isMicMuted;
      webRTCVoiceManager.setMute(newMuted);

      const updatedUsers = { ...state.voiceUsers };
      if (updatedUsers['player-1']) {
        updatedUsers['player-1'].isMuted = newMuted;
      }
      return { isMicMuted: newMuted, voiceUsers: updatedUsers };
    });
  },

  connectVoice: (initialUsers) => {
    // Attempt real microphone stream initialization
    webRTCVoiceManager.initMicrophone((level) => {
      set((state) => {
        const users = { ...state.voiceUsers };
        if (users['player-1']) {
          users['player-1'].audioLevel = level;
          users['player-1'].isSpeaking = level > 15;
        }
        return { voiceUsers: users, activeSpeakerId: level > 15 ? 'player-1' : null };
      });
    });

    const usersMap: Record<string, VoiceUser> = {};
    initialUsers.forEach((u) => {
      usersMap[u.id] = {
        id: u.id,
        name: u.name,
        avatar: u.avatar || '👤',
        isMuted: false,
        isSpeaking: false,
        canSpeak: true,
        audioLevel: 0,
      };
    });

    set({
      isVoiceConnected: true,
      voiceUsers: usersMap,
    });
  },

  disconnectVoice: () => {
    set({ isVoiceConnected: false });
  },

  setTurnRestricted: (restricted) => {
    set({ turnRestricted: restricted });
  },

  setTurnSpeaker: (userId) => {
    set((state) => {
      const updated = { ...state.voiceUsers };
      Object.keys(updated).forEach((id) => {
        // If turn restricted, only the assigned turn speaker can speak!
        updated[id].canSpeak = !state.turnRestricted || id === userId;
      });

      return {
        activeTurnSpeakerId: userId,
        activeSpeakerId: userId,
        audioAllowedForUser: !state.turnRestricted || userId === 'player-1',
        voiceUsers: updated,
      };
    });
  },
}));
