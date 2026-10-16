import type {
  PlayerId,
  TileId,
  Tier,
  GameState,
  Action,
  GameEvent,
  ErrorCode,
  Rng,
  ActionResult,
  ActionContext,
  MarketKind,
  TradeOffer,
  TradeBundle,
} from './types';
import type { BoardDef } from './types';
import {
  drawCard,
  resolveEventCard,
  getEventCardById,
  ALL_EVENT_CARDS,
  getBoardForState as eventCardGetBoardForState,
} from './eventCards';

export * from './types';
export { drawCard, resolveEventCard, getEventCardById, ALL_EVENT_CARDS } from './eventCards';

import boardDefault from '../content/board.json' with { type: 'json' };
import { BOARDS as ALL_BOARDS, getBoard as contentGetBoard } from '../content/boards';

export const BOARD: BoardDef = boardDefault as BoardDef;
export const BOARDS: Record<string, BoardDef> = ALL_BOARDS;

export function setActiveBoard(key: string): BoardDef {
  return getBoard(key);
}

export function getBoard(key: string = 'default'): BoardDef {
  return contentGetBoard(key) || BOARD;
}

export function getBoardForState(state?: GameState): BoardDef {
  const key = state?.boardKey ?? 'default';
  return getBoard(key);
}

// Forward any callers that imported this from the engine package root.
export function getBoardForEventState(state?: GameState): BoardDef {
  return eventCardGetBoardForState(state);
}

/** Default pseudo-random number generator function for bots and simulation. */
export const rng: Rng = () => Math.floor(Math.random() * 6) + 1;

/**
 * Rent multipliers across property building tiers:
 * Land=1, House=5, Apartments=15, Tower=40, Landmark=70
 */
export const TIER_MULT: Record<Tier, number> = {
  0: 1,  // Land
  1: 5,  // House
  2: 15, // Apartments
  3: 40, // Tower
  4: 70, // Landmark
};

// ============================================================================
// Core Calculation & Query Helpers
// ============================================================================

/**
 * Counts the number of tiles of a given type (and optional district) owned by ownerId.
 */
export function countOwned(
  state: GameState,
  ownerId: PlayerId,
  type: 'hub' | 'utility' | 'property',
  districtId?: string
): number {
  let count = 0;
  const board = getBoardForState(state);
  for (const [tileIdStr, tileState] of Object.entries(state.tiles)) {
    const tileId = Number(tileIdStr);
    const tileDef = board.tiles[tileId];
    if (!tileDef) continue;
    if (tileState.ownerId !== ownerId) continue;
    if (type === 'property') {
      if (tileDef.type !== 'property') continue;
      if (districtId && tileDef.districtId !== districtId) continue;
    }
    if (type === 'hub' && tileDef.type !== 'hub') continue;
    if (type === 'utility' && tileDef.type !== 'utility') continue;
    count++;
  }
  return count;
}

/**
 * Returns true if ownerId owns every property in districtId and none are mortgaged.
 */
export function ownsFullDistrict(state: GameState, ownerId: PlayerId, districtId: string): boolean {
  const board = getBoardForState(state);
  const district = board.districts[districtId];
  if (!district) return false;
  return district.tileIds.every(tileId => {
    const tileState = state.tiles[tileId];
    return tileState?.ownerId === ownerId && !tileState.mortgaged;
  });
}

/**
 * Adjacency synergy: +10% per same-district unmortgaged neighbor owned by same player (max +20%).
 * Checks ring board neighbors (tileId - 1 and tileId + 1 modulo 40).
 */
export function adjacencySynergy(state: GameState, tileId: TileId): number {
  const tileDef = BOARD.tiles[tileId];
  if (!tileDef || tileDef.type !== 'property' || !tileDef.districtId) return 0;
  const tileState = state.tiles[tileId];
  if (!tileState || !tileState.ownerId) return 0;
  const ownerId = tileState.ownerId;

  let synergy = 0;
  const neighbors = [(tileId - 1 + 40) % 40, (tileId + 1) % 40];
  for (const neighborIdx of neighbors) {
    const neighborDef = BOARD.tiles[neighborIdx];
    const neighborState = state.tiles[neighborIdx];
    if (
      neighborDef &&
      neighborDef.districtId === tileDef.districtId &&
      neighborState?.ownerId === ownerId &&
      !neighborState.mortgaged
    ) {
      synergy += 0.1;
    }
  }
  return Math.min(0.2, synergy);
}

/**
 * Market rent modifier: boom=1.5x, crash=0.75x for properties in affected district.
 */
export function marketModifier(state: GameState, tileId: TileId): number {
  const current = state.market.current;
  if (current.kind === 'steady' || !current.districtId) return 1;
  const tileDef = BOARD.tiles[tileId];
  if (!tileDef || tileDef.districtId !== current.districtId) return 1;
  if (current.kind === 'boom') return 1.5;
  if (current.kind === 'crash') return 0.75;
  return 1;
}

/**
 * Authoritative rent calculation:
 * - Hub rent: $25 * 2^(hubsOwned - 1) based on owner count
 * - Utility rent: diceTotal * 4 (1 utility) or * 10 (2 utilities) based on owner count
 * - Property rent: base round(price / 8) * tier mult
 * - Full district bonus: 2x rent at Land tier if owner has all unmortgaged tiles
 * - Adjacency synergy: +10% per same-district neighbor owned by same player
 * - Landlord role passive: +15% rent on Land tier
 * - Market modifier: boom 1.5x, crash 0.75x
 * - Sudden growth: after configured round, rent grows 1.1x per round
 * - Mortgaged and rent-locked properties collect 0
 */
export function computeRent(state: GameState, tileId: TileId, dice: [number, number]): number {
  const board = getBoardForState(state);
  const tileDef = board.tiles[tileId];
  const tileState = state.tiles[tileId];
  if (!tileDef || !tileState || !tileState.ownerId || tileState.mortgaged) return 0;
  if (tileState.rentLockedUntilRound && tileState.rentLockedUntilRound >= state.round) return 0;

  // Don't collect rent while in prison rule
  if (state.rules.noRentInPrison !== false) {
    const owner = state.players[tileState.ownerId];
    if (owner && owner.inJail) return 0;
  }

  let rent = 0;
  if (tileDef.type === 'hub') {
    const hubs = countOwned(state, tileState.ownerId, 'hub');
    rent = 25 * Math.pow(2, Math.max(0, hubs - 1));
  } else if (tileDef.type === 'utility') {
    const utils = countOwned(state, tileState.ownerId, 'utility');
    const diceTotal = dice[0] + dice[1];
    rent = diceTotal * (utils >= 2 ? 10 : 4);
  } else {
    // Base rent = round(price / 8)
    const baseRent = Math.round((tileDef.price ?? 0) / 8);
    const mult = TIER_MULT[tileState.tier] ?? 1;
    rent = baseRent * mult;

    // Full district bonus: 2x rent at Land tier (0) if owner has all tiles unmortgaged
    if (tileState.tier === 0 && tileDef.districtId && ownsFullDistrict(state, tileState.ownerId, tileDef.districtId)) {
      if (state.rules.doubleRentFullSet !== false) {
        rent *= 2;
      }
    }

    // Adjacency synergy
    rent *= (1 + adjacencySynergy(state, tileId));

    // Landlord role passive: +15% rent on Land tier
    const owner = state.players[tileState.ownerId];
    if (owner && owner.roleId === 'Landlord' && tileState.tier === 0) {
      rent *= 1.15;
    }
  }

  // Market modifier
  rent *= marketModifier(state, tileId);

  // Sudden growth: after configured round, rent grows 1.1x per round
  const g = state.rules.suddenGrowthRound;
  if (g && state.round > g) {
    rent *= Math.pow(1.1, state.round - g);
  }

  return Math.round(rent);
}

