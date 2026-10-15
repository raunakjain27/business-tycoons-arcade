import { z } from 'zod';

// ===== Core Action Schemas =====

export const rollActionSchema = z.object({
  type: z.literal('ROLL'),
});

export const buyActionSchema = z.object({
  type: z.literal('BUY'),
});

export const declineBuyActionSchema = z.object({
  type: z.literal('DECLINE_BUY'),
});

export const bidActionSchema = z.object({
  type: z.literal('BID'),
  amount: z.number().int().positive().multipleOf(10),
});

export const passBidActionSchema = z.object({
  type: z.literal('PASS_BID'),
});

export const buildActionSchema = z.object({
  type: z.literal('BUILD'),
  tileId: z.number().int().min(0).max(39),
});

export const sellBuildingActionSchema = z.object({
  type: z.literal('SELL_BUILDING'),
  tileId: z.number().int().min(0).max(39),
});

export const mortgageActionSchema = z.object({
  type: z.literal('MORTGAGE'),
  tileId: z.number().int().min(0).max(39),
});

export const unmortgageActionSchema = z.object({
  type: z.literal('UNMORTGAGE'),
  tileId: z.number().int().min(0).max(39),
});

export const payJailFeeActionSchema = z.object({
  type: z.literal('PAY_JAIL_FEE'),
});

export const useJailCardActionSchema = z.object({
  type: z.literal('USE_JAIL_CARD'),
});

const tradeBundleSchema = z.object({
  tileIds: z.array(z.number().int().min(0).max(39)).default([]),
  cash: z.number().int().min(0).default(0),
  influence: z.number().int().min(0).default(0),
  cards: z.array(z.string()).default([]),
  rentContracts: z.array(z.object({
    tileId: z.number().int().min(0).max(39),
    percent: z.number().int().min(1).max(100),
    rounds: z.number().int().min(1).max(10),
  })).default([]),
});

export const proposeTradeActionSchema = z.object({
  type: z.literal('PROPOSE_TRADE'),
  offer: z.object({
    fromId: z.string(),
    toId: z.string(),
    give: tradeBundleSchema,
    want: tradeBundleSchema,
  }),
});

export const respondTradeActionSchema = z.object({
  type: z.literal('RESPOND_TRADE'),
  tradeId: z.string().min(1),
  response: z.enum(['accept', 'decline', 'counter']),
  counter: tradeBundleSchema.optional(),
});

export const useAbilityActionSchema = z.object({
  type: z.literal('USE_ABILITY'),
  target: z.union([z.string(), z.number().int().min(0).max(39)]).optional(),
});

export const spendInfluenceActionSchema = z.object({
  type: z.literal('SPEND_INFLUENCE'),
  item: z.enum(['lawyer', 'rezone', 'waiver', 'lobby', 'wildcard']),
});

export const raiseFundsDoneActionSchema = z.object({
  type: z.literal('RAISE_FUNDS_DONE'),
});

export const endTurnActionSchema = z.object({
  type: z.literal('END_TURN'),
});

export const resignActionSchema = z.object({
  type: z.literal('RESIGN'),
});

// ===== Union Schema for all Actions =====

export const actionSchema = z.discriminatedUnion('type', [
  rollActionSchema,
  buyActionSchema,
  declineBuyActionSchema,
  bidActionSchema,
  passBidActionSchema,
  buildActionSchema,
  sellBuildingActionSchema,
  mortgageActionSchema,
  unmortgageActionSchema,
  payJailFeeActionSchema,
  useJailCardActionSchema,
  proposeTradeActionSchema,
  respondTradeActionSchema,
  useAbilityActionSchema,
  spendInfluenceActionSchema,
  raiseFundsDoneActionSchema,
  endTurnActionSchema,
  resignActionSchema,
]);

// ===== Game State Validation Schemas =====

const tierSchema = z.number().int().min(0).max(4);

export const playerStateSchema = z.object({
  id: z.string(),
  name: z.string().max(32),
  tokenId: z.string(),
  roleId: z.string().nullable(),
  cash: z.number().int(),
  influence: z.number().int().default(0),
  position: z.number().int().min(0).max(39),
  inJail: z.boolean().default(false),
  jailTurns: z.number().int().default(0),
  doublesStreak: z.number().int().default(0),
  heldCards: z.array(z.string()).default([]),
  teamId: z.string().nullable(),
  abilityReadyRound: z.number().int().default(0),
  status: z.enum(['active', 'bankrupt', 'disconnected', 'left']),
  lastLandedTile: z.number().int().min(0).max(39).default(0),
  lastPositionBeforeJail: z.number().int().min(0).max(39).default(0),
  jailAttempts: z.number().int().default(0),
  jailDoublesRolled: z.number().int().default(0),
  hasRentWaiver: z.boolean().default(false),
  hasRezoningPermit: z.boolean().default(false),
  pendingLoan: z.object({
    amount: z.number().int(),
    interest: z.number(),
    dueRound: z.number().int(),
  }).nullable().default(null),
});

export const tileStateSchema = z.object({
  ownerId: z.string().nullable(),
  tier: tierSchema,
  mortgaged: z.boolean().default(false),
  rentLockedUntilRound: z.number().int().optional(),
});

