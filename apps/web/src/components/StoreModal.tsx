import React, { useState } from 'react';
import { useUserStore } from '../userStore';
import { soundFx } from '../soundEffects';

interface StoreItem {
  id: string;
  name: string;
  type: 'sound' | 'celebration' | 'peg' | 'board' | 'coins';
  category: string;
  price: number;
  currency: 'coins' | 'usd';
  icon: string;
  description: string;
  badge?: string;
  popular?: boolean;
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
      price: 300,
      currency: 'coins',
      icon: '🎰',
      description: 'Golden slot machine tumbles, high roller chip shuffles & roulette bells.',
      popular: true,
    },
    {
      id: 'retro8bit',
      name: '8-Bit Retro Arcade',
      type: 'sound',
      category: 'Audio Pack',
      price: 250,
      currency: 'coins',
      icon: '🕹️',
      description: 'Nostalgic chiptune bleeps, jump sounds, and retro victory fanfares.',
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

  const COIN_PACKS = [
    { id: 'coins_500', coins: 500, priceUsd: 0.99, priceInr: 89, icon: '🪙', label: 'Handful of Coins', bonus: '' },
    { id: 'coins_2500', coins: 2500, priceUsd: 3.99, priceInr: 349, icon: '💰', label: 'Bag of Gold', bonus: '+25% Extra', popular: true },
    { id: 'coins_7500', coins: 7500, priceUsd: 9.99, priceInr: 899, icon: '💎', label: 'Tycoon Vault', bonus: '+50% Extra', badge: 'Best Value' },
  ];

  const handleBuyItem = (item: StoreItem) => {
    const isUnlocked =
      item.type === 'sound'
        ? user.unlockedSoundPacks?.includes(item.id)
        : item.type === 'celebration'
        ? user.unlockedCelebrations?.includes(item.id)
        : user.unlockedPegs?.includes(item.id);

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
      }
      return;
    }

    if (user.coins < item.price) {
      showNotification(`Not enough coins! You need ${item.price - user.coins} more.`);
      return;
    }

    const success = unlockItem(item.type, item.id, item.price);
    if (success) {
      soundFx.playCashRegister();
      if (item.type === 'sound') setActiveSoundPack(item.id);
      if (item.type === 'celebration') setActiveCelebration(item.id);
      showNotification(`Unlocked & equipped ${item.name}!`);
    }
  };

  const handleBuyCoinPack = (pack: typeof COIN_PACKS[0]) => {
    soundFx.playCashRegister();
    addCoins(pack.coins);
    showNotification(`Added +${pack.coins} Coins to your account!`);
  };

  const showNotification = (msg: string) => {
    setPurchaseSuccessMsg(msg);
    setTimeout(() => setPurchaseSuccessMsg(''), 3000);
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
        onClick={(e) => e.stopPropagation()}
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
            padding: '12px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          {[
            { id: 'cosmetics', label: 'Tokens & FX', icon: '✨' },
            { id: 'audio', label: 'Audio Packs', icon: '🎵' },
            { id: 'coins', label: 'Buy Coins', icon: '🪙' },
            { id: 'pass', label: 'VIP Pass', icon: '⭐' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. COSMETICS TAB */}
          {activeTab === 'cosmetics' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {STORE_ITEMS.filter((i) => i.type === 'peg' || i.type === 'celebration').map((item) => {
                const isUnlocked =
                  item.type === 'celebration'
                    ? user.unlockedCelebrations?.includes(item.id)
                    : user.unlockedPegs?.includes(item.id);
                const isEquipped =
                  item.type === 'celebration'
                    ? user.activeCelebration === item.id
                    : user.unlockedPegs?.includes(item.id);

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: isEquipped ? '1.5px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '18px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      position: 'relative',
                    }}
                  >
                    {item.popular && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          fontSize: '10px',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Popular
                      </span>
                    )}

                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '26px',
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#ffffff' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.category}</div>
                      </div>
                    </div>

                    <p style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                      {item.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontWeight: 900, color: '#34d399', fontSize: '14px' }}>
                        🪙 {item.price} Coins
                      </div>

                      <button
                        onClick={() => handleBuyItem(item)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          border: 'none',
                          background: isEquipped
                            ? '#10b981'
                            : isUnlocked
                            ? 'rgba(255, 255, 255, 0.15)'
                            : 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {isEquipped ? '✓ Equipped' : isUnlocked ? 'Equip' : 'Unlock'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. AUDIO TAB */}
          {activeTab === 'audio' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {STORE_ITEMS.filter((i) => i.type === 'sound').map((item) => {
                const isUnlocked = user.unlockedSoundPacks?.includes(item.id);
                const isEquipped = user.activeSoundPack === item.id;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: isEquipped ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '18px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '26px',
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#ffffff' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Synthesized Sound Pack</div>
                      </div>
                    </div>

                    <p style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                      {item.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontWeight: 900, color: '#34d399', fontSize: '14px' }}>
                        🪙 {item.price} Coins
                      </div>

                      <button
                        onClick={() => handleBuyItem(item)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          border: 'none',
                          background: isEquipped
                            ? '#10b981'
                            : isUnlocked
                            ? 'rgba(255, 255, 255, 0.15)'
                            : 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {isEquipped ? '✓ Active Pack' : isUnlocked ? 'Equip' : 'Unlock'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. COINS TAB */}
          {activeTab === 'coins' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {COIN_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: pack.popular ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    padding: '24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '12px',
                    position: 'relative',
                  }}
                >
                  {pack.badge && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        background: '#ec4899',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {pack.badge}
                    </span>
                  )}

                  <span style={{ fontSize: '42px' }}>{pack.icon}</span>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '18px', color: '#ffffff' }}>
                      {pack.coins.toLocaleString()} Coins
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{pack.label}</div>
                  </div>

                  {pack.bonus && (
                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 800 }}>
                      {pack.bonus}
                    </span>
                  )}

                  <button
                    onClick={() => handleBuyCoinPack(pack)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: pack.popular
                        ? 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '13px',
                      cursor: 'pointer',
                      marginTop: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span>₹{pack.priceInr} / ${pack.priceUsd}</span>
                    <span style={{ fontSize: '10.5px', opacity: 0.85, fontWeight: 700 }}>UPI, Cards & NetBanking</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 4. VIP PASS TAB */}
          {activeTab === 'pass' && (
            <div
              style={{
                background: 'radial-gradient(ellipse at top left, #2e1065 0%, #150827 100%)',
                border: '1.5px solid #f59e0b',
                borderRadius: '24px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 0 50px rgba(245, 158, 11, 0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '40px' }}>👑</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#fbbf24' }}>
                      Tycoons VIP Lifetime Pass
                    </h3>
                    <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                      All-Inclusive access to the entire game suite & future drops
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff' }}>₹399 <span style={{ fontSize: '18px', color: '#94a3b8' }}>($4.99)</span></div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>One-time payment • Lifetime</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                {[
                  '✨ Permanent 100% Ad-Free Experience',
                  '🔞 Exclusive 18+ After Dark Board Unlocked',
                  '👥 Custom Friends Names Board (Rohan, Sneha, etc.)',
                  '🪙 Instant +1,000 Free Coins Welcome Bonus',
                  '🏆 All 8 Premium Animated Tokens (Crown, Diamond, Shark)',
                  '🎙️ Turn-Gated WebRTC Voice Priority Rooms',
                ].map((perk, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#e2e8f0',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    {perk}
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  soundFx.playCashRegister();
                  upgradeToVip();
                  showNotification('VIP Lifetime Pass activated! Welcome to the High Rollers Club!');
                }}
                disabled={user.isVip}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  border: 'none',
                  background: user.isVip
                    ? '#10b981'
                    : 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '16px',
                  cursor: user.isVip ? 'default' : 'pointer',
                  boxShadow: '0 8px 25px rgba(245, 158, 11, 0.4)',
                }}
              >
                {user.isVip ? '✓ You Are Already A VIP Member' : '⭐ Get VIP Lifetime Pass — ₹399 / $4.99'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
