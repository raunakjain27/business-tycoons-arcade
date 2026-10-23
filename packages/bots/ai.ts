import {
  GameState,
  Action,
  PlayerId,
  ActionResult,
  ActionContext,
  BoardDef,
  TradeOffer,
  TradeBundle,
  TileId,
} from '../engine/types';
import { applyAction } from '../engine';
import boardJson from '../content/board.json';

const BOARD = boardJson as unknown as BoardDef;

export enum BotDifficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
}

export interface DistrictAnalysis {
  districtId: string;
  totalTiles: number;
  tileIds: number[];
  ownerCounts: Record<PlayerId, number>;
  unownedCount: number;
  monopolyOwner: PlayerId | null;
  nearMonopolies: { playerId: PlayerId; missingTileIds: number[] }[];
}

/**
 * Super Smart Autonomous Bot AI for Cornerstone / Business Tycoons Monopoly.
 * Features:
 * 1. Deep district analysis and monopoly completion recognition.
 * 2. Strategic tile valuation with monopoly completion bonuses and enemy blocking penalties.
 * 3. Proactive, calculated trade proposals to opponents and human players.
 * 4. Critical evaluation of incoming trades (preventing lopsided scams, accepting strategic deals).
 * 5. Adaptive auction bidding based on monopoly leverage.
 * 6. Intelligent building upgrades, mortgage prioritization, and debt survival.
 */
export class BotAI {
  difficulty: BotDifficulty;

  constructor(difficulty: BotDifficulty = BotDifficulty.Medium) {
    this.difficulty = difficulty;
  }

  selectAction(state: GameState, playerId: PlayerId): Action {
    // 1. Critical Priority: Check for incoming trade proposals to this bot
    const pendingTrade = state.trades?.find(t => t.toId === playerId && t.status === 'pending');
    if (pendingTrade) {
      return this.evaluateIncomingTrade(state, playerId, pendingTrade);
    }

    // 2. Fetch phase-legal actions
    const validActions = this.getValidActions(state, playerId);

    if (validActions.length === 0) {
      return { type: 'END_TURN' };
    }

    switch (this.difficulty) {
      case BotDifficulty.Easy:
        return this.easySelect(validActions, state, playerId);
      case BotDifficulty.Medium:
        return this.mediumSelect(validActions, state, playerId);
      case BotDifficulty.Hard:
        return this.hardSelect(validActions, state, playerId);
      default:
        return this.mediumSelect(validActions, state, playerId);
    }
  }

