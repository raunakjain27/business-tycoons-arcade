import React, { useEffect } from 'react';
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

export function App() {
  const [showSettings, setShowSettings] = React.useState(false);
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

  // Initialize a default local game on first load if no game is active
  useEffect(() => {
    if (!gameState) {
      initLocalGame(3, 'Player 1', 'Tycoon');
    }
  }, [gameState, initLocalGame]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1a1625 0%, #0f0b1a 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Top Global Navigation Header */}
      <header
        style={{
          background: 'rgba(15, 11, 26, 0.95)',
          backdropFilter: 'blur(12px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          flexWrap: 'wrap',
          gap: '8px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            onClick={() => setView('dashboard')}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '15px',
              color: '#ffffff',
              boxShadow: '0 0 10px #e9456088',
              cursor: 'pointer',
            }}
          >
            BT
          </div>
          <div>
            <h1
              onClick={() => setView('dashboard')}
              style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px', margin: 0, color: '#f8fafc', cursor: 'pointer' }}
            >
              BUSINESS TYCOONS & ARCADE
            </h1>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Board Games & Party Platform</span>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Dashboard / Arcade Hub Toggle Button */}
          <button
            onClick={() => setView(view === 'dashboard' ? 'game' : 'dashboard')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: view === 'dashboard' ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.15)',
              background: view === 'dashboard' ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' : 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: view === 'dashboard' ? '0 0 12px rgba(236,72,153,0.4)' : 'none',
            }}
          >
            <span>🎮</span>
            <span>{view === 'dashboard' ? 'Return to Game' : 'Games Dashboard'}</span>
          </button>

          {view === 'game' && activeGame === 'cornerstone' && (
            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8' }}>
                Mode:{' '}
                <strong style={{ color: gameMode === 'online' ? '#38bdf8' : '#10b981', textTransform: 'uppercase' }}>
                  {gameMode}
                </strong>
              </span>
              {gameState && (
                <>
                  <span style={{ color: '#94a3b8' }}>
                    Round: <strong style={{ color: '#ffffff' }}>{gameState.round}</strong>
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    Phase:{' '}
                    <strong style={{ color: '#e94560', textTransform: 'uppercase' }}>
                      {gameState.phase}
                    </strong>
                  </span>
                </>
              )}
              <span style={{ color: '#94a3b8' }}>
                Board:
                <select
                  value={boardKey}
                  onChange={(e) => {
                    setBoardKey(e.target.value);
                    if (!gameState) {
                      initLocalGame(3, 'Player 1', 'Tycoon');
                    }
                  }}
                  style={{
                    marginLeft: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
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
              </span>
            </div>
          )}

          {/* User Account & Profile */}
          <button
            onClick={() => setShowAccountModal(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: user.isVip ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.25)',
              backgroundColor: user.isVip ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: user.isVip ? '#fbbf24' : '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: user.isVip ? '0 0 15px rgba(245, 158, 11, 0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <span style={{ fontSize: '16px' }}>{user.avatar || '👑'}</span>
            <span>{user.username}</span>
            {user.isVip && (
              <span style={{ fontSize: '10px', background: '#f59e0b', color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>
                VIP
              </span>
            )}
          </button>

          {view === 'game' && activeGame === 'cornerstone' && (
            <>
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => disconnect()}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #243356',
                  backgroundColor: '#0f3460',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Lobby
              </button>
              <button
                onClick={() => initLocalGame(4, user.username || 'My Daddy', 'Tycoon')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#e94560',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Restart
              </button>
            </>
          )}
        </div>
      </header>

      {/* Settings & Player Configuration Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Account & VIP Pass Modal */}
      <AccountModal />

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
          /* Cornerstone Game */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            {gameState ? (
              <>
                {/* Top Row: Board (Left) + Action Panel (Right) */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '20px',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Board */}
                  <div style={{ flex: '1 1 540px', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: '860px' }}>
                      <Board gameState={gameState} />
                    </div>
                  </div>

                  {/* Action Panel */}
                  <div style={{ flex: '0 1 340px', minWidth: 0, width: '100%' }}>
                    <ActionPanel gameState={gameState} />
                  </div>
                </div>

                {/* Middle Row: Player Dashboard */}
                <div>
                  <PlayerDashboard gameState={gameState} />
                </div>

                {/* Bottom Row: Game Log */}
                <div>
                  <GameLog events={gameState.log} />
                </div>

                {/* Modals & Overlays */}
                <Modals gameState={gameState} />
              </>
            ) : (
              <div style={{ maxWidth: '500px', margin: '60px auto', width: '100%' }}>
                <ActionPanel gameState={null} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
