import { applyAction, type GameState, type PlayerId, type Action } from './index';
import { DEFAULT_RULES } from './types';

function createTestState(): GameState {
  const players: Record<PlayerId, any> = {
    'p0': {
      id: 'p0',
      name: 'Alice',
      tokenId: 'alice',
      roleId: 'Tycoon',
      cash: 1500,
      influence: 0,
      position: 0,
      inJail: false,
      jailTurns: 0,
      doublesStreak: 0,
      heldCards: [],
      teamId: null,
      abilityReadyRound: 0,
      status: 'active',
    },
    'p1': {
      id: 'p1',
      name: 'Bob',
      tokenId: 'bob',
      roleId: 'Broker',
      cash: 1500,
      influence: 0,
      position: 0,
      inJail: false,
      jailTurns: 0,
      doublesStreak: 0,
      heldCards: [],
      teamId: null,
      abilityReadyRound: 0,
      status: 'active',
    },
  };
  const tiles: any = {};
  for (let t = 0; t < 40; t++) {
    tiles[t] = { ownerId: null, tier: 0, mortgaged: false };
  }
  return {
    id: 'test',
    seed: '12345',
    rules: DEFAULT_RULES,
    round: 1,
    turnPlayerId: 'p0',
    turnOrder: ['p0', 'p1'],
    phase: 'awaitRoll',
    players,
    tiles,
    communityFund: 0,
    market: { current: { kind: 'steady', roundsLeft: 10 }, forecast: { kind: 'steady' } },
    eventDeck: [],
    eventDiscard: [],
    lastDice: null,
    auction: null,
    trades: [],
    pendingDebt: null,
    log: [],
    version: 0,
  };
}

const state = createTestState();
const rng = () => 3;
const result = applyAction(state, 'p0', { type: 'ROLL' } as Action, { now: Date.now(), rng });
if ('state' in result) {
  console.log('OK', result.state.phase, result.state.players.p0.position);
} else {
  console.error('ERR', result);
}
