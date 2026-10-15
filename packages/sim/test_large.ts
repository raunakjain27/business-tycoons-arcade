import { BotSimulator } from './bot_simulator';
import { BotDifficulty } from '../bots/ai';
const sim = new BotSimulator({
  numGames: 1000,
  playerCount: 4,
  botDifficulties: [BotDifficulty.Easy, BotDifficulty.Medium, BotDifficulty.Hard, BotDifficulty.Medium],
  rules: {
    startingCash: 1500,
    paydayAmount: 200,
    auctionOnDecline: true,
    evenBuild: true,
    marketCycle: true,
    roles: true,
    influence: true,
    eventDeck: true,
    suddenGrowthRound: null,
    maxTurns: 100,
  },
});
const result = sim.runSimulations();
console.log(JSON.stringify(result, null, 2));
