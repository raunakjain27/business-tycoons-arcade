import React, { useCallback, useEffect, useState } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { useUnoGame, UnoPlayer, UnoCard } from './unoGameLogic';
import { useCelebrationStore } from '../celebrationStore';

const COLOR_MAP: Record<
  'red' | 'blue' | 'green' | 'yellow' | 'wild',
  { bg: string; text: string; border: string; glow: string; badge: string; name: string }
> = {
  red: {
    bg: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
    text: '#ffffff',
    border: '#f87171',
    glow: 'rgba(239, 68, 68, 0.65)',
    badge: '🔴',
    name: 'Crimson Ruby',
  },
  blue: {
    bg: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    text: '#ffffff',
    border: '#60a5fa',
    glow: 'rgba(59, 130, 246, 0.65)',
    badge: '🔵',
    name: 'Cobalt Sapphire',
  },
  green: {
    bg: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
    text: '#ffffff',
    border: '#34d399',
    glow: 'rgba(16, 185, 129, 0.65)',
    badge: '🟢',
    name: 'Emerald Jade',
  },
  yellow: {
    bg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
    text: '#1e293b',
    border: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.65)',
    badge: '🟡',
    name: 'Solar Amber',
  },
  wild: {
    bg: 'linear-gradient(135deg, #ef4444 25%, #3b82f6 25%, #3b82f6 50%, #f59e0b 50%, #f59e0b 75%, #10b981 75%)',
    text: '#ffffff',
    border: '#e879f9',
    glow: 'rgba(168, 85, 247, 0.8)',
    badge: '🌈',
    name: 'Prismatic Wild',
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
    { id: 'p1', name: 'You (High Roller)', isBot: false, avatar: '👑', color: '#fbbf24' },
    { id: 'p2', name: 'Bot Alex 🤖', isBot: true, avatar: '🤖', color: '#38bdf8' },
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
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const game = useUnoGame(initialPlayersFromRoom(room), room.roomCode);

  const resetRoomForGame = useGameRoomStore((s) => s.resetRoomFor);

  const startMatchFromRoom = useCallback(() => {
    disconnectVoice();
    resetRoomForGame('uno');
    const players = initialPlayersFromRoom(room);
    game.resetFromPlayers(players);
    connectVoice(players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    setInLobby(false);
  }, [room, game, connectVoice, disconnectVoice, resetRoomForGame]);

  // Keep lobby-button behavior faithful: only route to lobby when game is really in lobby.
  const goToLobby = useCallback(() => {
    setInLobby(true);
    disconnectVoice();
  }, [disconnectVoice]);

  useEffect(() => {
    if (inLobby) {
      disconnectVoice();
    }
  }, [inLobby]);

  useEffect(() => {
    if (game.winner) {
      useCelebrationStore.getState().triggerVictory({
        gameTitle: 'Color Blitz (UNO)',
        winnerName: game.winner.name,
        winnerAvatar: game.winner.avatar || '👑',
        coinsAwarded: 150,
        xpAwarded: 180,
        reason: `${game.winner.name} cleared their hand first to claim the VIP Salon Trophy!`,
      });
    }
  }, [game.winner]);

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="uno"
        gameTitle="Color Blitz (UNO Salon)"
        gameIcon="🃏"
        minPlayers={2}
        maxPlayers={8}
        onStart={startMatchFromRoom}
      />
    );
  }

  const curPlayer = game.players[game.currentPlayerIdx];
  const isHumanTurn = curPlayer && !curPlayer.isBot;
  const topCard = game.topCard;

  const handleCardClick = (card: UnoCard) => {
    if (!isHumanTurn) return;
    if (card.color === 'wild') {
      setPendingWildCard(card);
      game.handlePlayerPlay(card);
    } else {
      game.handlePlayerPlay(card);
    }
  };

  const handleSelectWildGem = (color: 'red' | 'blue' | 'green' | 'yellow') => {
    game.pickWildColor(color);
    setPendingWildCard(null);
  };

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
        ? '✦'
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
          userSelect: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 900,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          <span>{value.toUpperCase()}</span>
          <span>{COLOR_MAP[color].badge}</span>
        </div>

        <div
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(230,235,245,0.85) 100%)',
            transform: 'rotate(-25deg)',
            borderRadius: '50%',
            height: '56px',
            margin: '2px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.8)',
            border: '1.5px solid rgba(255,255,255,0.6)',
          }}
        >
          <span
            style={{
              fontSize: isSpecial ? '24px' : '32px',
              fontWeight: 900,
              color:
                color === 'yellow'
                  ? '#d97706'
                  : color === 'wild'
                  ? '#7c3aed'
                  : color === 'green'
                  ? '#047857'
                  : color === 'blue'
                  ? '#1d4ed8'
                  : '#b91c1c',
              transform: 'rotate(25deg)',
              fontFamily: 'Outfit, system-ui, sans-serif',
              textShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            {symbol}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 900,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
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
        maxWidth: '1140px',
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <VoiceRoomBar gameTitle="Color Blitz VIP Salon" turnRestricted={false} />

      {/* Top Salon Navigation Bar */}
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
          onClick={goToLobby}
          className="btn-tactile-secondary"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⚙️</span>
          <span>Salon Lobby ({room.roomCode})</span>
        </button>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>🃏</span>
            <span>Color Blitz • VIP Salon</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <span>
              Rotation: <strong style={{ color: '#f8fafc' }}>{game.direction === 1 ? 'Clockwise ↻' : 'Counter-Clockwise ↺'}</strong>
            </span>
            <span>•</span>
            <span>
              Active Gem:{' '}
              <strong
                style={{
                  color: COLOR_MAP[game.activeColor]?.border || '#ef4444',
                  textTransform: 'uppercase',
                }}
              >
                {COLOR_MAP[game.activeColor]?.name || game.activeColor} {COLOR_MAP[game.activeColor]?.badge}
              </strong>
            </span>
          </div>
        </div>

        <button
          onClick={game.handleRestart}
          className="btn-tactile-secondary"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            color: '#fb7185',
            borderColor: 'rgba(244, 63, 94, 0.3)',
          }}
        >
          🔄 Reshuffle
        </button>
      </div>

      {/* Opponent Seats Rail */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {game.players.map((p, idx) => {
          if (idx === 0) return null;
          const isTurn = curPlayer?.id === p.id;
          return (
            <div
              key={p.id}
              className="glass-card"
              style={{
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '14px',
                border: isTurn
                  ? '1.5px solid #38bdf8'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: isTurn
                  ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(14, 19, 32, 0.85) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                boxShadow: isTurn ? '0 0 20px rgba(56, 189, 248, 0.25)' : 'none',
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
                <span style={{ fontSize: '18px' }}>{p.avatar}</span>
                <strong
                  style={{
                    fontSize: '12.5px',
                    color: isTurn ? '#ffffff' : '#cbd5e1',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    textAlign: 'left',
                    marginLeft: '4px',
                  }}
                >
                  {p.name}
                </strong>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#fbbf24',
                    fontWeight: 800,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {p.cards.length}🎴
                </span>
              </div>

              {/* Fanned Mini Card Backs */}
              <div
                style={{
                  display: 'flex',
                  gap: '-10px',
                  height: '36px',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                {p.cards.slice(0, 6).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '24px',
                      height: '34px',
                      background: 'radial-gradient(circle, #1e293b 0%, #090d16 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      borderRadius: '4px',
                      marginLeft: i > 0 ? '-12px' : '0',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fbbf24',
                      fontSize: '9px',
                      fontWeight: 900,
                    }}
                  >
                    ✦
                  </div>
                ))}
                {p.cards.length > 6 && (
                  <span style={{ fontSize: '10.5px', color: '#94a3b8', marginLeft: '6px', fontWeight: 700 }}>
                    +{p.cards.length - 6}
                  </span>
                )}
              </div>

              {p.cards.length === 1 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '10px',
                    fontWeight: 900,
                    letterSpacing: '0.6px',
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

      {/* Main Table Felt Arena */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          background: 'radial-gradient(ellipse at center, #0d2824 0%, #081a17 55%, #050d0c 100%)',
          borderRadius: '28px',
          border: '2px solid rgba(245, 158, 11, 0.25)',
          padding: '36px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), inset 0 0 60px rgba(16, 185, 129, 0.1)',
        }}
      >
        {/* Draw Pile & Active Discard */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {/* 3D Draw Deck */}
          <div
            onClick={isHumanTurn ? game.handleDrawCard : undefined}
            style={{
              width: '100px',
              height: '148px',
              borderRadius: '16px',
              background: 'radial-gradient(ellipse, #1e293b 0%, #090d16 100%)',
              border: isHumanTurn
                ? '2.5px dashed #38bdf8'
                : '2px dashed rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isHumanTurn ? 'pointer' : 'not-allowed',
              boxShadow: isHumanTurn
                ? '0 12px 30px rgba(56, 189, 248, 0.35), 0 0 20px rgba(56, 189, 248, 0.2)'
                : '0 8px 18px rgba(0, 0, 0, 0.6)',
              transform: isHumanTurn ? 'scale(1.05)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span style={{ fontSize: '32px' }}>🎴</span>
            <span
              style={{
                fontSize: '12px',
                color: '#38bdf8',
                fontWeight: 900,
                marginTop: '4px',
                letterSpacing: '0.8px',
              }}
            >
              DRAW
            </span>
            <span
              style={{
                fontSize: '10px',
                color: '#64748b',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              ({game.deck.length} remaining)
            </span>
          </div>

          {/* Active Discard Top Card */}
          {topCard && (
            <div
              style={{
                width: '112px',
                height: '166px',
                borderRadius: '18px',
                background: COLOR_MAP[topCard.color]?.bg || '#ef4444',
                border: '3px solid #ffffff',
                padding: '10px',
                boxShadow: `0 20px 50px rgba(0, 0, 0, 0.85), 0 0 35px ${
                  COLOR_MAP[topCard.color]?.glow || '#ef4444'
                }`,
                color: '#ffffff',
                fontWeight: 900,
                boxSizing: 'border-box',
                animation: game.lastPlayedAnim ? 'bouncePeg 0.4s ease' : 'none',
              }}
            >
              {renderCardContent(topCard.color, topCard.value)}
            </div>
          )}
        </div>

        {/* Status Callout Ticker */}
        <div
          style={{
            fontSize: '14px',
            color: '#f8fafc',
            fontWeight: 800,
            background: 'rgba(5, 12, 10, 0.85)',
            padding: '10px 24px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {game.winner ? (
            <span style={{ color: '#fbbf24' }}>🏆 {game.winner.name} won the salon tournament!</span>
          ) : isHumanTurn ? (
            <span style={{ color: '#38bdf8' }}>👉 Your turn! Play a matching color/value or tap DRAW</span>
          ) : (
            <span style={{ color: '#94a3b8' }}>⏳ Awaiting {curPlayer?.name} to deliberate...</span>
          )}
        </div>
      </div>

      {/* Wild Color Gem Selector Modal */}
      {pendingWildCard && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(4, 7, 12, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '32px',
              borderRadius: '24px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)',
              textAlign: 'center',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(245, 158, 11, 0.1)',
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
              Prismatic Wild Card
            </span>
            <h3 style={{ margin: '6px 0 16px 0', fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>
              Select Active Salon Color
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8' }}>
              Choose which gem color the next player must follow:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {(['red', 'blue', 'green', 'yellow'] as const).map((colorKey) => {
                const cfg = COLOR_MAP[colorKey];
                return (
                  <button
                    key={colorKey}
                    onClick={() => handleSelectWildGem(colorKey)}
                    className="glass-card"
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      border: `1.5px solid ${cfg.border}`,
                      background: cfg.bg,
                      color: cfg.text,
                      fontWeight: 900,
                      fontSize: '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: `0 8px 20px ${cfg.glow}`,
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>{cfg.badge}</span>
                    <span>{cfg.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Player's Hand Dealer Rail */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          borderRadius: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>{game.players[0]?.avatar}</span>
            <strong style={{ fontSize: '15px', color: '#f8fafc' }}>
              Your Hand ({game.players[0]?.cards.length} cards)
            </strong>
          </div>

          {game.players[0]?.cards.length === 2 && (
            <button
              onClick={game.handleCallUno}
              className="btn-primary-glow"
              style={{
                padding: '8px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                fontSize: '13.5px',
                letterSpacing: '0.6px',
                boxShadow: '0 0 25px rgba(239, 68, 68, 0.7)',
              }}
            >
              CALL UNO! ⚡
            </button>
          )}
        </div>

        {/* Cards Carousel Strip */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            padding: '12px 6px 16px',
          }}
        >
          {game.players[0]?.cards.map((c) => {
            const playable = isHumanTurn && topCard && isCardPlayableLocal(c, topCard, game.activeColor);
            const styleCfg = COLOR_MAP[c.color] || COLOR_MAP.wild;
            return (
              <button
                key={c.id}
                onClick={() => handleCardClick(c)}
                disabled={!playable}
                style={{
                  minWidth: '92px',
                  height: '138px',
                  borderRadius: '14px',
                  background: styleCfg.bg,
                  border: playable
                    ? '2.5px solid #ffffff'
                    : '1px solid rgba(255,255,255,0.12)',
                  color: styleCfg.text,
                  padding: '8px',
                  cursor: playable ? 'pointer' : 'not-allowed',
                  opacity: playable ? 1 : 0.45,
                  transform: playable ? 'translateY(-8px) scale(1.05)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
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

      {/* Live Match Feed */}
      <div
        className="glass-card"
        style={{
          padding: '14px 18px',
          fontSize: '12px',
          color: '#94a3b8',
          maxHeight: '120px',
          overflowY: 'auto',
        }}
      >
        <strong
          style={{
            color: '#fbbf24',
            display: 'block',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            fontSize: '11px',
          }}
        >
          ⚡ Salon Match Chronicle:
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

function isCardPlayableLocal(
  card: { color: string; value: string },
  topCard: { color: string; value: string },
  activeColor: string,
): boolean {
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}
