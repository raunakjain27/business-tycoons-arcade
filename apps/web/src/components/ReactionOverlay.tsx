import React, { useState, useEffect } from 'react';
import { useReactionStore, FloatingReaction } from '../reactionStore';
import { useUserStore } from '../userStore';
import { soundFx } from '../soundEffects';

const QUICK_EMOJIS = ['🔥', '😂', '👑', '😱', '👏', '💀', '🎲', '🥳'];
const QUICK_PHRASES = [
  'Nice roll! 🎲',
  'Ouch! 💸',
  'Hurry up! ⏳',
  'Good game! 🤝',
  'Watch out! ⚠️',
  'GG! 🏆',
];

export const ReactionOverlay: React.FC = () => {
  const { reactions, triggerReaction, clearOldReactions } = useReactionStore();
  const { user } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);

  // Clean up expired floating bubbles
  useEffect(() => {
    const timer = setInterval(() => {
      clearOldReactions();
    }, 1000);
    return () => clearInterval(timer);
  }, [clearOldReactions]);

  const sendReaction = (emoji: string, text?: string) => {
    soundFx.playClick();
    triggerReaction(emoji, text, user.username || 'You', user.avatar || '👑');
    setIsOpen(false);
  };

  return (
    <>
      <style>{`
        @keyframes floatUpFade {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.6);
          }
          15% {
            opacity: 1;
            transform: translateY(0) scale(1.08);
          }
          30% {
            transform: translateY(-8px) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateY(-45px) scale(0.98);
          }
          100% {
            opacity: 0;
            transform: translateY(-80px) scale(0.8);
          }
        }
        .reaction-bubble {
          animation: floatUpFade 3.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: none;
        }
      `}</style>

      {/* 1. Floating Reactions Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '88px',
          right: '24px',
          zIndex: 150,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        {reactions.map((r, idx) => (
          <div
            key={r.id}
            className="reaction-bubble"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 24, 48, 0.95) 0%, rgba(15, 11, 26, 0.95) 100%)',
              border: '1.5px solid rgba(236, 72, 153, 0.4)',
              borderRadius: '24px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(236, 72, 153, 0.25)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span style={{ fontSize: '28px', lineHeight: 1 }}>{r.emoji}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {r.text && (
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                  {r.text}
                </span>
              )}
              <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>
                {r.senderAvatar} {r.senderName}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Reaction Launcher Button & Popover */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 160,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        {isOpen && (
          <div
            style={{
              marginBottom: '12px',
              background: 'linear-gradient(145deg, #1f1a30 0%, #120e22 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 25px rgba(124, 58, 237, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '280px',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick Reactions
              </span>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Emojis Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    fontSize: '24px',
                    padding: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.transform = 'scale(1.2)';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Quick Phrases */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
                Party Chat:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {QUICK_PHRASES.map((phrase) => {
                  const emoji = phrase.slice(-2);
                  return (
                    <button
                      key={phrase}
                      onClick={() => sendReaction(emoji, phrase)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#f8fafc',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {phrase}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Trigger FAB Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            setIsOpen((prev) => !prev);
          }}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            background: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)',
            color: '#ffffff',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(236, 72, 153, 0.5), 0 3px 0 #6d28d9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.transform = 'translateY(2px)';
          }}
          onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isOpen ? '✕' : '🥳'}
        </button>
      </div>
    </>
  );
};
