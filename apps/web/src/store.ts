import { create } from 'zustand';
import type { GameState, Action, TileId, PlayerId, GameEvent } from '../../../packages/engine/types';
import { colyseusConnection } from './colyseusClient';
import { createInitialGameState, applyLocalAction, botStep } from './localEngine';
import { EventCardDef } from './boardData';

// ---------------------------------------------------------------------------
// Shared room types picked up by games/ and components/ that need `getOrCreateRoom`.
// This import is shorthand: `useGameRoomStore` is really the Zustand store exported
// below. Keep the signatures in sync with the actual Zustand hooks in this file.
// ---------------------------------------------------------------------------

export type RoomPlayer = {
  id: string;
  name: string;
  avatar?: string;
  isBot?: boolean;
  color?: string;
  isHost?: boolean;
};

export type RoomState = {
  roomCode: string;
  players: RoomPlayer[];
  allowBots: boolean;
  gameId: string;
  gameTitle: string;
  isGameStarted: boolean;
};

export type GameMode = 'local' | 'online';

export interface GameStoreState {
  gameMode: GameMode;
  serverUrl: string;
  boardKey: string;
  roomCode: string | null;
  myPlayerId: PlayerId;
  gameState: GameState | null;
  selectedTile: TileId | null;
  showTradeModal: boolean;
  showInfluenceModal: boolean;
  showAbilityModal: boolean;
  activeEventCard: EventCardDef | null;
  isConnecting: boolean;
  errorMessage: string | null;
  auctionTimeLeft: number | null;

  // Setters & UI controls
  setGameMode: (mode: GameMode) => void;
  setServerUrl: (url: string) => void;
  setBoardKey: (key: string) => void;
  setSelectedTile: (tileId: TileId | null) => void;
  setShowTradeModal: (show: boolean) => void;
  setShowInfluenceModal: (show: boolean) => void;
  setShowAbilityModal: (show: boolean) => void;
  dismissEventCard: () => void;
  clearError: () => void;

  // Game control
  initLocalGame: (
    playerCount?: number,
    playerName?: string,
    roleId?: string,
    singleDiceMode?: boolean,
    startingCash?: number,
    rulesOverride?: Partial<GameState['rules']>,
    pegId?: string
  ) => void;
  connectOnline: (roomName?: string, name?: string, roleId?: string) => Promise<void>;
  disconnect: () => void;
  dispatchAction: (action: Action) => void;

  // Bot step scheduler
  triggerBotTurnIfNeeded: () => void;

  rooms: Record<string, RoomState>;
  getOrCreateRoom: (gameId: string, hostName: string, maxPlayers: number, minPlayers: number) => RoomState;
  addPlayer: (gameId: string, name: string, isBot: boolean) => void;
  resetRooms: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameMode: 'local',
  serverUrl: import.meta.env.VITE_SERVER_URL || 'ws://localhost:2567',
  boardKey: 'default',
  roomCode: null,
  myPlayerId: 'p1',
  gameState: null,
  selectedTile: null,
  showTradeModal: false,
  showInfluenceModal: false,
  showAbilityModal: false,
  activeEventCard: null,
  isConnecting: false,
  errorMessage: null,
  auctionTimeLeft: null,

  setGameMode: (mode: GameMode) => set({ gameMode: mode }),
  setServerUrl: (url: string) => set({ serverUrl: url }),
  setBoardKey: (key: string) => {
    import('./boardData').then(m => m.setBoard(key));
    set({ boardKey: key });
  },
  setSelectedTile: (tileId: TileId | null) => set({ selectedTile: tileId }),
  setShowTradeModal: (show: boolean) => set({ showTradeModal: show }),
  setShowInfluenceModal: (show: boolean) => set({ showInfluenceModal: show }),
  setShowAbilityModal: (show: boolean) => set({ showAbilityModal: show }),
  dismissEventCard: () => set({ activeEventCard: null }),
  clearError: () => set({ errorMessage: null }),

