import React, { useState, useEffect } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';

interface RoundAnswers {
  name: string;
  place: string;
  animal: string;
  thing: string;
}

export const WordGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice } = useVoiceStore();

  const room = getOrCreateRoom('wordgame', 'You (Trivia Master)', 8, 2);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const [activeLetter, setActiveLetter] = useState('B');
  const [timerSec, setTimerSec] = useState(45);
  const [isPlaying, setIsPlaying] = useState(false);
  const [answers, setAnswers] = useState<RoundAnswers>({ name: '', place: '', animal: '', thing: '' });
  const [botAnswers, setBotAnswers] = useState<RoundAnswers | null>(null);
  const [roundScore, setRoundScore] = useState<{ player: number; opponent: number } | null>(null);
  const [totalScore, setTotalScore] = useState<{ player: number; opponent: number }>({ player: 0, opponent: 0 });

  const pickRandomLetter = () => {
    const commonLetters = 'ABCDEFGHIKLMNOPRSTUVW'.split('');
    return commonLetters[Math.floor(Math.random() * commonLetters.length)];
  };

  const startMatchFromRoom = () => {
    setInLobby(false);
    connectVoice(room.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    startRound();
  };

  const startRound = () => {
    const l = pickRandomLetter();
    setActiveLetter(l);
    setTimerSec(45);
    setAnswers({ name: '', place: '', animal: '', thing: '' });
    setBotAnswers(null);
    setRoundScore(null);
    setIsPlaying(true);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && timerSec > 0) {
      timer = setInterval(() => {
        setTimerSec((prev) => prev - 1);
      }, 1000);
    } else if (timerSec === 0 && isPlaying) {
      submitRound();
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, timerSec]);

  const submitRound = () => {
    setIsPlaying(false);

    const botMock: Record<string, RoundAnswers> = {
      'A': { name: 'Albert', place: 'Amsterdam', animal: 'Alligator', thing: 'Airplane' },
      'B': { name: 'Bruce', place: 'Berlin', animal: 'Bear', thing: 'Bottle' },
      'C': { name: 'Chloe', place: 'Cairo', animal: 'Cheetah', thing: 'Camera' },
      'D': { name: 'David', place: 'Dublin', animal: 'Dolphin', thing: 'Drum' },
      'E': { name: 'Emma', place: 'Edinburgh', animal: 'Elephant', thing: 'Envelope' },
      'F': { name: 'Felix', place: 'Florence', animal: 'Flamingo', thing: 'Flute' },
      'G': { name: 'Grace', place: 'Geneva', animal: 'Giraffe', thing: 'Guitar' },
      'H': { name: 'Harry', place: 'Havana', animal: 'Hamster', thing: 'Hammer' },
      'I': { name: 'Isaac', place: 'Istanbul', animal: 'Iguana', thing: 'Iron' },
      'K': { name: 'Kevin', place: 'Kyoto', animal: 'Koala', thing: 'Keyboard' },
      'L': { name: 'Lucas', place: 'London', animal: 'Lion', thing: 'Laptop' },
      'M': { name: 'Maya', place: 'Madrid', animal: 'Monkey', thing: 'Mirror' },
      'N': { name: 'Noah', place: 'Nairobi', animal: 'Newt', thing: 'Notebook' },
      'O': { name: 'Oliver', place: 'Oslo', animal: 'Owl', thing: 'Oven' },
      'P': { name: 'Peter', place: 'Paris', animal: 'Penguin', thing: 'Pencil' },
      'R': { name: 'Rachel', place: 'Rome', animal: 'Rabbit', thing: 'Radio' },
      'S': { name: 'Sophia', place: 'Sydney', animal: 'Squirrel', thing: 'Scissors' },
      'T': { name: 'Thomas', place: 'Tokyo', animal: 'Tiger', thing: 'Telescope' },
      'V': { name: 'Victor', place: 'Vienna', animal: 'Vulture', thing: 'Violin' },
      'W': { name: 'William', place: 'Warsaw', animal: 'Walrus', thing: 'Watch' },
    };

    const curBot = botMock[activeLetter] || {
      name: `${activeLetter}mily`,
      place: `${activeLetter}ity`,
      animal: `${activeLetter}pe`,
      thing: `${activeLetter}tem`,
    };
    setBotAnswers(curBot);

    let pPts = 0;
    const l = activeLetter.toLowerCase();
    if (answers.name.trim().toLowerCase().startsWith(l)) pPts += 10;
    if (answers.place.trim().toLowerCase().startsWith(l)) pPts += 10;
    if (answers.animal.trim().toLowerCase().startsWith(l)) pPts += 10;
    if (answers.thing.trim().toLowerCase().startsWith(l)) pPts += 10;

    const oppPts = room.allowBots ? 40 : Math.floor(Math.random() * 3) * 10 + 20;

    setRoundScore({ player: pPts, opponent: oppPts });
    setTotalScore((prev) => ({ player: prev.player + pPts, opponent: prev.opponent + oppPts }));
  };

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="wordgame"
        gameTitle="The Scribe's Lexicon (Word Duel)"
        gameIcon="📝"
        minPlayers={2}
        maxPlayers={8}
        onStart={startMatchFromRoom}
      />
    );
  }

  return (
    <div
      style={{
        maxWidth: '1060px',
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <VoiceRoomBar gameTitle="The Scribe's Lexicon (Word Duel)" turnRestricted={false} />

      {/* Top Header Strip */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          background: 'rgba(12, 17, 28, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          onClick={() => setInLobby(true)}
          className="btn-tactile-secondary"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
          }}
        >
          ⚙️ Salon Lobby ({room.roomCode})
        </button>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 900,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>📝</span>
            <span>The Scribe's Lexicon Duel</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Score: You <strong style={{ color: '#34d399' }}>{totalScore.player} pts</strong> — Associates{' '}
            <strong style={{ color: '#fb7185' }}>{totalScore.opponent} pts</strong>
          </div>
        </div>

        <button
          onClick={startRound}
          className="btn-tactile-secondary"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            color: '#fbbf24',
            borderColor: 'rgba(245, 158, 11, 0.3)',
          }}
        >
          {isPlaying ? '🔄 Reshuffle Letter' : '🔤 Next Letter'}
        </button>
      </div>

      {/* Main Arena */}
      <div
        className="glass-panel"
        style={{
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: 'linear-gradient(135deg, rgba(14, 19, 32, 0.9) 0%, rgba(8, 12, 20, 0.98) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Active Letter Medallion & Clock */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '24px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                color: '#fbbf24',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 800,
              }}
            >
              Active Sovereign Letter
            </span>
            <div
              style={{
                fontSize: '68px',
                fontWeight: 900,
                color: '#fbbf24',
                textShadow: '0 0 30px rgba(245, 158, 11, 0.5)',
                fontFamily: 'Outfit, system-ui, sans-serif',
                lineHeight: 1.1,
              }}
            >
              {activeLetter}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 800,
              }}
            >
              Remaining Clock
            </span>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 900,
                color: timerSec <= 10 ? '#ef4444' : '#38bdf8',
                textShadow: timerSec <= 10 ? '0 0 20px rgba(239, 68, 68, 0.6)' : 'none',
                fontFamily: 'ui-monospace, monospace',
                lineHeight: 1.1,
              }}
            >
              {timerSec}s
            </div>
          </div>
        </div>

        {/* 4 Lexicon Category Inputs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
              👤 Name starting with '{activeLetter}':
            </label>
            <input
              type="text"
              value={answers.name}
              disabled={!isPlaying}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswers({ ...answers, name: e.target.value })}
              placeholder={`e.g. ${activeLetter}ob`}
              style={{
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: '#090d16',
                color: '#ffffff',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>
              🌍 Place starting with '{activeLetter}':
            </label>
            <input
              type="text"
              value={answers.place}
              disabled={!isPlaying}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswers({ ...answers, place: e.target.value })}
              placeholder={`e.g. ${activeLetter}erlin`}
              style={{
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: '#090d16',
                color: '#ffffff',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#34d399' }}>
              🦁 Animal starting with '{activeLetter}':
            </label>
            <input
              type="text"
              value={answers.animal}
              disabled={!isPlaying}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswers({ ...answers, animal: e.target.value })}
              placeholder={`e.g. ${activeLetter}ear`}
              style={{
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: '#090d16',
                color: '#ffffff',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#f43f5e' }}>
              📦 Thing starting with '{activeLetter}':
            </label>
            <input
              type="text"
              value={answers.thing}
              disabled={!isPlaying}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswers({ ...answers, thing: e.target.value })}
              placeholder={`e.g. ${activeLetter}ook`}
              style={{
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: '#090d16',
                color: '#ffffff',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Primary Action Button */}
        {isPlaying ? (
          <button
            onClick={submitRound}
            className="btn-primary-glow"
            style={{
              padding: '16px',
              fontSize: '15px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            }}
          >
            STOP! Declare Lexicon Submission ⏱️
          </button>
        ) : (
          <button
            onClick={startRound}
            className="btn-primary-glow"
            style={{
              padding: '16px',
              fontSize: '15px',
              background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            }}
          >
            Initiate Next Round with Letter '{activeLetter}' →
          </button>
        )}

        {/* Round Scoring Comparison Grid */}
        {roundScore && botAnswers && (
          <div
            className="glass-card"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '15px', color: '#fbbf24' }}>Lexicon Assessment</strong>
              <span style={{ fontSize: '13.5px', color: '#34d399', fontWeight: 800 }}>
                You earned +{roundScore.player} pts | Opponents earned +{roundScore.opponent} pts
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                textAlign: 'center',
                fontSize: '13px',
              }}
            >
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                <span style={{ color: '#8492a6', fontSize: '11px', textTransform: 'uppercase' }}>Name</span>
                <div style={{ fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{answers.name || '—'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Opponent: {botAnswers.name}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                <span style={{ color: '#8492a6', fontSize: '11px', textTransform: 'uppercase' }}>Place</span>
                <div style={{ fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{answers.place || '—'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Opponent: {botAnswers.place}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                <span style={{ color: '#8492a6', fontSize: '11px', textTransform: 'uppercase' }}>Animal</span>
                <div style={{ fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{answers.animal || '—'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Opponent: {botAnswers.animal}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                <span style={{ color: '#8492a6', fontSize: '11px', textTransform: 'uppercase' }}>Thing</span>
                <div style={{ fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{answers.thing || '—'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Opponent: {botAnswers.thing}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
