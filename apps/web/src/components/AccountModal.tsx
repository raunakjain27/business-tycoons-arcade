import React, { useState, useEffect } from 'react';
import { useUserStore } from '../userStore';
import { useYoupiStore, PAYMENT_PACKAGES, PaymentPackage } from '../youpiStore';
import { soundFx } from '../soundEffects';

export const AccountModal: React.FC = () => {
  const { user, showAccountModal, setShowAccountModal, updateUsername, updateAvatar, upgradeToVip } = useUserStore();
  const {
    openCheckout,
    transactions,
    isGatewayOnline,
    testMode,
    setTestMode,
    gatewayApiUrl,
    setGatewayApiUrl,
    checkoutPortalUrl,
    setCheckoutPortalUrl,
    merchantVpa,
    checkGatewayHealth,
    clearHistory,
  } = useYoupiStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'history' | 'config'>('profile');
  const [nameInput, setNameInput] = useState(user.username);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [copiedKey, setCopiedKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  useEffect(() => {
    setNameInput(user.username);
    setSelectedAvatar(user.avatar);
  }, [user.username, user.avatar]);

  useEffect(() => {
    if (showAccountModal) {
      checkGatewayHealth();
    }
  }, [showAccountModal]);

  if (!showAccountModal) return null;

  const AVATARS = ['👑', '🎩', '⚡', '🚀', '💎', '🦁', '🦊', '👾', '🔥', '🐲', '🦄', '🛡️'];

  const handleSaveProfile = () => {
    soundFx.playClick();
    if (nameInput.trim()) updateUsername(nameInput.trim());
    updateAvatar(selectedAvatar);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const copyAccountRecoveryKey = () => {
    soundFx.playClick();
    navigator.clipboard.writeText(`TYCOON-KEY-${user.id}`);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePingGateway = async () => {
    soundFx.playClick();
    setPingStatus('Testing connection...');
    const ok = await checkGatewayHealth();
    setPingStatus(ok ? '✓ Connected to YouPI-PG v2 Gateway (HTTP 200)' : '✕ Gateway offline or port unreachable');
    setTimeout(() => setPingStatus(null), 3500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 18, 0.9)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2200,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={() => setShowAccountModal(false)}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0b1224 0%, #060a16 100%)',
          borderRadius: '24px',
          border: '1.5px solid rgba(0, 240, 255, 0.35)',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 240, 255, 0.2)',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: 'rgba(14, 22, 44, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 240, 255, 0.15)',
                border: '1.5px solid #00f0ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
              }}
            >
              👤
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 900,
                    fontFamily: 'Orbitron, sans-serif',
                    letterSpacing: '0.6px',
                  }}
                >
                  TYCOON OPERATOR ACCOUNT
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: user.isVip ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    border: `1px solid ${user.isVip ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)'}`,
                    color: user.isVip ? '#f59e0b' : '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {user.isVip ? 'VIP CLUB PASS' : 'STANDARD'}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                OPERATOR ID: {user.id} • ZERO-PII SECURE IDENTITY
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              setShowAccountModal(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(6, 10, 22, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '4px 12px',
            gap: '6px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'profile', label: '👤 PROFILE IDENTITY' },
            { id: 'store', label: '💰 BULLION VAULT (YOUPI)' },
            { id: 'history', label: `📋 TRANSACTIONS (${transactions.length})` },
            { id: 'config', label: '⚙️ YOUPI GATEWAY' },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  soundFx.playClick();
                  setActiveTab(t.id as any);
                }}
                className={`arcade-btn ${isActive ? 'arcade-btn-cyan' : 'arcade-btn-secondary'}`}
                style={{
                  padding: '8px 14px',
                  fontSize: '11px',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                  fontFamily: 'Orbitron, sans-serif',
                  letterSpacing: '0.4px',
                  borderBottom: isActive ? '2px solid #00f0ff' : 'none',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* TAB 1: PROFILE IDENTITY */}
          {activeTab === 'profile' && (
            <>
              {/* Profile Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  padding: '18px',
                  borderRadius: '18px',
                  border: '1.5px solid rgba(0, 240, 255, 0.25)',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: user.isVip
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(135deg, #00f0ff 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '34px',
                    boxShadow: user.isVip ? '0 0 25px rgba(245, 158, 11, 0.5)' : '0 0 25px rgba(0, 240, 255, 0.4)',
                    flexShrink: 0,
                  }}
                >
                  {selectedAvatar}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      maxLength={20}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Enter callsig / name"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '15px',
                        fontWeight: 800,
                        padding: '6px 12px',
                        outline: 'none',
                        fontFamily: 'Space Grotesk, sans-serif',
                        width: '180px',
                      }}
                    />
                    <button
                      onClick={handleSaveProfile}
                      className="arcade-btn arcade-btn-cyan"
                      style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px' }}
                    >
                      {savedSuccess ? '✓ SAVED!' : 'SAVE NAME'}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '8px',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#94a3b8',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      BULLION: <strong style={{ color: '#fde047' }}>{user.coins}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      VICTORIES: <strong style={{ color: '#00ff88' }}>{user.gamesWon} WINS</strong>
                    </span>
                    <span>•</span>
                    <span>
                      LEVEL: <strong style={{ color: '#38bdf8' }}>LVL {user.level}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Avatar Selection Grid */}
              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#94a3b8',
                    display: 'block',
                    marginBottom: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  SELECT OPERATOR CALLSIGN AVATAR:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setSelectedAvatar(av);
                      }}
                      style={{
                        aspectRatio: '1/1',
                        borderRadius: '12px',
                        border: selectedAvatar === av ? '2px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: selectedAvatar === av ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        fontSize: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: selectedAvatar === av ? 'scale(1.08)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* XP & Level Progress */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  padding: '14px 18px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'Orbitron, sans-serif' }}>
                    LEVEL {user.level} TYCOON OPERATOR
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8' }}>
                    {user.xp} / {user.maxXp} XP
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((user.xp / user.maxXp) * 100))}%`,
                      background: 'linear-gradient(90deg, #00f0ff 0%, #00ff88 100%)',
                      boxShadow: '0 0 10px #00f0ff',
                    }}
                  />
                </div>
              </div>

              {/* Account Recovery Strip */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#ffffff' }}>🔒 Device Identity Persistence</div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Your wallet balance and unlocked boards persist across sessions.</div>
                </div>
                <button
                  onClick={copyAccountRecoveryKey}
                  className="arcade-btn arcade-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {copiedKey ? '✓ COPIED KEY' : 'COPY RECOVERY KEY'}
                </button>
              </div>
            </>
          )}

          {/* TAB 2: BULLION VAULT & YOUPI GATEWAY */}
          {activeTab === 'store' && (
            <>
              {/* YouPI Gateway Status Banner */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(0, 240, 255, 0.08)',
                  borderRadius: '14px',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isGatewayOnline ? '#00ff88' : '#fbbf24',
                      boxShadow: `0 0 8px ${isGatewayOnline ? '#00ff88' : '#fbbf24'}`,
                    }}
                  />
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', fontFamily: 'Orbitron, sans-serif' }}>
                      YOUPI PG V2 PAYMENT GATEWAY
                    </span>
                    <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                      0% GATEWAY FEES • DIRECT P2P UPI SETTLEMENT • ZERO INTERMEDIARY CUT
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePingGateway}
                  className="arcade-btn arcade-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '10px' }}
                >
                  PING STATUS
                </button>
              </div>

              {pingStatus && (
                <div style={{ fontSize: '11px', color: '#00ff88', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
                  {pingStatus}
                </div>
              )}

              {/* Package Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {PAYMENT_PACKAGES.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '16px',
                      border: `1.5px solid ${pkg.badgeColor || 'rgba(255, 255, 255, 0.12)'}`,
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 900, color: '#ffffff', fontFamily: 'Space Grotesk, sans-serif' }}>
                          {pkg.name}
                        </span>
                        {pkg.tag && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 900,
                              color: '#000000',
                              backgroundColor: pkg.badgeColor || '#00f0ff',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontFamily: 'Orbitron, sans-serif',
                            }}
                          >
                            {pkg.tag}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        {pkg.description}
                      </p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '11.5px', fontFamily: 'JetBrains Mono, monospace' }}>
                        <span style={{ color: '#fde047' }}>+{pkg.bullions} BULLIONS</span>
                        {pkg.bonusCoins > 0 && <span style={{ color: '#00f0ff' }}>+{pkg.bonusCoins} COINS</span>}
                        {pkg.bonusVip && <span style={{ color: '#f59e0b' }}>★ VIP UNLOCKED</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => openCheckout(pkg)}
                      className="arcade-btn arcade-btn-cyan"
                      style={{
                        padding: '10px 18px',
                        fontSize: '12px',
                        borderRadius: '10px',
                        whiteSpace: 'nowrap',
                        fontWeight: 900,
                        fontFamily: 'Orbitron, sans-serif',
                        flexShrink: 0,
                      }}
                    >
                      BUY ₹{pkg.priceInr} ▶
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 3: TRANSACTION HISTORY */}
          {activeTab === 'history' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                  LEDGER: {transactions.length} RECENT TRANSACTIONS
                </span>
                {transactions.length > 0 && (
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      clearHistory();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f87171',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Clear Ledger
                  </button>
                )}
              </div>

              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>🧾</div>
                  <div>No payment transactions recorded yet.</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>Top up bullions via the Bullion Store to test YouPI UPI checkout!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '14px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: '#ffffff' }}>{tx.packageName}</strong>
                          <span style={{ color: '#00ff88', fontSize: '10px', border: '1px solid rgba(0, 255, 136, 0.3)', padding: '1px 5px', borderRadius: '4px' }}>
                            {tx.status}
                          </span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px' }}>
                          ORDER: {tx.orderId} • UTR: {tx.utr}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#00ff88' }}>
                          ₹{tx.amountInr}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#fde047' }}>
                          +{tx.bullionsCredited} Bullions
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB 4: YOUPI GATEWAY CONFIG */}
          {activeTab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                  Gateway Topology & Endpoints
                </div>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '14px' }}>
                  Self-hosted white-label UPI gateway engine configuration for Business Tycoons Arcade.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>
                      Payment Core REST API URL:
                    </label>
                    <input
                      type="text"
                      value={gatewayApiUrl}
                      onChange={(e) => setGatewayApiUrl(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono, monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>
                      Customer Checkout Portal URL:
                    </label>
                    <input
                      type="text"
                      value={checkoutPortalUrl}
                      onChange={(e) => setCheckoutPortalUrl(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono, monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>
                      Merchant UPI VPA (Virtual Payment Address):
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={merchantVpa}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#38bdf8',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono, monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#ffffff' }}>Instant Settlement Simulator (Dev Mode)</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Allows instant simulated settlement and automated UTR verification.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        setTestMode(!testMode);
                      }}
                      className={`arcade-btn ${testMode ? 'arcade-btn-cyan' : 'arcade-btn-secondary'}`}
                      style={{ padding: '6px 14px', fontSize: '11px' }}
                    >
                      {testMode ? 'ENABLED (SIMULATOR)' : 'DISABLED (LIVE ONLY)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: 'rgba(14, 22, 44, 0.98)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            onClick={() => {
              soundFx.playClick();
              setShowAccountModal(false);
            }}
            className="arcade-btn arcade-btn-secondary"
            style={{ padding: '8px 18px', fontSize: '11.5px', borderRadius: '8px' }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
