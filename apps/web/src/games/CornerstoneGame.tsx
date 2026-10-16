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

export const CornerstoneGame: React.FC = () => {
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice } = useVoiceStore();
  const {
    gameState,
    gameMode,
    roomCode,
    initLocalGame,
    connectOnline,
  } = useGameStore();

  const room = getOrCreateRoom('cornerstone', 'You (Tycoon 👑)', 8, 2);
  const [inLobby, setInLobby] = useState<boolean>(!room.isGameStarted);

  // Sync lobby state when host starts the match across browser tabs
  React.useEffect(() => {
    if (room.isGameStarted && inLobby) {
      setInLobby(false);
    }
  }, [room.isGameStarted, inLobby]);


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
    </div>
  );
};
