import { create } from 'zustand';

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  avatar: string;
  color: string;
}

export interface GameRoomState {
  roomCode: string;
  isPrivate: boolean;
  allowBots: boolean;
  players: RoomPlayer[];
  maxPlayers: number;
  minPlayers: number;
  isGameStarted: boolean;
}

interface RoomStore {
  rooms: Record<string, GameRoomState>;
  getOrCreateRoom: (gameId: string, hostName: string, maxPlayers?: number, minPlayers?: number) => GameRoomState;
  toggleAllowBots: (gameId: string) => void;
  addPlayer: (gameId: string, name: string, isBot?: boolean) => void;
  removePlayer: (gameId: string, playerId: string) => void;
  startGame: (gameId: string) => void;
  resetGameRoom: (gameId: string) => void;
  generateNewRoomCode: (gameId: string) => string;
}

const DEFAULT_AVATARS = ['👑', '🦊', '🐯', '🐼', '🦁', '🦄', '🐲', '🚀', '⚡', '🔥'];
const DEFAULT_COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#a855f7'];

export const useGameRoomStore = create<RoomStore>((set, get) => ({
  rooms: {},

  getOrCreateRoom: (gameId, hostName, maxPlayers = 8, minPlayers = 2) => {
    const existing = get().rooms[gameId];
    if (existing) return existing;

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRoom: GameRoomState = {
      roomCode: code,
      isPrivate: true,
      allowBots: true,
      maxPlayers,
      minPlayers,
      isGameStarted: false,
      players: [
        {
          id: 'player-1',
          name: hostName || 'You (Host)',
          isHost: true,
          isBot: false,
          avatar: '👑',
          color: DEFAULT_COLORS[0],
        },
      ],
    };

    set((state) => ({
      rooms: { ...state.rooms, [gameId]: newRoom },
    }));

    return newRoom;
  },

  toggleAllowBots: (gameId) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      const newAllowBots = !room.allowBots;
      let updatedPlayers = [...room.players];
      if (!newAllowBots) {
        // remove existing bots
        updatedPlayers = updatedPlayers.filter((p) => !p.isBot);
      }
      return {
        rooms: {
          ...state.rooms,
          [gameId]: {
            ...room,
            allowBots: newAllowBots,
            players: updatedPlayers,
          },
        },
      };
    });
  },

  addPlayer: (gameId, name, isBot = false) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room || room.players.length >= room.maxPlayers) return state;
      const idx = room.players.length;
      const newPlayer: RoomPlayer = {
        id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: name || (isBot ? `Bot ${idx} 🤖` : `Friend ${idx}`),
        isHost: false,
        isBot,
        avatar: isBot ? '🤖' : DEFAULT_AVATARS[idx % DEFAULT_AVATARS.length],
        color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      };
      return {
        rooms: {
          ...state.rooms,
          [gameId]: {
            ...room,
            players: [...room.players, newPlayer],
          },
        },
      };
    });
  },

  removePlayer: (gameId, playerId) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      return {
        rooms: {
          ...state.rooms,
          [gameId]: {
            ...room,
            players: room.players.filter((p) => p.id !== playerId),
          },
        },
      };
    });
  },

  startGame: (gameId) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      return {
        rooms: {
          ...state.rooms,
          [gameId]: {
            ...room,
            isGameStarted: true,
          },
        },
      };
    });
  },

  resetGameRoom: (gameId) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      return {
        rooms: {
          ...state.rooms,
          [gameId]: {
            ...room,
            isGameStarted: false,
          },
        },
      };
    });
  },

  generateNewRoomCode: (gameId) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      return {
        rooms: {
          ...state.rooms,
          [gameId]: {
            ...room,
            roomCode: code,
          },
        },
      };
    });
    return code;
  },
}));