  /**
   * Evaluates all legal actions for this player in the current game phase.
   */
  getValidActions(state: GameState, playerId: PlayerId): Action[] {
    const actions: Action[] = [];
    const player = state.players[playerId];
    if (!player || player.status !== 'active') return actions;

    const isTurn = state.turnPlayerId === playerId;

    // Responding to trades is legal at ANY time
    const pendingTrade = state.trades?.find(t => t.toId === playerId && t.status === 'pending');
    if (pendingTrade) {
      actions.push({ type: 'RESPOND_TRADE', tradeId: pendingTrade.id, response: 'accept' });
      actions.push({ type: 'RESPOND_TRADE', tradeId: pendingTrade.id, response: 'decline' });
    }

    switch (state.phase) {
      case 'awaitRoll':
        if (isTurn) {
          actions.push({ type: 'ROLL' });
        }
        break;

      case 'awaitBuyDecision':
        if (isTurn) {
          const tile = BOARD.tiles[player.position];
          if (tile && (tile.type === 'property' || tile.type === 'hub' || tile.type === 'utility') && tile.price) {
            const effectivePrice = player.roleId === 'Broker' ? Math.round(tile.price * 0.85) : tile.price;
            if (player.cash >= effectivePrice) {
              actions.push({ type: 'BUY' });
            }
          }
          actions.push({ type: 'DECLINE_BUY' });
        }
        break;

      case 'auction':
        if (state.auction && !state.auction.passed.includes(playerId)) {
          const minBid = state.auction.highBid + 10;
          if (player.cash >= minBid) {
            actions.push({ type: 'BID', amount: minBid });
          }
          actions.push({ type: 'PASS_BID' });
        }
        break;

      case 'awaitJailChoice':
        if (isTurn && player.inJail) {
          if (player.cash >= 50) {
            actions.push({ type: 'PAY_JAIL_FEE' });
          }
          if (player.heldCards.includes('jail_card')) {
            actions.push({ type: 'USE_JAIL_CARD' });
          }
          actions.push({ type: 'ROLL' });
        }
        break;

      case 'awaitDebtSettlement':
        if (state.pendingDebt && state.pendingDebt.debtorId === playerId) {
          for (const [tileIdStr, tState] of Object.entries(state.tiles)) {
            const tileId = Number(tileIdStr);
            if (tState.ownerId === playerId) {
              if (tState.tier > 0) {
                actions.push({ type: 'SELL_BUILDING', tileId });
              } else if (!tState.mortgaged) {
                actions.push({ type: 'MORTGAGE', tileId });
              }
            }
          }
          actions.push({ type: 'RAISE_FUNDS_DONE' });
        }
        break;

      case 'resolveEvent':
        if (isTurn) {
          if (player.doublesStreak > 0 && !player.inJail) {
            actions.push({ type: 'ACKNOWLEDGE_EVENT' });
          } else {
            actions.push({ type: 'END_TURN' });
          }
        }
        break;

      case 'awaitEndTurn':
        if (isTurn) {
          // Check proactive smart trade proposal
          const smartTrade = this.findSmartTradeProposal(state, playerId);
          if (smartTrade) {
            actions.push(smartTrade);
          }

          // Building opportunities respecting full district and even-build rules
          for (const [tileIdStr, tState] of Object.entries(state.tiles)) {
            const tileId = Number(tileIdStr);
            if (tState.ownerId === playerId) {
              const def = BOARD.tiles[tileId];
              if (def && def.districtId && tState.tier < 4 && !tState.mortgaged) {
                const dist = BOARD.districts[def.districtId];
                if (dist && player.cash >= dist.buildCost) {
                  const ownsAll = dist.tileIds.every(
                    id => state.tiles[id]?.ownerId === playerId && !state.tiles[id]?.mortgaged
                  );
                  const minTier = Math.min(...dist.tileIds.map(id => state.tiles[id]?.tier ?? 0));
                  if (ownsAll && tState.tier === minTier) {
                    actions.push({ type: 'BUILD', tileId });
                  }
                }
              }

              // Unmortgage opportunities
              if (tState.mortgaged) {
                const def = BOARD.tiles[tileId];
                if (def && def.price) {
                  const cost = Math.round((def.price / 2) * 1.1);
                  if (player.cash >= cost + 200) {
                    actions.push({ type: 'UNMORTGAGE', tileId });
                  }
                }
              }
            }
          }

          actions.push({ type: 'END_TURN' });
        }
        break;
    }

    return actions;
  }

  // --------------------------------------------------------------------------
  // Strategic District and Monopoly Intelligence
  // --------------------------------------------------------------------------

  public analyzeDistricts(state: GameState): Record<string, DistrictAnalysis> {
    const analysis: Record<string, DistrictAnalysis> = {};

    for (const [districtId, def] of Object.entries(BOARD.districts)) {
      const tileIds = def.tileIds;
      const ownerCounts: Record<PlayerId, number> = {};
      let unownedCount = 0;

      for (const tId of tileIds) {
        const owner = state.tiles[tId]?.ownerId;
        if (owner) {
          ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
        } else {
          unownedCount++;
        }
      }

      let monopolyOwner: PlayerId | null = null;
      for (const [owner, count] of Object.entries(ownerCounts)) {
        if (count === tileIds.length) {
          monopolyOwner = owner;
          break;
        }
      }

      const nearMonopolies: { playerId: PlayerId; missingTileIds: number[] }[] = [];
      for (const [owner, count] of Object.entries(ownerCounts)) {
        if (count === tileIds.length - 1) {
          const missing = tileIds.filter(id => state.tiles[id]?.ownerId !== owner);
          nearMonopolies.push({ playerId: owner, missingTileIds: missing });
        }
      }

      analysis[districtId] = {
        districtId,
        totalTiles: tileIds.length,
        tileIds,
        ownerCounts,
        unownedCount,
        monopolyOwner,
        nearMonopolies,
      };
    }

    return analysis;
  }

