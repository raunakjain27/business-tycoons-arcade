import type {
  GameState,
  PlayerId,
  TileId,
  GameEvent,
  ActionContext,
  Rng,
  BoardDef,
  MarketKind,
} from './types';
import { computeRent, countOwned } from './index';
import { getBoard } from '../content/boards';
import eventsData from '../content/events.json' with { type: 'json' };import eventsData from '../content/events.json' with { type: 'json' };
const eventsDataLocal = eventsData as { cards: EventCardDef[] };

export const BOARD: BoardDef = getBoard('default');
const eventsDataLocal = eventsData as { cards: EventCardDef[] };
const ALL_EVENT_CARDS: EventCardDef[] = eventsDataLocal.cards;

export function getBoardForState(state?: GameState): BoardDef {
  const key = (state as any)?.boardKey ?? 'default';
  return getBoard(key);
}

export interface EventCardDef {
  id: number;
  text: string;
  type: string;
  amount?: number;
  targetTile?: number;
  effect?: string;
  perHouse?: number;
  perTower?: number;
}


/**
 * Get an event card definition by its ID.
 */
export function getEventCardById(id: number | string): EventCardDef | undefined {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return ALL_EVENT_CARDS.find(c => c.id === numId);
}

/**
 * Seeded Fisher-Yates shuffle for string arrays.
 */
