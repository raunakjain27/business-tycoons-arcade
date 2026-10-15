import React, { useState } from 'react';
import { useUserStore } from '../userStore';

export const AccountModal: React.FC = () => {
  const { user, showAccountModal, setShowAccountModal, updateUsername, updateAvatar, upgradeToVip } = useUserStore();
  const [nameInput, setNameInput] = useState(user.username);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [upgraded, setUpgraded] = useState(false);

  if (!showAccountModal) return null;

  const AVATARS = ['👾', '😎', '🎩', '👑', '🦊', '🐱', '🦁', '🚀', '💎', '🔥'];

  const handleSave = () => {
    if (nameInput.trim()) updateUsername(nameInput.trim());
    updateAvatar(selectedAvatar);
    setShowAccountModal(false);
  };

  const handleBuyVip = () => {
    upgradeToVip();
    setUpgraded(true);
    setTimeout(() => setUpgraded(false), 3000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 8, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '16px',
      }}
      onClick={() => setShowAccountModal(false)}
    >
      <div
        style={{
          backgroundColor: '#1f1638',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(236, 72, 153, 0.25)',
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>👤</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Player Account & VIP Club</h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Manage profile, badges, and unlock exclusive content</span>
            </div>
          </div>
          <button
            onClick={() => setShowAccountModal(false)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', fontWeight: 700 }}
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
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: user.isVip ? '#d97706' : '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: user.isVip ? '0 0 16px rgba(245, 158, 11, 0.6)' : '0 0 16px rgba(124, 58, 237, 0.6)',
            }}
          >
            {selectedAvatar}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  width: '160px',
                }}
              />
              {user.isVip ? (
                <span style={{ backgroundColor: '#f59e0b', color: '#000', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px' }}>
                  ⭐ VIP PASS
                </span>
              ) : (
                <span style={{ backgroundColor: '#64748b', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
                  FREE
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Player ID: <code style={{ color: '#a78bfa' }}>{user.id}</code> • Balance: <strong style={{ color: '#10b981' }}>{user.coins} Coins</strong>
            </div>
          </div>
        </div>

        {/* Avatar Picker */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
            Choose Profile Picture:
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {AVATARS.map(av => (
              <button
                key={av}
                type="button"
                onClick={() => setSelectedAvatar(av)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  border: selectedAvatar === av ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: selectedAvatar === av ? 'rgba(167, 139, 250, 0.3)' : 'rgba(255,255,255,0.04)',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: selectedAvatar === av ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* VIP Pass Section (18+ Board & Ad-Free Unlock) */}
        <div
          style={{
            backgroundColor: user.isVip ? 'rgba(245, 158, 11, 0.1)' : 'rgba(236, 72, 153, 0.12)',
            border: user.isVip ? '1px solid #f59e0b' : '1px solid #ec4899',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: user.isVip ? '#fbbf24' : '#f472b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔥</span>
                <span>VIP & 18+ After Dark Pass</span>
              </div>
              <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '2px' }}>
                {user.isVip
                  ? 'All 18+ boards, custom friends board, and VIP animated pegs are unlocked! No ads.'
                  : 'Unlock the exclusive 18+ After Dark board, Custom Friends board, VIP animated pegs & remove all ads.'}
              </div>
            </div>
          </div>

          {!user.isVip && (
            <button
              onClick={handleBuyVip}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>⭐</span>
              <span>Unlock 18+ VIP Pass ($4.99 / One-time)</span>
            </button>
          )}

          {upgraded && (
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, textAlign: 'center' }}>
              🎉 VIP Pass Activated! 18+ Boards & VIP Pegs Unlocked!
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Save Profile
          </button>
          <button
            onClick={() => setShowAccountModal(false)}
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              fontWeight: 600,
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
