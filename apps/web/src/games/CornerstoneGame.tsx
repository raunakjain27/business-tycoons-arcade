import React, { useState } from 'react';
import { useGameStore } from '../store';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { Board } from '../components/Board';
import { ActionPanel } from '../components/ActionPanel';
import { PlayerDashboard } from '../components/PlayerDashboard';
import { GameLog } from '../components/GameLog';
import { Modals } from '../components/Modals';
import { useCelebrationStore } from '../celebrationStore';

export const CornerstoneGame: React.FC = () => {
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice } = useVoiceStore();
  const {
    gameState,
    gameMode,
    roomCode,
    initLocalGame,
    connectOnline,
    myPlayerId,
    dispatchAction,
    dismissEventCard,
    turnTimerRemaining,
  } = useGameStore();

  const room = getOrCreateRoom('cornerstone', 'You (Tycoon 👑)', 8, 2);
  const [inLobby, setInLobby] = useState<boolean>(!room.isGameStarted);

  // Sync lobby state when host starts the match across browser tabs
  React.useEffect(() => {
    if (room.isGameStarted && inLobby) {
      setInLobby(false);
    }
  }, [room.isGameStarted, inLobby]);

  React.useEffect(() => {
    if (gameState?.phase === 'gameOver') {
      const activePlayers = gameState.turnOrder.filter((id) => gameState.players[id]?.status === 'active');
      const winnerId = activePlayers[0] || gameState.turnPlayerId;
      const winner = gameState.players[winnerId];
      useCelebrationStore.getState().triggerVictory({
        gameTitle: 'Business Tycoons',
        winnerName: winner?.name || 'Tycoon Champion',
        winnerAvatar: '🎩',
        coinsAwarded: 300,
        xpAwarded: 250,
        reason: `${winner?.name || 'Winner'} achieved global monopoly domination!`,
      });
    }
  }, [gameState?.phase]);


  const startMatchFromRoom = () => {
    // Collect lobby players or generate smart bots
    const participantList = [...room.players];
    while (participantList.length < 4 && room.allowBots) {
      const idx = participantList.length;
      participantList.push({
        id: `bot-${idx}`,
        name: `Tycoon Bot ${idx} 🤖`,
        isBot: true,
        avatar: '🤖',
        isHost: false,
        color: '#f59e0b',
      });
    }

    const matchPlayers = participantList.map((p, idx) => ({
      id: `p${idx + 1}`,
      name: p.name,
      roleId: idx === 0 ? 'Tycoon' : idx === 1 ? 'Broker' : idx === 2 ? 'Strategist' : 'Banker',
      isBot: p.isBot,
      tokenId: p.avatar || 'alien',
    }));

    initLocalGame(
      matchPlayers.length,
      matchPlayers[0]?.name || 'Player 1',
      'Tycoon',
      false,
      1500
    );

    // If online mode is toggled, also connect to the Render Colyseus room
    if (gameMode === 'online') {
      connectOnline(room.roomCode, matchPlayers[0]?.name || 'Player 1', 'Tycoon');
    }

    connectVoice(participantList.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    setInLobby(false);
    room.isGameStarted = true;
  };


  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="cornerstone"
        gameTitle="Business Tycoons"
        gameIcon="🏙️"
        minPlayers={2}
        maxPlayers={8}
        bannerGradient="linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)"
        onStart={startMatchFromRoom}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Live Voice Bar */}
      <VoiceRoomBar gameTitle="Business Tycoons Match" />

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
            {gameState ? <Board gameState={gameState} /> : (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                Connecting to Business Tycoon board...
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div style={{ flex: '0 1 340px', minWidth: 0, width: '100%' }}>
          <ActionPanel gameState={gameState} />
        </div>
      </div>

      {/* Middle Row: Player Dashboard */}
      {gameState && (
        <div>
          <PlayerDashboard gameState={gameState} />
        </div>
      )}

      {/* Bottom Row: Game Log */}
      {gameState && (
        <div>
          <GameLog events={gameState.log} />
        </div>
      )}

      {/* Modals & Overlays */}
      {gameState && <Modals gameState={gameState} />}

      {/* Mobile Sticky Turn Action Bar (Only on mobile when active turn) */}
      {gameState && gameState.turnPlayerId === myPlayerId && gameState.phase !== 'gameOver' && (
        <div
          className="mobile-sticky-action-bar"
          style={{
            position: 'fixed',
            bottom: 'env(safe-area-inset-bottom, 12px)',
            left: '12px',
            right: '12px',
            backgroundColor: 'rgba(22, 17, 39, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid #a78bfa',
            borderRadius: '16px',
            padding: '10px 14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.85), 0 0 20px rgba(124, 58, 237, 0.4)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {gameState.phase === 'awaitRoll' && (
            <button
              onClick={() => dispatchAction({ type: 'ROLL' })}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(236,72,153,0.4)',
              }}
            >
              <span>🎲</span>
              <span>ROLL DICE</span>
              {turnTimerRemaining !== null && (
                <span style={{ fontSize: '12px', opacity: 0.85, fontWeight: 700 }}>
                  ({turnTimerRemaining}s)
                </span>
              )}
            </button>
          )}

          {gameState.phase === 'awaitBuyDecision' && (
            <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
              <button
                onClick={() => dispatchAction({ type: 'BUY' })}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Buy Property
              </button>
              <button
                onClick={() => dispatchAction({ type: 'DECLINE_BUY' })}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Auction
              </button>
            </div>
          )}

          {gameState.phase === 'resolveEvent' && (
            <button
              onClick={dismissEventCard}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                border: 'none',
                background:
                  gameState.players[gameState.turnPlayerId]?.doublesStreak > 0 &&
                  !gameState.players[gameState.turnPlayerId]?.inJail
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #fcd581 0%, #f59e0b 100%)',
                color:
                  gameState.players[gameState.turnPlayerId]?.doublesStreak > 0 &&
                  !gameState.players[gameState.turnPlayerId]?.inJail
                    ? '#ffffff'
                    : '#0f172a',
                fontSize: '14px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              {gameState.players[gameState.turnPlayerId]?.doublesStreak > 0 &&
              !gameState.players[gameState.turnPlayerId]?.inJail
                ? 'Roll Again (Doubles! 🎲)'
                : 'Next Player Turn ➔'}
            </button>
          )}

          {gameState.phase === 'awaitEndTurn' && (
            <button
              onClick={() => dispatchAction({ type: 'END_TURN' })}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              End Turn ⏩
            </button>
          )}
        </div>
      )}
    </div>
  );
};
