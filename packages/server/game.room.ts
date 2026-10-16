import { Room, Client } from '@colyseus/core';
import crypto from 'node:crypto';
import type {
  GameState,
  PlayerId,
  TileId,
  PlayerState,
  TileState,
  Action,
  GameEvent,
  RuleSet,
  Rng,
} from '../engine/types';
import { DEFAULT_RULES, createPlayerState, createTileState } from '../engine/types';
import { applyAction, ALL_EVENT_CARDS } from '../engine';
import { actionSchema } from '../protocol/schemas';

// JWT secret - with dev/staging fallback
const JWT_SECRET = process.env.JWT_SECRET || 'tycoons-arcade-default-secret-change-in-prod';


/**
 * Options accepted when joining a GameRoom.
 */
export interface JoinOptions {
  token?: string;
  name?: string;
  tokenId?: string;
  roleId?: string | null;
  sessionToken?: string;
  maxClients?: number;
  seed?: string;
  rules?: Partial<RuleSet>;
  boardKey?: string;
}

/**
 * Verified user credentials after authentication.
 */
export interface AuthUser {
  playerId: PlayerId;
  name: string;
  isGuest: boolean;
}

/**
 * Filtered PlayerState for clients (hides private cards of opponents).
 */
export interface FilteredPlayerState extends Omit<PlayerState, 'heldCards'> {
  heldCards?: string[];
  heldCardCount: number;
}

/**
 * Filtered MarketState (forecast hidden from non-Strategists).
 */
export interface FilteredMarketState {
  current: GameState['market']['current'];
  forecast?: GameState['market']['forecast'];
}

/**
 * Filtered GameState delivered to each client.
 * Hides seed, card decks (showing counts only), private cards, and market forecast.
 */
export interface FilteredGameState
  extends Omit<GameState, 'seed' | 'eventDeck' | 'eventDiscard' | 'chronicleDeck' | 'chronicleDiscard' | 'communityDeck' | 'communityDiscard' | 'players' | 'market'> {
  eventDeckCount: number;
  eventDiscardCount: number;
  market: FilteredMarketState;
  players: Record<PlayerId, FilteredPlayerState>;
}

/**
 * Mulberry32 32-bit PRNG.
 * Given a seed string or number, returns a deterministic pseudo-random number generator
 * producing unsigned 32-bit integers.
 */
export function createMulberry32(seed: string | number): Rng {
  let s: number;
  if (typeof seed === 'string') {
    // 32-bit FNV-1a hash of the seed string
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
    }
    s = h;
  } else {
    s = seed >>> 0;
  }

  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/**
 * Authenticate incoming client credentials using HMAC-SHA256 JWT.
 * Tokens must be valid signed JWTs - no guest fallback for production security.
 */
export function verifyAuthToken(
  token: unknown,
  fallbackName?: unknown,
  sessionId?: string,
  jwtSecret: string = JWT_SECRET
): AuthUser {
  const defaultPlayerId = sessionId || `p_${Math.random().toString(36).substring(2, 9)}`;
  const defaultName =
    typeof fallbackName === 'string' && fallbackName.trim().length > 0
      ? fallbackName.trim().substring(0, 32)
      : `Player_${defaultPlayerId.substring(0, 6)}`;

  // 1. Check if token is a standard 3-part JWT
  if (typeof token === 'string' && token.trim().length > 0) {
    const trimmed = token.trim();
    const parts = trimmed.split('.');
    if (parts.length === 3) {
      const [headerB64, payloadB64, signatureB64] = parts;
      try {
        const expectedSig = crypto
          .createHmac('sha256', jwtSecret)
          .update(`${headerB64}.${payloadB64}`)
          .digest('base64url');

        const sigBuf = Buffer.from(signatureB64);
        const expBuf = Buffer.from(expectedSig);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          throw new Error('Invalid JWT signature');
        }

        const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
        const claims = JSON.parse(payloadJson) as Record<string, unknown>;

        if (typeof claims.exp === 'number' && Date.now() >= claims.exp * 1000) {
          throw new Error('JWT token has expired');
        }

        const playerId = String(claims.sub || claims.playerId || claims.userId || defaultPlayerId);
        const name = String(claims.name || claims.username || defaultName).substring(0, 32);

        return {
          playerId,
          name,
          isGuest: false,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid JWT token';
        throw new Error(`Authentication failed: ${msg}`);
      }
    }

    // 2. Reject unknown tokens - no silent fallback in production
    throw new Error('Authentication failed: Invalid or missing authentication token');
  }

  // 3. Should not reach here - token validation above always returns or throws
  throw new Error('Authentication failed: Unknown token format');
}

