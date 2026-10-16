import React, { useState } from 'react';
import { useGameRoomStore, RoomPlayer } from '../gameRoomStore';
import { useHubStore } from '../hubStore';

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
  bannerGradient = 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
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

  const canStart = room.players.length >= room.minPlayers;

  return (
    <div
      style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      {/* Lobby Hero */}
      <div
        style={{
          background: bannerGradient,
          borderRadius: '24px',
          padding: '32px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '34px',
              boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {gameIcon}
          </div>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#fef08a',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Private Matchmaking Room
            </span>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '26px', fontWeight: 900, color: '#ffffff' }}>
              {gameTitle}
            </h2>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
              Requires {room.minPlayers} to {room.maxPlayers} players
            </span>
          </div>
        </div>

        {/* Room Code Card */}
        <div
          style={{
            zIndex: 2,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '12px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
            ROOM CODE
          </span>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '3px',
              color: '#38bdf8',
              fontFamily: 'monospace',
            }}
          >
            {room.roomCode}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleCopyInvite}
              style={{
                background: copied ? '#10b981' : '#334155',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? '✓ Copied!' : '📋 Copy Link'}
            </button>
            <button
              onClick={() => generateNewRoomCode(gameId)}
              style={{
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              title="Generate new room code"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Main Room Controls & Settings */}
      <div
        style={{
          background: 'rgba(30, 24, 55, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Match Settings Row (Bots Toggle vs Friends Only) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '14px 18px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🤖 Play with AI Bots Mode</span>
              <span
                style={{
                  fontSize: '11px',
                  background: room.allowBots ? '#10b98122' : '#f43f5e22',
                  color: room.allowBots ? '#4ade80' : '#fb7171',
                  border: `1px solid ${room.allowBots ? '#10b98155' : '#f43f5e55'}`,
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {room.allowBots ? 'Enabled' : 'Friends Only'}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {room.allowBots
                ? 'Fill empty slots with smart bots or play solo.'
                : 'Locked for friends only. No bots will enter the room.'}
            </span>
          </div>

          <button
            onClick={() => toggleAllowBots(gameId)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: room.allowBots ? '1px solid #10b981' : '1px solid #475569',
              background: room.allowBots ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#334155',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            {room.allowBots ? '🤖 Bots Active (Click for Friends Only)' : '👥 Friends Only (Click to Allow Bots)'}
          </button>
        </div>

        {/* Players In Room Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
              Room Roster ({room.players.length}/{room.maxPlayers})
            </span>
            <span style={{ fontSize: '12px', color: canStart ? '#4ade80' : '#f87171', fontWeight: 600 }}>
              {canStart ? '✓ Ready to launch!' : `Need at least ${room.minPlayers} players to begin`}
            </span>
          </div>

          {/* Player Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {room.players.map((p, idx) => (
              <div
                key={p.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: p.isHost ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: p.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      boxShadow: `0 0 10px ${p.color}88`,
                    }}
                  >
                    {p.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                      {p.name}
                    </div>
                    <span style={{ fontSize: '11px', color: p.isHost ? '#c084fc' : p.isBot ? '#38bdf8' : '#94a3b8' }}>
                      {p.isHost ? 'Host 👑' : p.isBot ? 'Bot 🤖' : `Slot #${idx + 1}`}
                    </span>
                  </div>
                </div>

                {!p.isHost && (
                  <button
                    onClick={() => removePlayer(gameId, p.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f87171',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                    title="Remove player"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {/* Empty slots placeholders */}
            {Array.from({ length: Math.max(0, room.minPlayers - room.players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  border: '2px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: 600,
                  minHeight: '60px',
                }}
              >
                + Empty Slot (Awaiting Player)
              </div>
            ))}
          </div>
        </div>

        {/* Add Friend or Bot Action Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.4)',
            padding: '16px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <input
            type="text"
            value={newPlayerName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
            placeholder="Friend's Name (e.g. Alex, Maya)"
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: '#0f172a',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleAddFriend}
            disabled={!newPlayerName.trim() || room.players.length >= room.maxPlayers}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              background: newPlayerName.trim() ? '#3b82f6' : '#334155',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: newPlayerName.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            + Add Friend
          </button>

          {room.allowBots && room.players.length < room.maxPlayers && (
            <button
              onClick={handleAddBot}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + Add AI Bot 🤖
            </button>
          )}
        </div>

        {/* Start Game & Back Button */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setView('dashboard')}
            style={{
              background: 'none',
              border: '1px solid #475569',
              color: '#94a3b8',
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ← Back to Arcade Hub
          </button>

          <button
            onClick={onStart}
            disabled={!canStart}
            style={{
              padding: '14px 36px',
              borderRadius: '12px',
              border: 'none',
              background: canStart
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : '#334155',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 900,
              cursor: canStart ? 'pointer' : 'not-allowed',
              boxShadow: canStart ? '0 10px 25px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {canStart ? '🚀 Start Match Now!' : `Waiting for Players (${room.players.length}/${room.minPlayers})`}
          </button>
        </div>
      </div>
    </div>
  );
};
