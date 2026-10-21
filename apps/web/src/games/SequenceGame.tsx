import React, { useState } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { useCelebrationStore } from '../celebrationStore';

type Chip = 'blue' | 'green' | null;

interface SequenceCell {
  suit: '♠' | '♥' | '♦' | '♣' | '★';
  rank: string;
  chip: Chip;
}

const BASE_LAYOUT: { rank: string; suit: '♠' | '♥' | '♦' | '♣' | '★' }[][] = [
  [{ rank: '★', suit: '★' }, { rank: '2', suit: '♠' }, { rank: '3', suit: '♠' }, { rank: '4', suit: '♠' }, { rank: '5', suit: '♠' }, { rank: '6', suit: '♠' }, { rank: '7', suit: '♠' }, { rank: '8', suit: '♠' }, { rank: '9', suit: '♠' }, { rank: '★', suit: '★' }],
  [{ rank: '6', suit: '♣' }, { rank: '5', suit: '♣' }, { rank: '4', suit: '♣' }, { rank: '3', suit: '♣' }, { rank: '2', suit: '♣' }, { rank: 'A', suit: '♥' }, { rank: 'K', suit: '♥' }, { rank: 'Q', suit: '♥' }, { rank: '10', suit: '♥' }, { rank: '10', suit: '♠' }],
  [{ rank: '7', suit: '♣' }, { rank: 'A', suit: '♠' }, { rank: '2', suit: '♦' }, { rank: '3', suit: '♦' }, { rank: '4', suit: '♦' }, { rank: '5', suit: '♦' }, { rank: '6', suit: '♦' }, { rank: '7', suit: '♦' }, { rank: '9', suit: '♥' }, { rank: 'Q', suit: '♠' }],
  [{ rank: '8', suit: '♣' }, { rank: 'K', suit: '♠' }, { rank: '6', suit: '♣' }, { rank: '5', suit: '♣' }, { rank: '4', suit: '♣' }, { rank: '3', suit: '♣' }, { rank: '2', suit: '♣' }, { rank: '8', suit: '♦' }, { rank: '8', suit: '♥' }, { rank: 'K', suit: '♠' }],
  [{ rank: '9', suit: '♣' }, { rank: 'Q', suit: '♠' }, { rank: '7', suit: '♣' }, { rank: '6', suit: '♥' }, { rank: '5', suit: '♥' }, { rank: '4', suit: '♥' }, { rank: 'A', suit: '♥' }, { rank: '9', suit: '♦' }, { rank: '7', suit: '♥' }, { rank: 'A', suit: '♠' }],
  [{ rank: '10', suit: '♣' }, { rank: '10', suit: '♠' }, { rank: '8', suit: '♣' }, { rank: '7', suit: '♥' }, { rank: '2', suit: '♥' }, { rank: '3', suit: '♥' }, { rank: 'K', suit: '♥' }, { rank: '10', suit: '♦' }, { rank: '6', suit: '♥' }, { rank: '2', suit: '♦' }],
  [{ rank: 'Q', suit: '♣' }, { rank: '9', suit: '♠' }, { rank: '9', suit: '♣' }, { rank: '8', suit: '♥' }, { rank: '9', suit: '♥' }, { rank: '10', suit: '♥' }, { rank: 'Q', suit: '♥' }, { rank: 'Q', suit: '♦' }, { rank: '5', suit: '♥' }, { rank: '3', suit: '♦' }],
  [{ rank: 'K', suit: '♣' }, { rank: '8', suit: '♠' }, { rank: '10', suit: '♣' }, { rank: 'Q', suit: '♣' }, { rank: 'K', suit: '♣' }, { rank: 'A', suit: '♣' }, { rank: 'A', suit: '♦' }, { rank: 'K', suit: '♦' }, { rank: '4', suit: '♥' }, { rank: '4', suit: '♦' }],
  [{ rank: 'A', suit: '♣' }, { rank: '7', suit: '♠' }, { rank: '6', suit: '♠' }, { rank: '5', suit: '♠' }, { rank: '4', suit: '♠' }, { rank: '3', suit: '♠' }, { rank: '2', suit: '♠' }, { rank: '2', suit: '♥' }, { rank: '3', suit: '♥' }, { rank: '5', suit: '♦' }],
  [{ rank: '★', suit: '★' }, { rank: 'A', suit: '♦' }, { rank: 'K', suit: '♦' }, { rank: 'Q', suit: '♦' }, { rank: '10', suit: '♦' }, { rank: '9', suit: '♦' }, { rank: '8', suit: '♦' }, { rank: '7', suit: '♦' }, { rank: '6', suit: '♦' }, { rank: '★', suit: '★' }],
];

interface HandCard {
  id: string;
  rank: string;
  suit: '♠' | '♥' | '♦' | '♣';
}

