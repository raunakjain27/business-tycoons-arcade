import React, { useState } from 'react';
import { useUserStore } from '../userStore';
import { soundFx } from '../soundEffects';

interface GameRuleGuide {
  id: string;
  title: string;
  icon: string;
  tagline: string;
  accent: string;
  steps: {
    number: string;
    title: string;
    desc: string;
    icon: string;
  }[];
  proTip: string;
  winCondition: string;
}

const GAME_GUIDES: Record<string, GameRuleGuide> = {
  cornerstone: {
    id: 'cornerstone',
    title: 'Business Tycoons',
    icon: '🏙️',
    tagline: 'Trade, build skyscrapers & bankrupt rivals to rule the board!',
    accent: '#8b5cf6',
    steps: [
      {
        number: '1',
        title: 'Roll & Move',
        desc: 'Roll the pair of dice to travel around the world tiles. Roll doubles to take an instant bonus turn!',
        icon: '🎲',
      },
      {
        number: '2',
        title: 'Buy & Build',
        desc: 'Buy unowned properties. Once you own all properties of a color district, upgrade from houses to towering landmarks!',
        icon: '🏗️',
      },
      {
        number: '3',
        title: 'Collect Rent',
        desc: 'Opponents landing on your properties must pay rent. If a player runs out of money and cannot settle debt, they go bankrupt!',
        icon: '💰',
      },
    ],
    proTip: 'Collect influence points at Summit tiles to bypass building limits or halve expensive rents!',
    winCondition: 'Bankrupt all your opponents or accumulate the highest net worth!',
  },
  tambola: {
    id: 'tambola',
    title: 'Tambola (Housie)',
    icon: '🎟️',
    tagline: 'The ultimate Indian family housie game with live synthesized caller!',
    accent: '#ec4899',
    steps: [
      {
        number: '1',
        title: 'Listen to Caller',
        desc: 'The caller announces numbers from 1 to 90 with classic Hindi/English voice and nicknames.',
        icon: '📢',
      },
      {
        number: '2',
        title: 'Dab Your Numbers',
        desc: 'Check your 3x9 ticket grids. Click on numbers as soon as they are called to mark them green.',
        icon: '✏️',
      },
      {
        number: '3',
        title: 'Claim Your Cash',
        desc: 'Be the first to finish Early 5, Top Line, Middle Line, Bottom Line, Corners, or Full House to claim the jackpot!',
        icon: '🏆',
      },
    ],
    proTip: 'Watch the board carefully — you cannot cut a number before it is announced!',
    winCondition: 'Dab all 15 numbers on your ticket before anyone else to take Full House!',
  },
  bingo: {
    id: 'bingo',
    title: 'Bingo Blitz',
    icon: '🎱',
    tagline: 'Classic 5x5 card game. Match numbers and yell BINGO!',
    accent: '#3b82f6',
    steps: [
      {
        number: '1',
        title: 'Track Called Balls',
        desc: 'Balls are drawn from letters B-I-N-G-O (1 to 75). Your center tile is already FREE!',
        icon: '🔮',
      },
      {
        number: '2',
        title: 'Stamp Your Card',
        desc: 'Click on any matching number on your card to stamp it with glowing colored markers.',
        icon: '🎯',
      },
      {
        number: '3',
        title: 'Shout BINGO!',
        desc: 'Complete 5 stamped tiles in any horizontal row, vertical column, or diagonal line to win!',
        icon: '📣',
      },
    ],
    proTip: 'Diagonal lines cross through the center FREE space, making them the fastest way to win!',
    winCondition: 'Complete any 5-in-a-row pattern and tap CALL BINGO!',
  },
  uno: {
    id: 'uno',
    title: 'Color Clash (UNO)',
    icon: '🃏',
    tagline: 'Match colors, drop action cards, and empty your hand first!',
    accent: '#ef4444',
    steps: [
      {
        number: '1',
        title: 'Match Color or Number',
        desc: 'Play a card from your hand that matches the discard pile by color, number, or symbol.',
        icon: '🌈',
      },
      {
        number: '2',
        title: 'Unleash Action Cards',
        desc: 'Use Skip 🚫, Reverse 🔄, and Draw Two ➕2 to disrupt opponents. Drop Wild Draw 4 🌈 to switch color!',
        icon: '⚡',
      },
      {
        number: '3',
        title: 'Yell UNO!',
        desc: 'When down to your final card, tap the flashing UNO button immediately before someone calls you out!',
        icon: '🚨',
      },
    ],
    proTip: 'Save your Wild Draw 4 for emergencies when you have no matching colors.',
    winCondition: 'Be the first player to discard all cards from your hand!',
  },
  ludo: {
    id: 'ludo',
    title: 'Ludo Royale',
    icon: '👑',
    tagline: 'The royal board race. Knock opponents back to base and reach home!',
    accent: '#10b981',
    steps: [
      {
        number: '1',
        title: 'Roll a 6 to Launch',
        desc: 'Roll a 6 on the die to unlock a token from your base yard into the starting track.',
        icon: '🎲',
      },
      {
        number: '2',
        title: 'Race & Strike',
        desc: 'Move tokens clockwise around the 52-tile track. Land on an opponent to send them back to base!',
        icon: '⚔️',
      },
      {
        number: '3',
        title: 'Star Safe Zones',
        desc: 'Tokens resting on Star tiles ⭐ are totally immune from being captured by opponents.',
        icon: '🛡️',
      },
    ],
    proTip: 'Spread your tokens across the board so you always have a safe move on any dice roll!',
    winCondition: 'Safely guide all 4 of your colored tokens into the center Home triangle!',
  },
  snakes: {
    id: 'snakes',
    title: 'Snakes & Ladders',
    icon: '🪜',
    tagline: 'Climb high on glorious ladders, but beware of slippery snakes!',
    accent: '#f59e0b',
    steps: [
      {
        number: '1',
        title: 'Roll to Advance',
        desc: 'Take turns rolling the die and advance your peg across the 100-numbered grid.',
        icon: '🎲',
      },
      {
        number: '2',
        title: 'Climb Ladders',
        desc: 'Land on the bottom rung of a ladder 🪜 to shoot up dozens of tiles toward the top!',
        icon: '🚀',
      },
      {
        number: '3',
        title: 'Dodge Snakes',
        desc: 'Watch out for snakes 🐍! Landing on a serpent head slides you all the way down to its tail.',
        icon: '⚠️',
      },
    ],
    proTip: 'Ladder 28 boosts you directly to tile 84, putting you in prime striking distance to win!',
    winCondition: 'Be the first player to reach the final Tile 100!',
  },
  imposter: {
    id: 'imposter',
    title: "Who's The Imposter?",
    icon: '🕵️',
    tagline: 'Bluff, investigate clues, and sniff out the secret imposter!',
    accent: '#06b6d4',
    steps: [
      {
        number: '1',
        title: 'Receive Secret Word',
        desc: 'All detectives receive the same secret word. The Imposter only sees a vague hint category!',
        icon: '🤫',
      },
      {
        number: '2',
        title: 'Give One-Word Clues',
        desc: 'Every player gives a clever clue related to the word — without making it too obvious for the imposter.',
        icon: '💬',
      },
      {
        number: '3',
        title: 'Vote at the Stand',
        desc: 'Debate who sounded suspicious or gave an evasive answer, then cast your vote to unmask them!',
        icon: '🗳️',
      },
    ],
    proTip: 'If you are the Imposter, listen closely to earlier clues and parrot general concepts with confidence!',
    winCondition: 'Detectives win by voting out the imposter. The Imposter wins if they survive or guess the secret word!',
  },
  traitors: {
    id: 'traitors',
    title: 'The Traitors (Castle Mafia)',
    icon: '🏰',
    tagline: 'Complete gold missions by day, survive the cloak-and-dagger murders by night!',
    accent: '#e11d48',
    steps: [
      {
        number: '1',
        title: 'Night Murders',
        desc: 'While the castle sleeps, secret Traitors assemble in the turret to eliminate one innocent Faithful.',
        icon: '🗡️',
      },
      {
        number: '2',
        title: 'Gold Missions & Shields',
        desc: 'By day, players work together on missions to add coins to the prize pot and earn protective shields.',
        icon: '🛡️',
      },
      {
        number: '3',
        title: 'The Roundtable',
        desc: 'Gather at the circular table, debate suspicious alibis, and vote to banish a suspected traitor.',
        icon: '⚖️',
      },
    ],
    proTip: 'Winning a shield in daytime missions grants total immunity from murder that following night!',
    winCondition: 'Faithful win by banishing all traitors. Traitors win if they equal or outnumber faithful at the finale!',
  },
  sequence: {
    id: 'sequence',
    title: 'Sequence Pro',
    icon: '🎯',
    tagline: 'Form lines of 5 chips on the giant playing card board!',
    accent: '#3b82f6',
    steps: [
      {
        number: '1',
        title: 'Play a Card',
        desc: 'Pick a playing card from your 6-card hand (e.g. 7 of Spades).',
        icon: '🃏',
      },
      {
        number: '2',
        title: 'Place Your Marker',
        desc: 'Click on the matching card square on the 10x10 board to drop your team color chip.',
        icon: '🔵',
      },
      {
        number: '3',
        title: 'Special Jacks',
        desc: 'Two-eyed Jacks are WILD (place anywhere). One-eyed Jacks can REMOVE any opponent chip!',
        icon: '👑',
      },
    ],
    proTip: 'The four corner squares ★ are free wildcards that belong to both players at all times!',
    winCondition: 'Connect 5 chips in an unbroken horizontal, vertical, or diagonal line!',
  },
  wordgame: {
    id: 'wordgame',
    title: 'Word Master (Name-Place-Animal-Thing)',
    icon: '🔤',
    tagline: 'Fast-paced vocabulary showdown against the ticking clock!',
    accent: '#10b981',
    steps: [
      {
        number: '1',
        title: 'Letter Announcement',
        desc: 'A random letter (e.g. "B") is rolled for the entire table.',
        icon: '📢',
      },
      {
        number: '2',
        title: 'Type 4 Categories',
        desc: 'Quickly type a Name (Bruce), Place (Berlin), Animal (Bear), and Thing (Bottle) starting with that letter.',
        icon: '⌨️',
      },
      {
        number: '3',
        title: 'Beat the Timer',
        desc: 'Submit your entries before the 45-second timer runs out. Unique correct words score 10 bonus points!',
        icon: '⏱️',
      },
    ],
    proTip: 'Think of exotic cities and animals to avoid sharing the same answer as your opponents!',
    winCondition: 'Score the highest aggregate points across rounds to become the Word Champion!',
  },
};

