import React, { useState } from 'react';
import { useGameStore } from '../store';
import { useGameRoomStore } from '../gameRoomStore';
import { useHubStore } from '../hubStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { Board } from '../components/Board';
import { ActionPanel } from '../components/ActionPanel';
import { PlayerDashboard } from '../components/PlayerDashboard';
import { GameLog } from '../components/GameLog';
import { Modals } from '../components/Modals';
import { useCelebrationStore } from '../celebrationStore';
import { useChatStore, QUICK_SHOUTOUTS } from '../chatStore';
import { soundFx } from '../soundEffects';
import { useUserStore } from '../userStore';

const cleanNoEmojis = (str: string): string =>
  (str || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\s+/g, ' ').trim();

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

  const room = getOrCreateRoom('cornerstone', 'You (Tycoon)', 8, 2);
  const [inLobby, setInLobby] = useState<boolean>(!room.isGameStarted);
  const [sideTab, setSideTab] = useState<'feed' | 'comms'>('feed');
  const [chatInput, setChatInput] = useState('');
  const { messages, unreadCount, sendMessage } = useChatStore();
  const { user } = useUserStore();

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
        winnerAvatar: 'TY',
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
        name: `Tycoon Bot ${idx}`,
        isBot: true,
        avatar: 'AI',
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

    const rules = room.houseRules;
    initLocalGame(
      matchPlayers.length,
      matchPlayers[0]?.name || 'Player 1',
      'Tycoon',
      false,
      rules?.startingCash ?? 1500,
      {
        startingCash: rules?.startingCash ?? 1500,
        paydayAmount: rules?.paydayAmount ?? 200,
        doubleGoBonus: rules?.doubleGoBonus ?? true,
        vacationCash: rules?.vacationCash ?? true,
        auctionOnDecline: rules?.auctionOnDecline ?? true,
        evenBuild: rules?.evenBuild ?? true,
        turnTimerSec: rules?.turnTimerSec ?? 30,
        doubleRentFullSet: rules?.doubleRentFullSet ?? true,
      }
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
    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Top Game Navigation & Room Browser Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <button
          onClick={() => {
            soundFx.playClick();
            setInLobby(true);
            room.isGameStarted = false;
          }}
          className="arcade-btn arcade-btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⚙️</span>
          <span>LOBBY & HOUSE RULES</span>
        </button>

        <button
          onClick={() => {
            soundFx.playClick();
            useHubStore.getState().setShowPublicRoomsModal(true);
          }}
          className="arcade-btn arcade-btn-cyan"
          style={{
            padding: '6px 14px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🌐</span>
          <span>ALL ROOMS BROWSER</span>
        </button>

        <button
          onClick={() => {
            soundFx.playClick();
            useUserStore.getState().setShowAccountModal(true);
          }}
          className="arcade-btn arcade-btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderColor: 'rgba(0, 240, 255, 0.4)',
            color: '#00f0ff',
          }}
        >
          <span>👤</span>
          <span>ACCOUNT & BULLION</span>
        </button>
      </div>

      {/* Live Voice Status Dock */}
      <VoiceRoomBar gameTitle="Business Tycoons Match" />

      {/* 2-Column Responsive Command Center Arena */}
      <div
        className="game-arena-grid"
        style={{
          width: '100%',
          marginTop: '4px',
        }}
      >
        {/* Left Column: Board + Player Cards underneath */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Hero Board */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {gameState ? (
              <Board gameState={gameState} />
            ) : (
              <div
                className="glass-panel"
                style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', width: '100%' }}
              >
                Connecting to Business Tycoon board...
              </div>
            )}
          </div>

          {/* Player Cards (Directly below Board for seamless visibility) */}
          {gameState && (
            <div>
              <PlayerDashboard gameState={gameState} />
            </div>
          )}
        </div>

        {/* Right Column: Action Command Deck + Game Activity Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Action & Turn Controls Panel */}
          <ActionPanel gameState={gameState} />

          {/* Live Activity Stream & Arena Comms Dual Panel */}
          {gameState && (
            <div
              className="glass-panel"
              style={{
                padding: '14px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: 'linear-gradient(135deg, rgba(14, 20, 38, 0.95) 0%, rgba(8, 12, 24, 0.98) 100%)',
                border: '1.5px solid rgba(0, 240, 255, 0.25)',
              }}
            >
              {/* Tab Selector */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: '8px',
                }}
              >
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setSideTab('feed');
                  }}
                  className={`arcade-btn ${sideTab === 'feed' ? 'arcade-btn-cyan' : 'arcade-btn-secondary'}`}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    fontFamily: 'Orbitron, sans-serif',
                    letterSpacing: '0.5px',
                  }}
                >
                  ACTIVITY FEED ({gameState.log?.length ?? 0})
                </button>

                <button
                  onClick={() => {
                    soundFx.playClick();
                    setSideTab('comms');
                  }}
                  className={`arcade-btn ${sideTab === 'comms' ? 'arcade-btn-magenta' : 'arcade-btn-secondary'}`}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    fontFamily: 'Orbitron, sans-serif',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#00ff88',
                      boxShadow: '0 0 6px #00ff88',
                      display: 'inline-block',
                    }}
                  />
                  <span>ARENA COMMS</span>
                  {unreadCount > 0 && sideTab !== 'comms' && (
                    <span
                      style={{
                        backgroundColor: '#ff0077',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '9999px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Feed Tab View */}
              {sideTab === 'feed' && (
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <GameLog events={gameState.log} />
                </div>
              )}

              {/* Comms Tab View */}
              {sideTab === 'comms' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Tactical Preset Callouts Bar */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '5px',
                      overflowX: 'auto',
                      paddingBottom: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {QUICK_SHOUTOUTS.map((shoutout) => (
                      <button
                        key={shoutout}
                        onClick={() => {
                          soundFx.playClick();
                          sendMessage(shoutout, true, {
                            id: myPlayerId,
                            name: gameState.players[myPlayerId]?.name || user?.username || 'Operator',
                            avatar: 'YOU',
                            color: '#00f0ff',
                          });
                        }}
                        className="arcade-btn arcade-btn-secondary"
                        style={{
                          padding: '3px 9px',
                          fontSize: '9.5px',
                          borderRadius: '4px',
                          fontFamily: 'JetBrains Mono, monospace',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        [{shoutout}]
                      </button>
                    ))}
                  </div>

                  {/* Messages Stream */}
                  <div
                    style={{
                      maxHeight: '210px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      paddingRight: '4px',
                    }}
                  >
                    {messages.slice(-20).map((msg) => {
                      const isMe = msg.senderId === myPlayerId;
                      if (msg.isSystem) {
                        return (
                          <div
                            key={msg.id}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(0, 240, 255, 0.08)',
                              border: '1px solid rgba(0, 240, 255, 0.2)',
                              fontSize: '10.5px',
                              color: '#67e8f9',
                              textAlign: 'center',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            [SYSTEM] {cleanNoEmojis(msg.text)}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            gap: '2px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9.5px', color: '#94a3b8' }}>
                            <span
                              style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '8.5px',
                                fontWeight: 800,
                                padding: '1px 4px',
                                borderRadius: '3px',
                                backgroundColor: isMe ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                border: `1px solid ${isMe ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
                                color: isMe ? '#00f0ff' : '#cbd5e1',
                              }}
                            >
                              {isMe ? 'YOU' : msg.senderAvatar || 'OP'}
                            </span>
                            <strong style={{ color: msg.senderColor }}>{cleanNoEmojis(msg.senderName)}</strong>
                            <span style={{ fontSize: '9px' }}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            style={{
                              maxWidth: '90%',
                              padding: '6px 10px',
                              borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                              backgroundColor: isMe ? 'rgba(0, 240, 255, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                              border: isMe ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#ffffff',
                              fontSize: '11.5px',
                              lineHeight: 1.35,
                            }}
                          >
                            {cleanNoEmojis(msg.text)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Inline Message Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const sanitized = cleanNoEmojis(chatInput);
                      if (!sanitized) return;
                      soundFx.playClick();
                      sendMessage(sanitized, false, {
                        id: myPlayerId,
                        name: cleanNoEmojis(gameState.players[myPlayerId]?.name || user?.username || 'Operator'),
                        avatar: 'YOU',
                        color: '#00f0ff',
                      });
                      setChatInput('');
                    }}
                    style={{ display: 'flex', gap: '6px', marginTop: '4px' }}
                  >
                    <input
                      type="text"
                      placeholder="Transmit tactical comms..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#ffffff',
                        fontSize: '11.5px',
                        fontFamily: 'Space Grotesk, sans-serif',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      className="arcade-btn arcade-btn-cyan"
                      style={{ padding: '6px 12px', fontSize: '10.5px', whiteSpace: 'nowrap' }}
                    >
                      TRANSMIT
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
