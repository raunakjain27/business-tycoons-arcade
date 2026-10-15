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
    let interval: NodeJS.Timeout;
    if (isPlaying && timerSec > 0) {
      interval = setInterval(() => {
        setTimerSec((prev) => prev - 1);
      }, 1000);
    } else if (timerSec === 0 && isPlaying) {
      submitRound();
    }
    return () => clearInterval(interval);
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
        gameTitle="Name Place Animal Thing"
        gameIcon="📝"
        minPlayers={2}
        maxPlayers={8}
        bannerGradient="linear-gradient(135deg, #eab308 0%, #ef4444 100%)"
        onStart={startMatchFromRoom}
      />
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Voice Room Bar */}
      <VoiceRoomBar gameTitle="Name Place Animal Thing" turnRestricted={false} />

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)',
          padding: '12px 20px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <button
          onClick={() => setInLobby(true)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#cbd5e1',
            padding: '6px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '12px',
          }}
        >
          ⚙️ Room Lobby ({room.roomCode})
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <span>📝</span> Name Place Animal Thing
          </h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Total Score: You <strong style={{ color: '#4ade80' }}>{totalScore.player}</strong> - Opponents <strong style={{ color: '#f43f5e' }}>{totalScore.opponent}</strong>
          </span>
        </div>

        <button
          onClick={startRound}
          style={{
            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            border: 'none',
            color: '#1e293b',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 900,
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.4)',
          }}
        >
          {isPlaying ? 'Restart Letter' : 'Next Letter 🔤'}
        </button>
      </div>

      {/* Main Arena */}
      <div
        style={{
          background: 'rgba(30, 24, 55, 0.85)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '24px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.04)',
            padding: '24px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              ACTIVE LETTER
            </span>
            <div
              style={{
                fontSize: '64px',
                fontWeight: 900,
                color: '#f59e0b',
                textShadow: '0 0 25px rgba(245, 158, 11, 0.6)',
                animation: 'pulse 2s infinite',
              }}
            >
              {activeLetter}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              COUNTDOWN
            </span>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 900,
                color: timerSec <= 10 ? '#ef4444' : '#38bdf8',
                textShadow: timerSec <= 10 ? '0 0 20px rgba(239, 68, 68, 0.6)' : 'none',
              }}
            >
              {timerSec}s
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#c084fc' }}>👤 Name starting with '{activeLetter}':</label>
            <input
              type="text"
              value={answers.name}
              disabled={!isPlaying}
              onChange={(e) => setAnswers({ ...answers, name: e.target.value })}
              placeholder={`e.g. ${activeLetter}ob`}
              style={{ padding: '14px', borderRadius: '10px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>🌍 Place starting with '{activeLetter}':</label>
            <input
              type="text"
              value={answers.place}
              disabled={!isPlaying}
              onChange={(e) => setAnswers({ ...answers, place: e.target.value })}
              placeholder={`e.g. ${activeLetter}erlin`}
              style={{ padding: '14px', borderRadius: '10px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#4ade80' }}>🦁 Animal starting with '{activeLetter}':</label>
            <input
              type="text"
              value={answers.animal}
              disabled={!isPlaying}
              onChange={(e) => setAnswers({ ...answers, animal: e.target.value })}
              placeholder={`e.g. ${activeLetter}ear`}
              style={{ padding: '14px', borderRadius: '10px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#f43f5e' }}>📦 Thing starting with '{activeLetter}':</label>
            <input
              type="text"
              value={answers.thing}
              disabled={!isPlaying}
              onChange={(e) => setAnswers({ ...answers, thing: e.target.value })}
              placeholder={`e.g. ${activeLetter}ook`}
              style={{ padding: '14px', borderRadius: '10px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
          </div>
        </div>

        {isPlaying ? (
          <button
            onClick={submitRound}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
            }}
          >
            STOP! Submit Answers ⏱️
          </button>
        ) : (
          <button
            onClick={startRound}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            Play Next Round with Letter '{activeLetter}' →
          </button>
        )}

        {roundScore && botAnswers && (
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '16px', color: '#c084fc' }}>Round Results</strong>
              <span style={{ fontSize: '14px', color: '#4ade80', fontWeight: 700 }}>
                You earned +{roundScore.player} pts | Opponents earned +{roundScore.opponent} pts
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center', fontSize: '13px' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px' }}>
                <span style={{ color: '#94a3b8' }}>Name</span>
                <div style={{ fontWeight: 800, color: '#fff', marginTop: '2px' }}>{answers.name || '—'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Opponent: {botAnswers.name}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px' }}>
                <span style={{ color: '#94a3b8' }}>Place</span>
                <div style={{ fontWeight: 800, color: '#fff', marginTop: '2px' }}>{answers.place || '—'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Opponent: {botAnswers.place}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px' }}>
                <span style={{ color: '#94a3b8' }}>Animal</span>
                <div style={{ fontWeight: 800, color: '#fff', marginTop: '2px' }}>{answers.animal || '—'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Opponent: {botAnswers.animal}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px' }}>
                <span style={{ color: '#94a3b8' }}>Thing</span>
                <div style={{ fontWeight: 800, color: '#fff', marginTop: '2px' }}>{answers.thing || '—'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Opponent: {botAnswers.thing}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
