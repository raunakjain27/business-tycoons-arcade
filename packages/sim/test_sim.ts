import { BotSimulator } from './bot_simulator';
import { BotDifficulty } from '../bots/ai';
const sim = new BotSimulator({
  numGames: 50,
  playerCount: 4,
  botDifficulties: [BotDifficulty.Medium, BotDifficulty.Medium, BotDifficulty.Medium, BotDifficulty.Medium],
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
    maxTurns: 50,
  },
});
const result = sim.runSimulations();
console.log(JSON.stringify(result, null, 2));