// ============================================================================
// Phase Validation
// ============================================================================

type PhaseCheckResult = { ok: true } | { ok: false; error: ErrorCode; message: string };

function validatePhaseForAction(phase: GameState['phase'], action: Action): PhaseCheckResult {
  switch (action.type) {
    case 'ROLL':
      if (phase !== 'awaitRoll' && phase !== 'awaitJailChoice') {
        return { ok: false, error: 'WRONG_PHASE', message: `Cannot ROLL in phase ${phase}` };
      }
      return { ok: true };

    case 'BUY':
    case 'DECLINE_BUY':
      if (phase !== 'awaitBuyDecision') {
        return { ok: false, error: 'WRONG_PHASE', message: `Cannot decide purchase in phase ${phase}` };
      }
      return { ok: true };

    case 'BID':
    case 'PASS_BID':
      if (phase !== 'auction') {
        return { ok: false, error: 'WRONG_PHASE', message: `Cannot bid in phase ${phase}` };
      }
      return { ok: true };

    case 'BUILD':
    case 'UNMORTGAGE':
    case 'PROPOSE_TRADE':
    case 'END_TURN':
      if (phase !== 'awaitEndTurn') {
        return { ok: false, error: 'WRONG_PHASE', message: `Action ${action.type} only allowed in awaitEndTurn phase` };
      }
      return { ok: true };

    case 'SELL_BUILDING':
    case 'MORTGAGE':
      if (phase !== 'awaitEndTurn' && phase !== 'awaitDebtSettlement') {
        return { ok: false, error: 'WRONG_PHASE', message: `Cannot sell/mortgage in phase ${phase}` };
      }
      return { ok: true };

    case 'PAY_JAIL_FEE':
    case 'USE_JAIL_CARD':
      if (phase !== 'awaitJailChoice') {
        return { ok: false, error: 'WRONG_PHASE', message: `Cannot use jail options in phase ${phase}` };
      }
      return { ok: true };

    case 'RESPOND_TRADE':
      return { ok: true };

    case 'USE_ABILITY':
      if (phase !== 'awaitEndTurn' && phase !== 'awaitRoll') {
        return { ok: false, error: 'WRONG_PHASE', message: `Cannot use ability in phase ${phase}` };
      }
      return { ok: true };

    case 'SPEND_INFLUENCE':
      if (action.item === 'lawyer') {
        if (phase !== 'awaitJailChoice' && phase !== 'awaitEndTurn') {
          return { ok: false, error: 'WRONG_PHASE', message: `Cannot use lawyer in phase ${phase}` };
        }
      } else if (phase !== 'awaitEndTurn') {
        return { ok: false, error: 'WRONG_PHASE', message: `Cannot spend influence in phase ${phase}` };
      }
      return { ok: true };

    case 'RAISE_FUNDS_DONE':
      if (phase !== 'awaitDebtSettlement') {
        return { ok: false, error: 'WRONG_PHASE', message: `Cannot finish debt settlement in phase ${phase}` };
      }
      return { ok: true };

    case 'RESIGN':
      return { ok: true };

    default:
      return { ok: false, error: 'ACTION_UNKNOWN', message: 'Unknown action' };
  }
}

// ============================================================================
// Main applyAction Entry Point
// ============================================================================

/**
 * Authoritative, server-side entry point to apply an action to a game state.
 * Validates inputs, deeply clones state using structuredClone, executes logic,
 * increments version, and returns updated state + events or error.
 */
export function applyAction(
  state: GameState,
  playerId: PlayerId,
  action: Action,
  ctx: ActionContext
): ActionResult {
  // 1. Validate player exists and is active
  const player = state.players[playerId];
  if (!player) {
    return { ok: false, error: 'PLAYER_INACTIVE', message: 'Player does not exist' };
  }
  if (player.status !== 'active') {
    return { ok: false, error: 'PLAYER_INACTIVE', message: 'Player is not active' };
  }

  // 2. Validate turn
  const isAuctionBid = state.phase === 'auction' && (action.type === 'BID' || action.type === 'PASS_BID');
  const isTradeResponse = action.type === 'RESPOND_TRADE';
  const isResign = action.type === 'RESIGN';

  if (!isAuctionBid && !isTradeResponse && !isResign) {
    if (playerId !== state.turnPlayerId) {
      return { ok: false, error: 'NOT_YOUR_TURN', message: 'It is not your turn' };
    }
  }

  // 3. Validate phase
  if (state.phase === 'gameOver') {
    return { ok: false, error: 'GAME_OVER', message: 'Game is already over' };
  }

  const phaseCheck = validatePhaseForAction(state.phase, action);
  if ('error' in phaseCheck) {
    return { ok: false, error: phaseCheck.error, message: phaseCheck.message };
  }

  // 4. Deep clone state with structuredClone()
  const nextState = structuredClone(state);
  const events: GameEvent[] = [];

  // 5. Apply the action
  const execResult = executeAction(nextState, playerId, action, ctx, events);
  if ('error' in execResult) {
    return { ok: false, error: execResult.error, message: execResult.message };
  }

  // 6. Increment version and append events to state.log
  if (!nextState.log) {
    nextState.log = [];
  }
  nextState.log.push(...events);
  nextState.version = (nextState.version || 0) + 1;

  // 7. Return success
  return { ok: true, state: nextState, events };
}

// ============================================================================
// Action Dispatcher & Handlers
// ============================================================================

type ExecuteActionResult = { ok: true } | { ok: false; error: ErrorCode; message?: string };

function executeAction(
  state: GameState,
  playerId: PlayerId,
  action: Action,
  ctx: ActionContext,
  events: GameEvent[]
): ExecuteActionResult {
  switch (action.type) {
    case 'ROLL':
      return handleRoll(state, playerId, ctx, events);
    case 'BUY':
      return handleBuy(state, playerId, events);
    case 'DECLINE_BUY':
      return handleDeclineBuy(state, playerId, ctx, events);
    case 'BID':
      return handleBid(state, playerId, action.amount, ctx, events);
    case 'PASS_BID':
      return handlePassBid(state, playerId, events);
    case 'BUILD':
      return handleBuild(state, playerId, action.tileId, events);
    case 'SELL_BUILDING':
      return handleSellBuilding(state, playerId, action.tileId, events);
    case 'MORTGAGE':
      return handleMortgage(state, playerId, action.tileId, events);
    case 'UNMORTGAGE':
      return handleUnmortgage(state, playerId, action.tileId, events);
    case 'PAY_JAIL_FEE':
      return handlePayJailFee(state, playerId, events);
    case 'USE_JAIL_CARD':
      return handleUseJailCard(state, playerId, events);
    case 'PROPOSE_TRADE':
      return handleProposeTrade(state, playerId, action.offer, ctx, events);
    case 'RESPOND_TRADE':
      return handleRespondTrade(state, playerId, action.tradeId, action.response, action.counter, ctx, events);
    case 'USE_ABILITY':
      return handleUseAbility(state, playerId, action.target, ctx, events);
    case 'SPEND_INFLUENCE':
      return handleSpendInfluence(state, playerId, action.item, ctx, events);
    case 'RAISE_FUNDS_DONE':
      return handleRaiseFundsDone(state, playerId, events);
    case 'ACKNOWLEDGE_EVENT':
      return handleAcknowledgeEvent(state, playerId, events);
    case 'END_TURN':
      return handleEndTurn(state, playerId, events);
    case 'RESIGN':
      return handleResign(state, playerId, events);
    default:
      return { ok: false, error: 'ACTION_UNKNOWN', message: 'Unknown action type' };
  }
}

// ----------------------------------------------------------------------------
// Movement & Dice Roll
// ----------------------------------------------------------------------------

