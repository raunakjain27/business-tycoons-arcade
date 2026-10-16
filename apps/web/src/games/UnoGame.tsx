import React, { useCallback, useEffect, useState } from 'react';
import { DESIGN_SYSTEM } from '../designSystem';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { useUnoGame, UnoPlayer } from './unoGameLogic';
import { useCelebrationStore } from '../celebrationStore';

const COLOR_MAP: Record<
  'red' | 'blue' | 'green' | 'yellow' | 'wild',
  { bg: string; text: string; border: string; glow: string; badge: string }
> = {
  red: {
    bg: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
    text: '#ffffff',
    border: '#f87171',
    glow: 'rgba(239, 68, 68, 0.7)',
    badge: '🔴',
  },
  blue: {
    bg: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    text: '#ffffff',
    border: '#60a5fa',
    glow: 'rgba(59, 130, 246, 0.7)',
    badge: '🔵',
  },
  green: {
    bg: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
    text: '#ffffff',
    border: '#34d399',
    glow: 'rgba(16, 185, 129, 0.7)',
    badge: '🟢',
  },
  yellow: {
    bg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
    text: '#1e293b',
    border: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.7)',
    badge: '🟡',
  },
  wild: {
    bg:
      'linear-gradient(135deg, #ef4444 25%, #3b82f6 25%, #3b82f6 50%, #f59e0b 50%, #f59e0b 75%, #10b981 75%)',
    text: '#ffffff',
    border: '#e879f9',
    glow: 'rgba(168, 85, 247, 0.85)',
    badge: '🌈',
  },
};

interface LobbyPlayer {
  id?: string;
  name?: string;
  avatar?: string;
  isBot?: boolean;
  color?: string;
}

function initialPlayersFromRoom(room: { players: LobbyPlayer[] }): UnoPlayer[] {
  if (room.players.length >= 2) {
    return makeUnoPlayers(room.players);
  }
  return makeUnoPlayers([
    { id: 'p1', name: 'You (Champion)', isBot: false, avatar: '👑', color: '#ec4899' },
    { id: 'p2', name: 'Bot Alex 🤖', isBot: true, avatar: '🤖', color: '#3b82f6' },
  ]);
}

function makeUnoPlayers(lobby: LobbyPlayer[]): UnoPlayer[] {
  return lobby.map((p) => ({
    id: p.id ?? `p-${Math.random().toString(36).substring(2, 8)}`,
    name: p.name ?? 'Player',
    avatar: p.avatar ?? '👤',
    isBot: p.isBot ?? false,
    color: p.color ?? '#888',
    cards: [],
    calledUno: false,
  }));
}

