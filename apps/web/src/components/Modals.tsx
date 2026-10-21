import React, { useState, useEffect } from 'react';
import type { GameState, TileId, TileState } from '../../../../packages/engine/types';
import { getTileDef, getDistrictDef, INFLUENCE_ITEMS, PLAYER_ROLES, formatCurrency } from '../boardData';
import { useGameStore } from '../store';
import { ownsFullDistrict } from '../computeRent';
import { soundFx } from '../soundEffects';

interface ModalsProps {
  gameState: GameState;
}

export const Modals: React.FC<ModalsProps> = ({ gameState }) => {
  const {
    myPlayerId,
    showTradeModal,
    setShowTradeModal,
    showInfluenceModal,
    setShowInfluenceModal,
    showAbilityModal,
    setShowAbilityModal,
    activeEventCard,
    dismissEventCard,
    selectedTile,
    setSelectedTile,
    tradeTargetTile,
    setTradeTargetTile,
    selectedTradePartner,
    setSelectedTradePartner,
    dispatchAction,
  } = useGameStore();

  const myPlayer = gameState.players[myPlayerId];
  const turnPlayer = gameState.players[gameState.turnPlayerId];
  const otherPlayers = gameState.turnOrder.filter(
    (id: string) => id !== myPlayerId && gameState.players[id]?.status === 'active'
  );

  // Trade form state
  const [tradeToId, setTradeToId] = useState<string>(otherPlayers[0] ?? '');
  const [giveCash, setGiveCash] = useState<number>(0);
  const [wantCash, setWantCash] = useState<number>(0);
  const [giveTiles, setGiveTiles] = useState<TileId[]>([]);
  const [wantTiles, setWantTiles] = useState<TileId[]>([]);
  const [dismissedTradeIds, setDismissedTradeIds] = useState<string[]>([]);

  // When selectedTradePartner is clicked from PlayerDashboard or action buttons
  useEffect(() => {
    if (selectedTradePartner) {
      setTradeToId(selectedTradePartner);
    }
  }, [selectedTradePartner]);

  // When tradeTargetTile is set from Title Deed modal, auto-populate partner & requested tile
  useEffect(() => {
    if (tradeTargetTile !== null) {
      const owner = gameState.tiles[tradeTargetTile]?.ownerId;
      if (owner && owner !== myPlayerId) {
        setTradeToId(owner);
        setWantTiles([tradeTargetTile]);
      }
    }
  }, [tradeTargetTile, myPlayerId, gameState.tiles]);

  // Find owned tiles
  const myOwnedTiles: TileId[] = [];
  const targetOwnedTiles: TileId[] = [];

  for (const [idStr, tState] of Object.entries(gameState.tiles) as [string, TileState][]) {
    const tId = Number(idStr);
    if (tState.ownerId === myPlayerId) myOwnedTiles.push(tId);
    if (tState.ownerId === tradeToId) targetOwnedTiles.push(tId);
  }

  // Backdrop style
  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 8, 15, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
    animation: 'fadeIn 0.2s ease',
  };

  const modalContainerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(14, 19, 32, 0.96)',
    borderRadius: '18px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.85), 0 0 40px rgba(139, 92, 246, 0.18)',
    maxWidth: '560px',
    width: '100%',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '92vh',
    overflowY: 'auto',
    animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <>
      {/* 0. RICHUP-STYLE INCOMING TRADE OFFER POPUP MODAL */}
      {(() => {
        const incomingTrade = gameState.trades?.find(
          t => t.toId === myPlayerId && t.status === 'pending' && !dismissedTradeIds.includes(t.id)
        );
        if (!incomingTrade) return null;
        const sender = gameState.players[incomingTrade.fromId];
        const senderName = sender?.name ?? 'Opponent';

        let offeredTilesValue = 0;
        for (const tId of incomingTrade.give.tileIds) {
          const def = getTileDef(tId);
          offeredTilesValue += def.price ?? 100;
        }
        const totalOfferedValue = incomingTrade.give.cash + offeredTilesValue;

        let requestedTilesValue = 0;
        for (const tId of incomingTrade.want.tileIds) {
          const def = getTileDef(tId);
          requestedTilesValue += def.price ?? 100;
        }
        const totalRequestedValue = incomingTrade.want.cash + requestedTilesValue;
        const netValueDiff = totalOfferedValue - totalRequestedValue;

        return (
          <div style={backdropStyle}>
            <div
              style={{
                ...modalContainerStyle,
                border: '2px solid #eab308',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95), 0 0 50px rgba(234, 179, 8, 0.35)',
                maxWidth: '540px',
              }}
              onClick={(e: any) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>🤝</span>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fef08a', margin: 0, letterSpacing: '0.5px' }}>
                      INCOMING TRADE PROPOSAL
                    </h3>
                    <span style={{ fontSize: '12.5px', color: '#cbd5e1' }}>
                      <strong style={{ color: '#ffffff' }}>{senderName}</strong> has sent you a business offer!
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setDismissedTradeIds(prev => [...prev, incomingTrade.id])}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '15px',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Dismiss popup for now"
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(16, 185, 129, 0.4)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase' }}>
                      YOU RECEIVE:
                    </span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                      +${totalOfferedValue}
                    </span>
                  </div>

                  {incomingTrade.give.cash > 0 && (
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#10b981' }}>
                      💵 +{formatCurrency(incomingTrade.give.cash, gameState.boardKey)}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                    {incomingTrade.give.tileIds.length === 0 && incomingTrade.give.cash === 0 ? (
                      <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>Nothing offered</span>
                    ) : (
                      incomingTrade.give.tileIds.map(tId => {
                        const def = getTileDef(tId);
                        const district = getDistrictDef(def.districtId);
                        return (
                          <div
                            key={tId}
                            style={{
                              padding: '6px 8px',
                              backgroundColor: 'rgba(0,0,0,0.4)',
                              borderRadius: '6px',
                              border: `1px solid ${district?.color ?? 'rgba(255,255,255,0.1)'}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '11.5px',
                            }}
                          >
                            <span style={{ color: '#ffffff', fontWeight: 700 }}>{def.name}</span>
                            <span style={{ color: '#38bdf8' }}>${def.price ?? 0}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(239, 68, 68, 0.4)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase' }}>
                      YOU GIVE:
                    </span>
                    <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>
                      -${totalRequestedValue}
                    </span>
                  </div>

                  {incomingTrade.want.cash > 0 && (
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#ef4444' }}>
                      💵 -{formatCurrency(incomingTrade.want.cash, gameState.boardKey)}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                    {incomingTrade.want.tileIds.length === 0 && incomingTrade.want.cash === 0 ? (
                      <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>Nothing requested</span>
                    ) : (
                      incomingTrade.want.tileIds.map(tId => {
                        const def = getTileDef(tId);
                        const district = getDistrictDef(def.districtId);
                        return (
                          <div
                            key={tId}
                            style={{
                              padding: '6px 8px',
                              backgroundColor: 'rgba(0,0,0,0.4)',
                              borderRadius: '6px',
                              border: `1px solid ${district?.color ?? 'rgba(255,255,255,0.1)'}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '11.5px',
                            }}
                          >
                            <span style={{ color: '#ffffff', fontWeight: 700 }}>{def.name}</span>
                            <span style={{ color: '#f87171' }}>${def.price ?? 0}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: '#94a3b8' }}>Strategic Asset Valuation:</span>
                <strong style={{ color: netValueDiff >= 0 ? '#10b981' : '#f87171' }}>
                  {netValueDiff >= 0 ? `+${formatCurrency(netValueDiff, gameState.boardKey)} (Favorable)` : `${formatCurrency(netValueDiff, gameState.boardKey)} (Favors Opponent)`}
                </strong>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => {
                    soundFx.playCashRegister();
                    dispatchAction({ type: 'RESPOND_TRADE', tradeId: incomingTrade.id, response: 'accept' });
                  }}
                  className="arcade-btn arcade-btn-green"
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 900,
                  }}
                >
                  ✅ ACCEPT PROPOSAL
                </button>

                <button
                  onClick={() => {
                    soundFx.playClick();
                    dispatchAction({ type: 'RESPOND_TRADE', tradeId: incomingTrade.id, response: 'decline' });
                  }}
                  className="arcade-btn arcade-btn-secondary"
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderColor: '#ef4444',
                    color: '#fca5a5',
                  }}
                >
                  ❌ DECLINE
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1. RICHUP-STYLE SIDE-BY-SIDE TRADE DESK */}
      {showTradeModal && (
        <div
          style={backdropStyle}
          onClick={() => {
            setShowTradeModal(false);
            setTradeTargetTile(null);
            setSelectedTradePartner(null);
          }}
        >
          <div style={modalContainerStyle} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>🤝</span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    Trading Desk
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Negotiate property transfers and cash with opponents
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTradeModal(false);
                  setTradeTargetTile(null);
                  setSelectedTradePartner(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '16px',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {otherPlayers.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No active opponents to trade with.</p>
            ) : (
              <>
                {/* Target Player Select */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc', display: 'block', marginBottom: '6px' }}>
                    Select Trade Partner:
                  </label>
                  <select
                    value={tradeToId}
                    onChange={(e: any) => {
                      setTradeToId(e.target.value);
                      setWantTiles([]);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f0c1b',
                      border: '1px solid #3b2d54',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    {otherPlayers.map((id: string) => {
                      const p = gameState.players[id];
                      return (
                        <option key={id} value={id}>
                          {p?.name ?? id} • Cash: ${p?.cash ?? 0} • Properties: {Object.values(gameState.tiles).filter(t => t.ownerId === id).length}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Side-by-Side 2 Column Desk */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Left Column: You Give */}
                  <div
                    style={{
                      backgroundColor: '#0f0c1b',
                      borderRadius: '10px',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
                        You Give:
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Max: ${myPlayer?.cash ?? 0}
                      </span>
                    </div>

                    {/* Cash Offer */}
                    <div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[50, 100, 250].map(amt => (
                          <button
                            key={amt}
                            onClick={() => setGiveCash(prev => Math.min(myPlayer?.cash ?? 0, prev + amt))}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              color: '#7dd3fc',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            +${amt}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={myPlayer?.cash ?? 0}
                        value={giveCash || ''}
                        placeholder="$0 cash"
                        onChange={(e: any) => setGiveCash(Math.max(0, Math.min(Number(e.target.value), myPlayer?.cash ?? 0)))}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: '#1b162f',
                          border: '1px solid #3b2d54',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Properties List */}
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        Your Properties ({myOwnedTiles.length}):
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                        {myOwnedTiles.length === 0 ? (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>No properties owned</span>
                        ) : (
                          myOwnedTiles.map(tId => {
                            const def = getTileDef(tId);
                            const district = getDistrictDef(def.districtId);
                            const isChecked = giveTiles.includes(tId);
                            return (
                              <label
                                key={tId}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: isChecked ? 'rgba(56, 189, 248, 0.2)' : '#161326',
                                  border: isChecked ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.06)',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  color: '#ffffff',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e: any) => {
                                    if (e.target.checked) setGiveTiles([...giveTiles, tId]);
                                    else setGiveTiles(giveTiles.filter(id => id !== tId));
                                  }}
                                />
                                {district?.color && (
                                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: district.color }} />
                                )}
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {def.name}
                                </span>
                                <span style={{ fontSize: '10px', color: '#38bdf8' }}>${def.price ?? 0}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: You Want */}
                  <div
                    style={{
                      backgroundColor: '#0f0c1b',
                      borderRadius: '10px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>
                        You Want:
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Partner: ${gameState.players[tradeToId]?.cash ?? 0}
                      </span>
                    </div>

                    {/* Cash Requested */}
                    <div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[50, 100, 250].map(amt => (
                          <button
                            key={amt}
                            onClick={() => setWantCash(prev => prev + amt)}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              color: '#6ee7b7',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            +${amt}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={wantCash || ''}
                        placeholder="$0 cash"
                        onChange={(e: any) => setWantCash(Math.max(0, Number(e.target.value)))}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: '#1b162f',
                          border: '1px solid #3b2d54',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Partner's Properties List */}
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        Their Properties ({targetOwnedTiles.length}):
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                        {targetOwnedTiles.length === 0 ? (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>No properties owned</span>
                        ) : (
                          targetOwnedTiles.map(tId => {
                            const def = getTileDef(tId);
                            const district = getDistrictDef(def.districtId);
                            const isChecked = wantTiles.includes(tId);
                            return (
                              <label
                                key={tId}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.2)' : '#161326',
                                  border: isChecked ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  color: '#ffffff',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e: any) => {
                                    if (e.target.checked) setWantTiles([...wantTiles, tId]);
                                    else setWantTiles(wantTiles.filter(id => id !== tId));
                                  }}
                                />
                                {district?.color && (
                                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: district.color }} />
                                )}
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {def.name}
                                </span>
                                <span style={{ fontSize: '10px', color: '#10b981' }}>${def.price ?? 0}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={() => {
                    const safeGive = Math.max(0, Math.min(giveCash || 0, myPlayer?.cash ?? 0));
                    const safeWant = Math.max(0, wantCash || 0);
                    dispatchAction({
                      type: 'PROPOSE_TRADE',
                      offer: {
                        fromId: myPlayerId,
                        toId: tradeToId,
                        give: { tileIds: giveTiles, cash: safeGive, influence: 0, cards: [], rentContracts: [] },
                        want: { tileIds: wantTiles, cash: safeWant, influence: 0, cards: [], rentContracts: [] },
                      },
                    });
                    soundFx.playCardSpecial();
                    setShowTradeModal(false);
                    setTradeTargetTile(null);
                  }}
                  style={{
                    padding: '13px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>🤝</span>
                  <span>Dispatch Trade Proposal</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. INFLUENCE STORE MODAL */}
      {showInfluenceModal && (
        <div style={backdropStyle} onClick={() => setShowInfluenceModal(false)}>
          <div style={modalContainerStyle} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>⭐ Influence Store</h3>
                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                  Your Balance: {myPlayer?.influence ?? 0} Influence
                </span>
              </div>
              <button
                onClick={() => setShowInfluenceModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {INFLUENCE_ITEMS.map(item => {
                const canAfford = (myPlayer?.influence ?? 0) >= item.cost;
                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#0f0c1b',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid #243356',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        {item.desc}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        dispatchAction({ type: 'SPEND_INFLUENCE', item: item.id });
                        soundFx.playCoin();
                        setShowInfluenceModal(false);
                      }}
                      disabled={!canAfford}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: canAfford ? '#f59e0b' : '#334155',
                        color: canAfford ? '#0f172a' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Use ★ {item.cost}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. EXECUTIVE ABILITY MODAL */}
      {showAbilityModal && (
        <div style={backdropStyle} onClick={() => setShowAbilityModal(false)}>
          <div style={modalContainerStyle} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>⚡ Executive Ability</h3>
              <button
                onClick={() => setShowAbilityModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {(() => {
              const role = PLAYER_ROLES.find(r => r.id === myPlayer?.roleId) ?? {
                id: 'Tycoon',
                name: 'Executive',
                perk: 'Special privileges in the Business Tycoons trading market.',
              };
              const isReady = (myPlayer?.abilityReadyRound ?? 0) <= gameState.round;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ backgroundColor: '#0f0c1b', padding: '16px', borderRadius: '10px', border: '1px solid #3b2d54' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>
                      Role: {role.name}
                    </div>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px' }}>
                      {role.perk}
                    </p>
                    <div style={{ marginTop: '10px', fontSize: '12px', color: isReady ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                      {isReady ? '✅ Ready to activate!' : `⏳ Available in Round ${myPlayer?.abilityReadyRound}`}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      dispatchAction({ type: 'USE_ABILITY' });
                      soundFx.playCardSpecial();
                      setShowAbilityModal(false);
                    }}
                    disabled={!isReady}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isReady ? '#e94560' : '#334155',
                      color: '#ffffff',
                      fontWeight: 800,
                      cursor: isReady ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Activate Ability
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 4. EVENT CARD POPUP OVERLAY */}
      {activeEventCard && (
        <div style={backdropStyle} onClick={dismissEventCard}>
          <div
            style={{
              ...modalContainerStyle,
              maxWidth: '400px',
              textAlign: 'center',
              border: '2px solid #eab308',
            }}
            onClick={(e: any) => e.stopPropagation()}
          >
            <div style={{ fontSize: '42px', margin: '8px 0' }}>📜</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#eab308', textTransform: 'uppercase' }}>
              Business Tycoons Event
            </h3>
            <p style={{ fontSize: '15px', color: '#f8fafc', lineHeight: 1.5, padding: '12px 8px' }}>
              {activeEventCard.text}
            </p>
            <button
              onClick={dismissEventCard}
              style={{
                padding: '12px 28px',
                borderRadius: '8px',
                border: 'none',
                background:
                  gameState.phase === 'awaitBuyDecision'
                    ? 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)'
                    : turnPlayer && turnPlayer.doublesStreak > 0 && !turnPlayer.inJail
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #e94560 0%, #c026d3 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                alignSelf: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            >
              {gameState.phase === 'awaitBuyDecision'
                ? 'View Property ➔'
                : turnPlayer && turnPlayer.doublesStreak > 0 && !turnPlayer.inJail
                ? 'Roll Again (Doubles! 🎲)'
                : 'Continue (Next Player ➔)'}
            </button>
          </div>
        </div>
      )}

      {/* 5. AUTHENTIC TITLE DEED CARD WITH IN-MODAL PROPERTY CONTROLS */}
      {selectedTile !== null && !showTradeModal && !showInfluenceModal && !showAbilityModal && !activeEventCard && (
        <div style={backdropStyle} onClick={() => setSelectedTile(null)}>
          {(() => {
            const def = getTileDef(selectedTile);
            const tState = gameState.tiles[selectedTile];
            const district = getDistrictDef(def.districtId);
            const ownerId = tState?.ownerId;
            const owner = ownerId ? gameState.players[ownerId] : null;
            const isMyProperty = ownerId === myPlayerId;
            const hasFullDistrict = def.districtId ? ownsFullDistrict(gameState, ownerId ?? '', def.districtId) : false;
            const baseRent = Math.round((def.price ?? 60) / 8);

            const isProperty = def.type === 'property';
            const isHub = def.type === 'hub';
            const isUtility = def.type === 'utility';

            return (
              <div
                style={{
                  backgroundColor: 'rgba(14, 19, 32, 0.98)',
                  borderRadius: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 30px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(139, 92, 246, 0.25)',
                  maxWidth: '440px',
                  width: '100%',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '90vh',
                  animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onClick={(e: any) => e.stopPropagation()}
              >
                {/* Iconic Title Deed Color Header */}
                <div
                  style={{
                    backgroundColor: district?.color ?? (isHub ? '#2563eb' : isUtility ? '#0891b2' : '#334155'),
                    padding: '16px 20px',
                    textAlign: 'center',
                    color: '#ffffff',
                    borderBottom: '3px solid rgba(0, 0, 0, 0.35)',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.9 }}>
                    TITLE DEED
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '3px' }}>
                    {def.flag ? `${def.flag} ` : ''}{def.name}
                  </div>
                  {def.landmark && (
                    <div style={{ fontSize: '12px', marginTop: '3px', opacity: 0.95 }}>
                      {def.landmark} {def.landmarkName ? `• ${def.landmarkName}` : ''}
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedTile(null)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '14px',
                      background: 'rgba(0,0,0,0.3)',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Card Body */}
                <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#0f0c1b',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #2d2346',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Ownership:</span>
                      <strong style={{ fontSize: '13px', color: owner ? '#38bdf8' : '#10b981' }}>
                        {owner ? (isMyProperty ? 'Owned by You' : `Owned by ${owner.name}`) : 'Unowned'}
                      </strong>
                    </div>
                    {def.price && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Cost / Value:</span>
                        <strong style={{ fontSize: '14px', color: '#f8fafc' }}>
                          {formatCurrency(def.price, gameState.boardKey)}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Mortgaged Warning */}
                  {tState?.mortgaged && (
                    <div
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #ef4444',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#fca5a5',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🔒</span>
                      <span>MORTGAGED — Collects 0 rent until unmortgaged</span>
                    </div>
                  )}

                  {/* Rent Table for Properties */}
                  {isProperty && (
                    <div style={{ backgroundColor: '#0f0c1b', borderRadius: '10px', border: '1px solid #2d2346', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.04)', fontSize: '11px', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase' }}>
                        Official Rent Schedule
                      </div>
                      <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {[
                          { label: 'Base Rent (Land)', val: baseRent, tierMatch: 0 },
                          { label: 'Full District (2×)', val: baseRent * 2, tierMatch: -1 },
                          { label: 'With 1 House 🏠', val: baseRent * 5, tierMatch: 1 },
                          { label: 'With 2 Houses 🏠🏠', val: baseRent * 15, tierMatch: 2 },
                          { label: 'With 3 Houses 🏠🏠🏠', val: baseRent * 40, tierMatch: 3 },
                          { label: 'With Hotel 🏨', val: baseRent * 70, tierMatch: 4 },
                        ].map((row, idx) => {
                          const isCurrent = tState && !tState.mortgaged && (
                            row.tierMatch === tState.tier ||
                            (row.tierMatch === -1 && tState.tier === 0 && hasFullDistrict)
                          );
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                backgroundColor: isCurrent ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                                border: isCurrent ? '1px solid #a855f7' : 'none',
                                fontSize: '12px',
                                color: isCurrent ? '#ffffff' : '#cbd5e1',
                                fontWeight: isCurrent ? 800 : 500,
                              }}
                            >
                              <span>{row.label}</span>
                              <span style={{ color: isCurrent ? '#a855f7' : '#f8fafc', fontWeight: 700 }}>
                                {formatCurrency(row.val, gameState.boardKey)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hub / Utility Rent Information */}
                  {isHub && (
                    <div style={{ backgroundColor: '#0f0c1b', borderRadius: '8px', padding: '10px 14px', border: '1px solid #2d2346', fontSize: '12px', color: '#cbd5e1' }}>
                      <strong style={{ color: '#38bdf8' }}>Airport / Hub Rent:</strong>
                      <div style={{ marginTop: '4px' }}>1 Hub: $25 • 2 Hubs: $50 • 3 Hubs: $100 • 4 Hubs: $200</div>
                    </div>
                  )}
                  {isUtility && (
                    <div style={{ backgroundColor: '#0f0c1b', borderRadius: '8px', padding: '10px 14px', border: '1px solid #2d2346', fontSize: '12px', color: '#cbd5e1' }}>
                      <strong style={{ color: '#38bdf8' }}>Utility Rent:</strong>
                      <div style={{ marginTop: '4px' }}>1 Utility: 4× Dice Total • 2 Utilities: 10× Dice Total</div>
                    </div>
                  )}

                  {/* Mortgage & Build Costs */}
                  {def.price && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
                      <div style={{ backgroundColor: '#0f0c1b', padding: '8px', borderRadius: '6px', border: '1px solid #2d2346' }}>
                        Mortgage Value: <strong style={{ color: '#f8fafc' }}>{formatCurrency(Math.round(def.price / 2), gameState.boardKey)}</strong>
                      </div>
                      <div style={{ backgroundColor: '#0f0c1b', padding: '8px', borderRadius: '6px', border: '1px solid #2d2346' }}>
                        {district?.buildCost ? (
                          <>House Cost: <strong style={{ color: '#f8fafc' }}>{formatCurrency(district.buildCost, gameState.boardKey)}</strong></>
                        ) : (
                          <>Unmortgage Cost: <strong style={{ color: '#f8fafc' }}>{formatCurrency(Math.round((def.price / 2) * 1.1), gameState.boardKey)}</strong></>
                        )}
                      </div>
                    </div>
                  )}

                  {/* DIRECT ACTIONS ROW ON TITLE DEED */}
                  {/* Action 1: If Owned by You, direct property management */}
                  {isMyProperty && tState && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', borderTop: '1px solid #2d2346', paddingTop: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase' }}>
                        Direct Management:
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Build House / Hotel */}
                        {hasFullDistrict && tState.tier < 4 && !tState.mortgaged && (
                          <button
                            onClick={() => {
                              dispatchAction({ type: 'BUILD', tileId: selectedTile });
                              soundFx.playHouseBuild();
                            }}
                            disabled={myPlayer.cash < (district?.buildCost ?? 100)}
                            style={{
                              flex: 1,
                              minWidth: '130px',
                              padding: '10px',
                              borderRadius: '8px',
                              border: 'none',
                              background: myPlayer.cash >= (district?.buildCost ?? 100)
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : '#334155',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '12px',
                              cursor: myPlayer.cash >= (district?.buildCost ?? 100) ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {tState.tier === 3 ? '🏨 Upgrade to Hotel' : '🏠 Build House'} ({formatCurrency(district?.buildCost ?? 100, gameState.boardKey)})
                          </button>
                        )}

                        {/* Sell Building */}
                        {tState.tier > 0 && (
                          <button
                            onClick={() => {
                              dispatchAction({ type: 'SELL_BUILDING', tileId: selectedTile });
                              soundFx.playCashRegister();
                            }}
                            style={{
                              flex: 1,
                              minWidth: '110px',
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid #eab308',
                              backgroundColor: 'rgba(234, 179, 8, 0.15)',
                              color: '#fde047',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Sell Building (+{formatCurrency(Math.round((district?.buildCost ?? 100) / 2), gameState.boardKey)})
                          </button>
                        )}

                        {/* Mortgage */}
                        {!tState.mortgaged && tState.tier === 0 && (
                          <button
                            onClick={() => {
                              dispatchAction({ type: 'MORTGAGE', tileId: selectedTile });
                              soundFx.playMortgage();
                            }}
                            style={{
                              flex: 1,
                              minWidth: '110px',
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid #ef4444',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#fca5a5',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            🔒 Mortgage (+{formatCurrency(Math.round((def.price ?? 100) / 2), gameState.boardKey)})
                          </button>
                        )}

                        {/* Unmortgage */}
                        {tState.mortgaged && (
                          <button
                            onClick={() => {
                              dispatchAction({ type: 'UNMORTGAGE', tileId: selectedTile });
                              soundFx.playMortgage();
                            }}
                            disabled={myPlayer.cash < Math.round(((def.price ?? 100) / 2) * 1.1)}
                            style={{
                              flex: 1,
                              minWidth: '110px',
                              padding: '10px',
                              borderRadius: '8px',
                              border: 'none',
                              background: myPlayer.cash >= Math.round(((def.price ?? 100) / 2) * 1.1)
                                ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                                : '#334155',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '12px',
                              cursor: myPlayer.cash >= Math.round(((def.price ?? 100) / 2) * 1.1) ? 'pointer' : 'not-allowed',
                            }}
                          >
                            🔓 Unmortgage (-{formatCurrency(Math.round(((def.price ?? 100) / 2) * 1.1), gameState.boardKey)})
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action 2: If Owned by Opponent, offer Propose Trade Button */}
                  {ownerId && !isMyProperty && (
                    <button
                      onClick={() => {
                        setSelectedTile(null);
                        setTradeTargetTile(selectedTile);
                        setShowTradeModal(true);
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                        marginTop: '4px',
                      }}
                    >
                      <span>🤝</span>
                      <span>Propose Trade for this Property</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
};
