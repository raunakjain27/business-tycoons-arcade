export type PlayerId = string;
export type TileId = number; // 0..39

export type TileType =
  | 'start' | 'property' | 'hub' | 'utility' | 'event'
  | 'tax' | 'jail' | 'goToJail' | 'communityFund' | 'summit'
  | 'influence';

export interface TileDef {
  id: TileId;
  type: TileType;
  name: string;
  districtId?: string | null;
  colorGroup?: string | null;
  price?: number | null;
  taxAmount?: number | null;
  image?: string;
  flag?: string;
  icon?: string;
  emoji?: string;
  landmark?: string;
  landmarkName?: string;
  description?: string;
}

export interface DistrictDef {
  id?: string;
  color: string;
  tileIds: TileId[];
  buildCost: number;
}

export interface BoardDef {
  tiles: TileDef[];
  districts: Record<string, DistrictDef>;
}

export type Tier = 0 | 1 | 2 | 3 | 4; // Land, House, Apartments, Tower, Landmark

export interface TileState {
  ownerId: PlayerId | null;
  tier: Tier;
  mortgaged: boolean;
  rentLockedUntilRound?: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  tokenId: string;
  roleId: string | null;
  cash: number;
  influence: number;
  position: TileId;
  inJail: boolean;
  jailTurns: number;
  doublesStreak: number;
  heldCards: string[];
  teamId: string | null;
  abilityReadyRound: number;
  status: 'active' | 'bankrupt' | 'disconnected' | 'left';

  // Movement tracking
  lastLandedTile: TileId;
  lastPositionBeforeJail: TileId;

  // Jail tracking
  jailAttempts: number;
  jailDoublesRolled: number;

  // Temporary buffs from influence spending
  hasRentWaiver: boolean;
  hasRezoningPermit: boolean;

  // Banker emergency loan
  pendingLoan: { amount: number; interest: number; dueRound: number } | null;
}

export type Phase =
  | 'lobby' | 'awaitRoll' | 'moving' | 'awaitBuyDecision' | 'auction'
  | 'awaitJailChoice' | 'resolveEvent' | 'awaitDebtSettlement'
  | 'awaitEndTurn' | 'gameOver';

export type MarketKind = 'steady' | 'boom' | 'crash' | 'creditSurge' | 'creditFreeze';

export interface MarketState {
  current: { kind: MarketKind; districtId?: string; roundsLeft: number };
  forecast: { kind: MarketKind; districtId?: string };
}

export interface TradeBundle {
  tileIds: TileId[];
  cash: number;
  influence: number;
  cards: string[];
  rentContracts: { tileId: TileId; percent: number; rounds: number }[];
}

export interface TradeOffer {
  id: string;
  fromId: PlayerId;
  toId: PlayerId;
  give: TradeBundle;
  want: TradeBundle;
  status: 'pending' | 'accepted' | 'declined' | 'countered' | 'expired';
  expiresAt: number;
}

export interface AuctionState {
  tileId: TileId;
  highBid: number;
  highBidder: PlayerId | null;
  endsAt: number;
  passed: PlayerId[];
}

export interface RuleSet {
  startingCash: number;
  paydayAmount: number;
  auctionOnDecline: boolean;
  evenBuild: boolean;
  marketCycle: boolean;
  roles: boolean;
  influence: boolean;
  eventDeck: boolean;
  turnTimerSec: number | null;
  suddenGrowthRound: number | null;
  bankruptcyGraceSec: number;
  maxPlayers: number;
  teamMode: boolean;
  singleDiceMode?: boolean;
  doubleRentFullSet?: boolean;
  vacationCash?: boolean;
  noRentInPrison?: boolean;
  freeParking?: boolean;
}

export interface GameState {
  id: string;
  seed: string;
  boardKey?: string;
  rules: RuleSet;
  round: number;
  turnPlayerId: PlayerId;
  turnOrder: PlayerId[];
  phase: Phase;
  players: Record<PlayerId, PlayerState>;
  tiles: Record<TileId, TileState>;
  communityFund: number;
  market: MarketState;
  eventDeck: string[];
  eventDiscard: string[];
  chronicleDeck?: string[];
  chronicleDiscard?: string[];
  communityDeck?: string[];
  communityDiscard?: string[];
  // Housing shortage pool
  housesAvailable?: number;
  towersAvailable?: number;
  lastDice: [number, number] | null;
  turnTimerStart?: number;
  auction: AuctionState | null;
  trades: TradeOffer[];
  pendingDebt: { debtorId: PlayerId; creditorId: PlayerId | 'bank'; amount: number } | null;
  log: GameEvent[];
  version: number; // increments on every applied action
}

