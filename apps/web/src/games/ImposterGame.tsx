import React, { useState } from 'react';
import { DESIGN_SYSTEM } from '../designSystem';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';

interface ImposterPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  isImposter: boolean;
  clue?: string;
  votesReceived: number;
  votedFor?: string;
}

const SECRET_CATEGORIES = [
  { category: 'Movies & Cinema', secret: 'Titanic', imposterHint: 'Ship / Ocean' },
  { category: 'Food & Drinks', secret: 'Pizza', imposterHint: 'Italian Fast Food' },
  { category: 'World Landmarks', secret: 'Eiffel Tower', imposterHint: 'European Monument' },
  { category: 'Animals', secret: 'Kangaroo', imposterHint: 'Australian Jumper' },
  { category: 'Tech & Inventions', secret: 'Smartphone', imposterHint: 'Everyday Gadget' },
  { category: 'Pop Music', secret: 'Michael Jackson', imposterHint: 'Moonwalk Dancer' },
];

export const ImposterGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice, setTurnSpeaker } = useVoiceStore();

  const room = getOrCreateRoom('imposter', 'You (Detective)', 10, 4);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const [phase, setPhase] = useState<'reveal' | 'clues' | 'voting' | 'verdict'>('reveal');
  const [players, setPlayers] = useState<ImposterPlayer[]>([]);
  const [secretTopic, setSecretTopic] = useState(SECRET_CATEGORIES[0]);
  const [myClueInput, setMyClueInput] = useState('');
  const [revealedSecret, setRevealedSecret] = useState(false);

  const startMatchFromRoom = () => {
    const pickedTopic = SECRET_CATEGORIES[Math.floor(Math.random() * SECRET_CATEGORIES.length)];
    setSecretTopic(pickedTopic);

    const roomPlayers = [...room.players];
    while (roomPlayers.length < 4 && room.allowBots) {
      const idx = roomPlayers.length;
      roomPlayers.push({
        id: `bot-${idx}`,
        name: `Bot Agent ${idx} 🤖`,
        isBot: true,
        avatar: '🤖',
        isHost: false,
        color: '#f43f5e',
      });
    }

    // Truly random imposter assignment
    const imposterIdx = Math.floor(Math.random() * roomPlayers.length);

    const matchPlayers: ImposterPlayer[] = roomPlayers.map((rp, idx) => ({
      id: rp.id,
      name: rp.name,
      avatar: rp.avatar || '🕵️',
      isBot: rp.isBot,
      isImposter: idx === imposterIdx,
      votesReceived: 0,
    }));

    setPlayers(matchPlayers);
    connectVoice(matchPlayers.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));

    setRevealedSecret(false);
    setMyClueInput('');
    setPhase('reveal');
    setInLobby(false);
  };

  const advanceToClues = () => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (!p.isBot) return p;
        if (p.isImposter) {
          const fakeClues = ['Very recognizable', 'Popular across culture', 'High energy vibe', 'Everyone uses this'];
          return { ...p, clue: fakeClues[Math.floor(Math.random() * fakeClues.length)] };
        } else {
          const realClues: Record<string, string[]> = {
            'Titanic': ['Iceberg in freezing waters', 'Violin players staying on deck', 'Huge passenger vessel'],
            'Pizza': ['Oven baked with cheese crust', 'Pepperoni topping slices', 'Delivery box favorite'],
            'Eiffel Tower': ['Iron lattice monument', 'Glows at midnight in Paris', 'Champ de Mars landmark'],
            'Kangaroo': ['Pouch with a joey baby', 'Hopping across Australia', 'Powerful back legs'],
            'Smartphone': ['Touchscreen glass slab', 'Pocket camera device', 'Endless mobile scrolling'],
            'Michael Jackson': ['King of Pop', 'Moonwalk dance step', 'Thriller music video'],
          };
          const pool = realClues[secretTopic.secret] || ['Distinct and unmistakable'];
          return { ...p, clue: pool[Math.floor(Math.random() * pool.length)] };
        }
      })
    );
    setPhase('clues');
  };

  const submitMyClue = () => {
    if (!myClueInput.trim()) return;
    setPlayers((prev) =>
      prev.map((p) => (p.id === 'player-1' || !p.isBot ? { ...p, clue: myClueInput.trim() } : p))
    );
    setPhase('voting');
  };

  const castVote = (targetPlayerId: string) => {
    const votes: Record<string, number> = {};
    players.forEach((p) => (votes[p.id] = 0));

    votes[targetPlayerId] = (votes[targetPlayerId] || 0) + 1;

    const imposter = players.find((p) => p.isImposter);
    players.forEach((p) => {
      if (p.isBot) {
        let votedTarget = targetPlayerId;
        if (p.isImposter) {
          const innocents = players.filter((cand) => !cand.isImposter);
          votedTarget = innocents[Math.floor(Math.random() * innocents.length)].id;
        } else {
          if (Math.random() < 0.65 && imposter) {
            votedTarget = imposter.id;
          } else {
            const others = players.filter((cand) => cand.id !== p.id);
            votedTarget = others[Math.floor(Math.random() * others.length)].id;
          }
        }
        votes[votedTarget] = (votes[votedTarget] || 0) + 1;
      }
    });

    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        votesReceived: votes[p.id] || 0,
      }))
    );

    setPhase('verdict');
  };

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="imposter"
        gameTitle="Imposter Party"
        gameIcon="🕵️"
        minPlayers={4}
        maxPlayers={10}
        bannerGradient="linear-gradient(135deg, DESIGN_SYSTEM.colors.caution 0%, DESIGN_SYSTEM.colors.purpleLight 100%)"
        onStart={startMatchFromRoom}
      />
    );
  }

  const you = players[0];
  const imposter = players.find((p) => p.isImposter);
  const highestVoted = [...players].sort((a, b) => b.votesReceived - a.votesReceived)[0];

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Voice Room Bar */}
      <VoiceRoomBar gameTitle="Imposter Party" turnRestricted={phase === 'voting'} />

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
            <span>🕵️</span> Imposter Party
          </h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Phase: <strong style={{ color: '#f43f5e', textTransform: 'uppercase' }}>{phase}</strong>
          </span>
        </div>

        <button
          onClick={startMatchFromRoom}
          style={{
            background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(244, 63, 94, 0.4)',
          }}
        >
          Next Round
        </button>
      </div>

      {/* Main Container */}
      <div
        style={{
          background: 'rgba(30, 24, 55, 0.85)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '24px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}
      >
        {/* Phase 1: Reveal */}
        {phase === 'reveal' && (
          <div style={{ textAlign: 'center', padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Round Category: <strong style={{ color: '#fff' }}>{secretTopic.category}</strong>
            </span>

            <div
              onClick={() => setRevealedSecret(!revealedSecret)}
              style={{
                width: '100%',
                maxWidth: '420px',
                padding: '36px 24px',
                borderRadius: '20px',
                background: you?.isImposter
                  ? 'linear-gradient(135deg, #f43f5e 0%, #881337 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.7)',
                cursor: 'pointer',
                transform: 'scale(1.02)',
                transition: 'all 0.2s ease',
              }}
            >
              {!revealedSecret ? (
                <div>
                  <span style={{ fontSize: '36px' }}>🔒</span>
                  <div style={{ marginTop: '10px', color: '#ffffff', fontWeight: 800, fontSize: '16px' }}>
                    Tap to Secretly Reveal Your Role
                  </div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Keep your screen hidden from friends!</span>
                </div>
              ) : you?.isImposter ? (
                <div>
                  <span style={{ fontSize: '36px' }}>🕵️</span>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', marginTop: '6px' }}>
                    YOU ARE THE IMPOSTER!
                  </div>
                  <p style={{ fontSize: '13px', color: '#fecdd3', margin: '10px 0 0 0', lineHeight: 1.4 }}>
                    You have NO secret word! Blend in, bluff your clue, and guess the word!
                  </p>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: '36px' }}>✨</span>
                  <div style={{ fontSize: '12px', color: '#bfdbfe', textTransform: 'uppercase', fontWeight: 700 }}>
                    Secret Word
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', marginTop: '4px' }}>
                    {secretTopic.secret}
                  </div>
                  <span style={{ fontSize: '12px', color: '#bfdbfe' }}>You are a Crewmate. Catch the bluffer!</span>
                </div>
              )}
            </div>

            <button
              onClick={advanceToClues}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                color: '#fff',
                padding: '12px 28px',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(236,72,153,0.4)',
              }}
            >
              Proceed to Clue Round →
            </button>
          </div>
        )}

        {/* Phase 2: Clues */}
        {phase === 'clues' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '22px' }}>🗣️ Clue Round</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                Give one subtle clue without giving the secret away to the Imposter!
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {players.filter((p) => p.id !== you?.id).map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span>{p.avatar}</span>
                    <strong style={{ color: '#c084fc', fontSize: '13px' }}>{p.name}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#f8fafc', fontStyle: 'italic' }}>
                    "{p.clue || 'Thinking of a clue...'}"
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '14px', color: '#f8fafc', fontWeight: 800 }}>Your Clue ({you?.name}):</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={myClueInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMyClueInput(e.target.value)}
                  onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && submitMyClue()}
                  placeholder="e.g. Needs freezing ice to stay afloat"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={submitMyClue}
                  disabled={!myClueInput.trim()}
                  style={{
                    background: myClueInput.trim() ? '#f43f5e' : '#475569',
                    color: '#fff',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 800,
                    cursor: myClueInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Submit Clue 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Voting */}
        {phase === 'voting' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '22px' }}>🗳️ Cast Your Banishment Vote</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Review all submitted clues and click who you suspect.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {players.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{p.avatar}</span>
                      <strong style={{ color: '#c084fc', fontSize: '15px' }}>{p.name}</strong>
                    </div>
                    <p style={{ fontSize: '13px', color: '#e2e8f0', fontStyle: 'italic', margin: 0 }}>
                      "{p.clue}"
                    </p>
                  </div>
                  {p.id !== you?.id ? (
                    <button
                      onClick={() => castVote(p.id)}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#fff',
                        padding: '10px',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
                      }}
                    >
                      Vote Out {p.name.split(' ')[0]}
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 4: Verdict */}
        {phase === 'verdict' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
            <span style={{ fontSize: '56px', animation: 'bounce 0.8s infinite alternate' }}>
              {highestVoted?.isImposter ? '🎉' : '💀'}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px', color: highestVoted?.isImposter ? '#4ade80' : '#f87171' }}>
                {highestVoted?.isImposter
                  ? `Victory! ${highestVoted.name} was the IMPOSTER!`
                  : `Mistake! ${highestVoted?.name} was an INNOCENT Crewmate!`}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '15px', marginTop: '8px' }}>
                The true Imposter was: <strong style={{ color: '#f43f5e' }}>{imposter?.name}</strong>
                <br />
                The secret word was: <strong style={{ color: '#38bdf8' }}>{secretTopic.secret}</strong>
              </p>
            </div>

            <button
              onClick={startMatchFromRoom}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                color: '#fff',
                padding: '14px 36px',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(236,72,153,0.5)',
              }}
            >
              Play Another Mystery Round 🎲
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
