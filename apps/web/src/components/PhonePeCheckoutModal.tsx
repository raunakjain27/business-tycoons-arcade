import React, { useState, useEffect } from 'react';
import { usePhonePeStore } from '../phonepeStore';
import { soundFx } from '../soundEffects';

export const PhonePeCheckoutModal: React.FC = () => {
  const {
    isPhonePeModalOpen,
    selectedPackage,
    activeTransactionId,
    paymentState,
    instrumentType,
    setInstrumentType,
    redirectUrl,
    errorMessage,
    successData,
    merchantId,
    environment,
    closePhonePeCheckout,
    simulatePaymentSuccess,
  } = usePhonePeStore();

  const [copiedVpa, setCopiedVpa] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300);

  useEffect(() => {
    if (isPhonePeModalOpen) {
      setTimerSeconds(300);
      const interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPhonePeModalOpen]);

  if (!isPhonePeModalOpen || !selectedPackage) return null;

  const phonepeVpa = 'phonepe.tycoons@ybl';
  const upiIntentString = `phonepe://pay?pa=${encodeURIComponent(phonepeVpa)}&pn=${encodeURIComponent('Business Tycoons Arcade')}&am=${selectedPackage.priceInr.toFixed(2)}&cu=INR&tn=${encodeURIComponent(activeTransactionId || 'TycoonTopup')}`;

  const copyVpa = () => {
    soundFx.playClick();
    navigator.clipboard.writeText(phonepeVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const copyAmount = () => {
    soundFx.playClick();
    navigator.clipboard.writeText(selectedPackage.priceInr.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleSimulatePayment = () => {
    soundFx.playClick();
    simulatePaymentSuccess();
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 3, 20, 0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={closePhonePeCheckout}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(145deg, #180d38 0%, #0a0418 100%)',
          borderRadius: '24px',
          border: '1.5px solid rgba(139, 92, 246, 0.45)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9), 0 0 45px rgba(95, 37, 159, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: PhonePe Official Branding */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: 'rgba(28, 14, 58, 0.98)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #5f259f 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '18px',
                color: '#ffffff',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.6)',
              }}
            >
              पे
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 900,
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#ffffff',
                    letterSpacing: '0.6px',
                  }}
                >
                  PHONEPE PAYMENT GATEWAY
                </span>
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
              <span style={{ fontSize: '10px', color: '#c4b5fd', fontFamily: 'JetBrains Mono, monospace' }}>
                MERCHANT: {merchantId} • {environment} GATEWAY • 0% MDR PROMO
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              closePhonePeCheckout();
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

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* SUCCESS STATE */}
          {paymentState === 'success' && successData ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '16px',
                padding: '20px 10px',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 255, 136, 0.15)',
                  border: '2px solid #00ff88',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  boxShadow: '0 0 35px rgba(0, 255, 136, 0.6)',
                  animation: 'pulseGlow 2s infinite',
                }}
              >
                ✓
              </div>

              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 900,
                    color: '#00ff88',
                    fontFamily: 'Orbitron, sans-serif',
                  }}
                >
                  PHONEPE SETTLEMENT CONFIRMED!
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#c4b5fd' }}>
                  Assets successfully settled and credited to your Tycoon balance via PhonePe Gateway.
                </p>
              </div>

              {/* Receipt Box */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>PACKAGE:</span>
                  <strong style={{ color: '#ffffff' }}>{successData.packageName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>BULLION CREDITED:</span>
                  <strong style={{ color: '#fde047' }}>+{successData.bullionsAdded} BULLIONS</strong>
                </div>
                {successData.coinsAdded > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>BONUS COINS:</span>
                    <strong style={{ color: '#00f0ff' }}>+{successData.coinsAdded} COINS</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>PHONEPE TXN ID:</span>
                  <span style={{ color: '#a78bfa' }}>{successData.phonepeTxnId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>MERCHANT TXN ID:</span>
                  <span style={{ color: '#00ff88' }}>{successData.txnId}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  soundFx.playClick();
                  closePhonePeCheckout();
                }}
                className="arcade-btn arcade-btn-cyan"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '13px',
                  borderRadius: '12px',
                  fontWeight: 900,
                  fontFamily: 'Orbitron, sans-serif',
                }}
              >
                RETURN TO TYCOON ARENA ▶
              </button>
            </div>
          ) : (
            <>
              {/* Checkout Amount Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(95, 37, 159, 0.25) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  borderRadius: '16px',
                  border: '1.5px solid rgba(139, 92, 246, 0.4)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#c4b5fd', fontFamily: 'JetBrains Mono, monospace' }}>
                    PHONEPE TOTAL AMOUNT
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 900, color: '#00ff88', fontFamily: 'Orbitron, sans-serif' }}>
                      ₹{selectedPackage.priceInr}
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#ffffff' }}>
                      ({selectedPackage.name})
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: '#c4b5fd', display: 'block' }}>SESSION TIMER</span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: timerSeconds < 60 ? '#ff0077' : '#00ff88',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    ⏱ {formatTimer(timerSeconds)}
                  </span>
                </div>
              </div>

              {/* Instrument Toggle: Pay Page vs QR vs Intent */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  padding: '4px',
                  gap: '4px',
                }}
              >
                {[
                  { id: 'PAY_PAGE' as const, label: '📲 PHONEPE CHECKOUT' },
                  { id: 'UPI_QR' as const, label: '🔳 SCAN PHONEPE QR' },
                  { id: 'UPI_INTENT' as const, label: '⚡ DIRECT APP INTENT' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      soundFx.playClick();
                      setInstrumentType(t.id);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      fontFamily: 'Orbitron, sans-serif',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: instrumentType === t.id ? '#5f259f' : 'transparent',
                      color: instrumentType === t.id ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      boxShadow: instrumentType === t.id ? '0 0 12px rgba(95, 37, 159, 0.6)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: PHONEPE PAY PAGE FLOW */}
              {instrumentType === 'PAY_PAGE' && (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                    Select payment option on PhonePe Secure Checkout:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>📱</span>
                      <span>PhonePe UPI</span>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>💳</span>
                      <span>Credit / Debit Card</span>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🏦</span>
                      <span>Netbanking</span>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>⚡</span>
                      <span>GPay, Paytm, CRED</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSimulatePayment}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #5f259f 0%, #7c3aed 100%)',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontFamily: 'Orbitron, sans-serif',
                      boxShadow: '0 4px 20px rgba(95, 37, 159, 0.5)',
                      letterSpacing: '0.6px',
                    }}
                  >
                    CONTINUE WITH PHONEPE (₹{selectedPackage.priceInr}) ▶
                  </button>
                </div>
              )}

              {/* TAB 2: PHONEPE UPI QR CODE */}
              {instrumentType === 'UPI_QR' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      padding: '14px',
                      borderRadius: '16px',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(95, 37, 159, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="200" height="200" fill="white" />
                      {/* Corner markers */}
                      <rect x="15" y="15" width="50" height="50" rx="6" fill="#180d38" />
                      <rect x="23" y="23" width="34" height="34" rx="4" fill="white" />
                      <rect x="31" y="31" width="18" height="18" rx="2" fill="#5f259f" />

                      <rect x="135" y="15" width="50" height="50" rx="6" fill="#180d38" />
                      <rect x="143" y="23" width="34" height="34" rx="4" fill="white" />
                      <rect x="151" y="31" width="18" height="18" rx="2" fill="#5f259f" />

                      <rect x="15" y="135" width="50" height="50" rx="6" fill="#180d38" />
                      <rect x="23" y="143" width="34" height="34" rx="4" fill="white" />
                      <rect x="31" y="151" width="18" height="18" rx="2" fill="#5f259f" />

                      {/* Matrix dots */}
                      <rect x="75" y="20" width="12" height="20" fill="#180d38" />
                      <rect x="95" y="15" width="15" height="12" fill="#180d38" />
                      <rect x="115" y="25" width="12" height="15" fill="#180d38" />
                      <rect x="75" y="50" width="20" height="15" fill="#180d38" />
                      <rect x="105" y="45" width="22" height="12" fill="#180d38" />

                      {/* PhonePe Center Badge */}
                      <circle cx="100" cy="100" r="24" fill="#180d38" />
                      <circle cx="100" cy="100" r="20" fill="#5f259f" />
                      <text x="100" y="106" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="sans-serif">
                        पे
                      </text>

                      {/* Lower patterns */}
                      <rect x="75" y="130" width="12" height="12" fill="#180d38" />
                      <rect x="95" y="135" width="20" height="10" fill="#180d38" />
                      <rect x="125" y="125" width="12" height="25" fill="#180d38" />
                      <rect x="75" y="160" width="20" height="15" fill="#180d38" />
                      <rect x="105" y="155" width="25" height="15" fill="#180d38" />
                      <rect x="140" y="160" width="18" height="18" fill="#180d38" />
                    </svg>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#5f259f', marginTop: '6px', fontFamily: 'Orbitron, sans-serif' }}>
                      SCAN WITH PHONEPE OR ANY UPI APP
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      onClick={copyVpa}
                      className="arcade-btn arcade-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      UPI ID: {phonepeVpa} {copiedVpa ? '✓ COPIED' : '📋 COPY'}
                    </button>
                    <button
                      onClick={copyAmount}
                      className="arcade-btn arcade-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      AMOUNT: ₹{selectedPackage.priceInr} {copiedAmount ? '✓ COPIED' : '📋 COPY'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: PHONEPE DIRECT APP INTENT */}
              {instrumentType === 'UPI_INTENT' && (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#cbd5e1' }}>
                    Tap below to launch the PhonePe application on your mobile device:
                  </p>
                  <a
                    href={upiIntentString}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #5f259f 0%, #7c3aed 100%)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontWeight: 900,
                      fontSize: '13px',
                      fontFamily: 'Orbitron, sans-serif',
                      display: 'block',
                      boxShadow: '0 4px 20px rgba(95, 37, 159, 0.5)',
                    }}
                  >
                    OPEN PHONEPE APP (₹{selectedPackage.priceInr}) ▶
                  </a>
                </div>
              )}

              {/* Developer Fast-Simulate Button */}
              <button
                onClick={handleSimulatePayment}
                className="arcade-btn arcade-btn-magenta"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '11px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                }}
              >
                ⚡ [PHONEPE SANDBOX TEST] SIMULATE INSTANT SUCCESSFUL PAYMENT
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
