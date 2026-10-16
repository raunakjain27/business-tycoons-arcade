import type {
  GameState,
  PlayerState,
  TileState,
  Action,
  PlayerId,
  TileId,
  Tier,
  GameEvent,
  MarketKind,
  TradeOffer,
} from '../../../packages/engine/types';
import { BOARD_DATA, getTileDef, EVENT_CARDS, EventCardDef } from './boardData';
import { computeRent, ownsFullDistrict } from './computeRent';

/**
 * Creates an authoritative initial GameState for a local or new game.
 */
export function createInitialGameState(
  players: Array<{ id: string; name: string; roleId?: string; isBot?: boolean; tokenId?: string }>,
  startingCash: number = 1500,
  rulesOverride: Partial<GameState['rules']> = {}
): GameState {
  const playerStates: Record<PlayerId, PlayerState> = {};
  const turnOrder: PlayerId[] = [];

  players.forEach((p, index) => {
    turnOrder.push(p.id);
    const initialCash = p.roleId === 'Tycoon' ? Math.round(startingCash * 1.15) : startingCash;
    playerStates[p.id] = {
      id: p.id,
      name: p.name,
      tokenId: p.tokenId ?? `token-${index + 1}`,
      roleId: p.roleId ?? null,
      cash: initialCash,
      influence: 1,
      position: 0,
      inJail: false,
      jailTurns: 0,
      doublesStreak: 0,
      heldCards: ['jail_card'],
      teamId: null,
      abilityReadyRound: 1,
      status: 'active',
      lastLandedTile: 0,
      lastPositionBeforeJail: 0,
      jailAttempts: 0,
      jailDoublesRolled: 0,
      hasRentWaiver: false,
      hasRezoningPermit: false,
      pendingLoan: null,
    };
  });

  const tileStates: Record<TileId, TileState> = {};
  for (let i = 0; i < 40; i++) {
    tileStates[i] = {
      ownerId: null,
      tier: 0,
      mortgaged: false,
    };
  }

  return {
    id: `local-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    seed: Math.random().toString(36).substring(2, 12),
    rules: {
      startingCash,
      paydayAmount: 200,
      auctionOnDecline: true,
      evenBuild: true,
      marketCycle: true,
      roles: true,
      influence: true,
      eventDeck: true,
      turnTimerSec: 30,
      suddenGrowthRound: 25,
      bankruptcyGraceSec: 60,
      maxPlayers: 8,
      teamMode: false,
      singleDiceMode: false,
      doubleRentFullSet: true,
      vacationCash: true,
      freeParking: true,
      noRentInPrison: true,
      ...rulesOverride,
    },
    round: 1,
    turnPlayerId: turnOrder[0] ?? 'p1',
    turnOrder,
    phase: 'awaitRoll',
    players: playerStates,
    tiles: tileStates,
    communityFund: 200,
    market: {
      current: { kind: 'steady', districtId: undefined, roundsLeft: 3 },
      forecast: { kind: 'boom', districtId: 'Tech Park' },
    },
    eventDeck: EVENT_CARDS.map(c => String(c.id)),
    eventDiscard: [],
    chronicleDeck: EVENT_CARDS.map(c => String(c.id)),
    chronicleDiscard: [],
    communityDeck: EVENT_CARDS.map(c => String(c.id)),
    communityDiscard: [],
    housesAvailable: 32,
    towersAvailable: 12,
    lastDice: null,
    auction: null,
    trades: [],
    pendingDebt: null,
    log: [
      {
        type: 'GAME_START',
        reason: 'Cornerstone local game initialized. Good luck!',
      },
    ],
    version: 1,
  };
}

/**
 * Local deterministic game engine that executes actions on a GameState.
 * Adheres strictly to server-authoritative logic with structuredClone.
 */
export function applyLocalAction(
  currentState: GameState,
  playerId: PlayerId,
  action: Action,
  now = Date.now()
): { state: GameState; events: GameEvent[]; error?: string } {
  const state: GameState = structuredClone(currentState);
  const events: GameEvent[] = [];

  const player = state.players[playerId];
  if (!player || player.status !== 'active') {
    return { state: currentState, events: [], error: 'Player is inactive' };
  }

  // Turn player validation for non-bid/non-trade actions
  if (
    action.type !== 'BID' &&
    action.type !== 'PASS_BID' &&
    action.type !== 'RESPOND_TRADE' &&
    action.type !== 'RESIGN' &&
    state.turnPlayerId !== playerId
  ) {
    return { state: currentState, events: [], error: 'Not your turn' };
  }

  switch (action.type) {
    case 'ROLL': {
      if (state.phase !== 'awaitRoll') {
        return { state: currentState, events: [], error: 'Cannot roll in current phase' };
      }

      const isSingleDice = state.rules.singleDiceMode ?? false;
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = isSingleDice ? 0 : Math.floor(Math.random() * 6) + 1;
      const isDoubles = isSingleDice ? false : d1 === d2;
      const total = d1 + d2;
      state.lastDice = isSingleDice ? [d1, 0] : [d1, d2];

      events.push({
        type: 'DICE_ROLLED',
        playerId,
        amount: total,
        reason: isSingleDice
          ? `${player.name} rolled a single die: ${d1} (advancing ${d1} tiles).`
          : `${player.name} rolled [${d1}, ${d2}] = ${total}${isDoubles ? ' (DOUBLES!)' : ''}`,
      });

      // Handling Jail state
      if (player.inJail) {
        player.jailAttempts += 1;
        if (isDoubles) {
          player.inJail = false;
          player.jailTurns = 0;
          player.doublesStreak = 0;
          events.push({
            type: 'JAIL_ESCAPE',
            playerId,
            reason: `${player.name} rolled doubles and escaped from the Audit Office!`,
          });
          movePlayer(state, player, total, events);
        } else {
          player.jailTurns += 1;
          if (player.jailTurns >= 3) {
            // Must pay fine on 3rd failed turn
            if (player.cash >= 50) {
              player.cash -= 50;
              state.communityFund += 50;
              player.inJail = false;
              player.jailTurns = 0;
              events.push({
                type: 'JAIL_FINE_AUTO',
                playerId,
                amount: 50,
                reason: `${player.name} completed 3 jail turns and paid $50 mandatory fine to leave.`,
              });
              movePlayer(state, player, total, events);
            } else {
              events.push({
                type: 'JAIL_STAY',
                playerId,
                reason: `${player.name} failed to roll doubles and remains in Audit Office.`,
              });
              state.phase = 'awaitEndTurn';
            }
          } else {
            events.push({
              type: 'JAIL_STAY',
              playerId,
              reason: `${player.name} did not roll doubles (${player.jailTurns}/3 turns).`,
            });
            state.phase = 'awaitEndTurn';
          }
        }
        break;
      }

      // Handling Normal Roll
      if (isDoubles) {
        player.doublesStreak += 1;
        if (player.doublesStreak >= 3) {
          // Sent to jail for 3 consecutive doubles
          player.inJail = true;
          player.position = 10;
          player.lastPositionBeforeJail = player.position;
          player.doublesStreak = 0;
          state.phase = 'awaitEndTurn';
          events.push({
            type: 'GO_TO_JAIL',
            playerId,
            tileId: 10,
            reason: `${player.name} rolled 3 consecutive doubles and was sent to the Audit Office!`,
          });
          break;
        }
        // Doubles: extra turn (standard Monopoly rule)
        state.phase = 'awaitRoll';
      } else {
        player.doublesStreak = 0;
        // Non-doubles: end turn
        state.phase = 'awaitEndTurn';
      }

      movePlayer(state, player, total, events);
      break;
    }

    case 'BUY': {
      if (state.phase !== 'awaitBuyDecision') {
        return { state: currentState, events: [], error: 'Not in buy decision phase' };
      }

      const tileId = player.lastLandedTile;
      const def = getTileDef(tileId);
      const tState = state.tiles[tileId];

      if (!tState || tState.ownerId !== null || def.price === null || def.price === undefined) {
        return { state: currentState, events: [], error: 'Property not available for purchase' };
      }

      // Broker role 15% discount
      const effectivePrice = player.roleId === 'Broker' ? Math.round(def.price * 0.85) : def.price;

      if (player.cash < effectivePrice) {
        return { state: currentState, events: [], error: 'Insufficient funds to buy property' };
      }

      player.cash -= effectivePrice;
      tState.ownerId = playerId;

      events.push({
        type: 'PROPERTY_BOUGHT',
        playerId,
        tileId,
        amount: effectivePrice,
        reason: `${player.name} purchased ${def.name} for $${effectivePrice}.`,
      });

      // If player had rolled doubles, give them their bonus roll
      state.phase = player.doublesStreak > 0 && !player.inJail ? 'awaitRoll' : 'awaitEndTurn';
      break;
    }

    case 'DECLINE_BUY': {
      if (state.phase !== 'awaitBuyDecision') {
        return { state: currentState, events: [], error: 'Not in buy decision phase' };
      }

      const tileId = player.lastLandedTile;
      const def = getTileDef(tileId);

      events.push({
        type: 'BUY_DECLINED',
        playerId,
        tileId,
        reason: `${player.name} declined to purchase ${def.name}.`,
      });

      if (state.rules.auctionOnDecline) {
        state.phase = 'auction';
        state.auction = {
          tileId,
          highBid: 10,
          highBidder: null,
          endsAt: now + 20000,
          passed: [],
        };
        events.push({
          type: 'AUCTION_STARTED',
          tileId,
          amount: 10,
          reason: `Auction opened for ${def.name} starting at $10!`,
        });
      } else {
        state.phase = 'awaitEndTurn';
      }
      break;
    }

    case 'BID': {
      if (state.phase !== 'auction' || !state.auction) {
        return { state: currentState, events: [], error: 'No active auction' };
      }

      const bidAmount = action.amount;
      if (bidAmount <= state.auction.highBid) {
        return { state: currentState, events: [], error: 'Bid must exceed current high bid' };
      }

      if (player.cash < bidAmount) {
        return { state: currentState, events: [], error: 'Insufficient funds for bid' };
      }

      state.auction.highBid = bidAmount;
      state.auction.highBidder = playerId;
      state.auction.endsAt = now + 15000;

      // Remove player from passed if they had passed before
      state.auction.passed = state.auction.passed.filter(id => id !== playerId);

      events.push({
        type: 'BID_PLACED',
        playerId,
        amount: bidAmount,
        reason: `${player.name} placed high bid of $${bidAmount}.`,
      });
      break;
    }

    case 'PASS_BID': {
      if (state.phase !== 'auction' || !state.auction) {
        return { state: currentState, events: [], error: 'No active auction' };
      }

      if (!state.auction.passed.includes(playerId)) {
        state.auction.passed.push(playerId);
      }

      events.push({
        type: 'BID_PASSED',
        playerId,
        reason: `${player.name} passed on the auction.`,
      });

      const activePlayers = state.turnOrder.filter(id => state.players[id]?.status === 'active');
      const auctionTileDef = getTileDef(state.auction.tileId);

      // Check if all players passed
      if (state.auction.passed.length >= activePlayers.length) {
        if (state.auction.highBidder) {
          const winner = state.players[state.auction.highBidder];
          const winningTile = state.tiles[state.auction.tileId];
          if (winner && winningTile) {
            winner.cash -= state.auction.highBid;
            winningTile.ownerId = winner.id;
            events.push({
              type: 'AUCTION_WON',
              playerId: winner.id,
              tileId: state.auction.tileId,
              amount: state.auction.highBid,
              reason: `${winner.name} won ${auctionTileDef.name} for $${state.auction.highBid}!`,
            });
          }
        } else {
          events.push({
            type: 'AUCTION_ENDED_NO_BIDS',
            tileId: state.auction.tileId,
            reason: `No bids received. ${auctionTileDef.name} remains unowned.`,
          });
        }
        state.auction = null;
        const turnPlayer = state.players[state.turnPlayerId];
        state.phase = turnPlayer && turnPlayer.doublesStreak > 0 && !turnPlayer.inJail ? 'awaitRoll' : 'awaitEndTurn';
      } else if (now >= (state.auction?.endsAt ?? 0)) {
        // Auto-resolve auction when timer expires
        if (state.auction.highBidder) {
          const winner = state.players[state.auction.highBidder];
          const winningTile = state.tiles[state.auction.tileId];
          if (winner && winningTile) {
            winner.cash -= state.auction.highBid;
            winningTile.ownerId = winner.id;
            events.push({
              type: 'AUCTION_WON',
              playerId: winner.id,
              tileId: state.auction.tileId,
              amount: state.auction.highBid,
              reason: `${winner.name} won ${auctionTileDef.name} for $${state.auction.highBid} (auction timed out)!`,
            });
          }
        } else {
          events.push({
            type: 'AUCTION_ENDED_NO_BIDS',
            tileId: state.auction.tileId,
            reason: `No bids received. ${auctionTileDef.name} remains unowned. Auction timed out.`,
          });
        }
        state.auction = null;
        const turnPlayer = state.players[state.turnPlayerId];
        state.phase = turnPlayer && turnPlayer.doublesStreak > 0 && !turnPlayer.inJail ? 'awaitRoll' : 'awaitEndTurn';
      }
      break;
    }

    case 'BUILD': {
      const tileId = action.tileId;
      const def = getTileDef(tileId);
      const tState = state.tiles[tileId];

      if (!tState || tState.ownerId !== playerId) {
        return { state: currentState, events: [], error: 'You do not own this property' };
      }
      if (!def.districtId) {
        return { state: currentState, events: [], error: 'Cannot build on non-district properties' };
      }
      if (!ownsFullDistrict(state, playerId, def.districtId)) {
        return { state: currentState, events: [], error: 'Must own all properties in the district to build' };
      }
      // Check color-group ownership: player must own all properties with the same colorGroup
      if (def.colorGroup) {
        const colorGroup = def.colorGroup;
        const ownedColorGroupTiles = Object.entries(state.tiles).filter(
          ([_, t]) => t.ownerId === playerId && getTileDef(Number(_))?.colorGroup === colorGroup
        ).length;
        const totalColorGroupTiles = BOARD_DATA.tiles.filter(
          t => getTileDef(t.id)?.colorGroup === colorGroup
        ).length;
        if (ownedColorGroupTiles < totalColorGroupTiles) {
          return { state: currentState, events: [], error: 'Must own all properties of the same color group to build' };
        }
      }
      if (tState.tier >= 4) {
        return { state: currentState, events: [], error: 'Maximum building tier already reached (Landmark)' };
      }

      const district = BOARD_DATA.districts[def.districtId];
      if (!district) {
        return { state: currentState, events: [], error: 'Invalid district' };
      }

      // Check even build rule unless player has rezoning permit
      if (state.rules.evenBuild && !player.hasRezoningPermit) {
        const districtTiers = district.tileIds.map(tId => state.tiles[tId]?.tier ?? 0);
        const minTier = Math.min(...districtTiers);
        if (tState.tier > minTier) {
          return { state: currentState, events: [], error: 'Must build evenly across the district' };
        }
      }

      // Check global housing pool
      const nextTier = (tState.tier + 1) as Tier;
      const housesAvailable = state.housesAvailable ?? 32;
      const towersAvailable = state.towersAvailable ?? 12;
      if (nextTier === 1 || nextTier === 2) {
        if (housesAvailable <= 0) {
          return { state: currentState, events: [], error: 'No houses available in the city supply (limit 32 reached)' };
        }
        state.housesAvailable = housesAvailable - 1;
      } else if (nextTier >= 3) {
        if (towersAvailable <= 0) {
          return { state: currentState, events: [], error: 'No towers available in the city supply (limit 12 reached)' };
        }
        state.towersAvailable = towersAvailable - 1;
      }

      const cost = player.roleId === 'Broker' ? Math.round(district.buildCost * 0.85) : district.buildCost;
      if (player.cash < cost) {
        return { state: currentState, events: [], error: 'Insufficient funds to build' };
      }

      player.cash -= cost;
      tState.tier = (tState.tier + 1) as Tier;
      player.hasRezoningPermit = false;

      const tierNames = ['Land', 'House', 'Apartments', 'Tower', 'Landmark'];
      events.push({
        type: 'BUILDING_UPGRADED',
        playerId,
        tileId,
        amount: cost,
        reason: `${player.name} upgraded ${def.name} to ${tierNames[tState.tier]} for $${cost}.`,
      });
      break;
    }

    case 'SELL_BUILDING': {
      const tileId = action.tileId;
      const def = getTileDef(tileId);
      const tState = state.tiles[tileId];

      if (!tState || tState.ownerId !== playerId || tState.tier === 0 || !def.districtId) {
        return { state: currentState, events: [], error: 'No buildings to sell on this property' };
      }

      const district = BOARD_DATA.districts[def.districtId];
      const refund = district ? Math.round(district.buildCost / 2) : 50;

      const soldTier = tState.tier;
      tState.tier = (tState.tier - 1) as Tier;
      player.cash += refund;

      if (soldTier === 1 || soldTier === 2) {
        state.housesAvailable = (state.housesAvailable ?? 32) + 1;
      } else if (soldTier >= 3) {
        state.towersAvailable = (state.towersAvailable ?? 12) + 1;
      }

      events.push({
        type: 'BUILDING_SOLD',
        playerId,
        tileId,
        amount: refund,
        reason: `${player.name} sold a building on ${def.name} for $${refund}.`,
      });
      break;
    }

    case 'MORTGAGE': {
      const tileId = action.tileId;
      const def = getTileDef(tileId);
      const tState = state.tiles[tileId];

      if (!tState || tState.ownerId !== playerId) {
        return { state: currentState, events: [], error: 'You do not own this property' };
      }
      if (tState.mortgaged) {
        return { state: currentState, events: [], error: 'Property is already mortgaged' };
      }
      if (tState.tier > 0) {
        return { state: currentState, events: [], error: 'Must sell all buildings before mortgaging' };
      }

      const mortgageValue = Math.round((def.price ?? 100) / 2);
      tState.mortgaged = true;
      player.cash += mortgageValue;

      events.push({
        type: 'PROPERTY_MORTGAGED',
        playerId,
        tileId,
        amount: mortgageValue,
        reason: `${player.name} mortgaged ${def.name} for $${mortgageValue}.`,
      });
      break;
    }

    case 'UNMORTGAGE': {
      const tileId = action.tileId;
      const def = getTileDef(tileId);
      const tState = state.tiles[tileId];

      if (!tState || tState.ownerId !== playerId || !tState.mortgaged) {
        return { state: currentState, events: [], error: 'Property is not mortgaged' };
      }

      const cost = Math.round(((def.price ?? 100) / 2) * 1.1);
      if (player.cash < cost) {
        return { state: currentState, events: [], error: 'Insufficient funds to unmortgage' };
      }

      player.cash -= cost;
      tState.mortgaged = false;

      events.push({
        type: 'PROPERTY_UNMORTGAGED',
        playerId,
        tileId,
        amount: cost,
        reason: `${player.name} unmortgaged ${def.name} for $${cost}.`,
      });
      break;
    }

    case 'PAY_JAIL_FEE': {
      if (!player.inJail) {
        return { state: currentState, events: [], error: 'Player is not in jail' };
      }
      if (player.cash < 50) {
        return { state: currentState, events: [], error: 'Insufficient funds for jail fine' };
      }

      player.cash -= 50;
      state.communityFund += 50;
      player.inJail = false;
      player.jailTurns = 0;
      state.phase = 'awaitRoll';

      events.push({
        type: 'JAIL_FEE_PAID',
        playerId,
        amount: 50,
        reason: `${player.name} paid $50 fine and was released from the Audit Office.`,
      });
      break;
    }

    case 'USE_JAIL_CARD': {
      const cardIndex = player.heldCards.indexOf('jail_card');
      if (cardIndex === -1 && !player.inJail) {
        return { state: currentState, events: [], error: 'No Get Out of Audit card available' };
      }

      player.heldCards.splice(cardIndex, 1);
      player.inJail = false;
      player.jailTurns = 0;
      state.phase = 'awaitRoll';

      events.push({
        type: 'JAIL_CARD_USED',
        playerId,
        reason: `${player.name} used a Get Out of Audit Free card.`,
      });
      break;
    }

    case 'PROPOSE_TRADE': {
      const offerId = `trade-${Math.random().toString(36).substring(2, 7)}`;
      const newOffer: TradeOffer = {
        id: offerId,
        fromId: action.offer.fromId,
        toId: action.offer.toId,
        give: action.offer.give,
        want: action.offer.want,
        status: 'pending',
        expiresAt: now + 60000,
      };

      state.trades.push(newOffer);
      const recipient = state.players[action.offer.toId];
      events.push({
        type: 'TRADE_PROPOSED',
        playerId,
        reason: `${player.name} proposed a trade offer to ${recipient?.name ?? 'opponent'}.`,
      });
      break;
    }

    case 'RESPOND_TRADE': {
      const trade = state.trades.find(t => t.id === action.tradeId);
      if (!trade || trade.status !== 'pending') {
        return { state: currentState, events: [], error: 'Trade not found or already closed' };
      }

      if (action.response === 'decline') {
        trade.status = 'declined';
        events.push({
          type: 'TRADE_DECLINED',
          playerId,
          reason: `${player.name} declined the trade offer.`,
        });
      } else if (action.response === 'accept') {
        trade.status = 'accepted';
        const sender = state.players[trade.fromId];
        const receiver = state.players[trade.toId];

        if (sender && receiver) {
          // Exchange cash
          sender.cash -= trade.give.cash;
          receiver.cash += trade.give.cash;
          receiver.cash -= trade.want.cash;
          sender.cash += trade.want.cash;

          // Exchange influence
          sender.influence -= trade.give.influence;
          receiver.influence += trade.give.influence;
          receiver.influence -= trade.want.influence;
          sender.influence += trade.want.influence;

          // Exchange tiles
          trade.give.tileIds.forEach(tId => {
            if (state.tiles[tId]) state.tiles[tId].ownerId = receiver.id;
          });
          trade.want.tileIds.forEach(tId => {
            if (state.tiles[tId]) state.tiles[tId].ownerId = sender.id;
          });

          events.push({
            type: 'TRADE_COMPLETED',
            playerId,
            reason: `Trade agreed and executed between ${sender.name} and ${receiver.name}!`,
          });
        }
      }
      break;
    }

    case 'USE_ABILITY': {
      if (player.abilityReadyRound > state.round) {
        return { state: currentState, events: [], error: 'Ability is still on cooldown' };
      }

      switch (player.roleId) {
        case 'Tycoon':
          player.cash += 150;
          player.abilityReadyRound = state.round + 3;
          events.push({
            type: 'ABILITY_USED',
            playerId,
            reason: `${player.name} (Tycoon) tapped business reserves for +$150 cash!`,
          });
          break;

        case 'Banker':
          player.cash += 400;
          player.pendingLoan = { amount: 400, interest: 50, dueRound: state.round + 4 };
          player.abilityReadyRound = state.round + 4;
          events.push({
            type: 'ABILITY_USED',
            playerId,
            reason: `${player.name} (Banker) issued an emergency loan of $400 (repay $450 in 4 rounds).`,
          });
          break;

        case 'Strategist':
          player.influence += 2;
          player.abilityReadyRound = state.round + 3;
          events.push({
            type: 'ABILITY_USED',
            playerId,
            reason: `${player.name} (Strategist) foresaw market movements and gained +2 Influence.`,
          });
          break;

        case 'Landlord':
          player.abilityReadyRound = state.round + 4;
          events.push({
            type: 'ABILITY_USED',
            playerId,
            reason: `${player.name} (Landlord) initiated a district tax incentive!`,
          });
          break;

        default:
          player.influence += 1;
          player.abilityReadyRound = state.round + 2;
          events.push({
            type: 'ABILITY_USED',
            playerId,
            reason: `${player.name} utilized their role ability (+1 Influence).`,
          });
      }
      break;
    }

    case 'SPEND_INFLUENCE': {
      const itemCosts: Record<string, number> = {
        waiver: 1,
        lawyer: 2,
        rezone: 2,
        lobby: 3,
        wildcard: 3,
      };

      const cost = itemCosts[action.item] ?? 1;
      if (player.influence < cost) {
        return { state: currentState, events: [], error: 'Insufficient influence points' };
      }

      player.influence -= cost;

      if (action.item === 'waiver') {
        player.hasRentWaiver = true;
        events.push({
          type: 'INFLUENCE_SPENT',
          playerId,
          reason: `${player.name} purchased a Rent Waiver for next landing.`,
        });
      } else if (action.item === 'lawyer') {
        if (player.inJail) {
          player.inJail = false;
          player.jailTurns = 0;
          state.phase = 'awaitRoll';
        }
        player.heldCards.push('jail_card');
        events.push({
          type: 'INFLUENCE_SPENT',
          playerId,
          reason: `${player.name} hired an Audit Defense Lawyer.`,
        });
      } else if (action.item === 'rezone') {
        player.hasRezoningPermit = true;
        events.push({
          type: 'INFLUENCE_SPENT',
          playerId,
          reason: `${player.name} secured a Rezoning Permit (bypasses even-build).`,
        });
      } else if (action.item === 'lobby') {
        state.market.current.kind = 'boom';
        state.market.current.roundsLeft = 3;
        events.push({
          type: 'INFLUENCE_SPENT',
          playerId,
          reason: `${player.name} lobbied City Hall, sparking a 3-round Market Boom!`,
        });
      } else {
        player.cash += 200;
        events.push({
          type: 'INFLUENCE_SPENT',
          playerId,
          reason: `${player.name} cashed in a City Council perk for +$200.`,
        });
      }
      break;
    }

    case 'RAISE_FUNDS_DONE': {
      if (player.cash >= 0) {
        state.pendingDebt = null;
        state.phase = 'awaitEndTurn';
        events.push({
          type: 'DEBT_SETTLED',
          playerId,
          reason: `${player.name} successfully cleared outstanding debt!`,
        });
      } else {
        // Bankrupt
        handleBankruptcy(state, playerId, events);
      }
      break;
    }

    case 'END_TURN': {
      if (state.phase !== 'awaitEndTurn') {
        return { state: currentState, events: [], error: 'Cannot end turn yet' };
      }

      // Check banker loan due
      if (player.pendingLoan && player.pendingLoan.dueRound <= state.round) {
        const totalDue = player.pendingLoan.amount + player.pendingLoan.interest;
        player.cash -= totalDue;
        player.pendingLoan = null;
        events.push({
          type: 'LOAN_REPAID',
          playerId,
          amount: totalDue,
          reason: `${player.name} repaid emergency bank loan of $${totalDue}.`,
        });
      }

      // Advance turn
      advanceTurn(state, events);
      break;
    }

    case 'RESIGN': {
      handleBankruptcy(state, playerId, events);
      break;
    }

    default:
      return { state: currentState, events: [], error: 'Unknown action type' };
  }

  state.version += 1;
  state.log = [...state.log, ...events].slice(-50); // Keep last 50 events

  return { state, events };
}

/**
 * Moves player along the 40-tile ring and resolves tile encounters.
 */
function movePlayer(
  state: GameState,
  player: PlayerState,
  distance: number,
  events: GameEvent[]
): void {
  const oldPos = player.position;
  const newPos = (oldPos + distance) % 40;

  // Passed or landed on Start (Payday HQ)
  if (newPos < oldPos || newPos === 0) {
    const payday = state.rules.paydayAmount;
    player.cash += payday;
    events.push({
      type: 'PAYDAY',
      playerId: player.id,
      amount: payday,
      reason: `${player.name} passed Payday HQ and collected $${payday}.`,
    });
  }

  player.position = newPos;
  player.lastLandedTile = newPos;

  const def = getTileDef(newPos);
  const tState = state.tiles[newPos];

  events.push({
    type: 'TILE_LANDED',
    playerId: player.id,
    tileId: newPos,
    reason: `${player.name} landed on ${def.name}.`,
  });

  switch (def.type) {
    case 'start':
    case 'jail':
      state.phase = 'awaitEndTurn';
      break;

    case 'goToJail':
      player.inJail = true;
      player.position = 10;
      player.lastPositionBeforeJail = newPos;
      player.doublesStreak = 0;
      state.phase = 'awaitEndTurn';
      events.push({
        type: 'GO_TO_JAIL',
        playerId: player.id,
        tileId: 10,
        reason: `${player.name} was audited and sent directly to the Audit Office!`,
      });
      break;

    case 'property':
    case 'hub':
    case 'utility':
      if (tState && tState.ownerId === null) {
        state.phase = 'awaitBuyDecision';
      } else if (tState && tState.ownerId !== null && tState.ownerId !== player.id) {
        const ownerId = tState.ownerId;
        const owner = state.players[ownerId];
        if (player.hasRentWaiver) {
          player.hasRentWaiver = false;
          events.push({
            type: 'RENT_WAIVED',
            playerId: player.id,
            reason: `${player.name} used a Rent Waiver to avoid paying rent to ${owner?.name ?? 'owner'}!`,
          });
          state.phase = 'awaitEndTurn';
        } else {
          const dice = state.lastDice ?? [3, 4];
          const rent = computeRent(state, newPos, dice);
          if (rent > 0) {
            player.cash -= rent;
            if (owner) {
              owner.cash += rent;
            }
            events.push({
              type: 'RENT_PAID',
              playerId: player.id,
              amount: rent,
              fromPlayerId: ownerId,
              reason: `${player.name} paid $${rent} rent to ${owner?.name ?? 'owner'} for ${def.name}.`,
            });

            if (player.cash < 0) {
              state.pendingDebt = {
                debtorId: player.id,
                creditorId: ownerId,
                amount: Math.abs(player.cash),
              };
              state.phase = 'awaitDebtSettlement';
            } else {
              state.phase = 'awaitEndTurn';
            }
          } else {
            state.phase = 'awaitEndTurn';
          }
        }
      } else {
        state.phase = 'awaitEndTurn';
      }
      break;

    case 'tax': {
      const tax = def.taxAmount ?? 150;
      player.cash -= tax;
      state.communityFund += tax;
      events.push({
        type: 'TAX_PAID',
        playerId: player.id,
        amount: tax,
        reason: `${player.name} paid $${tax} ${def.name} into the Community Fund.`,
      });

      if (player.cash < 0) {
        state.pendingDebt = {
          debtorId: player.id,
          creditorId: 'bank',
          amount: Math.abs(player.cash),
        };
        state.phase = 'awaitDebtSettlement';
      } else {
        state.phase = 'awaitEndTurn';
      }
      break;
    }

    case 'communityFund': {
      if (state.rules.vacationCash !== false && state.communityFund > 0) {
        const award = state.communityFund;
        player.cash += award;
        state.communityFund = 0;
        events.push({
          type: 'COMMUNITY_FUND_COLLECTED',
          playerId: player.id,
          amount: award,
          reason: `${player.name} landed on Vacation and collected all taxes & bank payments ($${award})!`,
        });
      } else {
        events.push({
          type: 'COMMUNITY_FUND_EMPTY',
          playerId: player.id,
          reason: `${player.name} is on Vacation enjoying a relaxing break.`,
        });
      }
      state.phase = 'awaitEndTurn';
      break;
    }

    case 'influence':
    case 'summit': {
      player.influence += 2;
      events.push({
        type: 'INFLUENCE_EARNED',
        playerId: player.id,
        amount: 2,
        reason: `${player.name} attended the Summit and gained +2 Influence points!`,
      });
      state.phase = 'awaitEndTurn';
      break;
    }

    case 'event': {
      resolveEventCard(state, player, events);
      break;
    }

    default:
      state.phase = 'awaitEndTurn';
  }
}

/**
 * Draws and executes an event card from EVENT_CARDS.
 */
function resolveEventCard(
  state: GameState,
  player: PlayerState,
  events: GameEvent[]
): void {
  const cardIndex = Math.floor(Math.random() * EVENT_CARDS.length);
  const card: EventCardDef = EVENT_CARDS[cardIndex] ?? {
    id: 1,
    text: 'Advance to Payday HQ',
    type: 'income',
    amount: 100,
  };

  events.push({
    type: 'EVENT_CARD_DRAWN',
    playerId: player.id,
    card: card.text,
    reason: `EVENT: ${card.text}`,
  });

  switch (card.type) {
    case 'income':
      player.cash += card.amount ?? 50;
      break;
    case 'tax':
      player.cash -= card.amount ?? 50;
      state.communityFund += card.amount ?? 50;
      break;
    case 'collectFromAll': {
      const amt = card.amount ?? 50;
      let totalCollected = 0;
      for (const [otherId, other] of Object.entries(state.players)) {
        if (otherId !== player.id && other.status === 'active') {
          other.cash -= amt;
          totalCollected += amt;
        }
      }
      player.cash += totalCollected;
      break;
    }
    case 'payToAll': {
      const amt = card.amount ?? 50;
      for (const [otherId, other] of Object.entries(state.players)) {
        if (otherId !== player.id && other.status === 'active') {
          player.cash -= amt;
          other.cash += amt;
        }
      }
      break;
    }
    case 'moveRelative': {
      const steps = (card as any).steps ?? 0;
      if (steps > 0) {
        movePlayer(state, player, steps, events);
      }
      break;
    }
    case 'moveNearest': {
      const eff = card.effect ?? 'hub';
      for (let s = 1; s <= 40; s++) {
        const nextIdx = (player.position + s) % 40;
        const def = getTileDef(nextIdx as TileId);
        if (def && def.type === eff) {
          movePlayer(state, player, s, events);
          break;
        }
      }
      break;
    }
    case 'move':
      if (card.targetTile !== undefined) {
        const delta = ((card.targetTile - player.position) % 40 + 40) % 40;
        if (delta === 0 && card.targetTile !== player.position) {
          // targetTile wraps fully around the ring
          movePlayer(state, player, 40, events);
        } else {
          movePlayer(state, player, delta, events);
        }
      }
      break;
    case 'card':
      player.heldCards.push('jail_card');
      break;
    case 'influence':
      player.influence += card.amount ?? 2;
      break;
    case 'influenceLoss':
      player.influence = Math.max(0, player.influence - (card.amount ?? 1));
      break;
    case 'marketEvent':
      state.market.current.kind = (card.effect as MarketKind) ?? 'boom';
      state.market.current.roundsLeft = 2;
      break;
    default:
      player.cash += 50;
  }

  if (player.cash < 0) {
    state.pendingDebt = {
      debtorId: player.id,
      creditorId: 'bank',
      amount: Math.abs(player.cash),
    };
    state.phase = 'awaitDebtSettlement';
  } else {
    state.phase = 'resolveEvent';
  }
}

/**
 * Advances turn order to the next active player and updates round / market cycle.
 */
function advanceTurn(state: GameState, events: GameEvent[]): void {
  const activePlayers = state.turnOrder.filter(id => state.players[id]?.status === 'active');
  if (activePlayers.length <= 1) {
    state.phase = 'gameOver';
    const winner = activePlayers[0] ? state.players[activePlayers[0]]?.name : 'Survivor';
    events.push({
      type: 'GAME_OVER',
      reason: `Game over! ${winner} is victorious!`,
    });
    return;
  }

  const currentIdx = state.turnOrder.indexOf(state.turnPlayerId);
  let nextIdx = (currentIdx + 1) % state.turnOrder.length;

  // Find next active player
  while (state.players[state.turnOrder[nextIdx] ?? '']?.status !== 'active') {
    nextIdx = (nextIdx + 1) % state.turnOrder.length;
  }

  // Increment round if round cycled back to first
  if (nextIdx <= currentIdx) {
    state.round += 1;

    // Cycle market every 4 rounds
    if (state.round % 4 === 0) {
      const kinds: MarketKind[] = ['steady', 'boom', 'crash', 'creditSurge'];
      const nextKind = kinds[Math.floor(Math.random() * kinds.length)] ?? 'steady';
      state.market.current.kind = nextKind;
      state.market.current.roundsLeft = 4;
      events.push({
        type: 'MARKET_CYCLE_SHIFT',
        reason: `Round ${state.round}: Market cycle shifted to ${nextKind.toUpperCase()}!`,
      });
    }
  }

  const nextPlayerId = state.turnOrder[nextIdx] ?? activePlayers[0] ?? 'p1';
  state.turnPlayerId = nextPlayerId;
  const nextPlayer = state.players[nextPlayerId];

  if (nextPlayer?.inJail) {
    state.phase = 'awaitJailChoice';
  } else {
    state.phase = 'awaitRoll';
  }

  events.push({
    type: 'TURN_STARTED',
    playerId: nextPlayerId,
    reason: `Round ${state.round}: ${nextPlayer?.name ?? 'Next player'}'s turn began.`,
  });
}