export const HowToPlayModal: React.FC = () => {
  const { showRulesModal, rulesGameId, closeRulesModal, openRulesModal } = useUserStore();
  const [selectedGame, setSelectedGame] = useState<string>(rulesGameId || 'cornerstone');

  if (!showRulesModal) return null;

  const guide = GAME_GUIDES[selectedGame] || GAME_GUIDES.cornerstone;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: 'rgba(5, 3, 10, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out forwards',
      }}
      onClick={closeRulesModal}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          background: 'linear-gradient(145deg, #1c182d 0%, #100c1e 100%)',
          borderRadius: '24px',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>📖</span>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                How to Play Guide
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Easy 1-minute visual rules for kids & friends
              </span>
            </div>
          </div>
          <button
            onClick={closeRulesModal}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#cbd5e1',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Game Selector Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '12px 24px',
            background: 'rgba(15, 11, 26, 0.6)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            scrollbarWidth: 'none',
          }}
        >
          {Object.values(GAME_GUIDES).map((g) => {
            const isActive = g.id === selectedGame;
            return (
              <button
                key={g.id}
                onClick={() => {
                  soundFx.playClick();
                  setSelectedGame(g.id);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: isActive ? `1.5px solid ${g.accent}` : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isActive ? `${g.accent}25` : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? `0 0 12px ${g.accent}40` : 'none',
                }}
              >
                <span>{g.icon}</span>
                <span>{g.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Hero Banner for current game */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${guide.accent}20 0%, rgba(255, 255, 255, 0.02) 100%)`,
              border: `1px solid ${guide.accent}40`,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                fontSize: '36px',
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: `${guide.accent}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {guide.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#ffffff' }}>
                {guide.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
                {guide.tagline}
              </p>
            </div>
          </div>

          {/* 3 Illustrated Steps */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
            {guide.steps.map((s) => (
              <div
                key={s.number}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: guide.accent,
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.number}
                  </span>
                  <span style={{ fontSize: '24px' }}>{s.icon}</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  {s.title}
                </h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Pro Tip & Win Condition */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12.5px',
                color: '#fbbf24',
              }}
            >
              <span style={{ fontSize: '18px' }}>💡</span>
              <div>
                <strong>Pro Strategy:</strong> {guide.proTip}
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12.5px',
                color: '#34d399',
              }}
            >
              <span style={{ fontSize: '18px' }}>🏆</span>
              <div>
                <strong>How to Win:</strong> {guide.winCondition}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button
            onClick={() => {
              soundFx.playClick();
              closeRulesModal();
            }}
            style={{
              padding: '10px 24px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
            }}
          >
            🚀 Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
