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

// Cross-tab / cross-window real-time room synchronizer
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('tycoons_arcade_rooms_sync')
  : null;

function broadcastRooms(rooms: Record<string, GameRoomState>) {
  try {
    syncChannel?.postMessage({ type: 'ROOMS_UPDATE', rooms });
  } catch (err) {
    console.error('BroadcastChannel sync error:', err);
  }
}

export const useGameRoomStore = create<RoomStore>((set, get) => {
  // Listen for room updates across browser tabs/windows
  if (syncChannel) {
    syncChannel.onmessage = (event) => {
      if (event.data?.type === 'ROOMS_UPDATE' && event.data?.rooms) {
        set({ rooms: event.data.rooms });
      }
    };
  }

  return {
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

      const updatedRooms = { ...get().rooms, [gameId]: newRoom };
      set({ rooms: updatedRooms });
      broadcastRooms(updatedRooms);

      return newRoom;
    },


  toggleAllowBots: (gameId) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      const newAllowBots = !room.allowBots;
      let updatedPlayers = [...room.players];
      if (!newAllowBots) {
        updatedPlayers = updatedPlayers.filter((p) => !p.isBot);
      }
      const updatedRooms = {
        ...state.rooms,
        [gameId]: {
          ...room,
          allowBots: newAllowBots,
          players: updatedPlayers,
        },
      };
      broadcastRooms(updatedRooms);
      return { rooms: updatedRooms };
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
      const updatedRooms = {
        ...state.rooms,
        [gameId]: {
          ...room,
          players: [...room.players, newPlayer],
        },
      };
      broadcastRooms(updatedRooms);
      return { rooms: updatedRooms };
    });
  },

  removePlayer: (gameId, playerId) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      const updatedRooms = {
        ...state.rooms,
        [gameId]: {
          ...room,
          players: room.players.filter((p) => p.id !== playerId),
        },
      };
      broadcastRooms(updatedRooms);
      return { rooms: updatedRooms };
    });
  },

  startGame: (gameId) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      const updatedRooms = {
        ...state.rooms,
        [gameId]: {
          ...room,
          isGameStarted: true,
        },
      };
      broadcastRooms(updatedRooms);
      return { rooms: updatedRooms };
    });
  },

  resetGameRoom: (gameId) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      const updatedRooms = {
        ...state.rooms,
        [gameId]: {
          ...room,
          isGameStarted: false,
        },
      };
      broadcastRooms(updatedRooms);
      return { rooms: updatedRooms };
    });
  },

  generateNewRoomCode: (gameId) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      const updatedRooms = {
        ...state.rooms,
        [gameId]: {
          ...room,
          roomCode: code,
        },
      };
      broadcastRooms(updatedRooms);
      return { rooms: updatedRooms };
    });
    return code;
  },
}; });

