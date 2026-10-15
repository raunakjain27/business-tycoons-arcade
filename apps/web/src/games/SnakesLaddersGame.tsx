import React, { useState, useEffect } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';

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
  const [log, setLog] = useState<string[]>(['Game started on Tile 1! First to 100 wins.']);
  const [lastActionAnimation, setLastActionAnimation] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLog((prev) => [msg, ...prev.slice(0, 15)]);
  };

  const startMatchFromRoom = () => {
    const roomPlayers = room.players.length >= 2 ? room.players : [
      { id: 'p1', name: 'You (Player)', isBot: false, avatar: '👑', color: '#ec4899', isHost: true },
      { id: 'p2', name: 'Bot Viper 🐍', isBot: true, avatar: '🐍', color: '#3b82f6', isHost: false },
    ];

    const matchPlayers: Player[] = roomPlayers.map((rp) => ({
      id: rp.id,
      name: rp.name,
      avatar: rp.avatar || '🎲',
      position: 1,
      color: rp.color,
      isBot: rp.isBot,
    }));

    setPlayers(matchPlayers);
    connectVoice(matchPlayers.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));

    setTurnIdx(0);
    setDice(null);
    setWinner(null);
    setInLobby(false);
    setLog([`Match launched in room ${room.roomCode}! Starting at Tile 1.`]);
  };

  const curPlayer = players[turnIdx];

  const rollDice = () => {
    if (isRolling || winner) return;
    setIsRolling(true);

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
      addLog(`${curPlayer.name} overshot 100 and bounced back to ${nextPos}!`);
    } else {
      addLog(`${curPlayer.name} rolled a ${roll} and reached tile ${nextPos}.`);
    }

    if (LADDERS[nextPos]) {
      const up = LADDERS[nextPos];
      setLastActionAnimation(`ladder-${nextPos}`);
      setTimeout(() => setLastActionAnimation(null), 1200);
      addLog(`🪜 LUCKY JUMP! ${curPlayer.name} rocketed up a ladder from ${nextPos} to ${up}!`);
      nextPos = up;
    }

    if (SNAKES[nextPos]) {
      const down = SNAKES[nextPos];
      setLastActionAnimation(`snake-${nextPos}`);
      setTimeout(() => setLastActionAnimation(null), 1200);
      addLog(`🐍 VENOM STRIKE! Snake bit ${curPlayer.name} sliding down from ${nextPos} to ${down}!`);
      nextPos = down;
    }

    setPlayers((prev) =>
      prev.map((p) => (p.id === curPlayer.id ? { ...p, position: nextPos } : p))
    );

    if (nextPos === 100) {
      setWinner(curPlayer);
      addLog(`🏆 ${curPlayer.name} reached TILE 100 and WON!`);
      return;
    }

    setTurnIdx((prev) => (prev + 1) % players.length);
  };

  useEffect(() => {
    if (!winner && curPlayer && curPlayer.isBot && !isRolling && !inLobby) {
      const timer = setTimeout(() => {
        rollDice();
      }, 1000);
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
        gameTitle="Snakes & Ladders 3D Deluxe"
        gameIcon="🐍"
        minPlayers={2}
        maxPlayers={6}
        bannerGradient="linear-gradient(135deg, #06b6d4 0%, #10b981 100%)"
        onStart={startMatchFromRoom}
      />
    );
  }

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Voice Room Bar */}
      <VoiceRoomBar gameTitle="Snakes & Ladders 3D Deluxe" turnRestricted={false} />

      {/* Top Header */}
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
            <span>🐍</span> Snakes & Ladders 3D Deluxe
          </h2>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Current Turn: <strong style={{ color: curPlayer?.color }}>{curPlayer?.name}</strong>
          </span>
        </div>

        <button
          onClick={startMatchFromRoom}
          style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '12px',
            boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)',
          }}
        >
          Restart Match
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 280px', gap: '24px', alignItems: 'start' }}>
        {/* Vibrant 3D Board Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '4px',
            background: 'linear-gradient(135deg, #0c1222 0%, #050811 100%)',
            padding: '14px',
            borderRadius: '24px',
            border: '3px solid #1e293b',
            boxShadow: '0 30px 80px rgba(0,0,0,0.85), inset 0 0 50px rgba(6, 182, 212, 0.1)',
          }}
        >
          {gridTiles.map((num) => {
            const hasSnake = !!SNAKES[num];
            const hasLadder = !!LADDERS[num];
            const playersHere = players.filter((p) => p.position === num);
            const isDestination = Object.values(LADDERS).includes(num) || Object.values(SNAKES).includes(num);

            return (
              <div
                key={num}
                style={{
                  aspectRatio: '1/1',
                  background:
                    num === 100
                      ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
                      : hasLadder
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(6, 95, 70, 0.4) 100%)'
                      : hasSnake
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(153, 27, 27, 0.4) 100%)'
                      : (Math.floor((num - 1) / 10) + num) % 2 === 0
                      ? '#1e293b'
                      : '#0f172a',
                  border: hasLadder
                    ? '2px solid #10b981'
                    : hasSnake
                    ? '2px solid #ef4444'
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '3px 4px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: hasLadder ? '0 0 10px rgba(16, 185, 129, 0.3)' : hasSnake ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: num === 100 ? '#000' : '#cbd5e1' }}>
                    {num}
                  </span>
                  {hasLadder && (
                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 900 }}>
                      🪜↑{LADDERS[num]}
                    </span>
                  )}
                  {hasSnake && (
                    <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 900 }}>
                      🐍↓{SNAKES[num]}
                    </span>
                  )}
                </div>

                {/* 3D Pegs on Tile */}
                <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap', zIndex: 2 }}>
                  {playersHere.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: p.color,
                        border: '2px solid #fff',
                        boxShadow: `0 0 12px ${p.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        animation: 'bounce 0.7s infinite alternate',
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

        {/* Dice Arena Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'rgba(30, 24, 55, 0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '24px',
              padding: '28px 18px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
            }}
          >
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              3D ROLLER ARENA
            </span>

            <div
              onClick={() => {
                if (curPlayer && !curPlayer.isBot && !isRolling && !winner) rollDice();
              }}
              style={{
                width: '92px',
                height: '92px',
                borderRadius: '24px',
                background: curPlayer?.color || '#06b6d4',
                border: '3px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '46px',
                fontWeight: 900,
                color: '#ffffff',
                boxShadow: `0 15px 30px rgba(0,0,0,0.7), 0 0 25px ${curPlayer?.color || '#06b6d4'}66`,
                cursor: curPlayer && !curPlayer.isBot && !isRolling && !winner ? 'pointer' : 'default',
                transform: isRolling ? 'rotate(35deg) scale(0.9)' : 'none',
                transition: 'all 0.1s ease',
              }}
            >
              {dice || '🎲'}
            </div>

            {curPlayer && !curPlayer.isBot && !winner && (
              <button
                onClick={rollDice}
                disabled={isRolling}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: isRolling ? '#475569' : 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '15px',
                  cursor: isRolling ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 18px rgba(6, 182, 212, 0.4)',
                }}
              >
                {isRolling ? 'Rolling...' : 'Roll 3D Dice!'}
              </button>
            )}

            {winner && (
              <div style={{ background: '#eab30822', border: '1px solid #eab308', padding: '14px', borderRadius: '12px', color: '#fde047', fontSize: '14px', fontWeight: 900 }}>
                🏆 {winner.name} Reached 100!
              </div>
            )}
          </div>

          {/* Standings */}
          <div style={{ background: 'rgba(30, 24, 55, 0.85)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '18px' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#c084fc', display: 'block', marginBottom: '12px' }}>
              LEADERBOARD
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#f8fafc', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{p.avatar}</span>
                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                  </span>
                  <strong style={{ color: '#38bdf8' }}>Tile {p.position}/100</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Match events */}
          <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '20px', padding: '16px', fontSize: '12px', color: '#94a3b8', maxHeight: '180px', overflowY: 'auto' }}>
            <strong style={{ color: '#06b6d4', display: 'block', marginBottom: '8px' }}>Match Events:</strong>
            {log.map((entry, i) => (
              <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
