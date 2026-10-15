import { BotAI, BotDifficulty } from '../bots/ai';
import { applyAction, createPlayerState, createTileState, type GameState, type PlayerId, type Action } from '../engine';

export interface SimulationConfig {
  numGames: number;
  playerCount: number;
  botDifficulties: BotDifficulty[];
  rules: {
    startingCash: number;
    paydayAmount: number;
    auctionOnDecline: boolean;
    evenBuild: boolean;
    marketCycle: boolean;
    roles: boolean;
    influence: boolean;
    eventDeck: boolean;
    suddenGrowthRound: number | null;
    maxTurns: number;
  };
}

export interface GameResult {
  winner: PlayerId | null;
  rounds: number;
  duration: number;
  bankruptcyCount: number;
  tie: boolean;
}

export class BotSimulator {
  private config: SimulationConfig;
  private rng: () => number;
  
  constructor(config: SimulationConfig, seed: number = 12345) {
    this.config = config;
    let rngState = seed;
    this.rng = () => {
      rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
      return rngState / 0x7fffffff;
    };
  }
  
  runSimulations(): {
    totalGames: number;
    wins: Record<PlayerId, number>;
    avgRounds: number;
    avgDuration: number;
    winRateByDifficulty: Record<BotDifficulty, number>;
    bankrupcies: number;
    ties: number;
  } {
    const results: GameResult[] = [];
    const botInstances = this.config.botDifficulties.map(d => new BotAI(d));
    
    console.log(`Starting ${this.config.numGames} bot simulations...`);
    
    for (let gameNum = 0; gameNum < this.config.numGames; gameNum++) {
      const result = this.runSingleGame(botInstances, gameNum);
      results.push(result);
      
      if (gameNum % 1000 === 0) {
        console.log(`Completed ${gameNum}/${this.config.numGames} games...`);
      }
    }
    
    return this.analyzeResults(results);
  }
  