export const tileDefSchema = z.object({
  id: z.number().int(),
  type: z.enum(['start', 'property', 'hub', 'utility', 'event', 'tax', 'jail', 'goToJail', 'communityFund', 'summit', 'influence']),
  name: z.string(),
  districtId: z.string().nullable(),
  price: z.number().int().nullable(),
  taxAmount: z.number().int().nullable().optional(),
});

export const districtDefSchema = z.object({
  id: z.string(),
  color: z.string(),
  tileIds: z.array(z.number().int()),
  buildCost: z.number().int(),
});

export const marketStateSchema = z.object({
  current: z.object({
    kind: z.enum(['steady', 'boom', 'crash', 'creditSurge', 'creditFreeze']),
    districtId: z.string().optional(),
    roundsLeft: z.number().int(),
  }),
  forecast: z.object({
    kind: z.enum(['steady', 'boom', 'crash', 'creditSurge', 'creditFreeze']),
    districtId: z.string().optional(),
  }),
});

export const ruleSetSchema = z.object({
  startingCash: z.number().int().min(500).max(5000).default(1500),
  paydayAmount: z.number().int().min(100).max(500).default(200),
  auctionOnDecline: z.boolean().default(true),
  evenBuild: z.boolean().default(true),
  marketCycle: z.boolean().default(true),
  roles: z.boolean().default(true),
  influence: z.boolean().default(true),
  eventDeck: z.boolean().default(true),
  turnTimerSec: z.number().int().min(10).max(120).nullable().default(30),
  suddenGrowthRound: z.number().int().nullable().default(null),
  bankruptcyGraceSec: z.number().int().min(30).max(300).default(60),
  maxPlayers: z.number().int().min(2).max(8).default(8),
  teamMode: z.boolean().default(false),
  singleDiceMode: z.boolean().default(false),
  doubleRentFullSet: z.boolean().default(true),
  vacationCash: z.boolean().default(true),
  noRentInPrison: z.boolean().default(true),
});

export const gameEventSchema = z.object({
  type: z.string(),
  playerId: z.string().optional(),
  tileId: z.number().int().optional(),
  amount: z.number().optional(),
  fromPlayerId: z.string().optional(),
  reason: z.string().optional(),
  card: z.string().optional(),
  effect: z.unknown().optional(),
}).passthrough();

// ===== Server → Client message schemas =====

export const serverStateUpdateSchema = z.object({
  type: z.literal('state'),
  /** Per-player filtered view of the game state (no hidden info). */
  state: z.record(z.unknown()),
  version: z.number().int(),
});

export const serverEventsSchema = z.object({
  type: z.literal('events'),
  events: z.array(gameEventSchema),
});

export const serverErrorSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

// ===== Client → Server message schemas =====

export const clientActionSchema = z.object({
  type: z.literal('action'),
  action: actionSchema,
  /** Client must echo the last version it received to prevent stale actions. */
  version: z.number().int(),
});

export const clientJoinSchema = z.object({
  type: z.literal('join'),
  name: z.string().min(1).max(32),
  tokenId: z.string().default(''),
  roomCode: z.string().min(4).max(8).optional(),
});

// ===== Error Schema =====

export const errorCodeSchema = z.enum([
  'ACTION_UNKNOWN',
  'PLAYER_INACTIVE',
  'NOT_YOUR_TURN',
  'ILLEGAL_MOVE',
  'INSUFFICIENT_FUNDS',
  'PROPERTY_ALREADY_OWNED',
  'AUCTION_ENDED',
  'TRADE_INVALID',
  'INFLUENCE_INSUFFICIENT',
  'ABILITY_COOLDOWN',
  'GAME_OVER',
  'WRONG_PHASE',
  'PROPERTY_NOT_AVAILABLE',
  'BID_TOO_LOW',
  'NO_BUILDINGS_TO_SELL',
  'MAX_TIER_REACHED',
  'SELL_BUILDINGS_FIRST',
  'PROPERTY_MORTGAGED',
  'PROPERTY_NOT_MORTGAGED',
  'VIOLATES_EVEN_BUILD',
  'NO_GET_OUT_CARD',
  'TRADE_NOT_FOUND',
  'TRADE_EXPIRED',
  'INVALID_TARGET',
  'UNKNOWN_ROLE',
  'NO_ROLE_ASSIGNED',
  'CANNOT_BORROW',
  'BANKRUPTCY',
  'NO_SUPPLY_LEFT',
]);

// ===== Inferred Types =====

export type ActionSchemaType = z.infer<typeof actionSchema>;
export type ParsedGameEvent = z.infer<typeof gameEventSchema>;
export type ParsedPlayerState = z.infer<typeof playerStateSchema>;
export type ParsedTileState = z.infer<typeof tileStateSchema>;
export type ParsedTileDef = z.infer<typeof tileDefSchema>;
export type ParsedDistrictDef = z.infer<typeof districtDefSchema>;
export type ParsedMarketState = z.infer<typeof marketStateSchema>;
export type ParsedRuleSet = z.infer<typeof ruleSetSchema>;