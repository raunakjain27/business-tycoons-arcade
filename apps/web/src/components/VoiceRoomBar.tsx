import React, { useEffect, useState } from 'react';
import { useVoiceStore } from '../voiceStore';

interface VoiceRoomBarProps {
  gameTitle: string;
  turnRestricted?: boolean;
}

export const VoiceRoomBar: React.FC<VoiceRoomBarProps> = ({ gameTitle, turnRestricted = false }) => {
  const {
    isVoiceConnected,
    isMicMuted,
    toggleMic,
    voiceUsers,
    activeTurnSpeakerId,
    setTurnRestricted,
  } = useVoiceStore();

  const [simulatedSoundWave, setSimulatedSoundWave] = useState([30, 60, 45, 80, 20]);

  useEffect(() => {
    setTurnRestricted(turnRestricted);
  }, [turnRestricted, setTurnRestricted]);

  // Animated wave effect when mic is on
  useEffect(() => {
    if (isMicMuted || !isVoiceConnected) return;
    const interval = setInterval(() => {
      setSimulatedSoundWave([
        Math.floor(Math.random() * 50) + 20,
        Math.floor(Math.random() * 80) + 20,
        Math.floor(Math.random() * 60) + 20,
        Math.floor(Math.random() * 90) + 20,
        Math.floor(Math.random() * 40) + 20,
      ]);
    }, 150);
    return () => clearInterval(interval);
  }, [isMicMuted, isVoiceConnected]);

  const userList = Object.values(voiceUsers);
  const myUser = voiceUsers['player-1'] || { canSpeak: true, isMuted: isMicMuted };
  const canIUnmute = !turnRestricted || myUser.canSpeak;

  return (
    <div
      style={{
        background: 'rgba(15, 11, 26, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Left: Status & Turn Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isVoiceConnected ? '#10b981' : '#64748b',
              boxShadow: isVoiceConnected ? '0 0 10px #10b981' : 'none',
              animation: isVoiceConnected ? 'pulse 2s infinite' : 'none',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
            Live Voice Room
          </span>
        </div>

        {turnRestricted ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '11px',
              color: '#fca5a5',
              fontWeight: 700,
            }}
          >
            <span>🔒</span>
            <span>
              Turn-Gated Mic: {activeTurnSpeakerId ? `${voiceUsers[activeTurnSpeakerId]?.name || 'Current Player'} has the floor` : 'Floor Open'}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Free Discussion Open</span>
        )}
      </div>

      {/* Middle: Active Voice Participants Bubble Avatar Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
        {userList.map((u) => {
          const isCurrentSpeaker = activeTurnSpeakerId === u.id;
          const isBlocked = turnRestricted && !u.canSpeak;
          return (
            <div
              key={u.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: isCurrentSpeaker ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                border: isCurrentSpeaker ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '4px 8px',
                borderRadius: '20px',
                fontSize: '12px',
                color: '#fff',
                boxShadow: isCurrentSpeaker ? '0 0 12px rgba(168, 85, 247, 0.5)' : 'none',
              }}
              title={`${u.name}: ${isBlocked ? 'Mic Muted by Roundtable rules' : 'Ready'}`}
            >
              <span>{u.avatar}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.name.split(' ')[0]}
              </span>
              <span style={{ fontSize: '10px' }}>
                {isBlocked ? '🤐' : u.isMuted ? '🔇' : '🎙️'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Right: Mic Toggle Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Animated sound wave bars when speaking */}
        {!isMicMuted && canIUnmute && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '18px' }}>
            {simulatedSoundWave.map((h, i) => (
              <span
                key={i}
                style={{
                  width: '3px',
                  height: `${h}%`,
                  background: '#10b981',
                  borderRadius: '2px',
                  transition: 'height 0.1s ease',
                }}
              />
            ))}
          </div>
        )}

        <button
          onClick={() => {
            if (canIUnmute) {
              toggleMic();
            }
          }}
          disabled={!canIUnmute}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '12px',
            border: !canIUnmute
              ? '1px solid #475569'
              : isMicMuted
              ? '1px solid #ef4444'
              : '1px solid #10b981',
            background: !canIUnmute
              ? '#1e293b'
              : isMicMuted
              ? 'rgba(239, 68, 68, 0.2)'
              : 'rgba(16, 185, 129, 0.2)',
            color: !canIUnmute ? '#64748b' : isMicMuted ? '#f87171' : '#4ade80',
            fontWeight: 800,
            fontSize: '12px',
            cursor: canIUnmute ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            boxShadow: !isMicMuted && canIUnmute ? '0 0 15px rgba(16, 185, 129, 0.3)' : 'none',
          }}
        >
          <span>{!canIUnmute ? '🤐 Mic Locked' : isMicMuted ? '🔇 Mic Muted' : '🎙️ Mic Active'}</span>
        </button>
      </div>
    </div>
  );
};
