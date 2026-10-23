import React, { useState, useEffect } from 'react';
import { useUserStore } from '../userStore';
import { useYoupiStore, PAYMENT_PACKAGES, PaymentPackage } from '../youpiStore';
import { usePhonePeStore } from '../phonepeStore';
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

  const {
    openPhonePeCheckout,
    transactions: phonePeTransactions,
    isOnline: isPhonePeOnline,
    merchantId: phonePeMerchantId,
    environment: phonePeEnv,
    checkGatewayStatus: checkPhonePeStatus,
    clearTransactions: clearPhonePeHistory,
  } = usePhonePeStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'history' | 'config'>('profile');
  const [selectedGateway, setSelectedGateway] = useState<'phonepe' | 'youpi'>('phonepe');
  const [nameInput, setNameInput] = useState(user.username);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [copiedKey, setCopiedKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [phonepePingStatus, setPhonepePingStatus] = useState<string | null>(null);

  useEffect(() => {
    setNameInput(user.username);
    setSelectedAvatar(user.avatar);
  }, [user.username, user.avatar]);

  useEffect(() => {
    if (showAccountModal) {
      checkGatewayHealth();
      checkPhonePeStatus();
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

  const handlePingPhonePe = async () => {
    soundFx.playClick();
    setPhonepePingStatus('Connecting to PhonePe UAT Gateway...');
    const ok = await checkPhonePeStatus();
    setPhonepePingStatus(ok ? '✓ PhonePe Gateway UAT Online (Merchant PGTESTPAYUAT Active)' : '✕ PhonePe service unreachable');
    setTimeout(() => setPhonepePingStatus(null), 3500);
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
            { id: 'profile', label: '👤 PROFILE' },
            { id: 'store', label: '💰 BULLION VAULT & PASS' },
            { id: 'history', label: `📋 TRANSACTIONS (${transactions.length + phonePeTransactions.length})` },
            { id: 'config', label: '⚡ GATEWAYS CONFIG' },
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

          {/* TAB 2: BULLION VAULT & OFFICIAL GATEWAYS */}
          {activeTab === 'store' && (
            <>
              {/* Gateway Selection & Status Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* PhonePe Gateway Card */}
                <div
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedGateway('phonepe');
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    backgroundColor: selectedGateway === 'phonepe' ? 'rgba(95, 37, 159, 0.28)' : 'rgba(95, 37, 159, 0.08)',
                    border: selectedGateway === 'phonepe' ? '2px solid #8b5cf6' : '1px solid rgba(139, 92, 246, 0.35)',
                    boxShadow: selectedGateway === 'phonepe' ? '0 0 25px rgba(139, 92, 246, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #5f259f 0%, #8b5cf6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '13px',
                          color: '#ffffff',
                        }}
                      >
                        पे
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: '#ffffff', fontFamily: 'Orbitron, sans-serif' }}>
                        PHONEPE GATEWAY
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        color: '#00ff88',
                        border: '1px solid rgba(0, 255, 136, 0.4)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      ● RBI AUTHORIZED
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    Official Payment Aggregator • Standard Pay Page • Instant UPI QR • Cards • NetBanking • SHA256 Signed
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '10px', color: isPhonePeOnline ? '#00ff88' : '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }}>
                      ● {isPhonePeOnline ? 'UAT ONLINE' : 'STANDBY'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePingPhonePe();
                      }}
                      className="arcade-btn arcade-btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '9.5px' }}
                    >
                      TEST PHONEPE
                    </button>
                  </div>
                </div>

                {/* YouPI Gateway Card */}
                <div
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedGateway('youpi');
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    backgroundColor: selectedGateway === 'youpi' ? 'rgba(0, 240, 255, 0.16)' : 'rgba(0, 240, 255, 0.05)',
                    border: selectedGateway === 'youpi' ? '2px solid #00f0ff' : '1px solid rgba(0, 240, 255, 0.25)',
                    boxShadow: selectedGateway === 'youpi' ? '0 0 25px rgba(0, 240, 255, 0.25)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(0, 240, 255, 0.2)',
                          border: '1px solid #00f0ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '13px',
                          color: '#00f0ff',
                        }}
                      >
                        ₹
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: '#ffffff', fontFamily: 'Orbitron, sans-serif' }}>
                        YOUPI PG V2
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      0% P2P UPI
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                    Self-Hosted P2P UPI Portal • Direct Bank UTR Verification • No Intermediary Aggregator Cut
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '10px', color: isGatewayOnline ? '#00ff88' : '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }}>
                      ● {isGatewayOnline ? 'PORT 7050 ONLINE' : 'OFFLINE'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePingGateway();
                      }}
                      className="arcade-btn arcade-btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '9.5px' }}
                    >
                      PING STATUS
                    </button>
                  </div>
                </div>
              </div>

              {phonepePingStatus && (
                <div style={{ fontSize: '11px', color: '#a78bfa', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
                  {phonepePingStatus}
                </div>
              )}

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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {/* PhonePe Primary Checkout Button */}
                      <button
                        onClick={() => openPhonePeCheckout(pkg)}
                        style={{
                          padding: '10px 18px',
                          fontSize: '12px',
                          borderRadius: '10px',
                          whiteSpace: 'nowrap',
                          fontWeight: 900,
                          fontFamily: 'Orbitron, sans-serif',
                          background: 'linear-gradient(135deg, #5f259f 0%, #7c3aed 100%)',
                          border: '1.5px solid #a78bfa',
                          color: '#ffffff',
                          cursor: 'pointer',
                          boxShadow: '0 0 16px rgba(124, 58, 237, 0.45)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>⚡ PHONEPE ₹{pkg.priceInr}</span>
                      </button>

                      {/* YouPI Alternate Checkout Button */}
                      <button
                        onClick={() => openCheckout(pkg)}
                        className="arcade-btn arcade-btn-secondary"
                        style={{
                          padding: '8px 12px',
                          fontSize: '11px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                          fontWeight: 700,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: '#00f0ff',
                          borderColor: 'rgba(0, 240, 255, 0.35)',
                        }}
                        title="Checkout via YouPI P2P UPI"
                      >
                        YouPI P2P
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 3: TRANSACTION HISTORY (COMBINED PHONEPE + YOUPI) */}
          {activeTab === 'history' && (
            <>
              {(() => {
                const combined = [
                  ...phonePeTransactions.map((tx) => ({
                    id: tx.id,
                    gateway: 'PHONEPE' as const,
                    packageName: tx.packageName,
                    amountInr: tx.amountInr,
                    bullionsCredited: tx.bullionsCredited,
                    status: tx.status,
                    ref: `PP TXN: ${tx.phonepeTransactionId || tx.merchantTransactionId}`,
                    timestamp: tx.timestamp,
                  })),
                  ...transactions.map((tx) => ({
                    id: tx.id,
                    gateway: 'YOUPI' as const,
                    packageName: tx.packageName,
                    amountInr: tx.amountInr,
                    bullionsCredited: tx.bullionsCredited,
                    status: tx.status,
                    ref: `ORDER: ${tx.orderId} • UTR: ${tx.utr}`,
                    timestamp: tx.timestamp,
                  })),
                ].sort((a, b) => b.timestamp - a.timestamp);

                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                        LEDGER: {combined.length} RECENT TRANSACTIONS
                      </span>
                      {combined.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              soundFx.playClick();
                              clearPhonePeHistory();
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
                            Clear All Ledgers
                          </button>
                        </div>
                      )}
                    </div>

                    {combined.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🧾</div>
                        <div>No payment transactions recorded yet.</div>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>Top up bullions via PhonePe or YouPI UPI to test live settlement!</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {combined.map((tx) => (
                          <div
                            key={tx.id}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: '12px',
                              border: tx.gateway === 'PHONEPE' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(0, 240, 255, 0.25)',
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
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 900,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: tx.gateway === 'PHONEPE' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0, 240, 255, 0.15)',
                                    color: tx.gateway === 'PHONEPE' ? '#c084fc' : '#38bdf8',
                                    border: `1px solid ${tx.gateway === 'PHONEPE' ? '#a855f7' : '#0ea5e9'}`,
                                  }}
                                >
                                  {tx.gateway === 'PHONEPE' ? '⚡ PHONEPE' : 'YOUPI-PG'}
                                </span>
                                <span style={{ color: '#00ff88', fontSize: '10px', border: '1px solid rgba(0, 255, 136, 0.3)', padding: '1px 5px', borderRadius: '4px' }}>
                                  {tx.status}
                                </span>
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px' }}>
                                {tx.ref}
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
                );
              })()}
            </>
          )}

          {/* TAB 4: GATEWAYS CONFIGURATION & STATUS */}
          {activeTab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* PhonePe Official Gateway Config Card */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(95, 37, 159, 0.12)',
                  borderRadius: '16px',
                  border: '1.5px solid rgba(139, 92, 246, 0.4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⚡</span>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#ffffff', fontFamily: 'Orbitron, sans-serif' }}>
                      PHONEPE PAYMENT GATEWAY (OFFICIAL & RBI AUTHORIZED)
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#00ff88', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                    ● UAT SANDBOX READY
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginBottom: '14px' }}>
                  Official PhonePe Standard Checkout with SHA-256 Checksum Signature Verification and Authoritative Server Webhooks.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Merchant ID:</span>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>{phonePeMerchantId}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Environment:</span>
                    <span style={{ color: '#c084fc', fontWeight: 700 }}>{phonePeEnv} (UAT)</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Host Endpoint:</span>
                    <span style={{ color: '#38bdf8', fontSize: '11px', wordBreak: 'break-all' }}>https://api-preprod.phonepe.com/apis/pg-sandbox</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Checksum Standard:</span>
                    <span style={{ color: '#00ff88', fontSize: '11px' }}>SHA256(Payload + Salt)###Index</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    onClick={handlePingPhonePe}
                    className="arcade-btn arcade-btn-cyan"
                    style={{ padding: '6px 14px', fontSize: '11px' }}
                  >
                    TEST PHONEPE CONNECTION
                  </button>
                </div>
              </div>

              {/* YouPI-PG Gateway Config Card */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                  YouPI-PG Self-Hosted UPI Gateway Topology
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