  initLocalGame: (
    playerCount = 4,
    playerName = 'My Daddy',
    roleId = 'Tycoon',
    singleDiceMode = false,
    startingCash = 1500,
    rulesOverride: Partial<GameState['rules']> = {},
    pegId = 'alien'
  ) => {
    // Room/player bookkeeping used by the mini-game lobby hooks.
    const roomState: RoomState = {
      roomCode: 'room-stub',
      players: [],
      allowBots: true,
      gameId: 'local',
      gameTitle: 'Local Game',
      isGameStarted: false,
    };
    set({ rooms: { 'local': roomState } });

    const defaultBots = [
      { id: 'p2', name: 'Atlas Bot', roleId: 'Broker', isBot: true, tokenId: 'rocket' },
      { id: 'p3', name: 'Nexus Bot', roleId: 'Strategist', isBot: true, tokenId: 'car' },
      { id: 'p4', name: 'Vanguard Bot', roleId: 'Banker', isBot: true, tokenId: 'jet' },
      { id: 'p5', name: 'Landlord Bot', roleId: 'Landlord', isBot: true, tokenId: 'crown' },
      { id: 'p6', name: 'Capital Bot', roleId: 'Negotiator', isBot: true, tokenId: 'diamond' },
      { id: 'p7', name: 'Apex Bot', roleId: 'Tycoon', isBot: true, tokenId: 'shark' },
      { id: 'p8', name: 'Echo Bot', roleId: 'Broker', isBot: true, tokenId: 'robot' },
    ];

    const players = [
      { id: 'p1', name: playerName, roleId, isBot: false, tokenId: pegId },
      ...defaultBots.slice(0, Math.max(1, playerCount - 1)),
    ];

    const state = createInitialGameState(players, startingCash, {
      singleDiceMode,
      maxPlayers: playerCount,
      ...rulesOverride,
    });
    // Set board key
    const { boardKey } = get();
    state.boardKey = boardKey;
    set({
      gameMode: 'local',
      myPlayerId: 'p1',
      roomCode: 'LOCAL-MATCH',
      gameState: state,
      errorMessage: null,
      selectedTile: null,
      getOrCreateRoom: () => roomState,
      addPlayer: () => {},
      resetRooms: () => set({ rooms: {} }),
    });
  },

  connectOnline: async (roomName = 'game', name = 'Player', roleId = 'Tycoon') => {
    set({ isConnecting: true, errorMessage: null });
    const { serverUrl } = get();

    try {
      const { boardKey } = get();
      const { roomId, sessionId } = await colyseusConnection.connect(
        serverUrl,
        roomName,
        { name, roleId, boardKey },
        {
          onStateChange: (state: GameState) => {
            set({ gameState: state });
          },
          onEvents: (events: GameEvent[]) => {
            console.log('Online events received:', events);
          },
          onError: (err: { code: string; message?: string }) => {
            set({ errorMessage: `${err.code}: ${err.message ?? 'Unknown error'}` });
          },
          onGameOver: (winner: string) => {
            console.log('Game over, winner:', winner);
          },
          onDisconnect: () => {
            set({ gameState: null, roomCode: null, isConnecting: false });
          },
        }
      );

      set({
        gameMode: 'online',
        myPlayerId: sessionId,
        roomCode: roomId,
        isConnecting: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      set({
        isConnecting: false,
        errorMessage: `${msg}. Switching to Local Mode for uninterrupted play.`,
      });
      // Fallback automatically to local game
      get().initLocalGame(3, name, roleId);
    }
  },

  disconnect: () => {
    if (get().gameMode === 'online') {
      colyseusConnection.disconnect();
    }
    set({
      gameState: null,
      roomCode: null,
      isConnecting: false,
      selectedTile: null,
    });
  },

  dispatchAction: (action: Action) => {
    const { gameMode, gameState, myPlayerId } = get();

    if (gameMode === 'online') {
      try {
        colyseusConnection.sendAction(action);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to send action';
        set({ errorMessage: msg });
      }
      return;
    }

    // Local mode handling
    if (!gameState) return;

    // In auction or trade responses, caller might specify actor
    const actorId =
      action.type === 'BID' || action.type === 'PASS_BID'
        ? myPlayerId
        : action.type === 'RESPOND_TRADE'
        ? myPlayerId
        : gameState.turnPlayerId;

    const result = applyLocalAction(gameState, actorId, action);
    if (result.error) {
      set({ errorMessage: result.error });
      return;
    }

    set({ gameState: result.state, errorMessage: null });

    // Check if event card was drawn
    const eventLog = result.events.find(e => e.type === 'EVENT_CARD_DRAWN');
    if (eventLog && eventLog.card) {
      set({
        activeEventCard: {
          id: 99,
          text: eventLog.card,
          type: 'general',
        },
      });
    }

    // Check if a bot should now take its turn
    get().triggerBotTurnIfNeeded();
  },

  triggerBotTurnIfNeeded: () => {
    const { gameMode, gameState, myPlayerId, dispatchAction } = get();
    if (gameMode !== 'local' || !gameState || gameState.phase === 'gameOver') return;

    // Check if current turn player is a bot
    const currentId = gameState.turnPlayerId;
    if (currentId !== myPlayerId) {
      const step = botStep(gameState, currentId);
      if (step) {
        setTimeout(() => {
          // Verify turn didn't change before timer fired
          const freshState = get().gameState;
          if (freshState && freshState.turnPlayerId === currentId) {
            dispatchAction(step.action);
          }
        }, step.delayMs);
      }
    }
  },
}));
