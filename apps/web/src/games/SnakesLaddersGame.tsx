import React, { useState, useEffect } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { soundFx } from '../soundEffects';
import { useCelebrationStore } from '../celebrationStore';

interface Player {
  id: string;
  name: string;
  avatar: string;
  position: number;
  color: string;
  isBot: boolean;
}

const SNAKES: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

const LADDERS: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};

export const SnakesLaddersGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice } = useVoiceStore();

  const room = getOrCreateRoom('snakes', 'You (Champion)', 6, 2);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const [players, setPlayers] = useState<Player[]>([]);
  const [turnIdx, setTurnIdx] = useState(0);
  const [dice, setDice] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [log, setLog] = useState<string[]>(['Celestial Ascent match ready at Tile 1! First to 100 claims the summit.']);
  const [lastActionAnimation, setLastActionAnimation] = useState<string | null>(null);

  useEffect(() => {
    if (winner) {
      useCelebrationStore.getState().triggerVictory({
        gameTitle: 'Celestial Ascent (Snakes & Ladders)',
        winnerName: winner.name,
        winnerAvatar: winner.avatar || '👑',
        coinsAwarded: 160,
        xpAwarded: 140,
        reason: `${winner.name} ascended all 100 tiles to conquer the Celestial Summit!`,
      });
    }
  }, [winner]);

  const addLog = (msg: string) => {
    setLog((prev) => [msg, ...prev.slice(0, 15)]);
  };

  const startMatchFromRoom = () => {
    const roomPlayers = room.players.length >= 2 ? room.players : [
      { id: 'p1', name: 'You (Champion)', isBot: false, avatar: '👑', color: '#fbbf24', isHost: true },
      { id: 'p2', name: 'Bot Viper 🐍', isBot: true, avatar: '🐍', color: '#38bdf8', isHost: false },
    ];

    const matchPlayers: Player[] = roomPlayers.map((rp) => ({
      id: rp.id,
      name: rp.name,
      avatar: rp.avatar || '🎲',
      position: 1,
      color: rp.color || '#38bdf8',
      isBot: rp.isBot,
    }));

    setPlayers(matchPlayers);
    connectVoice(matchPlayers.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));

    setTurnIdx(0);
    setDice(null);
    setWinner(null);
    setInLobby(false);
    setLog([`Celestial Ascent launched in room ${room.roomCode}! Expeditions begin at Tile 1.`]);
  };

  const curPlayer = players[turnIdx];

  const rollDice = () => {
    if (isRolling || winner) return;
    setIsRolling(true);
    soundFx.playDiceRoll();

    let rollCount = 0;
    const interval = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount > 8) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDice(finalVal);
        setIsRolling(false);
        applyMove(finalVal);
      }
    }, 55);
  };

  const applyMove = (roll: number) => {
    if (!curPlayer) return;

    let nextPos = curPlayer.position + roll;
    if (nextPos > 100) {
      nextPos = 100 - (nextPos - 100);
      addLog(`${curPlayer.name} overshot 100 and deflected back to tile ${nextPos}!`);
    } else {
      addLog(`${curPlayer.name} rolled ${roll} and advanced to tile ${nextPos}.`);
    }

    if (LADDERS[nextPos]) {
      const up = LADDERS[nextPos];
      setLastActionAnimation(`ladder-${nextPos}`);
      soundFx.playLadderClimb();
      setTimeout(() => setLastActionAnimation(null), 1200);
      addLog(`🪜 GOLDEN LADDER! ${curPlayer.name} rocketed up from ${nextPos} to ${up}!`);
      nextPos = up;
    } else if (SNAKES[nextPos]) {
      const down = SNAKES[nextPos];
      setLastActionAnimation(`snake-${nextPos}`);
      soundFx.playSnakeHiss();
      setTimeout(() => setLastActionAnimation(null), 1200);
      addLog(`🐍 SERPENT'S WRATH! ${curPlayer.name} bit by snake, dropped to tile ${down}!`);
      nextPos = down;
    } else {
      soundFx.playCardFlip();
    }

    setPlayers((prev) =>
      prev.map((p) => (p.id === curPlayer.id ? { ...p, position: nextPos } : p))
    );

    if (nextPos === 100) {
      soundFx.playVictory();
      setWinner(curPlayer);
      addLog(`🏆 ${curPlayer.name} conquered TILE 100 and won!`);
      return;
    }

    setTurnIdx((prev) => (prev + 1) % players.length);
  };

  useEffect(() => {
    if (!winner && curPlayer && curPlayer.isBot && !isRolling && !inLobby) {
      const timer = setTimeout(() => {
        rollDice();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [curPlayer, isRolling, winner, inLobby]);

  const gridTiles: number[] = [];
  for (let row = 9; row >= 0; row--) {
    const rowNumbers = Array.from({ length: 10 }, (_, i) => row * 10 + i + 1);
    if (row % 2 === 1) {
      rowNumbers.reverse();
    }
    gridTiles.push(...rowNumbers);
  }

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="snakes"
        gameTitle="Celestial Ascent (Snakes & Ladders)"
        gameIcon="🐍"
        minPlayers={2}
        maxPlayers={6}
        onStart={startMatchFromRoom}
      />
    );
  }

  return (
    <div
      style={{
        maxWidth: '1140px',
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <VoiceRoomBar gameTitle="Celestial Ascent (Snakes & Ladders)" turnRestricted={false} />

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
            <span>🐍</span>
            <span>Celestial Ascent • 100 Steps</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Current Ascender:{' '}
            <strong style={{ color: curPlayer?.color || '#38bdf8' }}>
              {curPlayer?.name}
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
          🔄 Restart Expedition
        </button>
      </div>

      {/* Main Board & Controller Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* 100-Tile Celestial Path */}
        <div
          className="glass-panel"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '4px',
            background: 'radial-gradient(ellipse at center, #0c1524 0%, #060a12 100%)',
            padding: '14px',
            borderRadius: '24px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85), inset 0 0 50px rgba(6, 182, 212, 0.08)',
          }}
        >
          {gridTiles.map((num) => {
            const hasSnake = !!SNAKES[num];
            const hasLadder = !!LADDERS[num];
            const playersHere = players.filter((p) => p.position === num);

            return (
              <div
                key={num}
                style={{
                  aspectRatio: '1/1',
                  background:
                    num === 100
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.8) 0%, rgba(217, 119, 6, 0.9) 100%)'
                      : hasLadder
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 95, 70, 0.35) 100%)'
                      : hasSnake
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(153, 27, 27, 0.35) 100%)'
                      : (Math.floor((num - 1) / 10) + num) % 2 === 0
                      ? 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(255, 255, 255, 0.02)',
                  border: hasLadder
                    ? '1.5px solid #10b981'
                    : hasSnake
                    ? '1.5px solid #ef4444'
                    : num === 100
                    ? '2px solid #fbbf24'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '3px 5px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: hasLadder
                    ? '0 0 10px rgba(16, 185, 129, 0.25)'
                    : hasSnake
                    ? '0 0 10px rgba(239, 68, 68, 0.25)'
                    : num === 100
                    ? '0 0 18px rgba(245, 158, 11, 0.4)'
                    : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      color: num === 100 ? '#000000' : '#94a3b8',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {num}
                  </span>
                  {hasLadder && (
                    <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 900 }}>
                      🪜↑{LADDERS[num]}
                    </span>
                  )}
                  {hasSnake && (
                    <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 900 }}>
                      🐍↓{SNAKES[num]}
                    </span>
                  )}
                  {num === 100 && (
                    <span style={{ fontSize: '12px' }}>👑</span>
                  )}
                </div>

                {/* Tokens on Tile */}
                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'wrap', zIndex: 2 }}>
                  {playersHere.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: p.color,
                        border: '1.5px solid #ffffff',
                        boxShadow: `0 0 10px ${p.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        animation: 'bouncePeg 0.8s infinite alternate',
                      }}
                      title={p.name}
                    >
                      {p.avatar}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tactical Roller Deck & Standings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 3D Dice Roller Box */}
          <div
            className="glass-panel"
            style={{
              padding: '24px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              background: 'linear-gradient(135deg, rgba(14, 19, 32, 0.85) 0%, rgba(9, 13, 22, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#94a3b8',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Celestial Compass
            </span>

            <div
              onClick={() => {
                if (curPlayer && !curPlayer.isBot && !isRolling && !winner) rollDice();
              }}
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '20px',
                background: curPlayer?.color || '#06b6d4',
                border: '3px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '44px',
                fontWeight: 900,
                color: '#ffffff',
                boxShadow: `0 12px 28px rgba(0,0,0,0.7), 0 0 25px ${curPlayer?.color || '#06b6d4'}66`,
                cursor: curPlayer && !curPlayer.isBot && !isRolling && !winner ? 'pointer' : 'default',
                transform: isRolling ? 'rotate(35deg) scale(0.92)' : 'none',
                transition: 'all 0.12s ease',
              }}
            >
              {dice || '🎲'}
            </div>

            {curPlayer && !curPlayer.isBot && !winner && (
              <button
                onClick={rollDice}
                disabled={isRolling}
                className="btn-primary-glow"
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '14px',
                  background: isRolling
                    ? '#334155'
                    : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  boxShadow: isRolling ? 'none' : '0 6px 20px rgba(6, 182, 212, 0.4)',
                }}
              >
                {isRolling ? 'Rolling...' : 'Roll Celestial Dice 🎲'}
              </button>
            )}

            {winner && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid #f59e0b',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: '#fbbf24',
                  fontSize: '13px',
                  fontWeight: 900,
                }}
              >
                🏆 {winner.name} Conquered the Summit!
              </div>
            )}
          </div>

          {/* Expedition Standings */}
          <div
            className="glass-card"
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
              Expedition Standings
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map((p) => {
                const percent = Math.min(100, Math.round((p.position / 100) * 100));
                return (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12.5px',
                        color: '#f8fafc',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{p.avatar}</span>
                        <span style={{ fontWeight: 700 }}>{p.name}</span>
                      </span>
                      <strong style={{ color: p.color, fontFamily: 'ui-monospace, monospace' }}>
                        Tile {p.position}/100
                      </strong>
                    </div>

                    {/* Progress track */}
                    <div
                      style={{
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: p.color,
                          borderRadius: '2px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expedition Chronicle */}
          <div
            className="glass-card"
            style={{
              padding: '14px 18px',
              fontSize: '12px',
              color: '#94a3b8',
              maxHeight: '160px',
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
              📜 Expedition Chronicle:
            </strong>
            {log.map((entry, i) => (
              <div
                key={i}
                style={{
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
              >
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
