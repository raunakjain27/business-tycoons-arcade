import React, { useEffect, useRef } from 'react';
import type { GameEvent } from '../../../../packages/engine/types';

interface GameLogProps {
  events: GameEvent[];
}

export const GameLog: React.FC<GameLogProps> = ({ events }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
          maxHeight: '220px',
          paddingRight: '6px',
        }}
      >
        {events.length === 0 ? (
          <div style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>
            Match events will appear here as players roll and trade.
          </div>
        ) : (
          events.map((e: GameEvent, idx: number) => {
            let icon = '📢';
            let color = '#cbd5e1';
            const isLast = idx === events.length - 1;

            if (e.type.includes('DICE')) {
              icon = '🎲';
              color = '#c4b5fd';
            } else if (e.type.includes('BOUGHT') || e.type.includes('BUILDING')) {
              icon = '🏠';
              color = '#6ee7b7';
            } else if (e.type.includes('RENT')) {
              icon = '💵';
              color = '#34d399';
            } else if (e.type.includes('TAX')) {
              icon = '🧾';
              color = '#fca5a5';
            } else if (e.type.includes('JAIL')) {
              icon = '⚖️';
              color = '#f87171';
            } else if (e.type.includes('EVENT')) {
              icon = '📜';
              color = '#fde047';
            } else if (e.type.includes('TRADE')) {
              icon = '🤝';
              color = '#38bdf8';
            } else if (e.type.includes('AUCTION')) {
              icon = '🔨';
              color = '#fbbf24';
            }

            return (
              <div
                key={idx}
                style={{
                  fontSize: '11px',
                  color: isLast ? '#ffffff' : color,
                  fontWeight: isLast ? 700 : 500,
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  lineHeight: 1.35,
                  padding: '4px 6px',
                  borderRadius: '6px',
                  background: isLast ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                }}
              >
                <span style={{ fontSize: '12px', lineHeight: 1 }}>{icon}</span>
                <span>{e.reason ?? e.type}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
