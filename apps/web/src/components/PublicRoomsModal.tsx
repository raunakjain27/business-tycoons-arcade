import React, { useState } from 'react';
import { useGameRoomStore, PublicRoomInfo } from '../gameRoomStore';
import { useHubStore, GameId } from '../hubStore';
import { soundFx } from '../soundEffects';
import { trackEvent } from '../posthog';

export const PublicRoomsModal: React.FC = () => {
  const { showPublicRoomsModal, setShowPublicRoomsModal, setActiveGame } = useHubStore();
  const { getPublicRooms, joinRoomByCode } = useGameRoomStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Strategy' | 'Card Game' | 'Classic' | 'Social Deduction' | 'Party'>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'lobby' | 'playing'>('All');
  const [joinStatusMsg, setJoinStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  if (!showPublicRoomsModal) return null;

  const publicRooms = getPublicRooms();

  const filteredRooms = publicRooms.filter((room) => {
    const matchesSearch =
      room.roomCode.toLowerCase().includes(search.toLowerCase()) ||
      room.gameTitle.toLowerCase().includes(search.toLowerCase()) ||
      room.hostName.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || room.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'All' || room.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleJoin = (room: PublicRoomInfo) => {
    soundFx.playClick();
    const result = joinRoomByCode(room.roomCode, 'Player 1');
    if (result.success && result.gameId) {
      setJoinStatusMsg({ text: `Joining ${room.gameTitle} (${room.roomCode})...` });
      trackEvent('public_room_joined', { roomCode: room.roomCode, gameId: result.gameId });
      setTimeout(() => {
        setActiveGame(result.gameId as GameId);
        setShowPublicRoomsModal(false);
      }, 350);
    } else {
      setJoinStatusMsg({ text: result.message || 'Failed to join room', error: true });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 8, 18, 0.85)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={() => setShowPublicRoomsModal(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '980px',
          height: '85vh',
          maxHeight: '90vh',
          minHeight: '600px',
          backgroundColor: '#0a0f1d',
          borderRadius: '24px',
          border: '1.5px solid rgba(0, 240, 255, 0.4)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 240, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="marquee-glow-top" />

        {/* Modal Header */}
        <div
          style={{
            padding: '22px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(16, 24, 46, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(255, 0, 119, 0.2))',
                border: '1.5px solid rgba(0, 240, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
              }}
            >
              🌐
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '22px',
                    fontWeight: 900,
                    fontFamily: 'Space Grotesk, sans-serif',
                    color: '#ffffff',
                    letterSpacing: '-0.3px',
                  }}
                >
                  GLOBAL ARENA ROOM DIRECTORY
                </h2>
                <span className="neon-pill neon-pill-cyan" style={{ fontSize: '10px' }}>
                  <span className="live-beacon" />
                  {publicRooms.length} ACTIVE ROOMS
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Browse live multiplayer battles, examine custom house rules, and join matches with 1 click.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              setShowPublicRoomsModal(false);
            }}
            className="arcade-btn arcade-btn-secondary"
            style={{
              width: '36px',
              height: '36px',
              padding: 0,
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            padding: '16px 28px',
            backgroundColor: 'rgba(7, 11, 22, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <input
                type="text"
                placeholder="Search by Room Code, Game, or Host..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
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
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                🔍
              </span>
            </div>

            {/* Status Selector */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['All', 'lobby', 'playing'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedStatus(st);
                  }}
                  className={`arcade-btn ${selectedStatus === st ? 'arcade-btn-cyan' : 'arcade-btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  {st === 'All' ? 'ALL STATUS' : st === 'lobby' ? '🟢 LOBBY' : '⚡ PLAYING'}
                </button>
              ))}
            </div>
          </div>

          {/* Category Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {(['All', 'Strategy', 'Card Game', 'Classic', 'Social Deduction', 'Party'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  soundFx.playClick();
                  setSelectedCategory(cat);
                }}
                className={`arcade-btn ${selectedCategory === cat ? 'arcade-btn-primary' : 'arcade-btn-secondary'}`}
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  borderRadius: '8px',
                }}
              >
                {cat === 'All' ? '🎮 ALL DISCIPLINES' : cat}
              </button>
            ))}
          </div>
        </div>

        {joinStatusMsg && (
          <div
            style={{
              padding: '8px 28px',
              backgroundColor: joinStatusMsg.error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 255, 136, 0.15)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              color: joinStatusMsg.error ? '#fca5a5' : '#86efac',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{joinStatusMsg.error ? '⚠️' : '⚡'}</span>
            <span>{joinStatusMsg.text}</span>
          </div>
        )}

        {/* Room Cards List */}
        <div
          style={{
            padding: '20px 28px',
            overflowY: 'auto',
            flex: '1 1 auto',
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gridAutoRows: 'max-content',
            gap: '16px',
            boxSizing: 'border-box',
          }}
        >
          {filteredRooms.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '48px 20px',
                color: '#94a3b8',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🛰️</div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '18px' }}>No Active Rooms Found</h3>
              <p style={{ margin: '6px 0 16px 0', fontSize: '13px' }}>
                No rooms matched your query. Be the pioneer and host an arena room!
              </p>
              <button
                onClick={() => {
                  soundFx.playClick();
                  setActiveGame('cornerstone');
                  setShowPublicRoomsModal(false);
                }}
                className="arcade-btn arcade-btn-green"
                style={{ padding: '10px 24px', fontSize: '13px' }}
              >
                + CREATE BUSINESS TYCOONS ROOM
              </button>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isFull = room.playerCount >= room.maxPlayers;
              return (
                <div
                  key={room.roomCode}
                  style={{
                    backgroundColor: 'rgba(14, 20, 38, 0.9)',
                    border: '1.5px solid rgba(0, 240, 255, 0.25)',
                    borderRadius: '16px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    minHeight: '175px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.25)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Top: Game info & status */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '28px' }}>{room.gameIcon}</span>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                            {room.gameTitle}
                          </h4>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Host: <strong style={{ color: '#e2e8f0' }}>{room.hostAvatar} {room.hostName}</strong>
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          className={`neon-pill ${room.status === 'lobby' ? 'neon-pill-green' : 'neon-pill-cyan'}`}
                          style={{ fontSize: '10px', fontFamily: 'Orbitron, sans-serif' }}
                        >
                          <span className="live-beacon" />
                          {room.status === 'lobby' ? 'WAITING' : 'IN PLAY'}
                        </span>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#94a3b8',
                            marginTop: '4px',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {room.playerCount}/{room.maxPlayers} SLOTS
                        </div>
                      </div>
                    </div>

                    {/* Room Key & House Rules Tags */}
                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(0, 240, 255, 0.1)',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          color: '#00f0ff',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        KEY: {room.roomCode}
                      </span>

                      {room.gameId === 'cornerstone' && (
                        <>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'rgba(255, 183, 3, 0.1)',
                              border: '1px solid rgba(255, 183, 3, 0.3)',
                              color: '#ffb703',
                              fontSize: '10.5px',
                              fontWeight: 700,
                            }}
                          >
                            💰 ${room.houseRules.startingCash}
                          </span>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'rgba(0, 255, 136, 0.1)',
                              border: '1px solid rgba(0, 255, 136, 0.3)',
                              color: '#00ff88',
                              fontSize: '10.5px',
                              fontWeight: 700,
                            }}
                          >
                            ⚡ {room.houseRules.turnTimerSec ? `${room.houseRules.turnTimerSec}s` : '∞'}
                          </span>
                          {room.houseRules.doubleGoBonus && (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(236, 72, 153, 0.1)',
                                border: '1px solid rgba(236, 72, 153, 0.3)',
                                color: '#f472b6',
                                fontSize: '10.5px',
                                fontWeight: 700,
                              }}
                            >
                              🎯 2× GO
                            </span>
                          )}
                          {room.houseRules.vacationCash && (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(14, 165, 233, 0.1)',
                                border: '1px solid rgba(14, 165, 233, 0.3)',
                                color: '#38bdf8',
                                fontSize: '10.5px',
                                fontWeight: 700,
                              }}
                            >
                              🌴 Jackpot
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Join Button */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleJoin(room)}
                      disabled={isFull}
                      className={`arcade-btn ${isFull ? 'arcade-btn-secondary' : room.status === 'lobby' ? 'arcade-btn-green' : 'arcade-btn-cyan'}`}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        fontSize: '12px',
                        fontWeight: 900,
                        letterSpacing: '0.5px',
                        opacity: isFull ? 0.4 : 1,
                        cursor: isFull ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isFull ? 'ROOM FULL' : room.status === 'lobby' ? 'JOIN MATCH ➔' : 'SPECTATE / JOIN ➔'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 28px',
            backgroundColor: 'rgba(10, 15, 29, 0.98)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Looking for private play? Create a room and toggle visibility to <strong>Private (Key Only)</strong>.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                soundFx.playClick();
                setActiveGame('cornerstone');
                setShowPublicRoomsModal(false);
              }}
              className="arcade-btn arcade-btn-primary"
              style={{ padding: '9px 18px', fontSize: '12px' }}
            >
              + HOST NEW ARENA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
