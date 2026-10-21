import React, { useState, useEffect, useRef } from 'react';
import type { GameState, TileId, PlayerState } from '../../../../packages/engine/types';
import { BOARD_DATA, getTileDef, getDistrictDef, PLAYER_COLORS, AVAILABLE_PEGS, formatCurrency, updateTileName } from '../boardData';
import { useGameStore } from '../store';
import { DiceVisualizer } from './DiceVisualizer';
import { soundFx } from '../soundEffects';

interface BoardProps {
  gameState: GameState;
}

// Maps 40 tile IDs to 11x11 CSS Grid coordinates (1-indexed)
function getGridPosition(tileId: TileId): { row: number; col: number; isCorner: boolean; stripePos: 'top' | 'bottom' | 'left' | 'right' } {
  // Bottom row: tiles 0-10 (right to left)
  if (tileId === 0) return { row: 11, col: 11, isCorner: true, stripePos: 'top' };
  if (tileId >= 1 && tileId <= 9) return { row: 11, col: 11 - tileId, isCorner: false, stripePos: 'top' };
  if (tileId === 10) return { row: 11, col: 1, isCorner: true, stripePos: 'top' };

  // Left column: tiles 11-19 (bottom to top)
  if (tileId >= 11 && tileId <= 19) return { row: 11 - (tileId - 10), col: 1, isCorner: false, stripePos: 'right' };

  // Top row: tiles 20-30 (left to right)
  if (tileId === 20) return { row: 1, col: 1, isCorner: true, stripePos: 'bottom' };
  if (tileId >= 21 && tileId <= 29) return { row: 1, col: tileId - 19, isCorner: false, stripePos: 'bottom' };
  if (tileId === 30) return { row: 1, col: 11, isCorner: true, stripePos: 'bottom' };

  // Right column: tiles 31-39 (top to bottom)
  return { row: tileId - 29, col: 11, isCorner: false, stripePos: 'left' };
}