function handleRoll(
  state: GameState,
  playerId: PlayerId,
  ctx: ActionContext,
  events: GameEvent[]
): ExecuteActionResult {
  const player = state.players[playerId];

  // Jailed player rolling doubles escape attempt
  if (state.phase === 'awaitJailChoice' && player.inJail) {
    const die1 = (Math.abs(Math.floor(ctx.rng())) % 6) + 1;
    const die2 = (Math.abs(Math.floor(ctx.rng())) % 6) + 1;
    state.lastDice = [die1, die2];
    player.jailAttempts = (player.jailAttempts || 0) + 1;
    player.jailTurns = (player.jailTurns || 0) + 1;

    if (die1 === die2) {
      player.inJail = false;
      player.jailAttempts = 0;
      player.jailTurns = 0;
      player.doublesStreak = 0;
      events.push({
        type: 'jail_released_doubles',
        playerId,
        dice: [die1, die2],
      });
      movePlayerAndResolve(state, playerId, die1 + die2, false, ctx, events);
      return { ok: true };
    }

    if (player.jailAttempts >= 3) {
      // Must pay $50 after 3 failed attempts
      player.cash -= 50;
      state.communityFund += 50;
      player.inJail = false;
      player.jailAttempts = 0;
      player.jailTurns = 0;
      player.doublesStreak = 0;
      events.push({
        type: 'jail_forced_fee_paid',
        playerId,
        amount: 50,
        dice: [die1, die2],
      });
      if (player.cash < 0) {
        state.phase = 'awaitDebtSettlement';
        state.pendingDebt = { debtorId: playerId, creditorId: 'bank', amount: Math.abs(player.cash) };
      }
      movePlayerAndResolve(state, playerId, die1 + die2, false, ctx, events);
      return { ok: true };
    }

    events.push({
      type: 'jail_roll_attempt',
      playerId,
      attempt: player.jailAttempts,
      dice: [die1, die2],
    });
    state.phase = 'awaitEndTurn';
    return { ok: true };
  }

  // Standard roll
  const isSingleDice = state.rules.singleDiceMode ?? false;
  const die1 = (Math.abs(Math.floor(ctx.rng())) % 6) + 1;
  const die2 = isSingleDice ? 0 : (Math.abs(Math.floor(ctx.rng())) % 6) + 1;
  state.lastDice = isSingleDice ? [die1, 0] : [die1, die2];
  const isDoubles = isSingleDice ? false : die1 === die2;
  player.doublesStreak = isDoubles ? (player.doublesStreak + 1) : 0;

  events.push({
    type: 'dice_rolled',
    playerId,
    dice: state.lastDice,
    isDoubles,
    doublesStreak: player.doublesStreak,
  });

  // Cornerstone Twists: Snake Eyes (double 1) gives lucky bonus!
  if (die1 === 1 && die2 === 1) {
    player.cash += 500;
    events.push({
      type: 'snake_eyes_bonus',
      playerId,
      amount: 500,
    });
  }
  // Lucky 7 gives bonus cash
  if (die1 + die2 === 7 && !(die1 === 3 && die2 === 4)) {
    player.cash += 77;
    events.push({
      type: 'lucky_seven_bonus',
      playerId,
      amount: 77,
    });
  }

  // Three doubles sends to jail
  if (player.doublesStreak >= 3) {
    player.lastPositionBeforeJail = player.position;
    player.position = 10;
    player.inJail = true;
    player.doublesStreak = 0;
    player.jailAttempts = 0;
    player.jailTurns = 0;
    state.phase = 'awaitEndTurn';
    events.push({
      type: 'player_jailed',
      playerId,
      tileId: 10,
      reason: 'three_doubles',
    });
    return { ok: true };
  }

  movePlayerAndResolve(state, playerId, die1 + die2, isDoubles, ctx, events);
  return { ok: true };
}

function movePlayerAndResolve(
  state: GameState,
  playerId: PlayerId,
  steps: number,
  isDoubles: boolean,
  ctx: ActionContext,
  events: GameEvent[]
): void {
  const player = state.players[playerId];
  const oldPosition = player.position;
  const newPosition = ((oldPosition + steps) % 40) as TileId;

  // Payday check: wrapped around or landed on 0
  if (newPosition < oldPosition || newPosition === 0) {
    const payday = state.rules.paydayAmount;
    player.cash += payday;
    events.push({
      type: 'payday_triggered',
      playerId,
      amount: payday,
    });
  }

  player.position = newPosition;
  player.lastLandedTile = newPosition;

  events.push({
    type: 'player_moved',
    playerId,
    fromPosition: oldPosition,
    toPosition: newPosition,
    steps,
  });

  const tileDef = BOARD.tiles[newPosition];
  const tileState = state.tiles[newPosition];

  switch (tileDef.type) {
    case 'start':
    case 'jail':
      state.phase = isDoubles ? 'awaitRoll' : 'awaitEndTurn';
      break;

    case 'goToJail':
      player.lastPositionBeforeJail = newPosition;
      player.position = 10;
      player.inJail = true;
      player.doublesStreak = 0;
      player.jailAttempts = 0;
      player.jailTurns = 0;
      state.phase = 'awaitEndTurn';
      events.push({
        type: 'player_jailed',
        playerId,
        tileId: 10,
        reason: 'goToJail',
      });
      break;

    case 'communityFund':
      if (state.communityFund > 0) {
        const collected = state.communityFund;
        player.cash += collected;
        state.communityFund = 0;
        events.push({
          type: 'community_fund_collected',
          playerId,
          amount: collected,
        });
      }
      state.phase = isDoubles ? 'awaitRoll' : 'awaitEndTurn';
      break;

    case 'tax': {
      const taxAmount = tileDef.taxAmount ?? 0;
      player.cash -= taxAmount;
      state.communityFund += taxAmount;
      events.push({
        type: 'tax_paid',
        playerId,
        tileId: newPosition,
        amount: taxAmount,
      });
      if (player.cash < 0) {
        state.phase = 'awaitDebtSettlement';
        state.pendingDebt = {
          debtorId: playerId,
          creditorId: 'bank',
          amount: Math.abs(player.cash),
        };
      } else {
        state.phase = isDoubles ? 'awaitRoll' : 'awaitEndTurn';
      }
      break;
    }

    case 'summit':
    case 'influence':
      player.influence += 1;
      events.push({
        type: 'influence_gained',
        playerId,
        amount: 1,
      });
      state.phase = isDoubles ? 'awaitRoll' : 'awaitEndTurn';
      break;

    case 'event': {
      state.phase = 'resolveEvent';
      if (state.rules.eventDeck) {
        const deckType = (Math.abs(Math.floor(ctx.rng())) % 2 === 0) ? 'chronicle' : 'community';
        const { card } = drawCard(state, ctx.rng, deckType as any);
        if (card) {
          const res = resolveEventCard(state, playerId, card, ctx, deckType as any);
          events.push(...res.events);
        }
      }
      if (state.phase === 'resolveEvent') {
        state.phase = isDoubles ? 'awaitRoll' : 'awaitEndTurn';
      }
      break;
    }

    case 'property':
    case 'hub':
    case 'utility': {
      if (!tileState.ownerId) {
        state.phase = 'awaitBuyDecision';
        events.push({
          type: 'property_landed_unowned',
          playerId,
          tileId: newPosition,
          tileName: tileDef.name,
          price: tileDef.price,
        });
      } else if (tileState.ownerId !== playerId && !tileState.mortgaged) {
        const dice = state.lastDice ?? [steps > 6 ? 6 : steps, steps > 6 ? steps - 6 : 0];
        let rent = computeRent(state, newPosition, dice);

        if (player.hasRentWaiver) {
          rent = Math.floor(rent / 2);
          player.hasRentWaiver = false;
        }
        // Cornerstone Twist: Influence Shield - high influence gives discount on rent paid
        if (player.influence >= 5) {
          rent = Math.floor(rent * 0.95);
        }

        player.cash -= rent;
        const owner = state.players[tileState.ownerId];
        if (owner) {
          owner.cash += rent;
        }

        events.push({
          type: 'rent_paid',
          playerId,
          fromPlayerId: playerId,
          toPlayerId: tileState.ownerId,
          tileId: newPosition,
          tileName: tileDef.name,
          amount: rent,
        });

        if (player.cash < 0) {
          state.phase = 'awaitDebtSettlement';
          state.pendingDebt = {
            debtorId: playerId,
            creditorId: tileState.ownerId,
            amount: Math.abs(player.cash),
          };
        } else {
          state.phase = isDoubles ? 'awaitRoll' : 'awaitEndTurn';
        }
      } else {
        // Own property or mortgaged property
        state.phase = isDoubles ? 'awaitRoll' : 'awaitEndTurn';
      }
      break;
    }

    default:
      state.phase = isDoubles ? 'awaitRoll' : 'awaitEndTurn';
      break;
  }
}

