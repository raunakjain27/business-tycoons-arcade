import React from 'react';
import { useCelebrationStore } from '../celebrationStore';
import { useHubStore } from '../hubStore';
import { soundFx } from '../soundEffects';

export const VictoryCelebrationModal: React.FC = () => {
  const { isOpen, data, closeCelebration } = useCelebrationStore();
  const { setView } = useHubStore();

  if (!isOpen || !data) return null;

  const handleReturnToHub = () => {
    soundFx.playClick();
    closeCelebration();
    setView('dashboard');
  };

  const handlePlayAgain = () => {
    soundFx.playClick();
    closeCelebration();
  };

  // Generate 40 simulated colorful confetti streamers
  const confettiPieces = Array.from({ length: 42 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    duration: `${2 + Math.random() * 2}s`,
    color: ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#f43f5e'][i % 6],
    size: 6 + Math.random() * 8,
    isStar: i % 4 === 0,
  }));

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg) scale(1.1);
            opacity: 0.1;
          }
        }
        @keyframes trophyFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.05); }
        }
        @keyframes crownGlow {
          0%, 100% { filter: drop-shadow(0 0 10px #f59e0b); }
          50% { filter: drop-shadow(0 0 25px #fbbf24); }
        }
      `}</style>

      {/* Confetti Rain Layer */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 300,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {confettiPieces.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              top: '-20px',
              left: p.left,
              width: `${p.size}px`,
              height: p.isStar ? `${p.size}px` : `${p.size * 2}px`,
              backgroundColor: p.color,
              borderRadius: p.isStar ? '50%' : '2px',
              animation: `confettiFall ${p.duration} linear ${p.delay} infinite`,
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      {/* Main Modal Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 310,
          backgroundColor: 'rgba(5, 3, 10, 0.9)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            background: 'linear-gradient(145deg, #1f1832 0%, #100b1e 100%)',
            borderRadius: '28px',
            border: '2px solid rgba(245, 158, 11, 0.45)',
            boxShadow: '0 30px 80px -15px rgba(0, 0, 0, 0.8), 0 0 50px rgba(245, 158, 11, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '36px 28px',
            textAlign: 'center',
            color: '#f8fafc',
            position: 'relative',
          }}
        >
          {/* Close button */}
          <button
            onClick={closeCelebration}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>

          {/* Trophy & Champion Avatar */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '64px',
                animation: 'crownGlow 2s infinite ease-in-out, trophyFloat 3s infinite ease-in-out',
                display: 'inline-block',
              }}
            >
              👑
            </div>
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                border: '4px solid #ffffff',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '44px',
                margin: '-16px auto 0',
              }}
            >
              {data.winnerAvatar}
            </div>
          </div>

          {/* Header Texts */}
          <span
            style={{
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#f59e0b',
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '4px 12px',
              borderRadius: '20px',
              marginBottom: '8px',
            }}
          >
            {data.gameTitle} Champion
          </span>

          <h2
            style={{
              fontSize: '28px',
              fontWeight: 900,
              margin: '0 0 6px',
              color: '#ffffff',
              letterSpacing: '-0.5px',
            }}
          >
            {data.winnerName} Wins!
          </h2>

          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.4 }}>
            {data.reason || 'Outstanding match! Congratulations on claiming the championship trophy.'}
          </p>

          {/* Rewards Gain Strip */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              width: '100%',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                flex: 1,
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 800 }}>
                COINS WON
              </span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#fbbf24' }}>
                +{data.coinsAwarded} 🪙
              </span>
            </div>

            <div
              style={{
                flex: 1,
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1.5px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 800 }}>
                XP EARNED
              </span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#c084fc' }}>
                +{data.xpAwarded} 🌟
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              onClick={handlePlayAgain}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '16px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(245, 158, 11, 0.4), 0 3px 0 #b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>🔄</span>
              <span>Play Again</span>
            </button>

            <button
              onClick={handleReturnToHub}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#f8fafc',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>🎮</span>
              <span>Arcade Hub</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
