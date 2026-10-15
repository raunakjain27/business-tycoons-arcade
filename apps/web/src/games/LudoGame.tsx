import React, { useState, useEffect } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { soundFx } from '../soundEffects';

type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

interface Token {
  id: number;
  color: PlayerColor;
  step: number; // -1: base, 0-50: main track, 51-56: home-stretch, 57: home finished
}

interface LudoPlayer {
  id: string;
  color: PlayerColor;
  name: string;
  avatar: string;
  isBot: boolean;
  tokens: Token[];
  tokensHome: number;
}

const PLAYER_THEMES: Record<PlayerColor, { name: string; hex: string; lightHex: string; gradient: string; startPos: number }> = {
  red: { name: 'Crimson Warriors', hex: '#ef4444', lightHex: '#fca5a5', gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', startPos: 0 },
  green: { name: 'Emerald Dragons', hex: '#10b981', lightHex: '#6ee7b7', gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', startPos: 13 },
  yellow: { name: 'Solar Phoenix', hex: '#f59e0b', lightHex: '#fcd34d', gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', startPos: 26 },
  blue: { name: 'Abyssal Sharks', hex: '#3b82f6', lightHex: '#93c5fd', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', startPos: 39 },
};

const ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const LudoGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice } = useVoiceStore();

  const room = getOrCreateRoom('ludo', 'You (Red)', 4, 2);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const [players, setPlayers] = useState<LudoPlayer[]>([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [diceVal, setDiceVal] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [winner, setWinner] = useState<LudoPlayer | null>(null);
  const [gameLog, setGameLog] = useState<string[]>([]);

  const startMatchFromRoom = () => {
    const roomPlayers = [...room.players.slice(0, 4)];
    while (roomPlayers.length < 4 && room.allowBots) {
      const idx = roomPlayers.length;
      roomPlayers.push({
        id: `bot-${idx}`,
        name: `Bot ${ORDER[idx].toUpperCase()} 🤖`,
        isBot: true,
        avatar: '🤖',
        isHost: false,
        color: PLAYER_THEMES[ORDER[idx]].hex,
      });
    }

    const matchPlayers: LudoPlayer[] = ORDER.slice(0, Math.max(2, roomPlayers.length)).map((color, idx) => {
      const rp = roomPlayers[idx] || {
        id: `p-${idx}`,
        name: idx === 0 ? 'You (Red)' : `Friend ${idx}`,
        avatar: '🎲',
        isBot: false,
      };
      return {
        id: rp.id,
        color,
        name: rp.name,
        avatar: rp.avatar || '🎲',
        isBot: rp.isBot,
        tokens: [
          { id: 0, color, step: -1 },
          { id: 1, color, step: -1 },
          { id: 2, color, step: -1 },
          { id: 3, color, step: -1 },
        ],
        tokensHome: 0,
      };
    });

    setPlayers(matchPlayers);
    connectVoice(matchPlayers.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));

    setCurrentTurnIdx(0);
    setDiceVal(null);
    setHasRolled(false);
    setWinner(null);
    setInLobby(false);
    setGameLog([`🎲 Authentic Ludo Match started in room ${room.roomCode}! Red rolls first. Roll a 6 to release from base!`]);
  };

  const curPlayer = players[currentTurnIdx];

  const logMessage = (msg: string) => {
    setGameLog((prev) => [msg, ...prev.slice(0, 15)]);
  };

  const rollDice = () => {
    if (isRolling || hasRolled || winner) return;
    setIsRolling(true);

    let rolls = 0;
    soundFx.playDiceRoll();
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      rolls++;
      if (rolls > 8) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalVal);
        setIsRolling(false);
        setHasRolled(true);
        handlePostRoll(finalVal);
      }
    }, 55);
  };

  const handlePostRoll = (roll: number) => {
    if (!curPlayer) return;
    const movableTokens = curPlayer.tokens.filter((t) => canMoveToken(t, roll));

    if (movableTokens.length === 0) {
      logMessage(`${curPlayer.name} rolled a ${roll} but has no moves.`);
      setTimeout(() => {
        passTurn(false);
      }, 1000);
    } else if (movableTokens.length === 1 && curPlayer.isBot) {
      setTimeout(() => {
        moveToken(movableTokens[0], roll);
      }, 700);
    }
  };

  useEffect(() => {
    if (!winner && curPlayer && curPlayer.isBot && !hasRolled && !isRolling && !inLobby) {
      const timer = setTimeout(() => {
        rollDice();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [curPlayer, hasRolled, isRolling, winner, inLobby]);

  useEffect(() => {
    if (curPlayer && curPlayer.isBot && hasRolled && diceVal !== null && !winner && !inLobby) {
      const movableTokens = curPlayer.tokens.filter((t) => canMoveToken(t, diceVal));
      if (movableTokens.length > 0) {
        const timer = setTimeout(() => {
          const baseToken = movableTokens.find((t) => t.step === -1);
          const chosen = diceVal === 6 && baseToken ? baseToken : movableTokens[0];
          moveToken(chosen, diceVal);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [hasRolled, diceVal, curPlayer, winner, inLobby]);

  const canMoveToken = (token: Token, roll: number): boolean => {
    if (token.step === 57) return false;
    if (token.step === -1) return roll === 6;
    if (token.step + roll > 57) return false;
    return true;
  };

  const moveToken = (token: Token, roll: number) => {
    if (!curPlayer || !diceVal) return;

    let newStep = token.step;
    if (token.step === -1 && roll === 6) {
      newStep = 0;
      soundFx.playLadderClimb();
      logMessage(`🚀 ${curPlayer.name} released a token onto the track!`);
    } else {
      newStep = token.step + roll;
      soundFx.playCardFlip();
      logMessage(`${curPlayer.name} advanced a token ${roll} steps.`);
    }

    let reachedHome = false;
    if (newStep === 57) {
      reachedHome = true;
      soundFx.playLadderClimb();
      logMessage(`🎯 ${curPlayer.name}'s token reached the HOME TRIANGLE!`);
    }

    // Cutting opponent tokens
    let cutOpponent = false;
    if (newStep >= 0 && newStep <= 50) {
      const myGlobalPos = (PLAYER_THEMES[curPlayer.color].startPos + newStep) % 52;
      const safePositions = [0, 8, 13, 21, 26, 34, 39, 47]; // Star tiles
      const isSafe = safePositions.includes(myGlobalPos);

      if (!isSafe) {
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.color === curPlayer.color) return p;
            return {
              ...p,
              tokens: p.tokens.map((oppToken) => {
                if (oppToken.step >= 0 && oppToken.step <= 50) {
                  const oppGlobalPos = (PLAYER_THEMES[oppToken.color].startPos + oppToken.step) % 52;
                  if (oppGlobalPos === myGlobalPos) {
                    cutOpponent = true;
                    soundFx.playTokenCut();
                    logMessage(`⚔️ ${curPlayer.name} CUT ${p.name}'s token back to base!`);
                    return { ...oppToken, step: -1 };
                  }
                }
                return oppToken;
              }),
            };
          })
        );
      }
    }

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.color === curPlayer.color) {
          const updatedTokens = p.tokens.map((t) => (t.id === token.id ? { ...t, step: newStep } : t));
          const homeCount = updatedTokens.filter((t) => t.step === 57).length;
          return {
            ...p,
            tokens: updatedTokens,
            tokensHome: homeCount,
          };
        }
        return p;
      })
    );

    const finalHomeCount = curPlayer.tokensHome + (reachedHome ? 1 : 0);
    if (finalHomeCount === 4) {
      setWinner(curPlayer);
      logMessage(`🏆 ${curPlayer.name} has brought all 4 tokens home and WON!`);
      return;
    }

    const extraTurn = roll === 6 || cutOpponent;
    if (extraTurn) {
      logMessage(`✨ Extra turn for ${curPlayer.name}!`);
      setHasRolled(false);
      setDiceVal(null);
    } else {
      passTurn(false);
    }
  };

  const passTurn = (extraTurn: boolean = false) => {
    setHasRolled(false);
    setDiceVal(null);
    if (!extraTurn) {
      setCurrentTurnIdx((prev) => (prev + 1) % players.length);
    }
  };

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="ludo"
        gameTitle="Ludo Superstars Deluxe"
        gameIcon="🎲"
        minPlayers={2}
        maxPlayers={4}
        bannerGradient="linear-gradient(135deg, #10b981 0%, #3b82f6 100%)"
        onStart={startMatchFromRoom}
      />
    );
  }

  // Cross board helper rendering
  const isHumanTurn = curPlayer && !curPlayer.isBot;

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Voice Room Bar */}
      <VoiceRoomBar gameTitle="Ludo Superstars Deluxe" turnRestricted={false} />

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          padding: '14px 24px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <button
          onClick={() => setInLobby(true)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#cbd5e1',
            padding: '8px 16px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '12px',
          }}
        >
          ⚙️ Room Lobby ({room.roomCode})
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <span>🎲</span> Ludo Superstars Deluxe
          </h2>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Current Turn:{' '}
            <strong style={{ color: curPlayer ? PLAYER_THEMES[curPlayer.color].hex : '#fff' }}>
              {curPlayer?.name}
            </strong>
          </span>
        </div>

        <button
          onClick={startMatchFromRoom}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '12px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
          }}
        >
          Restart Match
        </button>
      </div>

      {/* Main Board Arena */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 280px', gap: '24px', alignItems: 'start' }}>
        {/* Authentic 15x15 Ludo Cross Board */}
        <div
          style={{
            aspectRatio: '1/1',
            background: '#0a0d18',
            border: '4px solid #243048',
            borderRadius: '28px',
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(15, 1fr)',
            gridTemplateRows: 'repeat(15, 1fr)',
            gap: '2px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.85), inset 0 0 40px rgba(0,0,0,0.5)',
            position: 'relative',
          }}
        >
          {/* Top-Left: Red Yard (6x6) */}
          <div
            style={{
              gridColumn: '1 / 7',
              gridRow: '1 / 7',
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              borderRadius: '20px 0 0 0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: curPlayer?.color === 'red' ? '0 0 25px rgba(239, 68, 68, 0.6)' : 'none',
              border: curPlayer?.color === 'red' ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 900, fontSize: '13px' }}>
              <span>🔴 {players[0]?.name || 'Red'}</span>
              <span>Home: {players[0]?.tokensHome || 0}/4</span>
            </div>
            {/* Tokens in Yard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '14px' }}>
              {players[0]?.tokens.map((tok) => {
                const isMovable = curPlayer?.color === 'red' && hasRolled && diceVal !== null && canMoveToken(tok, diceVal) && isHumanTurn;
                return (
                  <button
                    key={tok.id}
                    onClick={() => isMovable && moveToken(tok, diceVal!)}
                    disabled={!isMovable}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '50%',
                      background: tok.step === 57 ? '#22c55e' : '#fff',
                      border: isMovable ? '3px solid #fbbf24' : '2px solid #ef4444',
                      color: tok.step === 57 ? '#fff' : '#ef4444',
                      fontWeight: 900,
                      fontSize: '11px',
                      cursor: isMovable ? 'pointer' : 'default',
                      transform: isMovable ? 'scale(1.2)' : 'none',
                      animation: isMovable ? 'pulse 1s infinite' : 'none',
                      boxShadow: isMovable ? '0 0 15px #fbbf24' : '0 4px 8px rgba(0,0,0,0.4)',
                    }}
                  >
                    {tok.step === 57 ? '🏁' : tok.step === -1 ? 'BASE' : tok.step}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top-Right: Green Yard (6x6) */}
          <div
            style={{
              gridColumn: '10 / 16',
              gridRow: '1 / 7',
              background: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
              borderRadius: '0 20px 0 0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: curPlayer?.color === 'green' ? '0 0 25px rgba(16, 185, 129, 0.6)' : 'none',
              border: curPlayer?.color === 'green' ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 900, fontSize: '13px' }}>
              <span>🟢 {players[1]?.name || 'Green'}</span>
              <span>Home: {players[1]?.tokensHome || 0}/4</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '14px' }}>
              {players[1]?.tokens.map((tok) => {
                const isMovable = curPlayer?.color === 'green' && hasRolled && diceVal !== null && canMoveToken(tok, diceVal) && isHumanTurn;
                return (
                  <button
                    key={tok.id}
                    onClick={() => isMovable && moveToken(tok, diceVal!)}
                    disabled={!isMovable}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '50%',
                      background: tok.step === 57 ? '#22c55e' : '#fff',
                      border: isMovable ? '3px solid #fbbf24' : '2px solid #10b981',
                      color: tok.step === 57 ? '#fff' : '#10b981',
                      fontWeight: 900,
                      fontSize: '11px',
                      cursor: isMovable ? 'pointer' : 'default',
                      transform: isMovable ? 'scale(1.2)' : 'none',
                      animation: isMovable ? 'pulse 1s infinite' : 'none',
                    }}
                  >
                    {tok.step === 57 ? '🏁' : tok.step === -1 ? 'BASE' : tok.step}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom-Left: Blue Yard (6x6) */}
          <div
            style={{
              gridColumn: '1 / 7',
              gridRow: '10 / 16',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              borderRadius: '0 0 0 20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: curPlayer?.color === 'blue' ? '0 0 25px rgba(59, 130, 246, 0.6)' : 'none',
              border: curPlayer?.color === 'blue' ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 900, fontSize: '13px' }}>
              <span>🔵 {players[3]?.name || 'Blue'}</span>
              <span>Home: {players[3]?.tokensHome || 0}/4</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '14px' }}>
              {players[3]?.tokens.map((tok) => {
                const isMovable = curPlayer?.color === 'blue' && hasRolled && diceVal !== null && canMoveToken(tok, diceVal) && isHumanTurn;
                return (
                  <button
                    key={tok.id}
                    onClick={() => isMovable && moveToken(tok, diceVal!)}
                    disabled={!isMovable}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '50%',
                      background: tok.step === 57 ? '#22c55e' : '#fff',
                      border: isMovable ? '3px solid #fbbf24' : '2px solid #3b82f6',
                      color: tok.step === 57 ? '#fff' : '#3b82f6',
                      fontWeight: 900,
                      fontSize: '11px',
                      cursor: isMovable ? 'pointer' : 'default',
                      transform: isMovable ? 'scale(1.2)' : 'none',
                      animation: isMovable ? 'pulse 1s infinite' : 'none',
                    }}
                  >
                    {tok.step === 57 ? '🏁' : tok.step === -1 ? 'BASE' : tok.step}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom-Right: Yellow Yard (6x6) */}
          <div
            style={{
              gridColumn: '10 / 16',
              gridRow: '10 / 16',
              background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
              borderRadius: '0 0 20px 0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: curPlayer?.color === 'yellow' ? '0 0 25px rgba(245, 158, 11, 0.6)' : 'none',
              border: curPlayer?.color === 'yellow' ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 900, fontSize: '13px' }}>
              <span>🟡 {players[2]?.name || 'Yellow'}</span>
              <span>Home: {players[2]?.tokensHome || 0}/4</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '14px' }}>
              {players[2]?.tokens.map((tok) => {
                const isMovable = curPlayer?.color === 'yellow' && hasRolled && diceVal !== null && canMoveToken(tok, diceVal) && isHumanTurn;
                return (
                  <button
                    key={tok.id}
                    onClick={() => isMovable && moveToken(tok, diceVal!)}
                    disabled={!isMovable}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '50%',
                      background: tok.step === 57 ? '#22c55e' : '#fff',
                      border: isMovable ? '3px solid #fbbf24' : '2px solid #f59e0b',
                      color: tok.step === 57 ? '#fff' : '#f59e0b',
                      fontWeight: 900,
                      fontSize: '11px',
                      cursor: isMovable ? 'pointer' : 'default',
                      transform: isMovable ? 'scale(1.2)' : 'none',
                      animation: isMovable ? 'pulse 1s infinite' : 'none',
                    }}
                  >
                    {tok.step === 57 ? '🏁' : tok.step === -1 ? 'BASE' : tok.step}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Ludo Home Triangle (3x3: Rows 7-9, Cols 7-9) */}
          <div
            style={{
              gridColumn: '7 / 10',
              gridRow: '7 / 10',
              background: 'radial-gradient(circle, #fff 0%, #1e1b4b 100%)',
              border: '2px solid #fbbf24',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.5)',
            }}
          >
            🏆
          </div>

          {/* Track tiles indicator */}
          <div
            style={{
              gridColumn: '7 / 10',
              gridRow: '1 / 7',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6ee7b7',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            Green Path ★
          </div>
          <div
            style={{
              gridColumn: '10 / 16',
              gridRow: '7 / 10',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fcd34d',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            Yellow Path ★
          </div>
          <div
            style={{
              gridColumn: '7 / 10',
              gridRow: '10 / 16',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#93c5fd',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            Blue Path ★
          </div>
          <div
            style={{
              gridColumn: '1 / 7',
              gridRow: '7 / 10',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fca5a5',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            Red Path ★
          </div>
        </div>

        {/* Dice Roller & Game Action Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'rgba(30, 24, 55, 0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '24px',
              padding: '28px 18px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
            }}
          >
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              SUPERSTAR DICE ARENA
            </span>

            <div
              onClick={() => {
                if (curPlayer && !curPlayer.isBot && !hasRolled && !isRolling) rollDice();
              }}
              style={{
                width: '92px',
                height: '92px',
                borderRadius: '24px',
                background: curPlayer ? PLAYER_THEMES[curPlayer.color].gradient : '#7c3aed',
                border: '3px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '46px',
                fontWeight: 900,
                color: '#ffffff',
                boxShadow: `0 15px 30px rgba(0,0,0,0.7), 0 0 25px ${curPlayer ? PLAYER_THEMES[curPlayer.color].hex : '#7c3aed'}66`,
                cursor: curPlayer && !curPlayer.isBot && !hasRolled ? 'pointer' : 'default',
                transform: isRolling ? 'rotate(35deg) scale(0.9)' : 'none',
                transition: 'all 0.1s ease',
              }}
            >
              {diceVal || '🎲'}
            </div>

            {curPlayer && !curPlayer.isBot && (
              <button
                onClick={rollDice}
                disabled={hasRolled || isRolling}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: hasRolled ? '#334155' : 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '15px',
                  cursor: hasRolled ? 'not-allowed' : 'pointer',
                  boxShadow: hasRolled ? 'none' : '0 8px 20px rgba(236,72,153,0.4)',
                }}
              >
                {isRolling ? 'Rolling...' : hasRolled ? 'Tap Highlighted Token!' : 'Roll 3D Dice!'}
              </button>
            )}

            {winner && (
              <div style={{ background: '#22c55e22', border: '1px solid #22c55e', padding: '14px', borderRadius: '12px', color: '#4ade80', fontSize: '14px', fontWeight: 900 }}>
                🏆 {winner.name} Reached Home and WON!
              </div>
            )}
          </div>

          {/* Action Log Feed */}
          <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '20px', padding: '16px', fontSize: '12px', color: '#94a3b8', maxHeight: '180px', overflowY: 'auto' }}>
            <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '8px' }}>Action Log:</strong>
            {gameLog.map((log, i) => (
              <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
