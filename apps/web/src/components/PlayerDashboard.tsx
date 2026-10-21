import React from 'react';
import type { GameState, TileId, TileState } from '../../../../packages/engine/types';
import { getTileDef, getDistrictDef, PLAYER_COLORS, formatCurrency } from '../boardData';
import { useGameStore } from '../store';
import { soundFx } from '../soundEffects';

interface PlayerDashboardProps {
  gameState: GameState;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ gameState }) => {
  const { myPlayerId, setShowTradeModal, setSelectedTradePartner } = useGameStore();
  const isMobile = typeof window !== 'undefined' && (navigator.maxTouchPoints > 1 || window.innerWidth < 768);

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
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '12px',
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
        const ownedTiles = tilesByOwner[pId] ?? [];

        return (
          <div
            key={pId}
            style={{
              background: isCurrentTurn
                ? `linear-gradient(135deg, rgba(26, 32, 54, 0.95) 0%, rgba(16, 20, 36, 0.95) 100%)`
                : 'rgba(16, 21, 35, 0.8)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: isCurrentTurn
                ? `1.5px solid ${playerColor}`
                : isMe
                ? '1px solid rgba(139, 92, 246, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: isCurrentTurn
                ? `0 8px 24px -4px ${playerColor}40, 0 0 16px ${playerColor}25`
                : '0 4px 16px rgba(0, 0, 0, 0.3)',
              opacity: isBankrupt ? 0.4 : 1,
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Active Turn Neon Bar */}
            {isCurrentTurn && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  backgroundColor: playerColor,
                  boxShadow: `0 0 12px ${playerColor}`,
                }}
              />
            )}

            {/* Header: Avatar, Name, Role Tag */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: playerColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    boxShadow: isCurrentTurn ? `0 0 10px ${playerColor}` : 'none',
                    border: '1.5px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  {idx === 0 ? '👑' : idx === 1 ? '🤖' : idx === 2 ? '⚡' : '🎩'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                      {player.name}
                    </span>
                    {isMe && (
                      <span
                        style={{
                          fontSize: '9.5px',
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.15)',
                          padding: '1px 5px',
                          borderRadius: '8px',
                          fontWeight: 700,
                        }}
                      >
                        YOU
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>
                    {player.roleId || 'Tycoon'}
                  </span>
                </div>
              </div>

              {/* Actions & Turn Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {!isMe && !isBankrupt && (
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      setSelectedTradePartner(pId);
                      setShowTradeModal(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(124, 58, 237, 0.35) 100%)',
                      border: '1px solid rgba(168, 85, 247, 0.6)',
                      color: '#d8b4fe',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
                    }}
                    title={`Initiate trade negotiation with ${player.name}`}
                  >
                    <span>🤝</span>
                    <span>TRADE</span>
                  </button>
                )}

                {isCurrentTurn ? (
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: `${playerColor}25`,
                      color: playerColor,
                      border: `1px solid ${playerColor}55`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: playerColor }} />
                    <span>ACTIVE</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Cash & Influence Display */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <div>
                <span style={{ fontSize: '9.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Balance
                </span>
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: 900,
                    color: player.cash >= 0 ? '#10b981' : '#ef4444',
                    letterSpacing: '-0.3px',
                    lineHeight: 1.1,
                  }}
                >
                  {formatCurrency(player.cash, gameState.boardKey)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '9.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Influence
                </span>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#f59e0b', lineHeight: 1.1 }}>
                  ★ {player.influence}
                </div>
              </div>
            </div>

            {/* Property Portfolio Chips */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                  Properties ({ownedTiles.length})
                </span>
                {ownedTiles.length > 0 && (
                  <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                    {ownedTiles.length} owned
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', minHeight: '18px', alignItems: 'center' }}>
                {ownedTiles.length > 0 ? (
                  ownedTiles.map(tId => {
                    const def = getTileDef(tId);
                    const district = getDistrictDef(def.districtId);
                    const color = district?.color ?? '#94a3b8';
                    return (
                      <div
                        key={tId}
                        style={{
                          width: '14px',
                          height: '8px',
                          borderRadius: '2px',
                          backgroundColor: color,
                          boxShadow: `0 0 5px ${color}88`,
                          cursor: 'pointer',
                        }}
                        title={`${def.name} (${def.districtId ?? def.type})`}
                      />
                    );
                  })
                ) : (
                  <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>
                    No properties acquired
                  </span>
                )}
              </div>
            </div>

            {/* Badges: Audit / Bankrupt / Waiver */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {player.inJail && (
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '2px 7px',
                    borderRadius: '6px',
                  }}
                >
                  ⚖️ In Audit ({player.jailTurns}/3)
                </span>
              )}
              {isBankrupt && (
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    backgroundColor: 'rgba(100, 116, 139, 0.2)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(100, 116, 139, 0.4)',
                    padding: '2px 7px',
                    borderRadius: '6px',
                  }}
                >
                  Bankrupt
                </span>
              )}
              {player.hasRentWaiver && (
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    padding: '2px 7px',
                    borderRadius: '6px',
                  }}
                >
                  🛡️ Waiver Active
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
