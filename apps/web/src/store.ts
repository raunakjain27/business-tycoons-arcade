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
  turnTimerSec: number | null;
  turnTimerActive: boolean;
  turnTimerRemaining: number | null;

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
  setTurnTimerActive: (active: boolean) => void;
  setTurnTimerRemaining: (remaining: number | null) => void;

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
  connectOnline: (roomName?: string, name?: string, roleId?: string, turnTimerSec?: number) => Promise<void>;
  disconnect: () => void;
  dispatchAction: (action: Action, actingPlayerId?: PlayerId) => void;

  // Bot step scheduler
  triggerBotTurnIfNeeded: () => void;

  rooms: Record<string, RoomState>;
  getOrCreateRoom: (gameId: string, hostName: string, maxPlayers: number, minPlayers: number) => RoomState;
  addPlayer: (gameId: string, name: string, isBot: boolean) => void;
  resetRooms: () => void;
}

const emptyLocalRoomState: RoomState = {
  roomCode: 'local',
  players: [],
  allowBots: true,
  gameId: 'local',
  gameTitle: 'Local Game',
  isGameStarted: false,
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameMode: 'local',
  serverUrl:
    import.meta.env.VITE_SERVER_URL ||
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'ws://localhost:2567'
      : 'wss://tycoons-arcade-server.onrender.com'),

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
  turnTimerSec: null,
  turnTimerActive: false,
  turnTimerRemaining: null,

  rooms: { local: emptyLocalRoomState },
  getOrCreateRoom: (gameId: string, hostName: string, maxPlayers: number, minPlayers: number) => ({
    roomCode: gameId,
    players: [],
    allowBots: true,
    gameId,
    gameTitle: hostName,
    isGameStarted: false,
  }),
  addPlayer: (gameId: string, name: string, isBot: boolean) => {},
  resetRooms: () => set({ rooms: {} }),

  setGameMode: (mode: GameMode) => set({ gameMode: mode }),
  setServerUrl: (url: string) => set({ serverUrl: url }),
  setBoardKey: (key: string) => {
    import('./boardData').then(m => m.setBoard(key));
    set({ boardKey: key });
  },
  setSelectedTile: (tileId: TileId | null) => set({ selectedTile: tileId }),
  setShowTradeModal: (show: boolean) => set({ showTradeModal: show }),
  setShowInfluenceModal: (show: boolean) => set({ showInfluenceModal: show }),
  dismissEventCard: () => {
    set({ activeEventCard: null });
    const state = get().gameState;
    if (state && state.phase !== 'gameOver') {
      if (state.phase === 'awaitBuyDecision') {
        // Destination tile was an unowned property — stay in awaitBuyDecision so player can buy or auction!
        return;
      }
      const player = state.players[state.turnPlayerId];
      if (player && player.doublesStreak > 0 && !player.inJail) {
        if (state.phase === 'resolveEvent') {
          get().dispatchAction({ type: 'ACKNOWLEDGE_EVENT' });
        }
      } else if (state.phase === 'resolveEvent' || state.phase === 'awaitEndTurn') {
        get().dispatchAction({ type: 'END_TURN' });
      }
    }
  },
  setTurnTimerActive: (active: boolean) => set({ turnTimerActive: active }),
  setTurnTimerRemaining: (remaining: number | null) => set({ turnTimerRemaining: remaining }),

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
      rooms: { local: roomState },
      getOrCreateRoom: () => roomState,
      addPlayer: () => {},
      resetRooms: () => set({ rooms: {} }),
    });
    if ((get() as any)._timerInterval) clearInterval((get() as any)._timerInterval);
  },

  connectOnline: async (roomName = 'game', name = 'Player', roleId = 'Tycoon', turnTimerSec?: number) => {
    set({ isConnecting: true, errorMessage: null });
    const { serverUrl } = get();

    try {
      const { boardKey } = get();
      const { roomId, sessionId } = await colyseusConnection.connect(
        serverUrl,
        roomName,
        { name, roleId, boardKey, rules: turnTimerSec ? { turnTimerSec } : undefined },
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

  dispatchAction: (action: Action, actingPlayerId?: PlayerId) => {
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

    // Auto-clear activeEventCard whenever a turn progression or resolution action occurs
    if (
      action.type === 'ACKNOWLEDGE_EVENT' ||
      action.type === 'END_TURN' ||
      action.type === 'ROLL' ||
      action.type === 'BUY' ||
      action.type === 'DECLINE_BUY'
    ) {
      set({ activeEventCard: null });
    }

    // In auction or trade responses, caller might specify actor
    const actorId =
      actingPlayerId ?? (
        action.type === 'BID' || action.type === 'PASS_BID'
          ? myPlayerId
          : action.type === 'RESPOND_TRADE'
          ? myPlayerId
          : gameState.turnPlayerId
      );

    const result = applyLocalAction(gameState, actorId, action);
    if (result.error) {
      if (actorId !== myPlayerId) {
        // Fallback for bot errors so game never deadlocks on bot turns
        if (action.type !== 'END_TURN') {
          const fallback = applyLocalAction(gameState, actorId, { type: 'END_TURN' });
          if (!fallback.error) {
            set({ gameState: fallback.state, errorMessage: null });
            get().triggerBotTurnIfNeeded();
            return;
          }
        }
      }

      // Silently ignore benign out-of-phase race condition clicks (e.g. user rapid double-clicks)
      const benignErrors = [
        'Not in roll phase',
        'Not in buy decision phase',
        'Not in event resolution phase',
        'Cannot end turn yet',
      ];
      if (benignErrors.includes(result.error) && gameState.turnPlayerId !== myPlayerId) {
        return;
      }

      set({ errorMessage: result.error });
      if ((get() as any)._errorTimeout) clearTimeout((get() as any)._errorTimeout);
      ;(get() as any)._errorTimeout = setTimeout(() => {
        set({ errorMessage: null });
      }, 3500);
      return;
    }

    set({ gameState: result.state, errorMessage: null });
    if ((get() as any)._errorTimeout) clearTimeout((get() as any)._errorTimeout);

    // Check if event card was drawn
    const eventLog = result.events.find(e => e.type === 'EVENT_CARD_DRAWN');
    if (eventLog && eventLog.card) {
      if (eventLog.playerId === myPlayerId) {
        set({
          activeEventCard: {
            id: 99,
            text: eventLog.card,
            type: 'general',
          },
        });
      }
    }

    // Start/re-start turn timer for human player only when it is genuinely their active turn
    if (gameMode === 'local' && result.state && result.state.turnPlayerId === myPlayerId && result.state.phase !== 'gameOver') {
      const sec = result.state.rules?.turnTimerSec ?? 30;
      set({
        turnTimerSec: sec,
        turnTimerActive: true,
        turnTimerRemaining: sec,
      });
      if ((get() as any)._timerInterval) clearInterval((get() as any)._timerInterval);
      ;(get() as any)._timerInterval = setInterval(() => {
        const st = get().gameState;
        if (!st || st.phase === 'gameOver' || st.turnPlayerId !== myPlayerId) {
          set({ turnTimerActive: false, turnTimerRemaining: null });
          if ((get() as any)._timerInterval) clearInterval((get() as any)._timerInterval);
          return;
        }
        const rem = get().turnTimerRemaining;
        if (rem === null || rem <= 0) {
          set({ turnTimerActive: false, turnTimerRemaining: null });
          if ((get() as any)._timerInterval) clearInterval((get() as any)._timerInterval);
          return;
        }
        set({ turnTimerRemaining: Math.max(0, rem - 1) });
        if (rem <= 1) {
          // Timer expired — auto-act safely based on current phase
          set({ turnTimerActive: false, turnTimerRemaining: null });
          if ((get() as any)._timerInterval) clearInterval((get() as any)._timerInterval);
          const fs = get().gameState;
          if (fs && fs.phase !== 'gameOver' && fs.turnPlayerId === myPlayerId) {
            if (fs.phase === 'awaitRoll') {
              get().dispatchAction({ type: 'ROLL' });
            } else if (fs.phase === 'resolveEvent' || fs.phase === 'awaitEndTurn') {
              get().dismissEventCard();
            }
          }
        }
      }, 1000);
    } else if (result.state && result.state.turnPlayerId !== myPlayerId) {
      // Clear human turn timer when it is not human's turn
      set({ turnTimerActive: false, turnTimerRemaining: null });
      if ((get() as any)._timerInterval) clearInterval((get() as any)._timerInterval);
    }

    // Check if a bot should now take its turn
    get().triggerBotTurnIfNeeded();
  },

  triggerBotTurnIfNeeded: () => {
    const { gameMode, gameState, myPlayerId, dispatchAction } = get();
    if (gameMode !== 'local' || !gameState || gameState.phase === 'gameOver') return;

    // Handle auction phase: any bot that has not passed yet takes an auction action
    if (gameState.phase === 'auction' && gameState.auction) {
      const nextBotId = gameState.turnOrder.find(
        id =>
          id !== myPlayerId &&
          gameState.players[id]?.status === 'active' &&
          !gameState.auction!.passed.includes(id) &&
          id !== gameState.auction!.highBidder
      );
      if (nextBotId) {
        const step = botStep(gameState, nextBotId);
        if (step) {
          setTimeout(() => {
            const freshState = get().gameState;
            if (freshState && freshState.phase === 'auction' && freshState.auction) {
              dispatchAction(step.action, nextBotId);
            }
          }, step.delayMs);
        }
      }
      return;
    }

    // Respond to pending trades proposed to bots
    const botWithTrade = gameState.turnOrder.find(
      id => id !== myPlayerId && gameState.trades?.some(t => t.toId === id && t.status === 'pending')
    );
    if (botWithTrade) {
      const step = botStep(gameState, botWithTrade);
      if (step) {
        setTimeout(() => {
          const fresh = get().gameState;
          if (fresh && fresh.trades?.some(t => t.toId === botWithTrade && t.status === 'pending')) {
            dispatchAction(step.action, botWithTrade);
          }
        }, step.delayMs);
      }
    }

    // Check if current turn player is a bot
    const currentId = gameState.turnPlayerId;
    if (currentId !== myPlayerId) {
      const step = botStep(gameState, currentId);
      if (step) {
        setTimeout(() => {
          // Verify turn didn't change before timer fired
          const freshState = get().gameState;
          if (freshState && freshState.turnPlayerId === currentId) {
            dispatchAction(step.action, currentId);
          }
        }, step.delayMs);
      }
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useGameStore = useGameStore;
}
