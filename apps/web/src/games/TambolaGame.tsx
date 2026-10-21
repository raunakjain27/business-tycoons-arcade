import React, { useState, useEffect } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { soundFx } from '../soundEffects';
import { useCelebrationStore } from '../celebrationStore';

interface TambolaTicketCell {
  num: number | null;
  marked: boolean;
}

interface PlayerTicket {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  grids: TambolaTicketCell[][][];
  claimedAwards: string[];
}

interface Award {
  id: string;
  title: string;
  coins: number;
  winner: string | null;
}

function generateAuthenticTambolaTicket(): TambolaTicketCell[][] {
  const grid: TambolaTicketCell[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 9 }, () => ({ num: null, marked: false }))
  );

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

  for (let r = 0; r < 3; r++) {
    const cols = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => 0.5 - Math.random()).slice(0, 5);
    for (const c of cols) {
      const [min, max] = colRanges[c];
      let val = Math.floor(Math.random() * (max - min + 1)) + min;
      while (grid.some((row) => row[c].num === val)) {
        val = Math.floor(Math.random() * (max - min + 1)) + min;
      }
      grid[r][c].num = val;
    }
  }

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
  const [ticketCount, setTicketCount] = useState<number>(2);
  const [callSpeedSec, setCallSpeedSec] = useState<number>(5);
  const [voiceLanguage, setVoiceLanguage] = useState<'hi' | 'en'>('hi');

  const [players, setPlayers] = useState<PlayerTicket[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentCall, setCurrentCall] = useState<number | null>(null);
  const [isAutoCalling, setIsAutoCalling] = useState<boolean>(false);
  const [countdownSec, setCountdownSec] = useState<number>(callSpeedSec);
  const [boogieMessage, setBoogieMessage] = useState<string>('');
  const [log, setLog] = useState<string[]>(['Imperial Housie Pavilion initialized. Tap numbers on your ticket as they are called!']);

  const [awards, setAwards] = useState<Award[]>([
    { id: 'early5', title: 'EARLY FIVE (First 5 Numbers)', coins: 60, winner: null },
    { id: 'fourCorners', title: 'FOUR CORNERS', coins: 80, winner: null },
    { id: 'topLine', title: 'TOP LINE (Row 1)', coins: 100, winner: null },
    { id: 'middleLine', title: 'MIDDLE LINE (Row 2)', coins: 100, winner: null },
    { id: 'bottomLine', title: 'BOTTOM LINE (Row 3)', coins: 100, winner: null },
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
      grids: Array.from({ length: ticketCount }, () => generateAuthenticTambolaTicket()),
      claimedAwards: [],
    }));

    setPlayers(builtPlayers);
    setCalledNumbers([]);
    setCurrentCall(null);
    setCountdownSec(callSpeedSec);
    setInLobby(false);
    room.isGameStarted = true;

    connectVoice(participantList.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    addLog(`🎟️ Match started! Distributed ${ticketCount} serialized tickets per player. Auto-call timer: ${callSpeedSec}s.`);
  };

  const callNextNumber = () => {
    if (calledNumbers.length >= 90) {
      addLog('All 90 numbers have been called!');
      return;
    }

    const available = Array.from({ length: 90 }, (_, i) => i + 1).filter((n) => !calledNumbers.includes(n));
    const picked = available[Math.floor(Math.random() * available.length)];

    soundFx.playCardFlip();
    soundFx.vibrate(30);
    setCurrentCall(picked);
    setCalledNumbers((prev) => [picked, ...prev]);
    setCountdownSec(callSpeedSec);

    let slang = '';
    if (picked === 1) slang = 'Kelly’s Eye';
    else if (picked === 7) slang = 'Lucky Seven';
    else if (picked === 11) slang = 'Two beautiful legs';
    else if (picked === 22) slang = 'Two little ducks';
    else if (picked === 55) slang = 'All the fives';
    else if (picked === 88) slang = 'Two fat ladies';
    else if (picked === 90) slang = 'Top of the house!';

    soundFx.announceTambolaNumber(picked, slang, voiceLanguage);
    addLog(`📢 Number Announced: [ ${picked} ] ${slang ? `— ${slang}` : ''}`);

    setPlayers((prev) =>
      prev.map((player) => {
        if (!player.isBot) return player;
        const updatedGrids = player.grids.map((grid) =>
          grid.map((row) =>
            row.map((cell) => (cell.num === picked ? { ...cell, marked: true } : cell))
          )
        );
        return { ...player, grids: updatedGrids };
      })
    );
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isAutoCalling && !inLobby && calledNumbers.length < 90) {
      timer = setInterval(() => {
        setCountdownSec((prev) => {
          if (prev <= 1) {
            callNextNumber();
            return callSpeedSec;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoCalling, inLobby, calledNumbers, callSpeedSec]);

  const toggleMarkCell = (ticketIdx: number, rowIndex: number, colIndex: number) => {
    const myPlayer = players[0];
    if (!myPlayer) return;

    const targetGrid = myPlayer.grids[ticketIdx];
    if (!targetGrid) return;
    const cell = targetGrid[rowIndex][colIndex];
    if (cell.num === null) return;

    if (!calledNumbers.includes(cell.num)) {
      soundFx.playSnakeHiss();
      soundFx.vibrate([40, 40]);
      setBoogieMessage(`⚠️ Number ${cell.num} has not been called yet! Only called numbers may be dabbed.`);
      setTimeout(() => setBoogieMessage(''), 2500);
      return;
    }

    soundFx.playCardSpecial();
    soundFx.vibrate(25);
    const newGrids = myPlayer.grids.map((g, gIdx) => {
      if (gIdx !== ticketIdx) return g;
      return g.map((r, rIdx) =>
        r.map((c, cIdx) => (rIdx === rowIndex && cIdx === colIndex ? { ...c, marked: !c.marked } : c))
      );
    });

    setPlayers((prev) => prev.map((p, idx) => (idx === 0 ? { ...p, grids: newGrids } : p)));
  };

  const claimAward = (awardId: string) => {
    const myPlayer = players[0];
    if (!myPlayer) return;

    const targetAward = awards.find((a) => a.id === awardId);
    if (!targetAward || targetAward.winner) return;

    let isValid = false;
    let winningTicketIdx = -1;

    for (let tIdx = 0; tIdx < myPlayer.grids.length; tIdx++) {
      const grid = myPlayer.grids[tIdx];
      const flatCells = grid.flat().filter((c) => c.num !== null);
      const markedCount = flatCells.filter((c) => c.marked && calledNumbers.includes(c.num!)).length;

      if (awardId === 'early5' && markedCount >= 5) {
        isValid = true;
        winningTicketIdx = tIdx;
        break;
      }
      if (awardId === 'topLine') {
        const row1 = grid[0].filter((c) => c.num !== null);
        if (row1.every((c) => c.marked && calledNumbers.includes(c.num!))) {
          isValid = true;
          winningTicketIdx = tIdx;
          break;
        }
      }
      if (awardId === 'middleLine') {
        const row2 = grid[1].filter((c) => c.num !== null);
        if (row2.every((c) => c.marked && calledNumbers.includes(c.num!))) {
          isValid = true;
          winningTicketIdx = tIdx;
          break;
        }
      }
      if (awardId === 'bottomLine') {
        const row3 = grid[2].filter((c) => c.num !== null);
        if (row3.every((c) => c.marked && calledNumbers.includes(c.num!))) {
          isValid = true;
          winningTicketIdx = tIdx;
          break;
        }
      }
      if (awardId === 'fullHouse') {
        if (flatCells.every((c) => c.marked && calledNumbers.includes(c.num!))) {
          isValid = true;
          winningTicketIdx = tIdx;
          break;
        }
      }
      if (awardId === 'fourCorners') {
        const r1 = grid[0].filter((c) => c.num !== null);
        const r3 = grid[2].filter((c) => c.num !== null);
        const corners = [r1[0], r1[r1.length - 1], r3[0], r3[r3.length - 1]];
        if (corners.every((c) => c && c.marked && calledNumbers.includes(c.num!))) {
          isValid = true;
          winningTicketIdx = tIdx;
          break;
        }
      }
    }

    if (isValid) {
      soundFx.playCashRegister();
      soundFx.playVictory();
      soundFx.vibrate([100, 50, 100, 50, 200]);
      if (awardId === 'fullHouse') {
        useCelebrationStore.getState().triggerVictory({
          gameTitle: 'Tambola (Indian Housie)',
          winnerName: myPlayer.name,
          winnerAvatar: myPlayer.avatar || '🎟️',
          coinsAwarded: targetAward.coins,
          xpAwarded: 250,
          reason: `${myPlayer.name} dabbed all 15 numbers on Ticket #${winningTicketIdx + 1} and claimed FULL HOUSE!`,
        });
      }
      setAwards((prev) =>
        prev.map((a) => (a.id === awardId ? { ...a, winner: `${myPlayer.name} (Ticket #${winningTicketIdx + 1})` } : a))
      );
      addLog(`🎉 TAMBOLA BINGO! ${myPlayer.name} claimed [ ${targetAward.title} ] on Ticket #${winningTicketIdx + 1} (+${targetAward.coins} Coins)!`);
    } else {
      soundFx.playSnakeHiss();
      soundFx.vibrate([300, 100, 300]);
      setBoogieMessage(`🚫 BOOGIE! False claim on "${targetAward.title}". Penalty: -25 Coins!`);
      setTimeout(() => setBoogieMessage(''), 4000);
      addLog(`❌ BOOGIE CALLED! False claim on [ ${targetAward.title} ]! Ticket criteria not met.`);
    }
  };

  if (inLobby) {
    return (
      <div
        style={{
          maxWidth: '880px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Match Configuration Card */}
        <div
          className="glass-panel"
          style={{
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            background: 'linear-gradient(135deg, rgba(14, 19, 32, 0.9) 0%, rgba(9, 13, 22, 0.95) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '26px' }}>⚙️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#fbbf24' }}>
                Housie Pavilion Configuration
              </h3>
              <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                Select ticket bundles and automated caller rhythm before opening the salon
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Tickets Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#f8fafc' }}>
                🎟️ Ticket Bundle per Player:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 6].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTicketCount(count)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: ticketCount === count ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: ticketCount === count ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: ticketCount === count ? '#fbbf24' : '#cbd5e1',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {count} {count === 1 ? 'Sheet' : 'Sheets'}
                  </button>
                ))}
              </div>
            </div>

            {/* Caller Speed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#f8fafc' }}>
                ⏱️ Caller Rhythm (Seconds/Ball):
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[2, 3, 5, 8].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setCallSpeedSec(sec);
                      setCountdownSec(sec);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: callSpeedSec === sec ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: callSpeedSec === sec ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: callSpeedSec === sec ? '#38bdf8' : '#cbd5e1',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <GameRoomLobby
          gameId="tambola"
          gameTitle="Imperial Housie Pavilion"
          gameIcon="🎟️"
          minPlayers={2}
          maxPlayers={12}
          onStart={startMatchFromRoom}
        />
      </div>
    );
  }

  const myPlayer = players[0];

  return (
    <div
      style={{
        maxWidth: '1380px',
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <VoiceRoomBar gameTitle="Imperial Housie Pavilion" turnRestricted={false} />

      {/* Top Header & Caller Controls */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setView('dashboard')}
            className="btn-tactile-secondary"
            style={{
              padding: '7px 14px',
              fontSize: '12px',
            }}
          >
            ← Arcade
          </button>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎟️</span>
              <span>Imperial Housie Pavilion</span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {ticketCount} Tickets Active • {callSpeedSec}s Auto Timer
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Hindi / English Voice Caller Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px 8px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span style={{ fontSize: '11px', color: '#94a3b8', marginRight: '4px' }}>Voice:</span>
            <button
              onClick={() => setVoiceLanguage('hi')}
              style={{
                background: voiceLanguage === 'hi' ? '#fbbf24' : 'transparent',
                color: voiceLanguage === 'hi' ? '#000000' : '#cbd5e1',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🇮🇳 हिन्दी
            </button>
            <button
              onClick={() => setVoiceLanguage('en')}
              style={{
                background: voiceLanguage === 'en' ? '#fbbf24' : 'transparent',
                color: voiceLanguage === 'en' ? '#000000' : '#cbd5e1',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🇬🇧 English
            </button>
          </div>

          <button
            onClick={() => setIsAutoCalling(!isAutoCalling)}
            className="btn-tactile-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              color: isAutoCalling ? '#fb7185' : '#34d399',
              borderColor: isAutoCalling ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)',
            }}
          >
            {isAutoCalling ? `⏸ Pause (${countdownSec}s)` : '▶ Auto-Call Numbers'}
          </button>

          <button
            onClick={callNextNumber}
            disabled={isAutoCalling || calledNumbers.length >= 90}
            className="btn-primary-glow"
            style={{
              padding: '8px 18px',
              fontSize: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
            }}
          >
            🎲 Call Next Number
          </button>
        </div>
      </div>

      {/* Boogie Penalty Toast */}
      {boogieMessage && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5)',
          }}
        >
          <span>🚨</span>
          <span>{boogieMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Column Tickets & Master Board, Right Column Prizes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) 360px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Number Call Display */}
          <div
            className="glass-panel"
            style={{
              padding: '20px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(14, 19, 32, 0.85) 0%, rgba(9, 13, 22, 0.95) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '20px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #fbbf24 0%, #d97706 60%, #78350f 100%)',
                  border: '3px solid rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '42px',
                  fontWeight: 900,
                  color: '#ffffff',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.7), 0 0 25px rgba(245, 158, 11, 0.5)',
                  flexShrink: 0,
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {currentCall ?? '--'}
              </div>

              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#fbbf24',
                    letterSpacing: '1px',
                  }}
                >
                  Latest Drawn Number {isAutoCalling && `• Next in ${countdownSec}s`}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>
                  {currentCall ? `Number ${currentCall} Announced!` : 'Press "Call Next Number"'}
                </h3>
                <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                  {calledNumbers.length} / 90 Numbers Drawn
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#8492a6' }}>Recent Calls:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {calledNumbers.slice(1, 6).map((num) => (
                  <span
                    key={num}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#fbbf24',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Player Active Tickets */}
          {myPlayer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myPlayer.grids.map((grid, tIdx) => {
                const flat = grid.flat().filter((c) => c.num !== null);
                const marked = flat.filter((c) => c.marked && calledNumbers.includes(c.num!)).length;

                return (
                  <div
                    key={tIdx}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      borderRadius: '20px',
                      border: '1.5px solid rgba(245, 158, 11, 0.35)',
                      background: 'radial-gradient(ellipse at center, #131a2d 0%, #090e1a 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>🎟️</span>
                        <strong style={{ fontSize: '15px', color: '#fbbf24' }}>
                          Ticket #{tIdx + 1} • Serial #TB-{myPlayer.id.substring(0, 4).toUpperCase()}-{tIdx + 1}
                        </strong>
                      </div>

                      <div
                        style={{
                          background: marked >= 5 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                          border: marked >= 5 ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: marked >= 5 ? '#34d399' : '#cbd5e1',
                        }}
                      >
                        {marked === 15 ? '⭐ FULL HOUSE!' : `${marked} / 15 Cut`}
                      </div>
                    </div>

                    {/* 3x9 Ticket Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: 'repeat(3, 1fr)',
                        gap: '6px',
                        background: 'rgba(5, 10, 20, 0.7)',
                        padding: '10px',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {grid.map((row, rIdx) => (
                        <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '6px' }}>
                          {row.map((cell, cIdx) => {
                            const isDrawn = cell.num !== null && calledNumbers.includes(cell.num);
                            return (
                              <button
                                key={cIdx}
                                onClick={() => toggleMarkCell(tIdx, rIdx, cIdx)}
                                disabled={cell.num === null}
                                style={{
                                  aspectRatio: '1.25 / 1',
                                  borderRadius: '8px',
                                  border: cell.marked
                                    ? '2px solid #34d399'
                                    : cell.num !== null
                                    ? '1px solid rgba(255,255,255,0.15)'
                                    : '1px solid rgba(255,255,255,0.02)',
                                  background: cell.marked
                                    ? 'radial-gradient(circle, #059669 0%, #064e3b 100%)'
                                    : cell.num === null
                                    ? 'rgba(255,255,255,0.01)'
                                    : 'rgba(255,255,255,0.04)',
                                  color: cell.marked ? '#ffffff' : cell.num ? '#ffffff' : 'transparent',
                                  fontSize: '17px',
                                  fontWeight: 900,
                                  cursor: cell.num ? 'pointer' : 'default',
                                  display: 'flex',
                                  position: 'relative',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: cell.marked
                                    ? '0 0 12px rgba(52, 211, 153, 0.5), inset 0 0 6px rgba(255,255,255,0.3)'
                                    : isDrawn
                                    ? '0 0 10px rgba(245, 158, 11, 0.4)'
                                    : 'none',
                                  transform: cell.marked ? 'scale(0.98)' : 'scale(1)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {cell.num ?? ''}
                                {cell.marked && (
                                  <span style={{ position: 'absolute', fontSize: '9px', top: '2px', right: '3px', color: '#a7f3d0' }}>
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
                );
              })}
            </div>
          )}

          {/* 1-90 Master Caller Board */}
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
                color: '#fbbf24',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Master 90-Number Board
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
              {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => {
                const isCalled = calledNumbers.includes(n);
                const isLatest = currentCall === n;
                return (
                  <div
                    key={n}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '4px',
                      background: isLatest ? '#f59e0b' : isCalled ? '#10b981' : 'rgba(255,255,255,0.03)',
                      color: isLatest || isCalled ? '#ffffff' : '#475569',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'ui-monospace, monospace',
                      border: isLatest ? '1.5px solid #ffffff' : 'none',
                    }}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Prize Claiming & Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🏆</span>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#fbbf24' }}>
                Claim Housie Prizes
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {awards.map((award) => (
                <div
                  key={award.id}
                  className="glass-card"
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: award.winner
                      ? '1px solid #10b981'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: award.winner
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                      {award.title}
                    </div>
                    <div style={{ fontSize: '11px', color: award.winner ? '#34d399' : '#fbbf24', marginTop: '2px' }}>
                      {award.winner ? `Won by: ${award.winner}` : `Bounty: +${award.coins} Bullion`}
                    </div>
                  </div>

                  {!award.winner ? (
                    <button
                      onClick={() => claimAward(award.id)}
                      className="btn-primary-glow"
                      style={{
                        padding: '6px 14px',
                        fontSize: '11.5px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      }}
                    >
                      Claim!
                    </button>
                  ) : (
                    <span style={{ fontSize: '10.5px', color: '#10b981', fontWeight: 800 }}>
                      CLAIMED ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Game Announcer Log */}
          <div
            className="glass-card"
            style={{
              padding: '14px 18px',
              fontSize: '12px',
              color: '#94a3b8',
              maxHeight: '260px',
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
              📜 Announcer Chronicle:
            </strong>
            {log.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  color: idx === 0 ? '#fbbf24' : '#94a3b8',
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