  /**
   * Calculates the true strategic value of a tile from the viewpoint of a specific player.
   * Takes into account monopoly completion, blocking, synergy, and revenue potential.
   */
  public evaluateTileStrategicValue(
    state: GameState,
    tileId: number,
    evalPlayerId: PlayerId,
    isAcquiring: boolean,
    districts?: Record<string, DistrictAnalysis>
  ): number {
    const def = BOARD.tiles[tileId];
    if (!def) return 100;

    const basePrice = def.price ?? 100;
    const tState = state.tiles[tileId];
    const isMortgaged = tState?.mortgaged ?? false;

    // Base asset value
    let val = isMortgaged ? Math.round(basePrice * 0.5) : basePrice;

    // Hub / Railroad strategic value
    if (def.type === 'hub') {
      const ownedHubs = [5, 15, 25, 35].filter(id => state.tiles[id]?.ownerId === evalPlayerId).length;
      const count = isAcquiring ? ownedHubs + 1 : ownedHubs;
      const hubScale = [200, 300, 450, 650];
      return hubScale[Math.min(3, Math.max(0, count - 1))] ?? 250;
    }

    // Utility strategic value
    if (def.type === 'utility') {
      const ownedUtils = [12, 28].filter(id => state.tiles[id]?.ownerId === evalPlayerId).length;
      return isAcquiring && ownedUtils === 1 ? 320 : 180;
    }

    if (!def.districtId) return val;

    const dist = (districts || this.analyzeDistricts(state))[def.districtId];
    if (!dist) return val;

    const currentOwned = dist.ownerCounts[evalPlayerId] || 0;
    const buildCost = BOARD.districts[def.districtId]?.buildCost ?? 100;

    if (isAcquiring) {
      // Acquiring this completes a full district monopoly!
      if (currentOwned === dist.totalTiles - 1) {
        val += basePrice * 1.6 + buildCost * 1.2;
      } else if (currentOwned >= 1) {
        val += basePrice * 0.45;
      }
    } else {
      // Surrendering this tile: Check if it breaks our monopoly
      if (dist.monopolyOwner === evalPlayerId) {
        val += basePrice * 2.8 + buildCost * 1.8;
      }
      // Check if this tile was a blocker preventing an opponent from monopolizing
      for (const nm of dist.nearMonopolies) {
        if (nm.playerId !== evalPlayerId && nm.missingTileIds.includes(tileId)) {
          // Blocking value is massive
          val += basePrice * 2.2 + buildCost * 1.2 + 150;
        }
      }
    }

    return Math.round(val);
  }

  // --------------------------------------------------------------------------
  // Intelligent Trade Decision Making & Proactive Proposals
  // --------------------------------------------------------------------------