// ----------------------------------------------------------------------------
// Property Purchase & Auction
// ----------------------------------------------------------------------------

function handleBuy(
  state: GameState,
  playerId: PlayerId,
  events: GameEvent[]
): ExecuteActionResult {
  const player = state.players[playerId];
  const tileId = player.lastLandedTile;
  const tileDef = BOARD.tiles[tileId];
  const tileState = state.tiles[tileId];

  if (!tileDef || tileState.ownerId !== null) {
    return { ok: false, error: 'PROPERTY_NOT_AVAILABLE', message: 'Property is not available' };
  }

  let cost = tileDef.price ?? 0;
  // Broker passive: 5% off purchases
  if (player.roleId === 'Broker') {
    cost = Math.round(cost * 0.95);
  }

  if (player.cash < cost) {
    return { ok: false, error: 'INSUFFICIENT_FUNDS', message: 'Not enough cash to buy property' };
  }

  player.cash -= cost;
  tileState.ownerId = playerId;
  tileState.tier = 0;
  tileState.mortgaged = false;

  events.push({
    type: 'property_bought',
    playerId,
    tileId,
    tileName: tileDef.name,
    cost,
  });

  state.phase = player.doublesStreak > 0 && !player.inJail ? 'awaitRoll' : 'awaitEndTurn';
  return { ok: true };
}

function handleDeclineBuy(
  state: GameState,
  playerId: PlayerId,
  ctx: ActionContext,
  events: GameEvent[]
): ExecuteActionResult {
  const player = state.players[playerId];
  const tileId = player.lastLandedTile;
  const tileDef = BOARD.tiles[tileId];

  events.push({
    type: 'purchase_declined',
    playerId,
    tileId,
    tileName: tileDef?.name,
  });

  if (state.rules.auctionOnDecline) {
    state.phase = 'auction';
    state.auction = {
      tileId,
      highBid: 0,
      highBidder: null,
      endsAt: ctx.now + 15000,
      passed: [],
    };
    events.push({
      type: 'auction_started',
      tileId,
      tileName: tileDef?.name,
      endsAt: state.auction.endsAt,
    });
  } else {
    state.phase = player.doublesStreak > 0 && !player.inJail ? 'awaitRoll' : 'awaitEndTurn';
  }

  return { ok: true };
}

function handleBid(
  state: GameState,
  playerId: PlayerId,
  amount: number,
  ctx: ActionContext,
  events: GameEvent[]
): ExecuteActionResult {
  const auction = state.auction;
  if (!auction) {
    return { ok: false, error: 'AUCTION_ENDED', message: 'No active auction' };
  }

  if (auction.passed.includes(playerId)) {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'You have already passed this auction' };
  }

  const minBid = (auction.highBid || 0) + 10;
  if (amount < minBid) {
    return { ok: false, error: 'BID_TOO_LOW', message: `Minimum bid is ${minBid}` };
  }

  const bidder = state.players[playerId];
  const currentCommitted = (auction.highBidder === playerId) ? auction.highBid : 0;
  const additionalCashNeeded = amount - currentCommitted;

  if (bidder.cash < additionalCashNeeded) {
    return { ok: false, error: 'INSUFFICIENT_FUNDS', message: 'Not enough cash for bid' };
  }

  // Proper escrow: refund previous bidder if different player
  if (auction.highBidder && auction.highBidder !== playerId) {
    const prevBidder = state.players[auction.highBidder];
    if (prevBidder) {
      prevBidder.cash += auction.highBid;
    }
  }

  bidder.cash -= additionalCashNeeded;
  auction.highBid = amount;
  auction.highBidder = playerId;
  auction.endsAt = ctx.now + 15000;

  events.push({
    type: 'bid_placed',
    playerId,
    amount,
    tileId: auction.tileId,
    endsAt: auction.endsAt,
  });

  return { ok: true };
}

function handlePassBid(
  state: GameState,
  playerId: PlayerId,
  events: GameEvent[]
): ExecuteActionResult {
  const auction = state.auction;
  if (!auction) {
    return { ok: true };
  }

  if (!auction.passed.includes(playerId)) {
    auction.passed.push(playerId);
  }

  events.push({
    type: 'bid_passed',
    playerId,
    tileId: auction.tileId,
  });

  const activePlayers = Object.values(state.players).filter(p => p.status === 'active');
  const eligibleBidders = activePlayers.filter(p => !auction.passed.includes(p.id));
  const shouldEnd = auction.highBidder ? (eligibleBidders.length <= 1) : (eligibleBidders.length === 0);

  if (shouldEnd) {
    const tileDef = BOARD.tiles[auction.tileId];
    const tileState = state.tiles[auction.tileId];

    if (auction.highBidder) {
      tileState.ownerId = auction.highBidder;
      tileState.tier = 0;
      tileState.mortgaged = false;

      events.push({
        type: 'auction_won',
        winnerId: auction.highBidder,
        tileId: auction.tileId,
        tileName: tileDef?.name,
        winningBid: auction.highBid,
      });
    } else {
      events.push({
        type: 'auction_closed_unbought',
        tileId: auction.tileId,
        tileName: tileDef?.name,
      });
    }

    state.auction = null;
    const turnPlayer = state.players[state.turnPlayerId];
    state.phase = turnPlayer && turnPlayer.doublesStreak > 0 && !turnPlayer.inJail ? 'awaitRoll' : 'awaitEndTurn';
  }

  return { ok: true };
}

// ----------------------------------------------------------------------------
// Building & Mortgage Management
// ----------------------------------------------------------------------------

