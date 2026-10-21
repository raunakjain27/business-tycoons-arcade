import React, { useState } from 'react';
import {
  useHubStore,
  GAME_CATALOG,
  GameMetadata,
  GameId,
} from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useUserStore } from '../userStore';

const CATEGORIES = [
  'All',
  'Strategy',
  'Card Game',
  'Social Deduction',
  'Classic',
  'Party',
];

export const Dashboard: React.FC = () => {
  const {
    activeGame,
    setActiveGame,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
  } = useHubStore();

  const { user, setShowAccountModal } = useUserStore();
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  const filteredGames = GAME_CATALOG.filter((game) => {
    const matchesCategory =
      selectedCategory === 'All' || game.category === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      game.title.toLowerCase().includes(query) ||
      game.description.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const handleJoinByCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = joinCodeInput.trim().toUpperCase();
    if (!trimmed) {
      setJoinError('Please enter a 6-character room code.');
      return;
    }
    if (trimmed.length < 4) {
      setJoinError('Passphrase is too short.');
      return;
    }
    setJoinError('');

    const rooms = useGameRoomStore.getState().rooms;
    let foundGame: GameId | null = null;
    for (const [gid, r] of Object.entries(rooms)) {
      if (r.roomCode === trimmed) {
        foundGame = gid as GameId;
        break;
      }
    }

    const gameToJoin: GameId = foundGame || 'cornerstone';
    const targetRoom = useGameRoomStore.getState().getOrCreateRoom(gameToJoin, 'Host');
    targetRoom.roomCode = trimmed;
    useGameRoomStore.getState().addPlayer(gameToJoin, user.username || 'Friend', false);
    setActiveGame(gameToJoin);
  };

  return (
    <div
      className="dashboard-container"
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        padding: '0 12px 36px',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Metropolitan Arcadia Strip */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          padding: '28px 32px',
          background: 'linear-gradient(135deg, rgba(14, 19, 32, 0.9) 0%, rgba(9, 13, 22, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.6)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: '24px',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Ambient Top Gold Hairline */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #f59e0b 35%, #10b981 70%, transparent 100%)',
          }}
        />

        {/* Brand Headline */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.28)',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#fbbf24',
                  boxShadow: '0 0 6px #fbbf24',
                }}
              />
              The Metropolitan Arcadia
            </span>
            <span style={{ color: '#8492a6', fontSize: '13px' }}>
              Elite Tabletop & Parlor Gaming Salons
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(24px, 3.8vw, 36px)',
              fontWeight: 900,
              color: '#ffffff',
              margin: '0 0 8px 0',
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
            }}
          >
            Curated High-Stakes Tabletop & Parlor Games
          </h1>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '14px',
              margin: 0,
              maxWidth: '720px',
              lineHeight: 1.5,
            }}
          >
            Take your seat at the private tables. Host exclusive sessions for associates or challenge autonomous tactical AI bots with zero setup delay.
          </p>
        </div>

        {/* VIP Account & Quick Utility Dock */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'stretch',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          {/* Executive Profile Capsule */}
          <button
            onClick={() => setShowAccountModal(true)}
            className="glass-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              border: user.isVip
                ? '1px solid rgba(245, 158, 11, 0.45)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              background: user.isVip
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(18, 23, 36, 0.7) 100%)'
                : 'rgba(255, 255, 255, 0.04)',
              boxShadow: user.isVip ? '0 0 20px rgba(245, 158, 11, 0.15)' : 'none',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: user.isVip
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              {user.avatar || '👑'}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '14px',
                }}
              >
                <span>{user.username}</span>
                {user.isVip && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      background: '#fbbf24',
                      color: '#000000',
                      fontWeight: 900,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      letterSpacing: '0.4px',
                    }}
                  >
                    VIP
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    color: '#34d399',
                    fontWeight: 800,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {user.coins.toLocaleString()}
                </span>
                <span>bullion</span>
              </div>
            </div>
          </button>

          {/* Quick Actions Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => {
                const res = useUserStore.getState().claimDailyReward();
                if (res.success) {
                  alert(`🎉 Day ${res.streak} Streak! Claimed +${res.reward} Coins!`);
                } else {
                  alert(`✨ Daily reward already claimed today! Current Streak: ${res.streak} days.`);
                }
              }}
              className="btn-tactile-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '11.5px',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.08)',
              }}
            >
              <span>🔥</span>
              <span>{streakLabel(user.dailyStreak)}</span>
            </button>

            <button
              onClick={() => useUserStore.getState().setShowStoreModal(true)}
              className="btn-primary-glow"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '11.5px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}
            >
              <span>🛍️</span>
              <span>Boutique</span>
            </button>
          </div>
        </div>
      </div>

      {/* Private Room Passphrase Vault Bar */}
      <form
        onSubmit={handleJoinByCode}
        className="glass-card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          background: 'rgba(10, 15, 26, 0.75)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>🔑</span>
          <span style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 800 }}>
            Enter Private Salon:
          </span>
        </div>

        <input
          type="text"
          placeholder="PASSPHRASE"
          value={joinCodeInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setJoinCodeInput(e.target.value.toUpperCase());
            setJoinError('');
          }}
          maxLength={8}
          style={{
            flex: '0 1 160px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '10px',
            padding: '8px 14px',
            color: '#38bdf8',
            fontSize: '14px',
            fontWeight: 800,
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '2px',
            outline: 'none',
          }}
        />

        <button
          type="submit"
          className="btn-primary-glow"
          style={{
            padding: '8px 20px',
            fontSize: '12.5px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)',
          }}
        >
          Unlock & Join
        </button>

        {joinError && (
          <span style={{ color: '#fb7185', fontSize: '12px', fontWeight: 700 }}>
            {joinError}
          </span>
        )}

        <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '12px' }}>
          Got an invite? Paste the 6-character room code to join instantly.
        </span>
      </form>

      {/* Catalog Filtering & Search Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Category Filter Pills */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  border: isSelected
                    ? '1px solid #fbbf24'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.15) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#fbbf24' : '#94a3b8',
                  fontSize: '12.5px',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected
                    ? '0 0 16px rgba(245, 158, 11, 0.2)'
                    : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '260px' }}>
          <input
            type="text"
            placeholder="Search catalogs..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '9px 14px 9px 36px',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.5,
              fontSize: '13px',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
        </div>
      </div>

      {/* Collector-Edition Game Showcase Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: '20px',
        }}
      >
        {filteredGames.map((game) => {
          const isCurrent = activeGame === game.id;
          return (
            <div
              key={game.id}
              data-game-id={game.id}
              className="glass-card"
              onClick={() => setActiveGame(game.id)}
              style={{
                position: 'relative',
                padding: '22px',
                borderRadius: '18px',
                border: isCurrent
                  ? '1.5px solid #fbbf24'
                  : '1px solid rgba(255, 255, 255, 0.09)',
                background: isCurrent
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(14, 19, 32, 0.85) 100%)'
                  : 'linear-gradient(135deg, rgba(20, 26, 42, 0.6) 0%, rgba(11, 16, 27, 0.8) 100%)',
                boxShadow: isCurrent
                  ? '0 12px 36px rgba(245, 158, 11, 0.15), inset 0 0 20px rgba(245, 158, 11, 0.05)'
                  : '0 8px 24px rgba(0, 0, 0, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              {/* Top Accent Rim */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: game.bannerGradient || 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                  borderRadius: '18px 18px 0 0',
                  opacity: 0.8,
                }}
              />

              {/* Game Icon & Category Metadata */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '14px',
                      background: 'rgba(11, 16, 27, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      flexShrink: 0,
                      boxShadow: '0 8px 18px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    {game.icon}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {game.badge && (
                      <span
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {game.badge}
                      </span>
                    )}
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#94a3b8',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {game.category}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: '17.5px',
                    fontWeight: 900,
                    color: '#ffffff',
                    margin: '0 0 6px 0',
                    lineHeight: 1.25,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {game.title}
                </h3>

                {/* Description */}
                <p
                  style={{
                    fontSize: '13px',
                    color: '#94a3b8',
                    lineHeight: 1.45,
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {game.description}
                </p>
              </div>

              {/* Specs & Capabilities Bar */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '12px',
                    color: '#8492a6',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👥</span>
                    <span style={{ fontWeight: 700, color: '#cbd5e1' }}>
                      {game.minPlayers}–{game.maxPlayers} Seated
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 800 }}>★ {game.rating}</span>
                    <span style={{ color: '#475569' }}>•</span>
                    <span>{game.plays} matches</span>
                  </div>
                </div>

                {/* Tactical Actions Strip */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px',
                    paddingTop: '8px',
                  }}
                >
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      useUserStore.getState().openRulesModal(game.id);
                    }}
                    className="btn-tactile-secondary"
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    📖 Rules
                  </button>

                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 900,
                      color: isCurrent ? '#fbbf24' : '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isCurrent ? 'Current Salon' : 'Take Seat'} →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function streakLabel(streak: number | undefined): string {
  const days = streak || 1;
  if (days >= 7) return `🔥 ${days}d streak`;
  if (days >= 3) return `✨ ${days}d streak`;
  return `Streak: ${days}d`;
}