export function shuffleDeck(deck: string[], rng: Rng): string[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const val = rng();
    const j = Math.abs(Math.floor(val)) % (i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Creates a fresh, shuffled event card deck containing all card IDs.
 */
export function createEventDeck(rng: Rng): string[] {
  const allIds = ALL_EVENT_CARDS.map(c => String(c.id));
  return shuffleDeck(allIds, rng);
}

/**
 * Draw an event card from state.eventDeck.
 * If deck is empty, reshuffles state.eventDiscard into eventDeck.
 * If both empty, initializes from all event cards.
 */
export function drawCard(
  state: GameState,
  rng: Rng,
  deckType: 'event' | 'chronicle' | 'community' = 'event'
): { card: EventCardDef | null; deck: string[]; discard: string[]; deckType: string } {
  if (deckType === 'chronicle') {
    if (!state.chronicleDeck) state.chronicleDeck = [];
    if (!state.chronicleDiscard) state.chronicleDiscard = [];
    if (state.chronicleDeck.length === 0) {
      if (state.chronicleDiscard.length > 0) {
        state.chronicleDeck = shuffleDeck(state.chronicleDiscard, rng);
        state.chronicleDiscard = [];
      } else {
        state.chronicleDeck = createEventDeck(rng);
        state.chronicleDiscard = [];
      }
    }
    if (state.chronicleDeck.length === 0) {
      return { card: null, deck: state.chronicleDeck, discard: state.chronicleDiscard, deckType };
    }
    const cardIdStr = state.chronicleDeck.pop() ?? '';
    const card = getEventCardById(cardIdStr) ?? null;
    return { card, deck: state.chronicleDeck, discard: state.chronicleDiscard, deckType };
  }
  if (deckType === 'community') {
    if (!state.communityDeck) state.communityDeck = [];
    if (!state.communityDiscard) state.communityDiscard = [];
    if (state.communityDeck.length === 0) {
      if (state.communityDiscard.length > 0) {
        state.communityDeck = shuffleDeck(state.communityDiscard, rng);
        state.communityDiscard = [];
      } else {
        state.communityDeck = createEventDeck(rng);
        state.communityDiscard = [];
      }
    }
    if (state.communityDeck.length === 0) {
      return { card: null, deck: state.communityDeck, discard: state.communityDiscard, deckType };
    }
    const cardIdStr = state.communityDeck.pop() ?? '';
    const card = getEventCardById(cardIdStr) ?? null;
    return { card, deck: state.communityDeck, discard: state.communityDiscard, deckType };
  }

  if (!state.eventDeck) {
    state.eventDeck = [];
  }
  if (!state.eventDiscard) {
    state.eventDiscard = [];
  }

  if (state.eventDeck.length === 0) {
    if (state.eventDiscard.length > 0) {
      state.eventDeck = shuffleDeck(state.eventDiscard, rng);
      state.eventDiscard = [];
    } else {
      state.eventDeck = createEventDeck(rng);
      state.eventDiscard = [];
    }
  }

  if (state.eventDeck.length === 0) {
    return { card: null, deck: state.eventDeck, discard: state.eventDiscard, deckType };
  }

  const cardIdStr = state.eventDeck.pop() ?? '';
  const card = getEventCardById(cardIdStr) ?? null;

  return { card, deck: state.eventDeck, discard: state.eventDiscard, deckType };
}

/**
 * Resolve an event card against game state.
 * Mutates cloned state directly and returns events.
 */
export function resolveEventCard(
  state: GameState,
  playerId: PlayerId,
  card: EventCardDef,
  ctx: ActionContext,
  deckType: 'event' | 'chronicle' | 'community' = 'event'
): { state: GameState; events: GameEvent[] } {
  const player = state.players[playerId];
  if (!player) {
    return { state, events: [] };
  }

  const events: GameEvent[] = [];

  events.push({
    type: 'event_drawn',
    playerId,
    cardId: card.id,
    cardText: card.text,
    cardType: card.type,
  });

  switch (card.type) {
    case 'income': {
      const amount = card.amount ?? 0;
      player.cash += amount;
      if (card.id === 1 && state.communityFund > 0) {
        state.communityFund = Math.max(0, state.communityFund - amount);
      }
      events.push({
        type: 'card_income',
        playerId,
        amount,
      });
      break;
    }

    case 'tax': {
      const amount = card.amount ?? 0;
      player.cash -= amount;
      state.communityFund += amount;
      events.push({
        type: 'card_tax',
        playerId,
        amount,
      });
      if (player.cash < 0) {
        state.phase = 'awaitDebtSettlement';
        state.pendingDebt = {
          debtorId: playerId,
          creditorId: 'bank',
          amount: Math.abs(player.cash),
        };
        events.push({
          type: 'debt_incurred',
          playerId,
          creditorId: 'bank',
          amount: Math.abs(player.cash),
        });
      }
      break;
    }

    case 'move': {
      const targetTile = (card.targetTile ?? 0) as TileId;
      const oldPosition = player.position;

      // Passing Go / Payday check: wrapped around or landed on 0
      if (targetTile < oldPosition || targetTile === 0) {
        const payday = state.rules.paydayAmount;
        player.cash += payday;
        events.push({
          type: 'payday_triggered',
          playerId,
          amount: payday,
        });
      }

      player.position = targetTile;
      player.lastLandedTile = targetTile;

      events.push({
        type: 'player_moved',
        playerId,
        fromPosition: oldPosition,
        toPosition: targetTile,
        reason: 'event_card',
      });

      // Resolve destination tile
      resolveTileLanding(state, playerId, targetTile, events);
      break;
    }

    case 'collectFromAll': {
      const amount = card.amount ?? 0;
      let totalCollected = 0;
      for (const otherPlayer of Object.values(state.players)) {
        if (otherPlayer.id !== playerId && otherPlayer.status === 'active') {
          otherPlayer.cash -= amount;
          totalCollected += amount;
          events.push({
            type: 'player_paid_player',
            fromPlayerId: otherPlayer.id,
            toPlayerId: playerId,
            amount,
          });
          if (otherPlayer.cash < 0 && !state.pendingDebt) {
            state.phase = 'awaitDebtSettlement';
            state.pendingDebt = {
              debtorId: otherPlayer.id,
              creditorId: playerId,
              amount: Math.abs(otherPlayer.cash),
            };
          }
        }
      }
      player.cash += totalCollected;
      break;
    }

    case 'payToAll': {
      const amount = card.amount ?? 0;
      for (const otherPlayer of Object.values(state.players)) {
        if (otherPlayer.id !== playerId && otherPlayer.status === 'active') {
          player.cash -= amount;
          otherPlayer.cash += amount;
          events.push({
            type: 'player_paid_player',
            fromPlayerId: playerId,
            toPlayerId: otherPlayer.id,
            amount,
          });
        }
      }
      if (player.cash < 0) {
        state.phase = 'awaitDebtSettlement';
        state.pendingDebt = {
          debtorId: playerId,
          creditorId: 'bank',
          amount: Math.abs(player.cash),
        };
        events.push({
          type: 'debt_incurred',
          playerId,
          creditorId: 'bank',
          amount: Math.abs(player.cash),
        });
      }
      break;
    }

    case 'taxPerTile': {
      const amount = card.amount ?? 0;
      let tileCount = 0;
      for (const t of Object.values(state.tiles)) {
        if (t.ownerId === playerId) {
          tileCount++;
        }
      }
      const totalTax = tileCount * amount;
      player.cash -= totalTax;
      state.communityFund += totalTax;
      events.push({
        type: 'card_tax_per_tile',
        playerId,
        tilesCount: tileCount,
        amount: totalTax,
      });
      if (player.cash < 0) {
        state.phase = 'awaitDebtSettlement';
        state.pendingDebt = {
          debtorId: playerId,
          creditorId: 'bank',
          amount: Math.abs(player.cash),
        };
      }
      break;
    }

    case 'repairCost': {
      const perHouse = card.perHouse ?? 0;
      const perTower = card.perTower ?? 0;
      let cost = 0;
      for (const t of Object.values(state.tiles)) {
        if (t.ownerId === playerId) {
          if (t.tier === 1) cost += perHouse;
          else if (t.tier === 2) cost += 2 * perHouse;
          else if (t.tier === 3 || t.tier === 4) cost += perTower;
        }
      }
      player.cash -= cost;
      state.communityFund += cost;
      events.push({
        type: 'card_repair_cost',
        playerId,
        amount: cost,
      });
      if (player.cash < 0) {
        state.phase = 'awaitDebtSettlement';
        state.pendingDebt = {
          debtorId: playerId,
          creditorId: 'bank',
          amount: Math.abs(player.cash),
        };
      }
      break;
    }

    case 'incomePerHouse': {
      const amount = card.amount ?? 0;
      let houseCount = 0;
      for (const t of Object.values(state.tiles)) {
        if (t.ownerId === playerId) {
          if (t.tier === 1) houseCount += 1;
          else if (t.tier === 2) houseCount += 2;
        }
      }
      const totalIncome = houseCount * amount;
      player.cash += totalIncome;
      events.push({
        type: 'card_income_per_house',
        playerId,
        houseCount,
        amount: totalIncome,
      });
      break;
    }

    case 'card': {
      if (card.effect === 'jail_card') {
        player.heldCards.push(String(card.id));
        events.push({
          type: 'card_kept',
          playerId,
          cardId: card.id,
          cardEffect: 'jail_card',
        });
      }
      break;
    }

    case 'moveNearest': {
      const effect = card.effect ?? 'property';
      let targetTile: TileId = player.position;
      const board = getBoardForState(state);
      for (let step = 1; step <= 40; step++) {
        const candidate = (player.position + step) % 40;
        const def = board.tiles[candidate];
        if (def && def.type === effect) {
          targetTile = candidate as TileId;
          break;
        }
      }

      const oldPosition = player.position;
      if (targetTile < oldPosition || targetTile === 0) {
        const payday = state.rules.paydayAmount;
        player.cash += payday;
        events.push({
          type: 'payday_triggered',
          playerId,
          amount: payday,
        });
      }

      player.position = targetTile;
      player.lastLandedTile = targetTile;

      events.push({
        type: 'player_moved',
        playerId,
        fromPosition: oldPosition,
        toPosition: targetTile,
        reason: 'move_nearest',
      });

      const board2 = getBoardForState(state);
      const tileDef = board2.tiles[targetTile];
      const tileState = state.tiles[targetTile];

      if (tileDef && tileState) {
        if (!tileState.ownerId) {
          state.phase = 'awaitBuyDecision';
          events.push({
            type: 'property_landed_unowned',
            playerId,
            tileId: targetTile,
            tileName: tileDef.name,
            price: tileDef.price,
          });
        } else if (tileState.ownerId !== playerId && !tileState.mortgaged) {
          let rent = 0;
          if (card.effect === 'utility') {
            const diceTotal = state.lastDice ? state.lastDice[0] + state.lastDice[1] : 7;
            rent = diceTotal * 10;
          } else if (card.effect === 'hub') {
            const hubs = countOwned(state, tileState.ownerId, 'hub');
            rent = 25 * Math.pow(2, Math.max(0, hubs - 1)) * 2;
          } else {
            const dice = state.lastDice ?? [3, 4];
            rent = computeRent(state, targetTile, dice);
          }

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
            tileId: targetTile,
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
          }
        }
      }
      break;
    }

    case 'marketEvent': {
      const kind = (card.effect as MarketKind) ?? 'boom';
      const boardM = getBoardForState(state);
      const districtKeys = Object.keys(boardM.districts);
      const districtId = districtKeys[Math.abs(Math.floor(ctx.rng())) % districtKeys.length];
      state.market.current = {
        kind,
        districtId,
        roundsLeft: 2,
      };
      events.push({
        type: 'market_cycle_updated',
        kind,
        districtId,
        roundsLeft: 2,
      });
      break;
    }

    case 'influence': {
      const amount = card.amount ?? 0;
      player.influence += amount;
      events.push({
        type: 'influence_gained',
        playerId,
        amount,
      });
      break;
    }

    case 'influenceLoss': {
      const amount = card.amount ?? 0;
      player.influence = Math.max(0, player.influence - amount);
      events.push({
        type: 'influence_lost',
        playerId,
        amount,
      });
      break;
    }

    case 'moveRelative': {
      const steps = (card as any).steps ?? 0;
      const oldPosition = player.position;
      let newPosition = (oldPosition + steps) % 40;
      if (newPosition < 0) newPosition += 40;

      // Wrap around Payday check only if advancing forward
      if (steps > 0 && (newPosition < oldPosition || newPosition === 0)) {
        const payday = state.rules.paydayAmount;
        player.cash += payday;
        events.push({
          type: 'payday_triggered',
          playerId,
          amount: payday,
        });
      }

      player.position = newPosition as TileId;
      player.lastLandedTile = newPosition as TileId;

      events.push({
        type: 'player_moved',
        playerId,
        fromPosition: oldPosition,
        toPosition: newPosition,
        reason: steps > 0 ? `moved_forward_${steps}` : `moved_backward_${Math.abs(steps)}`,
      });

      resolveTileLanding(state, playerId, newPosition as TileId, ctx, events);
      break;
    }

    default:
      break;
  }

  // Cards other than held jail cards go to discard
  if (!(card.type === 'card' && card.effect === 'jail_card')) {
    const cardIdStr = String(card.id);
    if (deckType === 'chronicle') {
      if (!state.chronicleDiscard) state.chronicleDiscard = [];
      if (!state.chronicleDiscard.includes(cardIdStr)) {
        state.chronicleDiscard.push(cardIdStr);
      }
    } else if (deckType === 'community') {
      if (!state.communityDiscard) state.communityDiscard = [];
      if (!state.communityDiscard.includes(cardIdStr)) {
        state.communityDiscard.push(cardIdStr);
      }
    } else {
      if (!state.eventDiscard.includes(cardIdStr)) {
        state.eventDiscard.push(cardIdStr);
      }
    }
  }

  return { state, events };
}

/**
 * Helper to resolve landing when an event card moves a player to a tile.
 */
function resolveTileLanding(
  state: GameState,
  playerId: PlayerId,
  tileId: TileId,
  events: GameEvent[]
): void {
  const player = state.players[playerId];
  if (!player) return;

  const boardT = getBoardForState(state);
  const tileDef = boardT.tiles[tileId];
  const tileState = state.tiles[tileId];
  if (!tileDef || !tileState) return;

  switch (tileDef.type) {
    case 'start':
    case 'jail':
      break;

    case 'goToJail':
      player.lastPositionBeforeJail = tileId;
      player.position = 10;
      player.inJail = true;
      player.doublesStreak = 0;
      player.jailAttempts = 0;
      player.jailTurns = 0;
      events.push({
        type: 'player_jailed',
        playerId,
        tileId: 10,
        reason: 'go_to_jail_tile',
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
      break;

    case 'tax': {
      const taxAmt = tileDef.taxAmount ?? 0;
      player.cash -= taxAmt;
      state.communityFund += taxAmt;
      events.push({
        type: 'tax_paid',
        playerId,
        tileId,
        amount: taxAmt,
      });
      if (player.cash < 0) {
        state.phase = 'awaitDebtSettlement';
        state.pendingDebt = {
          debtorId: playerId,
          creditorId: 'bank',
          amount: Math.abs(player.cash),
        };
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
      break;

    case 'property':
    case 'hub':
    case 'utility':
      if (!tileState.ownerId) {
        state.phase = 'awaitBuyDecision';
        events.push({
          type: 'property_landed_unowned',
          playerId,
          tileId,
          tileName: tileDef.name,
          price: tileDef.price,
        });
      } else if (tileState.ownerId !== playerId && !tileState.mortgaged) {
        const dice = state.lastDice ?? [3, 4];
        let rent = computeRent(state, tileId, dice);
        if (player.hasRentWaiver) {
          rent = Math.floor(rent / 2);
          player.hasRentWaiver = false;
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
          tileId,
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
        }
      }
      break;

    default:
      break;
  }
}