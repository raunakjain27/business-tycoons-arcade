import React, { useEffect, useState } from 'react';

interface DiceVisualizerProps {
  dice: [number, number] | null;
  isRolling?: boolean;
}

const DIE_PIPS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

export const DiceVisualizer: React.FC<DiceVisualizerProps> = ({ dice, isRolling = false }) => {
  const [displayDice, setDisplayDice] = useState<[number, number]>(dice ?? [1, 1]);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (dice) {
      setAnimating(true);
      // Brief sound effect using Web Audio API synthesized rattle
      playDiceSound();

      // Rapidly tumble dice values for 600ms
      const interval = setInterval(() => {
        setDisplayDice([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
      }, 70);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setDisplayDice(dice);
        setAnimating(false);
      }, 600);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [dice?.[0], dice?.[1]]);

  const isSingle = (dice && dice[1] === 0) || (displayDice[1] === 0);
  const isDoubles = !isSingle && displayDice[0] === displayDice[1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        <DieFace value={displayDice[0] || 1} animating={animating || isRolling} />
        {!isSingle && (
          <DieFace value={displayDice[1] || 1} animating={animating || isRolling} />
        )}
      </div>

      {dice && !animating && isDoubles && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
            boxShadow: '0 0 14px rgba(244, 63, 94, 0.6)',
            animation: 'doublesPulse 1s ease infinite',
          }}
        >
          ⚡ DOUBLES! ROLL AGAIN ⚡
        </div>
      )}

      <style>{`
        @keyframes diceTumble {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(15deg) scale(1.08) translateY(-4px); }
          50% { transform: rotate(-15deg) scale(1.12) translateY(-8px); }
          75% { transform: rotate(10deg) scale(1.06) translateY(-3px); }
          100% { transform: rotate(0deg) scale(1) translateY(0); }
        }
        @keyframes doublesPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(244,63,94,0.6)); }
          50% { transform: scale(1.06); filter: drop-shadow(0 0 16px rgba(244,63,94,0.9)); }
        }
      `}</style>
    </div>
  );
};

const DieFace: React.FC<{ value: number; animating: boolean }> = ({ value, animating }) => {
  const pips = DIE_PIPS[value] || DIE_PIPS[1];

  return (
    <div
      style={{
        width: '46px',
        height: '46px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        position: 'relative',
        boxShadow: animating
          ? '0 12px 20px -3px rgba(0,0,0,0.5), inset 0 -3px 0 #cbd5e1, 0 0 16px rgba(255,255,255,0.4)'
          : '0 8px 16px -2px rgba(0,0,0,0.4), inset 0 -3px 0 #cbd5e1',
        border: '1px solid #e2e8f0',
        animation: animating ? 'diceTumble 0.15s infinite' : 'none',
        transition: 'transform 0.15s ease',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        {pips.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={value === 1 ? 14 : 9}
            fill={value === 1 ? '#e11d48' : '#0f172a'}
          />
        ))}
      </svg>
    </div>
  );
};

function playDiceSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Synthesize short rattling clicking noise
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 + Math.random() * 200, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.06);
    }
  } catch {
    // Audio context not allowed without interaction, fail gracefully
  }
}