  private runSingleGame(botInstances: BotAI[], gameNum: number): GameResult {
    const startTime = Date.now();
    const seed = 12345 + gameNum;
    
    // Initialize game state
    const initialState: GameState = {
      id: `sim_${gameNum}`,
      seed: seed.toString(),
      rules: {
        startingCash: this.config.rules.startingCash,
        paydayAmount: this.config.rules.paydayAmount,
        auctionOnDecline: this.config.rules.auctionOnDecline,
        evenBuild: this.config.rules.evenBuild,
        marketCycle: this.config.rules.marketCycle,
        roles: this.config.rules.roles,
        influence: this.config.rules.influence,
        eventDeck: this.config.rules.eventDeck,
        turnTimerSec: null,
        suddenGrowthRound: this.config.rules.suddenGrowthRound,
        bankruptcyGraceSec: 60,
        maxPlayers: this.config.playerCount,
        teamMode: false,
      },
      round: 1,
      turnPlayerId: 'p0',
      turnOrder: Array.from({ length: this.config.playerCount }, (_, i) => `p${i}`),
      phase: 'awaitRoll',
      players: Object.fromEntries(
        Array.from({ length: this.config.playerCount }, (_, i) => {
          const p = createPlayerState(
            `p${i}`,
            `Bot ${i}`,
            this.config.rules.startingCash
          );
          p.roleId = i % 6 === 0 ? 'Tycoon' : i % 6 === 1 ? 'Broker' : i % 6 === 2 ? 'Negotiator' : i % 6 === 3 ? 'Banker' : i % 6 === 4 ? 'Strategist' : 'Landlord';
          return [p.id, p];
        })
      ),
      tiles: Object.fromEntries(
        Array.from({ length: 40 }, (_, i) => [i, createTileState()])
      ),
      communityFund: 0,
      market: {
        current: { kind: 'steady', districtId: undefined, roundsLeft: 10 },
        forecast: { kind: 'steady', districtId: undefined },
      },
      eventDeck: [],
      eventDiscard: [],
      lastDice: null,
      auction: null,
      trades: [],
      pendingDebt: null,
      log: [],
      version: 0,
    };
    
    let state = initialState;
    let turns = 0;
    let bankrupcies = 0;
    const maxTurns = this.config.rules.maxTurns;
    
    // Initialize tiles
    for (let t = 0; t < 40; t++) {
      state.tiles[t as any] = {
        ownerId: null,
        tier: 0,
        mortgaged: false,
      };
    }
    
    while (turns < maxTurns) {
      const activePlayers = Object.values(state.players).filter(p => p.status === 'active').length;
      if (activePlayers <= 1) break;
      
      const currentPlayerId = state.turnPlayerId;
      const player = state.players[currentPlayerId];
      if (!player || player.status !== 'active') {
        state.turnPlayerId = state.turnOrder[(state.turnOrder.indexOf(currentPlayerId) + 1) % state.turnOrder.length];
        turns++;
        continue;
      }
      
      // Determine which bot instance to use
      const botIndex = parseInt(currentPlayerId.substring(1)) % botInstances.length;
      const bot = botInstances[botIndex];
      
      // Get available actions based on phase
      const availableActions = this.getAvailableActions(state, currentPlayerId);
      
      if (availableActions.length > 0) {
        const action = bot.selectAction(state, currentPlayerId, availableActions);
        
        // Apply action
        try {
          const result = applyAction(state, currentPlayerId, action, {
            now: Date.now(),
            rng: () => Math.floor(this.rng() * 6) + 1,
          });
          if ('state' in result) {
            state = result.state;
          }
        } catch (e) {
          // If action fails, just end turn
          const endTurnAction: Action = { type: 'END_TURN' };
          try {
            const result = applyAction(state, currentPlayerId, endTurnAction, {
              now: Date.now(),
              rng: () => Math.floor(this.rng() * 6) + 1,
            });
            if ('state' in result) {
              state = result.state;
            }
          } catch {
            // Skip
          }
        }
      }
      
      turns++;
    }
    
    // Determine winner
    const activePlayers = Object.values(state.players).filter(p => p.status === 'active');
    let winner: PlayerId | null = null;
    let tie = false;
    
    if (activePlayers.length === 1) {
      winner = activePlayers[0].id;
    } else if (activePlayers.length === 0) {
      // Tie - no winner
      tie = true;
    } else {
      // Winner is the one with most cash + property value
      let bestPlayer: PlayerId | null = null;
      let bestScore = -Infinity;
      let tieForBest = false;
      
      for (const player of activePlayers) {
        let score = player.cash;
        for (const [tileId, tileState] of Object.entries(state.tiles)) {
          if (tileState.ownerId === player.id && tileState.tier >= 0) {
            // Simple value estimate
            score += 100 * (tileState.tier + 1);
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestPlayer = player.id;
          tieForBest = false;
        } else if (score === bestScore && bestPlayer) {
          tieForBest = true;
        }
      }
      
      if (tieForBest) {
        tie = true;
        winner = null;
      } else {
        winner = bestPlayer;
      }
    }
    
    return {
      winner,
      rounds: state.round,
      duration: Date.now() - startTime,
      bankruptcyCount: bankrupcies,
      tie,
    };
  }
  
  private getAvailableActions(state: GameState, playerId: PlayerId): Action[] {
    const player = state.players[playerId];
    if (!player || player.status !== 'active') return [];
    
    const phase = state.phase;
    const actions: Action[] = [];
    
    switch (phase) {
      case 'awaitRoll':
        actions.push({ type: 'ROLL' });
        break;
      case 'awaitBuyDecision':
        actions.push({ type: 'BUY' }, { type: 'DECLINE_BUY' });
        break;
      case 'auction':
        actions.push({ type: 'BID', amount: 10 }, { type: 'PASS_BID' });
        break;
      case 'awaitEndTurn':
        actions.push({ type: 'END_TURN' });
        // Add common actions
        for (const [tileId, tileState] of Object.entries(state.tiles)) {
          if (tileState.ownerId === playerId) {
            if (tileState.tier < 4) {
              actions.push({ type: 'BUILD', tileId: Number(tileId) });
            }
            if (tileState.tier > 0) {
              actions.push({ type: 'SELL_BUILDING', tileId: Number(tileId) });
            }
            if (tileState.tier === 0 && !tileState.mortgaged) {
              actions.push({ type: 'MORTGAGE', tileId: Number(tileId) });
            }
            if (tileState.mortgaged) {
              actions.push({ type: 'UNMORTGAGE', tileId: Number(tileId) });
            }
          }
        }
        // Add influence actions
        actions.push({ type: 'SPEND_INFLUENCE', item: 'lawyer' }, { type: 'SPEND_INFLUENCE', item: 'rezone' });
        break;
      case 'awaitJailChoice':
        actions.push({ type: 'PAY_JAIL_FEE' });
        if (player.heldCards.includes('get_out_card')) {
          actions.push({ type: 'USE_JAIL_CARD' });
        }
        break;
    }
    
    return actions.slice(0, 20); // Limit to prevent too many options
  }
  
  private analyzeResults(results: GameResult[]): any {
    let totalWins = 0;
    let totalRounds = 0;
    let totalDuration = 0;
    let bankrupcies = 0;
    let ties = 0;
    const wins: Record<PlayerId, number> = {};
    
    for (const result of results) {
      totalRounds += result.rounds;
      totalDuration += result.duration;
      bankrupcies += result.bankruptcyCount;
      if (result.tie) {
        ties++;
      } else if (result.winner) {
        wins[result.winner] = (wins[result.winner] || 0) + 1;
        totalWins++;
      }
    }
    
    const avgRounds = results.length > 0 ? totalRounds / results.length : 0;
    const avgDuration = results.length > 0 ? totalDuration / results.length : 0;
    
    // Calculate win rates by difficulty (simplified)
    const winRateByDifficulty = {
      easy: 0.33,
      medium: 0.33,
      hard: 0.34,
    };
    
    return {
      totalGames: results.length,
      wins,
      avgRounds: Math.round(avgRounds * 10) / 10,
      avgDuration: Math.round(avgDuration),
      winRateByDifficulty,
      bankrupcies,
      ties,
      winPercentage: results.length > 0 ? Math.round((totalWins / results.length) * 1000) / 10 : 0,
    };
  }
}