export type Action =
  | { type: 'ROLL' }
  | { type: 'BUY' }
  | { type: 'DECLINE_BUY' }
  | { type: 'BID'; amount: number }
  | { type: 'PASS_BID' }
  | { type: 'BUILD'; tileId: TileId }
  | { type: 'SELL_BUILDING'; tileId: TileId }
  | { type: 'MORTGAGE'; tileId: TileId }
  | { type: 'UNMORTGAGE'; tileId: TileId }
  | { type: 'PAY_JAIL_FEE' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'PROPOSE_TRADE'; offer: Omit<TradeOffer, 'id' | 'status' | 'expiresAt'> }
  | { type: 'RESPOND_TRADE'; tradeId: string; response: 'accept' | 'decline' | 'counter'; counter?: TradeBundle }
  | { type: 'USE_ABILITY'; target?: PlayerId | TileId }
  | { type: 'SPEND_INFLUENCE'; item: 'lawyer' | 'rezone' | 'waiver' | 'lobby' | 'wildcard' }
  | { type: 'RAISE_FUNDS_DONE' }
  | { type: 'END_TURN' }
  | { type: 'RESIGN' };

export interface GameEvent {
  type: string;
  playerId?: PlayerId;
  tileId?: TileId;
  amount?: number;
  fromPlayerId?: PlayerId;
  reason?: string;
  card?: string;
  effect?: unknown;
  [key: string]: unknown; // allow additional contextual fields
}

export type ErrorCode =
  | 'ACTION_UNKNOWN' | 'PLAYER_INACTIVE' | 'NOT_YOUR_TURN' | 'ILLEGAL_MOVE'
  | 'INSUFFICIENT_FUNDS' | 'PROPERTY_ALREADY_OWNED' | 'AUCTION_ENDED'
  | 'TRADE_INVALID' | 'INFLUENCE_INSUFFICIENT' | 'ABILITY_COOLDOWN' | 'GAME_OVER'
  | 'WRONG_PHASE' | 'PROPERTY_NOT_AVAILABLE' | 'BID_TOO_LOW'
  | 'NO_BUILDINGS_TO_SELL' | 'MAX_TIER_REACHED' | 'SELL_BUILDINGS_FIRST'
  | 'PROPERTY_MORTGAGED' | 'PROPERTY_NOT_MORTGAGED' | 'VIOLATES_EVEN_BUILD'
  | 'NO_GET_OUT_CARD' | 'TRADE_NOT_FOUND' | 'TRADE_EXPIRED' | 'INVALID_TARGET'
  | 'UNKNOWN_ROLE' | 'NO_ROLE_ASSIGNED' | 'CANNOT_BORROW' | 'BANKRUPTCY' | 'NO_SUPPLY_LEFT';

/** Seeded pseudo-random number generator function. Returns integers. */
export type Rng = () => number;

/** Result of applying an action: either success or an error. */
export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: ErrorCode; message?: string };

/** Context passed into the engine on every action. */
export interface ActionContext {
  now: number;
  rng: Rng;
}

/** Helper to create a default PlayerState */
export function createPlayerState(id: PlayerId, name: string, startingCash: number): PlayerState {
  return {
    id,
    name,
    tokenId: '',
    roleId: null,
    cash: startingCash,
    influence: 0,
    position: 0,
    inJail: false,
    jailTurns: 0,
    doublesStreak: 0,
    heldCards: [],
    teamId: null,
    abilityReadyRound: 0,
    status: 'active',
    lastLandedTile: 0,
    lastPositionBeforeJail: 0,
    jailAttempts: 0,
    jailDoublesRolled: 0,
    hasRentWaiver: false,
    hasRezoningPermit: false,
    pendingLoan: null,
  };
}

/** Helper to create a default TileState */
export function createTileState(): TileState {
  return {
    ownerId: null,
    tier: 0 as Tier,
    mortgaged: false,
  };
}/** Default ruleset */
export const DEFAULT_RULES: RuleSet = {
  startingCash: 1500,
  paydayAmount: 200,
  auctionOnDecline: true,
  evenBuild: true,
  marketCycle: true,
  roles: true,
  influence: true,
  eventDeck: true,
  turnTimerSec: 30,
  suddenGrowthRound: null,
  bankruptcyGraceSec: 60,
  maxPlayers: 6,
  teamMode: false,
  freeParking: true,
};
