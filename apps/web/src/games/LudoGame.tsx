import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { soundFx } from '../soundEffects';
import { useCelebrationStore } from '../celebrationStore';

type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

interface Token {
  id: number;
  color: PlayerColor;
  step: number; // -1: base, 0-50: main track, 51-56: home-stretch, 57: home finished
}

interface LudoPlayer {
  id: string;
  color: PlayerColor;
  name: string;
  avatar: string;
  isBot: boolean;
  tokens: Token[];
  tokensHome: number;
}

const PLAYER_THEMES: Record<
  PlayerColor,
  { name: string; hex: string; lightHex: string; gradient: string; startPos: number; badge: string }
> = {
  red: {
    name: 'Crimson Ruby',
    hex: '#ef4444',
    lightHex: '#fca5a5',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
    startPos: 0,
    badge: '🔴',
  },
  green: {
    name: 'Emerald Jade',
    hex: '#10b981',
    lightHex: '#6ee7b7',
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    startPos: 13,
    badge: '🟢',
  },
  yellow: {
    name: 'Solar Amber',
    hex: '#f59e0b',
    lightHex: '#fcd34d',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
    startPos: 26,
    badge: '🟡',
  },
  blue: {
    name: 'Cobalt Lapis',
    hex: '#3b82f6',
    lightHex: '#93c5fd',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    startPos: 39,
    badge: '🔵',
  },
};

const ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

const SAFE_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// 52 Main Track Coordinate Mapping: [row, col] on 15x15 grid (0-indexed)
const GLOBAL_TRACK_COORDS: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
];

// Home stretch mapping for each color (steps 51 to 56)
const HOME_STRETCH_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

function buildInitialPlayers(
  roomPlayers: Array<{ id?: string; name?: string; avatar?: string; isBot?: boolean; color?: string }>,
  roomAllowBots: boolean,
): LudoPlayer[] {
  const chosenColors = ORDER.slice(0, Math.max(2, Math.min(roomPlayers.length + (roomAllowBots ? 2 : 0), 4)));
  return chosenColors.map((color, idx) => {
    const rp = roomPlayers[idx];
    const isBot = !!(rp && rp.isBot) || (!rp && idx >= 1 && roomAllowBots);
    return {
      id: rp?.id ?? `p-${idx}`,
      color,
      name: rp?.name ?? (idx === 0 ? 'You (Red)' : `Player ${idx + 1}`),
      avatar: rp?.avatar ?? (isBot ? '🤖' : '🎲'),
      isBot,
      tokens: [
        { id: 0, color, step: -1 },
        { id: 1, color, step: -1 },
        { id: 2, color, step: -1 },
        { id: 3, color, step: -1 },
      ],
      tokensHome: 0,
    };
  });
}