  /**
   * Intelligently evaluates an incoming trade offer.
   * Returns accept if the strategic gain exceeds cost with healthy margin.
   */
  public evaluateIncomingTrade(
    state: GameState,
    botId: PlayerId,
    trade: TradeOffer
  ): Action {
    const bot = state.players[botId];
    if (!bot) return { type: 'RESPOND_TRADE', tradeId: trade.id, response: 'decline' };

    const districts = this.analyzeDistricts(state);

    // What the bot receives (give in proposal is from proposer, to bot)
    const cashGain = trade.give.cash;
    let tileGain = 0;
    for (const tId of trade.give.tileIds) {
      tileGain += this.evaluateTileStrategicValue(state, tId, botId, true, districts);
    }
    const totalGain = cashGain + tileGain;

    // What the bot loses (want in proposal is what proposer wants from bot)
    const cashLoss = trade.want.cash;
    let tileLoss = 0;
    for (const tId of trade.want.tileIds) {
      tileLoss += this.evaluateTileStrategicValue(state, tId, botId, false, districts);
    }
    const totalLoss = cashLoss + tileLoss;

    // Check if the trade completes a monopoly for the bot
    let completesBotMonopoly = false;
    for (const tId of trade.give.tileIds) {
      const def = BOARD.tiles[tId];
      if (def?.districtId) {
        const d = districts[def.districtId];
        if (d && (d.ownerCounts[botId] || 0) === d.totalTiles - 1) {
          completesBotMonopoly = true;
          break;
        }
      }
    }

    // Check if the trade completes a monopoly for the proposer
    let completesOpponentMonopoly = false;
    for (const tId of trade.want.tileIds) {
      const def = BOARD.tiles[tId];
      if (def?.districtId) {
        const d = districts[def.districtId];
        if (d && (d.ownerCounts[trade.fromId] || 0) === d.totalTiles - 1) {
          completesOpponentMonopoly = true;
          break;
        }
      }
    }

    // Decision Logic:
    // 1. If opponent gets a monopoly and bot does not, strictly decline unless overwhelming compensation (ratio >= 2.2)
    if (completesOpponentMonopoly && !completesBotMonopoly) {
      if (totalGain < totalLoss * 2.2) {
        return { type: 'RESPOND_TRADE', tradeId: trade.id, response: 'decline' };
      }
    }

    // 2. If bot completes a monopoly, bot is eager! Accept even if slight overpay (ratio >= 0.88)
    if (completesBotMonopoly) {
      if (totalGain >= totalLoss * 0.88 && bot.cash - trade.want.cash >= 100) {
        return { type: 'RESPOND_TRADE', tradeId: trade.id, response: 'accept' };
      }
    }

    // 3. General fairness evaluation
    const threshold = this.difficulty === BotDifficulty.Hard ? 1.05 : 0.95;
    if (totalGain >= totalLoss * threshold && (trade.want.cash <= bot.cash - 120 || trade.want.cash === 0)) {
      return { type: 'RESPOND_TRADE', tradeId: trade.id, response: 'accept' };
    }

    // 4. Strategic Counter-Offer: If trade is close to fair and opponent has cash to bridge the gap
    const proposer = state.players[trade.fromId];
    if (proposer && !completesOpponentMonopoly && totalLoss > totalGain && totalGain >= totalLoss * 0.55) {
      const cashDeficit = Math.round(totalLoss * (this.difficulty === BotDifficulty.Hard ? 1.15 : 1.05) - totalGain);
      const neededCash = trade.give.cash + cashDeficit;
      if (neededCash <= proposer.cash && neededCash <= 1200) {
        return {
          type: 'RESPOND_TRADE',
          tradeId: trade.id,
          response: 'counter',
          counter: {
            ...trade.give,
            cash: neededCash,
          },
        };
      }
    }

    return { type: 'RESPOND_TRADE', tradeId: trade.id, response: 'decline' };
  }