function handleBuild(
  state: GameState,
  playerId: PlayerId,
  tileId: TileId,
  events: GameEvent[]
): ExecuteActionResult {
  const tileDef = BOARD.tiles[tileId];
  const tileState = state.tiles[tileId];

  if (!tileDef || tileDef.type !== 'property' || !tileDef.districtId) {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'Tile is not a buildable property' };
  }

  if (tileState.ownerId !== playerId) {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'You do not own this property' };
  }

  if (tileState.mortgaged) {
    return { ok: false, error: 'PROPERTY_MORTGAGED', message: 'Cannot build on mortgaged property' };
  }

  if (tileState.tier >= 4) {
    return { ok: false, error: 'MAX_TIER_REACHED', message: 'Maximum building tier reached' };
  }

  // Must own full unmortgaged district
  if (!ownsFullDistrict(state, playerId, tileDef.districtId)) {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'Must own all unmortgaged properties in district to build' };
  }

  const district = BOARD.districts[tileDef.districtId];
  const districtTileStates = district.tileIds.map(id => state.tiles[id]);
  const player = state.players[playerId];

  // Even-build rule: no tile's tier can be more than 1 above lowest tier in district
  if (state.rules.evenBuild && !player.hasRezoningPermit) {
    const minTierInDistrict = Math.min(...districtTileStates.map(s => s.tier));
    if (tileState.tier > minTierInDistrict) {
      return { ok: false, error: 'VIOLATES_EVEN_BUILD', message: 'Even-build rule requires building lowest tier properties first' };
    }
  }

  // Zoning caps: max 3 Towers and 1 Landmark per district
  if (tileState.tier === 2) {
    const towersInDistrict = districtTileStates.filter(s => s.tier === 3).length;
    if (towersInDistrict >= 3) {
      return { ok: false, error: 'MAX_TIER_REACHED', message: 'District already has maximum 3 Towers' };
    }
  }
  if (tileState.tier === 3) {
    const landmarksInDistrict = districtTileStates.filter(s => s.tier === 4).length;
    if (landmarksInDistrict >= 1) {
      return { ok: false, error: 'MAX_TIER_REACHED', message: 'District already has maximum 1 Landmark' };
    }
  }

  // Housing shortage: check global pool
  const nextTier = (tileState.tier + 1) as Tier;
  const housesAvailable = state.housesAvailable ?? 32;
  const towersAvailable = state.towersAvailable ?? 12;
  if (nextTier === 1 || nextTier === 2) {
    if (housesAvailable <= 0) {
      return { ok: false, error: 'NO_SUPPLY_LEFT', message: 'No houses available in the city housing pool (32 house limit reached)' };
    }
    state.housesAvailable = housesAvailable - 1;
  } else if (nextTier >= 3) {
    if (towersAvailable <= 0) {
      return { ok: false, error: 'NO_SUPPLY_LEFT', message: 'No towers available in the city housing pool (12 tower limit reached)' };
    }
    state.towersAvailable = towersAvailable - 1;
  }

  // Cost: Landmark is 2x buildCost, others are buildCost
  let cost = district.buildCost;
  if (tileState.tier === 3) {
    cost *= 2;
  }

  // Tycoon passive: 10% off building costs
  if (player.roleId === 'Tycoon') {
    cost = Math.round(cost * 0.9);
  }

  if (player.cash < cost) {
    return { ok: false, error: 'INSUFFICIENT_FUNDS', message: 'Not enough cash to build' };
  }

  player.cash -= cost;
  tileState.tier = (tileState.tier + 1) as Tier;

  if (player.hasRezoningPermit) {
    player.hasRezoningPermit = false;
  }

  events.push({
    type: 'building_constructed',
    playerId,
    tileId,
    tileName: tileDef.name,
    newTier: tileState.tier,
    cost,
  });

  return { ok: true };
}

function handleSellBuilding(
  state: GameState,
  playerId: PlayerId,
  tileId: TileId,
  events: GameEvent[]
): ExecuteActionResult {
  const tileDef = BOARD.tiles[tileId];
  const tileState = state.tiles[tileId];

  if (!tileDef || tileDef.type !== 'property' || !tileDef.districtId) {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'Tile is not a property' };
  }

  if (tileState.ownerId !== playerId) {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'You do not own this property' };
  }

  if (tileState.tier === 0) {
    return { ok: false, error: 'NO_BUILDINGS_TO_SELL', message: 'No buildings to sell on this property' };
  }

  const district = BOARD.districts[tileDef.districtId];
  const isLandmark = tileState.tier === 4;
  const baseCost = isLandmark ? district.buildCost * 2 : district.buildCost;
  const refund = Math.floor(baseCost / 2);

  const player = state.players[playerId];
  player.cash += refund;
  const soldTier = tileState.tier;
  tileState.tier = (tileState.tier - 1) as Tier;
  if (soldTier === 1 || soldTier === 2) {
    state.housesAvailable = (state.housesAvailable ?? 32) + 1;
  } else if (soldTier >= 3) {
    state.towersAvailable = (state.towersAvailable ?? 12) + 1;
  }

  events.push({
    type: 'building_sold',
    playerId,
    tileId,
    tileName: tileDef.name,
    tierSold: soldTier,
    newTier: tileState.tier,
    refund,
  });

  return { ok: true };
}

function handleMortgage(
  state: GameState,
  playerId: PlayerId,
  tileId: TileId,
  events: GameEvent[]
): ExecuteActionResult {
  const tileDef = BOARD.tiles[tileId];
  const tileState = state.tiles[tileId];

  if (!tileDef || tileState.ownerId !== playerId) {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'You do not own this property' };
  }

  if (tileState.mortgaged) {
    return { ok: false, error: 'PROPERTY_MORTGAGED', message: 'Property is already mortgaged' };
  }

  if (tileState.tier > 0) {
    return { ok: false, error: 'SELL_BUILDINGS_FIRST', message: 'Must sell buildings before mortgaging' };
  }

  if (tileDef.districtId) {
    const district = BOARD.districts[tileDef.districtId];
    const hasBuildings = district.tileIds.some(id => state.tiles[id].tier > 0) ?? false;
    if (hasBuildings) {
      return { ok: false, error: 'SELL_BUILDINGS_FIRST', message: 'Must sell all buildings in district before mortgaging' };
    }
  }

  if (state.market.current.kind === 'creditFreeze') {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'Cannot mortgage during credit freeze' };
  }

  const mortgageValue = Math.floor((tileDef.price ?? 0) / 2);
  tileState.mortgaged = true;
  state.players[playerId].cash += mortgageValue;

  events.push({
    type: 'property_mortgaged',
    playerId,
    tileId,
    tileName: tileDef.name,
    amount: mortgageValue,
  });

  return { ok: true };
}

function handleUnmortgage(
  state: GameState,
  playerId: PlayerId,
  tileId: TileId,
  events: GameEvent[]
): ExecuteActionResult {
  const tileDef = BOARD.tiles[tileId];
  const tileState = state.tiles[tileId];

  if (!tileDef || tileState.ownerId !== playerId) {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'You do not own this property' };
  }

  if (!tileState.mortgaged) {
    return { ok: false, error: 'PROPERTY_NOT_MORTGAGED', message: 'Property is not mortgaged' };
  }

  const mortgageValue = Math.floor((tileDef.price ?? 0) / 2);
  const player = state.players[playerId];

  // Banker passive: 0% mortgage interest
  // Credit Surge: 0% mortgage interest
  let unmortgageCost = Math.round(mortgageValue * 1.1);
  if (player.roleId === 'Banker' || state.market.current.kind === 'creditSurge') {
    unmortgageCost = mortgageValue;
  }

  if (player.cash < unmortgageCost) {
    return { ok: false, error: 'INSUFFICIENT_FUNDS', message: 'Not enough cash to unmortgage' };
  }

  player.cash -= unmortgageCost;
  tileState.mortgaged = false;

  events.push({
    type: 'property_unmortgaged',
    playerId,
    tileId,
    tileName: tileDef.name,
    cost: unmortgageCost,
  });

  return { ok: true };
}

// ----------------------------------------------------------------------------
// Jail Escapes
// ----------------------------------------------------------------------------

function handlePayJailFee(
  state: GameState,
  playerId: PlayerId,
  events: GameEvent[]
): ExecuteActionResult {
  const player = state.players[playerId];
  if (!player.inJail) {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'Player is not in jail' };
  }

  if (player.cash < 50) {
    return { ok: false, error: 'INSUFFICIENT_FUNDS', message: 'Not enough cash to pay $50 jail fee' };
  }

  player.cash -= 50;
  state.communityFund += 50;
  player.inJail = false;
  player.jailAttempts = 0;
  player.jailTurns = 0;
  state.phase = 'awaitRoll';

  events.push({
    type: 'jail_fee_paid',
    playerId,
    amount: 50,
  });

  return { ok: true };
}

