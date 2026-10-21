import React, { useState } from 'react';
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
  const { connectVoice } = useVoiceStore();

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
        name: `Agent Bot ${idx} 🤖`,
        isBot: true,
        avatar: '🤖',
        isHost: false,
        color: '#f43f5e',
      });
    }

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
        gameTitle="The Tribunal (Imposter)"
        gameIcon="🕵️"
        minPlayers={4}
        maxPlayers={10}
        onStart={startMatchFromRoom}
      />
    );
  }

  const you = players[0];
  const imposter = players.find((p) => p.isImposter);
  const highestVoted = [...players].sort((a, b) => b.votesReceived - a.votesReceived)[0];

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
      <VoiceRoomBar gameTitle="The Tribunal (Imposter)" turnRestricted={phase === 'voting'} />

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
            <span>🕵️</span>
            <span>The Tribunal Chamber</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Phase:{' '}
            <strong style={{ color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              {phase}
            </strong>
          </div>
        </div>

        <button
          onClick={startMatchFromRoom}
          className="btn-tactile-secondary"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            color: '#f43f5e',
            borderColor: 'rgba(244, 63, 94, 0.3)',
          }}
        >
          🔄 New Investigation
        </button>
      </div>

      {/* Main Dossier Arena */}
      <div
        className="glass-panel"
        style={{
          padding: '32px 24px',
          background: 'linear-gradient(135deg, rgba(14, 19, 32, 0.9) 0%, rgba(8, 12, 20, 0.98) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Phase 1: Reveal Dossier */}
        {phase === 'reveal' && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#fbbf24',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Investigation Domain: <strong style={{ color: '#ffffff' }}>{secretTopic.category}</strong>
            </span>

            {/* Confidential Dossier Envelope */}
            <div
              onClick={() => setRevealedSecret(!revealedSecret)}
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '460px',
                padding: '36px 24px',
                borderRadius: '20px',
                border: you?.isImposter
                  ? '2px solid rgba(244, 63, 94, 0.5)'
                  : '2px solid rgba(56, 189, 248, 0.5)',
                background: you?.isImposter
                  ? 'radial-gradient(ellipse at center, rgba(136, 19, 55, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)'
                  : 'radial-gradient(ellipse at center, rgba(30, 58, 138, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {!revealedSecret ? (
                <div>
                  <span style={{ fontSize: '42px', display: 'block', marginBottom: '10px' }}>🔒</span>
                  <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '18px' }}>
                    Tap to Unseal Confidential Dossier
                  </div>
                  <span style={{ fontSize: '12px', color: '#8492a6', marginTop: '6px', display: 'block' }}>
                    Ensure other associates cannot glance at your screen!
                  </span>
                </div>
              ) : you?.isImposter ? (
                <div>
                  <span style={{ fontSize: '44px', display: 'block', marginBottom: '8px' }}>🕵️</span>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#f43f5e' }}>
                    YOU ARE THE INFILTRATOR!
                  </div>
                  <p style={{ fontSize: '13px', color: '#fecdd3', margin: '10px 0 0 0', lineHeight: 1.5 }}>
                    You have NO secret word. Deliberate cautiously, mirror others’ cues, and avoid suspicion.
                  </p>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: '40px', display: 'block', marginBottom: '6px' }}>📜</span>
                  <span style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 800 }}>
                    Classified Word
                  </span>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>
                    {secretTopic.secret}
                  </div>
                  <span style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>
                    You are Loyal. Listen carefully to uncover who is feigning knowledge!
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={advanceToClues}
              className="btn-primary-glow"
              style={{
                padding: '14px 36px',
                fontSize: '15px',
                background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                boxShadow: '0 8px 24px rgba(244, 63, 94, 0.4)',
              }}
            >
              Open Clue Hearing →
            </button>
          </div>
        )}

        {/* Phase 2: Clues */}
        {phase === 'clues' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '22px', fontWeight: 900 }}>
                🗣️ Clue Hearing
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                Offer one subtle testimony without disclosing the classified secret to the Infiltrator.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
              {players.filter((p) => p.id !== you?.id).map((p) => (
                <div
                  key={p.id}
                  className="glass-card"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{p.avatar}</span>
                    <strong style={{ color: '#38bdf8', fontSize: '13.5px' }}>{p.name}</strong>
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#f8fafc', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{p.clue || 'Formulating testimony...'}"
                  </div>
                </div>
              ))}
            </div>

            <div
              className="glass-card"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: 'rgba(5, 10, 20, 0.7)',
              }}
            >
              <label style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: 800 }}>
                Your Testimony ({you?.name}):
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={myClueInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMyClueInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && submitMyClue()}
                  placeholder="e.g. Needs freezing ice to stay afloat"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: '#090d16',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={submitMyClue}
                  disabled={!myClueInput.trim()}
                  className="btn-primary-glow"
                  style={{
                    padding: '12px 24px',
                    fontSize: '13.5px',
                    background: myClueInput.trim()
                      ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
                      : '#334155',
                    cursor: myClueInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Record Clue 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Voting */}
        {phase === 'voting' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '22px', fontWeight: 900 }}>
                🗳️ Cast Banishment Ballot
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                Review all submitted testimonies and vote for the suspected Infiltrator.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
              {players.map((p) => (
                <div
                  key={p.id}
                  className="glass-card"
                  style={{
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '22px' }}>{p.avatar}</span>
                      <strong style={{ color: '#f8fafc', fontSize: '14.5px' }}>{p.name}</strong>
                    </div>
                    <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
                      "{p.clue}"
                    </p>
                  </div>

                  {p.id !== you?.id ? (
                    <button
                      onClick={() => castVote(p.id)}
                      className="btn-primary-glow"
                      style={{
                        padding: '10px',
                        fontSize: '12.5px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                      }}
                    >
                      Banish {p.name.split(' ')[0]} ⚖️
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>(Your Profile)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 4: Verdict */}
        {phase === 'verdict' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
            <span style={{ fontSize: '56px' }}>
              {highestVoted?.isImposter ? '🎉' : '💀'}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: highestVoted?.isImposter ? '#34d399' : '#fb7185' }}>
                {highestVoted?.isImposter
                  ? `Tribunal Victory! ${highestVoted.name} was the Infiltrator!`
                  : `Miscarriage of Justice! ${highestVoted?.name} was an Innocent Member!`}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px', lineHeight: 1.5 }}>
                The true Infiltrator was: <strong style={{ color: '#f43f5e' }}>{imposter?.name}</strong>
                <br />
                The classified secret was: <strong style={{ color: '#38bdf8' }}>{secretTopic.secret}</strong>
              </p>
            </div>

            <button
              onClick={startMatchFromRoom}
              className="btn-primary-glow"
              style={{
                padding: '14px 38px',
                fontSize: '15px',
                background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              }}
            >
              Convene Next Inquiry 🎲
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
