import React, { useState, useEffect } from 'react';
import { useYoupiStore } from '../youpiStore';
import { soundFx } from '../soundEffects';

export const YoupiCheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    selectedPackage,
    activeOrderId,
    utrInput,
    isProcessing,
    paymentStatus,
    errorMessage,
    successDetails,
    merchantVpa,
    merchantName,
    testMode,
    isGatewayOnline,
    closeCheckout,
    setUtrInput,
    submitPaymentVerification,
    checkGatewayHealth,
  } = useYoupiStore();

  const [copiedVpa, setCopiedVpa] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 min session timer

  useEffect(() => {
    if (isCheckoutOpen) {
      checkGatewayHealth();
      setTimerSeconds(300);
      const interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isCheckoutOpen]);

  if (!isCheckoutOpen || !selectedPackage) return null;

  const upiIntentString = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(merchantName)}&am=${selectedPackage.priceInr.toFixed(2)}&cu=INR&tn=${encodeURIComponent(activeOrderId || 'TycoonTopup')}`;

  const copyVpa = () => {
    soundFx.playClick();
    navigator.clipboard.writeText(merchantVpa);
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
    const mockUtr = `UPI${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 899 + 100)}`;
    submitPaymentVerification(mockUtr);
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
        backgroundColor: 'rgba(5, 8, 18, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={closeCheckout}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(135deg, #0b1224 0%, #060a16 100%)',
          borderRadius: '24px',
          border: '1.5px solid rgba(0, 240, 255, 0.4)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 240, 255, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '16px 22px',
            backgroundColor: 'rgba(14, 22, 44, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '14px',
                color: '#000000',
                fontFamily: 'Orbitron, sans-serif',
              }}
            >
              YP
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 900,
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#ffffff',
                    letterSpacing: '0.8px',
                  }}
                >
                  YOUPI PG V2 GATEWAY
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    color: isGatewayOnline ? '#00ff88' : '#fbbf24',
                    border: `1px solid ${isGatewayOnline ? 'rgba(0,255,136,0.3)' : 'rgba(251,191,36,0.3)'}`,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {isGatewayOnline ? '● ENGINE ONLINE' : '● DEV ENGINE'}
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                0% FEES • DIRECT-TO-BANK UPI • ORDER: {activeOrderId}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              closeCheckout();
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
          {paymentStatus === 'success' && successDetails ? (
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
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 255, 136, 0.15)',
                  border: '2px solid #00ff88',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  boxShadow: '0 0 30px rgba(0, 255, 136, 0.5)',
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
                  PAYMENT SETTLED & CONFIRMED!
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Your assets have been credited instantly via YouPI Payment Observation Engine.
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
                  <strong style={{ color: '#ffffff' }}>{successDetails.packName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>BULLION CREDITED:</span>
                  <strong style={{ color: '#fde047' }}>+{successDetails.bullionsAdded} BULLIONS</strong>
                </div>
                {successDetails.coinsAdded > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>BONUS COINS:</span>
                    <strong style={{ color: '#00f0ff' }}>+{successDetails.coinsAdded} COINS</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>ORDER REFERENCE:</span>
                  <span style={{ color: '#38bdf8' }}>{successDetails.orderId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>BANK UTR:</span>
                  <span style={{ color: '#00ff88' }}>{successDetails.utr}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  soundFx.playClick();
                  closeCheckout();
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
                RETURN TO ARENA ▶
              </button>
            </div>
          ) : (
            <>
              {/* Order Amount Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(0, 255, 136, 0.05) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                    CHECKOUT TOTAL
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '26px', fontWeight: 900, color: '#00ff88', fontFamily: 'Orbitron, sans-serif' }}>
                      ₹{selectedPackage.priceInr}
                    </span>
                    <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      ({selectedPackage.name})
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>SESSION EXPIRES IN</span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: timerSeconds < 60 ? '#ff0077' : '#00f0ff',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    ⏱ {formatTimer(timerSeconds)}
                  </span>
                </div>
              </div>

              {/* Dynamic QR Code & Instructions */}
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
                {/* SVG Vector QR Representation */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '14px',
                    borderRadius: '16px',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 240, 255, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Outer frame */}
                    <rect width="200" height="200" fill="white" />
                    {/* Top-Left Position marker */}
                    <rect x="15" y="15" width="50" height="50" rx="6" fill="#0b1224" />
                    <rect x="23" y="23" width="34" height="34" rx="4" fill="white" />
                    <rect x="31" y="31" width="18" height="18" rx="2" fill="#00f0ff" />

                    {/* Top-Right Position marker */}
                    <rect x="135" y="15" width="50" height="50" rx="6" fill="#0b1224" />
                    <rect x="143" y="23" width="34" height="34" rx="4" fill="white" />
                    <rect x="151" y="31" width="18" height="18" rx="2" fill="#00f0ff" />

                    {/* Bottom-Left Position marker */}
                    <rect x="15" y="135" width="50" height="50" rx="6" fill="#0b1224" />
                    <rect x="23" y="143" width="34" height="34" rx="4" fill="white" />
                    <rect x="31" y="151" width="18" height="18" rx="2" fill="#00f0ff" />

                    {/* QR Matrix Pattern Dots */}
                    <rect x="75" y="20" width="10" height="20" fill="#0b1224" />
                    <rect x="95" y="15" width="12" height="12" fill="#0b1224" />
                    <rect x="115" y="25" width="10" height="15" fill="#0b1224" />
                    <rect x="75" y="50" width="18" height="15" fill="#0b1224" />
                    <rect x="105" y="45" width="20" height="12" fill="#0b1224" />

                    {/* Center UPI Badge */}
                    <circle cx="100" cy="100" r="24" fill="#0b1224" />
                    <circle cx="100" cy="100" r="20" fill="#00ff88" />
                    <text x="100" y="105" textAnchor="middle" fill="#000000" fontSize="11" fontWeight="900" fontFamily="sans-serif">
                      UPI
                    </text>

                    {/* Lower dots */}
                    <rect x="75" y="130" width="12" height="12" fill="#0b1224" />
                    <rect x="95" y="135" width="20" height="10" fill="#0b1224" />
                    <rect x="125" y="125" width="12" height="25" fill="#0b1224" />
                    <rect x="75" y="160" width="20" height="15" fill="#0b1224" />
                    <rect x="105" y="155" width="25" height="15" fill="#0b1224" />
                    <rect x="140" y="160" width="18" height="18" fill="#0b1224" />
                  </svg>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#0b1224', marginTop: '6px', fontFamily: 'sans-serif' }}>
                    SCAN WITH ANY UPI APP
                  </span>
                </div>

                {/* Copy VPA & Amount Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    onClick={copyVpa}
                    className="arcade-btn arcade-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    UPI ID: {merchantVpa} {copiedVpa ? '✓ COPIED' : '📋 COPY'}
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

              {/* 1-Tap UPI Intent App Links */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#94a3b8',
                    display: 'block',
                    marginBottom: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  OR TAP DIRECT TO OPEN UPI APP:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <a
                    href={`tez://upi/pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(merchantName)}&am=${selectedPackage.priceInr}&cu=INR`}
                    className="arcade-btn arcade-btn-secondary"
                    style={{
                      padding: '8px 4px',
                      fontSize: '10.5px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                    }}
                  >
                    GPay
                  </a>
                  <a
                    href={`phonepe://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(merchantName)}&am=${selectedPackage.priceInr}&cu=INR`}
                    className="arcade-btn arcade-btn-secondary"
                    style={{
                      padding: '8px 4px',
                      fontSize: '10.5px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                    }}
                  >
                    PhonePe
                  </a>
                  <a
                    href={`paytmmp://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(merchantName)}&am=${selectedPackage.priceInr}&cu=INR`}
                    className="arcade-btn arcade-btn-secondary"
                    style={{
                      padding: '8px 4px',
                      fontSize: '10.5px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                    }}
                  >
                    Paytm
                  </a>
                  <a
                    href={upiIntentString}
                    className="arcade-btn arcade-btn-secondary"
                    style={{
                      padding: '8px 4px',
                      fontSize: '10.5px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                    }}
                  >
                    CRED / BHIM
                  </a>
                </div>
              </div>

              {/* UTR Submission Form */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#f8fafc' }}>
                    STEP 2: ENTER 12-DIGIT BANK UTR / REF NO.
                  </span>
                  <span style={{ fontSize: '10px', color: '#00f0ff', fontFamily: 'JetBrains Mono, monospace' }}>
                    INSTANT OBSERVER
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="e.g. 629810482910"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontFamily: 'JetBrains Mono, monospace',
                      outline: 'none',
                    }}
                  />
                  <button
                    disabled={isProcessing}
                    onClick={() => submitPaymentVerification()}
                    className="arcade-btn arcade-btn-cyan"
                    style={{
                      padding: '10px 16px',
                      fontSize: '11.5px',
                      whiteSpace: 'nowrap',
                      borderRadius: '8px',
                      fontFamily: 'Orbitron, sans-serif',
                    }}
                  >
                    {isProcessing ? 'VERIFYING...' : 'VERIFY ▶'}
                  </button>
                </div>

                {errorMessage && (
                  <div style={{ fontSize: '11px', color: '#ff4444', fontFamily: 'JetBrains Mono, monospace' }}>
                    ✕ {errorMessage}
                  </div>
                )}
              </div>

              {/* Developer Fast-Simulate Button */}
              {testMode && (
                <button
                  disabled={isProcessing}
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
                  ⚡ [DEV / TEST MODE] SIMULATE INSTANT BANK SETTLEMENT
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
