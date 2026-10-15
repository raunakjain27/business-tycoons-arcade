import React, { useState } from 'react';
import { useHubStore, GAME_CATALOG, GameMetadata, GameId } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useUserStore } from '../userStore';

const CATEGORIES = ['All', 'Strategy', 'Card Game', 'Social Deduction', 'Classic', 'Party'];

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
    const matchesCategory = selectedCategory === 'All' || game.category === selectedCategory;
    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase());
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
      setJoinError('Room code is too short.');
      return;
    }
    setJoinError('');
    // Route into active game room
    setActiveGame('uno');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '36px', padding: '0 8px' }}>
      
      {/* 1. HERO SHOWCASE WITH PLAYER ACCOUNT STRIP */}
      <div
        style={{
          background: 'radial-gradient(ellipse at top left, #2e1065 0%, #17072b 45%, #080314 100%)',
          borderRadius: '32px',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          padding: '44px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '32px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        {/* Glow ambient spots */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '10%',
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '780px' }}>
          {/* Badge & Quick Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: 'rgba(236, 72, 153, 0.25)',
                color: '#f472b6',
                border: '1px solid rgba(236, 72, 153, 0.45)',
                padding: '5px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🔥</span> Live Arcade Hub
            </span>
            <span style={{ color: '#cbd5e1', fontSize: '13px' }}>
              Turn-Gated Voice • Private Rooms • Instant Play
            </span>
          </div>

          <h1
            style={{
              fontSize: '44px',
              fontWeight: 900,
              color: '#ffffff',
              margin: '0 0 14px 0',
              lineHeight: 1.15,
              letterSpacing: '-1px',
            }}
          >
            Business Tycoons & Arcade
          </h1>

          <p style={{ fontSize: '16px', color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 28px 0', maxWidth: '680px' }}>
            Select from 7 tournament-grade games: property trading on custom 18+ boards in <strong>Business Tycoons</strong>, turn-gated mic trials in <strong>The Traitors</strong>, rapid-fire card warfare in <strong>UNO</strong>, or classic <strong>Ludo</strong>.
          </p>

          {/* Hero Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveGame('cornerstone')}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '16px',
                fontSize: '15px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 12px 30px rgba(236, 72, 153, 0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'transform 0.15s ease',
              }}
            >
              <span style={{ fontSize: '20px' }}>🏙️</span>
              <span>Play Business Tycoons</span>
            </button>

            <button
              onClick={() => setActiveGame('traitors')}
              style={{
                background: 'linear-gradient(135deg, #831843 0%, #1e1b4b 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '16px 26px',
                borderRadius: '16px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 10px 25px rgba(131, 24, 67, 0.4)',
              }}
            >
              <span>🗡️</span>
              <span>The Traitors (Turn-Gated Mic)</span>
            </button>

            <button
              onClick={() => setActiveGame('uno')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '16px 24px',
                borderRadius: '16px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🃏</span>
              <span>UNO Champions</span>
            </button>
          </div>
        </div>

        {/* Hero Right Column: Permanent Account Card & Quick Room Join */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '340px',
            zIndex: 2,
          }}
        >
          {/* Permanent Player Account Card */}
          <div
            onClick={() => setShowAccountModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(16px)',
              border: user.isVip ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: user.isVip ? '0 0 25px rgba(245, 158, 11, 0.25)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  background: user.isVip ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                }}
              >
                {user.avatar || '👑'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff' }}>
                    {user.username}
                  </span>
                  {user.isVip && (
                    <span style={{ fontSize: '10px', background: '#f59e0b', color: '#000', fontWeight: 900, padding: '1px 6px', borderRadius: '4px' }}>
                      VIP
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Balance: <strong style={{ color: '#10b981' }}>{user.coins} Coins</strong> • Edit Profile ⚙️
                </div>
              </div>
            </div>

            <span style={{ color: '#c084fc', fontSize: '18px' }}>→</span>
          </div>

          {/* Quick Join Private Room Box */}
          <form
            onSubmit={handleJoinByCode}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔑</span> Join Private Friend Room
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="ROOM CODE"
                value={joinCodeInput}
                onChange={(e) => {
                  setJoinCodeInput(e.target.value.toUpperCase());
                  setJoinError('');
                }}
                maxLength={8}
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                }}
              >
                Join
              </button>
            </div>
            {joinError && <div style={{ color: '#f87171', fontSize: '11.5px', margin: 0 }}>{joinError}</div>}
          </form>
        </div>
      </div>

      {/* 2. GAME CATALOG & CATEGORY FILTERING */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', margin: '0 0 4px 0' }}>
              Explore Arcade Games
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
              7 titles available. Play locally with smart bots or host private multiplayer friend rooms.
            </p>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                padding: '10px 16px 10px 38px',
                color: '#ffffff',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6, fontSize: '14px' }}>
              🔍
            </span>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isSelected ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' : 'rgba(255, 255, 255, 0.04)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 4px 15px rgba(236, 72, 153, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* 3. GAME GRID (CARDS) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredGames.map((game) => {
            const isCurrent = activeGame === game.id;
            return (
              <div
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                style={{
                  background: 'radial-gradient(ellipse at top, #1c1533 0%, #0e091d 100%)',
                  borderRadius: '24px',
                  border: isCurrent ? '2px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isCurrent ? '0 0 35px rgba(236, 72, 153, 0.35)' : '0 10px 25px rgba(0,0,0,0.5)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Header: Icon, Category & Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '16px',
                      background: game.bannerGradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    {game.icon}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {game.badge && (
                      <span
                        style={{
                          background: 'rgba(236, 72, 153, 0.2)',
                          color: '#f472b6',
                          border: '1px solid rgba(236, 72, 153, 0.4)',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {game.badge}
                      </span>
                    )}
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {game.category}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', margin: '0 0 8px 0' }}>
                    {game.title}
                  </h3>
                  <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: 1.5, margin: 0, minHeight: '40px' }}>
                    {game.description}
                  </p>
                </div>

                {/* Metadata Row: Players, Rating, Plays */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '12.5px',
                    color: '#cbd5e1',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>👥</span>
                    <span>{game.minPlayers} - {game.maxPlayers} Players</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>⭐ {game.rating}</span>
                    <span style={{ color: '#64748b' }}>•</span>
                    <span>{game.plays} plays</span>
                  </div>
                </div>

                {/* Play Button CTA */}
                <button
                  style={{
                    width: '100%',
                    background: isCurrent ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' : 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>{isCurrent ? 'Continue Playing' : 'Launch Game'}</span>
                  <span>→</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
