import React, { useState } from 'react';
import { useUserStore } from '../userStore';
import { soundFx } from '../soundEffects';
import { useYoupiStore, PAYMENT_PACKAGES } from '../youpiStore';

interface StoreItem {
  id: string;
  name: string;
  type: 'sound' | 'celebration' | 'peg' | 'board';
  category: string;
  price: number;
  currency: 'coins' | 'usd';
  icon: string;
  description: string;
  badge?: string;
  popular?: boolean;
}

interface CoinPack {
  id: string;
  coins: number;
  priceUsd: number;
  priceInr: number;
  icon: string;
  label: string;
  bonus?: string;
  popular?: boolean;
  badge?: string;
}

export const StoreModal: React.FC = () => {
  const {
    user,
    showStoreModal,
    setShowStoreModal,
    unlockItem,
    addCoins,
    setActiveSoundPack,
    setActiveCelebration,
    upgradeToVip,
  } = useUserStore();

  const [activeTab, setActiveTab] = useState<'cosmetics' | 'audio' | 'coins' | 'pass'>('cosmetics');
  const [purchaseSuccessMsg, setPurchaseSuccessMsg] = useState('');

  if (!showStoreModal) return null;

  const STORE_ITEMS: StoreItem[] = [
    // Sound FX Packs
    {
      id: 'lasvegas',
      name: 'Las Vegas Casino FX',
      type: 'sound',
      category: 'Audio Pack',
      price: 350,
      currency: 'coins',
      icon: '🎰',
      description: 'Neon dings, slot-machine spins, and dealer chatter FX.',
      popular: true,
    },
    {
      id: 'cyberpunk',
      name: 'Cyberpunk 2077 Synth',
      type: 'sound',
      category: 'Audio Pack',
      price: 350,
      currency: 'coins',
      icon: '⚡',
      description: 'Distorted neon synth risers, sub-bass impacts, and holographic hums.',
      badge: 'New',
    },
    // Victory Celebrations
    {
      id: 'fireworks',
      name: 'Midnight Fireworks',
      type: 'celebration',
      category: 'Victory FX',
      price: 250,
      currency: 'coins',
      icon: '🎆',
      description: 'Dazzling explosive sky fireworks when you win any game.',
      popular: true,
    },
    {
      id: 'moneyrain',
      name: 'Cash Rain Shower',
      type: 'celebration',
      category: 'Victory FX',
      price: 400,
      currency: 'coins',
      icon: '💸',
      description: '100-dollar bills raining down from the top of the screen.',
      badge: 'Tycoon Favorite',
    },
    {
      id: 'neonwaves',
      name: 'Neon Laser Vortex',
      type: 'celebration',
      category: 'Victory FX',
      price: 300,
      currency: 'coins',
      icon: '🌈',
      description: 'Pulsing chroma waves and glowing concentric victory rings.',
    },
    // Custom Tokens / Pegs
    {
      id: 'goldentrophy',
      name: 'Golden Champion Trophy',
      type: 'peg',
      category: 'Board Token',
      price: 200,
      currency: 'coins',
      icon: '🏆',
      description: 'Gleaming 24K trophy token for Business Tycoons & Ludo.',
      popular: true,
    },
    {
      id: 'neonstar',
      name: 'Supernova Star Token',
      type: 'peg',
      category: 'Board Token',
      price: 200,
      currency: 'coins',
      icon: '⭐',
      description: 'Luminous pulsing star that leaves radiant trails.',
    },
  ];

  const COIN_PACKS: CoinPack[] = [
    { id: 'coins_500', coins: 500, priceUsd: 0.99, priceInr: 89, icon: '🪙', label: 'Handful of Coins', bonus: '' },
    { id: 'coins_2500', coins: 2500, priceUsd: 3.99, priceInr: 349, icon: '💰', label: 'Bag of Gold', bonus: '+25% Extra', popular: true },
    { id: 'coins_7500', coins: 7500, priceUsd: 9.99, priceInr: 899, icon: '💎', label: 'Tycoon Vault', bonus: '+50% Extra', badge: 'Best Value' },
  ];

  const handleBuyItem = (item: StoreItem) => {
    if (item.type !== 'sound' && item.type !== 'celebration' && item.type !== 'peg' && item.type !== 'board') {
      showNotification(`This ${item.name} item is not yet supported.`);
      return;
    }

    const isUnlocked =
      item.type === 'sound'
        ? user.unlockedSoundPacks?.includes(item.id)
        : item.type === 'celebration'
        ? user.unlockedCelebrations?.includes(item.id)
        : item.type === 'peg'
        ? user.unlockedPegs?.includes(item.id)
        : item.type === 'board'
        ? user.unlockedBoards?.includes(item.id)
        : false;

    if (isUnlocked) {
      // Equip it
      if (item.type === 'sound') {
        setActiveSoundPack(item.id);
        soundFx.playCashRegister();
        showNotification(`Equipped ${item.name}!`);
      } else if (item.type === 'celebration') {
        setActiveCelebration(item.id);
        soundFx.playFanfare();
        showNotification(`Equipped ${item.name}!`);
      } else if (item.type === 'peg') {
        showNotification(`Unlocked & equipped ${item.name}!`);
      } else {
        showNotification(`Board unlocked: ${item.name}!`);
      }
      return;
    }

    if (user.coins < item.price) {
      showNotification(`Not enough coins! You need ${item.price - user.coins} more.`);
      return;
    }

    const success = unlockItem(item.type as 'sound' | 'celebration' | 'peg' | 'board', item.id, item.price);

    if (success) {
      soundFx.playCashRegister();
      if (item.type === 'sound') setActiveSoundPack(item.id);
      if (item.type === 'celebration') setActiveCelebration(item.id);
      if (item.type === 'peg') showNotification(`Unlocked & equipped ${item.name}!`);
      if (item.type === 'board') showNotification(`Board unlocked: ${item.name}!`);
    }
  };

  const [checkoutModal, setCheckoutModal] = useState<{ open: boolean; title: string; inr: number; usd: number; coins?: number; isVip?: boolean } | null>(null);

  const handleBuyCoinPack = (pack: CoinPack) => {
    // Open payment gateway checkout (Razorpay / UPI / Card)
    setCheckoutModal({
      open: true,
      title: `Buy ${pack.coins.toLocaleString()} Coins`,
      inr: pack.priceInr,
      usd: pack.priceUsd,
      coins: pack.coins,
    });
  };

  const handleConfirmPayment = (method: 'upi' | 'card' | 'netbanking') => {
    if (!checkoutModal) return;
    if (method === 'upi') {
      const pkg = PAYMENT_PACKAGES.find((p) => p.priceInr === checkoutModal.inr) || {
        id: `pack_${checkoutModal.inr}`,
        name: checkoutModal.title,
        bullions: checkoutModal.coins ?? 500,
        bonusCoins: 50,
        priceInr: checkoutModal.inr,
        description: `Top-up of ${checkoutModal.coins ?? 500} Bullions`,
      };
      setCheckoutModal(null);
      setShowStoreModal(false);
      useYoupiStore.getState().openCheckout(pkg);
      return;
    }
    soundFx.playCashRegister();
    soundFx.vibrate([40, 40, 80]);
    addCoins(checkoutModal.coins ?? 0);
    showNotification(`Paid ₹${checkoutModal.inr} via ${method.toUpperCase()} — coins added.`);
    setCheckoutModal(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 2, 14, 0.92)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2300,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={() => setShowStoreModal(false)}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #1f113a 0%, #0d061c 100%)',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.95), 0 0 60px rgba(124, 58, 237, 0.35)',
          maxWidth: '740px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          overflow: 'hidden',
        }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>🛍️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>Arcade Store & Customization</h2>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Audio packs, victory celebrations, custom dice & VIP access
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '12px',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#34d399',
                fontWeight: 900,
                fontSize: '14px',
              }}
            >
              <span>🪙</span>
              <span>{user.coins} Coins</span>
            </div>

            <button
              onClick={() => setShowStoreModal(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '24px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Success toast notification */}
        {purchaseSuccessMsg && (
          <div
            style={{
              backgroundColor: '#10b981',
              color: '#064e3b',
              fontWeight: 800,
              fontSize: '13px',
              padding: '10px 24px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            🎉 {purchaseSuccessMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {([
            { key: 'cosmetics', label: '🎨 Cosmetics' },
            { key: 'audio', label: '🔊 Audio' },
            { key: 'coins', label: '🪙 Coins' },
            { key: 'pass', label: '💎 VIP' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: 'none',
                borderRadius: '12px',
                background: activeTab === tab.key ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'rgba(255,255,255,0.04)',
                color: activeTab === tab.key ? '#ffffff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Store Content */}
        <div style={{ overflowY: 'auto', padding: '8px 4px 20px 4px', flex: 1 }}>
          {activeTab === 'audio' && (
            <div>
              <div style={{ padding: '6px 6px 12px 6px', fontWeight: 800, color: '#38bdf8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                🎧 Sound FX Packs
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {STORE_ITEMS.filter((item) => item.type === 'sound').map((item) => (
                  <StoreCard item={item} onBuy={handleBuyItem} owned={false} />
                ))}
              </div>

              <div style={{ padding: '18px 6px 6px 6px', fontWeight: 800, color: '#f472b6', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '18px' }}>
                🎉 Victory Celebrations
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {STORE_ITEMS.filter((item) => item.type === 'celebration').map((item) => (
                  <StoreCard item={item} onBuy={handleBuyItem} owned={false} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cosmetics' && (
            <div>
              <div style={{ padding: '18px 6px 6px 6px', fontWeight: 800, color: '#fbbf24', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                🎲 Custom Tokens / Pegs
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {STORE_ITEMS.filter((item) => item.type === 'peg').map((item) => (
                  <StoreCard item={item} onBuy={handleBuyItem} owned={false} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'coins' && (
            <div>
              <div style={{ padding: '6px 6px 12px 6px', fontWeight: 800, color: '#fcd34d', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                🪙 Buy Coins
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {COIN_PACKS.map((pack) => (
                  <CoinPackCard pack={pack} onBuy={handleBuyCoinPack} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pass' && (
            <div>
              <div style={{ padding: '18px 6px 6px 6px', fontWeight: 800, color: '#a78bfa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                💎 VIP Lifetime Pass
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px' }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(168,85,247,0.12) 100%)',
                    border: '1px solid rgba(168,85,247,0.4)',
                    borderRadius: '20px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '16px' }}>VIP Lifetime Access</div>
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>One-time purchase, no recurring charges</div>
                    </div>
                    <span style={{ fontWeight: 900, color: '#c084fc', fontSize: '18px' }}>₹499</span>
                  </div>
                  <ul style={{ paddingLeft: '18px', color: '#cbd5e1', fontSize: '13px', lineHeight: '1.7' }}>
                    <li>Unlimited coin recharges with 40% extra bonus</li>
                    <li>Unlocks all current & future boards</li>
                    <li>Exclusive VIP lobby background & name color</li>
                    <li>Priority matchmaking + VIP support badge</li>
                  </ul>
                  <button
                    onClick={() => upgradeToVip()}
                    style={{
                      width: '100%',
                      padding: '14px',
                      border: 'none',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: '15px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(124,58,237,0.45)',
                    }}
                  >
                    Upgrade to VIP
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Checkout Modal Overlay */}
        {checkoutModal?.open && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(5, 2, 14, 0.96)',
              borderRadius: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              zIndex: 10,
            }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div
              style={{
                background: 'linear-gradient(180deg, #1b0f33 0%, #0a0418 100%)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '26px',
                padding: '24px',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(59, 130, 246, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              {/* Payment Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px' }}>🛡️</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>SECURE GATEWAY</span>
                </div>
                <button
                  onClick={() => setCheckoutModal(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '24px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>

              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>{checkoutModal.title}</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Choose your payment method to complete purchase.</p>

              <div style={{ display: 'flex', gap: '10px' }}>
                {([
                  { key: 'upi' as const, label: 'UPI', icon: '📲' },
                  { key: 'card' as const, label: 'Card', icon: '💳' },
                  { key: 'netbanking' as const, label: 'Netbanking', icon: '🏦' },
                ] as const).map((method) => (
                  <button
                    key={method.key}
                    onClick={() => handleConfirmPayment(method.key)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '22px' }}>{method.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{method.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>
                🔒 256-Bit SSL Encrypted • Zero card data stored • 100% Secure
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface StoreCardProps {
  item: StoreItem;
  onBuy: (item: StoreItem) => void;
  owned: boolean;
}

const StoreCard: React.FC<StoreCardProps> = ({ item, onBuy, owned }) => {
  return (
    <div
      style={{
        background: owned ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.04)',
        border: owned ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: '18px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '26px' }}>{item.icon}</span>
        {item.popular && (
          <span style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: '#fff', fontWeight: 800, fontSize: '10px', padding: '3px 8px', borderRadius: '8px' }}>
            POPULAR
          </span>
        )}
        {item.badge && (
          <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fcd34d', fontWeight: 700, fontSize: '10px', padding: '3px 8px', borderRadius: '8px' }}>
            {item.badge}
          </span>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 900, fontSize: '14px', marginBottom: '4px' }}>{item.name}</div>
        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>{item.description}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <span style={{ color: '#fcd34d', fontWeight: 900, fontSize: '15px' }}>{item.price.toLocaleString()} 🪙</span>
        <button
          onClick={() => onBuy(item)}
          disabled={owned}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderRadius: '10px',
            background: owned ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '12px',
            cursor: owned ? 'default' : 'pointer',
          }}
        >
          {owned ? 'Owned' : 'Buy Now'}
        </button>
      </div>
    </div>
  );
};

interface CoinPackCardProps {
  pack: CoinPack;
  onBuy: (pack: CoinPack) => void;
}

const CoinPackCard: React.FC<CoinPackCardProps> = ({ pack, onBuy }) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(124,58,237,0.10) 100%)',
        border: '1px solid rgba(251,191,36,0.35)',
        borderRadius: '20px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '28px' }}>{pack.icon}</span>
        {pack.badge && (
          <span style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: '#fff', fontWeight: 800, fontSize: '10px', padding: '3px 8px', borderRadius: '8px' }}>
            BEST
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: '16px' }}>{pack.label}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{pack.coins.toLocaleString()} 🪙 coins</div>
        </div>
        <span style={{ fontWeight: 900, color: '#ffffff', fontSize: '16px' }}>
          ₹{pack.priceInr} <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '12px' }}>/ ${pack.priceUsd}</span>
        </span>
      </div>

      {pack.bonus && (
        <div style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', fontWeight: 800, fontSize: '11px', padding: '4px 8px', borderRadius: '8px', alignSelf: 'flex-start' }}>
          {pack.bonus}
        </div>
      )}

      <button
        onClick={() => onBuy(pack)}
        style={{
          width: '100%',
          padding: '12px',
          border: 'none',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#fff',
          fontWeight: 900,
          fontSize: '13px',
          cursor: 'pointer',
          boxShadow: '0 6px 18px rgba(245,158,11,0.4)',
        }}
      >
        Buy Now
      </button>
    </div>
  );
};

function showNotification(msg: string) {
  console.log('[Store] ', msg);
}
