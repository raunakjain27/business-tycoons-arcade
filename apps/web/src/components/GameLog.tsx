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
        backgroundColor: '#16213e',
        borderRadius: '12px',
        border: '1px solid #243356',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
        maxHeight: '200px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
          Game Event Log
        </h4>
        <span style={{ fontSize: '11px', color: '#64748b' }}>{events.length} events</span>
      </div>

      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
          paddingRight: '6px',
        }}
      >
        {events.map((e: GameEvent, idx: number) => {
          let icon = '📢';
          if (e.type.includes('DICE')) icon = '🎲';
          else if (e.type.includes('BOUGHT') || e.type.includes('BUILDING')) icon = '🏠';
          else if (e.type.includes('RENT')) icon = '💵';
          else if (e.type.includes('TAX')) icon = '🧾';
          else if (e.type.includes('JAIL')) icon = '⚖️';
          else if (e.type.includes('EVENT')) icon = '📜';
          else if (e.type.includes('TRADE')) icon = '🤝';
          else if (e.type.includes('AUCTION')) icon = '🔨';

          return (
            <div
              key={idx}
              style={{
                fontSize: '12px',
                color: '#e2e8f0',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                lineHeight: 1.4,
              }}
            >
              <span>{icon}</span>
              <span>{e.reason ?? e.type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
