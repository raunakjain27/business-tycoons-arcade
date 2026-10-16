import React, { useState } from 'react';
import type { GameState, TileId, TileState } from '../../../../packages/engine/types';
import { getTileDef, getDistrictDef, INFLUENCE_ITEMS, PLAYER_ROLES, formatCurrency } from '../boardData';
import { useGameStore } from '../store';

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
    backgroundColor: 'rgba(10, 15, 30, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  };

  const modalContainerStyle: React.CSSProperties = {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    border: '1px solid #243356',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
    maxWidth: '520px',
    width: '100%',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  return (
    <>
      {/* 1. TRADE PROPOSAL MODAL */}
      {showTradeModal && (
        <div style={backdropStyle} onClick={() => setShowTradeModal(false)}>
          <div style={modalContainerStyle} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>🤝 Propose Trade</h3>
              <button
                onClick={() => setShowTradeModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
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
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Trade Partner:
                  </label>
                  <select
                    value={tradeToId}
                    onChange={(e: any) => {
                      setTradeToId(e.target.value);
                      setWantTiles([]);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #243356',
                      borderRadius: '6px',
                      color: '#ffffff',
                    }}
                  >
                    {otherPlayers.map((id: string) => (
                      <option key={id} value={id}>
                        {gameState.players[id]?.name ?? id} (${gameState.players[id]?.cash})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* You Offer */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>You Give:</h4>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Cash Offer ($):</label>
                      <input
                        type="number"
                        min="0"
                        max={myPlayer?.cash ?? 0}
                        value={giveCash}
                        onChange={(e: any) => setGiveCash(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #243356',
                          borderRadius: '4px',
                          color: '#ffffff',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Select Properties:</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                        {myOwnedTiles.map(tId => (
                          <label key={tId} style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', gap: '6px' }}>
                            <input
                              type="checkbox"
                              checked={giveTiles.includes(tId)}
                              onChange={(e: any) => {
                                if (e.target.checked) setGiveTiles([...giveTiles, tId]);
                                else setGiveTiles(giveTiles.filter((id: number) => id !== tId));
                              }}
                            />
                            {getTileDef(tId).name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* You Request */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>You Want:</h4>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Cash Requested ($):</label>
                      <input
                        type="number"
                        min="0"
                        value={wantCash}
                        onChange={(e: any) => setWantCash(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #243356',
                          borderRadius: '4px',
                          color: '#ffffff',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Select Properties:</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                        {targetOwnedTiles.map(tId => (
                          <label key={tId} style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', gap: '6px' }}>
                            <input
                              type="checkbox"
                              checked={wantTiles.includes(tId)}
                              onChange={(e: any) => {
                                if (e.target.checked) setWantTiles([...wantTiles, tId]);
                                else setWantTiles(wantTiles.filter((id: number) => id !== tId));
                              }}
                            />
                            {getTileDef(tId).name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    dispatchAction({
                      type: 'PROPOSE_TRADE',
                      offer: {
                        fromId: myPlayerId,
                        toId: tradeToId,
                        give: { tileIds: giveTiles, cash: giveCash, influence: 0, cards: [], rentContracts: [] },
                        want: { tileIds: wantTiles, cash: wantCash, influence: 0, cards: [], rentContracts: [] },
                      },
                    });
                    setShowTradeModal(false);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#e94560',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '8px',
                  }}
                >
                  Send Trade Proposal
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
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>⭐ Influence Store</h3>
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
                      backgroundColor: '#0f172a',
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
                        flexShrink: 0,
                        marginLeft: '12px',
                      }}
                    >
                      ★ {item.cost}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. ROLE ABILITY MODAL */}
      {showAbilityModal && (
        <div style={backdropStyle} onClick={() => setShowAbilityModal(false)}>
          <div style={modalContainerStyle} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>⚡ Executive Ability</h3>
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
                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #243356' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>
                      Role: {role.name}
                    </div>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px' }}>
                      {role.perk}
                    </p>
                    <div style={{ marginTop: '10px', fontSize: '12px', color: isReady ? '#10b981' : '#f59e0b' }}>
                      {isReady ? '✅ Ready to activate!' : `⏳ Available in Round ${myPlayer?.abilityReadyRound}`}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      dispatchAction({ type: 'USE_ABILITY' });
                      setShowAbilityModal(false);
                    }}
                    disabled={!isReady}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isReady ? '#e94560' : '#334155',
                      color: '#ffffff',
                      fontWeight: 700,
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
                  turnPlayer && turnPlayer.doublesStreak > 0 && !turnPlayer.inJail
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
              {turnPlayer && turnPlayer.doublesStreak > 0 && !turnPlayer.inJail
                ? 'Roll Again (Doubles! 🎲)'
                : 'Continue (Next Player ➔)'}
            </button>
          </div>
        </div>
      )}

      {/* 5. TILE INSPECTOR MODAL (When clicking any tile) */}
      {selectedTile !== null && !showTradeModal && !showInfluenceModal && !showAbilityModal && (
        <div style={backdropStyle} onClick={() => setSelectedTile(null)}>
          <div style={modalContainerStyle} onClick={(e: any) => e.stopPropagation()}>
            {(() => {
              const def = getTileDef(selectedTile);
              const tState = gameState.tiles[selectedTile];
              const district = getDistrictDef(def.districtId);
              const ownerName = tState?.ownerId ? gameState.players[tState.ownerId]?.name : null;
              const baseRent = Math.round((def.price ?? 60) / 8);

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>{def.name}</h3>
                      {district && (
                        <span style={{ fontSize: '12px', color: district.color, fontWeight: 600 }}>
                          {def.districtId} District
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedTile(null)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Tile Status Box */}
                  <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #243356' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>Ownership:</span>
                      <strong style={{ color: ownerName ? '#38bdf8' : '#10b981', fontSize: '13px' }}>
                        {ownerName ? `Owned by ${ownerName}` : 'Unowned'}
                      </strong>
                    </div>

                    {def.price && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>Purchase Price:</span>
                        <strong style={{ color: '#ffffff', fontSize: '13px' }}>{formatCurrency(def.price, gameState.boardKey)}</strong>
                      </div>
                    )}

                    {tState && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>Building Tier:</span>
                        <strong style={{ color: '#ffffff', fontSize: '13px' }}>
                          Tier {tState.tier} ({['Land', 'House', 'Apartments', 'Tower', 'Landmark'][tState.tier]})
                        </strong>
                      </div>
                    )}

                    {def.type === 'property' && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                          Rent Breakdown:
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '6px', textAlign: 'center' }}>
                          {[
                            { label: 'Land', mult: 1 },
                            { label: 'House', mult: 5 },
                            { label: 'Apts', mult: 15 },
                            { label: 'Tower', mult: 40 },
                            { label: 'Mark', mult: 70 },
                          ].map((t, idx) => (
                            <div
                              key={idx}
                              style={{
                                backgroundColor: tState?.tier === idx ? '#e9456022' : '#16213e',
                                border: tState?.tier === idx ? '1px solid #e94560' : '1px solid #1e293b',
                                borderRadius: '4px',
                                padding: '4px 2px',
                              }}
                            >
                              <div style={{ fontSize: '9px', color: '#94a3b8' }}>{t.label}</div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                                {formatCurrency(baseRent * t.mult, gameState.boardKey)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
};
