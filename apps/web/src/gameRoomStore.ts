import { create } from 'zustand';

export interface HouseRules {
  startingCash: number;
  paydayAmount: number;
  doubleGoBonus: boolean;
  vacationCash: boolean;
  auctionOnDecline: boolean;
  evenBuild: boolean;
  turnTimerSec: number | null;
  doubleRentFullSet: boolean;
}

export const DEFAULT_HOUSE_RULES: HouseRules = {
  startingCash: 1500,
  paydayAmount: 200,
  doubleGoBonus: true,
  vacationCash: true,
  auctionOnDecline: true,
  evenBuild: true,
  turnTimerSec: 30,
  doubleRentFullSet: true,
};

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
  gameId?: string;
  isPrivate: boolean;
  allowBots: boolean;
  players: RoomPlayer[];
  maxPlayers: number;
  minPlayers: number;
  isGameStarted: boolean;
  houseRules: HouseRules;
  createdAt: number;
}

export interface PublicRoomInfo {
  roomCode: string;
  gameId: string;
  gameTitle: string;
  gameIcon: string;
  category: string;
  hostName: string;
  hostAvatar: string;
  playerCount: number;
  maxPlayers: number;
  status: 'lobby' | 'playing';
  houseRules: HouseRules;
  isPrivate: boolean;
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
  setHouseRules: (gameId: string, rules: Partial<HouseRules>) => void;
  setIsPrivate: (gameId: string, isPrivate: boolean) => void;
  getPublicRooms: () => PublicRoomInfo[];
  joinRoomByCode: (code: string, playerName?: string) => { success: boolean; gameId?: string; message?: string };
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
        gameId,
        isPrivate: false,
        allowBots: true,
        maxPlayers,
        minPlayers,
        isGameStarted: false,
        houseRules: { ...DEFAULT_HOUSE_RULES },
        createdAt: Date.now(),
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