export const Board: React.FC<BoardProps> = ({ gameState }) => {
  const {
    selectedTile,
    setSelectedTile,
    myPlayerId,
    dispatchAction,
    dismissEventCard,
    initLocalGame,
    activeEmotes,
    sendEmote,
  } = useGameStore();

  const [editingTileId, setEditingTileId] = useState<TileId | null>(null);
  const [editNameInput, setEditNameInput] = useState('');

  // Step-by-step animated token movement
  const [visualPositions, setVisualPositions] = useState<Record<string, number>>({});
  const lastStatePositions = useRef<Record<string, number>>({});

  useEffect(() => {
    for (const [pId, pState] of Object.entries(gameState.players) as [string, PlayerState][]) {
      if (pState.status !== 'active') continue;
      const targetPos = pState.position;
      const prevPos = lastStatePositions.current[pId] ?? targetPos;

      if (prevPos !== targetPos) {
        lastStatePositions.current[pId] = targetPos;

        // If sent directly to jail, jump immediately and play jail door slam
        if (targetPos === 10 && pState.inJail) {
          setVisualPositions(prev => ({ ...prev, [pId]: 10 }));
          try { soundFx.playJailDoor(); } catch (e) {}
          continue;
        }

        // Calculate hop distance
        const stepDist = (targetPos - prevPos + 40) % 40;
        if (stepDist > 0 && stepDist <= 12) {
          let currentStep = 1;
          const interval = setInterval(() => {
            const nextStepPos = (prevPos + currentStep) % 40;
            setVisualPositions(prev => ({ ...prev, [pId]: nextStepPos }));
            try { soundFx.playStep(); } catch (e) {}

            if (currentStep >= stepDist) {
              clearInterval(interval);
              try { soundFx.vibrate(25); } catch (e) {}
            }
            currentStep++;
          }, 90);
        } else {
          setVisualPositions(prev => ({ ...prev, [pId]: targetPos }));
        }
      } else if (visualPositions[pId] === undefined) {
        setVisualPositions(prev => ({ ...prev, [pId]: targetPos }));
        lastStatePositions.current[pId] = targetPos;
      }
    }
  }, [gameState.players]);

  // Global Spacebar and Escape key shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState.phase === 'awaitRoll' && gameState.turnPlayerId === myPlayerId) {
          dispatchAction({ type: 'ROLL' });
        } else if (gameState.phase === 'awaitEndTurn' && gameState.turnPlayerId === myPlayerId) {
          dispatchAction({ type: 'END_TURN' });
        } else if (gameState.phase === 'resolveEvent' && gameState.turnPlayerId === myPlayerId) {
          dismissEventCard();
        }
      } else if (e.code === 'Escape') {
        setSelectedTile(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, gameState.turnPlayerId, myPlayerId, dispatchAction, dismissEventCard, setSelectedTile]);

  // Find which players are on which tile using visual positions
  const playersByTile: Record<TileId, string[]> = {};
  for (const [pId, pState] of Object.entries(gameState.players) as [string, PlayerState][]) {
    if (pState.status === 'active') {
      const pos = (visualPositions[pId] !== undefined ? visualPositions[pId] : pState.position) as TileId;
      if (!playersByTile[pos]) playersByTile[pos] = [];
      playersByTile[pos].push(pId);
    }
  }

  // Get color for player ID
  const getPlayerColor = (pId: string): string => {
    const idx = gameState.turnOrder.indexOf(pId);
    return PLAYER_COLORS[idx >= 0 ? idx % PLAYER_COLORS.length : 0] ?? '#3b82f6';
  };

  // Get peg icon for player
  const getPlayerPeg = (pId: string): { icon: string; animation: string } => {
    const p = gameState.players[pId];
    const peg = AVAILABLE_PEGS.find(item => item.id === p?.tokenId) || AVAILABLE_PEGS[0];
    return { icon: peg.icon, animation: peg.animation };
  };

  return (
    <>
      <style>{`
        @keyframes floatPeg {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-3px) scale(1.08); }
        }
        @keyframes bouncePeg {
          0%, 100% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-4px) scale(1.1); }
        }
        @keyframes floatEmote {
          0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          20% { transform: translate(-50%, -10px) scale(1.3); opacity: 1; }
          70% { transform: translate(-50%, -24px) scale(1.1); opacity: 0.95; }
          100% { transform: translate(-50%, -36px) scale(0.8); opacity: 0; }
        }
        @keyframes landmarkGlow {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(255,255,255,0.4)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 5px rgba(167,139,250,0.8)); transform: scale(1.08); }
        }
        .animated-landmark {
          display: inline-block;
          animation: landmarkGlow 2.5s infinite ease-in-out;
        }
        @media (max-width: 640px) {
          .board-responsive-container {
            padding: 3px !important;
            gap: 1.5px !important;
            grid-template-columns: minmax(36px, 1.35fr) repeat(9, minmax(18px, 1fr)) minmax(36px, 1.35fr) !important;
            grid-template-rows: minmax(36px, 1.35fr) repeat(9, minmax(18px, 1fr)) minmax(36px, 1.35fr) !important;
            aspect-ratio: 1 / 1 !important;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
            border-radius: 12px !important;
          }
          .board-responsive-container .animated-landmark {
            font-size: 11px !important;
          }
          .tile-city-name, .tile-label-name, .tile-flag-badge {
            display: none !important;
          }
          .tile-price-pill {
            font-size: 6px !important;
            padding: 0 2px !important;
            line-height: 1.1 !important;
          }
          .corner-jail-desktop {
            display: none !important;
          }
          .corner-jail-mobile {
            display: flex !important;
          }
          .board-center-console {
            padding: 6px !important;
            justify-content: center !important;
          }
          .board-event-log {
            display: none !important;
          }
          .board-player-peg {
            width: 12px !important;
            height: 12px !important;
            font-size: 7.5px !important;
          }
          .board-pegs-container {
            gap: 1px !important;
            bottom: 1px !important;
            right: 1px !important;
          }
          .dice-face-box {
            width: 38px !important;
            height: 38px !important;
          }
          .corner-start-circle {
            width: 18px !important;
            height: 18px !important;
            font-size: 10px !important;
          }
        }
        @media (max-width: 380px) {
          .board-responsive-container {
            padding: 2px !important;
            gap: 1px !important;
            grid-template-columns: minmax(30px, 1.3fr) repeat(9, minmax(14px, 1fr)) minmax(30px, 1.3fr) !important;
            grid-template-rows: minmax(30px, 1.3fr) repeat(9, minmax(14px, 1fr)) minmax(30px, 1.3fr) !important;
          }
          .board-responsive-container .animated-landmark {
            font-size: 9.5px !important;
          }
          .tile-price-pill {
            font-size: 5px !important;
          }
          .board-player-peg {
            width: 10px !important;
            height: 10px !important;
            font-size: 6.5px !important;
          }
          .dice-face-box {
            width: 32px !important;
            height: 32px !important;
          }
        }
      `}</style>

      <div
        className="board-responsive-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(84px, 1.4fr) repeat(9, minmax(56px, 1fr)) minmax(84px, 1.4fr)',
          gridTemplateRows: 'minmax(84px, 1.4fr) repeat(9, minmax(56px, 1fr)) minmax(84px, 1.4fr)',
          gap: '2px',
          backgroundColor: '#151026',
          padding: '12px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 50px rgba(124, 58, 237, 0.18)',
          width: '100%',
          maxWidth: '860px',
          aspectRatio: '1 / 1',
          userSelect: 'none',
          margin: '0 auto',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        {/* 40 Tiles */}
        {BOARD_DATA.tiles.map(tile => {
          const { row, col, isCorner, stripePos } = getGridPosition(tile.id);
          const tState = gameState.tiles[tile.id];
          const district = getDistrictDef(tile.districtId);
          const stripeColor = district?.color ?? null;
          const ownerColor = tState?.ownerId ? getPlayerColor(tState.ownerId) : null;
          const playersHere = playersByTile[tile.id] ?? [];
          const isSelected = selectedTile === tile.id;

          const tier = tState?.tier ?? 0;
          const isMortgaged = tState?.mortgaged ?? false;

          return (
            <div
              key={tile.id}
              className="board-tile"
              data-tile-id={tile.id}
              onClick={() => setSelectedTile(tile.id)}
              style={{
                gridRow: row,
                gridColumn: col,
                backgroundColor: isSelected ? '#332356' : '#1e1837',
                border: isSelected
                  ? '2px solid #a78bfa'
                  : ownerColor
                  ? `1.5px solid ${ownerColor}`
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isSelected
                  ? '0 0 10px rgba(167, 139, 250, 0.5)'
                  : ownerColor
                  ? `inset 0 0 4px ${ownerColor}50`
                  : 'none',
                borderRadius: isCorner ? '6px' : '4px',
                display: 'flex',
                flexDirection: stripePos === 'top' ? 'column' : stripePos === 'bottom' ? 'column-reverse' : stripePos === 'left' ? 'row' : 'row-reverse',
                position: 'relative',
                overflow: 'visible',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                padding: '0px',
              }}
              title={`${tile.name}${tile.price ? ` - ${formatCurrency(tile.price, gameState.boardKey)}` : ''}`}
            >
              {/* Richup-style District Color Bar with Houses & Hotel */}
              {stripeColor && (
                <div
                  style={{
                    height: stripePos === 'top' || stripePos === 'bottom' ? '9px' : '100%',
                    width: stripePos === 'left' || stripePos === 'right' ? '9px' : '100%',
                    backgroundColor: stripeColor,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1px',
                    overflow: 'hidden',
                  }}
                >
                  {tier === 4 ? (
                    <span style={{ fontSize: '7.5px', lineHeight: 1 }} title="Hotel">🏨</span>
                  ) : tier > 0 ? (
                    Array.from({ length: tier }).map((_, i) => (
                      <span key={i} style={{ fontSize: '6.5px', lineHeight: 1 }} title={`${tier} Houses`}>🏠</span>
                    ))
                  ) : null}
                </div>
              )}

              {/* Mortgaged Warning Stripe Overlay */}
              {isMortgaged && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.18), rgba(239, 68, 68, 0.18) 5px, rgba(0, 0, 0, 0.45) 5px, rgba(0, 0, 0, 0.45) 10px)',
                    border: '1.5px dashed rgba(239, 68, 68, 0.7)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ fontSize: '8px', backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '1px 3px', borderRadius: '3px', fontWeight: 900 }}>
                    🔒 MORT
                  </span>
                </div>
              )}

              {/* Tile Body */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexGrow: 1,
                  padding: isCorner ? '3px' : '2px 1px',
                  textAlign: 'center',
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  overflow: 'visible',
                }}
              >
                {/* Corner Tiles */}
                {isCorner ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {/* START */}
                    {tile.id === 0 && (
                      <>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#a3e635', letterSpacing: '0.8px' }}>
                          START
                        </span>
                        <div
                          className="corner-start-circle"
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: '#8b5cf6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            marginTop: '2px',
                            boxShadow: '0 0 10px rgba(139, 92, 246, 0.6)',
                          }}
                        >
                          👾
                        </div>
                        <span style={{ fontSize: '8px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                          +{formatCurrency(200, gameState.boardKey)}
                        </span>
                      </>
                    )}

                    {/* IN PRISON (Corner 10) with Prison Cell Bars & Pass Through Alley */}
                    {tile.id === 10 && (
                      <>
                        {/* Mobile Clean View */}
                        <div
                          className="corner-jail-mobile"
                          style={{
                            display: 'none',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            width: '100%',
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>⚖️</span>
                          <span style={{ fontSize: '7.5px', color: '#f87171', fontWeight: 900, textTransform: 'uppercase', marginTop: '1px' }}>
                            JAIL
                          </span>
                        </div>

                        {/* Desktop Detailed Split View */}
                        <div
                          className="corner-jail-desktop"
                          style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}
                        >
                          <div
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              padding: '1px',
                              borderRight: '1px dashed rgba(255,255,255,0.2)',
                            }}
                          >
                            <span style={{ fontSize: '7.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                              Pass
                            </span>
                            <span style={{ fontSize: '7px', color: '#64748b' }}>Through</span>
                          </div>

                          <div
                            style={{
                              flex: 1.2,
                              backgroundColor: '#271f3b',
                              borderRadius: '4px',
                              border: '1px solid #4a3b69',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '1px',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(148, 163, 184, 0.45) 4px, rgba(148, 163, 184, 0.45) 6px)',
                                pointerEvents: 'none',
                              }}
                            />
                            <span style={{ fontSize: '13px', zIndex: 1 }}>⚖️</span>
                            <span style={{ fontSize: '7.5px', color: '#f87171', fontWeight: 800, zIndex: 1, textTransform: 'uppercase' }}>
                              In Jail
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* VACATION (Corner 20) with Vacation Cash on spot */}
                    {tile.id === 20 && (
                      <>
                        <div style={{ fontSize: '18px' }}>🌴</div>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#f8fafc' }}>Vacation</span>
                        <div
                          style={{
                            marginTop: '2px',
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid #10b981',
                            borderRadius: '4px',
                            padding: '1px 4px',
                            fontSize: '8px',
                            fontWeight: 800,
                            color: '#34d399',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <span>💵</span>
                          <span>{formatCurrency(gameState.communityFund, gameState.boardKey)}</span>
                        </div>
                      </>
                    )}

                    {/* GO TO PRISON (Corner 30) */}
                    {tile.id === 30 && (
                      <>
                        <div style={{ fontSize: '18px' }}>☠️</div>
                        <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#f87171', lineHeight: 1.1, textTransform: 'uppercase' }}>
                          Go To
                        </span>
                        <span style={{ fontSize: '9.5px', fontWeight: 900, color: '#ffffff' }}>
                          Prison
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Top: Price Pill or Tax Header */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                      {tile.price ? (
                        <span
                          className="tile-price-pill"
                          style={{
                            fontSize: '8.5px',
                            fontWeight: 700,
                            color: '#e2e8f0',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatCurrency(tile.price, gameState.boardKey)}
                        </span>
                      ) : tile.type === 'tax' ? (
                        <span className="tile-label-name" style={{ fontSize: '7.5px', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {tile.name}
                        </span>
                      ) : (
                        <span className="tile-label-name" style={{ fontSize: '8px', fontWeight: 700, color: '#c084fc', whiteSpace: 'nowrap' }}>
                          {tile.name}
                        </span>
                      )}
                    </div>

                    {/* Middle: Distinct Landmark + Country Flag & City Name */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1px',
                        width: '100%',
                      }}
                    >
                      {/* Airports */}
                      {tile.type === 'hub' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '16px' }}>✈️</span>
                          <span className="tile-label-name" style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.1 }}>
                            {tile.name}
                          </span>
                        </div>
                      )}

                      {/* Utilities */}
                      {tile.type === 'utility' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '16px' }}>
                            {tile.name.includes('Water') ? '💧' : '⚡'}
                          </span>
                          <span className="tile-label-name" style={{ fontSize: '7.5px', fontWeight: 700, color: '#94a3b8', textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.1 }}>
                            {tile.name}
                          </span>
                        </div>
                      )}

                      {/* Treasure */}
                      {tile.name === 'Treasure' && (
                        <div
                          style={{
                            width: '26px',
                            height: '22px',
                            backgroundColor: '#b45309',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          }}
                        >
                          📦
                        </div>
                      )}

                      {/* Surprise */}
                      {tile.name.includes('Surprise') && (
                        <div
                          style={{
                            fontSize: '22px',
                            fontWeight: 900,
                            color: '#f43f5e',
                            textShadow: '0 0 10px rgba(244, 63, 94, 0.6)',
                            lineHeight: 1,
                          }}
                        >
                          ?
                        </div>
                      )}

                      {/* Taxes */}
                      {tile.type === 'tax' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '15px' }}>💵</span>
                          <span style={{ fontSize: '8px', color: '#38bdf8', fontWeight: 700 }}>
                            {tile.taxAmount ? formatCurrency(tile.taxAmount, gameState.boardKey) : '10%'}
                          </span>
                        </div>
                      )}

                      {/* Standard Property with Landmark + Flag */}
                      {tile.type === 'property' && (
                        <>
                          {/* Distinct Animated Landmark Badge */}
                          {tile.landmark && (
                            <span
                              className="animated-landmark"
                              style={{ fontSize: '14px', lineHeight: 1 }}
                              title={tile.landmarkName ?? tile.name}
                            >
                              {tile.landmark}
                            </span>
                          )}

                          {/* City Name - 2 lines wrapped cleanly so it never clips */}
                          <span
                            className="tile-city-name"
                            style={{
                              fontSize: tile.name.length > 11 ? '8px' : '8.5px',
                              fontWeight: 700,
                              color: '#f8fafc',
                              lineHeight: 1.1,
                              maxWidth: '100%',
                              textAlign: 'center',
                              wordBreak: 'break-word',
                              hyphens: 'auto',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              padding: '0 1px',
                            }}
                          >
                            {tile.name}
                          </span>

                          {/* Country Flag or 18+ Custom Edit Button */}
                          {gameState.boardKey === 'customfriends' ? (
                            <button
                              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                e.stopPropagation();
                                setEditingTileId(tile.id);
                                setEditNameInput(tile.name);
                              }}
                              style={{
                                background: 'rgba(236, 72, 153, 0.25)',
                                border: '1px solid #ec4899',
                                borderRadius: '4px',
                                color: '#f472b6',
                                fontSize: '8px',
                                padding: '1px 3px',
                                cursor: 'pointer',
                                lineHeight: 1,
                              }}
                              title="Click to edit friend's name"
                            >
                              ✏️ Edit
                            </button>
                          ) : tile.flag ? (
                            <span
                              className="tile-flag-badge"
                              style={{ fontSize: '12px', lineHeight: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
                            >
                              {tile.flag}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>

                    {/* Bottom: Owner Dot & Buildings */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {ownerColor && (
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: ownerColor,
                            boxShadow: `0 0 6px ${ownerColor}`,
                          }}
                          title={`Owned by ${tState?.ownerId}`}
                        />
                      )}
                      {tier > 0 && (
                        <div style={{ display: 'flex', gap: '1px' }}>
                          {Array.from({ length: tier }).map((_, i) => (
                            <div
                              key={i}
                              style={{
                                width: '4px',
                                height: '4px',
                                borderRadius: '1px',
                                backgroundColor: tier === 4 ? '#eab308' : '#22c55e',
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {isMortgaged && (
                        <span style={{ fontSize: '7px', color: '#ef4444', fontWeight: 800 }}>M</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Entertaining Animated Player Pegs */}
              {playersHere.length > 0 && (
                <div
                  className="board-pegs-container"
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    display: 'flex',
                    gap: '2px',
                    flexWrap: 'wrap',
                    zIndex: 2,
                  }}
                >
                  {playersHere.map(pId => {
                    const pColor = getPlayerColor(pId);
                    const peg = getPlayerPeg(pId);
                    const isCurrent = gameState.turnPlayerId === pId;
                    const isMe = pId === myPlayerId;
                    return (
                      <div
                        key={pId}
                        className="board-player-peg"
                        style={{
                          width: '17px',
                          height: '17px',
                          borderRadius: '50%',
                          backgroundColor: pColor,
                          border: isMe ? '2px solid #ffffff' : '1px solid #0f172a',
                          boxShadow: isCurrent ? `0 0 10px ${pColor}, 0 0 14px #ffffff` : `0 0 4px ${pColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          lineHeight: 1,
                          animation: isCurrent ? 'bouncePeg 1.2s infinite ease-in-out' : 'floatPeg 3s infinite ease-in-out',
                          position: 'relative',
                        }}
                        title={`${gameState.players[pId]?.name}${isCurrent ? ' (Active Turn)' : ''}`}
                      >
                        {peg.icon}
                        {/* Floating Emote for this player */}
                        {activeEmotes
                          .filter(em => em.playerId === pId)
                          .map(em => (
                            <div
                              key={em.id}
                              style={{
                                position: 'absolute',
                                top: '-24px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '18px',
                                animation: 'floatEmote 2.4s forwards ease-out',
                                pointerEvents: 'none',
                                zIndex: 25,
                              }}
                            >
                              {em.emoji}
                            </div>
                          ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Turn Timer Display */}
        {(() => {
          const timerActive = useGameStore.getState().turnTimerActive;
          const timerRem = useGameStore.getState().turnTimerRemaining;
          if (!timerActive || timerRem === null) return null;
          const low = timerRem <= 5;
          return (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '10px',
                backgroundColor: low ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.20)',
                border: low ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '20px',
                padding: '3px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 700,
                color: low ? '#fca5a5' : '#86efac',
                animation: low ? 'pulse 1s infinite' : 'none',
                zIndex: 10,
              }}
            >
              <span style={{ fontSize: '11px' }}>⏱</span>
              <span>{timerRem}s</span>
            </div>
          );
        })()}

        {/* Board Center Console: Dice shifted up, Roll button, Event Log integrated below */}
        <div
          className="board-center-console"
          style={{
            gridRow: '2 / 11',
            gridColumn: '2 / 11',
            backgroundColor: '#161127',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '12px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top of Center: Dice Visualizer moved up */}
          <div style={{ marginTop: '2px', marginBottom: '6px' }}>
            <DiceVisualizer dice={gameState.lastDice} version={gameState.version} />
          </div>

          {/* Vacation / Free Parking Jackpot Pot */}
          {gameState.communityFund > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25) 0%, rgba(202, 138, 4, 0.35) 100%)',
                border: '1px solid rgba(234, 179, 8, 0.6)',
                borderRadius: '20px',
                padding: '3px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#fef08a',
                marginBottom: '6px',
                boxShadow: '0 2px 10px rgba(234, 179, 8, 0.25)',
                animation: 'pulse 2s infinite',
              }}
              title="All taxes & fines accumulate here. Land on Vacation to collect!"
            >
              <span>🌴 Vacation Jackpot:</span>
              <span style={{ color: '#ffffff', fontSize: '13px' }}>
                {formatCurrency(gameState.communityFund, gameState.boardKey)}
              </span>
            </div>
          )}

          {/* Richup-style Quick Emotes Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '20px',
              padding: '2px 8px',
              marginBottom: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {['😂', '😭', '💸', '🎲', '👑', '🔥', '💀', '🤝'].map(emoji => (
              <button
                key={emoji}
                onClick={() => sendEmote(emoji)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '2px 3px',
                  lineHeight: 1,
                  borderRadius: '4px',
                  transition: 'transform 0.1s ease',
                }}
                onMouseEnter={(e: any) => e.currentTarget.style.transform = 'scale(1.3)'}
                onMouseLeave={(e: any) => e.currentTarget.style.transform = 'scale(1)'}
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Roll Action Button in Center */}
          {gameState.phase === 'awaitRoll' && gameState.turnPlayerId === myPlayerId && (
            <button
              onClick={() => dispatchAction({ type: 'ROLL' })}
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                marginBottom: '8px',
              }}
            >
              <span>🎲</span>
              <span>Roll Dice</span>
            </button>
          )}

          {/* Resolve Event Action Button in Center */}
          {gameState.phase === 'resolveEvent' && gameState.turnPlayerId === myPlayerId && (
            <button
              onClick={dismissEventCard}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background:
                  gameState.players[gameState.turnPlayerId]?.doublesStreak > 0 &&
                  !gameState.players[gameState.turnPlayerId]?.inJail
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #fcd581 0%, #f59e0b 100%)',
                color:
                  gameState.players[gameState.turnPlayerId]?.doublesStreak > 0 &&
                  !gameState.players[gameState.turnPlayerId]?.inJail
                    ? '#ffffff'
                    : '#0f172a',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                marginBottom: '8px',
              }}
            >
              {gameState.players[gameState.turnPlayerId]?.doublesStreak > 0 &&
              !gameState.players[gameState.turnPlayerId]?.inJail
                ? '🎲 Roll Again (Doubles!)'
                : 'Next Player ➔'}
            </button>
          )}

          {/* Buy Decision Action Buttons in Center */}
          {gameState.phase === 'awaitBuyDecision' && gameState.turnPlayerId === myPlayerId && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => dispatchAction({ type: 'BUY' })}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                }}
              >
                Buy Property
              </button>
              <button
                onClick={() => dispatchAction({ type: 'DECLINE_BUY' })}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Pass / Auction
              </button>
            </div>
          )}

          {/* End Turn Action Button in Center */}
          {gameState.phase === 'awaitEndTurn' && gameState.turnPlayerId === myPlayerId && (
            <button
              onClick={() => dispatchAction({ type: 'END_TURN' })}
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>End Turn ➔</span>
            </button>
          )}

          {/* Jail Choices in Center */}
          {gameState.phase === 'awaitJailChoice' && gameState.turnPlayerId === myPlayerId && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => dispatchAction({ type: 'ROLL' })}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                🎲 Roll for Doubles
              </button>
              {gameState.players[myPlayerId]?.cash >= 50 && (
                <button
                  onClick={() => dispatchAction({ type: 'PAY_JAIL_FEE' })}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid #10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#6ee7b7',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  💵 Pay $50
                </button>
              )}
              {gameState.players[myPlayerId]?.heldCards.includes('jail_card') && (
                <button
                  onClick={() => dispatchAction({ type: 'USE_JAIL_CARD' })}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid #eab308',
                    backgroundColor: 'rgba(234, 179, 8, 0.2)',
                    color: '#fde047',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📜 Use Card
                </button>
              )}
            </div>
          )}

          {/* Debt Settlement in Center */}
          {gameState.phase === 'awaitDebtSettlement' && gameState.turnPlayerId === myPlayerId && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => dispatchAction({ type: 'RAISE_FUNDS_DONE' })}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background:
                    gameState.players[myPlayerId]?.cash >= 0
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {gameState.players[myPlayerId]?.cash >= 0 ? 'Clear Debt & Continue ➔' : 'Declare Bankruptcy'}
              </button>
            </div>
          )}

          {/* Live Auction Banner in Center */}
          {gameState.phase === 'auction' && gameState.auction && (
            <div
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid #eab308',
                borderRadius: '8px',
                padding: '6px 14px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🔨</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fef08a' }}>
                Auction in progress: High Bid ${gameState.auction.highBid} (
                {gameState.auction.highBidder
                  ? gameState.players[gameState.auction.highBidder]?.name ?? 'Anonymous'
                  : 'Starting'}
                )
              </span>
            </div>
          )}

          {/* Game Over in Board Center */}
          {gameState.phase === 'gameOver' && (
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <button
                onClick={() => initLocalGame(4, gameState.players[myPlayerId]?.name || 'Player 1')}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  color: '#0f172a',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(234, 179, 8, 0.4)',
                }}
              >
                👑 Match Concluded — Play Again ↺
              </button>
            </div>
          )}

          {/* Turn indicator badge when not your turn */}
          {gameState.turnPlayerId !== myPlayerId && gameState.phase !== 'gameOver' && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '4px 10px',
                borderRadius: '12px',
                marginBottom: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>⏳</span>
              <span>{gameState.players[gameState.turnPlayerId]?.name || 'Player'}'s turn</span>
            </div>
          )}

          {/* Embedded Game Event Log Directly On The Board (Below Dice) */}
          <div
            className="board-event-log"
            style={{
              width: '100%',
              flex: 1,
              minHeight: '130px',
              maxHeight: '210px',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left',
              marginTop: '2px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📜 Board Event Log
              </span>
              <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                Room: {gameState.id.toLowerCase().replace('local-', '')}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                paddingRight: '4px',
              }}
            >
              {gameState.log.slice(-15).reverse().map((e, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '10.5px',
                    color: idx === 0 ? '#f8fafc' : '#94a3b8',
                    fontWeight: idx === 0 ? 600 : 400,
                    lineHeight: 1.25,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    paddingBottom: '2px',
                  }}
                >
                  <span style={{ marginRight: '4px' }}>
                    {e.type.includes('DICE') ? '🎲' : e.type.includes('RENT') ? '💵' : e.type.includes('JAIL') ? '⚖️' : '🔹'}
                  </span>
                  <span>{e.reason || e.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* Live On-Board Tile Renaming Modal */}
        {editingTileId !== null && (
          <div
            onClick={() => setEditingTileId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
            }}
          >
            <div
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
              style={{
                width: '320px',
                backgroundColor: '#1f1938',
                borderRadius: '16px',
                border: '1px solid #ec4899',
                padding: '24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(236,72,153,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '28px' }}>✏️👥</span>
                <h3 style={{ margin: '8px 0 4px 0', fontSize: '18px', color: '#f8fafc' }}>
                  Rename Board Tile
                </h3>
                <span style={{ fontSize: '12px', color: '#ec4899', fontWeight: 600 }}>
                  Tile #{editingTileId} (18+ Custom Friends)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Friend or Custom Name:</label>
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditNameInput(e.target.value)}
                  placeholder="Enter name (e.g. Rachel Green)"
                  autoFocus
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setEditingTileId(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#94a3b8',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editNameInput.trim()) {
                      updateTileName(editingTileId, editNameInput.trim());
                      setEditingTileId(null);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#ec4899',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save Name
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
