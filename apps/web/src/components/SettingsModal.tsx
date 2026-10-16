import React, { useState } from 'react';
import { useGameStore } from '../store';
import { useUserStore } from '../userStore';
import { AVAILABLE_BOARDS, BOARD_CURRENCY, PLAYER_ROLES, AVAILABLE_PEGS, RoleId, formatCurrency } from '../boardData';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    boardKey,
    setBoardKey,
    initLocalGame,
    connectOnline,
    disconnect,
    gameMode,
    gameState,
    myPlayerId,
  } = useGameStore();


  const { user, setShowAccountModal, setShowCustomFriendsModal } = useUserStore();

  const [playerCount, setPlayerCount] = useState<number>(gameState ? gameState.turnOrder.length : 4);
  const [playerName, setPlayerName] = useState<string>(user.username || gameState?.players[myPlayerId]?.name || 'My Daddy');
  const [selectedRole, setSelectedRole] = useState<RoleId>((gameState?.players[myPlayerId]?.roleId as RoleId) || 'Tycoon');
  const [selectedPeg, setSelectedPeg] = useState<string>(gameState?.players[myPlayerId]?.tokenId || 'alien');
  const [startingCash, setStartingCash] = useState<number>(gameState?.rules.startingCash ?? 1500);
  const [turnTimerSec, setTurnTimerSec] = useState<number>(gameState?.rules.turnTimerSec ?? 30);

  // Richup Game Settings
  const [privateRoom, setPrivateRoom] = useState<boolean>(true);
  const [allowBots, setAllowBots] = useState<boolean>(true);

  // Richup Gameplay Rules Toggles
  const [doubleRentFullSet, setDoubleRentFullSet] = useState<boolean>(gameState?.rules.doubleRentFullSet ?? true);
  const [vacationCash, setVacationCash] = useState<boolean>(gameState?.rules.vacationCash ?? true);
  const [auction, setAuction] = useState<boolean>(gameState?.rules.auctionOnDecline ?? true);
  const [noRentInPrison, setNoRentInPrison] = useState<boolean>(gameState?.rules.noRentInPrison ?? true);
  const [mortgageAllowed, setMortgageAllowed] = useState<boolean>(true);
  const [singleDice, setSingleDice] = useState<boolean>(gameState?.rules.singleDiceMode ?? false);

  if (!isOpen) return null;

  const handleApplyAndRestart = () => {
    initLocalGame(
      playerCount,
      playerName.trim() || 'Player 1',
      selectedRole,
      singleDice,
      startingCash,
      {
        doubleRentFullSet,
        vacationCash,
        auctionOnDecline: auction,
        noRentInPrison,
        turnTimerSec,
      },
      selectedPeg
    );
    onClose();
  };

  const activePegDef = AVAILABLE_PEGS.find(p => p.id === selectedPeg) || AVAILABLE_PEGS[0];

  const handleSelectPeg = (pegId: string, isPremium?: boolean) => {
    if (isPremium && !user.isVip) {
      setShowAccountModal(true);
      return;
    }
    setSelectedPeg(pegId);
  };

  const handleSelectBoard = (key: string) => {
    if ((key === 'afterdark' || key === 'customfriends') && !user.isVip) {
      setShowAccountModal(true);
      return;
    }
    setBoardKey(key);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 8, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1e1633',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(139, 92, 246, 0.25)',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header / Profile banner matching Richup */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#261b40',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              onClick={() => setShowAccountModal(true)}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: user.isVip ? '#d97706' : '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: user.isVip ? '0 0 16px rgba(245, 158, 11, 0.7)' : '0 0 16px rgba(124, 58, 237, 0.7)',
                cursor: 'pointer',
              }}
              title="Click to view Account & VIP status"
            >
              {user.avatar || activePegDef.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
                  placeholder="Enter name"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: 700,
                    outline: 'none',
                    padding: '3px 8px',
                    width: '140px',
                  }}
                  title="Click to edit player nickname"
                />
                <button
                  type="button"
                  onClick={() => setShowAccountModal(true)}
                  style={{
                    fontSize: '11px',
                    backgroundColor: user.isVip ? '#d97706' : 'rgba(255,255,255,0.1)',
                    color: user.isVip ? '#fef3c7' : '#94a3b8',
                    border: 'none',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                  }}
                >
                  {user.isVip ? '⭐ VIP' : '👤 Profile'}
                </button>
              </div>
              <span style={{ fontSize: '11px', color: '#a78bfa' }}>Role: {selectedRole} • Peg: {activePegDef.name}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={selectedRole}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedRole(e.target.value as RoleId)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '12px',
                padding: '6px 10px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {PLAYER_ROLES.map(r => (
                <option key={r.id} value={r.id} style={{ backgroundColor: '#1e1633' }}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '20px',
                cursor: 'pointer',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Settings Body */}
        <div
          style={{
            padding: '20px 22px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Peg Token Selector */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎭</span>
                <span>Choose Animated Peg / Character</span>
              </div>
              {!user.isVip && (
                <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>
                  👑 VIP pegs locked
                </span>
              )}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '8px',
                backgroundColor: 'rgba(0,0,0,0.25)',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {AVAILABLE_PEGS.map(peg => {
                const isSelected = selectedPeg === peg.id;
                const isLocked = peg.isPremium && !user.isVip;
                return (
                  <button
                    key={peg.id}
                    type="button"
                    onClick={() => handleSelectPeg(peg.id, peg.isPremium)}
                    title={peg.isPremium ? `${peg.name} (VIP Only)` : peg.name}
                    style={{
                      height: '46px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: isSelected ? 'rgba(124, 58, 237, 0.4)' : isLocked ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.03)',
                      color: '#ffffff',
                      fontSize: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isSelected ? '0 0 12px rgba(167, 139, 250, 0.5)' : 'none',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      opacity: isLocked ? 0.6 : 1,
                    }}
                  >
                    <span>{peg.icon}</span>
                    {isLocked && (
                      <span style={{ position: 'absolute', top: '2px', right: '3px', fontSize: '9px' }}>
                        🔒
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Game Settings */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#c4b5fd',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                paddingBottom: '6px',
              }}
            >
              Game Settings
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Maximum Players (2 to 8) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👥</span>
                    <span>Maximum players</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>How many players can join (2 to 8)</div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlayerCount(n)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: playerCount === n ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: playerCount === n ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Initial Starting Currency */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💵</span>
                    <span>Initial cash</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Starting money given to each player</div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1000, 1500, 2000, 2500, 3000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setStartingCash(amt)}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: startingCash === amt ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: startingCash === amt ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {formatCurrency(amt, boardKey)}
                    </button>
                  ))}
                </div>
              </div>


              {/* Turn Timer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⏱</span>
                    <span>Turn timer</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Auto-end turn after N seconds of inactivity</div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[15, 30, 60, 90, 120].map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTurnTimerSec(sec)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: turnTimerSec === sec ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: turnTimerSec === sec ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
              {/* Board Map Selection */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🗺️</span>
                    <span>Board map</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Select classic countries or 18+ boards</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <select
                    value={boardKey}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectBoard(e.target.value)}
                    style={{
                      backgroundColor: '#261b40',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      fontSize: '12px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      outline: 'none',
                      fontWeight: 600,
                    }}
                  >
                    <option value="default">Classic (World)</option>
                    <option value="india">India (State-Wise)</option>
                    <option value="usa">USA</option>
                    <option value="uk">United Kingdom</option>
                    <option value="uae">UAE Dubai</option>
                    <option value="afterdark">🔞 18+ After Dark {!user.isVip ? '🔒' : ''}</option>
                    <option value="customfriends">🔞 Custom Friends {!user.isVip ? '🔒' : ''}</option>
                  </select>
                  {boardKey === 'customfriends' && user.isVip && (
                    <button
                      type="button"
                      onClick={() => setShowCustomFriendsModal(true)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#ec4899',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Edit Friends
                    </button>
                  )}
                </div>
              </div>

              {/* Dice Mode Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎲</span>
                    <span>Dice system</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Two dice (with doubles) or single die</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setSingleDice(false)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: !singleDice ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: !singleDice ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🎲🎲 Two Dice
                  </button>
                  <button
                    type="button"
                    onClick={() => setSingleDice(true)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: singleDice ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: singleDice ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🎲 Single Die
                  </button>
                </div>
              </div>

              {/* Private Room Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔑</span>
                    <span>Private room</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Access using room URL only</div>
                </div>
                <ToggleSwitch checked={privateRoom} onChange={setPrivateRoom} />
              </div>

              {/* Allow bots to join */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🤖</span>
                    <span>Allow bots to join <span style={{ fontSize: '10px', backgroundColor: '#6366f1', padding: '1px 4px', borderRadius: '4px' }}>Beta</span></span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Bots will join based on availability</div>
                </div>
                <ToggleSwitch checked={allowBots} onChange={setAllowBots} />
              </div>
            </div>
          </div>

          {/* Section: Gameplay Rules */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#c4b5fd',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                paddingBottom: '6px',
              }}
            >
              Gameplay rules
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* x2 rent on full-set properties */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🪙</span>
                    <span>x2 rent on full-set properties</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    Base rent payment is doubled on monopolies
                  </div>
                </div>
                <ToggleSwitch checked={doubleRentFullSet} onChange={setDoubleRentFullSet} />
              </div>

              {/* Vacation cash */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🌴</span>
                    <span>Vacation cash</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    Collect all accumulated tax jackpot on Vacation
                  </div>
                </div>
                <ToggleSwitch checked={vacationCash} onChange={setVacationCash} />
              </div>

              {/* Auction */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔨</span>
                    <span>Auction</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    Auction unbought properties to highest bidder
                  </div>
                </div>
                <ToggleSwitch checked={auction} onChange={setAuction} />
              </div>

              {/* Don't collect rent while in prison */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚖️</span>
                    <span>Don't collect rent while in prison</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    Rent waived if owner is in prison
                  </div>
                </div>
                <ToggleSwitch checked={noRentInPrison} onChange={setNoRentInPrison} />
              </div>

              {/* Mortgage */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📜</span>
                    <span>Mortgage</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    Mortgage properties to earn 50% cash
                  </div>
                </div>
                <ToggleSwitch checked={mortgageAllowed} onChange={setMortgageAllowed} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#261b40',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleApplyAndRestart}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
              transition: 'all 0.15s ease',
            }}
          >
            🎮 Play vs Bots
          </button>

          <button
            type="button"
            onClick={() => {
              const code = Math.random().toString(36).substring(2, 8).toUpperCase();
              connectOnline(code, playerName.trim() || 'Player 1', selectedRole);
              onClose();
            }}
            style={{
              flex: 1,
              minWidth: '160px',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.15s ease',
            }}
          >
            🌐 Online Multiplayer
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

// Reusable toggle switch
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (val: boolean) => void }> = ({ checked, onChange }) => {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '42px',
        height: '22px',
        borderRadius: '9999px',
        backgroundColor: checked ? '#7c3aed' : 'rgba(255, 255, 255, 0.16)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          position: 'absolute',
          top: '3px',
          left: checked ? '23px' : '3px',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
};
