import React, { useEffect } from 'react';
import './designAnimations.css';
import { useGameStore } from './store';
import { Board } from './components/Board';
import { ActionPanel } from './components/ActionPanel';
import { PlayerDashboard } from './components/PlayerDashboard';
import { GameLog } from './components/GameLog';
import { Modals } from './components/Modals';
import { SettingsModal } from './components/SettingsModal';
import { AccountModal } from './components/AccountModal';
import { CustomFriendsModal } from './components/CustomFriendsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { StoreModal } from './components/StoreModal';
import { Dashboard } from './components/Dashboard';
import { useUserStore } from './userStore';
import { useHubStore } from './hubStore';
import { AVAILABLE_BOARDS } from './boardData';

// Mini Games
import { UnoGame } from './games/UnoGame';
import { LudoGame } from './games/LudoGame';
import { SnakesLaddersGame } from './games/SnakesLaddersGame';
import { ImposterGame } from './games/ImposterGame';
import { TraitorsGame } from './games/TraitorsGame';
import { SequenceGame } from './games/SequenceGame';
import { WordGame } from './games/WordGame';
import { TambolaGame } from './games/TambolaGame';
import { BingoGame } from './games/BingoGame';
import { CornerstoneGame } from './games/CornerstoneGame';
import { HowToPlayModal } from './components/HowToPlayModal';
import { DailyRewardModal } from './components/DailyRewardModal';
import { VictoryCelebrationModal } from './components/VictoryCelebrationModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { PublicRoomsModal } from './components/PublicRoomsModal';
import { ChatDrawer } from './components/ChatDrawer';
import { YoupiCheckoutModal } from './components/YoupiCheckoutModal';
import { useTrophyStore } from './trophyStore';
import { soundFx } from './soundEffects';
import { GameErrorBoundary } from './components/GameErrorBoundary';


