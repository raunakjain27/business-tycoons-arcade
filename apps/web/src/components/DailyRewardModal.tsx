import React, { useState } from 'react';
import { useUserStore } from '../userStore';
import { soundFx } from '../soundEffects';

export const DailyRewardModal: React.FC = () => {
  const { user, showDailyModal, setShowDailyModal, claimDailyReward } = useUserStore();
  const [claimedNotice, setClaimedNotice] = useState<{ amount: number; streak: number } | null>(null);

  if (!showDailyModal) return null;

  const today = new Date().toISOString().slice(0, 10);
  const alreadyClaimed = user.lastClaimDate === today;

  const handleClaim = () => {
    soundFx.playCoin();
    soundFx.playVictory();
    const result = claimDailyReward();
    if (result.success) {
      setClaimedNotice({ amount: result.reward, streak: result.streak });
    }
  };

  const streakDays = [
    { day: 1, reward: 100, icon: '🪙' },
    { day: 2, reward: 125, icon: '🪙' },
    { day: 3, reward: 150, icon: '💰' },
    { day: 4, reward: 175, icon: '💰' },
    { day: 5, reward: 200, icon: '💎' },
    { day: 6, reward: 250, icon: '💎' },
    { day: 7, reward: 350, icon: '👑' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 220,
        backgroundColor: 'rgba(5, 3, 10, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out forwards',
      }}
      onClick={() => setShowDailyModal(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(145deg, #1c182d 0%, #100c1e 100%)',
          borderRadius: '24px',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
          textAlign: 'center',
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
          }}
        >
          <button
            onClick={() => setShowDailyModal(false)}
            style={{
              position: 'absolute',
              right: '16px',
              top: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#cbd5e1',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>

          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎁</div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 6px', color: '#fbbf24' }}>
            Daily Streak Chest
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            Log in every day to keep your streak burning and multiply free coin rewards!
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #f59e0b',
              padding: '6px 14px',
              borderRadius: '20px',
              marginTop: '12px',
              color: '#fbbf24',
              fontWeight: 800,
              fontSize: '13px',
            }}
          >
            <span>🔥</span>
            <span>Current Streak: {user.dailyStreak} Days</span>
          </div>
        </div>

        {/* 7-Day Rewards Path */}
        <div style={{ padding: '20px 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            {streakDays.map((item) => {
              const isCurrent = user.dailyStreak % 7 === item.day % 7;
              const isPast = (user.dailyStreak % 7 || 7) >= item.day;

              return (
                <div
                  key={item.day}
                  style={{
                    background: isCurrent
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%)'
                      : isPast
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: isCurrent
                      ? '1.5px solid #f59e0b'
                      : isPast
                      ? '1px solid #10b981'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '10px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>
                    Day {item.day}
                  </span>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: isCurrent ? '#fbbf24' : isPast ? '#34d399' : '#cbd5e1',
                    }}
                  >
                    +{item.reward}
                  </span>
                </div>
              );
            })}
          </div>

          {claimedNotice ? (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                borderRadius: '16px',
                padding: '16px',
                color: '#34d399',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                animation: 'pop 0.3s ease-out',
              }}
            >
              <span style={{ fontSize: '28px' }}>🎉</span>
              <strong style={{ fontSize: '16px' }}>Successfully Claimed +{claimedNotice.amount} Coins!</strong>
              <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                Your streak is now {claimedNotice.streak} days. Come back tomorrow for bigger prizes!
              </span>
            </div>
          ) : alreadyClaimed ? (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '16px',
                color: '#94a3b8',
                fontSize: '13px',
              }}
            >
              ✅ You've already collected today's reward! Next chest unlocks in tomorrow's round.
            </div>
          ) : (
            <button
              onClick={handleClaim}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4), 0 4px 0 #b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'transform 0.1s',
              }}
            >
              <span>🎁</span>
              <span>Open Today's Chest & Collect Free Coins</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