function handleUseJailCard(
  state: GameState,
  playerId: PlayerId,
  events: GameEvent[]
): ExecuteActionResult {
  const player = state.players[playerId];
  if (!player.inJail) {
    return { ok: false, error: 'ILLEGAL_MOVE', message: 'Player is not in jail' };
  }

  const cardIndex = player.heldCards.findIndex(c => {
    if (c === 'get_out_card' || c === 'jail_card') return true;
    const def = getEventCardById(c);
    return def && def.effect === 'jail_card';
  });

  if (cardIndex === -1) {
    return { ok: false, error: 'NO_GET_OUT_CARD', message: 'No Get Out of Audit Free card available' };
  }

  const [removedCard] = player.heldCards.splice(cardIndex, 1);
  if (!state.eventDiscard.includes(removedCard)) {
    state.eventDiscard.push(removedCard);
  }

  player.inJail = false;
  player.jailAttempts = 0;
  player.jailTurns = 0;
  state.phase = 'awaitRoll';

  events.push({
    type: 'jail_card_used',
    playerId,
    cardId: removedCard,
  });

  return { ok: true };
}

// ----------------------------------------------------------------------------
// Trading System
// ----------------------------------------------------------------------------

function handleProposeTrade(
  state: GameState,
  playerId: PlayerId,
  offerData: Omit<TradeOffer, 'id' | 'status' | 'expiresAt'>,
  ctx: ActionContext,
  events: GameEvent[]
): ExecuteActionResult {
  const fromPlayer = state.players[playerId];
  const toPlayer = state.players[offerData.toId];

  if (!toPlayer || toPlayer.status !== 'active') {
    return { ok: false, error: 'TRADE_INVALID', message: 'Trade recipient is not active' };
  }

  if (offerData.toId === playerId) {
    return { ok: false, error: 'TRADE_INVALID', message: 'Cannot trade with yourself' };
  }

  const { give, want } = offerData;

  if ((give.cash ?? 0) > fromPlayer.cash) {
    return { ok: false, error: 'TRADE_INVALID', message: 'Cannot offer more cash than you have' };
  }
  if ((give.influence ?? 0) > fromPlayer.influence) {
    return { ok: false, error: 'TRADE_INVALID', message: 'Cannot offer more influence than you have' };
  }

  for (const tid of give.tileIds ?? []) {
    const ts = state.tiles[tid];
    if (!ts || ts.ownerId !== playerId || ts.mortgaged || ts.tier > 0) {
      return { ok: false, error: 'TRADE_INVALID', message: 'Offered property is not eligible for trade' };
    }
  }

  for (const cid of give.cards ?? []) {
    if (!fromPlayer.heldCards.includes(cid)) {
      return { ok: false, error: 'TRADE_INVALID', message: 'Offered card is not in your hand' };
    }
  }

  for (const tid of want.tileIds ?? []) {
    const ts = state.tiles[tid];
    if (!ts || ts.ownerId !== offerData.toId || ts.mortgaged || ts.tier > 0) {
      return { ok: false, error: 'TRADE_INVALID', message: 'Requested property is not eligible for trade' };
    }
  }

  const tradeId = `trade_${ctx.now}_${playerId}_${Math.floor(ctx.rng() * 1000)}`;
  const tradeOffer: TradeOffer = {
    id: tradeId,
    fromId: playerId,
    toId: offerData.toId,
    give: {
      tileIds: give.tileIds ?? [],
      cash: give.cash ?? 0,
      influence: give.influence ?? 0,
      cards: give.cards ?? [],
      rentContracts: give.rentContracts ?? [],
    },
    want: {
      tileIds: want.tileIds ?? [],
      cash: want.cash ?? 0,
      influence: want.influence ?? 0,
      cards: want.cards ?? [],
      rentContracts: want.rentContracts ?? [],
    },
    status: 'pending',
    expiresAt: ctx.now + 300000,
  };

  if (!state.trades) {
    state.trades = [];
  }
  state.trades.push(tradeOffer);

  events.push({
    type: 'trade_proposed',
    tradeId,
    fromPlayerId: playerId,
    toPlayerId: offerData.toId,
    give: tradeOffer.give,
    want: tradeOffer.want,
  });

  return { ok: true };
}

function handleRespondTrade(
  state: GameState,
  playerId: PlayerId,
  tradeId: string,
  response: 'accept' | 'decline' | 'counter',
  counter: TradeBundle | undefined,
  ctx: ActionContext,
  events: GameEvent[]
): ExecuteActionResult {
  if (!state.trades) {
    return { ok: false, error: 'TRADE_NOT_FOUND', message: 'Trade not found' };
  }

  const trade = state.trades.find(t => t.id === tradeId);
  if (!trade) {
    return { ok: false, error: 'TRADE_NOT_FOUND', message: 'Trade not found' };
  }

  if (trade.status !== 'pending') {
    return { ok: false, error: 'TRADE_INVALID', message: 'Trade is no longer pending' };
  }

  if (trade.toId !== playerId) {
    return { ok: false, error: 'TRADE_INVALID', message: 'Trade is not addressed to you' };
  }

  if (response === 'decline') {
    trade.status = 'declined';
    events.push({
      type: 'trade_declined',
      tradeId,
      fromPlayerId: trade.fromId,
      toPlayerId: trade.toId,
    });
    return { ok: true };
  }

  if (response === 'counter') {
    trade.status = 'countered';
    events.push({
      type: 'trade_countered',
      tradeId,
      fromPlayerId: trade.fromId,
      toPlayerId: trade.toId,
    });

    if (counter) {
      const newTradeId = `trade_${ctx.now}_${playerId}_${Math.floor(ctx.rng() * 1000)}`;
      const counterOffer: TradeOffer = {
        id: newTradeId,
        fromId: playerId,
        toId: trade.fromId,
        give: counter,
        want: trade.give,
        status: 'pending',
        expiresAt: ctx.now + 300000,
      };
      state.trades.push(counterOffer);
      events.push({
        type: 'trade_proposed',
        tradeId: newTradeId,
        fromPlayerId: playerId,
        toPlayerId: trade.fromId,
        give: counterOffer.give,
        want: counterOffer.want,
      });
    }
    return { ok: true };
  }

  // ACCEPT
  const fromPlayer = state.players[trade.fromId];
  const toPlayer = state.players[trade.toId];

  if (!fromPlayer || fromPlayer.status !== 'active' || !toPlayer || toPlayer.status !== 'active') {
    trade.status = 'declined';
    return { ok: false, error: 'TRADE_INVALID', message: 'Trading player is no longer active' };
  }

  if (fromPlayer.cash < trade.give.cash || toPlayer.cash < trade.want.cash) {
    trade.status = 'declined';
    return { ok: false, error: 'TRADE_INVALID', message: 'Insufficient cash to execute trade' };
  }

  if (fromPlayer.influence < trade.give.influence || toPlayer.influence < trade.want.influence) {
    trade.status = 'declined';
    return { ok: false, error: 'INFLUENCE_INSUFFICIENT', message: 'Insufficient influence to execute trade' };
  }

  for (const tid of trade.give.tileIds) {
    const ts = state.tiles[tid];
    if (!ts || ts.ownerId !== trade.fromId || ts.mortgaged || ts.tier > 0) {
      trade.status = 'declined';
      return { ok: false, error: 'TRADE_INVALID', message: 'Offered property is no longer eligible' };
    }
  }

  for (const tid of trade.want.tileIds) {
    const ts = state.tiles[tid];
    if (!ts || ts.ownerId !== trade.toId || ts.mortgaged || ts.tier > 0) {
      trade.status = 'declined';
      return { ok: false, error: 'TRADE_INVALID', message: 'Requested property is no longer eligible' };
    }
  }

  for (const cid of trade.give.cards) {
    if (!fromPlayer.heldCards.includes(cid)) {
      trade.status = 'declined';
      return { ok: false, error: 'TRADE_INVALID', message: 'Offered card no longer held' };
    }
  }

  for (const cid of trade.want.cards) {
    if (!toPlayer.heldCards.includes(cid)) {
      trade.status = 'declined';
      return { ok: false, error: 'TRADE_INVALID', message: 'Requested card no longer held' };
    }
  }

  // Atomic transfer
  for (const tid of trade.give.tileIds) {
    state.tiles[tid].ownerId = trade.toId;
  }
  for (const tid of trade.want.tileIds) {
    state.tiles[tid].ownerId = trade.fromId;
  }

  fromPlayer.cash -= trade.give.cash;
  toPlayer.cash += trade.give.cash;
  toPlayer.cash -= trade.want.cash;
  fromPlayer.cash += trade.want.cash;

  fromPlayer.influence -= trade.give.influence;
  toPlayer.influence += trade.give.influence;
  toPlayer.influence -= trade.want.influence;
  fromPlayer.influence += trade.want.influence;

  fromPlayer.heldCards = fromPlayer.heldCards.filter(c => !trade.give.cards.includes(c));
  toPlayer.heldCards.push(...trade.give.cards);
  toPlayer.heldCards = toPlayer.heldCards.filter(c => !trade.want.cards.includes(c));
  fromPlayer.heldCards.push(...trade.want.cards);

  // Negotiator passive: +1 Influence per accepted trade
  if (fromPlayer.roleId === 'Negotiator') {
    fromPlayer.influence += 1;
  }
  if (toPlayer.roleId === 'Negotiator') {
    toPlayer.influence += 1;
  }

  trade.status = 'accepted';
  events.push({
    type: 'trade_accepted',
    tradeId,
    fromPlayerId: trade.fromId,
    toPlayerId: trade.toId,
  });

  return { ok: true };
}

