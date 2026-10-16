import React from 'react';
import type { GameState, TileId, TileState } from '../../../../packages/engine/types';
import { getTileDef, getDistrictDef, PLAYER_COLORS, formatCurrency } from '../boardData';
import { useGameStore } from '../store';

interface PlayerDashboardProps {
  gameState: GameState;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ gameState }) => {
  const { myPlayerId } = useGameStore();
  const isMobile = navigator.maxTouchPoints > 1 || window.innerWidth < 768;
  // Find owned tiles per player
  const tilesByOwner: Record<string, TileId[]> = {};
  for (const [idStr, tState] of Object.entries(gameState.tiles) as [string, TileState][]) {
    if (tState.ownerId) {
      if (!tilesByOwner[tState.ownerId]) tilesByOwner[tState.ownerId] = [];
      tilesByOwner[tState.ownerId].push(Number(idStr));
    }
  }

  return (
    <div
      className="player-dashboard-grid"
      style={{
        display: 'grid',          gridTemplateColumns: 'repeat(auto-fit, minmax(isMobile ? 160px : 220px, 1fr))',
            gap: isMobile ? '8px' : '12px',
            width: '100%',
          }}
    >
      {gameState.turnOrder.map((pId: string, idx: number) => {
        const player = gameState.players[pId];
        if (!player) return null;

        const isCurrentTurn = gameState.turnPlayerId === pId;
        const isMe = myPlayerId === pId;
        const isBankrupt = player.status === 'bankrupt';
        const playerColor = PLAYER_COLORS[idx % PLAYER_COLORS.length] ?? '#3b82f6';
    const isCompact = isMobile ? 'compact' : '';
        const ownedTiles = tilesByOwner[pId] ?? [];

        return (
          <div
            key={pId}
            style={{
              background: isCurrentTurn ? 'linear-gradient(135deg, #1f1a30 0%, #161522 100%)' : 'rgba(26, 22, 37, 0.9)',
              border: isCurrentTurn
                ? `2px solid ${playerColor}`
                : isMe
                ? '2px solid #a78bfa'
                : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: isMobile ? '10px' : '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '8px' : '10px',
              boxShadow: isCurrentTurn ? `0 6px 16px -2px ${playerColor}40, 0 2px 4px -1px rgba(0,0,0,0.5)` : '0 3px 4px -1px rgba(0,0,0,0.3)',
              opacity: isBankrupt ? 0.45 : 1,
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Active Turn Top Glow Bar */}
            {isCurrentTurn && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  backgroundColor: playerColor,
                  boxShadow: `0 0 8px ${playerColor}`,
                }}
              />
            )}

            {/* Header: Name, Role, Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: playerColor,
                    boxShadow: `0 0 6px ${playerColor}`,
                  }}
                />
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  {player.name}
                  {isMe && <span style={{ fontSize: '11px', color: '#38bdf8', marginLeft: '4px' }}>(You)</span>}
                </span>
              </div>

              {player.roleId && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#0f3460',
                    color: '#93c5fd',
                    textTransform: 'uppercase',
                  }}
                >
                  {player.roleId}
                </span>
              )}
            </div>

            {/* Metrics: Cash & Influence */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Cash</span>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: player.cash >= 0 ? '#10b981' : '#ef4444',
                  }}
                >
                  {formatCurrency(player.cash, gameState.boardKey)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Influence</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>
                  ★ {player.influence}
                </div>
              </div>
            </div>

            {/* Turn Timer for current player */}
            {isCurrentTurn && (() => {
              const timerActive = useGameStore.getState().turnTimerActive;
              const timerRem = useGameStore.getState().turnTimerRemaining;
              if (!timerActive || timerRem === null) return null;
              const low = timerRem <= 5;
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? '4px' : '6px',
                    padding: isMobile ? '3px 0' : '5px 0',
                    backgroundColor: low ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    borderRadius: isMobile ? '6px' : '8px',
                    border: low ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.25)',
                  }}
                >
                  <span style={{ fontSize: isMobile ? '14px' : '16px' }}>⏱</span>
                  <span style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 800, color: low ? '#fca5a5' : '#86efac' }}>
                    {timerRem}s
                  </span>
                  {low && <span style={{ fontSize: isMobile ? '8px' : '10px', color: '#fca5a5', animation: 'pulse 1s infinite' }}>hurry!</span>}
                </div>
              );
            })()}

            {/* Properties Owned Strip */}
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>
                Properties ({ownedTiles.length}):
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minHeight: '16px' }}>
                {ownedTiles.length > 0 ? (
                  ownedTiles.map(tId => {
                    const def = getTileDef(tId);
                    const district = getDistrictDef(def.districtId);
                    const color = district?.color ?? '#94a3b8';
                    return (
                      <div
                        key={tId}
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '2px',
                          backgroundColor: color,
                          boxShadow: `0 0 3px ${color}`,
                        }}
                        title={`${def.name} (${def.districtId ?? def.type})`}
                      />
                    );
                  })
                ) : (
                  <span style={{ fontSize: '11px', color: '#64748b' }}>None</span>
                )}
              </div>
            </div>

            {/* Status Badges */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {player.inJail && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: '#7f1d1d',
                    color: '#fca5a5',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  ⚖️ In Audit ({player.jailTurns}/3)
                </span>
              )}
              {isBankrupt && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: '#374151',
                    color: '#9ca3af',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Bankrupt
                </span>
              )}
              {player.hasRentWaiver && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: '#065f46',
                    color: '#6ee7b7',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Waiver Active
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
