import React, { useState, useEffect } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';

type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
type CardValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'draw4';

interface UnoCard {
  id: string;
  color: CardColor;
  value: CardValue;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  cards: UnoCard[];
  calledUno: boolean;
  color: string;
}

const COLOR_MAP: Record<CardColor, { bg: string; text: string; border: string; glow: string; badge: string }> = {
  red: { bg: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)', text: '#ffffff', border: '#f87171', glow: 'rgba(239, 68, 68, 0.7)', badge: '🔴' },
  blue: { bg: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', text: '#ffffff', border: '#60a5fa', glow: 'rgba(59, 130, 246, 0.7)', badge: '🔵' },
  green: { bg: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)', text: '#ffffff', border: '#34d399', glow: 'rgba(16, 185, 129, 0.7)', badge: '🟢' },
  yellow: { bg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', text: '#1e293b', border: '#fbbf24', glow: 'rgba(245, 158, 11, 0.7)', badge: '🟡' },
  wild: { bg: 'linear-gradient(135deg, #ef4444 25%, #3b82f6 25%, #3b82f6 50%, #f59e0b 50%, #f59e0b 75%, #10b981 75%)', text: '#ffffff', border: '#e879f9', glow: 'rgba(168, 85, 247, 0.85)', badge: '🌈' },
};

function createDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  let id = 1;

  for (const c of colors) {
    deck.push({ id: `c-${id++}`, color: c, value: '0' });
    const numbers: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = 0; i < 2; i++) {
      for (const n of numbers) {
        deck.push({ id: `c-${id++}`, color: c, value: n });
      }
      deck.push({ id: `c-${id++}`, color: c, value: 'skip' });
      deck.push({ id: `c-${id++}`, color: c, value: 'reverse' });
      deck.push({ id: `c-${id++}`, color: c, value: 'draw2' });
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c-${id++}`, color: 'wild', value: 'wild' });
    deck.push({ id: `c-${id++}`, color: 'wild', value: 'draw4' });
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export const UnoGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice } = useVoiceStore();

  const room = getOrCreateRoom('uno', 'You (Host)', 8, 2);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const [deck, setDeck] = useState<UnoCard[]>([]);
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([]);
  const [activeColor, setActiveColor] = useState<CardColor>('red');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [winner, setWinner] = useState<Player | null>(null);
  const [showWildPicker, setShowWildPicker] = useState<UnoCard | null>(null);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [lastPlayedAnim, setLastPlayedAnim] = useState<string | null>(null);

  const startMatchFromRoom = () => {
    const freshDeck = createDeck();
    const roomPlayers = room.players.length >= 2 ? room.players : [
      { id: 'p1', name: 'You (Champion)', isBot: false, avatar: '👑', color: '#ec4899', isHost: true },
      { id: 'p2', name: 'Bot Alex 🤖', isBot: true, avatar: '🤖', color: '#3b82f6', isHost: false },
    ];

    const matchPlayers: Player[] = roomPlayers.map((rp) => ({
      id: rp.id,
      name: rp.name,
      avatar: rp.avatar,
      isBot: rp.isBot,
      color: rp.color,
      cards: freshDeck.splice(0, 7),
      calledUno: false,
    }));

    let startCard = freshDeck.pop()!;
    while (startCard.color === 'wild') {
      freshDeck.unshift(startCard);
      startCard = freshDeck.pop()!;
    }

    setDeck(freshDeck);
    setDiscardPile([startCard]);
    setActiveColor(startCard.color);
    setPlayers(matchPlayers);
    connectVoice(matchPlayers.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));

    setCurrentPlayerIdx(0);
    setDirection(1);
    setWinner(null);
    setShowWildPicker(null);
    setInLobby(false);
    setGameLog([`🎮 Match started in room ${room.roomCode}! Starting card: ${startCard.color.toUpperCase()} ${startCard.value}`]);
  };

  const topCard = discardPile[discardPile.length - 1];

  const logMessage = (msg: string) => {
    setGameLog((prev) => [msg, ...prev.slice(0, 19)]);
  };

  const isCardPlayable = (card: UnoCard): boolean => {
    if (!topCard) return false;
    if (card.color === 'wild') return true;
    if (card.color === activeColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  };

  const nextTurn = (skipCount: number = 0, newDir?: 1 | -1) => {
    const curDir = newDir !== undefined ? newDir : direction;
    const numPlayers = players.length;
    let nextIdx = (currentPlayerIdx + curDir * (1 + skipCount)) % numPlayers;
    if (nextIdx < 0) nextIdx += numPlayers;
    setCurrentPlayerIdx(nextIdx);
  };

  useEffect(() => {
    if (!winner && players.length > 0 && !inLobby) {
      const cur = players[currentPlayerIdx];
      if (cur && cur.isBot) {
        const timer = setTimeout(() => {
          botPlay(cur);
        }, 1100);
        return () => clearTimeout(timer);
      }
    }
  }, [currentPlayerIdx, winner, players, inLobby]);

  const botPlay = (bot: Player) => {
    const playable = bot.cards.filter(isCardPlayable);
    if (playable.length > 0) {
      const chosen = playable.find((c) => c.color !== 'wild') || playable[0];
      const botColorChoice: CardColor = ['red', 'blue', 'green', 'yellow'][Math.floor(Math.random() * 4)] as CardColor;
      executeCardPlay(bot.id, chosen, chosen.color === 'wild' ? botColorChoice : undefined);
    } else {
      drawCards(bot.id, 1);
      logMessage(`${bot.name} had no playable cards and drew 1.`);
      nextTurn(0);
    }
  };

  const drawCards = (playerId: string, count: number): UnoCard[] => {
    let currentDeck = [...deck];
    let currentDiscard = [...discardPile];
    const drawn: UnoCard[] = [];

    for (let i = 0; i < count; i++) {
      if (currentDeck.length === 0) {
        if (currentDiscard.length <= 1) break;
        const top = currentDiscard.pop()!;
        currentDeck = currentDiscard.sort(() => Math.random() - 0.5);
        currentDiscard = [top];
      }
      if (currentDeck.length > 0) {
        drawn.push(currentDeck.pop()!);
      }
    }

    setDeck(currentDeck);
    setDiscardPile(currentDiscard);

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          return { ...p, cards: [...p.cards, ...drawn], calledUno: false };
        }
        return p;
      })
    );

    return drawn;
  };

  const handlePlayerPlay = (card: UnoCard) => {
    const curPlayer = players[currentPlayerIdx];
    if (curPlayer?.isBot || winner) return;
    if (!isCardPlayable(card)) return;

    if (card.color === 'wild') {
      setShowWildPicker(card);
    } else {
      executeCardPlay(curPlayer.id, card);
    }
  };

  const executeCardPlay = (playerId: string, card: UnoCard, chosenColor?: CardColor) => {
    const player = players.find((p) => p.id === playerId)!;
    const remainingCards = player.cards.filter((c) => c.id !== card.id);

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          const autoUno = remainingCards.length === 1;
          return { ...p, cards: remainingCards, calledUno: autoUno };
        }
        return p;
      })
    );

    setDiscardPile((prev) => [...prev, card]);
    setLastPlayedAnim(card.id);
    setTimeout(() => setLastPlayedAnim(null), 600);

    const newColor = chosenColor || (card.color === 'wild' ? 'red' : card.color);
    setActiveColor(newColor);

    logMessage(`${player.name} played ${card.color.toUpperCase()} ${card.value}${chosenColor ? ` (picked ${chosenColor})` : ''}`);

    if (remainingCards.length === 0) {
      setWinner(player);
      logMessage(`🎉 ${player.name} has played all cards and WON the match!`);
      return;
    }

    if (remainingCards.length === 1) {
      logMessage(`⚠️ ${player.name} calls UNO! Only 1 card left!`);
    }

    let skip = 0;
    let newDir = direction;

    if (card.value === 'reverse') {
      newDir = (direction * -1) as 1 | -1;
      setDirection(newDir);
      logMessage(`🔄 Play order reversed!`);
    } else if (card.value === 'skip') {
      skip = 1;
      logMessage(`🚫 Next player was skipped!`);
    } else if (card.value === 'draw2') {
      skip = 1;
      const targetIdx = (currentPlayerIdx + direction + players.length) % players.length;
      drawCards(players[targetIdx].id, 2);
      logMessage(`💥 ${players[targetIdx].name} draws 2 cards and skips turn!`);
    } else if (card.value === 'draw4') {
      skip = 1;
      const targetIdx = (currentPlayerIdx + direction + players.length) % players.length;
      drawCards(players[targetIdx].id, 4);
      logMessage(`💣 ${players[targetIdx].name} draws 4 cards and skips turn!`);
    }

    setShowWildPicker(null);
    nextTurn(skip, newDir);
  };

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="uno"
        gameTitle="UNO Champions Deluxe"
        gameIcon="🃏"
        minPlayers={2}
        maxPlayers={8}
        bannerGradient="linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)"
        onStart={startMatchFromRoom}
      />
    );
  }

  const curPlayer = players[currentPlayerIdx];
  const isHumanTurn = curPlayer && !curPlayer.isBot;

  // Custom glossy Uno Card design helper
  const renderCardContent = (card: UnoCard) => {
    const isSpecial = ['skip', 'reverse', 'draw2', 'draw4', 'wild'].includes(card.value);
    const symbol =
      card.value === 'skip'
        ? '🚫'
        : card.value === 'reverse'
        ? '🔄'
        : card.value === 'draw2'
        ? '+2'
        : card.value === 'draw4'
        ? '+4'
        : card.value === 'wild'
        ? '🌈'
        : card.value;

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
        {/* Corner Index */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 900, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
          <span>{card.value.toUpperCase()}</span>
          <span>{COLOR_MAP[card.color].badge}</span>
        </div>

        {/* Center Glossy Oval with Large Symbol */}
        <div
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(240,240,250,0.85) 100%)',
            transform: 'rotate(-25deg)',
            borderRadius: '50%',
            height: '62px',
            margin: '2px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.8)',
            border: '2px solid rgba(255,255,255,0.6)',
          }}
        >
          <span
            style={{
              fontSize: isSpecial ? '26px' : '36px',
              fontWeight: 900,
              color: card.color === 'yellow' ? '#d97706' : card.color === 'wild' ? '#9333ea' : card.color === 'green' ? '#047857' : card.color === 'blue' ? '#1d4ed8' : '#b91c1c',
              transform: 'rotate(25deg)',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {symbol}
          </span>
        </div>

        {/* Bottom Corner Index */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 900, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
          <span>{COLOR_MAP[card.color].badge}</span>
          <span>{card.value.toUpperCase()}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Voice Chat Bar */}
      <VoiceRoomBar gameTitle="UNO Champions" turnRestricted={false} />

      {/* Top Header Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)',
          padding: '14px 22px',
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
            fontWeight: 800,
            fontSize: '12px',
          }}
        >
          ⚙️ Room Lobby ({room.roomCode})
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <span>🃏</span> UNO Champions Deluxe
          </h2>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Rotation: {direction === 1 ? 'Clockwise ↻' : 'Counter-Clockwise ↺'} | Active Color:{' '}
            <strong style={{ color: COLOR_MAP[activeColor]?.border || '#ef4444', textTransform: 'uppercase' }}>
              {activeColor} {COLOR_MAP[activeColor]?.badge}
            </strong>
          </span>
        </div>

        <button
          onClick={startMatchFromRoom}
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '12px',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
          }}
        >
          Restart Match
        </button>
      </div>

      {/* Opponents Stadium (Top) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        {players.map((p, idx) => {
          if (idx === 0) return null;
          const isTurn = curPlayer?.id === p.id;
          return (
            <div
              key={p.id}
              style={{
                background: isTurn ? 'rgba(124, 58, 237, 0.35)' : 'rgba(30, 24, 55, 0.7)',
                border: isTurn ? '2px solid #c084fc' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isTurn ? '0 0 25px rgba(192, 132, 252, 0.4)' : 'none',
                transform: isTurn ? 'scale(1.04)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '20px' }}>{p.avatar}</span>
                <strong style={{ fontSize: '13px', color: isTurn ? '#f8fafc' : '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </strong>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 800 }}>{p.cards.length}🎴</span>
              </div>

              {/* Realistic card backs fan */}
              <div style={{ display: 'flex', gap: '-12px', height: '44px', alignItems: 'center', overflow: 'hidden' }}>
                {p.cards.slice(0, 7).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '28px',
                      height: '42px',
                      background: 'radial-gradient(circle, #0f172a 0%, #000 100%)',
                      border: '1.5px solid #ef4444',
                      borderRadius: '5px',
                      marginLeft: i > 0 ? '-14px' : '0',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f59e0b',
                      fontSize: '11px',
                      fontWeight: 900,
                    }}
                  >
                    U
                  </div>
                ))}
                {p.cards.length > 7 && (
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px', fontWeight: 700 }}>+{p.cards.length - 7}</span>
                )}
              </div>

              {p.cards.length === 1 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 900,
                    animation: 'pulse 1s infinite',
                    boxShadow: '0 0 10px #ef4444',
                  }}
                >
                  UNO! ⚡
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Center 3D Battle Arena (Deck & Active Discard) */}
      <div
        style={{
          background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #070410 100%)',
          borderRadius: '28px',
          border: '2px solid rgba(255,255,255,0.14)',
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
          position: 'relative',
          boxShadow: '0 30px 80px rgba(0,0,0,0.85), inset 0 0 60px rgba(124, 58, 237, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '48px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* 3D Draw Deck Stack */}
          <div
            onClick={() => {
              if (isHumanTurn && !winner) {
                drawCards(curPlayer.id, 1);
                logMessage('You drew 1 card.');
                nextTurn(0);
              }
            }}
            style={{
              width: '98px',
              height: '146px',
              borderRadius: '14px',
              background: 'radial-gradient(ellipse, #1e293b 0%, #090d16 100%)',
              border: isHumanTurn ? '3px dashed #a855f7' : '2px dashed #475569',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isHumanTurn ? 'pointer' : 'not-allowed',
              boxShadow: isHumanTurn ? '0 12px 30px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.2)' : '0 10px 20px rgba(0,0,0,0.7)',
              transform: isHumanTurn ? 'scale(1.06)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '34px' }}>🎴</span>
            <span style={{ fontSize: '12px', color: '#c084fc', fontWeight: 900, marginTop: '4px' }}>DRAW</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>({deck.length} left)</span>
          </div>

          {/* Active Discard Pile Card (Large Glossy Style) */}
          {topCard && (
            <div
              style={{
                width: '110px',
                height: '164px',
                borderRadius: '16px',
                background: COLOR_MAP[activeColor]?.bg || '#ef4444',
                border: '3px solid #ffffff',
                padding: '10px',
                boxShadow: `0 20px 45px rgba(0,0,0,0.85), 0 0 40px ${COLOR_MAP[activeColor]?.glow || '#ef4444'}`,
                color: '#ffffff',
                fontWeight: 900,
                boxSizing: 'border-box',
                animation: lastPlayedAnim ? 'bounce 0.5s ease' : 'none',
              }}
            >
              {renderCardContent(topCard)}
            </div>
          )}
        </div>

        {/* Dynamic Status Pill */}
        <div
          style={{
            fontSize: '14.5px',
            color: '#f8fafc',
            fontWeight: 800,
            background: 'rgba(0,0,0,0.6)',
            padding: '10px 24px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          }}
        >
          {winner
            ? `🏆 ${winner.name} Won the Game!`
            : isHumanTurn
            ? '👉 Your turn! Play a matching card or tap DRAW'
            : `⏳ Waiting for ${curPlayer?.name}...`}
        </div>
      </div>

      {/* Player Hand (Bottom) */}
      <div
        style={{
          background: 'rgba(30, 24, 55, 0.85)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: '24px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>{players[0]?.avatar}</span>
            <strong style={{ fontSize: '16px', color: '#f8fafc' }}>
              Your Hand ({players[0]?.cards.length} cards)
            </strong>
          </div>

          {players[0]?.cards.length === 2 && (
            <button
              onClick={() => logMessage('🗣️ You called UNO!')}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                color: '#fff',
                padding: '8px 22px',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '14px',
                cursor: 'pointer',
                animation: 'pulse 1s infinite',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.7)',
              }}
            >
              CALL UNO! ⚡
            </button>
          )}
        </div>

        {/* Glossy Interactive Cards Hand */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '14px' }}>
          {players[0]?.cards.map((c) => {
            const playable = isHumanTurn && isCardPlayable(c);
            const styleCfg = COLOR_MAP[c.color] || COLOR_MAP.wild;
            return (
              <button
                key={c.id}
                onClick={() => handlePlayerPlay(c)}
                disabled={!playable}
                style={{
                  minWidth: '88px',
                  height: '132px',
                  borderRadius: '14px',
                  background: styleCfg.bg,
                  border: playable ? '2.5px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                  color: styleCfg.text,
                  padding: '8px',
                  cursor: playable ? 'pointer' : 'not-allowed',
                  opacity: playable ? 1 : 0.45,
                  transform: playable ? 'translateY(-10px) scale(1.06)' : 'none',
                  transition: 'all 0.18s ease',
                  boxShadow: playable ? `0 12px 25px rgba(0,0,0,0.7), 0 0 20px ${styleCfg.glow}` : 'none',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
              >
                {renderCardContent(c)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Wild Color Picker Modal */}
      {showWildPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div style={{ background: '#1e1b4b', padding: '32px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 30px 80px rgba(0,0,0,0.9)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '20px', fontWeight: 900 }}>Choose Wild Color</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {(['red', 'blue', 'green', 'yellow'] as CardColor[]).map((col) => (
                <button
                  key={col}
                  onClick={() => executeCardPlay(curPlayer.id, showWildPicker, col)}
                  style={{
                    background: COLOR_MAP[col].bg,
                    border: 'none',
                    padding: '20px 28px',
                    borderRadius: '14px',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '18px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    boxShadow: `0 10px 25px ${COLOR_MAP[col].glow}`,
                  }}
                >
                  {col} {COLOR_MAP[col].badge}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mini Game Action Feed */}
      <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '16px', padding: '14px 18px', fontSize: '12px', color: '#94a3b8', maxHeight: '110px', overflowY: 'auto' }}>
        <strong style={{ color: '#c084fc', display: 'block', marginBottom: '6px' }}>⚡ Live Match Feed:</strong>
        {gameLog.map((log, i) => (
          <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};