// ----------------------------------------------------------------------------
// Roles & Abilities
// ----------------------------------------------------------------------------

function handleUseAbility(
  state: GameState,
  playerId: PlayerId,
  target: PlayerId | TileId | undefined,
  ctx: ActionContext,
  events: GameEvent[]
): ExecuteActionResult {
  const player = state.players[playerId];
  if (!player.roleId) {
    return { ok: false, error: 'NO_ROLE_ASSIGNED', message: 'No role assigned' };
  }

  if (player.abilityReadyRound > state.round) {
    return { ok: false, error: 'ABILITY_COOLDOWN', message: `Ability on cooldown until round ${player.abilityReadyRound}` };
  }

  switch (player.roleId) {
    case 'Tycoon': {
      // Active: move building to another owned tile free, cooldown 5 rounds
      if (typeof target !== 'number') {
        return { ok: false, error: 'INVALID_TARGET', message: 'Target tileId required' };
      }
      const targetTileState = state.tiles[target];
      if (!targetTileState || targetTileState.ownerId !== playerId) {
        return { ok: false, error: 'INVALID_TARGET', message: 'Target tile must be owned by you' };
      }

      if (targetTileState.tier > 0) {
        const dest = Object.entries(state.tiles).find(([id, s]) => {
          return s.ownerId === playerId && Number(id) !== target && s.tier < 4 && !s.mortgaged;
        });
        if (!dest) {
          return { ok: false, error: 'INVALID_TARGET', message: 'No eligible destination tile' };
        }
        targetTileState.tier = (targetTileState.tier - 1) as Tier;
        dest[1].tier = (dest[1].tier + 1) as Tier;
      } else {
        const source = Object.entries(state.tiles).find(([id, s]) => {
          return s.ownerId === playerId && Number(id) !== target && s.tier > 0;
        });
        if (!source) {
          return { ok: false, error: 'INVALID_TARGET', message: 'No buildings available to move' };
        }
        source[1].tier = (source[1].tier - 1) as Tier;
        targetTileState.tier = (targetTileState.tier + 1) as Tier;
      }

      player.abilityReadyRound = state.round + 5;
      events.push({
        type: 'ability_used',
        playerId,
        role: 'Tycoon',
        ability: 'Demolish and Rebuild',
      });
      return { ok: true };
    }

    case 'Broker': {
      // Active: Option Deal: reserve a tile for 2 rounds, cooldown 4 rounds
      if (typeof target !== 'number') {
        return { ok: false, error: 'INVALID_TARGET', message: 'Target tileId required' };
      }
      const tDef = BOARD.tiles[target];
      const tState = state.tiles[target];
      if (!tDef || tDef.type !== 'property' || tState.ownerId !== null) {
        return { ok: false, error: 'INVALID_TARGET', message: 'Can only reserve unowned properties' };
      }
      tState.rentLockedUntilRound = state.round + 2;
      player.abilityReadyRound = state.round + 4;
      events.push({
        type: 'ability_used',
        playerId,
        role: 'Broker',
        ability: 'Option Deal',
        tileId: target,
      });
      return { ok: true };
    }

    case 'Negotiator': {
      // Active: reroll dice, cooldown 6 rounds
      if (!state.lastDice) {
        return { ok: false, error: 'ILLEGAL_MOVE', message: 'No dice to reroll' };
      }
      const die1 = (Math.abs(Math.floor(ctx.rng())) % 6) + 1;
      const die2 = (Math.abs(Math.floor(ctx.rng())) % 6) + 1;
      const oldDice = state.lastDice;
      state.lastDice = [die1, die2];
      player.abilityReadyRound = state.round + 6;
      events.push({
        type: 'ability_used',
        playerId,
        role: 'Negotiator',
        ability: 'Reroll Dice',
        oldDice,
        newDice: [die1, die2],
      });
      return { ok: true };
    }

    case 'Banker': {
      // Active: emergency loan up to 300, due in 3 rounds, cooldown 8 rounds
      if (player.pendingLoan !== null) {
        return { ok: false, error: 'CANNOT_BORROW', message: 'Outstanding loan already exists' };
      }
      const loanAmount = 300;
      player.cash += loanAmount;
      player.pendingLoan = {
        amount: loanAmount,
        interest: 0,
        dueRound: state.round + 3,
      };
      player.abilityReadyRound = state.round + 8;
      events.push({
        type: 'ability_used',
        playerId,
        role: 'Banker',
        ability: 'Emergency Loan',
        amount: loanAmount,
        dueRound: player.pendingLoan.dueRound,
      });
      return { ok: true };
    }

    case 'Strategist': {
      // Active: peek top Event card and optionally skip, cooldown 5 rounds
      let topCardId = state.eventDeck[state.eventDeck.length - 1];
      if (!topCardId) {
        state.eventDeck = ALL_EVENT_CARDS.map((c: typeof ALL_EVENT_CARDS[number]) => String(c.id));
        topCardId = state.eventDeck[state.eventDeck.length - 1];
      }
      player.abilityReadyRound = state.round + 5;
      return { ok: true };
    }

    default: {
      return { ok: false, error: 'NO_ROLE_ASSIGNED', message: 'No role assigned' };
    }
  }
}