  setHouseRules: (gameId, rules) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      const updatedRules: HouseRules = {
        ...room.houseRules,
        ...rules,
      };
      const updatedRooms = {
        ...state.rooms,
        [gameId]: {
          ...room,
          houseRules: updatedRules,
        },
      };
      broadcastRooms(updatedRooms);
      return { rooms: updatedRooms };
    });
  },

  setIsPrivate: (gameId, isPrivate) => {
    set((state) => {
      const room = state.rooms[gameId];
      if (!room) return state;
      const updatedRooms = {
        ...state.rooms,
        [gameId]: {
          ...room,
          isPrivate,
        },
      };
      broadcastRooms(updatedRooms);
      return { rooms: updatedRooms };
    });
  },

  getPublicRooms: () => {
    const localRooms = get().rooms;
    const publicList: PublicRoomInfo[] = [];

    // 1. Add active local / cross-tab rooms that are not private
    for (const [gid, room] of Object.entries(localRooms)) {
      if (!room.isPrivate) {
        const host = room.players.find((p) => p.isHost) || room.players[0];
        publicList.push({
          roomCode: room.roomCode,
          gameId: gid,
          gameTitle: gid === 'cornerstone' ? 'Business Tycoons' : gid.toUpperCase(),
          gameIcon: gid === 'cornerstone' ? '🏙️' : '🎮',
          category: 'Strategy',
          hostName: host?.name || 'Operator',
          hostAvatar: host?.avatar || '👑',
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
          status: room.isGameStarted ? 'playing' : 'lobby',
          houseRules: room.houseRules || DEFAULT_HOUSE_RULES,
          isPrivate: false,
        });
      }
    }

    // 2. Add rich live community multiplayer arena lobbies (just like Richup's live room directory)
    const mockPublicArenas: PublicRoomInfo[] = [
      {
        roomCode: 'NEO-771',
        gameId: 'cornerstone',
        gameTitle: 'Business Tycoons',
        gameIcon: '🏙️',
        category: 'Strategy',
        hostName: 'ViperCyber 👑',
        hostAvatar: '⚡',
        playerCount: 3,
        maxPlayers: 4,
        status: 'lobby',
        houseRules: {
          startingCash: 1500,
          paydayAmount: 200,
          doubleGoBonus: true,
          vacationCash: true,
          auctionOnDecline: true,
          evenBuild: true,
          turnTimerSec: 30,
          doubleRentFullSet: true,
        },
        isPrivate: false,
      },
      {
        roomCode: 'WALL-800',
        gameId: 'cornerstone',
        gameTitle: 'Business Tycoons',
        gameIcon: '🏙️',
        category: 'Strategy',
        hostName: 'Satoshi_Pro 🚀',
        hostAvatar: '🦊',
        playerCount: 2,
        maxPlayers: 6,
        status: 'lobby',
        houseRules: {
          startingCash: 2000,
          paydayAmount: 300,
          doubleGoBonus: true,
          vacationCash: true,
          auctionOnDecline: true,
          evenBuild: false,
          turnTimerSec: 15,
          doubleRentFullSet: true,
        },
        isPrivate: false,
      },
      {
        roomCode: 'BLITZ-99',
        gameId: 'uno',
        gameTitle: 'Color Blitz (UNO)',
        gameIcon: '🃏',
        category: 'Card Game',
        hostName: 'NeonQueen 💎',
        hostAvatar: '🦄',
        playerCount: 3,
        maxPlayers: 4,
        status: 'playing',
        houseRules: DEFAULT_HOUSE_RULES,
        isPrivate: false,
      },
      {
        roomCode: 'LUDO-404',
        gameId: 'ludo',
        gameTitle: 'Ludo Superstars',
        gameIcon: '🎲',
        category: 'Classic',
        hostName: 'DiceOverlord 🦁',
        hostAvatar: '🦁',
        playerCount: 2,
        maxPlayers: 4,
        status: 'lobby',
        houseRules: DEFAULT_HOUSE_RULES,
        isPrivate: false,
      },
      {
        roomCode: 'BETRAY-12',
        gameId: 'traitors',
        gameTitle: 'Castle of Betrayal',
        gameIcon: '🗡️',
        category: 'Social Deduction',
        hostName: 'VesperShadow 🎭',
        hostAvatar: '🐲',
        playerCount: 5,
        maxPlayers: 8,
        status: 'lobby',
        houseRules: DEFAULT_HOUSE_RULES,
        isPrivate: false,
      },
      {
        roomCode: 'JACKPOT-77',
        gameId: 'tambola',
        gameTitle: 'Tambola (Housie)',
        gameIcon: '🎟️',
        category: 'Party',
        hostName: 'GoldMaster 💰',
        hostAvatar: '🔥',
        playerCount: 6,
        maxPlayers: 12,
        status: 'lobby',
        houseRules: DEFAULT_HOUSE_RULES,
        isPrivate: false,
      },
      {
        roomCode: 'LASER-55',
        gameId: 'bingo',
        gameTitle: 'Bingo 75 Champions',
        gameIcon: '🎱',
        category: 'Classic',
        hostName: 'LuckyStrike 🎯',
        hostAvatar: '🐼',
        playerCount: 4,
        maxPlayers: 10,
        status: 'playing',
        houseRules: DEFAULT_HOUSE_RULES,
        isPrivate: false,
      },
    ];

    // Filter out duplicates if roomCode already exists in local list
    const localCodes = new Set(publicList.map((r) => r.roomCode));
    for (const arena of mockPublicArenas) {
      if (!localCodes.has(arena.roomCode)) {
        publicList.push(arena);
      }
    }

    return publicList;
  },

  joinRoomByCode: (code, playerName = 'Player') => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { success: false, message: 'Please enter a room code.' };

    const rooms = get().rooms;
    // Check if room exists in local store
    for (const [gid, room] of Object.entries(rooms)) {
      if (room.roomCode.toUpperCase() === trimmed) {
        if (room.players.length >= room.maxPlayers) {
          return { success: false, message: 'Room is already full.' };
        }
        get().addPlayer(gid, playerName, false);
        return { success: true, gameId: gid };
      }
    }

    // Check mock public rooms or create a room for that code
    const publicArenas = get().getPublicRooms();
    const matched = publicArenas.find((a) => a.roomCode.toUpperCase() === trimmed);
    const targetGameId = matched ? matched.gameId : 'cornerstone';

    const newRoom = get().getOrCreateRoom(targetGameId, 'Host');
    newRoom.roomCode = trimmed;
    if (matched) {
      newRoom.houseRules = { ...matched.houseRules };
    }
    get().addPlayer(targetGameId, playerName, false);
    return { success: true, gameId: targetGameId };
  },
}; });