export const LudoGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice, disconnectVoice } = useVoiceStore();

  const room = getOrCreateRoom('ludo', 'You (Red)', 4, 2);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const [players, setPlayers] = useState<LudoPlayer[]>([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [diceVal, setDiceVal] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [winner, setWinner] = useState<LudoPlayer | null>(null);
  const [gameLog, setGameLog] = useState<string[]>(['Royal Pachisi Match initiated. Roll a 6 to release tokens from base!']);

  const timerRegistry = useRef<any[]>([]);
  const intervalRegistry = useRef<any>(null);

  const clearTimers = useCallback(() => {
    if (timerRegistry.current) {
      timerRegistry.current.forEach(clearTimeout);
      timerRegistry.current = [];
    }
    if (intervalRegistry.current) {
      clearInterval(intervalRegistry.current);
      intervalRegistry.current = null;
    }
  }, []);

  const pushTimer = useCallback((t: any) => {
    if (timerRegistry.current) {
      timerRegistry.current.push(t);
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (winner) {
      useCelebrationStore.getState().triggerVictory({
        gameTitle: 'Ludo Superstars Deluxe',
        winnerName: winner.name,
        winnerAvatar: winner.avatar || '👑',
        coinsAwarded: 200,
        xpAwarded: 220,
        reason: `${winner.name} guided all 4 royal tokens into the home sanctuary first!`,
      });
    }
  }, [winner]);

  const logMessage = useCallback((msg: string) => {
    setGameLog((prev) => [msg, ...prev.slice(0, 15)]);
  }, []);

  const startMatchFromRoom = useCallback(() => {
    clearTimers();
    disconnectVoice();

    const roomPlayers = [...room.players.slice(0, 4)];
    while (roomPlayers.length < 4 && room.allowBots) {
      const idx = roomPlayers.length;
      roomPlayers.push({
        id: `bot-${idx}`,
        name: `Bot ${ORDER[idx].toUpperCase()} 🤖`,
        isBot: true,
        avatar: '🤖',
        isHost: false,
        color: PLAYER_THEMES[ORDER[idx]].hex,
      });
    }

    const matchPlayers = buildInitialPlayers(roomPlayers, room.allowBots);

    setPlayers(matchPlayers);
    connectVoice(matchPlayers.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));

    setCurrentTurnIdx(0);
    setDiceVal(null);
    setHasRolled(false);
    setWinner(null);
    setInLobby(false);
    setGameLog([
      `🎲 Royal Pachisi Match launched in room ${room.roomCode}! Red rolls first. Roll a 6 to release from base.`,
    ]);
  }, [room, clearTimers, connectVoice, disconnectVoice]);

  const curPlayer = players[currentTurnIdx];

  const canMoveToken = useCallback((token: Token, roll: number): boolean => {
    if (token.step === 57) return false;
    if (token.step === -1) return roll === 6;
    if (token.step + roll > 57) return false;
    return true;
  }, []);

  const rollDice = useCallback(() => {
    if (isRolling || hasRolled || winner) return;
    setIsRolling(true);
    soundFx.playDiceRoll();

    let rolls = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      rolls++;
      if (rolls > 8) {
        clearInterval(interval);
        intervalRegistry.current = null;
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalVal);
        setIsRolling(false);
        setHasRolled(true);
      }
    }, 55);
    intervalRegistry.current = interval;
  }, [isRolling, hasRolled, winner]);

  const passTurn = useCallback(
    (extraTurn: boolean = false) => {
      setHasRolled(false);
      setDiceVal(null);
      if (!extraTurn) {
        setCurrentTurnIdx((prev) => (prev + 1) % players.length);
      }
    },
    [players.length],
  );

  const moveToken = useCallback(
    (token: Token, roll: number) => {
      if (!curPlayer || !diceVal) return;

      let newStep = token.step;
      if (token.step === -1 && roll === 6) {
        newStep = 0;
        soundFx.playLadderClimb();
        logMessage(`🚀 ${curPlayer.name} released a token onto the track!`);
      } else {
        newStep = token.step + roll;
        soundFx.playCardFlip();
        logMessage(`${curPlayer.name} advanced a token ${roll} tiles.`);
      }

      let reachedHome = false;
      if (newStep === 57) {
        reachedHome = true;
        soundFx.playLadderClimb();
        logMessage(`🎯 ${curPlayer.name}'s token entered the HOME SANCTUARY!`);
      }

      let cutOpponent = false;
      if (newStep >= 0 && newStep <= 50) {
        const myGlobalPos = (PLAYER_THEMES[curPlayer.color].startPos + newStep) % 52;
        const isSafe = SAFE_POSITIONS.has(myGlobalPos);

        if (!isSafe) {
          setPlayers((prev) =>
            prev.map((p) => {
              if (p.color === curPlayer.color) return p;
              return {
                ...p,
                tokens: p.tokens.map((oppToken) => {
                  if (oppToken.step >= 0 && oppToken.step <= 50) {
                    const oppGlobalPos = (PLAYER_THEMES[oppToken.color].startPos + oppToken.step) % 52;
                    if (oppGlobalPos === myGlobalPos) {
                      cutOpponent = true;
                      soundFx.playTokenCut();
                      logMessage(`⚔️ ${curPlayer.name} captured ${p.name}'s token back to base!`);
                      return { ...oppToken, step: -1 };
                    }
                  }
                  return oppToken;
                }),
              };
            }),
          );
        }
      }

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.color === curPlayer.color) {
            const updatedTokens = p.tokens.map((t) => (t.id === token.id ? { ...t, step: newStep } : t));
            const homeCount = updatedTokens.filter((t) => t.step === 57).length;
            return {
              ...p,
              tokens: updatedTokens,
              tokensHome: homeCount,
            };
          }
          return p;
        }),
      );

      const finalHomeCount = curPlayer.tokensHome + (reachedHome ? 1 : 0);
      if (finalHomeCount === 4) {
        setWinner(curPlayer);
        logMessage(`🏆 ${curPlayer.name} brought all 4 tokens home and claimed victory!`);
        return;
      }

      const extraTurn = roll === 6 || cutOpponent;
      if (extraTurn) {
        logMessage(`✨ Bonus turn awarded to ${curPlayer.name}!`);
        setHasRolled(false);
        setDiceVal(null);
      } else {
        passTurn(false);
      }
    },
    [curPlayer, diceVal, logMessage, passTurn],
  );

  const handleTokenClick = useCallback(
    (token: Token) => {
      if (!curPlayer || curPlayer.isBot || winner) return;
      if (!hasRolled || diceVal === null) return;
      if (!canMoveToken(token, diceVal)) return;
      moveToken(token, diceVal);
    },
    [curPlayer, winner, hasRolled, diceVal, canMoveToken, moveToken],
  );

  const handleRollClick = useCallback(() => {
    if (!curPlayer || curPlayer.isBot || winner) return;
    rollDice();
  }, [curPlayer, winner, rollDice]);

  // Bot automation loop
  useEffect(() => {
    if (winner || inLobby || !curPlayer || !curPlayer.isBot) {
      clearTimers();
      return;
    }

    if (!hasRolled && !isRolling) {
      const timer = setTimeout(() => {
        rollDice();
      }, 1800);
      pushTimer(timer);
      return clearTimers;
    }

    if (hasRolled && diceVal !== null && curPlayer) {
      const movableTokens = curPlayer.tokens.filter((t) => canMoveToken(t, diceVal));
      if (movableTokens.length > 0) {
        const timer = setTimeout(() => {
          const baseToken = movableTokens.find((t) => t.step === -1);
          const chosen = diceVal === 6 && baseToken ? baseToken : movableTokens[0];
          moveToken(chosen, diceVal);
        }, 1600);
        pushTimer(timer);
        return clearTimers;
      } else {
        const timer = setTimeout(() => {
          passTurn(false);
        }, 1500);
        pushTimer(timer);
        return clearTimers;
      }
    }
  }, [curPlayer, hasRolled, isRolling, diceVal, winner, inLobby, rollDice, moveToken, passTurn, canMoveToken, clearTimers, pushTimer]);

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="ludo"
        gameTitle="Royal Pachisi Court (Ludo)"
        gameIcon="🎲"
        minPlayers={2}
        maxPlayers={4}
        onStart={startMatchFromRoom}
      />
    );
  }

  // Token rendering helper
  const renderInteractiveToken = (tok: Token, isHumanTurn: boolean) => {
    const ownedByCur = curPlayer?.color === tok.color;
    const isMovable = ownedByCur && hasRolled && diceVal !== null && canMoveToken(tok, diceVal) && isHumanTurn;
    const theme = PLAYER_THEMES[tok.color];

    return (
      <button
        key={tok.id}
        onClick={() => handleTokenClick(tok)}
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: theme.gradient,
          border: isMovable ? '2.5px solid #fbbf24' : '2px solid rgba(255,255,255,0.7)',
          boxShadow: isMovable
            ? '0 0 16px #fbbf24, inset 0 1px 2px rgba(255,255,255,0.8)'
            : '0 4px 8px rgba(0,0,0,0.6)',
          cursor: isMovable ? 'pointer' : 'default',
          transform: isMovable ? 'scale(1.18)' : 'none',
          animation: isMovable ? 'turnRingPulse 1.2s infinite ease-in-out' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 900,
          padding: 0,
          zIndex: isMovable ? 10 : 2,
        }}
        title={`${theme.name} Token #${tok.id + 1} (${tok.step === -1 ? 'Base' : tok.step === 57 ? 'Home' : `Step ${tok.step}`})`}
      >
        {tok.step === 57 ? '★' : tok.id + 1}
      </button>
    );
  };

  // Build lookup of tokens by board cell coordinate
  const cellTokensMap = new Map<string, Token[]>();
  players.forEach((p) => {
    p.tokens.forEach((tok) => {
      if (tok.step >= 0 && tok.step <= 50) {
        const globalPos = (PLAYER_THEMES[tok.color].startPos + tok.step) % 52;
        const [r, c] = GLOBAL_TRACK_COORDS[globalPos];
        const key = `${r}-${c}`;
        const arr = cellTokensMap.get(key) || [];
        arr.push(tok);
        cellTokensMap.set(key, arr);
      } else if (tok.step >= 51 && tok.step <= 56) {
        const stretchIdx = tok.step - 51;
        const [r, c] = HOME_STRETCH_COORDS[tok.color][stretchIdx];
        const key = `${r}-${c}`;
        const arr = cellTokensMap.get(key) || [];
        arr.push(tok);
        cellTokensMap.set(key, arr);
      }
    });
  });

  const isHumanTurn = curPlayer && !curPlayer.isBot;

  // Yard Section renderer
  const renderYard = (color: PlayerColor, placement: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    const p = players.find((pl) => pl.color === color);
    const theme = PLAYER_THEMES[color];
    const isMyYard = curPlayer?.color === color;
    const baseTokens = p?.tokens.filter((t) => t.step === -1) || [];

    const colRange = placement === 'top-left' || placement === 'bottom-left' ? '1 / 7' : '10 / 16';
    const rowRange = placement === 'top-left' || placement === 'top-right' ? '1 / 7' : '10 / 16';

    return (
      <div
        style={{
          gridColumn: colRange,
          gridRow: rowRange,
          background: `linear-gradient(135deg, rgba(14, 19, 32, 0.95) 0%, rgba(8, 12, 20, 0.98) 100%)`,
          border: isMyYard ? `2px solid ${theme.hex}` : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: isMyYard ? `0 0 25px ${theme.hex}44` : 'inset 0 2px 10px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Color Accent Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: theme.gradient,
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px' }}>{theme.badge}</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
              {p?.name || theme.name}
            </span>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#fbbf24',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {p?.tokensHome ?? 0}/4 🏆
          </span>
        </div>

        {/* 4 Pedestals for Base Tokens */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            background: 'rgba(0, 0, 0, 0.45)',
            padding: '14px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            justifyItems: 'center',
            alignItems: 'center',
          }}
        >
          {baseTokens.map((tok) => renderInteractiveToken(tok, isHumanTurn))}
          {Array.from({ length: 4 - baseTokens.length }).map((_, i) => (
            <div
              key={`pedestal-${i}`}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            />
          ))}
        </div>
      </div>
    );
  };

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
      <VoiceRoomBar gameTitle="Royal Pachisi Court (Ludo)" turnRestricted={false} />

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
            <span>🎲</span>
            <span>Royal Pachisi Court</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Active Crown:{' '}
            <strong style={{ color: curPlayer ? PLAYER_THEMES[curPlayer.color].hex : '#ffffff' }}>
              {curPlayer?.name} {curPlayer ? PLAYER_THEMES[curPlayer.color].badge : ''}
            </strong>
          </div>
        </div>

        <button
          onClick={startMatchFromRoom}
          className="btn-tactile-secondary"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            color: '#34d399',
            borderColor: 'rgba(16, 185, 129, 0.3)',
          }}
        >
          🔄 Restart Court
        </button>
      </div>

      {/* Main Arena Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* 15x15 Royal Pachisi Stone Board */}
        <div
          className="glass-panel"
          style={{
            aspectRatio: '1/1',
            maxHeight: 'min(760px, calc(100vh - 200px))',
            margin: '0 auto',
            width: '100%',
            background: 'radial-gradient(ellipse at center, #0e1422 0%, #060911 100%)',
            border: '2px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '24px',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(15, 1fr)',
            gridTemplateRows: 'repeat(15, 1fr)',
            gap: '3px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(0, 0, 0, 0.7)',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          {/* 4 Quadrant Yards */}
          {renderYard('red', 'top-left')}
          {renderYard('green', 'top-right')}
          {renderYard('blue', 'bottom-left')}
          {renderYard('yellow', 'bottom-right')}

          {/* Central Golden Sanctuary (Rows 7-9, Cols 7-9) */}
          <div
            style={{
              gridColumn: '7 / 10',
              gridRow: '7 / 10',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(10, 14, 24, 0.95) 100%)',
              border: '2px solid #fbbf24',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(245, 158, 11, 0.35)',
              position: 'relative',
              zIndex: 3,
            }}
          >
            <span style={{ fontSize: '28px', filter: 'drop-shadow(0 2px 8px rgba(245,158,11,0.6))' }}>🏆</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 900,
                color: '#fbbf24',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginTop: '4px',
              }}
            >
              SANCTUM
            </span>
          </div>

          {/* Render All Track Cells (Rows 0-14, Cols 0-14) */}
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((__, c) => {
              // Skip inside the 4 yards (6x6 corners) and center (3x3)
              const inTopLeft = r < 6 && c < 6;
              const inTopRight = r < 6 && c >= 9;
              const inBottomLeft = r >= 9 && c < 6;
              const inBottomRight = r >= 9 && c >= 9;
              const inCenter = r >= 6 && r < 9 && c >= 6 && c < 9;

              if (inTopLeft || inTopRight || inBottomLeft || inBottomRight || inCenter) {
                return null;
              }

              // Check if safe position
              const globalIdx = GLOBAL_TRACK_COORDS.findIndex(([gr, gc]) => gr === r && gc === c);
              const isSafe = globalIdx !== -1 && SAFE_POSITIONS.has(globalIdx);

              // Check if home stretch
              const isRedHomeStretch = r === 7 && c >= 1 && c <= 5;
              const isGreenHomeStretch = c === 7 && r >= 1 && r <= 5;
              const isYellowHomeStretch = r === 7 && c >= 9 && c <= 13;
              const isBlueHomeStretch = c === 7 && r >= 9 && r <= 13;

              const cellTokens = cellTokensMap.get(`${r}-${c}`) || [];

              return (
                <div
                  key={`cell-${r}-${c}`}
                  style={{
                    gridColumn: `${c + 1} / ${c + 2}`,
                    gridRow: `${r + 1} / ${r + 2}`,
                    background: isRedHomeStretch
                      ? 'rgba(239, 68, 68, 0.35)'
                      : isGreenHomeStretch
                      ? 'rgba(16, 185, 129, 0.35)'
                      : isYellowHomeStretch
                      ? 'rgba(245, 158, 11, 0.35)'
                      : isBlueHomeStretch
                      ? 'rgba(59, 130, 246, 0.35)'
                      : isSafe
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: isSafe
                      ? '1px solid rgba(245, 158, 11, 0.45)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {isSafe && cellTokens.length === 0 && (
                    <span style={{ fontSize: '10px', color: '#fbbf24', opacity: 0.8 }}>★</span>
                  )}
                  {cellTokens.map((tok) => renderInteractiveToken(tok, isHumanTurn))}
                </div>
              );
            }),
          )}
        </div>

        {/* Dice & Tactical Controls Dock */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              Ivory Dice Crucible
            </span>

            {/* 3D Dice */}
            <div
              onClick={handleRollClick}
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '20px',
                background: curPlayer ? PLAYER_THEMES[curPlayer.color].gradient : '#1e293b',
                border: '3px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '44px',
                fontWeight: 900,
                color: '#ffffff',
                boxShadow: `0 12px 28px rgba(0,0,0,0.7), 0 0 25px ${
                  curPlayer ? PLAYER_THEMES[curPlayer.color].hex : '#7c3aed'
                }55`,
                cursor: curPlayer && !curPlayer.isBot && !hasRolled ? 'pointer' : 'default',
                transform: isRolling ? 'rotate(35deg) scale(0.92)' : 'none',
                transition: 'all 0.12s ease',
              }}
            >
              {diceVal || '🎲'}
            </div>

            {curPlayer && !curPlayer.isBot && (
              <button
                onClick={handleRollClick}
                disabled={hasRolled || isRolling}
                className="btn-primary-glow"
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '14px',
                  background: hasRolled
                    ? '#334155'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: hasRolled ? 'none' : '0 6px 20px rgba(16, 185, 129, 0.4)',
                }}
              >
                {isRolling ? 'Casting Dice...' : hasRolled ? 'Tap Glowing Token!' : 'Cast Ivory Dice 🎲'}
              </button>
            )}

            {winner && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: '#34d399',
                  fontSize: '13px',
                  fontWeight: 900,
                }}
              >
                🏆 {winner.name} Claimed the Royal Crown!
              </div>
            )}
          </div>

          {/* Action Log */}
          <div
            className="glass-card"
            style={{
              padding: '14px 18px',
              fontSize: '12px',
              color: '#94a3b8',
              maxHeight: '190px',
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
              ⚔️ Court Chronicle:
            </strong>
            {gameLog.map((log, i) => (
              <div
                key={i}
                style={{
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