function advanceTurn(state: GameState, events: GameEvent[]): void {
  const activePlayers = state.turnOrder.filter(id => state.players[id].status === 'active');
  if (activePlayers.length <= 1) {
    state.phase = 'gameOver';
    events.push({
      type: 'game_over',
      winnerId: activePlayers[0] ?? null,
    });
    return;
  }

  const currentIndex = state.turnOrder.indexOf(state.turnPlayerId);
  let nextIndex = (currentIndex + 1) % state.turnOrder.length;
  let wrapped = nextIndex <= currentIndex;

  while (state.players[state.turnOrder[nextIndex]].status !== 'active') {
    nextIndex = (nextIndex + 1) % state.turnOrder.length;
    if (nextIndex <= currentIndex) {
      wrapped = true;
    }
  }

  if (wrapped) {
    state.round += 1;
    if (state.rules.marketCycle && state.round % 4 === 0) {
      state.market.current = { kind: state.market.forecast.kind, roundsLeft: 4 };
      const kinds: MarketKind[] = ['steady', 'boom', 'crash', 'creditSurge', 'creditFreeze'];
      const nextKind = kinds[Math.floor(Math.random() * kinds.length)];
      state.market.forecast = { kind: nextKind };
      events.push({
        type: 'market_cycle',
        current: state.market.current.kind,
        forecast: state.market.forecast.kind,
      });
    }
  }

  const nextPlayerId = state.turnOrder[nextIndex];
  state.turnPlayerId = nextPlayerId;
  const nextPlayer = state.players[nextPlayerId];

  nextPlayer.doublesStreak = 0;

  if (nextPlayer.pendingLoan && state.round >= nextPlayer.pendingLoan.dueRound) {
    nextPlayer.cash -= nextPlayer.pendingLoan.amount;
    events.push({
      type: 'loan_repaid',
      playerId: nextPlayerId,
      amount: nextPlayer.pendingLoan.amount,
    });
    nextPlayer.pendingLoan = null;
    if (nextPlayer.cash < 0) {
      state.phase = 'awaitDebtSettlement';
      state.pendingDebt = {
        debtorId: nextPlayerId,
        creditorId: 'bank',
        amount: Math.abs(nextPlayer.cash),
      };
      return;
    }
  }

  if (nextPlayer.inJail) {
    state.phase = 'awaitJailChoice';
  } else {
    state.phase = 'awaitRoll';
  }

  events.push({
    type: 'turn_started',
    playerId: nextPlayerId,
    round: state.round,
  });
}

function handleSpendInfluence(
  state: GameState,
  playerId: PlayerId,
  item: string | undefined,
  ctx: ActionContext,
  events: GameEvent[]
): ExecuteActionResult {
  const player = state.players[playerId];
  if (!player) return { ok: false, error: 'PLAYER_INACTIVE' };

  switch (item) {
    case 'lawyer': {
      if (player.influence < 2) return { ok: false, error: 'INFLUENCE_INSUFFICIENT', message: 'Lawyer requires 2 influence' };
      if (!player.inJail) return { ok: false, error: 'ILLEGAL_MOVE', message: 'Player is not in jail' };
      player.influence -= 2;
      player.inJail = false;
      player.jailTurns = 0;
      state.phase = 'awaitRoll';
      events.push({ type: 'influence_spent', playerId, item: 'lawyer', cost: 2 });
      return { ok: true };
    }
    case 'waiver': {
      if (player.influence < 1) return { ok: false, error: 'INFLUENCE_INSUFFICIENT', message: 'Waiver requires 1 influence' };
      player.influence -= 1;
      (player as any).hasRentWaiver = true;
      events.push({ type: 'influence_spent', playerId, item: 'waiver', cost: 1 });
      return { ok: true };
    }
    case 'rezone': {
      if (player.influence < 2) return { ok: false, error: 'INFLUENCE_INSUFFICIENT', message: 'Rezone requires 2 influence' };
      player.influence -= 2;
      (player as any).hasRezone = true;
      events.push({ type: 'influence_spent', playerId, item: 'rezone', cost: 2 });
      return { ok: true };
    }
    case 'lobby': {
      if (player.influence < 3) return { ok: false, error: 'INFLUENCE_INSUFFICIENT', message: 'Lobby requires 3 influence' };
      player.influence -= 3;
      state.market.forecast = { kind: 'boom' };
      events.push({ type: 'influence_spent', playerId, item: 'lobby', cost: 3 });
      return { ok: true };
    }
    default:
      if (player.influence >= 1) {
        player.influence -= 1;
        events.push({ type: 'influence_spent', playerId, item: item ?? 'generic', cost: 1 });
        return { ok: true };
      }
      return { ok: false, error: 'INFLUENCE_INSUFFICIENT', message: 'Not enough influence' };
  }
}

function handleRaiseFundsDone(
  state: GameState,
  playerId: PlayerId,
  events: GameEvent[]
): ExecuteActionResult {
  const player = state.players[playerId];
  if (!player) return { ok: false, error: 'PLAYER_INACTIVE' };

  if (player.cash >= 0) {
    state.pendingDebt = null;
    state.phase = 'awaitEndTurn';
    return { ok: true };
  }

  // Player goes bankrupt
  player.status = 'bankrupt';
  const creditorId = state.pendingDebt?.creditorId;

  if (creditorId && creditorId !== 'bank' && state.players[creditorId]) {
    for (const [tidStr, tile] of Object.entries(state.tiles)) {
      if (tile.ownerId === playerId) {
        tile.ownerId = creditorId;
      }
    }
    state.players[creditorId].heldCards.push(...player.heldCards);
    player.heldCards = [];
    state.players[creditorId].influence += player.influence;
    player.influence = 0;
  } else {
    for (const [tidStr, tile] of Object.entries(state.tiles)) {
      if (tile.ownerId === playerId) {
        tile.ownerId = null;
        tile.tier = 0;
        tile.mortgaged = false;
      }
    }
    player.heldCards = [];
    player.influence = 0;
  }

  state.pendingDebt = null;
  events.push({
    type: 'bankrupt',
    playerId,
    creditorId: creditorId ?? 'bank',
  });

  const activePlayers = state.turnOrder.filter(id => state.players[id].status === 'active');
  if (activePlayers.length <= 1) {
    state.phase = 'gameOver';
    events.push({
      type: 'game_over',
      winnerId: activePlayers[0] ?? null,
    });
    return { ok: true };
  }

  advanceTurn(state, events);
  return { ok: true };
}

function handleAcknowledgeEvent(
  state: GameState,
  playerId: PlayerId,
  events: GameEvent[]
): ExecuteActionResult {
  if (state.phase !== 'resolveEvent') {
    return { ok: false, error: 'WRONG_PHASE', message: 'Not in event resolution phase' };
  }
  const player = state.players[playerId];
  if (player && player.doublesStreak > 0 && !player.inJail) {
    state.phase = 'awaitRoll';
    events.push({
      type: 'extra_turn_doubles',
      playerId,
      reason: `${player.name} rolled doubles and gets another turn!`,
    });
  } else {
    advanceTurn(state, events);
  }
  return { ok: true };
}

function handleEndTurn(
  state: GameState,
  playerId: PlayerId,
  events: GameEvent[]
): ExecuteActionResult {
  if (state.phase !== 'awaitEndTurn' && state.phase !== 'resolveEvent') {
    return { ok: false, error: 'WRONG_PHASE', message: 'Cannot end turn now' };
  }
  if (state.pendingDebt !== null && state.players[playerId].cash < 0) {
    return { ok: false, error: 'BANKRUPTCY', message: 'You must resolve your debt before ending turn' };
  }

  advanceTurn(state, events);
  return { ok: true };
}

function handleResign(
  state: GameState,
  playerId: PlayerId,
  events: GameEvent[]
): ExecuteActionResult {
  const player = state.players[playerId];
  if (!player || player.status !== 'active') {
    return { ok: false, error: 'PLAYER_INACTIVE', message: 'Player is not active' };
  }

  player.status = 'bankrupt';
  for (const [tidStr, tile] of Object.entries(state.tiles)) {
    if (tile.ownerId === playerId) {
      tile.ownerId = null;
      tile.tier = 0;
      tile.mortgaged = false;
    }
  }
  player.heldCards = [];
  player.influence = 0;

  events.push({
    type: 'player_resigned',
    playerId,
  });

  const activePlayers = state.turnOrder.filter(id => state.players[id].status === 'active');
  if (activePlayers.length <= 1) {
    state.phase = 'gameOver';
    events.push({
      type: 'game_over',
      winnerId: activePlayers[0] ?? null,
    });
    return { ok: true };
  }

  if (state.turnPlayerId === playerId) {
    advanceTurn(state, events);
  }

  return { ok: true };
}