export const UnoGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice, disconnectVoice } = useVoiceStore();
  const room = getOrCreateRoom('uno', 'You (Host)', 8, 2);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const game = useUnoGame(initialPlayersFromRoom(room), room.roomCode);

  const startMatchFromRoom = useCallback(() => {
    disconnectVoice();
    const players = initialPlayersFromRoom(room);
    game.resetFromPlayers(players);
    connectVoice(players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    setInLobby(false);
  }, [room, game, connectVoice, disconnectVoice]);

  const goToLobby = useCallback(() => {
    setInLobby(true);
    disconnectVoice();
  }, [disconnectVoice]);

  useEffect(() => {
    if (inLobby && game.players.length > 0) {
      disconnectVoice();
    }
  }, [inLobby, game.players, disconnectVoice]);

  useEffect(() => {
    if (game.winner) {
      useCelebrationStore.getState().triggerVictory({
        gameTitle: 'Color Clash (UNO)',
        winnerName: game.winner.name,
        winnerAvatar: game.winner.avatar || '👑',
        coinsAwarded: 150,
        xpAwarded: 180,
        reason: `${game.winner.name} emptied their hand first and claimed the Uno championship!`,
      });
    }
  }, [game.winner]);

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="uno"
        gameTitle="Color Blitz (One Card)"
        gameIcon="🃏"
        minPlayers={2}
        maxPlayers={8}
        bannerGradient={`linear-gradient(135deg, ${DESIGN_SYSTEM.colors.caution} 0%, ${DESIGN_SYSTEM.colors.accent} 100%)`}
        onStart={startMatchFromRoom}
      />
    );
  }

  const curPlayer = game.players[game.currentPlayerIdx];
  const isHumanTurn = curPlayer && !curPlayer.isBot;
  const topCard = game.topCard;

  const pickWildColor = useCallback(
    (color: 'red' | 'blue' | 'green' | 'yellow') => {
      game.pickWildColor(color);
    },
    [game],
  );

  const renderCardContent = (color: 'red' | 'blue' | 'green' | 'yellow' | 'wild', value: string) => {
    const isSpecial = ['skip', 'reverse', 'draw2', 'draw4', 'wild'].includes(value);
    const symbol =
      value === 'skip'
        ? '🚫'
        : value === 'reverse'
        ? '🔄'
        : value === 'draw2'
        ? '+2'
        : value === 'draw4'
        ? '+4'
        : value === 'wild'
        ? '🌈'
        : value;

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontWeight: 900,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          <span>{value.toUpperCase()}</span>
          <span>{COLOR_MAP[color].badge}</span>
        </div>

        <div
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(240,240,250,0.85) 100%)',
            transform: 'rotate(-25deg)',
            borderRadius: '50%',
            height: '62px',
            margin: '2px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              '0 4px 10px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.8)',
            border: '2px solid rgba(255,255,255,0.6)',
          }}
        >
          <span
            style={{
              fontSize: isSpecial ? '26px' : '36px',
              fontWeight: 900,
              color:
                color === 'yellow'
                  ? '#d97706'
                  : color === 'wild'
                  ? '#9333ea'
                  : color === 'green'
                  ? '#047857'
                  : color === 'blue'
                  ? '#1d4ed8'
                  : '#b91c1c',
              transform: 'rotate(25deg)',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {symbol}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontWeight: 900,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          <span>{COLOR_MAP[color].badge}</span>
          <span>{value.toUpperCase()}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <VoiceRoomBar gameTitle="Color Blitz (One Card)" turnRestricted={false} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)',
          padding: '14px 22px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <button
          onClick={goToLobby}
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
          <h2
            style={{
              margin: 0,
              fontSize: '22px',
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
            }}
          >
            <span>🃏</span> UNO Champions Deluxe
          </h2>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Rotation:{' '}
            {game.direction === 1 ? 'Clockwise ↻' : 'Counter-Clockwise ↺'}{' '}
            | Active Color:{' '}
            <strong
              style={{
                color: COLOR_MAP[game.activeColor]?.border || '#ef4444',
                textTransform: 'uppercase',
              }}
            >
              {game.activeColor} {COLOR_MAP[game.activeColor]?.badge}
            </strong>
          </span>
        </div>

        <button
          onClick={game.handleRestart}
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '12px',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
          }}
        >
          Restart Match
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '14px',
        }}
      >
        {game.players.map((p, idx) => {
          if (idx === 0) return null;
          const isTurn = curPlayer?.id === p.id;
          return (
            <div
              key={p.id}
              style={{
                background: isTurn
                  ? 'rgba(124, 58, 237, 0.35)'
                  : 'rgba(30, 24, 55, 0.7)',
                border: isTurn
                  ? '2px solid #c084fc'
                  : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isTurn
                  ? '0 0 25px rgba(192, 132, 252, 0.4)'
                  : 'none',
                transform: isTurn ? 'scale(1.04)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '20px' }}>{p.avatar}</span>
                <strong
                  style={{
                    fontSize: '13px',
                    color: isTurn ? '#f8fafc' : '#cbd5e1',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </strong>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    fontWeight: 800,
                  }}
                >
                  {p.cards.length}🎴
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '-12px',
                  height: '44px',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                {p.cards.slice(0, 7).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '28px',
                      height: '42px',
                      background: 'radial-gradient(circle, #0f172a 0%, #000 100%)',
                      border: '1.5px solid #ef4444',
                      borderRadius: '5px',
                      marginLeft: i > 0 ? '-14px' : '0',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f59e0b',
                      fontSize: '11px',
                      fontWeight: 900,
                    }}
                  >
                    U
                  </div>
                ))}
                {p.cards.length > 7 && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      marginLeft: '6px',
                      fontWeight: 700,
                    }}
                  >
                    +{p.cards.length - 7}
                  </span>
                )}
              </div>

              {p.cards.length === 1 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 900,
                    animation: 'pulse 1s infinite',
                    boxShadow: '0 0 10px #ef4444',
                  }}
                >
                  UNO! ⚡
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #070410 100%)',
          borderRadius: '28px',
          border: '2px solid rgba(255,255,255,0.14)',
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
          position: 'relative',
          boxShadow:
            '0 30px 80px rgba(0,0,0,0.85), inset 0 0 60px rgba(124, 58, 237, 0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '48px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={isHumanTurn ? game.handleDrawCard : undefined}
            style={{
              width: '98px',
              height: '146px',
              borderRadius: '14px',
              background: 'radial-gradient(ellipse, #1e293b 0%, #090d16 100%)',
              border: isHumanTurn
                ? '3px dashed #a855f7'
                : '2px dashed #475569',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isHumanTurn ? 'pointer' : 'not-allowed',
              boxShadow: isHumanTurn
                ? '0 12px 30px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.2)'
                : '0 10px 20px rgba(0,0,0,0.7)',
              transform: isHumanTurn ? 'scale(1.06)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '34px' }}>🎴</span>
            <span
              style={{
                fontSize: '12px',
                color: '#c084fc',
                fontWeight: 900,
                marginTop: '4px',
              }}
            >
              DRAW
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              ({game.deck.length} left)
            </span>
          </div>

          {topCard && (
            <div
              style={{
                width: '110px',
                height: '164px',
                borderRadius: '16px',
                background: COLOR_MAP[topCard.color]?.bg || '#ef4444',
                border: '3px solid #ffffff',
                padding: '10px',
                boxShadow: `0 20px 45px rgba(0,0,0,0.85), 0 0 40px ${
                  COLOR_MAP[topCard.color]?.glow || '#ef4444'
                }`,
                color: '#ffffff',
                fontWeight: 900,
                boxSizing: 'border-box',
                animation: game.lastPlayedAnim ? 'bounce 0.5s ease' : 'none',
              }}
            >
              {renderCardContent(topCard.color, topCard.value)}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: '14.5px',
            color: '#f8fafc',
            fontWeight: 800,
            background: 'rgba(0,0,0,0.6)',
            padding: '10px 24px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          }}
        >
          {game.winner ? (
            `🏆 ${game.winner.name} Won the Game!`
          ) : isHumanTurn ? (
            '👉 Your turn! Play a matching card or tap DRAW'
          ) : (
            `⏳ Waiting for ${curPlayer?.name}...`
          )}
        </div>
      </div>

      <div
        style={{
          background: 'rgba(30, 24, 55, 0.85)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: '24px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>{game.players[0]?.avatar}</span>
            <strong style={{ fontSize: '16px', color: '#f8fafc' }}>
              Your Hand ({game.players[0]?.cards.length} cards)
            </strong>
          </div>

          {game.players[0]?.cards.length === 2 && (
            <button
              onClick={game.handleCallUno}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                color: '#fff',
                padding: '8px 22px',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '14px',
                cursor: 'pointer',
                animation: 'pulse 1s infinite',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.7)',
              }}
            >
              CALL UNO! ⚡
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '14px',
          }}
        >
          {game.players[0]?.cards.map((c) => {
            const playable = isHumanTurn && topCard && isCardPlayableLocal(c, topCard, game.activeColor);
            const styleCfg = COLOR_MAP[c.color] || COLOR_MAP.wild;
            return (
              <button
                key={c.id}
                onClick={() => isHumanTurn && game.handlePlayerPlay(c)}
                disabled={!playable}
                style={{
                  minWidth: '88px',
                  height: '132px',
                  borderRadius: '14px',
                  background: styleCfg.bg,
                  border: playable
                    ? '2.5px solid #ffffff'
                    : '1px solid rgba(255,255,255,0.15)',
                  color: styleCfg.text,
                  padding: '8px',
                  cursor: playable ? 'pointer' : 'not-allowed',
                  opacity: playable ? 1 : 0.45,
                  transform: playable
                    ? 'translateY(-10px) scale(1.06)'
                    : 'none',
                  transition: 'all 0.18s ease',
                  boxShadow: playable
                    ? `0 12px 25px rgba(0,0,0,0.7), 0 0 20px ${styleCfg.glow}`
                    : 'none',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
              >
                {renderCardContent(c.color, c.value)}
              </button>
            );
          })}
        </div>
      </div>

      {game.lastPlayedAnim === null && false && null}

      <div
        style={{
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '16px',
          padding: '14px 18px',
          fontSize: '12px',
          color: '#94a3b8',
          maxHeight: '110px',
          overflowY: 'auto',
        }}
      >
        <strong
          style={{
            color: '#c084fc',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          ⚡ Live Match Feed:
        </strong>
        {game.gameLog.map((log, i) => (
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
  );
};

function isCardPlayableLocal(card: { color: string; value: string }, topCard: { color: string; value: string }, activeColor: string): boolean {
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}
