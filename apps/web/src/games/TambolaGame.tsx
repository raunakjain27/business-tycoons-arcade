import React, { useState, useEffect } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { soundFx } from '../soundEffects';

interface TambolaTicketCell {
  num: number | null;
  marked: boolean;
}

interface PlayerTicket {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  grid: TambolaTicketCell[][]; // 3 rows x 9 columns
  claimedAwards: string[];
}

interface Award {
  id: string;
  title: string;
  coins: number;
  winner: string | null;
}

// Generate valid authentic Indian Tambola ticket (3 rows x 9 cols, 5 numbers per row, 15 numbers total)
function generateAuthenticTambolaTicket(): TambolaTicketCell[][] {
  const grid: TambolaTicketCell[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 9 }, () => ({ num: null, marked: false }))
  );

  // Column number boundaries: col 0: 1-9, col 1: 10-19 ... col 8: 80-90
  const colRanges: [number, number][] = [
    [1, 9],
    [10, 19],
    [20, 29],
    [30, 39],
    [40, 49],
    [50, 59],
    [60, 69],
    [70, 79],
    [80, 90],
  ];

  // Pick 5 distinct columns for each of the 3 rows
  for (let r = 0; r < 3; r++) {
    const cols = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => 0.5 - Math.random()).slice(0, 5);
    for (const c of cols) {
      const [min, max] = colRanges[c];
      let val = Math.floor(Math.random() * (max - min + 1)) + min;
      // ensure unique in this column across rows
      while (grid.some((row) => row[c].num === val)) {
        val = Math.floor(Math.random() * (max - min + 1)) + min;
      }
      grid[r][c].num = val;
    }
  }

  // Sort numbers vertically in each column
  for (let c = 0; c < 9; c++) {
    const colVals = grid.map((r) => r[c].num).filter((v): v is number => v !== null).sort((a, b) => a - b);
    let valIdx = 0;
    for (let r = 0; r < 3; r++) {
      if (grid[r][c].num !== null) {
        grid[r][c].num = colVals[valIdx++];
      }
    }
  }

  return grid;
}

