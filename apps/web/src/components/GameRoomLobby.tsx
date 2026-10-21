import React, { useState } from 'react';
import { useGameRoomStore } from '../gameRoomStore';
import { useHubStore } from '../hubStore';
import { trackEvent } from '../posthog';

interface GameRoomLobbyProps {
  gameId: string;
  gameTitle: string;
  gameIcon: string;
  minPlayers?: number;
  maxPlayers?: number;
  bannerGradient?: string;
  onStart: () => void;
}

export const GameRoomLobby: React.FC<GameRoomLobbyProps> = ({
  gameId,
  gameTitle,
  gameIcon,
  minPlayers = 2,
  maxPlayers = 8,
  onStart,
}) => {
  const { setView } = useHubStore();
  const {
    getOrCreateRoom,
    toggleAllowBots,
    addPlayer,
    removePlayer,
    generateNewRoomCode,
  } = useGameRoomStore();

  const room = getOrCreateRoom(gameId, 'You (Host)', maxPlayers, minPlayers);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/#room=${room.roomCode}&game=${gameId}`;
    navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = () => {
    if (!newPlayerName.trim()) return;
    addPlayer(gameId, newPlayerName.trim(), false);
    setNewPlayerName('');
  };

  const handleAddBot = () => {
    addPlayer(gameId, '', true);
  };

  const canStart = room.allowBots || room.players.length >= room.minPlayers;
  const emptySlotsCount = Math.max(0, room.minPlayers - room.players.length);

  return (
    <div
      style={{
        maxWidth: '880px',
        margin: '0 auto',
        padding: '28px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Breadcrumb & Salon Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          onClick={() => setView('dashboard')}
          className="btn-tactile-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            fontSize: '12.5px',
            letterSpacing: '0.3px',
          }}
        >
          <span>←</span>
          <span>Return to Arcade Salon</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#fbbf24',
                boxShadow: '0 0 8px #fbbf24',
              }}
            />
            Private Gaming Salon
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
            }}
          >
            {room.minPlayers}–{room.maxPlayers} Players
          </span>
        </div>
      </div>

      {/* Hero Salon Invitation Card */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          padding: '28px 32px',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.85) 0%, rgba(10, 15, 26, 0.95) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.06)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: '24px',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Ambient Gold Accent Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #f59e0b 50%, transparent 100%)',
          }}
        />

        {/* Left: Title & Game Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              flexShrink: 0,
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            }}
          >
            {gameIcon}
          </div>

          <div style={{ minWidth: 0 }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#fbbf24',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Matchmaking Chamber
            </span>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(24px, 3.5vw, 32px)',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              {gameTitle}
            </h1>
            <p
              style={{
                margin: '6px 0 0 0',
                fontSize: '13px',
                color: '#94a3b8',
                lineHeight: 1.4,
              }}
            >
              Take your seat at the table. Invite friends using the salon passphrase or fill empty chairs with autonomous AI bots.
            </p>
          </div>
        </div>

        {/* Right: Room Passphrase Capsule */}
        <div
          style={{
            background: 'rgba(7, 10, 16, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '16px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '180px',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '1.2px',
              color: '#94a3b8',
              textTransform: 'uppercase',
            }}
          >
            Salon Passphrase
          </span>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '26px',
              fontWeight: 900,
              letterSpacing: '3px',
              color: '#38bdf8',
              textShadow: '0 0 16px rgba(56, 189, 248, 0.4)',
              userSelect: 'all',
            }}
          >
            {room.roomCode}
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <button
              onClick={handleCopyInvite}
              className="btn-tactile-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 700,
                background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                borderColor: copied ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
                color: copied ? '#34d399' : '#f8fafc',
              }}
            >
              {copied ? '✓ Link Copied' : '📋 Copy Link'}
            </button>
            <button
              onClick={() => generateNewRoomCode(gameId)}
              className="btn-tactile-secondary"
              style={{
                padding: '6px 8px',
                fontSize: '11px',
                color: '#94a3b8',
              }}
              title="Generate new passphrase"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Configuration & Guest Roster */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Salon Mode Switch Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderRadius: '14px',
            background: 'rgba(11, 16, 27, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#f8fafc' }}>
                Automated AI Opponents
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: room.allowBots ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  border: `1px solid ${room.allowBots ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`,
                  color: room.allowBots ? '#34d399' : '#fb7185',
                }}
              >
                {room.allowBots ? 'Active & Filling' : 'Private / Friends Only'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8492a6' }}>
              {room.allowBots
                ? 'Vacant chairs will be automatically filled with tactical AI players upon match start.'
                : 'Only invited human guests with your passphrase may enter the room.'}
            </p>
          </div>

          <button
            onClick={() => toggleAllowBots(gameId)}
            className="btn-tactile-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '12.5px',
              background: room.allowBots ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.06)',
              borderColor: room.allowBots ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.15)',
              color: room.allowBots ? '#6ee7b7' : '#cbd5e1',
            }}
          >
            {room.allowBots ? '🤖 Disable AI Bots' : '🤖 Enable AI Opponents'}
          </button>
        </div>

        {/* Guest Roster Header */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                Seated Guests
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                ({room.players.length} / {room.maxPlayers})
              </span>
            </div>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: canStart ? '#34d399' : '#fb7185',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: canStart ? '#34d399' : '#fb7185',
                  boxShadow: `0 0 8px ${canStart ? '#34d399' : '#fb7185'}`,
                }}
              />
              {canStart
                ? 'Table quorum ready to launch'
                : `Awaiting ${emptySlotsCount} more guest${emptySlotsCount === 1 ? '' : 's'}`}
            </span>
          </div>

          {/* Player Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '12px',
            }}
          >
            {room.players.map((p, idx) => (
              <div
                key={p.id}
                className="glass-card"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  border: p.isHost
                    ? '1.5px solid rgba(245, 158, 11, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: p.isHost
                    ? 'linear-gradient(135deg, rgba(30, 24, 45, 0.6) 0%, rgba(18, 23, 36, 0.8) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  boxShadow: p.isHost ? '0 4px 16px rgba(245, 158, 11, 0.1)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: p.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0,
                      boxShadow: `0 0 12px ${p.color}66`,
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    {p.avatar}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: '#f8fafc',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </div>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: p.isHost ? '#fbbf24' : p.isBot ? '#38bdf8' : '#8492a6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {p.isHost ? '👑 Host' : p.isBot ? '🤖 AI Bot' : `Seat #${idx + 1}`}
                    </span>
                  </div>
                </div>

                {!p.isHost && (
                  <button
                    onClick={() => removePlayer(gameId, p.id)}
                    className="btn-danger-action"
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                    }}
                    title="Dismiss guest"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {/* Empty Seat Placeholders */}
            {Array.from({ length: emptySlotsCount }).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  border: '1.5px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: 600,
                  minHeight: '66px',
                  background: 'rgba(0, 0, 0, 0.15)',
                }}
              >
                <span>🪑</span>
                <span>Awaiting Guest...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Guest Invite & Bot Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '14px',
            borderRadius: '12px',
            background: 'rgba(11, 16, 27, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            value={newPlayerName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPlayerName(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddFriend()}
            placeholder="Guest Name (e.g. Raunak, Victoria, Maya)"
            style={{
              flex: '1 1 200px',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: '#090d16',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleAddFriend}
            disabled={!newPlayerName.trim() || room.players.length >= room.maxPlayers}
            className="btn-tactile-secondary"
            style={{
              padding: '10px 18px',
              fontSize: '12.5px',
              fontWeight: 800,
              opacity: !newPlayerName.trim() || room.players.length >= room.maxPlayers ? 0.5 : 1,
              cursor: !newPlayerName.trim() || room.players.length >= room.maxPlayers ? 'not-allowed' : 'pointer',
            }}
          >
            + Add Guest
          </button>

          {room.allowBots && room.players.length < room.maxPlayers && (
            <button
              onClick={handleAddBot}
              className="btn-tactile-secondary"
              style={{
                padding: '10px 16px',
                fontSize: '12.5px',
                borderColor: 'rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.08)',
              }}
            >
              + Add Tactical Bot 🤖
            </button>
          )}
        </div>

        {/* Launch Deck Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '12.5px', color: '#8492a6' }}>
            {canStart ? (
              <span style={{ color: '#34d399', fontWeight: 600 }}>
                Ready to initiate session in Room {room.roomCode}.
              </span>
            ) : (
              <span>Invite more guests or enable AI bots to begin.</span>
            )}
          </div>

          <button
            onClick={() => {
              trackEvent('match_started', {
                gameId,
                roomCode: room.roomCode,
                playersCount: room.players.length,
                allowBots: room.allowBots,
              });
              onStart();
            }}
            disabled={!canStart}
            className="btn-primary-glow"
            style={{
              padding: '14px 38px',
              fontSize: '15px',
              fontWeight: 900,
              letterSpacing: '0.4px',
              opacity: canStart ? 1 : 0.45,
              cursor: canStart ? 'pointer' : 'not-allowed',
              background: canStart
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : '#334155',
              boxShadow: canStart
                ? '0 8px 24px rgba(16, 185, 129, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                : 'none',
            }}
          >
            {canStart ? '🚀 Initiate Match' : `Waiting for Quorum (${room.players.length}/${room.minPlayers})`}
          </button>
        </div>
      </div>
    </div>
  );
};