/**
 * Filter the full GameState for a specific player view:
 * - Hides other players' heldCards (shows heldCardCount only)
 * - Hides eventDeck and eventDiscard arrays (shows count only)
 * - Hides market.forecast (unless player has the Strategist role)
 * - Hides the random seed
 * - Retains complete state for the requesting player
 */
export function filterStateForPlayer(state: GameState, playerId: PlayerId): FilteredGameState {
  const cloned = structuredClone(state);

  // 1. Omit seed, eventDeck, eventDiscard, chronicle/community decks
  const {
    seed: _omittedSeed,
    eventDeck,
    eventDiscard,
    chronicleDeck: _cd,
    chronicleDiscard: _cdd,
    communityDeck: _cm,
    communityDiscard: _cmd,
    ...restState
  } = cloned;

  const eventDeckCount = Array.isArray(eventDeck) ? eventDeck.length : 0;
  const eventDiscardCount = Array.isArray(eventDiscard) ? eventDiscard.length : 0;

  // 2. Check requesting player role for market forecast visibility
  const requestingPlayer = cloned.players ? cloned.players[playerId] : undefined;
  const isStrategist = requestingPlayer?.roleId?.toLowerCase() === 'strategist';

  const market: FilteredMarketState = {
    current: cloned.market?.current,
  };
  if (isStrategist && cloned.market?.forecast) {
    market.forecast = cloned.market.forecast;
  }

  // 3. Filter other players' held cards
  const filteredPlayers: Record<PlayerId, FilteredPlayerState> = {};
  if (cloned.players) {
    for (const [pid, player] of Object.entries(cloned.players)) {
      const cardCount = Array.isArray(player.heldCards) ? player.heldCards.length : 0;
      if (pid === playerId) {
        filteredPlayers[pid] = {
          ...player,
          heldCards: player.heldCards || [],
          heldCardCount: cardCount,
        };
      } else {
        const { heldCards: _omittedCards, ...otherFields } = player;
        filteredPlayers[pid] = {
          ...otherFields,
          heldCardCount: cardCount,
        };
      }
    }
  }

  return {
    ...restState,
    eventDeckCount,
    eventDiscardCount,
    market,
    players: filteredPlayers,
  };
}

/**
 * Production-ready Cornerstone game room with authoritative game logic,
 * authentication, input validation, state filtering, rate limiting, deterministic RNG,
 * turn timers, version conflict detection, and reconnection support.
 */
export class GameRoom extends Room<GameState> {
  // Track message timestamps for rate limiting (max 10 messages/sec per client)
  private messageTimestamps = new Map<string, number[]>();

  // Map client sessionId to playerId
  private clientToPlayerId = new Map<string, PlayerId>();

  // Map playerId to active Client
  private playerToClient = new Map<PlayerId, Client>();

  // Active 60-second reconnection timers for disconnected players
  private disconnectTimers = new Map<PlayerId, NodeJS.Timeout>();

  // Session tokens for reconnecting clients
  private sessionTokens = new Map<string, { playerId: PlayerId; createdAt: number }>();

  // Turn timer timeout
  private turnTimer: NodeJS.Timeout | null = null;

  // Seeded PRNG function
  private rng: Rng = () => Math.floor(Math.random() * 6) + 1;

  // Persistence settings
  private persistenceInterval: NodeJS.Timeout | null = null;
  private readonly SNAPSHOT_DIR = '/tmp/cornerstone-snapshots';
  private readonly SNAPSHOT_INTERVAL_MS = 30000; // 30 seconds

