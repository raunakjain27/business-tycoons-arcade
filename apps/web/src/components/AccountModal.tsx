import React, { useState, useEffect } from 'react';
import { useUserStore } from '../userStore';
import { soundFx } from '../soundEffects';

export const AccountModal: React.FC = () => {
  const { user, showAccountModal, setShowAccountModal, updateUsername, updateAvatar, upgradeToVip } = useUserStore();
  const [nameInput, setNameInput] = useState(user.username);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [upgraded, setUpgraded] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    setNameInput(user.username);
    setSelectedAvatar(user.avatar);
  }, [user.username, user.avatar]);

  if (!showAccountModal) return null;

  const AVATARS = ['👑', '🦊', '🦁', '🕵️', '⚡', '🚀', '💎', '🔥', '🦄', '🐲', '🎩', '👾'];

  const handleSave = () => {
    if (nameInput.trim()) updateUsername(nameInput.trim());
    updateAvatar(selectedAvatar);
    setShowAccountModal(false);
  };

  const handleBuyVip = () => {
    soundFx.playCashRegister();
    upgradeToVip();
    setUpgraded(true);
    setTimeout(() => setUpgraded(false), 3000);
  };

  const copyAccountRecoveryKey = () => {
    navigator.clipboard.writeText(`TYCOON-KEY-${user.id}`);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 3, 18, 0.9)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2200,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={() => setShowAccountModal(false)}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #1e1338 0%, #0d061c 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95), 0 0 50px rgba(124, 58, 237, 0.3)',
          maxWidth: '520px',
          width: '100%',
          padding: '28px',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>👤</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>Player Account & Identity</h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Zero-PII profile, game perks & VIP status</span>
            </div>
          </div>
          <button
            onClick={() => setShowAccountModal(false)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        {/* Profile Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            padding: '18px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '20px',
              background: user.isVip ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              boxShadow: user.isVip ? '0 0 20px rgba(245, 158, 11, 0.6)' : '0 0 20px rgba(124, 58, 237, 0.6)',
            }}
          >
            {selectedAvatar}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 800,
                  padding: '6px 10px',
                  width: '180px',
                  outline: 'none',
                }}
              />
              {user.isVip ? (
                <span style={{ backgroundColor: '#f59e0b', color: '#000', fontSize: '11px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px' }}>
                  ⭐ VIP CLUB
                </span>
              ) : (
                <span style={{ backgroundColor: '#475569', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                  STANDARD
                </span>
              )}
            </div>
            <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>ID: <code style={{ color: '#c084fc' }}>{user.id}</code></span>
              <span>•</span>
              <span>Coins: <strong style={{ color: '#10b981' }}>{user.coins}</strong></span>
            </div>
          </div>
        </div>

        {/* Avatar Picker */}
        <div>
          <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#e2e8f0', display: 'block', marginBottom: '10px' }}>
            Choose Profile Picture:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {AVATARS.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => setSelectedAvatar(av)}
                style={{
                  aspectRatio: '1/1',
                  borderRadius: '12px',
                  border: selectedAvatar === av ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: selectedAvatar === av ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255,255,255,0.04)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: selectedAvatar === av ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* Permanent Account Recovery Strip */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#cbd5e1' }}>🔒 Device Account Persistence</div>
            <div style={{ color: '#64748b', fontSize: '11px' }}>Your profile & coins stay tied to this browser session</div>
          </div>

          <button
            onClick={copyAccountRecoveryKey}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              color: copiedKey ? '#4ade80' : '#c084fc',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copiedKey ? '✓ Copied ID' : 'Copy ID'}
          </button>
        </div>

        {/* VIP Pass Section (18+ Board & Ad-Free Unlock) */}
        <div
          style={{
            backgroundColor: user.isVip ? 'rgba(245, 158, 11, 0.1)' : 'rgba(236, 72, 153, 0.12)',
            border: user.isVip ? '1px solid #f59e0b' : '1px solid #ec4899',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 900, color: user.isVip ? '#fbbf24' : '#f472b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔥</span>
                <span>VIP & 18+ After Dark Pass</span>
              </div>
              <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '3px' }}>
                {user.isVip
                  ? 'Active! All 18+ boards, custom friends board, and VIP animated pegs unlocked. No ads.'
                  : 'Unlock the exclusive 18+ After Dark board, Custom Friends board, VIP animated pegs & remove all ads.'}
              </div>
            </div>
          </div>

          {!user.isVip && (
            <button
              onClick={handleBuyVip}
              style={{
                padding: '12px 18px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>⭐</span>
              <span>Unlock 18+ VIP Pass — ₹399 / $4.99 (One-Time)</span>
            </button>
          )}

          {upgraded && (
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, textAlign: 'center' }}>
              🎉 VIP Pass Activated! 18+ Boards & VIP Pegs Unlocked!
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
            }}
          >
            Save Profile
          </button>
          <button
            onClick={() => setShowAccountModal(false)}
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.15)',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
