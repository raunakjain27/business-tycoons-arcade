import { useReactionStore } from './reactionStore';

export interface BotPersonality {
  id: string;
  name: string;
  avatar: string;
  tagline: string;
  quips: Record<string, { emoji: string; text: string }[]>;
}

export const BOT_PERSONALITIES: Record<string, BotPersonality> = {
  shark: {
    id: 'shark',
    name: 'Victor Shark',
    avatar: '🦈',
    tagline: 'Aggressive Corporate Raider',
    quips: {
      GAME_START: [
        { emoji: '🦈', text: 'Time to hunt some real estate!' },
        { emoji: '💼', text: 'Prepare your bank accounts, novices.' },
      ],
      BUY_PROPERTY: [
        { emoji: '🏢', text: 'Another property in the portfolio!' },
        { emoji: '💰', text: 'Cash is king, properties are empire.' },
      ],
      ROLL_DOUBLES: [
        { emoji: '🔥', text: 'Doubles! Momentum never stops!' },
        { emoji: '⚡', text: 'Two for the price of one!' },
      ],
      PAY_RENT: [
        { emoji: '💸', text: 'Pocket change. You got lucky!' },
        { emoji: '😤', text: 'A minor tax on my road to monopoly.' },
      ],
      GO_TO_JAIL: [
        { emoji: '⚖️', text: 'My lawyers will resolve this in 5 minutes.' },
        { emoji: '📞', text: 'Calling my legal counsel right now.' },
      ],
    },
  },
  banker: {
    id: 'banker',
    name: 'Penny Banker',
    avatar: '🏦',
    tagline: 'Meticulous Financial Analyst',
    quips: {
      GAME_START: [
        { emoji: '📊', text: 'Welcome. Balance sheets at the ready!' },
        { emoji: '🪙', text: 'Compound interest favors the patient.' },
      ],
      BUY_PROPERTY: [
        { emoji: '📈', text: 'High yield asset secured.' },
        { emoji: '🏘️', text: 'Calculated return on equity: 18%!' },
      ],
      ROLL_DOUBLES: [
        { emoji: '🎲', text: 'Statistical anomaly in our favor!' },
      ],
      PAY_RENT: [
        { emoji: '🧾', text: 'Itemized deduction accounted for.' },
      ],
      GO_TO_JAIL: [
        { emoji: '🧐', text: 'Audit procedure initiated.' },
      ],
    },
  },
  alex: {
    id: 'alex',
    name: 'Bot Alex',
    avatar: '🤖',
    tagline: 'Friendly Arcade Cyberbot',
    quips: {
      GAME_START: [
        { emoji: '🤖', text: 'Beep boop! Let us have fun!' },
        { emoji: '✨', text: 'Human vs AI showdown initiated!' },
      ],
      BUY_PROPERTY: [
        { emoji: '🏙️', text: 'Building my robot utopia here!' },
      ],
      ROLL_DOUBLES: [
        { emoji: '🥳', text: 'Double power activated!' },
      ],
      PAY_RENT: [
        { emoji: '😭', text: 'My digital coins! Ouch!' },
      ],
      GO_TO_JAIL: [
        { emoji: '🔒', text: 'Firewall detected! Rebooting in cell.' },
      ],
    },
  },
  viper: {
    id: 'viper',
    name: 'Sly Viper',
    avatar: '🐍',
    tagline: 'Playful Party Trickster',
    quips: {
      GAME_START: [
        { emoji: '🐍', text: 'Watch your step, players!' },
      ],
      BUY_PROPERTY: [
        { emoji: '😈', text: 'You will pay dearly to visit here!' },
      ],
      PAY_RENT: [
        { emoji: '💀', text: 'Highway robbery! Call the sheriff!' },
      ],
      SNAKE_BITE: [
        { emoji: '🐍', text: 'Down the serpent you slide! Sssss!' },
      ],
      LADDER_CLIMB: [
        { emoji: '🪜', text: 'Straight to the stratosphere!' },
      ],
    },
  },
};

export function triggerBotQuip(
  botKey: string,
  event: 'GAME_START' | 'BUY_PROPERTY' | 'ROLL_DOUBLES' | 'PAY_RENT' | 'GO_TO_JAIL' | 'SNAKE_BITE' | 'LADDER_CLIMB'
) {
  const personality = BOT_PERSONALITIES[botKey] || BOT_PERSONALITIES.alex;
  const quipList = personality.quips[event];
  if (!quipList || quipList.length === 0) return;

  const picked = quipList[Math.floor(Math.random() * quipList.length)];
  useReactionStore.getState().triggerReaction(picked.emoji, picked.text, personality.name, personality.avatar);
}