/**
 * Handles bankruptcy and asset forfeiture.
 */
function handleBankruptcy(state: GameState, playerId: PlayerId, events: GameEvent[]): void {
  const player = state.players[playerId];
  if (!player) return;

  player.status = 'bankrupt';

  // Forfeit all owned tiles back to bank
  for (const tState of Object.values(state.tiles)) {
    if (tState.ownerId === playerId) {
      tState.ownerId = null;
      tState.tier = 0;
      tState.mortgaged = false;
    }
  }

  events.push({
    type: 'PLAYER_BANKRUPT',
    playerId,
    reason: `${player.name} went bankrupt and was eliminated!`,
  });

  const activePlayers = state.turnOrder.filter(id => state.players[id]?.status === 'active');
  if (activePlayers.length <= 1) {
    state.phase = 'gameOver';
    const winnerName = activePlayers[0] ? state.players[activePlayers[0]]?.name : 'Survivor';
    events.push({
      type: 'GAME_OVER',
      reason: `Game over! ${winnerName} is victorious!`,
    });
  } else {
    advanceTurn(state, events);
  }
}

/**
 * Automates one action step for a bot player during local games.
 */
export function botStep(state: GameState, botId: PlayerId): { action: Action; delayMs: number } | null {
  const bot = state.players[botId];
  if (!bot || bot.status !== 'active') return null;

  if (state.phase === 'auction' && state.auction) {
    const tileDef = getTileDef(state.auction.tileId);
    const maxVal = Math.round((tileDef.price ?? 100) * 0.7);
    if (state.auction.highBid < maxVal && bot.cash >= state.auction.highBid + 20) {
      return { action: { type: 'BID', amount: state.auction.highBid + 10 }, delayMs: 800 };
    }
    return { action: { type: 'PASS_BID' }, delayMs: 600 };
  }

  if (state.turnPlayerId !== botId) return null;

  switch (state.phase) {
    case 'awaitRoll':
      return { action: { type: 'ROLL' }, delayMs: 600 };

    case 'awaitJailChoice':
      if (bot.heldCards.includes('jail_card')) {
        return { action: { type: 'USE_JAIL_CARD' }, delayMs: 500 };
      }
      if (bot.cash >= 300) {
        return { action: { type: 'PAY_JAIL_FEE' }, delayMs: 500 };
      }
      return { action: { type: 'ROLL' }, delayMs: 600 };

    case 'awaitBuyDecision': {
      const tileDef = getTileDef(bot.lastLandedTile);
      if (tileDef.price && bot.cash >= tileDef.price * 1.1) {
        return { action: { type: 'BUY' }, delayMs: 700 };
      }
      return { action: { type: 'DECLINE_BUY' }, delayMs: 700 };
    }

    case 'resolveEvent':
      return { action: { type: 'END_TURN' }, delayMs: 500 };

    case 'awaitDebtSettlement': {
      // Mortgage first unmortgaged property
      const owned = Object.entries(state.tiles).find(
        ([_, t]) => t.ownerId === botId && !t.mortgaged && t.tier === 0
      );
      if (owned) {
        return { action: { type: 'MORTGAGE', tileId: Number(owned[0]) }, delayMs: 600 };
      }
      return { action: { type: 'RAISE_FUNDS_DONE' }, delayMs: 600 };
    }

    case 'awaitEndTurn': {
      // Attempt building if bot owns a full district and has ample cash
      for (const [idStr, tState] of Object.entries(state.tiles)) {
        const tileId = Number(idStr);
        const def = getTileDef(tileId);
        if (
          tState.ownerId === botId &&
          tState.tier < 4 &&
          def.districtId &&
          ownsFullDistrict(state, botId, def.districtId)
        ) {
          const district = BOARD_DATA.districts[def.districtId];
          if (district && bot.cash > district.buildCost + 300) {
            return { action: { type: 'BUILD', tileId }, delayMs: 700 };
          }
        }
      }
      return { action: { type: 'END_TURN' }, delayMs: 800 };
    }

    default:
      return null;
  }
}
