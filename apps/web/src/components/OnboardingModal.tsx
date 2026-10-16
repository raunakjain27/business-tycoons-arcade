import React, { useState } from 'react';
import { useUserStore } from '../userStore';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar?: (avatar: string, nickname: string) => void;
}

const AVATARS = [
  { icon: '🦊', label: 'Cunning Fox' },
  { icon: '🦁', label: 'Alpha Lion' },
  { icon: '👑', label: 'Tycoon King' },
  { icon: '🕵️', label: 'Secret Agent' },
  { icon: '⚡', label: 'Electric Spark' },
  { icon: '🚀', label: 'Cosmic Pilot' },
  { icon: '💎', label: 'Diamond Hand' },
  { icon: '🔥', label: 'Inferno' },
  { icon: '🦄', label: 'Mythic Horn' },
  { icon: '🐲', label: 'Dragon Master' },
  { icon: '🎩', label: 'Grand Master' },
  { icon: '🐼', label: 'Zen Panda' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onSelectAvatar }) => {
  const { user, updateUsername, updateAvatar } = useUserStore();
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState(user.username || 'Tycoon Rider');
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || '👑');

  if (!isOpen) return null;

  const handleFinish = () => {
    const finalName = nickname.trim() || 'Player ' + Math.floor(1000 + Math.random() * 9000);
    try {
      localStorage.setItem('cornerstone_onboarded', 'true');
      localStorage.setItem('cornerstone_anon_nickname', finalName);
      localStorage.setItem('cornerstone_anon_avatar', selectedAvatar);
    } catch (e) {}

    // Synchronize to the user account store so the account is saved immediately
    updateUsername(finalName);
    updateAvatar(selectedAvatar);

    if (onSelectAvatar) {
      onSelectAvatar(selectedAvatar, finalName);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 3, 16, 0.92)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2500,
        padding: '16px',
        animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(180deg, #1f143a 0%, #0d071c 100%)',
          borderRadius: '32px',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          padding: '40px 36px',
          boxShadow: '0 30px 100px rgba(0,0,0,0.95), 0 0 60px rgba(139, 92, 246, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Step Indicator Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎮</span>
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '1px', color: '#c084fc', textTransform: 'uppercase' }}>
              Arcade Player Setup
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  width: s === step ? '28px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: s === step ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : 'rgba(255,255,255,0.18)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Welcome & Total Zero-Data Privacy */}
        {step === 1 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '26px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '44px',
                margin: '0 auto',
                boxShadow: '0 12px 35px rgba(236, 72, 153, 0.45)',
              }}
            >
              👑
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                Welcome to Business Tycoons Arcade
              </h2>
              <p style={{ margin: '8px 0 0 0', fontSize: '14.5px', color: '#cbd5e1', lineHeight: 1.6 }}>
                Play 7 real-time games with friends or smart bots, enjoy live turn-gated voice rooms, and compete in multiplayer tournaments — <strong>with 100% complete anonymity</strong>.
              </p>
            </div>

            {/* Privacy & Feature Highlights */}
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '18px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4ade80' }}>
                <span style={{ fontSize: '18px' }}>🛡️</span>
                <div>
                  <strong>Zero-PII Account:</strong> No phone number, real name, or email tracked.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8' }}>
                <span style={{ fontSize: '18px' }}>🎙️</span>
                <div>
                  <strong>Live Voice Rooms:</strong> Turn-gated mic discussion in The Traitors and party banter.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f472b6' }}>
                <span style={{ fontSize: '18px' }}>⚡</span>
                <div>
                  <strong>Persistent Identity:</strong> Your coins, custom friend names, and VIP status stay saved.
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '16px',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(236,72,153,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.15s ease',
              }}
            >
              <span>Set Up Anonymous Profile</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* STEP 2: Persona Customization & Account Handle */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 900 }}>Create Your Identity</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '13.5px', color: '#94a3b8' }}>
                This is how other players will see you across all game rooms and voice channels.
              </p>
            </div>

            {/* Display Handle Input */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 800, color: '#f472b6', display: 'block', marginBottom: '8px' }}>
                Your Player Moniker / Display Name
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
                  placeholder="Enter your game name..."
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    background: '#090514',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setNickname('Tycoon_' + Math.floor(100 + Math.random() * 900))}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: '#c084fc',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🎲 Randomize
                </button>
              </div>
            </div>

            {/* Avatar Grid Picker */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', display: 'block', marginBottom: '8px' }}>
                Choose Your Avatar
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                {AVATARS.map((av) => (
                  <button
                    key={av.icon}
                    type="button"
                    onClick={() => setSelectedAvatar(av.icon)}
                    title={av.label}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '14px',
                      background: selectedAvatar === av.icon ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.5) 0%, rgba(236, 72, 153, 0.5) 100%)' : 'rgba(255,255,255,0.05)',
                      border: selectedAvatar === av.icon ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                      fontSize: '26px',
                      cursor: 'pointer',
                      transform: selectedAvatar === av.icon ? 'scale(1.1)' : 'none',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {av.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Stepper Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'none',
                  color: '#94a3b8',
                  fontWeight: 700,
                  fontSize: '14px',
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
                  padding: '14px',
                  borderRadius: '14px',
                  fontWeight: 900,
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)',
                }}
              >
                Next: Quick Guide →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Arcade Overview & Ready */}
        {step === 3 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <span style={{ fontSize: '50px' }}>🎉✨</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '26px', fontWeight: 900 }}>Your Account is Live!</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>
                Always access your account, edit name/avatar, and check coins from the top right <strong>Account</strong> button.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', textAlign: 'left', fontSize: '13px' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <strong>🏙️ Business Tycoons:</strong> Full property trading, 18+ boards, and auctions.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <strong>🗡️ The Traitors:</strong> Highland castle roundtables with 20s turn-gated mics.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <strong>🃏 UNO Champions:</strong> 3D cards, draw stack, reverse, and yell UNO!
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <strong>🎲 Ludo Superstars:</strong> 15x15 cross tracks, safe stars, and home victory.
              </div>
            </div>

            <button
              onClick={handleFinish}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '16px',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(16,185,129,0.45)',
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