export const TambolaGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice } = useVoiceStore();

  const room = getOrCreateRoom('tambola', 'You (Ticket #1)', 8, 2);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const [players, setPlayers] = useState<PlayerTicket[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentCall, setCurrentCall] = useState<number | null>(null);
  const [isAutoCalling, setIsAutoCalling] = useState(false);
  const [callSpeedSec, setCallSpeedSec] = useState(4);
  const [log, setLog] = useState<string[]>(['Welcome to Tambola (Housie)! Mark numbers on your ticket as they are called.']);

  const [awards, setAwards] = useState<Award[]>([
    { id: 'early5', title: 'Early Five (First 5 Numbers)', coins: 50, winner: null },
    { id: 'topLine', title: 'Top Line (Row 1 Complete)', coins: 100, winner: null },
    { id: 'middleLine', title: 'Middle Line (Row 2 Complete)', coins: 100, winner: null },
    { id: 'bottomLine', title: 'Bottom Line (Row 3 Complete)', coins: 100, winner: null },
    { id: 'fourCorners', title: 'Four Corners', coins: 80, winner: null },
    { id: 'fullHouse', title: 'FULL HOUSE (All 15 Numbers)', coins: 300, winner: null },
  ]);

  const addLog = (msg: string) => {
    setLog((prev) => [msg, ...prev.slice(0, 19)]);
  };

  const startMatchFromRoom = () => {
    const participantList = [...room.players];
    while (participantList.length < 4 && room.allowBots) {
      const idx = participantList.length;
      participantList.push({
        id: `bot-${idx}`,
        name: `Auntie Bot ${idx} 🧕`,
        isBot: true,
        avatar: '🧕',
        isHost: false,
        color: '#f59e0b',
      });
    }

    const builtPlayers: PlayerTicket[] = participantList.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isBot: p.isBot,
      grid: generateAuthenticTambolaTicket(),
      claimedAwards: [],
    }));

    setPlayers(builtPlayers);
    setCalledNumbers([]);
    setCurrentCall(null);
    setInLobby(false);
    room.isGameStarted = true;

    connectVoice(participantList.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    addLog('🎟️ Tickets distributed! Host begins calling numbers from 1 to 90.');
  };

  // Call Next Number
  const callNextNumber = () => {
    if (calledNumbers.length >= 90) {
      addLog('All 90 numbers have been called!');
      return;
    }

    const available = Array.from({ length: 90 }, (_, i) => i + 1).filter((n) => !calledNumbers.includes(n));
    const picked = available[Math.floor(Math.random() * available.length)];

    soundFx.playCardFlip();
    setCurrentCall(picked);
    setCalledNumbers((prev) => [picked, ...prev]);

    // Tambola slang calling
    let slang = '';
    if (picked === 1) slang = 'Kelly’s Eye';
    else if (picked === 11) slang = 'Two beautiful legs';
    else if (picked === 22) slang = 'Two little ducks';
    else if (picked === 88) slang = 'Two fat ladies';
    else if (picked === 90) slang = 'Top of the house!';

    addLog(`📢 Number Called: [ ${picked} ] ${slang ? `— ${slang}` : ''}`);

    // Auto-mark bot tickets
    setPlayers((prev) =>
      prev.map((player) => {
        if (!player.isBot) return player;
        const updatedGrid = player.grid.map((row) =>
          row.map((cell) => (cell.num === picked ? { ...cell, marked: true } : cell))
        );
        return { ...player, grid: updatedGrid };
      })
    );
  };

  // Auto-caller interval
  useEffect(() => {
    let timer: any = null;
    if (isAutoCalling && !inLobby && calledNumbers.length < 90) {
      timer = setInterval(() => {
        callNextNumber();
      }, callSpeedSec * 1000);
    }
    return () => clearInterval(timer);
  }, [isAutoCalling, inLobby, calledNumbers, callSpeedSec]);

  // Click on ticket cell to toggle dab
  const toggleMarkCell = (rowIndex: number, colIndex: number) => {
    const myPlayer = players[0];
    if (!myPlayer) return;

    const cell = myPlayer.grid[rowIndex][colIndex];
    if (cell.num === null) return;

    soundFx.playCardSpecial();
    const newGrid = myPlayer.grid.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === rowIndex && cIdx === colIndex ? { ...c, marked: !c.marked } : c))
    );

    setPlayers((prev) => prev.map((p, idx) => (idx === 0 ? { ...p, grid: newGrid } : p)));
  };

  // Claim Prize Verification
  const claimAward = (awardId: string) => {
    const myPlayer = players[0];
    if (!myPlayer) return;

    const targetAward = awards.find((a) => a.id === awardId);
    if (!targetAward || targetAward.winner) return;

    // Check validity
    let isValid = false;
    const flatCells = myPlayer.grid.flat().filter((c) => c.num !== null);
    const markedCount = flatCells.filter((c) => c.marked && calledNumbers.includes(c.num!)).length;

    if (awardId === 'early5' && markedCount >= 5) isValid = true;
    if (awardId === 'topLine') {
      const row1 = myPlayer.grid[0].filter((c) => c.num !== null);
      if (row1.every((c) => c.marked && calledNumbers.includes(c.num!))) isValid = true;
    }
    if (awardId === 'middleLine') {
      const row2 = myPlayer.grid[1].filter((c) => c.num !== null);
      if (row2.every((c) => c.marked && calledNumbers.includes(c.num!))) isValid = true;
    }
    if (awardId === 'bottomLine') {
      const row3 = myPlayer.grid[2].filter((c) => c.num !== null);
      if (row3.every((c) => c.marked && calledNumbers.includes(c.num!))) isValid = true;
    }
    if (awardId === 'fullHouse') {
      if (flatCells.every((c) => c.marked && calledNumbers.includes(c.num!))) isValid = true;
    }
    if (awardId === 'fourCorners') {
      const r1 = myPlayer.grid[0].filter((c) => c.num !== null);
      const r3 = myPlayer.grid[2].filter((c) => c.num !== null);
      const corners = [r1[0], r1[r1.length - 1], r3[0], r3[r3.length - 1]];
      if (corners.every((c) => c && c.marked && calledNumbers.includes(c.num!))) isValid = true;
    }

    if (isValid) {
      soundFx.playCashRegister();
      soundFx.playVictory();
      setAwards((prev) =>
        prev.map((a) => (a.id === awardId ? { ...a, winner: `${myPlayer.name} (${myPlayer.avatar})` } : a))
      );
      addLog(`🎉 BINGO / TAMBOLA! ${myPlayer.name} successfully claimed [ ${targetAward.title} ] (+${targetAward.coins} Coins)!`);
    } else {
      soundFx.playSnakeHiss();
      addLog(`❌ BOGUS CLAIM! ${myPlayer.name} claimed ${targetAward.title} but numbers are not verified on caller board!`);
    }
  };

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="tambola"
        gameTitle="Tambola (Housie) Live"
        gameIcon="🎟️"
        minPlayers={2}
        maxPlayers={12}
        bannerGradient="linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)"
        onStart={startMatchFromRoom}
      />
    );
  }

  const myPlayer = players[0];

  return (
    <div style={{ maxWidth: '1350px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', padding: '0 8px' }}>
      {/* Top Header & Voice Room */}
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
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎟️</span> Tambola (Housie) Live
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{isAutoCalling ? '⏸ Pause Auto-Call' : '▶ Auto-Call Numbers'}</span>
          </button>

          <button
            onClick={callNextNumber}
            disabled={isAutoCalling || calledNumbers.length >= 90}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
              color: '#ffffff',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
            }}
          >
            🎲 Call Next Number
          </button>
        </div>
      </div>

      <VoiceRoomBar gameTitle="Tambola Housie Room" />

      {/* Main Game Stage */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 380px', gap: '24px' }}>
        
        {/* Left Column: Number Caller Board & My Ticket */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Current Big Call Display */}
          <div
            style={{
              background: 'radial-gradient(ellipse at top, #2d1848 0%, #120924 100%)',
              borderRadius: '24px',
              border: '1.5px solid rgba(245, 158, 11, 0.4)',
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
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                  border: '4px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '44px',
                  fontWeight: 900,
                  color: '#ffffff',
                  boxShadow: '0 0 35px rgba(245, 158, 11, 0.65)',
                }}
              >
                {currentCall ?? '--'}
              </div>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '1px' }}>
                  Latest Number Called
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>
                  {currentCall ? `Number ${currentCall} Announced!` : 'Click "Call Next Number"'}
                </h3>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {calledNumbers.length} / 90 Numbers Drawn
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Last 5 Drawn:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {calledNumbers.slice(1, 6).map((num) => (
                  <span
                    key={num}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#fde68a',
                    }}
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* MY TAMBOLA TICKET */}
          {myPlayer && (
            <div
              style={{
                background: 'linear-gradient(135deg, #2a1b4e 0%, #170d30 50%, #0d071c 100%)',
                borderRadius: '28px',
                border: '2px solid rgba(245, 158, 11, 0.6)',
                padding: '26px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 40px rgba(245, 158, 11, 0.25)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background luxury watermark */}
              <div
                style={{
                  position: 'absolute',
                  right: '-20px',
                  bottom: '-20px',
                  fontSize: '120px',
                  opacity: 0.04,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                🎟️
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    🎟️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: '#fde68a', letterSpacing: '-0.3px' }}>
                      Royal Tambola Ticket
                    </h3>
                    <span style={{ fontSize: '11.5px', color: '#cbd5e1' }}>
                      Ticket ID: #TB-{myPlayer.id.substring(0, 6).toUpperCase()} • Serialized
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#fde68a',
                  }}
                >
                  ⚡ Tap Cell to Stamp
                </div>
              </div>

              {/* 3 x 9 Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: 'repeat(3, 1fr)',
                  gap: '8px',
                  background: 'rgba(10, 5, 20, 0.85)',
                  padding: '12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)',
                }}
              >
                {myPlayer.grid.map((row, rIdx) => (
                  <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '8px' }}>
                    {row.map((cell, cIdx) => {
                      const isDrawn = cell.num !== null && calledNumbers.includes(cell.num);
                      return (
                        <button
                          key={cIdx}
                          onClick={() => toggleMarkCell(rIdx, cIdx)}
                          disabled={cell.num === null}
                          style={{
                            aspectRatio: '1.2 / 1',
                            borderRadius: '12px',
                            border: cell.marked
                              ? '2px solid #34d399'
                              : isDrawn
                              ? '2px solid #f59e0b'
                              : cell.num !== null
                              ? '1px solid rgba(255,255,255,0.14)'
                              : '1px solid rgba(255,255,255,0.03)',
                            background: cell.marked
                              ? 'radial-gradient(circle, #059669 0%, #064e3b 100%)'
                              : isDrawn
                              ? 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(180, 83, 9, 0.15) 100%)'
                              : cell.num === null
                              ? 'rgba(255,255,255,0.01)'
                              : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                            color: cell.marked ? '#ffffff' : isDrawn ? '#fde68a' : cell.num ? '#ffffff' : 'transparent',
                            fontSize: '19px',
                            fontWeight: 900,
                            cursor: cell.num ? 'pointer' : 'default',
                            display: 'flex',
                            position: 'relative',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: cell.marked
                              ? '0 0 18px rgba(52, 211, 153, 0.6), inset 0 0 8px rgba(255,255,255,0.3)'
                              : isDrawn
                              ? '0 0 12px rgba(245, 158, 11, 0.4)'
                              : 'none',
                            transform: cell.marked ? 'scale(0.98)' : 'scale(1)',
                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        >
                          {cell.num ?? ''}
                          {cell.marked && (
                            <span
                              style={{
                                position: 'absolute',
                                fontSize: '11px',
                                top: '2px',
                                right: '4px',
                                color: '#a7f3d0',
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1-90 MASTER CALLER BOARD */}
          <div
            style={{
              background: 'rgba(15, 11, 26, 0.8)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#cbd5e1' }}>
                📋 Master Numbers Board (1 - 90)
              </span>
              <span style={{ fontSize: '12px', color: '#10b981' }}>
                Green = Called
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
              {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => {
                const isCalled = calledNumbers.includes(n);
                const isLatest = currentCall === n;
                return (
                  <div
                    key={n}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '6px',
                      background: isLatest ? '#f59e0b' : isCalled ? '#10b981' : 'rgba(255,255,255,0.04)',
                      color: isLatest || isCalled ? '#ffffff' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isLatest ? '2px solid #fff' : 'none',
                    }}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Awards Claims & Live Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Claim Awards Box */}
          <div
            style={{
              background: 'rgba(20, 14, 38, 0.95)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🏆</span>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#fde68a' }}>
                Claim Tambola Prizes
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {awards.map((award) => (
                <div
                  key={award.id}
                  style={{
                    background: award.winner ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: award.winner ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff' }}>
                      {award.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: award.winner ? '#4ade80' : '#f59e0b', marginTop: '2px' }}>
                      {award.winner ? `Won by: ${award.winner}` : `Prize: +${award.coins} Coins`}
                    </div>
                  </div>

                  {!award.winner ? (
                    <button
                      onClick={() => claimAward(award.id)}
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                        border: 'none',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(236,72,153,0.3)',
                      }}
                    >
                      Claim!
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 800 }}>
                      CLAIMED ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Caller Event Log */}
          <div
            style={{
              background: 'rgba(10, 6, 20, 0.85)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '340px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#cbd5e1' }}>
              📜 Game Announcer Log
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              {log.map((entry, idx) => (
                <div key={idx} style={{ color: idx === 0 ? '#fde68a' : '#94a3b8', lineHeight: 1.4 }}>
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