export function App() {
  const [showSettings, setShowSettings] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(() => soundFx.getIsMuted());
  const [showOnboarding, setShowOnboarding] = React.useState(() => {
    try {
      return !localStorage.getItem('cornerstone_onboarded');
    } catch (e) {
      return false;
    }
  });
  const { user, setShowAccountModal, updateUsername, updateAvatar } = useUserStore();
  const { activeGame, view, setView } = useHubStore();
  const {
    gameState,
    gameMode,
    roomCode,
    myPlayerId,
    disconnect,
    initLocalGame,
    clearError,
    errorMessage,
    boardKey,
    setBoardKey,
  } = useGameStore();

  // Initialize default game or parse incoming friend invite link (#room=CODE&game=ID)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      try {
        const hash = window.location.hash.replace(/^#/, '');
        const params = new URLSearchParams(hash);
        const inviteRoom = params.get('room');
        const inviteGame = params.get('game') as any;

        if (inviteRoom && inviteGame) {
          // Switch to invited game & room
          useHubStore.getState().setActiveGame(inviteGame);
          const roomState = useGameStore.getState().rooms?.[inviteGame];
          if (roomState) {
            roomState.roomCode = inviteRoom;
            // Add joining user to player list
            useGameStore.getState().addPlayer(inviteGame, user.username || 'Friend', false);
          }
        }        } catch {}
    }

    if (!gameState) {
      initLocalGame(3, 'Player 1', 'Tycoon');
    }
  }, [gameState, initLocalGame]);

  return (
    <div className="cyber-arena-bg">
      {/* 1. Top Global Navigation Header - High-Energy Cyber Marquee Bar */}
      <header
        style={{
          background: 'rgba(9, 13, 26, 0.92)',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          borderBottom: '1.5px solid rgba(0, 240, 255, 0.25)',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 6px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 240, 255, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          minHeight: '60px',
        }}
      >
        {/* Left: Brand & Match Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            onClick={() => {
              soundFx.playClick();
              setView('dashboard');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #00f0ff 0%, #ff0077 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '18px',
                fontFamily: 'Orbitron, sans-serif',
                color: '#ffffff',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.6)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e: any) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={(e: any) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              BT
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '16px',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  color: '#ffffff',
                  lineHeight: 1.1,
                  textShadow: '0 0 12px rgba(0, 240, 255, 0.4)',
                }}
              >
                BUSINESS TYCOONS
              </div>
              <div style={{ fontSize: '11px', color: '#67e8f9', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="live-beacon" />
                {view === 'dashboard' ? 'CYBER ARCADE ARENA' : `PLAYING: ${activeGame === 'cornerstone' ? 'MONOPOLY BATTLE' : activeGame.toUpperCase()}`}
              </div>
            </div>
          </div>

          {/* Active Match Pills (Desktop) */}
          {view === 'game' && activeGame === 'cornerstone' && gameState && (
            <div
              className="desktop-header-controls"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: '14px',
                paddingLeft: '16px',
                borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <div
                className="neon-pill neon-pill-magenta"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span>ROUND</span>
                <strong style={{ color: '#ffffff' }}>{gameState.round}</strong>
              </div>

              <div
                className="neon-pill neon-pill-green"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span>{gameMode}</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Header Bar */}
        <div className="mobile-header-bar" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
          <div
            onClick={() => useUserStore.getState().setShowStoreModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              padding: '3px 8px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#fbbf24',
            }}
          >
            <span>🪙</span>
            <span>{user.coins}</span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: mobileMenuOpen ? '#7c3aed' : 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: '14px',
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Right: Unified High-Energy Cyber Action Cluster (Desktop) */}
        <div
          className="desktop-header-controls"
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          {/* Hub / Game Toggle Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              setView(view === 'dashboard' ? 'game' : 'dashboard');
            }}
            className={`arcade-btn ${view === 'dashboard' ? 'arcade-btn-primary' : 'arcade-btn-cyan'}`}
            style={{
              padding: '8px 18px',
              fontSize: '12px',
              letterSpacing: '0.8px',
            }}
          >
            <span>{view === 'dashboard' ? '🎮 RETURN TO ARENA' : '🕹️ CYBER ARCADE'}</span>
          </button>

          {/* Coins Counter */}
          <div
            onClick={() => {
              soundFx.playClick();
              useUserStore.getState().setShowStoreModal(true);
            }}
            className="neon-pill neon-pill-gold"
            style={{
              cursor: 'pointer',
              padding: '6px 14px',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
              transition: 'all 0.15s ease',
            }}
            title="Click to open Cyber Store"
          >
            <span>🪙</span>
            <span>{user.coins} BULLION</span>
          </div>

          {/* Daily Streak Reward */}
          <button
            onClick={() => {
              soundFx.playClick();
              useUserStore.getState().setShowDailyModal(true);
            }}
            className="arcade-btn arcade-btn-secondary"
            style={{
              padding: '7px 12px',
              fontSize: '11px',
              borderColor: 'rgba(255, 183, 3, 0.4)',
              color: '#fde047',
            }}
          >
            <span>🎁</span>
            <span>DAILY</span>
          </button>

          {/* Rules Guide Modal */}
          <button
            onClick={() => {
              soundFx.playClick();
              useUserStore.getState().openRulesModal(activeGame);
            }}
            className="btn-tactile-secondary"
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="How to Play"
          >
            <span>❓</span>
            <span>Rules</span>
          </button>

          {/* Hall of Fame / Trophy */}
          <button
            onClick={() => {
              soundFx.playClick();
              useTrophyStore.getState().setShowLeaderboardModal(true);
            }}
            className="btn-tactile-secondary"
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Trophy Hall & Leaderboard"
          >
            <span>🏆</span>
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={() => {
              const next = soundFx.toggleMute();
              setIsMuted(next);
              if (!next) soundFx.playClick();
            }}
            className="btn-tactile-secondary"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
            }}
            title={isMuted ? 'Unmute Sounds' : 'Mute Sounds'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Settings */}
          <button
            onClick={() => {
              soundFx.playClick();
              setShowSettings(true);
            }}
            className="btn-tactile-secondary"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
            }}
            title="Settings & Board Selection"
          >
            ⚙️
          </button>

          {/* Account Option */}
          <button
            onClick={() => {
              soundFx.playClick();
              setShowAccountModal(true);
            }}
            className="arcade-btn arcade-btn-secondary"
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: user.isVip ? '1.5px solid #f59e0b' : '1.5px solid rgba(0, 240, 255, 0.4)',
              background: user.isVip ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 240, 255, 0.08)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontFamily: 'Orbitron, sans-serif',
              letterSpacing: '0.4px',
            }}
            title="Open Player Account, Bullion Vault & YouPI Gateway"
          >
            <span style={{ fontSize: '13px' }}>👤</span>
            <span>ACCOUNT</span>
            <span
              style={{
                fontSize: '10px',
                color: user.isVip ? '#f59e0b' : '#38bdf8',
                fontFamily: 'JetBrains Mono, monospace',
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }}
            >
              {user.username}
            </span>
          </button>
        </div>

        {/* Mobile Menu Drawer (Toggled by hamburger on mobile) */}
        {mobileMenuOpen && (
          <div
            className="mobile-menu-drawer"
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '14px',
              backgroundColor: 'rgba(22, 17, 39, 0.98)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase' }}>
                Game Options & Controls
              </span>
              <button
                onClick={() => {
                  const muted = soundFx.toggleMute();
                  setIsMuted(muted);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  border: isMuted ? '1px solid #ef4444' : '1px solid #10b981',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {isMuted ? '🔇 Audio Muted' : '🔊 Audio On'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => {
                  setView(view === 'dashboard' ? 'game' : 'dashboard');
                  setMobileMenuOpen(false);
                }}
                style={{
                  padding: '9px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {view === 'dashboard' ? '▶ Return to Game' : '🎮 Arcade Hub'}
              </button>

              <button
                onClick={() => {
                  setShowSettings(true);
                  setMobileMenuOpen(false);
                }}
                style={{
                  padding: '9px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⚙️ Match Settings
              </button>
            </div>

            {view === 'game' && activeGame === 'cornerstone' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Select Board Map:</span>
                  <select
                    value={boardKey}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setBoardKey(e.target.value as string);
                      if (!gameState) {
                        initLocalGame(3, 'Player 1', 'Tycoon');
                      }
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#0f3460',
                      color: '#ffffff',
                      border: '1px solid #243356',
                      fontSize: '11px',
                    }}
                  >
                    {AVAILABLE_BOARDS.map((b) => (
                      <option key={b} value={b}>
                        {b.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => {
                      disconnect();
                      useGameStore.setState({ gameState: null, gameMode: 'online' });
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🌐 Online Room
                  </button>

                  <button
                    onClick={() => {
                      initLocalGame(4, user.username || 'Player 1', 'Tycoon');
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(233, 69, 96, 0.25)',
                      border: '1px solid #e94560',
                      color: '#ff8a9e',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Restart Match
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Settings & Player Configuration Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Account & VIP Pass Modal */}
      <AccountModal />

      {/* YouPI PG V2 Direct UPI Checkout Modal */}
      <YoupiCheckoutModal />

      {/* Onboarding & Anon Persona Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSelectAvatar={(avatar, nick) => {
          updateAvatar(avatar);
          updateUsername(nick);
        }}
      />

      {/* Custom Friends 18+ Configuration Modal */}
      <CustomFriendsModal />

      {/* Global Error Notification */}
      {errorMessage && (
        <div
          style={{
            backgroundColor: '#451a1a',
            borderBottom: '1px solid #ef4444',
            padding: '8px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            color: '#fca5a5',
          }}
        >
          <span>⚠️ {errorMessage}</span>
          <button
            onClick={clearError}
            style={{
              background: 'none',
              border: 'none',
              color: '#fca5a5',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Main Body Display */}
      <main
        style={{
          flex: 1,
          padding: '16px',
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <GameErrorBoundary>
          {view === 'dashboard' ? (
            <Dashboard />
          ) : activeGame === 'uno' ? (
            <UnoGame />
          ) : activeGame === 'ludo' ? (
            <LudoGame />
          ) : activeGame === 'snakes' ? (
            <SnakesLaddersGame />
          ) : activeGame === 'imposter' ? (
            <ImposterGame />
          ) : activeGame === 'traitors' ? (
            <TraitorsGame />
          ) : activeGame === 'sequence' ? (
            <SequenceGame />
          ) : activeGame === 'wordgame' ? (
            <WordGame />
          ) : activeGame === 'tambola' ? (
            <TambolaGame />
          ) : activeGame === 'bingo' ? (
            <BingoGame />
          ) : (
            <CornerstoneGame />
          )}
        </GameErrorBoundary>
      </main>


      {/* Universal 1-Minute How to Play Guide Modal */}
      <HowToPlayModal />

      {/* Daily Streak Chest & Free Coins Modal */}
      <DailyRewardModal />

      {/* Universal Victory Celebration & Confetti Shower Podium */}
      <VictoryCelebrationModal />

      {/* Global Hall of Fame & Trophy Room Modal */}
      <LeaderboardModal />

      {/* Global In-App Store & Customization Modal */}
      <StoreModal />

      {/* Global Public Rooms Directory Browser */}
      <PublicRoomsModal />

      {/* Global In-Game Chat Drawer & Tactical Comms */}
      <ChatDrawer />
    </div>
  );
}

export default App;