function generateRandomHand(): HandCard[] {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Q', 'K', 'A'];
  const suits: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
  const hand: HandCard[] = [];
  for (let i = 0; i < 6; i++) {
    const r = ranks[Math.floor(Math.random() * ranks.length)];
    const s = suits[Math.floor(Math.random() * suits.length)];
    hand.push({ id: `c-${i}-${Date.now()}-${Math.random()}`, rank: r, suit: s });
  }
  return hand;
}

export const SequenceGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice } = useVoiceStore();

  const room = getOrCreateRoom('sequence', 'You (Blue)', 6, 2);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const [board, setBoard] = useState<SequenceCell[][]>(() =>
    BASE_LAYOUT.map((row) => row.map((cell) => ({ ...cell, chip: null })))
  );
  const [hand, setHand] = useState<HandCard[]>(generateRandomHand);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(0);
  const [currentTurn, setCurrentTurn] = useState<'blue' | 'green'>('blue');
  const [winner, setWinner] = useState<'blue' | 'green' | null>(null);
  const [log, setLog] = useState<string[]>(['Grandmaster Sequence match initialized! Connect 5 chips in a row.']);

  const addLog = (msg: string) => {
    setLog((prev) => [msg, ...prev.slice(0, 10)]);
  };

  const startMatchFromRoom = () => {
    setBoard(BASE_LAYOUT.map((row) => row.map((cell) => ({ ...cell, chip: null }))));
    setHand(generateRandomHand());
    connectVoice(room.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));

    setSelectedCardIdx(0);
    setCurrentTurn('blue');
    setWinner(null);
    setInLobby(false);
    setLog([`Sequence match launched in room ${room.roomCode}! Align 5 chips horizontally, vertically, or diagonally.`]);
  };

  const handleCellClick = (r: number, c: number) => {
    if (winner || currentTurn !== 'blue') return;
    if (selectedCardIdx === null) return;

    const cell = board[r][c];
    const card = hand[selectedCardIdx];

    const isCorner = cell.rank === '★';
    const isMatch = cell.rank === card.rank && cell.suit === card.suit;

    if (!isCorner && !isMatch) {
      addLog(`Selected card (${card.rank}${card.suit}) does not match this square!`);
      return;
    }

    if (cell.chip !== null) {
      addLog(`This square is already claimed by a ${cell.chip.toUpperCase()} chip!`);
      return;
    }

    placeChip(r, c, 'blue');

    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Q', 'K', 'A'];
    const suits: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
    const newCard: HandCard = {
      id: `c-new-${Date.now()}-${Math.random()}`,
      rank: ranks[Math.floor(Math.random() * ranks.length)],
      suit: suits[Math.floor(Math.random() * suits.length)],
    };

    const newHand = [...hand];
    newHand[selectedCardIdx] = newCard;
    setHand(newHand);
    setSelectedCardIdx(0);

    setCurrentTurn('green');
    if (room.allowBots || room.players.length === 1) {
      setTimeout(() => {
        botPlayTurn();
      }, 2000);
    }
  };

  const placeChip = (r: number, c: number, color: 'blue' | 'green') => {
    const newBoard = board.map((row, ri) =>
      row.map((col, ci) => (ri === r && ci === c ? { ...col, chip: color } : col))
    );
    setBoard(newBoard);
    addLog(`${color === 'blue' ? 'You' : 'Opponent'} placed a ${color.toUpperCase()} chip at [${r + 1}, ${c + 1}].`);

    if (checkSequenceWin(newBoard, color)) {
      setWinner(color);
      useCelebrationStore.getState().triggerVictory({
        gameTitle: 'Sequence Masters Deluxe',
        winnerName: color === 'blue' ? 'You (Blue)' : 'Opponent (Green)',
        winnerAvatar: color === 'blue' ? '👑' : '🤖',
        coinsAwarded: 180,
        xpAwarded: 200,
        reason: `${color === 'blue' ? 'You' : 'Opponent'} aligned 5 consecutive chips in a winning Sequence!`,
      });
      addLog(`🏆 ${color === 'blue' ? 'YOU WON' : 'OPPONENT WON'} with a 5-in-a-row Sequence!`);
    }
  };

  const botPlayTurn = () => {
    const emptySpots: { r: number; c: number }[] = [];
    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell.chip && cell.rank !== '★') {
          emptySpots.push({ r, c });
        }
      });
    });

    if (emptySpots.length > 0) {
      const chosen = emptySpots[Math.floor(Math.random() * emptySpots.length)];
      placeChip(chosen.r, chosen.c, 'green');
    }
    setCurrentTurn('blue');
  };

  const checkSequenceWin = (b: SequenceCell[][], color: 'blue' | 'green'): boolean => {
    const isChipValid = (r: number, c: number) => {
      const cell = b[r][c];
      return cell.chip === color || cell.rank === '★';
    };

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c <= 5; c++) {
        if ([0, 1, 2, 3, 4].every((i) => isChipValid(r, c + i))) return true;
      }
    }
    for (let c = 0; c < 10; c++) {
      for (let r = 0; r <= 5; r++) {
        if ([0, 1, 2, 3, 4].every((i) => isChipValid(r + i, c))) return true;
      }
    }
    for (let r = 0; r <= 5; r++) {
      for (let c = 0; c <= 5; c++) {
        if ([0, 1, 2, 3, 4].every((i) => isChipValid(r + i, c + i))) return true;
      }
    }
    for (let r = 4; r < 10; r++) {
      for (let c = 0; c <= 5; c++) {
        if ([0, 1, 2, 3, 4].every((i) => isChipValid(r - i, c + i))) return true;
      }
    }
    return false;
  };

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="sequence"
        gameTitle="The Grandmaster's Sequence"
        gameIcon="🎯"
        minPlayers={2}
        maxPlayers={6}
        onStart={startMatchFromRoom}
      />
    );
  }

  return (
    <div
      style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <VoiceRoomBar gameTitle="The Grandmaster's Sequence" turnRestricted={false} />

      {/* Top Header Strip */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          background: 'rgba(12, 17, 28, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          onClick={() => setInLobby(true)}
          className="btn-tactile-secondary"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
          }}
        >
          ⚙️ Salon Lobby ({room.roomCode})
        </button>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 900,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>🎯</span>
            <span>The Grandmaster's Sequence</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Turn:{' '}
            <strong style={{ color: currentTurn === 'blue' ? '#38bdf8' : '#34d399' }}>
              {currentTurn === 'blue' ? 'Your Move (Cobalt Chips)' : 'Opponent Move (Emerald Chips)'}
            </strong>
          </div>
        </div>

        <button
          onClick={startMatchFromRoom}
          className="btn-tactile-secondary"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            color: '#38bdf8',
            borderColor: 'rgba(56, 189, 248, 0.3)',
          }}
        >
          🔄 Restart Board
        </button>
      </div>

      {/* Main Grid & Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 1fr) 300px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* 10x10 Card Mosaic Board */}
        <div
          className="glass-panel"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '3px',
            background: 'radial-gradient(ellipse at center, #0e1628 0%, #060912 100%)',
            padding: '12px',
            borderRadius: '24px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isCorner = cell.rank === '★';
              const isRed = cell.suit === '♥' || cell.suit === '♦';

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  style={{
                    aspectRatio: '1/1',
                    background: isCorner
                      ? 'radial-gradient(circle, #312e81 0%, #1e1b4b 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: cell.chip ? 'default' : 'pointer',
                    position: 'relative',
                    border: isCorner
                      ? '1px solid #fbbf24'
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isCorner ? (
                    <span style={{ fontSize: '15px', color: '#fbbf24' }}>★</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: '#f8fafc' }}>{cell.rank}</span>
                      <span style={{ fontSize: '12px', color: isRed ? '#ef4444' : '#94a3b8' }}>{cell.suit}</span>
                    </div>
                  )}

                  {/* 3D Casino Chip */}
                  {cell.chip && (
                    <div
                      style={{
                        position: 'absolute',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background:
                          cell.chip === 'blue'
                            ? 'radial-gradient(circle at 35% 35%, #60a5fa 0%, #1d4ed8 70%, #0c1c4f 100%)'
                            : 'radial-gradient(circle at 35% 35%, #34d399 0%, #059669 70%, #042f2c 100%)',
                        border: '2px solid #ffffff',
                        boxShadow: `0 0 14px ${cell.chip === 'blue' ? '#38bdf8' : '#34d399'}, 0 4px 8px rgba(0,0,0,0.7)`,
                        animation: 'bouncePeg 0.4s ease',
                      }}
                    />
                  )}
                </div>
              );
            }),
          )}
        </div>

        {/* Player Hand & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="glass-panel"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#fbbf24',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Your Playing Hand (Select One)
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {hand.map((card, idx) => {
                const isSelected = selectedCardIdx === idx;
                const isRed = card.suit === '♥' || card.suit === '♦';
                return (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCardIdx(idx)}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(30, 58, 138, 0.4) 100%)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected
                        ? '2px solid #38bdf8'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '14px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transform: isSelected ? 'scale(1.06) translateY(-4px)' : 'none',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 10px 24px rgba(56, 189, 248, 0.35)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>{card.rank}</span>
                    <span style={{ fontSize: '20px', color: isRed ? '#ef4444' : '#cbd5e1' }}>{card.suit}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {winner && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1.5px solid #10b981',
                padding: '16px',
                borderRadius: '14px',
                color: '#34d399',
                textAlign: 'center',
                fontWeight: 900,
                fontSize: '14px',
              }}
            >
              🏆 {winner === 'blue' ? 'YOU WON!' : 'OPPONENT WON!'} 5-in-a-Row Sequence!
            </div>
          )}

          {/* Action Log */}
          <div
            className="glass-card"
            style={{
              padding: '14px 18px',
              fontSize: '12px',
              color: '#94a3b8',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            <strong
              style={{
                color: '#38bdf8',
                display: 'block',
                marginBottom: '8px',
                fontSize: '11px',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              📜 Table Chronicle:
            </strong>
            {log.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
