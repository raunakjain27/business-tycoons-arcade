import React, { useState, useEffect } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { soundFx } from '../soundEffects';
import { useCelebrationStore } from '../celebrationStore';

interface BingoCardCell {
  num: number | 'FREE';
  marked: boolean;
}

interface BingoPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  grid: BingoCardCell[][];
  completedLines: number;
  hasWonBingo: boolean;
}

const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

const BINGO_RANGES: Record<string, [number, number]> = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

function generateClassicBingoGrid(): BingoCardCell[][] {
  const grid: BingoCardCell[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => ({ num: 0, marked: false }))
  );

  BINGO_LETTERS.forEach((letter, colIdx) => {
    const [min, max] = BINGO_RANGES[letter];
    const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i).sort(() => 0.5 - Math.random());
    for (let rowIdx = 0; rowIdx < 5; rowIdx++) {
      if (colIdx === 2 && rowIdx === 2) {
        grid[rowIdx][colIdx] = { num: 'FREE', marked: true };
      } else {
        grid[rowIdx][colIdx] = { num: pool[rowIdx], marked: false };
      }
    }
  });

  return grid;
}

export const BingoGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice } = useVoiceStore();

  const room = getOrCreateRoom('bingo', 'You (Card #1)', 8, 2);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const [players, setPlayers] = useState<BingoPlayer[]>([]);
  const [calledBalls, setCalledBalls] = useState<{ letter: string; num: number }[]>([]);
  const [currentBall, setCurrentBall] = useState<{ letter: string; num: number } | null>(null);
  const [isAutoCalling, setIsAutoCalling] = useState(false);
  const [winner, setWinner] = useState<BingoPlayer | null>(null);
  const [log, setLog] = useState<string[]>(['Classic 5x5 BINGO 75 match ready! Form 5 in a row to win.']);

  useEffect(() => {
    if (winner) {
      useCelebrationStore.getState().triggerVictory({
        gameTitle: 'Bingo 75 Champions',
        winnerName: winner.name,
        winnerAvatar: winner.avatar || '👑',
        coinsAwarded: 200,
        xpAwarded: 160,
        reason: `${winner.name} completed the winning line and shouted BINGO!`,
      });
    }
  }, [winner]);

  const addLog = (msg: string) => {
    setLog((prev) => [msg, ...prev.slice(0, 19)]);
  };

  const startMatchFromRoom = () => {
    const participantList = [...room.players];
    while (participantList.length < 4 && room.allowBots) {
      const idx = participantList.length;
      participantList.push({
        id: `bot-${idx}`,
        name: `Bingo Bot ${idx} 🤖`,
        isBot: true,
        avatar: '🤖',
        isHost: false,
        color: '#38bdf8',
      });
    }

    const builtPlayers: BingoPlayer[] = participantList.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isBot: p.isBot,
      grid: generateClassicBingoGrid(),
      completedLines: 0,
      hasWonBingo: false,
    }));

    setPlayers(builtPlayers);
    setCalledBalls([]);
    setCurrentBall(null);
    setWinner(null);
    setInLobby(false);
    room.isGameStarted = true;

    connectVoice(participantList.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    addLog('🎱 Cards distributed! Center FREE space is automatically dabbed. Caller ready!');
  };

  const callNextBall = () => {
    if (calledBalls.length >= 75 || winner) return;

    const drawnNums = calledBalls.map((b) => b.num);
    const available = Array.from({ length: 75 }, (_, i) => i + 1).filter((n) => !drawnNums.includes(n));
    const pickedNum = available[Math.floor(Math.random() * available.length)];

    let letter = 'B';
    if (pickedNum <= 15) letter = 'B';
    else if (pickedNum <= 30) letter = 'I';
    else if (pickedNum <= 45) letter = 'N';
    else if (pickedNum <= 60) letter = 'G';
    else letter = 'O';

    const newBall = { letter, num: pickedNum };
    soundFx.playCardFlip();
    setCurrentBall(newBall);
    setCalledBalls((prev) => [newBall, ...prev]);
    addLog(`📢 Ball Drawn: [ ${letter}-${pickedNum} ]`);

    setPlayers((prev) =>
      prev.map((player) => {
        if (!player.isBot) return player;
        const newGrid = player.grid.map((row) =>
          row.map((cell) => (cell.num === pickedNum ? { ...cell, marked: true } : cell))
        );
        return { ...player, grid: newGrid };
      })
    );
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isAutoCalling && !inLobby && !winner && calledBalls.length < 75) {
      timer = setInterval(() => {
        callNextBall();
      }, 4000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoCalling, inLobby, winner, calledBalls]);

  const countBingoLines = (grid: BingoCardCell[][]): number => {
    let lines = 0;
    for (let r = 0; r < 5; r++) {
      if (grid[r].every((c) => c.marked)) lines++;
    }
    for (let c = 0; c < 5; c++) {
      if (grid.every((row) => row[c].marked)) lines++;
    }
    if ([0, 1, 2, 3, 4].every((i) => grid[i][i].marked)) lines++;
    if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i].marked)) lines++;
    return lines;
  };

  const toggleMarkCell = (rowIdx: number, colIdx: number) => {
    const myPlayer = players[0];
    if (!myPlayer || winner) return;

    const cell = myPlayer.grid[rowIdx][colIdx];
    if (cell.num === 'FREE') return;

    const isBallDrawn = typeof cell.num === 'number' && calledBalls.some((b) => b.num === cell.num);
    if (!isBallDrawn) {
      soundFx.playSnakeHiss();
      soundFx.vibrate([40, 40]);
      addLog(`⚠️ B-${cell.num} has not been called yet! Only called numbers may be dabbed.`);
      return;
    }

    soundFx.playCardSpecial();
    soundFx.vibrate(25);
    const newGrid = myPlayer.grid.map((r, rI) =>
      r.map((c, cI) => (rI === rowIdx && cI === colIdx ? { ...c, marked: !c.marked } : c))
    );

    const lines = countBingoLines(newGrid);

    setPlayers((prev) => prev.map((p, idx) => (idx === 0 ? { ...p, grid: newGrid, completedLines: lines } : p)));

    const isCorners = [0, 4].every((r) => [0, 4].every((c) => newGrid[r][c].marked));
    const isBlackout = newGrid.every((row) => row.every((c) => c.marked));

    if ((lines >= 1 || isCorners || isBlackout) && !winner) {
      soundFx.playVictory();
      soundFx.playCashRegister();
      soundFx.vibrate([100, 50, 100, 50, 200]);
      setWinner(myPlayer);
      setIsAutoCalling(false);
      const patternName = isBlackout ? 'FULL CARD BLACKOUT' : isCorners ? 'FOUR CORNERS' : 'LINE BINGO';
      addLog(`🏆 BINGO VICTORY! ${myPlayer.name} completed [ ${patternName} ] and won the match!`);
    }
  };

  const handleClaimBingo = () => {
    const myPlayer = players[0];
    if (!myPlayer || winner) return;

    const lines = countBingoLines(myPlayer.grid);
    if (lines >= 1) {
      soundFx.playVictory();
      soundFx.playCashRegister();
      setWinner(myPlayer);
      setIsAutoCalling(false);
      addLog(`🏆 BINGO VICTORY! ${myPlayer.name} formed ${lines} lines and claimed the jackpot!`);
    } else {
      soundFx.playSnakeHiss();
      addLog(`❌ INVALID BINGO! You must complete at least 1 full row, column, or diagonal line!`);
    }
  };

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="bingo"
        gameTitle="Monte Carlo Bingo 75"
        gameIcon="🎱"
        minPlayers={2}
        maxPlayers={12}
        onStart={startMatchFromRoom}
      />
    );
  }

  const myPlayer = players[0];
  const myCompletedLines = myPlayer ? countBingoLines(myPlayer.grid) : 0;

  return (
    <div
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <VoiceRoomBar gameTitle="Monte Carlo Bingo 75" turnRestricted={false} />

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
            <span>🎱</span>
            <span>Monte Carlo Bingo 75</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            <span>{calledBalls.length} / 75 Drawn</span> •{' '}
            <strong style={{ color: myCompletedLines > 0 ? '#34d399' : '#fbbf24' }}>
              {myCompletedLines} Lines Completed
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setIsAutoCalling(!isAutoCalling)}
            className="btn-tactile-secondary"
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              color: isAutoCalling ? '#fb7185' : '#34d399',
              borderColor: isAutoCalling ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)',
            }}
          >
            {isAutoCalling ? '⏸ Pause Calling' : '▶ Auto-Draw'}
          </button>

          <button
            onClick={callNextBall}
            disabled={isAutoCalling || winner !== null}
            className="btn-primary-glow"
            style={{
              padding: '7px 18px',
              fontSize: '12px',
              background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
              boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)',
            }}
          >
            🎱 Draw Next
          </button>
        </div>
      </div>

      {/* Main Play Area */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) 360px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: 3D Drawn Ball Crucible & 5x5 Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Drawn Ball Crucible Banner */}
          <div
            className="glass-panel"
            style={{
              padding: '20px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(14, 19, 32, 0.85) 0%, rgba(9, 13, 22, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* 3D Metallic Ball */}
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #60a5fa 0%, #1d4ed8 60%, #0a1840 100%)',
                  border: '3px solid rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.7), 0 0 25px rgba(59, 130, 246, 0.5)',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 900, opacity: 0.85, letterSpacing: '1px' }}>
                  {currentBall ? currentBall.letter : 'BINGO'}
                </span>
                <span style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1, fontFamily: 'ui-monospace, monospace' }}>
                  {currentBall ? currentBall.num : '--'}
                </span>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#38bdf8',
                    letterSpacing: '1px',
                  }}
                >
                  Last Drawn Number
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>
                  {currentBall ? `${currentBall.letter} - ${currentBall.num}` : 'Press "Draw Next"'}
                </h3>
                <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                  Center FREE space dabbed automatically.
                </span>
              </div>
            </div>

            <button
              onClick={handleClaimBingo}
              disabled={winner !== null}
              className="btn-primary-glow"
              style={{
                padding: '14px 28px',
                fontSize: '15px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.45)',
              }}
            >
              🎉 SHOUT BINGO!
            </button>
          </div>

          {/* 5x5 BINGO CARD */}
          {myPlayer && (
            <div
              className="glass-panel"
              style={{
                background: 'radial-gradient(ellipse at center, #0f182c 0%, #080d19 100%)',
                borderRadius: '24px',
                border: '2px solid rgba(56, 189, 248, 0.4)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🎟️</span>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#f8fafc' }}>
                    Salon Ticket #BG-{myPlayer.id.substring(0, 6).toUpperCase()}
                  </span>
                </div>

                <div
                  style={{
                    background: myCompletedLines > 0 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(56, 189, 248, 0.12)',
                    border: myCompletedLines > 0 ? '1px solid #10b981' : '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: myCompletedLines > 0 ? '#34d399' : '#38bdf8',
                  }}
                >
                  {myCompletedLines > 0 ? `🎉 ${myCompletedLines} Line(s) Connected!` : '🎯 Form 5 in a Row'}
                </div>
              </div>

              {/* B-I-N-G-O Header Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center' }}>
                {BINGO_LETTERS.map((l) => (
                  <div
                    key={l}
                    style={{
                      background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                      color: '#ffffff',
                      padding: '10px 0',
                      borderRadius: '12px',
                      fontSize: '22px',
                      fontWeight: 900,
                      boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)',
                      letterSpacing: '1px',
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>

              {/* 5x5 Grid Cells */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: 'repeat(5, 1fr)',
                  gap: '8px',
                  background: 'rgba(5, 10, 20, 0.7)',
                  padding: '12px',
                  borderRadius: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {myPlayer.grid.map((row, rIdx) => (
                  <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {row.map((cell, cIdx) => {
                      const isFree = cell.num === 'FREE';
                      const isDrawn = typeof cell.num === 'number' && calledBalls.some((b) => b.num === cell.num);

                      return (
                        <button
                          key={cIdx}
                          onClick={() => toggleMarkCell(rIdx, cIdx)}
                          style={{
                            aspectRatio: '1 / 1',
                            borderRadius: '12px',
                            border: cell.marked
                              ? '2px solid #34d399'
                              : isDrawn
                              ? '2px solid #38bdf8'
                              : '1px solid rgba(255,255,255,0.08)',
                            background: cell.marked
                              ? 'radial-gradient(circle, #059669 0%, #064e3b 100%)'
                              : isDrawn
                              ? 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(2, 132, 199, 0.15) 100%)'
                              : isFree
                              ? 'radial-gradient(circle, #d97706 0%, #78350f 100%)'
                              : 'rgba(255, 255, 255, 0.03)',
                            color: '#ffffff',
                            fontSize: isFree ? '12px' : '19px',
                            fontWeight: 900,
                            cursor: isFree ? 'default' : 'pointer',
                            display: 'flex',
                            position: 'relative',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: cell.marked
                              ? '0 0 16px rgba(52, 211, 153, 0.5), inset 0 0 8px rgba(255,255,255,0.3)'
                              : isDrawn
                              ? '0 0 12px rgba(56, 189, 248, 0.4)'
                              : isFree
                              ? '0 0 14px rgba(245, 158, 11, 0.5)'
                              : 'none',
                            transform: cell.marked ? 'scale(0.98)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {cell.num}
                          {isFree ? (
                            <span style={{ fontSize: '9px', color: '#fde68a', fontWeight: 800 }}>★ FREE</span>
                          ) : cell.marked ? (
                            <span style={{ position: 'absolute', top: '3px', right: '4px', fontSize: '10px', color: '#a7f3d0' }}>
                              ✓
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: 75 Caller Master Board & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Master 75-Ball Board */}
          <div
            className="glass-card"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#38bdf8',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Master 75-Ball Board
            </span>

            {BINGO_LETTERS.map((letter) => {
              const [min, max] = BINGO_RANGES[letter];
              const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);

              return (
                <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: '#1d4ed8',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {letter}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: '2px', flex: 1 }}>
                    {nums.map((n) => {
                      const isCalled = calledBalls.some((b) => b.num === n);
                      const isLatest = currentBall?.num === n;
                      return (
                        <div
                          key={n}
                          style={{
                            aspectRatio: '1/1',
                            borderRadius: '3px',
                            background: isLatest
                              ? '#f59e0b'
                              : isCalled
                              ? '#10b981'
                              : 'rgba(255,255,255,0.04)',
                            color: isLatest || isCalled ? '#ffffff' : '#475569',
                            fontSize: '9px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {n}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Winner Banner */}
          {winner && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)',
                border: '1.5px solid #10b981',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ fontSize: '32px' }}>👑</div>
              <h3 style={{ margin: '4px 0', fontSize: '18px', fontWeight: 900 }}>BINGO CHAMPION!</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#a7f3d0' }}>
                {winner.name} shouted Bingo and claimed the tournament prize!
              </p>
            </div>
          )}

          {/* Caller History Log */}
          <div
            className="glass-card"
            style={{
              padding: '14px 18px',
              fontSize: '12px',
              color: '#94a3b8',
              maxHeight: '220px',
              overflowY: 'auto',
            }}
          >
            <strong
              style={{
                color: '#fbbf24',
                display: 'block',
                marginBottom: '8px',
                fontSize: '11px',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              📜 Caller History:
            </strong>
            {log.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  color: idx === 0 ? '#38bdf8' : '#94a3b8',
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
