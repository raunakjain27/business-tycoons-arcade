import React, { useState } from 'react';
import { useHubStore, GAME_CATALOG, GameMetadata, GameId } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';

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

  const handleJoinByCode = () => {
    const trimmed = joinCodeInput.trim().toUpperCase();
    if (!trimmed) return;
    // Default route into uno, ludo, or active game
    setActiveGame('uno');
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Showcase Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #31104b 50%, #0f0b1a 100%)',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          padding: '44px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 30px 70px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '750px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span
              style={{
                backgroundColor: 'rgba(236, 72, 153, 0.25)',
                color: '#f472b6',
                border: '1px solid rgba(236, 72, 153, 0.5)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              🔥 Live Voice & Multiplayer Arcade
            </span>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Private Rooms • Turn-gated Mic • Bots/Friends</span>
          </div>

          <h1
            style={{
              fontSize: '40px',
              fontWeight: 900,
              color: '#ffffff',
              margin: '0 0 12px 0',
              lineHeight: 1.15,
              letterSpacing: '-0.5px',
            }}
          >
            Business Tycoons & Arcade
          </h1>

          <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 24px 0' }}>
            Play high-stakes property trading on customized 18+ boards in Business Tycoons, card warfare in UNO with custom rooms, murder & banishment in The Traitors with live turn-gated mics, or classic Ludo racing!
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveGame('cornerstone')}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(236, 72, 153, 0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🏙️</span> Play Business Tycoons (Main)
            </button>
            <button
              onClick={() => setActiveGame('traitors')}
              style={{
                background: 'linear-gradient(135deg, #831843 0%, #1e1b4b 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '14px 24px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 10px 25px rgba(131, 24, 67, 0.4)',
              }}
            >
              <span>🗡️</span> The Traitors (Voice Rooms)
            </button>
            <button
              onClick={() => setActiveGame('uno')}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                padding: '14px 22px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🃏</span> UNO Champions
            </button>
          </div>
        </div>

        {/* Quick Join Private Room By Code Widget */}
        <div
          style={{
            zIndex: 2,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '24px',
            minWidth: '280px',
            maxWidth: '340px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>🔑</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                Join Private Room
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Have an invite room code?</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              placeholder="e.g. 7X8K2Q"
              maxLength={8}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: '#090d16',
                color: '#38bdf8',
                fontSize: '16px',
                fontWeight: 900,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <button
              onClick={handleJoinByCode}
              style={{
                padding: '12px 18px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Enter
            </button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div
          style={{
            position: 'absolute',
            right: '-60px',
            top: '-60px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Filter Chips & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: isSelected ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  padding: '8px 18px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 800 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 15px rgba(236,72,153,0.4)' : 'none',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ minWidth: '240px', maxWidth: '320px', width: '100%' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search games..."
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              background: 'rgba(15, 23, 42, 0.7)',
              color: '#f8fafc',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Game Catalog Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: '26px',
        }}
      >
        {filteredGames.map((game) => (
          <div
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            style={{
              background: 'rgba(30, 24, 55, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.5)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.4)';
            }}
          >
            {/* Header Banner */}
            <div
              style={{
                background: game.bannerGradient,
                padding: '32px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '30px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                {game.icon}
              </div>

              {game.badge && (
                <span
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 900,
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                  }}
                >
                  {game.badge}
                </span>
              )}
            </div>

            {/* Info Body */}
            <div style={{ padding: '22px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: '#f8fafc' }}>
                    {game.title}
                  </h3>
                  <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 800 }}>
                    ★ {game.rating}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', lineHeight: 1.55 }}>
                  {game.description}
                </p>
              </div>

              {/* Card Action Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                <span>👥 {game.minPlayers}-{game.maxPlayers} Players</span>
                <span
                  style={{
                    color: '#c084fc',
                    fontWeight: 800,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Create / Join Room →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
