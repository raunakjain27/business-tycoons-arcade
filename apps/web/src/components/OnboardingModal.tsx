import React, { useState } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar?: (avatar: string, nickname: string) => void;
}

const AVATAR_OPTIONS = ['🦊', '🐯', '🐼', '🦁', '🦄', '🐲', '🚀', '⚡', '🔥', '👑', '🕵️', '🎩'];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onSelectAvatar }) => {
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState('Ghost Rider');
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');

  if (!isOpen) return null;

  const handleFinish = () => {
    try {
      localStorage.setItem('cornerstone_onboarded', 'true');
      localStorage.setItem('cornerstone_anon_nickname', nickname);
      localStorage.setItem('cornerstone_anon_avatar', selectedAvatar);
    } catch (e) {}
    if (onSelectAvatar) {
      onSelectAvatar(selectedAvatar, nickname);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 2, 15, 0.88)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'radial-gradient(ellipse at top, #241648 0%, #0d071e 100%)',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '36px 32px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(124, 58, 237, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                width: s === step ? '28px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: s === step ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Step 1: Welcome & Zero-Data Anonymity */}
        {step === 1 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '54px' }}>🛡️🎭</span>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              Welcome to the Arena
            </h2>
            <p style={{ margin: 0, fontSize: '14.5px', color: '#cbd5e1', lineHeight: 1.6 }}>
              Enjoy real-time multiplayer board games, live voice channels, and 18+ custom social party games — with <strong>100% complete anonymity</strong>. No phone number, real name, or email required.
            </p>

            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '12.5px',
                color: '#94a3b8',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80' }}>
                <span>✓</span> <strong>Zero PII Collected:</strong> Pure pseudonymous burner IDs
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
                <span>✓</span> <strong>Encrypted WebRTC Audio:</strong> End-to-end ephemeral voice mesh
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f472b6' }}>
                <span>✓</span> <strong>Private Rooms:</strong> Shareable invite codes for you and friends
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(236,72,153,0.4)',
              }}
            >
              Choose Anonymous Persona →
            </button>
          </div>
        )}

        {/* Step 2: Choose Persona */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>Create Your Persona</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                How fellow players and friends will see you at the tables
              </p>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#f472b6', display: 'block', marginBottom: '8px' }}>
                Anonymous Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter handle..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: '#090514',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', display: 'block', marginBottom: '8px' }}>
                Choose Your Avatar Icon
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    onClick={() => setSelectedAvatar(av)}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '12px',
                      background: selectedAvatar === av ? 'rgba(124, 58, 237, 0.4)' : 'rgba(255,255,255,0.05)',
                      border: selectedAvatar === av ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                      fontSize: '24px',
                      cursor: 'pointer',
                      transform: selectedAvatar === av ? 'scale(1.1)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'none',
                  color: '#94a3b8',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Next: Quick Tour →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Game Guide Tour */}
        {step === 3 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <span style={{ fontSize: '50px' }}>🎉🚀</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 900 }}>You are Battle Ready!</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>
                Join private friend rooms, toggle between Smart Bots or Humans, and talk live using the mic!
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', textAlign: 'left', fontSize: '12.5px' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <strong>🗡️ The Traitors:</strong> Highland castle roundtables with 20s turn-gated mics, shields, and daggers.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <strong>🃏 UNO Champions:</strong> 3D cards, draw stacks, and instant Uno yelling.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <strong>🎲 Ludo Realism:</strong> Full cross tracks, star safezones, token cutting, and dice roll physics.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <strong>🐍 3D Snakes & Ladders:</strong> Animated slithers, bouncy pegs, and ladder jumps.
              </div>
            </div>

            <button
              onClick={handleFinish}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '16px',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(16,185,129,0.4)',
              }}
            >
              Enter Arcade Dashboard 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
