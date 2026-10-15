import { GameState, Action, PlayerId, ActionResult, ActionContext } from '../engine/types';
import { applyAction } from '../engine';
import boardJson from '../content/board.json';
import { BoardDef } from '../engine/types';

const BOARD = boardJson as unknown as BoardDef;

export enum BotDifficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
}

export class BotAI {
  difficulty: BotDifficulty;

  constructor(difficulty: BotDifficulty = BotDifficulty.Medium) {
    this.difficulty = difficulty;
  }

  selectAction(state: GameState, playerId: PlayerId): Action {
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

  getValidActions(state: GameState, playerId: PlayerId): Action[] {
    const actions: Action[] = [];
    const player = state.players[playerId];
    if (!player || player.status !== 'active') return actions;

    const isTurn = state.turnPlayerId === playerId;

    switch (state.phase) {
      case 'awaitRoll':
        if (isTurn) {
          actions.push({ type: 'ROLL' });
        }
        break;

      case 'awaitBuyDecision':
        if (isTurn) {
          const tile = BOARD.tiles[player.position];
          if (tile && tile.type === 'property' && tile.price && player.cash >= tile.price) {
            actions.push({ type: 'BUY' });
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

      case 'awaitEndTurn':
        if (isTurn) {
          for (const [tileIdStr, tState] of Object.entries(state.tiles)) {
            const tileId = Number(tileIdStr);
            if (tState.ownerId === playerId) {
              const def = BOARD.tiles[tileId];
              if (def && def.districtId && tState.tier < 4) {
                const dist = BOARD.districts[def.districtId];
                if (dist && player.cash >= dist.buildCost) {
                  const ownsAll = dist.tileIds.every(id => state.tiles[id]?.ownerId === playerId && !state.tiles[id]?.mortgaged);
                  if (ownsAll) {
                    actions.push({ type: 'BUILD', tileId });
                  }
                }
              }
              if (tState.mortgaged) {
                const def = BOARD.tiles[tileId];
                if (def && def.price) {
                  const cost = Math.round((def.price / 2) * 1.1);
                  if (player.cash >= cost) {
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

  private easySelect(actions: Action[], _state: GameState, _playerId: PlayerId): Action {
    const roll = actions.find(a => a.type === 'ROLL');
    if (roll) return roll;

    const buy = actions.find(a => a.type === 'BUY');
    if (buy && Math.random() < 0.7) return buy;

    const endTurn = actions.find(a => a.type === 'END_TURN');
    if (endTurn) return endTurn;

    return actions[Math.floor(Math.random() * actions.length)];
  }

  private mediumSelect(actions: Action[], state: GameState, playerId: PlayerId): Action {
    const buy = actions.find(a => a.type === 'BUY');
    if (buy) {
      const player = state.players[playerId];
      const tile = BOARD.tiles[player.position];
      if (tile && tile.districtId) {
        const dist = BOARD.districts[tile.districtId];
        const owned = dist ? dist.tileIds.filter(id => state.tiles[id]?.ownerId === playerId).length : 0;
        if (owned >= 1 || player.cash > 400) return buy;
      }
    }

    const build = actions.find(a => a.type === 'BUILD');
    if (build && state.players[playerId]?.cash > 300) {
      return build;
    }

    const payJail = actions.find(a => a.type === 'PAY_JAIL_FEE');
    if (payJail && state.players[playerId]?.cash > 250) {
      return payJail;
    }

    const roll = actions.find(a => a.type === 'ROLL');
    if (roll) return roll;

    const pass = actions.find(a => a.type === 'PASS_BID');
    if (pass) return pass;

    const endTurn = actions.find(a => a.type === 'END_TURN');
    if (endTurn) return endTurn;

    return actions[0];
  }

  private hardSelect(actions: Action[], state: GameState, playerId: PlayerId): Action {
    let bestAction = actions[0];
    let bestScore = -Infinity;

    for (const action of actions) {
      let score = 0;
      const ctx: ActionContext = {
        now: Date.now(),
        rng: () => Math.floor(Math.random() * 6) + 1,
      };

      const result: ActionResult = applyAction(state, playerId, action, ctx);
      if (result.ok) {
        score = this.evaluateState(result.state, playerId);
      } else {
        score = -1000;
      }

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return bestAction;
  }

  private evaluateState(state: GameState, playerId: PlayerId): number {
    const player = state.players[playerId];
    if (!player) return -9999;
    if (player.status === 'bankrupt') return -10000;

    let score = player.cash;

    for (const [tileIdStr, tState] of Object.entries(state.tiles)) {
      const tileId = Number(tileIdStr);
      if (tState.ownerId === playerId) {
        const def = BOARD.tiles[tileId];
        score += (def?.price || 100) * (tState.mortgaged ? 0.5 : 1.0);
        score += tState.tier * 80;
      }
    }

    score += player.influence * 25;
    if (player.inJail) score -= 50;

    return score;
  }
}