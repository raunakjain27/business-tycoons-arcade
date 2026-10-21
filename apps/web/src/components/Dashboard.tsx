import React, { useState } from 'react';
import { useHubStore, GAME_CATALOG, GameId, GameMetadata } from '../hubStore';
import { useUserStore } from '../userStore';
import { useGameRoomStore } from '../gameRoomStore';
import { soundFx } from '../soundEffects';
import { trackEvent } from '../posthog';

export const Dashboard: React.FC = () => {
  const {
    activeGame,
    setActiveGame,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    setShowPublicRoomsModal,
  } = useHubStore();

  const { user, openRulesModal, setShowStoreModal, setShowDailyModal, setShowLeaderboardModal } = useUserStore();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const categories = ['All', 'Strategy', 'Card Game', 'Social Deduction', 'Classic', 'Party'];

  const filteredGames = GAME_CATALOG.filter((game) => {
    const matchesCategory =
      selectedCategory === 'All' || game.category === selectedCategory;
    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    const trimmed = joinCode.trim().toUpperCase();
    if (!trimmed) {
      setJoinError('ENTER A VALID ACCESS CODE');
      return;
    }
    if (trimmed.length < 4) {
      setJoinError('ACCESS CODE TOO SHORT (MIN 4 CHARS)');
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
    useGameRoomStore.getState().addPlayer(gameToJoin, user.username || 'CyberRider', false);
    setActiveGame(gameToJoin);
  };

  const getGameEnergyTag = (g: GameMetadata) => {
    if (g.id === 'cornerstone') return { text: 'HIGH OCTANE', color: '#ffb703', border: 'rgba(255,183,3,0.5)' };
    if (g.id === 'uno') return { text: 'HYPER SPEED', color: '#ff0077', border: 'rgba(255,0,119,0.5)' };
    if (g.id === 'ludo') return { text: 'ROYAL CLASH', color: '#00ff88', border: 'rgba(0,255,136,0.5)' };
    if (g.id === 'traitors') return { text: '18+ DECEPTION', color: '#ef4444', border: 'rgba(239,68,68,0.5)' };
    if (g.id === 'imposter') return { text: 'VIRAL MINDGAME', color: '#a855f7', border: 'rgba(168,85,247,0.5)' };
    if (g.id === 'tambola') return { text: 'MEGA JACKPOT', color: '#f59e0b', border: 'rgba(245,158,11,0.5)' };
    if (g.id === 'bingo') return { text: 'LASER SPEED', color: '#00f0ff', border: 'rgba(0,240,255,0.5)' };
    if (g.id === 'sequence') return { text: 'TACTICAL PRO', color: '#3b82f6', border: 'rgba(59,130,246,0.5)' };
    if (g.id === 'snakes') return { text: 'NEON ASCENT', color: '#10b981', border: 'rgba(16,185,129,0.5)' };
    return { text: 'TURBO DUEL', color: '#eab308', border: 'rgba(234,179,8,0.5)' };
  };

  return (
    <div
      style={{
        maxWidth: '1480px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '0 8px 48px',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* 1. Live Cyber Marquee Streamer */}
      <div
        style={{
          background: 'rgba(10, 15, 29, 0.9)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          borderRadius: '12px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 0 15px rgba(0, 240, 255, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #ff0077, #7928ca)',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 900,
            fontFamily: 'Orbitron, sans-serif',
            color: '#fff',
            letterSpacing: '1px',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="live-beacon" />
          LIVE ARENA FEED
        </div>

        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            color: '#94a3b8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          ⚡ <strong style={{ color: '#00f0ff' }}>1,840 PLAYERS IN ARENA</strong> • 🏆 <strong style={{ color: '#ffb703' }}>$1,450,000 BULLION JACKPOT</strong> • 🔥 <strong style={{ color: '#ff0077' }}>TOKYO HIGH-ROLLER RING ACTIVE</strong> • 🎲 MULTIPLAYER LOBBIES OPEN
        </div>
      </div>

      {/* 2. Electrifying Hero Banner: THE NEO-CYBER ARCADE ARENA */}
      <div
        className="cyber-panel"
        style={{
          padding: '32px 36px',
          background: 'linear-gradient(135deg, rgba(16, 24, 46, 0.95) 0%, rgba(9, 13, 24, 0.98) 100%)',
          border: '1.5px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 240, 255, 0.15)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 1fr)',
          gap: '28px',
          alignItems: 'center',
          overflow: 'hidden',
          borderRadius: '24px',
        }}
      >
        {/* Animated Neon Marquee Top Beam */}
        <div className="marquee-glow-top" />

        {/* Left Column: Electrifying Headline & Quick Play */}
        <div style={{ minWidth: 0, position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span
              className="neon-pill neon-pill-cyan"
              style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '1.2px' }}
            >
              ★ CYBER ARCADE BATTLEGROUNDS ★
            </span>
            <span style={{ fontSize: '12px', color: '#67e8f9', fontWeight: 700, letterSpacing: '0.5px' }}>
              REALTIME MULTIPLAYER & SMART AI BOTS
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'Orbitron, Space Grotesk, sans-serif',
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 900,
              color: '#ffffff',
              margin: '0 0 10px 0',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              textShadow: '0 0 25px rgba(0, 240, 255, 0.4), 0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            HIGH-OCTANE <span style={{ color: '#00f0ff' }}>TABLETOP</span> & <span style={{ color: '#ff0077' }}>ARCADE</span> ARENA
          </h1>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '15px',
              margin: '0 0 24px 0',
              lineHeight: 1.6,
              maxWidth: '680px',
            }}
          >
            Step into the high-stakes cyber gaming ring. Roll the dice in metropolitan property markets, duel in laser-speed card games, or battle tactical bots across 10 multiplayer arenas with zero setup lag.
          </p>

          {/* Holographic Fast Access Terminal (Enter Room Code) */}
          <form
            onSubmit={handleQuickJoin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(8, 12, 22, 0.95)',
              border: '1.5px solid rgba(0, 240, 255, 0.4)',
              borderRadius: '16px',
              padding: '6px 8px 6px 16px',
              maxWidth: '540px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 240, 255, 0.08)',
            }}
          >
            <span style={{ fontSize: '16px' }}>🔑</span>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="ENTER 6-DIGIT ROOM KEY..."
              maxLength={8}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#00f0ff',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '2px',
                outline: 'none',
                flex: 1,
                padding: '8px 0',
              }}
            />
            <button
              type="submit"
              className="arcade-btn arcade-btn-cyan"
              style={{
                padding: '10px 22px',
                fontSize: '13px',
                whiteSpace: 'nowrap',
              }}
            >
              WARP IN ▶
            </button>
          </form>
          {joinError && (
            <div style={{ color: '#ff4d6d', fontSize: '12px', fontWeight: 700, marginTop: '6px', fontFamily: 'JetBrains Mono, monospace' }}>
              ⚠️ {joinError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setShowPublicRoomsModal(true);
              }}
              className="arcade-btn arcade-btn-green"
              style={{
                padding: '9px 18px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🌐</span>
              <span>ALL ROOMS BROWSER</span>
            </button>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              or explore live multiplayer arenas
            </span>
          </div>
        </div>

        {/* Right Column: Player Cyber Telemetry Pod */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(22, 30, 56, 0.9) 0%, rgba(12, 17, 34, 0.9) 100%)',
            border: '1px solid rgba(255, 183, 3, 0.3)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), inset 0 0 24px rgba(255, 183, 3, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #ff0077, #7928ca)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: '0 0 20px rgba(255, 0, 119, 0.5)',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                {user.avatar || '👑'}
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  OPERATOR PROFILE
                </div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {user.username}
                </div>
              </div>
            </div>

            <div
              className="neon-pill neon-pill-gold"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              VIP LEVEL 4
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              onClick={() => {
                soundFx.playClick();
                setShowStoreModal(true);
              }}
              style={{
                background: 'rgba(255, 183, 3, 0.1)',
                border: '1px solid rgba(255, 183, 3, 0.35)',
                borderRadius: '12px',
                padding: '10px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '10px', color: '#fde047', fontWeight: 800, letterSpacing: '0.6px' }}>BULLION VAULT</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>
                🪙 {user.coins}
              </div>
            </div>

            <div
              onClick={() => {
                soundFx.playClick();
                setShowDailyModal(true);
              }}
              style={{
                background: 'rgba(255, 0, 119, 0.1)',
                border: '1px solid rgba(255, 0, 119, 0.35)',
                borderRadius: '12px',
                padding: '10px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '10px', color: '#ff66aa', fontWeight: 800, letterSpacing: '0.6px' }}>DAILY STREAK</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>
                🔥 {user.streakDays || 1} DAYS
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                soundFx.playClick();
                setShowLeaderboardModal(true);
              }}
              className="arcade-btn arcade-btn-secondary"
              style={{ flex: 1, padding: '8px 12px', fontSize: '11px' }}
            >
              🏆 HALL OF FAME
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setShowStoreModal(true);
              }}
              className="arcade-btn arcade-btn-gold"
              style={{ flex: 1, padding: '8px 12px', fontSize: '11px' }}
            >
              🛍️ CYBER STORE
            </button>
          </div>
        </div>
      </div>

      {/* 3. Category Filter Rails & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  soundFx.playClick();
                  setSelectedCategory(cat);
                }}
                className="arcade-btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  borderRadius: '24px',
                  background: isSelected
                    ? 'linear-gradient(135deg, #00f0ff 0%, #0096c7 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: isSelected ? '#03045e' : '#cbd5e1',
                  border: isSelected
                    ? '1.5px solid #00f0ff'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: isSelected ? '0 0 20px rgba(0, 240, 255, 0.5)' : 'none',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(12, 17, 32, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '6px 14px',
            minWidth: '260px',
          }}
        >
          <span style={{ fontSize: '14px', color: '#64748b' }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search battle catalogs..."
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              width: '100%',
              fontFamily: 'Outfit, sans-serif',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. Arcade Cabinet Game Grid (10 Showcases) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '22px',
        }}
      >
        {filteredGames.map((game) => {
          const isCurrentActive = activeGame === game.id;
          const energy = getGameEnergyTag(game);

          return (
            <div
              key={game.id}
              data-game-id={game.id}
              onClick={() => {
                soundFx.playClick();
                trackEvent('game_selected', { gameId: game.id });
                setActiveGame(game.id);
              }}
              className="arcade-cabinet-card"
              style={{
                cursor: 'pointer',
                border: isCurrentActive
                  ? '2px solid #00f0ff'
                  : '1.5px solid rgba(255, 255, 255, 0.1)',
                boxShadow: isCurrentActive
                  ? '0 0 35px rgba(0, 240, 255, 0.45), 0 16px 40px rgba(0, 0, 0, 0.7)'
                  : undefined,
              }}
            >
              {/* Marquee Top Accent */}
              <div
                style={{
                  height: '4px',
                  background: isCurrentActive
                    ? 'linear-gradient(90deg, #00f0ff, #ff0077)'
                    : game.bannerGradient || 'linear-gradient(90deg, #7c3aed, #ec4899)',
                }}
              />

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header: Icon, Title, and Energy Pill */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                      }}
                    >
                      {game.icon}
                    </div>

                    <div>
                      <h3
                        style={{
                          fontSize: '19px',
                          fontWeight: 900,
                          color: '#ffffff',
                          margin: 0,
                          fontFamily: 'Space Grotesk, sans-serif',
                          letterSpacing: '-0.3px',
                        }}
                      >
                        {game.title}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span>👥 {game.minPlayers}–{game.maxPlayers} Players</span>
                        <span>•</span>
                        <span style={{ color: '#ffb703', fontWeight: 700 }}>★ {game.rating}</span>
                      </div>
                    </div>
                  </div>

                  {/* Energy Badge */}
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      color: energy.color,
                      border: `1px solid ${energy.border}`,
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontFamily: 'Orbitron, sans-serif',
                      letterSpacing: '0.8px',
                    }}
                  >
                    {energy.text}
                  </span>
                </div>

                {/* Description */}
                <p
                  style={{
                    color: '#cbd5e1',
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    margin: 0,
                    minHeight: '40px',
                  }}
                >
                  {game.description}
                </p>

                {/* Cabinet Telemetry Bar */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  <span style={{ color: '#64748b' }}>CATEGORY: <strong style={{ color: '#cbd5e1' }}>{game.category.toUpperCase()}</strong></span>
                  <span style={{ color: '#00ff88', fontWeight: 700 }}>● {game.plays} PLAYED</span>
                </div>

                {/* Actions: Rules Button & Play Button */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFx.playClick();
                      openRulesModal(game.id);
                    }}
                    className="arcade-btn arcade-btn-secondary"
                    style={{ padding: '12px 16px', fontSize: '13px' }}
                    title="Read Game Instructions & Strategy"
                  >
                    📖 Rules
                  </button>

                  <button
                    onClick={() => {
                      soundFx.playClick();
                      trackEvent('game_selected', { gameId: game.id });
                      setActiveGame(game.id);
                    }}
                    className={`arcade-btn ${isCurrentActive ? 'arcade-btn-primary' : 'arcade-btn-cyan'}`}
                    style={{
                      padding: '12px 18px',
                      fontSize: '13px',
                      letterSpacing: '0.8px',
                    }}
                  >
                    {isCurrentActive ? '🎮 RESUME ARENA' : 'INSERT COIN & PLAY ▶'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
