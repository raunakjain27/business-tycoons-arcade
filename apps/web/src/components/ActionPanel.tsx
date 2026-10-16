import React, { useState } from 'react';
import type { GameState, TileId, Tier } from '../../../../packages/engine/types';
import { BOARD_DATA, getTileDef, getDistrictDef, PLAYER_ROLES, RoleId, formatCurrency } from '../boardData';
import { useGameStore } from '../store';
import { ownsFullDistrict } from '../computeRent';
import { soundFx } from '../soundEffects';

interface ActionPanelProps {
  gameState: GameState | null;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({ gameState }) => {
  const {
    gameMode,
    setGameMode,
    serverUrl,
    setServerUrl,
    myPlayerId,
    roomCode,
    isConnecting,
    errorMessage,
    initLocalGame,
    connectOnline,
    dispatchAction,
    setShowTradeModal,
    setShowInfluenceModal,
    setShowAbilityModal,
    setSelectedTile,
    selectedTile,
  } = useGameStore();

  // Lobby form state
  const [playerName, setPlayerName] = useState('Player 1');
  const [selectedRole, setSelectedRole] = useState<RoleId>('Tycoon');
  const [botCount, setBotCount] = useState(2);
  const [turnTimerSec, setTurnTimerSec] = useState(30);
  const [onlineRoomInput, setOnlineRoomInput] = useState('game');
  const [isMobile, setIsMobile] = useState(navigator.maxTouchPoints > 1 || window.innerWidth < 768);

  // Custom bid input
  const [customBid, setCustomBid] = useState('');

  if (!gameState || gameState.phase === 'lobby') {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #161522 0%, #0f0b1a 100%)',
          backdropFilter: 'blur(12px) saturate(180%)',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: isMobile ? '100%' : '500px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ borderBottom: '1px solid #243356', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
            Business Tycoons Lobby
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Configure your match and launch into the property trading ring.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setGameMode('local')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: gameMode === 'local' ? '#e94560' : '#0f3460',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            🎮 Local Match (vs Bots)
          </button>
          <button
            onClick={() => setGameMode('online')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: gameMode === 'online' ? '#e94560' : '#0f3460',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            🌐 Colyseus Online
          </button>
        </div>

        {/* Player Name */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
            Player Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e: any) => setPlayerName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0f172a',
              border: '1px solid #243356',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Role Selector */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
            Choose Executive Role
          </label>
          <select
            value={selectedRole}
            onChange={(e: any) => setSelectedRole(e.target.value as RoleId)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0f172a',
              border: '1px solid #243356',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {PLAYER_ROLES.map(role => (
              <option key={role.id} value={role.id}>
                {role.name} — {role.perk}
              </option>
            ))}
          </select>
        </div>

        {gameMode === 'local' ? (
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              Opponent Bots
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setBotCount(count)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: botCount === count ? '2px solid #e94560' : '1px solid #243356',
                    backgroundColor: botCount === count ? '#1e293b' : '#0f172a',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {count} {count === 1 ? 'Bot' : 'Bots'}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Server Endpoint
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e: any) => setServerUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #243356',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '13px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Room Name or Code
              </label>
              <input
                type="text"
                value={onlineRoomInput}
                onChange={(e: any) => setOnlineRoomInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #243356',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>
        )}

        {/* Launch Button */}
        <button
          onClick={() => {
            if (gameMode === 'local') {
              initLocalGame(botCount + 1, playerName, selectedRole, false, 1500, { turnTimerSec });
            } else {
              connectOnline(onlineRoomInput, playerName, selectedRole, turnTimerSec);
            }
          }}
          disabled={isConnecting}
          style={{
            marginTop: '8px',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#e94560',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '16px',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(233, 69, 96, 0.4)',
            transition: 'transform 0.1s, background-color 0.2s',
          }}
        >
         {isConnecting ? 'Connecting to Colyseus...' : gameMode === 'local' ? 'Start Local Match' : 'Join / Create Room'}
        </button>

        {errorMessage && (
          <div
            style={{
              padding: isMobile ? '8px 12px' : '10px 14px',
              backgroundColor: '#451a1a',
              border: '1px solid #ef4444',
              borderRadius: isMobile ? '6px' : '6px',
              color: '#fca5a5',
              fontSize: '11px',
            }}
          >
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

  const { phase, turnPlayerId } = gameState;
  const isMyTurn = turnPlayerId === myPlayerId;
  const currentPlayer = gameState.players[turnPlayerId];
  const myPlayer = gameState.players[myPlayerId];

  // Helper button styling
  const primaryButtonStyle: React.CSSProperties = {
    padding: isMobile ? '10px 16px' : '12px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: isMobile ? '12px' : '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(167, 139, 250, 0.35)',
    transition: 'transform 0.1s',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: isMobile ? '8px 12px' : '10px 16px',
    borderRadius: '8px',
    background: 'rgba(31, 26, 48, 0.9)',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    fontWeight: 600,
    fontSize: isMobile ? '11px' : '13px',
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(26, 22, 37, 0.95) 0%, rgba(15, 11, 26, 0.95) 100%)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        padding: isMobile ? '16px' : '22px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'column',
        gap: isMobile ? '12px' : '16px',
        width: isMobile ? '100%' : '500px',
        minHeight: isMobile ? '280px' : '360px',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Turn Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #243356',
          paddingBottom: '12px',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            Round {gameState.round} • Turn
          </span>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: isMyTurn ? '#e94560' : '#38bdf8' }}>
            {isMyTurn ? 'Your Turn' : `${currentPlayer?.name ?? 'Opponent'}'s Turn`}
          </h3>
        </div>
        <div
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            backgroundColor: isMyTurn ? '#e9456022' : '#0f3460',
            border: `1px solid ${isMyTurn ? '#e94560' : '#243356'}`,
            fontSize: '11px',
            fontWeight: 700,
            color: isMyTurn ? '#e94560' : '#94a3b8',
            textTransform: 'uppercase',
          }}
        >
          Phase: {phase}
        </div>
      </div>

      {/* PHASE 1: Await Roll */}
      {phase === 'awaitRoll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isMyTurn ? (
            <>
              {myPlayer?.inJail ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '13px', color: '#f87171' }}>
                    You are in the Audit Office. Choose how to clear your audit:
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => dispatchAction({ type: 'PAY_JAIL_FEE' })}
                      disabled={!myPlayer || myPlayer.cash < 50}
                      style={primaryButtonStyle}
                    >
                      Pay $50 Fine
                    </button>
                    {myPlayer?.heldCards.includes('jail_card') && (
                      <button
                        onClick={() => dispatchAction({ type: 'USE_JAIL_CARD' })}
                        style={secondaryButtonStyle}
                      >
                        Use Audit Free Card
                      </button>
                    )}
                    <button
                      onClick={() => dispatchAction({ type: 'ROLL' })}
                      style={secondaryButtonStyle}
                    >
                      Roll for Doubles
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  {/* Turn Timer Badge */}
                  {(() => {
                    const timerActive = useGameStore.getState().turnTimerActive;
                    const timerRem = useGameStore.getState().turnTimerRemaining;
                    if (!timerActive || timerRem === null) return null;
                    const low = timerRem <= 5;
                    return (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          backgroundColor: low ? 'rgba(239, 68, 68, 0.20)' : 'rgba(34, 197, 94, 0.15)',
                          borderRadius: '20px',
                          border: low ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(34, 197, 94, 0.35)',
                        }}
                      >
                        <span style={{ fontSize: '13px' }}>⏱</span>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: low ? '#fca5a5' : '#86efac',
                          animation: low ? 'pulse 1s infinite' : 'none',
                        }}>
                          {timerRem}s
                        </span>
                      </div>
                    );
                  })()}

                  <p style={{ fontSize: '14px', color: '#cbd5e1' }}>
                    Roll the dice to move across the Business Tycoons board.
                  </p>
                  <button
                    onClick={() => {
                      soundFx.playDiceRoll();
                      dispatchAction({ type: 'ROLL' });
                    }}
                    style={{
                      ...primaryButtonStyle,
                      padding: '16px 36px',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    🎲 Roll Dice
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
              <p>Waiting for {currentPlayer?.name ?? 'opponent'} to roll...</p>
            </div>
          )}
        </div>
      )}

      {/* PHASE 2: Await Jail Choice */}
      {phase === 'awaitJailChoice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '14px', color: '#f87171' }}>
            {isMyTurn ? 'You are audited in the Audit Office.' : `${currentPlayer?.name} is deciding jail escape.`}
          </p>
          {isMyTurn && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => dispatchAction({ type: 'PAY_JAIL_FEE' })}
                disabled={!myPlayer || myPlayer.cash < 50}
                style={primaryButtonStyle}
              >
                Pay $50 Fine
              </button>
              {myPlayer?.heldCards.includes('jail_card') && (
                <button
                  onClick={() => dispatchAction({ type: 'USE_JAIL_CARD' })}
                  style={secondaryButtonStyle}
                >
                  Use Audit Free Card
                </button>
              )}
              <button
                onClick={() => dispatchAction({ type: 'ROLL' })}
                style={secondaryButtonStyle}
              >
                Roll for Doubles
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHASE 3: Await Buy Decision */}
      {phase === 'awaitBuyDecision' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {(() => {
            const tileId = currentPlayer?.lastLandedTile ?? 0;
            const def = getTileDef(tileId);
            const district = getDistrictDef(def.districtId);
            const price = def.price ?? 100;
            const effectivePrice = currentPlayer?.roleId === 'Broker' ? Math.round(price * 0.85) : price;
            const canAfford = (myPlayer?.cash ?? 0) >= effectivePrice;

            return (
              <div
                style={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: `2px solid ${district?.color ?? '#243356'}`,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>{def.name}</h4>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>{formatCurrency(effectivePrice, gameState.boardKey)}</span>
                </div>
                {district && (
                  <div style={{ fontSize: '12px', color: district.color, fontWeight: 600 }}>
                    District: {def.districtId} (Build cost: {formatCurrency(district.buildCost, gameState.boardKey)})
                  </div>
                )}
                {currentPlayer?.roleId === 'Broker' && (
                  <span style={{ fontSize: '11px', color: '#10b981' }}>★ Broker 15% discount applied!</span>
                )}

                {isMyTurn ? (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      onClick={() => {
                        soundFx.playCashRegister();
                        dispatchAction({ type: 'BUY' });
                      }}
                      disabled={!canAfford}
                      style={{
                        ...primaryButtonStyle,
                        flex: 1,
                        opacity: canAfford ? 1 : 0.5,
                      }}
                    >
                      {canAfford ? `Buy for ${formatCurrency(effectivePrice, gameState.boardKey)}` : 'Insufficient Cash'}
                    </button>
                    <button
                      onClick={() => dispatchAction({ type: 'DECLINE_BUY' })}
                      style={{
                        ...secondaryButtonStyle,
                        flex: 1,
                      }}
                    >
                      Auction Property
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Waiting for {currentPlayer?.name} to decide whether to purchase...
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* PHASE 4: Auction */}
      {phase === 'auction' && gameState.auction && (
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '2px solid #eab308',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {(() => {
            const def = getTileDef(gameState.auction.tileId);
            const highBid = gameState.auction.highBid;
            const bidderName = gameState.auction.highBidder
              ? gameState.players[gameState.auction.highBidder]?.name ?? 'Anonymous'
              : 'None';
            const hasPassed = gameState.auction.passed.includes(myPlayerId);

            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                    🔨 Live Auction: {def.name}
                  </h4>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#eab308' }}>
                    High Bid: ${highBid}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Leader: <strong style={{ color: '#ffffff' }}>{bidderName}</strong>
                </div>

                {!hasPassed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => dispatchAction({ type: 'BID', amount: highBid + 10 })}
                        style={primaryButtonStyle}
                      >
                        + $10 Bid
                      </button>
                      <button
                        onClick={() => dispatchAction({ type: 'BID', amount: highBid + 50 })}
                        style={secondaryButtonStyle}
                      >
                        + $50
                      </button>
                      <button
                        onClick={() => dispatchAction({ type: 'BID', amount: highBid + 100 })}
                        style={secondaryButtonStyle}
                      >
                        + $100
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        placeholder="Custom bid"
                        value={customBid}
                        onChange={(e: any) => setCustomBid(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          backgroundColor: '#16213e',
                          border: '1px solid #243356',
                          borderRadius: '6px',
                          color: '#ffffff',
                        }}
                      />
                      <button
                        onClick={() => {
                          const val = Number(customBid);
                          if (val > highBid) {
                            dispatchAction({ type: 'BID', amount: val });
                            setCustomBid('');
                          }
                        }}
                        style={secondaryButtonStyle}
                      >
                        Submit Bid
                      </button>
                      <button
                        onClick={() => dispatchAction({ type: 'PASS_BID' })}
                        style={{
                          ...secondaryButtonStyle,
                          backgroundColor: '#334155',
                        }}
                      >
                        Pass
                      </button>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>You have passed on this auction.</span>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* PHASE 5: Resolve Event / Surprise */}
      {phase === 'resolveEvent' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            textAlign: 'center',
            backgroundColor: '#120e24',
            padding: '20px',
            borderRadius: '12px',
            border: '2px dashed #fcd581',
            boxShadow: '0 8px 24px rgba(252, 213, 129, 0.2)',
          }}
        >
          <div style={{ fontSize: '38px', animation: 'bounce 1s infinite' }}>🎁</div>
          <div>
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#fcd581', letterSpacing: '0.5px', margin: 0 }}>
              Surprise Card Triggered!
            </h4>
            <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px' }}>
              A mystery fortune or city event was drawn and executed.
            </p>
          </div>
          {isMyTurn && (
            <button
              onClick={() => dispatchAction({ type: 'END_TURN' })}
              style={{
                ...primaryButtonStyle,
                background: 'linear-gradient(135deg, #fcd581 0%, #f59e0b 100%)',
                color: '#0f172a',
                fontWeight: 800,
              }}
            >
              Continue Turn ➔
            </button>
          )}
        </div>
      )}

      {/* PHASE 6: Await Debt Settlement */}
      {phase === 'awaitDebtSettlement' && (
        <div
          style={{
            backgroundColor: '#451a1a',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#fca5a5' }}>
            ⚠️ Outstanding Debt Settlement
          </h4>
          <p style={{ fontSize: '13px', color: '#fecaca' }}>
            {isMyTurn
              ? 'You have negative cash! Sell buildings or mortgage properties to raise funds.'
              : `${currentPlayer?.name} is raising funds to settle their debts.`}
          </p>

          {isMyTurn && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => dispatchAction({ type: 'RAISE_FUNDS_DONE' })}
                style={{
                  ...primaryButtonStyle,
                  backgroundColor: myPlayer && myPlayer.cash >= 0 ? '#10b981' : '#ef4444',
                }}
              >
                {myPlayer && myPlayer.cash >= 0 ? 'Clear Debt & Continue' : 'Declare Bankruptcy'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHASE 7: Await End Turn (Manage Properties, Build, Trade, Ability) */}
      {phase === 'awaitEndTurn' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isMyTurn ? (
            <>
              {/* Selected Tile Management Strip */}
              {selectedTile !== null && gameState.tiles[selectedTile]?.ownerId === myPlayerId && (
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {(() => {
                    const def = getTileDef(selectedTile);
                    const tState = gameState.tiles[selectedTile]!;
                    const district = getDistrictDef(def.districtId);
                    const hasFullDistrict = def.districtId ? ownsFullDistrict(gameState, myPlayerId, def.districtId) : false;

                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                            Manage: {def.name} (Tier {tState.tier})
                          </span>
                          <span style={{ fontSize: '12px', color: tState.mortgaged ? '#ef4444' : '#10b981' }}>
                            {tState.mortgaged ? 'Mortgaged' : 'Active'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {hasFullDistrict && tState.tier < 4 && !tState.mortgaged && (
                            <button
                              onClick={() => dispatchAction({ type: 'BUILD', tileId: selectedTile })}
                              style={secondaryButtonStyle}
                            >
                              🏗️ Upgrade Tier ({formatCurrency(district?.buildCost ?? 100, gameState.boardKey)})
                            </button>
                          )}
                          {tState.tier > 0 && (
                            <button
                              onClick={() => dispatchAction({ type: 'SELL_BUILDING', tileId: selectedTile })}
                              style={secondaryButtonStyle}
                            >
                              Sell Building
                            </button>
                          )}
                          {!tState.mortgaged && tState.tier === 0 && (
                            <button
                              onClick={() => dispatchAction({ type: 'MORTGAGE', tileId: selectedTile })}
                              style={secondaryButtonStyle}
                            >
                              Mortgage (+{formatCurrency(Math.round((def.price ?? 100) / 2), gameState.boardKey)})
                            </button>
                          )}
                          {tState.mortgaged && (
                            <button
                              onClick={() => dispatchAction({ type: 'UNMORTGAGE', tileId: selectedTile })}
                              style={secondaryButtonStyle}
                            >
                              Unmortgage (-{formatCurrency(Math.round(((def.price ?? 100) / 2) * 1.1), gameState.boardKey)})
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowTradeModal(true)}
                  style={secondaryButtonStyle}
                >
                  🤝 Propose Trade
                </button>
                <button
                  onClick={() => setShowAbilityModal(true)}
                  style={secondaryButtonStyle}
                >
                  ⚡ Role Ability
                </button>
                <button
                  onClick={() => setShowInfluenceModal(true)}
                  style={secondaryButtonStyle}
                >
                  ⭐ Influence Store
                </button>
              </div>

              {/* End Turn CTA */}
              <button
                onClick={() => dispatchAction({ type: 'END_TURN' })}
                style={{
                  ...primaryButtonStyle,
                  padding: '14px',
                  fontSize: '15px',
                  width: '100%',
                }}
              >
                End Turn & Pass Dice ➡️
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
              <p>Waiting for {currentPlayer?.name} to wrap up their turn...</p>
            </div>
          )}
        </div>
      )}

      {/* PHASE 8: Game Over */}
      {phase === 'gameOver' && (
        <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '42px' }}>👑</div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#eab308' }}>
            Match Concluded!
          </h3>
          <p style={{ fontSize: '14px', color: '#cbd5e1' }}>
            A player has achieved complete domination in the Business Tycoons arena!
          </p>
          <button
            onClick={() => initLocalGame(3, playerName, selectedRole, false, 1500, { turnTimerSec })}
            style={{ ...primaryButtonStyle, alignSelf: 'center' }}
          >
            Play Another Game
          </button>
        </div>
      )}
    </div>
  );
};
