import React, { useEffect, useState } from 'react';
import { useGameRoomStore, DEFAULT_HOUSE_RULES, useGameRoomStore as _useGameRoomStore } from '../gameRoomStore';
import { useHubStore } from '../hubStore';
import { soundFx } from '../soundEffects';
import { trackEvent } from '../posthog';
import { useGameStore } from '../store';
import { colyseusConnection } from '../colyseusClient';

interface GameRoomLobbyProps {
  gameId: string;
  gameTitle: string;
  gameIcon: string;
  minPlayers?: number;
  maxPlayers?: number;
  bannerGradient?: string;
  onStart: () => void;
}

export const GameRoomLobby: React.FC<GameRoomLobbyProps> = ({
  gameId,
  gameTitle,
  gameIcon,
  minPlayers = 2,
  maxPlayers = 8,
  onStart,
}) => {
  const { setView, setShowPublicRoomsModal } = useHubStore();
  const {
    getOrCreateRoom,
    toggleAllowBots,
    addPlayer,
    removePlayer,
    generateNewRoomCode,
    setHouseRules,
    setIsPrivate,
  } = useGameRoomStore();

  const room = getOrCreateRoom(gameId, 'You (Host)', maxPlayers, minPlayers);
  const houseRules = room.houseRules || DEFAULT_HOUSE_RULES;

  const gameStore = useGameStore();
  const isOnlineMode = gameStore.gameMode === 'online';
  const isConnecting = gameStore.isConnecting;
  const roomSessionToken = (colyseusConnection as any).getSessionToken?.() ?? null;
  const [showHouseRules, setShowHouseRules] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    soundFx.playClick();
    const inviteUrl = `${window.location.origin}/#room=${room.roomCode}&game=${gameId}`;
    navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = () => {
    if (!newPlayerName.trim()) return;
    soundFx.playClick();
    addPlayer(gameId, newPlayerName.trim(), false);
    setNewPlayerName('');
  };

  const handleAddBot = () => {
    soundFx.playClick();
    addPlayer(gameId, '', true);
  };

  const canStart = room.allowBots || room.players.length >= room.minPlayers;
  const emptySlotsCount = Math.max(0, room.minPlayers - room.players.length);

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '16px 12px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* 1. Navigation Breadcrumb Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              soundFx.playClick();
              setView('dashboard');
            }}
            className="arcade-btn arcade-btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>◀</span>
            <span>CYBER ARCADE HUB</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setShowPublicRoomsModal(true);
            }}
            className="arcade-btn arcade-btn-cyan"
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🌐</span>
            <span>ALL ROOMS BROWSER</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="neon-pill neon-pill-cyan"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            <span className="live-beacon" />
            BATTLE LOUNGE ONLINE
          </span>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 800,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {room.minPlayers}–{room.maxPlayers} PODS
          </span>
        </div>
      </div>

      {/* 2. Hero Cyber Terminal Invitation Card */}
      <div
        className="cyber-panel"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, rgba(16, 24, 46, 0.95) 0%, rgba(9, 13, 24, 0.98) 100%)',
          border: '1.5px solid rgba(0, 240, 255, 0.35)',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 240, 255, 0.15)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: '24px',
          alignItems: 'center',
          overflow: 'hidden',
          borderRadius: '24px',
        }}
      >
        <div className="marquee-glow-top" />

        {/* Left: Game Title and Instructions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(255, 0, 119, 0.15) 100%)',
              border: '1.5px solid rgba(0, 240, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              flexShrink: 0,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 240, 255, 0.25)',
            }}
          >
            {gameIcon}
          </div>

          <div style={{ minWidth: 0 }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 900,
                color: '#00f0ff',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                fontFamily: 'Orbitron, sans-serif',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              ★ ARENA MATCHMAKING TERMINAL ★
            </span>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(26px, 3.8vw, 36px)',
                fontWeight: 900,
                color: '#ffffff',
                fontFamily: 'Space Grotesk, sans-serif',
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
              }}
            >
              {gameTitle}
            </h1>
            <p
              style={{
                margin: '6px 0 0 0',
                fontSize: '14px',
                color: '#94a3b8',
                lineHeight: 1.4,
              }}
            >
              Lock in your operator slot. Broadcast your 6-digit access key to associates or deploy autonomous AI tactical combatants.
            </p>
          </div>
        </div>

        {/* Right: Neon Room Key Hologram */}
        <div
          style={{
            background: 'rgba(6, 9, 18, 0.95)',
            border: '1.5px solid rgba(0, 240, 255, 0.4)',
            borderRadius: '18px',
            padding: '16px 22px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '200px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(0, 240, 255, 0.1)',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 900,
              letterSpacing: '1.4px',
              color: '#94a3b8',
              textTransform: 'uppercase',
              fontFamily: 'Orbitron, sans-serif',
            }}
          >
            ROOM ACCESS KEY
          </span>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '4px',
              color: '#00f0ff',
              textShadow: '0 0 20px rgba(0, 240, 255, 0.6)',
              userSelect: 'all',
            }}
          >
            {room.roomCode}
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <button
              onClick={handleCopyInvite}
              className="arcade-btn"
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                borderRadius: '8px',
                background: copied ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 240, 255, 0.15)',
                border: copied ? '1px solid #00ff88' : '1px solid rgba(0, 240, 255, 0.4)',
                color: copied ? '#00ff88' : '#00f0ff',
              }}
            >
              {copied ? '✓ COPIED' : '📋 COPY KEY'}
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                generateNewRoomCode(gameId);
              }}
              className="arcade-btn arcade-btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px' }}
              title="Generate new access key"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* 3. Match Config & Operator Pods */}
      <div
        className="cyber-panel"
        style={{
          padding: '26px 30px',
          background: 'rgba(12, 17, 32, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Automated AI Switch */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'rgba(7, 10, 20, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff', fontFamily: 'Space Grotesk, sans-serif' }}>
                AI COMBATANT FILLING
              </span>
              <span
                className={`neon-pill ${room.allowBots ? 'neon-pill-green' : 'neon-pill-magenta'}`}
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {room.allowBots ? 'ACTIVE' : 'PRIVATE ONLY'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
              {room.allowBots
                ? 'Vacant chairs will be automatically filled with tactical AI players upon match start.'
                : 'Only invited human guests with your room key may enter the arena.'}
            </p>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              toggleAllowBots(gameId);
            }}
            className={`arcade-btn ${room.allowBots ? 'arcade-btn-secondary' : 'arcade-btn-cyan'}`}
            style={{ padding: '10px 18px', fontSize: '12px' }}
          >
            {room.allowBots ? '🤖 DISABLE AI BOTS' : '🤖 ENABLE AI BOTS'}
          </button>
        </div>

        {/* 3b. Custom House Rules & Arena Config */}
        <div
          style={{
            borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(10, 16, 32, 0.95) 0%, rgba(6, 10, 22, 0.98) 100%)',
            border: '1.5px solid rgba(0, 240, 255, 0.3)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 240, 255, 0.05)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => {
              soundFx.playClick();
              setShowHouseRules(!showHouseRules);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(255, 0, 119, 0.2))',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                ⚙️
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 900,
                      color: '#ffffff',
                      fontFamily: 'Space Grotesk, sans-serif',
                      letterSpacing: '-0.2px',
                    }}
                  >
                    TYCOON HOUSE RULES & ARENA CONFIG
                  </span>
                  <span className="neon-pill neon-pill-gold" style={{ fontSize: '10px' }}>
                    CUSTOMIZABLE
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Configure starting bankroll, payday bonuses, turn timer, and vacation jackpot rules.
                </p>
              </div>
            </div>

            <button
              className="arcade-btn arcade-btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              {showHouseRules ? '▲ COLLAPSE' : '▼ EXPAND RULES'}
            </button>
          </div>

          {showHouseRules && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Row 1: Arena Visibility & Turn Clock */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* Room Visibility */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#e2e8f0' }}>
                      ARENA DIRECTORY VISIBILITY
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        color: room.isPrivate ? '#f43f5e' : '#00ff88',
                      }}
                    >
                      {room.isPrivate ? '🔒 PRIVATE ONLY' : '🌐 PUBLIC ARENA'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setIsPrivate(gameId, false);
                      }}
                      className={`arcade-btn ${!room.isPrivate ? 'arcade-btn-green' : 'arcade-btn-secondary'}`}
                      style={{ flex: 1, padding: '7px 10px', fontSize: '11px' }}
                    >
                      🌐 Public (All Rooms)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setIsPrivate(gameId, true);
                      }}
                      className={`arcade-btn ${room.isPrivate ? 'arcade-btn-primary' : 'arcade-btn-secondary'}`}
                      style={{ flex: 1, padding: '7px 10px', fontSize: '11px' }}
                    >
                      🔒 Private (Key Only)
                    </button>
                  </div>
                </div>

                {/* Turn Clock */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#e2e8f0' }}>
                      TURN CLOCK LIMIT
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#00f0ff', fontFamily: 'JetBrains Mono, monospace' }}>
                      {houseRules.turnTimerSec ? `${houseRules.turnTimerSec}s PER TURN` : 'UNLIMITED'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[15, 30, 45, 60, null].map((sec) => (
                      <button
                        key={String(sec)}
                        type="button"
                        onClick={() => {
                          soundFx.playClick();
                          setHouseRules(gameId, { turnTimerSec: sec });
                        }}
                        className={`arcade-btn ${houseRules.turnTimerSec === sec ? 'arcade-btn-cyan' : 'arcade-btn-secondary'}`}
                        style={{ flex: 1, padding: '6px 4px', fontSize: '11px' }}
                      >
                        {sec ? `${sec}s` : '∞'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Starting Cash & Payday Amount */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* Starting Cash */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#e2e8f0' }}>
                      STARTING CAPITAL
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#ffb703', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${houseRules.startingCash.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1000, 1500, 2000, 2500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          soundFx.playClick();
                          setHouseRules(gameId, { startingCash: amt });
                        }}
                        className={`arcade-btn ${houseRules.startingCash === amt ? 'arcade-btn-gold' : 'arcade-btn-secondary'}`}
                        style={{ flex: 1, padding: '6px 4px', fontSize: '11px' }}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payday Salary */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#e2e8f0' }}>
                      SALARY ON GO (PAYDAY)
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#00ff88', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${houseRules.paydayAmount}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[100, 200, 300, 400].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          soundFx.playClick();
                          setHouseRules(gameId, { paydayAmount: amt });
                        }}
                        className={`arcade-btn ${houseRules.paydayAmount === amt ? 'arcade-btn-green' : 'arcade-btn-secondary'}`}
                        style={{ flex: 1, padding: '6px 4px', fontSize: '11px' }}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Signature Gameplay Mechanics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '10px',
                }}
              >
                {/* Double Salary on GO */}
                <div
                  onClick={() => {
                    soundFx.playClick();
                    setHouseRules(gameId, { doubleGoBonus: !houseRules.doubleGoBonus });
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: houseRules.doubleGoBonus ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: houseRules.doubleGoBonus ? '1px solid rgba(0, 255, 136, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#ffffff' }}>
                      🎯 DOUBLE GO BONUS
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: houseRules.doubleGoBonus ? '#00ff88' : '#64748b' }}>
                      {houseRules.doubleGoBonus ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                    Land directly on GO to collect 2× salary (${houseRules.paydayAmount * 2})
                  </span>
                </div>

                {/* Vacation Jackpot */}
                <div
                  onClick={() => {
                    soundFx.playClick();
                    setHouseRules(gameId, { vacationCash: !houseRules.vacationCash });
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: houseRules.vacationCash ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: houseRules.vacationCash ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#ffffff' }}>
                      🌴 VACATION JACKPOT
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: houseRules.vacationCash ? '#00f0ff' : '#64748b' }}>
                      {houseRules.vacationCash ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                    All tax & fine money pools on Vacation tile 20 for whoever lands on it
                  </span>
                </div>

                {/* Auction on Decline */}
                <div
                  onClick={() => {
                    soundFx.playClick();
                    setHouseRules(gameId, { auctionOnDecline: !houseRules.auctionOnDecline });
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: houseRules.auctionOnDecline ? 'rgba(255, 0, 119, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: houseRules.auctionOnDecline ? '1px solid rgba(255, 0, 119, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#ffffff' }}>
                      🔨 AUCTION ON DECLINE
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: houseRules.auctionOnDecline ? '#ff0077' : '#64748b' }}>
                      {houseRules.auctionOnDecline ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                    When a player passes on unbought land, it enters live auction
                  </span>
                </div>

                {/* Even Building Rule */}
                <div
                  onClick={() => {
                    soundFx.playClick();
                    setHouseRules(gameId, { evenBuild: !houseRules.evenBuild });
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: houseRules.evenBuild ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: houseRules.evenBuild ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#ffffff' }}>
                      🏗️ EVEN BUILDING
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: houseRules.evenBuild ? '#a855f7' : '#64748b' }}>
                      {houseRules.evenBuild ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                    Must build houses and towers evenly across properties in a color set
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Operator Pods Header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff', fontFamily: 'Space Grotesk, sans-serif' }}>
                SEATED COMBATANTS
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#00f0ff',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 800,
                }}
              >
                ({room.players.length} / {room.maxPlayers})
              </span>
            </div>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: canStart ? '#00ff88' : '#ff0077',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: canStart ? '#00ff88' : '#ff0077',
                  boxShadow: `0 0 10px ${canStart ? '#00ff88' : '#ff0077'}`,
                }}
              />        {canStart
                ? 'TABLE QUORUM READY TO LAUNCH'
                : `AWAITING ${emptySlotsCount} MORE COMBATANT(S)`}
          </span>

          {isOnlineMode && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: isConnecting
                  ? 'rgba(251, 191, 36, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
                opacity: isOnlineMode ? 1 : 0,
                pointerEvents: isOnlineMode ? 'auto' : 'none',
                border: '1px solid',
                borderColor: isConnecting
                  ? 'rgba(251, 191, 36, 0.4)'
                  : 'rgba(16, 185, 129, 0.4)',
              }}
            >
              {isConnecting ? (
                <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 700 }}>
                  ⚡ Reconnecting to session...
                </span>
              ) : (
                <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 700 }}>
                  Connected to live room session
                  {roomSessionToken ? ` (token ${String(roomSessionToken).slice(0, 8)}...)` : ''}
                </span>
              )}
            </div>
          )}
        </div>

          {/* Pods Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            {room.players.map((p, idx) => (
              <div
                key={p.id}
                className="cyber-card"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  border: p.isHost
                    ? '1.5px solid rgba(255, 183, 3, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: p.isHost
                    ? 'linear-gradient(135deg, rgba(35, 25, 15, 0.7) 0%, rgba(18, 25, 44, 0.85) 100%)'
                    : 'rgba(15, 22, 38, 0.7)',
                  boxShadow: p.isHost ? '0 0 20px rgba(255, 183, 3, 0.2)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: p.color || '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {p.avatar || '🎮'}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '11px', color: p.isHost ? '#00f0ff' : '#94a3b8', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                      {p.isHost ? '★ ROOM HOST' : p.isBot ? '● AUTONOMOUS AI' : '● GUEST'}
                    </div>
                  </div>
                </div>

                {!p.isHost && (
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      removePlayer(gameId, p.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: '4px',
                    }}
                    title="Remove player"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {/* Empty Pod Slots */}
            {Array.from({ length: Math.max(0, room.minPlayers - room.players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  border: '1.5px dashed rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#64748b',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                <span>🪑 VACANT POD {room.players.length + i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add Guest Controls */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
            placeholder="Type player callsign..."
            style={{
              flex: 1,
              minWidth: '200px',
              background: 'rgba(8, 12, 22, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
            }}
          />

          <button
            onClick={handleAddFriend}
            disabled={!newPlayerName.trim() || room.players.length >= room.maxPlayers}
            className="arcade-btn arcade-btn-secondary"
            style={{ padding: '10px 18px', fontSize: '12px' }}
          >
            + ADD GUEST
          </button>

          {room.allowBots && room.players.length < room.maxPlayers && (
            <button
              onClick={handleAddBot}
              className="arcade-btn arcade-btn-cyan"
              style={{ padding: '10px 18px', fontSize: '12px' }}
            >
              + ADD TACTICAL BOT 🤖
            </button>
          )}
        </div>

        {/* Launch Deck Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            {canStart ? (
              <span style={{ color: '#00ff88', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                ● READY TO INITIATE ARENA IN ROOM {room.roomCode}
              </span>
            ) : (
              <span>Invite more guests or enable AI bots to begin.</span>
            )}
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              trackEvent('match_started', {
                gameId,
                roomCode: room.roomCode,
                playersCount: room.players.length,
                allowBots: room.allowBots,
              });
              onStart();
            }}
            disabled={!canStart}
            className="arcade-btn arcade-btn-green"
            style={{
              padding: '16px 44px',
              fontSize: '16px',
              letterSpacing: '1px',
              fontFamily: 'Orbitron, sans-serif',
              opacity: canStart ? 1 : 0.4,
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
          >
            {canStart ? '⚡ INITIATE ARENA MATCH 🚀' : `WAITING FOR QUORUM (${room.players.length}/${room.minPlayers})`}
          </button>
        </div>
      </div>
    </div>
  );
};