  async onCreate(options: JoinOptions): Promise<void> {
    console.log('Cornerstone GameRoom created with options:', options);

    // Initialize seeded Mulberry32 PRNG
    const seed = options?.seed || Math.random().toString(36).substring(2, 16);
    this.rng = createMulberry32(seed);

    // Merge custom rules with default rules
    const rules: RuleSet = {
      ...DEFAULT_RULES,
      ...(options?.rules || {}),
    };

    this.maxClients = options?.maxClients ?? rules.maxPlayers ?? 2;

    // Initialize 40 board tiles
    const initialTiles: Record<TileId, TileState> = {};
    for (let i = 0; i < 40; i++) {
      initialTiles[i] = createTileState();
    }

    // Initialize shuffled event deck from all available cards
    const cardIds = ALL_EVENT_CARDS.map(c => String(c.id));
    const shuffledDeck = this.shuffleDeck(cardIds);

    // Set initial authoritative game state
    const initialState: GameState = {
      id: Math.random().toString(36).substring(2, 9),
      seed,
      boardKey: options?.boardKey,
      rules,
      round: 1,
      turnPlayerId: '',
      turnOrder: [],
      phase: 'lobby',
      players: {},
      tiles: initialTiles,
      communityFund: 0,
      market: {
        current: { kind: 'steady', roundsLeft: 3 },
        forecast: { kind: 'steady' },
      },
      eventDeck: shuffledDeck,
      eventDiscard: [],
      chronicleDeck: this.shuffleDeck(cardIds.slice()),
      chronicleDiscard: [],
      communityDeck: this.shuffleDeck(cardIds.slice()),
      communityDiscard: [],
      housesAvailable: 32,
      towersAvailable: 12,
      lastDice: null,
      auction: null,
      trades: [],
      pendingDebt: null,
      log: [],
      version: 0,
    };

    this.setState(initialState);

    // Start periodic state persistence
    this.startPersistence();

    // Register action message handler
    this.onMessage('action', (client: Client, rawMessage: unknown) => {
      this.handleActionMessage(client, rawMessage);
    });
  }

  /**
   * Authenticate connecting client before allowing room entry.
   */
  async onAuth(client: Client, options?: JoinOptions): Promise<AuthUser> {
    const token = options?.sessionToken || options?.token;
    return verifyAuthToken(token, options?.name, client.sessionId);
  }

  /**
   * Handle player joining or reconnecting to the room.
   */
  async onJoin(client: Client, options?: JoinOptions, auth?: AuthUser): Promise<void> {
    const user = auth || verifyAuthToken(options?.token, options?.name, client.sessionId);
    let playerId = user.playerId;

    // Check if client is using a session token to reconnect
    if (options?.sessionToken) {
      const session = this.sessionTokens.get(options.sessionToken);
      if (session && this.state.players[session.playerId]) {
        playerId = session.playerId;
      }
    }

    const existingPlayer = this.state.players[playerId];

    // Case 1: Reconnecting to an existing player
    if (existingPlayer) {
      if (existingPlayer.status === 'disconnected') {
        const pendingTimer = this.disconnectTimers.get(playerId);
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          this.disconnectTimers.delete(playerId);
        }

        existingPlayer.status = 'active';
        this.clientToPlayerId.set(client.sessionId, playerId);
        this.playerToClient.set(playerId, client);

        this.state.log.push({
          type: 'player_reconnected',
          playerId,
          timestamp: Date.now(),
        });

        console.log(`Player ${playerId} successfully reconnected.`);
        this.sendFilteredState(client, playerId);
        this.broadcastFilteredState();
        return;
      }

      if (existingPlayer.status === 'active') {
        // Displace previous client connection for this player
        const oldClient = this.playerToClient.get(playerId);
        if (oldClient && oldClient !== client) {
          try {
            oldClient.leave(4000);
          } catch {
            // ignore
          }
        }
        this.clientToPlayerId.set(client.sessionId, playerId);
        this.playerToClient.set(playerId, client);
        this.sendFilteredState(client, playerId);
        this.broadcastFilteredState();
        return;
      }

      throw new Error('Player is no longer active in this game');
    }

    // Case 2: New player joining
    const currentCount = Object.keys(this.state.players).length;
    const maxPlayers = this.state.rules.maxPlayers || this.maxClients;

    if (currentCount >= maxPlayers) {
      throw new Error('Room is full');
    }

    if (this.state.phase !== 'lobby' && currentCount > 0) {
      throw new Error('Game already in progress');
    }

