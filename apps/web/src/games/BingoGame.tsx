import React, { useState, useEffect } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { soundFx } from '../soundEffects';

interface BingoCardCell {
  num: number | 'FREE';
  marked: boolean;
}

interface BingoPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  grid: BingoCardCell[][]; // 5x5 grid
  completedLines: number;
  hasWonBingo: boolean;
}

const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

// Column ranges for 75-ball classic Bingo:
// B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
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
        color: '#3b82f6',
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

  // Call Next Bingo Ball
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

    // Auto-dab for bots
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

  // Auto-caller
  useEffect(() => {
    let timer: any = null;
    if (isAutoCalling && !inLobby && !winner && calledBalls.length < 75) {
      timer = setInterval(() => {
        callNextBall();
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [isAutoCalling, inLobby, winner, calledBalls]);

  // Dab player card cell & Check Automatic Win immediately
  const toggleMarkCell = (rowIdx: number, colIdx: number) => {
    const myPlayer = players[0];
    if (!myPlayer || winner) return;

    const cell = myPlayer.grid[rowIdx][colIdx];
    if (cell.num === 'FREE') return;

    soundFx.playCardSpecial();
    const newGrid = myPlayer.grid.map((r, rI) =>
      r.map((c, cI) => (rI === rowIdx && cI === colIdx ? { ...c, marked: !c.marked } : c))
    );

    // Calculate lines immediately
    const lines = countBingoLines(newGrid);

    setPlayers((prev) => prev.map((p, idx) => (idx === 0 ? { ...p, grid: newGrid, completedLines: lines } : p)));

    // AUTOMATIC WIN DETECTION: Trigger instant win as requested (Line, 4 Corners, or Full Blackout)
    const isCorners = [0, 4].every((r) => [0, 4].every((c) => newGrid[r][c].marked));
    const isBlackout = newGrid.every((row) => row.every((c) => c.marked));

    if ((lines >= 1 || isCorners || isBlackout) && !winner) {
      soundFx.playVictory();
      soundFx.playCashRegister();
      soundFx.vibrate([100, 50, 100, 50, 200]);
      setWinner(myPlayer);
      setIsAutoCalling(false);
      const patternName = isBlackout ? 'FULL CARD BLACKOUT JACKPOT' : isCorners ? 'FOUR CORNERS' : 'LINE BINGO';
      addLog(`🏆 AUTOMATIC BINGO VICTORY! ${myPlayer.name} completed [ ${patternName} ] and WON the game!`);
    }
  };

  // Check lines count (Horizontal, Vertical, 2 Diagonals)
  const countBingoLines = (grid: BingoCardCell[][]): number => {
    let lines = 0;
    // Rows
    for (let r = 0; r < 5; r++) {
      if (grid[r].every((c) => c.marked)) lines++;
    }
    // Columns
    for (let c = 0; c < 5; c++) {
      if (grid.every((row) => row[c].marked)) lines++;
    }
    // Diagonals
    if ([0, 1, 2, 3, 4].every((i) => grid[i][i].marked)) lines++;
    if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i].marked)) lines++;
    return lines;
  };

  // Optional manual claim fallback
  const handleClaimBingo = () => {
    const myPlayer = players[0];
    if (!myPlayer || winner) return;

    const lines = countBingoLines(myPlayer.grid);
    if (lines >= 1) {
      soundFx.playVictory();
      soundFx.playCashRegister();
      setWinner(myPlayer);
      setIsAutoCalling(false);
      addLog(`🏆 BINGO VICTORY! ${myPlayer.name} formed ${lines} completed lines and WON the match!`);
    } else {
      soundFx.playSnakeHiss();
      addLog(`❌ INVALID BINGO! You must complete at least 1 full row, column, or diagonal line!`);
    }
  };

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="bingo"
        gameTitle="Bingo 75 Champions"
        gameIcon="🎱"
        minPlayers={2}
        maxPlayers={12}
        bannerGradient="linear-gradient(135deg, #3b82f6 0%, #10b981 100%)"
        onStart={startMatchFromRoom}
      />
    );
  }

  const myPlayer = players[0];
  const myCompletedLines = myPlayer ? countBingoLines(myPlayer.grid) : 0;

  return (
    <div style={{ maxWidth: '1350px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setView('dashboard')}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← Arcade
          </button>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎱</span> Bingo 75 Champions
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setIsAutoCalling(!isAutoCalling)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: isAutoCalling ? '#ef4444' : '#10b981',
              color: '#ffffff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {isAutoCalling ? '⏸ Pause Calling' : '▶ Auto-Draw Balls'}
          </button>

          <button
            onClick={callNextBall}
            disabled={isAutoCalling || winner !== null}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
              color: '#ffffff',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
            }}
          >
            🎱 Draw Next Ball
          </button>
        </div>
      </div>

      <VoiceRoomBar gameTitle="Bingo 75 Room" />

      {/* Main Play Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 380px', gap: '24px' }}>
        
        {/* Left Column: Big Ball Drawn & 5x5 Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Active Drawn Ball Banner */}
          <div
            style={{
              background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)',
              borderRadius: '24px',
              border: '1.5px solid rgba(59, 130, 246, 0.4)',
              padding: '24px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                  border: '4px solid #93c5fd',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 0 35px rgba(59, 130, 246, 0.65)',
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 900, opacity: 0.85 }}>
                  {currentBall ? currentBall.letter : 'BINGO'}
                </span>
                <span style={{ fontSize: '36px', fontWeight: 900, lineHeight: 1 }}>
                  {currentBall ? currentBall.num : '--'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#60a5fa', letterSpacing: '1px' }}>
                  Current Drawn Ball
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>
                  {currentBall ? `${currentBall.letter} - ${currentBall.num}` : 'Click "Draw Next Ball"'}
                </h3>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {calledBalls.length} / 75 Balls Drawn • {myCompletedLines} Lines Made
                </span>
              </div>
            </div>

            <button
              onClick={handleClaimBingo}
              disabled={winner !== null}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '16px 28px',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(239, 68, 68, 0.45)',
                transform: myCompletedLines > 0 ? 'scale(1.05)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              🎉 CALL BINGO!
            </button>
          </div>

          {/* MY 5x5 BINGO CARD */}
          {myPlayer && (
            <div
              style={{
                background: 'linear-gradient(135deg, #0e1e38 0%, #081120 50%, #030812 100%)',
                borderRadius: '28px',
                border: '2px solid rgba(59, 130, 246, 0.6)',
                padding: '26px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 40px rgba(59, 130, 246, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background watermark */}
              <div
                style={{
                  position: 'absolute',
                  right: '-15px',
                  bottom: '-15px',
                  fontSize: '130px',
                  opacity: 0.04,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                🎱
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    🎱
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: '#93c5fd', letterSpacing: '-0.3px' }}>
                      Grand Bingo Card
                    </h3>
                    <span style={{ fontSize: '11.5px', color: '#cbd5e1' }}>
                      Card ID: #BG-{myPlayer.id.substring(0, 6).toUpperCase()} • 75-Ball Standard
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: myCompletedLines > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                    border: myCompletedLines > 0 ? '1px solid #10b981' : '1px solid rgba(59, 130, 246, 0.4)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: myCompletedLines > 0 ? '#34d399' : '#93c5fd',
                  }}
                >
                  {myCompletedLines > 0 ? `🎉 ${myCompletedLines} Line(s) Connected!` : '🎯 Form 5 in a Row'}
                </div>
              </div>

              {/* B-I-N-G-O Header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', textAlign: 'center' }}>
                {BINGO_LETTERS.map((l) => (
                  <div
                    key={l}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      padding: '12px 0',
                      borderRadius: '14px',
                      fontSize: '24px',
                      fontWeight: 900,
                      boxShadow: '0 6px 16px rgba(37, 99, 235, 0.45)',
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
                  gap: '10px',
                  background: 'rgba(5, 10, 25, 0.85)',
                  padding: '12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                {myPlayer.grid.map((row, rIdx) => (
                  <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {row.map((cell, cIdx) => {
                      const isFree = cell.num === 'FREE';
                      const isDrawn = typeof cell.num === 'number' && calledBalls.some((b) => b.num === cell.num);

                      return (
                        <button
                          key={cIdx}
                          onClick={() => toggleMarkCell(rIdx, cIdx)}
                          style={{
                            aspectRatio: '1 / 1',
                            borderRadius: '14px',
                            border: cell.marked
                              ? '2px solid #34d399'
                              : isDrawn
                              ? '2px solid #60a5fa'
                              : '1px solid rgba(255,255,255,0.12)',
                            background: cell.marked
                              ? 'radial-gradient(circle, #059669 0%, #064e3b 100%)'
                              : isDrawn
                              ? 'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, rgba(29, 78, 216, 0.15) 100%)'
                              : isFree
                              ? 'radial-gradient(circle, #d97706 0%, #78350f 100%)'
                              : 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
                            color: '#ffffff',
                            fontSize: isFree ? '13px' : '20px',
                            fontWeight: 900,
                            cursor: isFree ? 'default' : 'pointer',
                            display: 'flex',
                            position: 'relative',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: cell.marked
                              ? '0 0 18px rgba(52, 211, 153, 0.6), inset 0 0 8px rgba(255,255,255,0.3)'
                              : isDrawn
                              ? '0 0 12px rgba(59, 130, 246, 0.45)'
                              : isFree
                              ? '0 0 16px rgba(245, 158, 11, 0.5)'
                              : 'none',
                            transform: cell.marked ? 'scale(0.98)' : 'scale(1)',
                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        >
                          {cell.num}
                          {isFree ? (
                            <span style={{ fontSize: '10px', color: '#fde68a', fontWeight: 800 }}>★ FREE</span>
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

        {/* Right Column: 75 Caller Board & Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Master 75-Ball Board */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#93c5fd' }}>
              📋 75-Ball Master Board
            </span>

            {BINGO_LETTERS.map((letter) => {
              const [min, max] = BINGO_RANGES[letter];
              const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);

              return (
                <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: '#3b82f6',
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {letter}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: '3px', flex: 1 }}>
                    {nums.map((n) => {
                      const isCalled = calledBalls.some((b) => b.num === n);
                      const isLatest = currentBall?.num === n;
                      return (
                        <div
                          key={n}
                          style={{
                            aspectRatio: '1/1',
                            borderRadius: '4px',
                            background: isLatest ? '#f59e0b' : isCalled ? '#10b981' : 'rgba(255,255,255,0.04)',
                            color: isLatest || isCalled ? '#fff' : '#64748b',
                            fontSize: '10px',
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

          {/* Winner Banner or Log */}
          {winner && (
            <div
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '20px',
                padding: '20px',
                textAlign: 'center',
                color: '#ffffff',
                boxShadow: '0 10px 30px rgba(16, 185, 129, 0.45)',
              }}
            >
              <div style={{ fontSize: '36px' }}>👑</div>
              <h3 style={{ margin: '6px 0', fontSize: '20px', fontWeight: 900 }}>BINGO CHAMPION!</h3>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                {winner.name} called Bingo and completed the pattern!
              </p>
            </div>
          )}

          {/* Game Log */}
          <div
            style={{
              background: 'rgba(10, 6, 20, 0.85)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '300px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#cbd5e1' }}>
              📜 Caller History
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              {log.map((entry, idx) => (
                <div key={idx} style={{ color: idx === 0 ? '#93c5fd' : '#94a3b8', lineHeight: 1.4 }}>
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
