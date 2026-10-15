import React, { useState } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';

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
  const [log, setLog] = useState<string[]>(['Match started! Select a card and click the matching board square.']);

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
    setLog([`Sequence match launched in room ${room.roomCode}! Connect 5 chips in a row.`]);
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
      addLog(`This square is already occupied by a ${cell.chip.toUpperCase()} chip!`);
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
      }, 1000);
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
        gameTitle="Sequence Masters Deluxe"
        gameIcon="🎯"
        minPlayers={2}
        maxPlayers={6}
        bannerGradient="linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)"
        onStart={startMatchFromRoom}
      />
    );
  }

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Voice Room Bar */}
      <VoiceRoomBar gameTitle="Sequence Masters Deluxe" turnRestricted={false} />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          padding: '14px 24px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <button
          onClick={() => setInLobby(true)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#cbd5e1',
            padding: '8px 16px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '12px',
          }}
        >
          ⚙️ Room Lobby ({room.roomCode})
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <span>🎯</span> Sequence Masters Deluxe
          </h2>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Turn:{' '}
            <strong style={{ color: currentTurn === 'blue' ? '#3b82f6' : '#10b981' }}>
              {currentTurn === 'blue' ? 'Your Turn (Blue Chips)' : 'Opponent Turn (Green Chips)'}
            </strong>
          </span>
        </div>

        <button
          onClick={startMatchFromRoom}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '12px',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
          }}
        >
          Restart Match
        </button>
      </div>

      {/* Main Grid & Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 280px', gap: '24px', alignItems: 'start' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '3px',
            background: '#090d16',
            padding: '12px',
            borderRadius: '24px',
            border: '2px solid rgba(255,255,255,0.12)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.85)',
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
                    background: isCorner ? '#312e81' : '#1e293b',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: cell.chip ? 'default' : 'pointer',
                    position: 'relative',
                    border: '1px solid rgba(255,255,255,0.06)',
                    transform: 'translateZ(0)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isCorner ? (
                    <span style={{ fontSize: '16px', color: '#eab308' }}>★</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: '#f8fafc' }}>{cell.rank}</span>
                      <span style={{ fontSize: '12px', color: isRed ? '#ef4444' : '#94a3b8' }}>{cell.suit}</span>
                    </div>
                  )}

                  {cell.chip && (
                    <div
                      style={{
                        position: 'absolute',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: cell.chip === 'blue' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                        border: '2px solid #ffffff',
                        boxShadow: `0 0 12px ${cell.chip === 'blue' ? '#3b82f6' : '#10b981'}`,
                        animation: 'bounce 0.4s ease',
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Player Hand & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(30, 24, 55, 0.85)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '18px' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#c084fc', display: 'block', marginBottom: '12px' }}>
              YOUR CARDS (Click to Select)
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
                      background: isSelected ? 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)' : '#1e1b4b',
                      border: isSelected ? '2px solid #a5b4fc' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      padding: '14px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transform: isSelected ? 'scale(1.08)' : 'none',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 10px 20px rgba(99, 102, 241, 0.5)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>{card.rank}</span>
                    <span style={{ fontSize: '20px', color: isRed ? '#ef4444' : '#cbd5e1' }}>{card.suit}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {winner && (
            <div style={{ background: '#22c55e22', border: '1px solid #22c55e', padding: '16px', borderRadius: '14px', color: '#4ade80', textAlign: 'center', fontWeight: 900 }}>
              🏆 {winner === 'blue' ? 'YOU WON!' : 'OPPONENT WON!'} 5-in-a-row Sequence!
            </div>
          )}

          <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '20px', padding: '16px', fontSize: '12px', color: '#94a3b8', maxHeight: '180px', overflowY: 'auto' }}>
            <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '8px' }}>Action Log:</strong>
            {log.map((item, i) => (
              <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