    const newPlayer = createPlayerState(playerId, user.name, this.state.rules.startingCash);
    newPlayer.tokenId = options?.tokenId || `token_${playerId}`;
    if (options?.roleId) {
      newPlayer.roleId = options.roleId;
    }

    this.state.players[playerId] = newPlayer;
    this.state.turnOrder.push(playerId);

    this.clientToPlayerId.set(client.sessionId, playerId);
    this.playerToClient.set(playerId, client);

    // Issue session token for reconnection
    const sessionToken = this.createSessionToken(playerId);
    client.send('session', {
      playerId,
      sessionToken,
    });

    // First player to join becomes the starting player
    if (this.state.turnOrder.length === 1) {
      this.state.turnPlayerId = playerId;
    }

    // If room is full, transition to awaitRoll and start the turn timer
    if (this.state.phase === 'lobby' && this.state.turnOrder.length >= this.maxClients) {
      this.state.phase = 'awaitRoll';
      this.resetTurnTimer();
    }

    this.state.log.push({
      type: 'player_joined',
      playerId,
      name: user.name,
      timestamp: Date.now(),
    });

    console.log(`Player ${playerId} (${user.name}) joined. Total: ${this.state.turnOrder.length}/${this.maxClients}`);

    this.sendFilteredState(client, playerId);
    this.broadcastFilteredState();
  }

  /**
   * Handle incoming action messages from clients.
   */
  private handleActionMessage(client: Client, rawMessage: unknown): void {
    // 1. Rate limiting: max 10 messages per second per client
    if (!this.checkRateLimit(client)) {
      return;
    }

    // 2. Identify the player
    const playerId = this.clientToPlayerId.get(client.sessionId);
    if (!playerId) {
      client.send('error', {
        code: 'PLAYER_INACTIVE',
        message: 'Client is not associated with an active player',
      });
      return;
    }

    const player = this.state.players[playerId];
    if (!player || player.status !== 'active') {
      client.send('error', {
        code: 'PLAYER_INACTIVE',
        message: 'Player is not active in this game',
      });
      return;
    }

    // 3. Extract action payload and version
    let actionToValidate: unknown = rawMessage;
    let clientVersion: number | undefined;

    if (typeof rawMessage === 'object' && rawMessage !== null) {
      const msgObj = rawMessage as Record<string, unknown>;
      if ('action' in msgObj) {
        actionToValidate = msgObj.action;
        if (typeof msgObj.version === 'number') {
          clientVersion = msgObj.version;
        }
      } else if (typeof msgObj.version === 'number') {
        clientVersion = msgObj.version;
      }
    }

    // 4. Version verification (prevents stale action execution)
    if (typeof clientVersion === 'number' && clientVersion !== this.state.version) {
      client.send('error', {
        code: 'ILLEGAL_MOVE',
        message: `State version mismatch: client version ${clientVersion} != server version ${this.state.version}`,
      });
      this.sendFilteredState(client, playerId);
      return;
    }

    // 5. Schema validation using actionSchema.safeParse()
    const parseResult = actionSchema.safeParse(actionToValidate);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      client.send('error', {
        code: 'ILLEGAL_MOVE',
        message: `Invalid action format: ${issues}`,
      });
      return;
    }

    const action = parseResult.data as Action;

    // 6. Process authoritative action
    this.processAction(playerId, action, false, client);
  }

  /**
   * Process an authoritative game action, applying engine logic and updating room state.
   */
  private processAction(
    playerId: PlayerId,
    action: Action,
    isSystemAction = false,
    client?: Client
  ): boolean {
    const player = this.state.players[playerId];
    if (!player || player.status !== 'active') {
      client?.send('error', {
        code: 'PLAYER_INACTIVE',
        message: 'Player is not active',
      });
      return false;
    }

    // Turn verification: only turn player may act, except for RESPOND_TRADE,
    // auction bidding, or resignation
    const isTurnPlayer = playerId === this.state.turnPlayerId;
    const isTradeResponse = action.type === 'RESPOND_TRADE';
    const isAuctionAction =
      this.state.phase === 'auction' && (action.type === 'BID' || action.type === 'PASS_BID');
    const isResign = action.type === 'RESIGN';

    if (!isTurnPlayer && !isTradeResponse && !isAuctionAction && !isResign) {
      client?.send('error', {
        code: 'NOT_YOUR_TURN',
        message: `It is not your turn. Current turn player is ${this.state.turnPlayerId}`,
      });
      return false;
    }

    // Prepare events accumulator on state
    const stateObj = this.state as unknown as Record<string, unknown>;
    stateObj.events = [];

    let result: ReturnType<typeof applyAction>;
    try {
      result = applyAction(this.state, playerId, action, {
        now: Date.now(),
        rng: this.rng,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Internal error processing action';
      console.error(`Error applying action ${action.type}:`, err);
      client?.send('error', {
        code: 'ILLEGAL_MOVE',
        message: msg,
      });
      this.state.log.push({
        type: 'action_error',
        playerId,
        action: action.type,
        version: this.state.version,
        timestamp: Date.now(),
        error: msg,
      });
      return false;
    }

    // Handle action rejection from engine
    if ('error' in result && result.error) {
      const errorMsg = (result as Record<string, unknown>).message || `Action rejected: ${result.error}`;
      client?.send('error', {
        code: result.error,
        message: String(errorMsg),
      });
      this.state.log.push({
        type: 'action_rejected',
        playerId,
        action: action.type,
        version: this.state.version,
        timestamp: Date.now(),
        error: result.error,
        message: String(errorMsg),
      });
      return false;
    }

    // Extract updated GameState and generated events
    let updatedState: GameState;
    let events: GameEvent[] = [];

    if ('state' in result && result.state) {
      updatedState = result.state;
      events = (result as { events?: GameEvent[] }).events || [];
    } else {
      updatedState = result as unknown as GameState;
      const updatedObj = updatedState as unknown as Record<string, unknown>;
      events = Array.isArray(updatedObj.events) ? (updatedObj.events as GameEvent[]) : [];
    }

    // Increment authoritative version number
    updatedState.version = (this.state.version || 0) + 1;

    // Append to audit log
    if (!updatedState.log) {
      updatedState.log = [];
    }
    updatedState.log.push({
      type: 'action_applied',
      playerId,
      action: action.type,
      payload: action,
      version: updatedState.version,
      timestamp: Date.now(),
      isSystemAction,
      eventsCount: events.length,
    });

    // Update room state
    this.setState(updatedState);

    // Broadcast event notifications
    if (events.length > 0) {
      this.broadcast('events', {
        type: 'events',
        events,
      });
    }

    // Check for game completion
    if (this.state.phase === 'gameOver') {
      if (this.turnTimer) {
        clearTimeout(this.turnTimer);
        this.turnTimer = null;
      }
      const activePlayers = Object.values(this.state.players).filter(p => p.status === 'active');
      const winnerId = activePlayers.length === 1 ? activePlayers[0].id : this.state.turnPlayerId;
      this.broadcast('gameOver', {
        winner: winnerId,
        reason: 'game_ended',
      });
    } else {
      // Reset turn timer
      this.resetTurnTimer();
    }

    // Broadcast per-player filtered state views
    this.broadcastFilteredState();
    return true;
  }

  /**
   * Handle client disconnection: mark as disconnected and allow 60s reconnection window.
   */
  async onLeave(client: Client, consented?: boolean): Promise<void> {
    const playerId = this.clientToPlayerId.get(client.sessionId);
    if (!playerId) return;

    const player = this.state.players[playerId];
    if (!player) return;

    console.log(`Player ${playerId} disconnected (sessionId=${client.sessionId}, consented=${consented})`);

    this.messageTimestamps.delete(client.sessionId);
    this.clientToPlayerId.delete(client.sessionId);
    if (this.playerToClient.get(playerId) === client) {
      this.playerToClient.delete(playerId);
    }

    if (consented || this.state.phase === 'gameOver') {
      player.status = 'left';
      this.handlePlayerAbandoned(playerId);
      return;
    }

    // Mark as disconnected
    player.status = 'disconnected';
    this.broadcastFilteredState();

    // Start 60-second reconnection timer
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(playerId);
      const p = this.state.players[playerId];
      if (p && p.status === 'disconnected') {
        console.log(`Reconnection window (60s) expired for ${playerId}`);
        p.status = 'left';
        this.handlePlayerAbandoned(playerId);
      }
    }, 60000);

    this.disconnectTimers.set(playerId, timer);

    // Support Colyseus native allowReconnection
    try {
      const reconnectedClient = await this.allowReconnection(client, 60);
      const activeTimer = this.disconnectTimers.get(playerId);
      if (activeTimer) {
        clearTimeout(activeTimer);
        this.disconnectTimers.delete(playerId);
      }

      player.status = 'active';
      this.clientToPlayerId.set(reconnectedClient.sessionId, playerId);
      this.playerToClient.set(playerId, reconnectedClient);

      console.log(`Player ${playerId} reconnected via native allowReconnection.`);
      this.sendFilteredState(reconnectedClient, playerId);
      this.broadcastFilteredState();
    } catch {
      // allowReconnection expired or failed
    }
  }

  /**
   * Start periodic state persistence for crash recovery.
   */
  private startPersistence(): void {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
    }
    this.persistenceInterval = setInterval(() => {
      this.saveSnapshot();
    }, this.SNAPSHOT_INTERVAL_MS);
    // Also save on initial join
    this.saveSnapshot();
  }

  /**
   * Save current game state to disk as a snapshot.
   */
  private saveSnapshot(): void {
    try {
      const state = this.state;
      const snapshot = {
        roomId: this.roomId,
        version: state.version,
        timestamp: Date.now(),
        players: state.players,
        tiles: state.tiles,
        market: state.market,
        communityFund: state.communityFund,
        phase: state.phase,
        round: state.round,
        turnPlayerId: state.turnPlayerId,
        turnOrder: state.turnOrder,
      };
      // Ensure directory exists
      import('fs').then(fs => {
        if (!fs.existsSync(this.SNAPSHOT_DIR)) {
          fs.mkdirSync(this.SNAPSHOT_DIR, { recursive: true });
        }
        const snapshotPath = `${this.SNAPSHOT_DIR}/snapshot_${this.roomId}_${state.version}.json`;
        fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
        // Clean up old snapshots (keep last 10)
        this.cleanupOldSnapshots(fs);
      });
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    }
  }

  /**
   * Clean up old snapshot files, keeping only the last N.
   */
  private cleanupOldSnapshots(fs: any): void {
    try {
      const files = fs.readdirSync(this.SNAPSHOT_DIR)
        .filter(f => f.startsWith(`snapshot_${this.roomId}_`))
        .sort();
      while (files.length > 10) {
        const oldFile = `${this.SNAPSHOT_DIR}/${files.shift()}`;
        fs.unlinkSync(oldFile);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Stop persistence interval on room disposal.
   */
  private stopPersistence(): void {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
      this.persistenceInterval = null;
    }
  }

  /**
   * Handle player abandonment after disconnection grace period expires or voluntary departure.
   */
  private handlePlayerAbandoned(playerId: PlayerId): void {
    console.log(`Handling player abandonment for ${playerId}`);

    this.state.log.push({
      type: 'player_left',
      playerId,
      timestamp: Date.now(),
    });

    const remainingActive = Object.values(this.state.players).filter(
      p => p.status === 'active' || p.status === 'disconnected'
    );

    // If only 1 player remains, declare winner
    if (remainingActive.length === 1 && this.state.phase !== 'lobby') {
      const winner = remainingActive[0];
      this.state.phase = 'gameOver';
      if (this.turnTimer) {
        clearTimeout(this.turnTimer);
        this.turnTimer = null;
      }
      this.broadcast('gameOver', {
        winner: winner.id,
        reason: 'opponent_abandoned',
      });
      this.broadcastFilteredState();
      return;
    }

    if (remainingActive.length === 0) {
      this.state.phase = 'gameOver';
      if (this.turnTimer) {
        clearTimeout(this.turnTimer);
        this.turnTimer = null;
      }
      this.broadcastFilteredState();
      return;
    }

    // If the abandoned player was the turn player, advance turn
    if (this.state.turnPlayerId === playerId && this.state.phase !== 'gameOver') {
      const currentIdx = this.state.turnOrder.indexOf(playerId);
      let nextIdx = (currentIdx + 1) % this.state.turnOrder.length;
      while (nextIdx !== currentIdx) {
        const candidateId = this.state.turnOrder[nextIdx];
        const candidate = this.state.players[candidateId];
        if (candidate && candidate.status === 'active') {
          this.state.turnPlayerId = candidateId;
          this.state.phase = 'awaitRoll';
          this.resetTurnTimer();
          break;
        }
        nextIdx = (nextIdx + 1) % this.state.turnOrder.length;
      }
    }

    this.broadcastFilteredState();
  }

  /**
   * Reset and enforce turn timer.
   */
  private resetTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    const timerSec = this.state.rules.turnTimerSec;
    if (!timerSec || timerSec <= 0 || this.state.phase === 'gameOver' || this.state.phase === 'lobby') {
      return;
    }

    this.turnTimer = setTimeout(() => {
      this.handleTurnTimeout();
    }, timerSec * 1000);
  }

  /**
   * Auto-pass turn when turn timer expires.
   */
  private handleTurnTimeout(): void {
    if (this.state.phase === 'gameOver' || this.state.phase === 'lobby') {
      return;
    }

    const turnPlayerId = this.state.turnPlayerId;
    if (!turnPlayerId) return;

    const player = this.state.players[turnPlayerId];
    if (!player || player.status !== 'active') return;

    console.log(`Turn timeout for ${turnPlayerId} in phase ${this.state.phase}. Auto-passing turn.`);

    this.state.log.push({
      type: 'turn_timeout',
      playerId: turnPlayerId,
      phase: this.state.phase,
      timestamp: Date.now(),
    });

    // Determine auto-pass action
    let autoAction: Action = { type: 'END_TURN' };
    if (this.state.phase === 'auction') {
      autoAction = { type: 'PASS_BID' };
    } else if (this.state.phase === 'awaitBuyDecision') {
      autoAction = { type: 'DECLINE_BUY' };
    }

    this.processAction(turnPlayerId, autoAction, true);
  }

  /**
   * Enforce rate limiting of maximum 10 messages per second per client.
   */
  private checkRateLimit(client: Client): boolean {
    const now = Date.now();
    const timestamps = this.messageTimestamps.get(client.sessionId) || [];
    const oneSecondAgo = now - 1000;
    const recent = timestamps.filter(t => t > oneSecondAgo);

    if (recent.length >= 10) {
      client.send('error', {
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded: maximum 10 messages per second',
      });
      return false;
    }

    recent.push(now);
    this.messageTimestamps.set(client.sessionId, recent);
    return true;
  }

  /**
   * Broadcast filtered state to each connected client.
   */
  private broadcastFilteredState(): void {
    for (const client of this.clients) {
      const playerId = this.clientToPlayerId.get(client.sessionId);
      if (playerId) {
        this.sendFilteredState(client, playerId);
      }
    }
  }

  /**
   * Send a filtered view of the game state to an individual client.
   */
  private sendFilteredState(client: Client, playerId?: PlayerId): void {
    const pid = playerId || this.clientToPlayerId.get(client.sessionId);
    if (!pid) return;

    const filtered = filterStateForPlayer(this.state, pid);
    client.send('state', {
      type: 'state',
      state: filtered,
      version: this.state.version,
    });
  }

  /**
   * Create and store a reconnection session token.
   */
  private createSessionToken(playerId: PlayerId): string {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const token = `sess_${playerId}_${randomHex}`;
    this.sessionTokens.set(token, {
      playerId,
      createdAt: Date.now(),
    });
    return token;
  }

  /**
   * Shuffle a deck of cards deterministically using the room's seeded PRNG.
   */
  private shuffleDeck(cards: string[]): string[] {
    const deck = [...cards];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = this.rng() % (i + 1);
      const temp = deck[i];
      deck[i] = deck[j];
      deck[j] = temp;
    }
    return deck;
  }

  /**
   * Clean up all timers, rate limit records, and session data.
   */
  async onDispose(): Promise<void> {
    console.log(`GameRoom ${this.roomId} disposed`);

    // Stop persistence
    this.stopPersistence();

    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
    this.messageTimestamps.clear();
    this.clientToPlayerId.clear();
    this.playerToClient.clear();
    this.sessionTokens.clear();
  }
}