  /**
   * Generates a proactive, smart trade proposal if the bot identifies a high-yield opportunity.
   */
  public findSmartTradeProposal(state: GameState, botId: PlayerId): Action | null {
    const bot = state.players[botId];
    if (!bot || bot.status !== 'active') return null;

    // Limit active proposals: if bot already has a pending trade, wait
    if (state.trades?.some(t => t.fromId === botId && t.status === 'pending')) {
      return null;
    }

    const districts = this.analyzeDistricts(state);

    // Find if the bot has a near-monopoly (owns totalTiles - 1)
    for (const d of Object.values(districts)) {
      if ((d.ownerCounts[botId] || 0) === d.totalTiles - 1) {
        // Find who owns the missing tile
        const missingTileId = d.tileIds.find(id => state.tiles[id]?.ownerId !== botId);
        if (missingTileId === undefined) continue;

        const ownerId = state.tiles[missingTileId]?.ownerId;
        if (!ownerId || ownerId === botId) continue;

        const targetPlayer = state.players[ownerId];
        if (!targetPlayer || targetPlayer.status !== 'active') continue;

        const missingDef = BOARD.tiles[missingTileId];
        const missingPrice = missingDef?.price ?? 100;

        // Find candidate tile to give: an orphan tile owned by the bot
        let candidateGiveTileId: TileId | null = null;
        for (const [idStr, tState] of Object.entries(state.tiles)) {
          const tId = Number(idStr);
          if (tState.ownerId === botId && tState.tier === 0) {
            const def = BOARD.tiles[tId];
            if (def && def.districtId) {
              const otherDist = districts[def.districtId];
              // Make sure bot doesn't own full set here
              if (otherDist && (otherDist.ownerCounts[botId] || 0) <= 1) {
                // Also ensure this tile does NOT complete a monopoly for targetPlayer!
                if ((otherDist.ownerCounts[ownerId] || 0) < otherDist.totalTiles - 1) {
                  candidateGiveTileId = tId;
                  break;
                }
              }
            }
          }
        }

        // Formulate proposal:
        if (candidateGiveTileId !== null) {
          const giveTilePrice = BOARD.tiles[candidateGiveTileId]?.price ?? 100;
          const cashDiff = Math.max(0, missingPrice - giveTilePrice) + 40;
          if (bot.cash >= cashDiff + 150) {
            return {
              type: 'PROPOSE_TRADE',
              offer: {
                fromId: botId,
                toId: ownerId,
                give: {
                  tileIds: [candidateGiveTileId],
                  cash: cashDiff,
                  influence: 0,
                  cards: [],
                  rentContracts: [],
                },
                want: {
                  tileIds: [missingTileId],
                  cash: 0,
                  influence: 0,
                  cards: [],
                  rentContracts: [],
                },
              },
            };
          }
        } else {
          // Cash-only offer if bot has plenty of reserves
          const generousCash = Math.round(missingPrice * 1.45);
          if (bot.cash >= generousCash + 250) {
            return {
              type: 'PROPOSE_TRADE',
              offer: {
                fromId: botId,
                toId: ownerId,
                give: {
                  tileIds: [],
                  cash: generousCash,
                  influence: 0,
                  cards: [],
                  rentContracts: [],
                },
                want: {
                  tileIds: [missingTileId],
                  cash: 0,
                  influence: 0,
                  cards: [],
                  rentContracts: [],
                },
              },
            };
          }
        }
      }
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Selection Logic by Difficulty Level
  // --------------------------------------------------------------------------

  private easySelect(actions: Action[], _state: GameState, _playerId: PlayerId): Action {
    const roll = actions.find(a => a.type === 'ROLL');
    if (roll) return roll;

    const buy = actions.find(a => a.type === 'BUY');
    if (buy && Math.random() < 0.65) return buy;

    const endTurn = actions.find(a => a.type === 'END_TURN');
    if (endTurn) return endTurn;

    return actions[Math.floor(Math.random() * actions.length)];
  }

  private mediumSelect(actions: Action[], state: GameState, playerId: PlayerId): Action {
    // 1. Roll if available
    const roll = actions.find(a => a.type === 'ROLL');
    if (roll) return roll;

    // 2. Buy decisions based on district synergy
    const buy = actions.find(a => a.type === 'BUY');
    if (buy) {
      const player = state.players[playerId];
      const tile = BOARD.tiles[player.position];
      if (tile) {
        if (tile.districtId) {
          const dist = BOARD.districts[tile.districtId];
          const owned = dist ? dist.tileIds.filter(id => state.tiles[id]?.ownerId === playerId).length : 0;
          if (owned >= 1 || player.cash > 320) return buy;
        } else if (tile.type === 'hub' || tile.type === 'utility') {
          if (player.cash > 250) return buy;
        }
      }
    }

    // 3. Auction bidding
    if (state.phase === 'auction' && state.auction) {
      const bid = this.evaluateAuctionBid(state, playerId);
      if (bid) return bid;
      const pass = actions.find(a => a.type === 'PASS_BID');
      if (pass) return pass;
    }

    // 4. Proactive trade
    const trade = actions.find(a => a.type === 'PROPOSE_TRADE');
    if (trade && Math.random() < 0.7) return trade;

    // 5. Building upgrades
    const build = actions.find(a => a.type === 'BUILD');
    if (build && (state.players[playerId]?.cash ?? 0) > 300) {
      return build;
    }

    // 6. Jail escape
    const jailFee = actions.find(a => a.type === 'PAY_JAIL_FEE');
    if (jailFee && (state.players[playerId]?.cash ?? 0) > 250) {
      return jailFee;
    }

    const unmortgage = actions.find(a => a.type === 'UNMORTGAGE');
    if (unmortgage && (state.players[playerId]?.cash ?? 0) > 400) {
      return unmortgage;
    }

    const endTurn = actions.find(a => a.type === 'END_TURN');
    if (endTurn) return endTurn;

    return actions[0];
  }

  private hardSelect(actions: Action[], state: GameState, playerId: PlayerId): Action {
    // Prioritize roll
    const roll = actions.find(a => a.type === 'ROLL');
    if (roll) return roll;

    // Smart auction evaluation
    if (state.phase === 'auction') {
      const bid = this.evaluateAuctionBid(state, playerId);
      if (bid) return bid;
      const pass = actions.find(a => a.type === 'PASS_BID');
      if (pass) return pass;
    }

    // Proactive smart trade
    const trade = actions.find(a => a.type === 'PROPOSE_TRADE');
    if (trade) return trade;

    // Buy evaluation
    const buy = actions.find(a => a.type === 'BUY');
    if (buy) {
      const p = state.players[playerId];
      const t = BOARD.tiles[p.position];
      if (t) {
        const val = this.evaluateTileStrategicValue(state, p.position, playerId, true);
        const cost = p.roleId === 'Broker' ? Math.round((t.price ?? 100) * 0.85) : (t.price ?? 100);
        if (p.cash >= cost && (val >= cost * 0.95 || p.cash > cost + 150)) {
          return buy;
        }
      }
    }

    // Build upgrades
    const build = actions.find(a => a.type === 'BUILD');
    if (build && (state.players[playerId]?.cash ?? 0) > 280) {
      return build;
    }

    let bestAction = actions[0];
    let bestScore = -Infinity;

    for (const action of actions) {
      if (action.type === 'END_TURN' && actions.some(a => a.type === 'BUILD' || a.type === 'PROPOSE_TRADE')) {
        continue;
      }

      const ctx: ActionContext = {
        now: Date.now(),
        rng: () => Math.floor(Math.random() * 6) + 1,
      };

      const result: ActionResult = applyAction(state, playerId, action, ctx);
      const score = result.ok ? this.evaluateState(result.state, playerId) : -10000;

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return bestAction;
  }

  private evaluateAuctionBid(state: GameState, playerId: PlayerId): Action | null {
    if (!state.auction) return null;
    const bot = state.players[playerId];
    if (!bot) return null;

    const tileId = state.auction.tileId;
    const def = BOARD.tiles[tileId];
    if (!def) return null;

    const price = def.price ?? 100;
    const districts = this.analyzeDistricts(state);

    let maxWillingBid = Math.round(price * 0.75);

    // If completes district for bot
    if (def.districtId) {
      const d = districts[def.districtId];
      if (d && (d.ownerCounts[playerId] || 0) === d.totalTiles - 1) {
        maxWillingBid = Math.min(bot.cash - 60, Math.round(price * 1.8));
      } else {
        // If blocks an opponent who has near-monopoly
        for (const nm of d.nearMonopolies) {
          if (nm.playerId !== playerId) {
            maxWillingBid = Math.min(bot.cash - 100, Math.round(price * 1.3));
            break;
          }
        }
      }
    } else if (def.type === 'hub') {
      maxWillingBid = Math.min(bot.cash - 80, Math.round(price * 1.1));
    }

    const nextBid = state.auction.highBid + 10;
    if (nextBid <= maxWillingBid && bot.cash >= nextBid) {
      return { type: 'BID', amount: nextBid };
    }

    return null;
  }

  private evaluateState(state: GameState, playerId: PlayerId): number {
    const player = state.players[playerId];
    if (!player) return -9999;
    if (player.status === 'bankrupt') return -10000;

    let score = player.cash;
    const districts = this.analyzeDistricts(state);

    for (const [tileIdStr, tState] of Object.entries(state.tiles)) {
      const tileId = Number(tileIdStr);
      if (tState.ownerId === playerId) {
        const stratVal = this.evaluateTileStrategicValue(state, tileId, playerId, false, districts);
        score += stratVal;
        score += tState.tier * 110;
      }
    }

    // District monopoly count bonus
    for (const d of Object.values(districts)) {
      if (d.monopolyOwner === playerId) {
        score += 450;
      }
    }

    score += player.influence * 30;
    if (player.inJail) score -= 60;

    return score;
  }
}