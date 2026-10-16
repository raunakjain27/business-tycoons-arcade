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
  const { getOrCreateRoom } = useGameRoomStore();
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

  const handleJoinByCode = (e?: Event) => {
    if (e) e.preventDefault();
    const trimmed = joinCodeInput.trim().toUpperCase();
    if (!trimmed) {
      setJoinError('Please enter a 6-character room code.');
      return;
    }
    if (trimmed.length < 4) {
      setJoinError('Room code is too short.');
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

    // Default to Business Tycoons if entering a general room code
    const gameToJoin: GameId = foundGame || 'cornerstone';

    const targetRoom = useGameRoomStore.getState().getOrCreateRoom(gameToJoin, 'Host');
    targetRoom.roomCode = trimmed;
    useGameRoomStore.getState().addPlayer(gameToJoin, user.username || 'Friend', false);
    setActiveGame(gameToJoin);
  };


  return (
    <div
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        padding: '0 8px 24px',
      }}
    >
      {/* Top strip: headline + account + quick join */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Headline */}
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
                color: '#f472b6',
                background: 'rgba(236, 72, 153, 0.14)',
                border: '1px solid rgba(236, 72, 153, 0.35)',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '11.5px',
                fontWeight: 800,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
              }}
            >
              🕹️ Arcade Hub
            </span>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
              Play with smart bots or invite friends to a private room
            </span>
          </div>

          <h1
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#ffffff',
              margin: '0 0 6px 0',
              letterSpacing: '-0.4px',
              lineHeight: 1.1,
            }}
          >
            Choose a game to play
          </h1>

          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Each game opens its own room. Host a private room or jump in with
            bots and play instantly.
          </p>
        </div>

        {/* Account + quick actions rail */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'stretch',
            flexShrink: 0,
          }}
        >
          {/* Account card */}
          <button
            onClick={() => setShowAccountModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: user.isVip
                ? '1.5px solid #f59e0b'
                : '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '14px',
              padding: '10px 14px',
              cursor: 'pointer',
              textAlign: 'left',
              backgroundClip: 'border-box',
              boxShadow: user.isVip
                ? '0 0 20px rgba(245, 158, 11, 0.18)'
                : 'none',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: user.isVip
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
              }}
            >
              {user.avatar || '👑'}
            </div>

            <div style={{ minWidth: 0, lineHeight: 1.25 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.username}
                {user.isVip && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      background: '#f59e0b',
                      color: '#000',
                      fontWeight: 900,
                      padding: '1px 5px',
                      borderRadius: '4px',
                    }}
                  >
                    VIP
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#94a3b8',
                  marginTop: '2px',
                }}
              >
                <span style={{ color: '#10b981', fontWeight: 700 }}>
                  {user.coins}
                </span>{' '}
                coins
              </div>
            </div>
          </button>

          {/* Quick actions */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => {
                const res = useUserStore.getState().claimDailyReward();
                if (res.success) {
                  alert(
                    `🎉 Day ${res.streak} Streak! Claimed +${res.reward} Coins!`
                  );
                } else {
                  alert(
                    `✨ Daily reward already claimed today! Current Streak: ${res.streak} days.`
                  );
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(236, 72, 153, 0.12)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                color: '#f472b6',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <span>🔥</span>
              <span>{streakLabel(user.dailyStreak)}</span>
            </button>

            <button
              onClick={() => useUserStore.getState().setShowStoreModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(124, 58, 237, 0.3)',
              }}
            >
              <span>🛍️</span>
              <span>Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick join private room */}
      <form
        onSubmit={handleJoinByCode}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '14px',
          padding: '12px 14px',
        }}
      >
        <span style={{ color: '#94a3b8', fontSize: '12.5px', fontWeight: 700 }}>
          🔑 Join private room
        </span>

        <input
          type="text"
          placeholder="ROOM CODE"
          value={joinCodeInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setJoinCodeInput(e.target.value.toUpperCase());
            setJoinError('');
          }}
          maxLength={8}
          style={{
            flex: '0 1 160px',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: '#ffffff',
            fontSize: '13.5px',
            fontWeight: 800,
            letterSpacing: '1.5px',
            outline: 'none',
          }}
        />

        <button
          type="submit"
          style={{
            flex: '0 0 auto',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 16px',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
          }}
        >
          Join
        </button>

        {joinError && (
          <span
            style={{
              color: '#f87171',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {joinError}
          </span>
        )}
      </form>

      {/* Catalog header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 900,
              color: '#ffffff',
              margin: '0 0 2px 0',
            }}
          >
            Games
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
            {filteredGames.length} game{filteredGames.length === 1 ? '' : 's'}
            {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '240px' }}>
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '9px 14px 9px 34px',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '11px',
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.55,
              fontSize: '13px',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
        </div>
      </div>

      {/* Category chips */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px',
          margin: 0,
        }}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '7px 14px',
                borderRadius: '9999px',
                border: isSelected
                  ? '1px solid #c084fc'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                background: isSelected
                  ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'
                  : 'rgba(255, 255, 255, 0.04)',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: isSelected ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isSelected
                  ? '0 4px 12px rgba(236, 72, 153, 0.3)'
                  : 'none',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Game grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {filteredGames.map((game) => {
          const isCurrent = activeGame === game.id;
          return (
            <div
              key={game.id}
              onClick={() => setActiveGame(game.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: isCurrent
                  ? '1.5px solid #ec4899'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isCurrent
                  ? '0 0 0 3px rgba(236, 72, 153, 0.25)'
                  : '0 6px 16px rgba(0, 0, 0, 0.4)',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {/* Top accent */}
              <div
                style={{
                  height: '4px',
                  background: game.bannerGradient,
                  borderRadius: '2px 2px 0 0',
                  margin: '-16px -16px 14px',
                  opacity: 0.9,
                }}
              />

              {/* Icon + meta */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: game.bannerGradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0,
                  }}
                >
                  {game.icon}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    flexShrink: 0,
                    alignItems: 'center',
                  }}
                >
                  {game.badge && (
                    <span
                      style={{
                        background: 'rgba(236, 72, 153, 0.18)',
                        color: '#f472b6',
                        border: '1px solid rgba(236, 72, 153, 0.35)',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '5px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {game.badge}
                    </span>
                  )}
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: '#94a3b8',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '5px',
                    }}
                  >
                    {game.category}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: '16.5px',
                  fontWeight: 900,
                  color: '#ffffff',
                  margin: '10px 0 4px 0',
                  lineHeight: 1.2,
                }}
              >
                {game.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: '12.5px',
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

              {/* Footer row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '11.5px',
                  color: '#94a3b8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>👥</span>
                  <span>
                    {game.minPlayers}–{game.maxPlayers}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⭐ {game.rating}</span>
                  <span style={{ color: '#475569' }}>•</span>
                  <span>{game.plays}</span>
                </div>
              </div>

              {/* Primary action */}
              <div
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    fontWeight: 800,
                    color: isCurrent ? '#f472b6' : '#e2e8f0',
                  }}
                >
                  {isCurrent ? 'Continue Playing' : 'Play Game'}
                </span>
                <span style={{ color: '#c084fc', fontSize: '14px' }}>→</span>
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
