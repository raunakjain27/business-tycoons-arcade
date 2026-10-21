import React, { useState, useEffect, useRef } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';
import { soundFx } from '../soundEffects';
import { useCelebrationStore } from '../celebrationStore';

interface TraitorPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  role: 'Loyalist' | 'Traitor';
  isAlive: boolean;
  hasShield: boolean;
  hasDagger: boolean;
  hasClueSecret: boolean;
  votes: number;
}

export const TraitorsGame: React.FC = () => {
  const { setView } = useHubStore();
  const { getOrCreateRoom } = useGameRoomStore();
  const { connectVoice, setTurnSpeaker } = useVoiceStore();

  const room = getOrCreateRoom('traitors', 'You (Faithful)', 12, 4);

  const [inLobby, setInLobby] = useState(!room.isGameStarted);
  const [phase, setPhase] = useState<'mission' | 'armory' | 'roundtable' | 'verdict' | 'night' | 'gameover'>('mission');
  const [dayNumber, setDayNumber] = useState(1);
  const [potSize, setPotSize] = useState(40000);
  const [players, setPlayers] = useState<TraitorPlayer[]>([]);
  const [roundtableSpeakerIdx, setRoundtableSpeakerIdx] = useState(0);
  const [speechTimer, setSpeechTimer] = useState(20);
  const [murderedPlayer, setMurderedPlayer] = useState<TraitorPlayer | null>(null);
  const [banishedPlayer, setBanishedPlayer] = useState<TraitorPlayer | null>(null);
  const [castleLog, setCastleLog] = useState<string[]>(['The castle gates lock. Traitors lurk in shadows.']);
  const [mysteryTwist, setMysteryTwist] = useState<string | null>(null);

  const addCastleLog = (msg: string) => {
    setCastleLog((prev) => [msg, ...prev.slice(0, 19)]);
  };

  const startMatchFromRoom = () => {
    const roomPlayers = [...room.players];
    while (roomPlayers.length < 5 && room.allowBots) {
      const idx = roomPlayers.length;
      roomPlayers.push({
        id: `bot-${idx}`,
        name: `Lord Bot ${idx} 🎩`,
        isBot: true,
        avatar: '🎩',
        isHost: false,
        color: '#831843',
      });
    }

    const totalCount = roomPlayers.length;
    const shuffled = Array.from({ length: totalCount }, (_, i) => i).sort(() => Math.random() - 0.5);
    const traitorIndices = new Set([shuffled[0], shuffled[1]]);

    const matchPlayers: TraitorPlayer[] = roomPlayers.map((rp, idx) => ({
      id: rp.id,
      name: rp.name,
      avatar: rp.avatar || '🗡️',
      isBot: rp.isBot,
      role: traitorIndices.has(idx) ? 'Traitor' : 'Loyalist',
      isAlive: true,
      hasShield: false,
      hasDagger: false,
      hasClueSecret: false,
      votes: 0,
    }));

    setPlayers(matchPlayers);
    connectVoice(matchPlayers.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));

    setDayNumber(1);
    setPotSize(40000);
    setMurderedPlayer(null);
    setBanishedPlayer(null);
    setMysteryTwist(null);
    setInLobby(false);
    setPhase('mission');
    addCastleLog(`🏰 The tournament begins in room ${room.roomCode}. Faithful and Traitors take their seats.`);
  };

  const completeDayMission = () => {
    const earned = Math.floor(Math.random() * 8000) + 7000;
    setPotSize((prev) => prev + earned);

    const twists = [
      'Loch Mist Discovery: Secret passages in the Armoury revealed.',
      'Cryptic Inscription: The traitor left a muddy glove by the fireplace.',
      'Highland Triumph: Full treasure chests recovered from the water!',
    ];
    setMysteryTwist(twists[Math.floor(Math.random() * twists.length)]);
    soundFx.playCashRegister();
    addCastleLog(`☀️ Day Mission complete! Added $${earned.toLocaleString()} to the Highland Pot.`);
    setPhase('armory');
  };

  const drawArmoryArtifact = () => {
    const aliveLoyalists = players.filter((p) => p.isAlive);
    const shieldHolder = aliveLoyalists[Math.floor(Math.random() * aliveLoyalists.length)];
    const daggerHolder = aliveLoyalists[Math.floor(Math.random() * aliveLoyalists.length)];

    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        hasShield: p.id === shieldHolder.id,
        hasDagger: p.id === daggerHolder.id,
      }))
    );

    soundFx.playCardSpecial();
    addCastleLog(`🛡️ Sacred Shield claimed by a guest! Immune to tonight’s murder.`);
    addCastleLog(`🗡️ Golden Dagger claimed! Holds double-weight vote at the Roundtable.`);

    setRoundtableSpeakerIdx(0);
    setSpeechTimer(20);
    setPhase('roundtable');
  };

  const livePlayers = players.filter((p) => p.isAlive);
  const currentSpeaker = livePlayers[roundtableSpeakerIdx % Math.max(1, livePlayers.length)];

  useEffect(() => {
    if (phase !== 'roundtable' || inLobby) return;
    if (currentSpeaker) {
      setTurnSpeaker(currentSpeaker.id);
    }

    const timer = setInterval(() => {
      setSpeechTimer((prev) => {
        if (prev <= 1) {
          passSpeakingTurn();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, inLobby, roundtableSpeakerIdx, livePlayers.length]);

  const passSpeakingTurn = () => {
    if (roundtableSpeakerIdx + 1 >= livePlayers.length) {
      setPhase('verdict');
    } else {
      setRoundtableSpeakerIdx((prev) => prev + 1);
      setSpeechTimer(20);
    }
  };

  const castRoundtableVote = (targetPlayerId: string) => {
    const voteTally: Record<string, number> = {};
    livePlayers.forEach((p) => (voteTally[p.id] = 0));

    const you = players[0];
    const yourWeight = you?.hasDagger ? 2 : 1;
    voteTally[targetPlayerId] = (voteTally[targetPlayerId] || 0) + yourWeight;

    livePlayers.forEach((p) => {
      if (p.isBot) {
        const others = livePlayers.filter((cand) => cand.id !== p.id);
        const picked = others[Math.floor(Math.random() * others.length)];
        const weight = p.hasDagger ? 2 : 1;
        voteTally[picked.id] = (voteTally[picked.id] || 0) + weight;
      }
    });

    let highestId = '';
    let maxV = -1;
    for (const [id, count] of Object.entries(voteTally)) {
      if (count > maxV) {
        maxV = count;
        highestId = id;
      }
    }

    const exiled = players.find((p) => p.id === highestId);
    if (exiled) {
      setBanishedPlayer(exiled);
      setPlayers((prev) =>
        prev.map((p) => (p.id === exiled.id ? { ...p, isAlive: false, votes: voteTally[p.id] || 0 } : p))
      );
      soundFx.playSnakeHiss();
      addCastleLog(`⚖️ BANISHED! ${exiled.name} received ${maxV} votes. Role revealed: ${exiled.role.toUpperCase()}!`);
    }

    checkWinCondition();
  };

  const executeNightMurder = (targetId?: string) => {
    const aliveFaithful = players.filter((p) => p.isAlive && p.role === 'Loyalist');
    const victim = targetId
      ? players.find((p) => p.id === targetId)
      : aliveFaithful[Math.floor(Math.random() * aliveFaithful.length)];

    if (victim) {
      if (victim.hasShield) {
        addCastleLog(`🛡️ ASSASSINATION BLOCKED! The Sacred Shield protected ${victim.name} from murder!`);
        setMurderedPlayer(null);
      } else {
        setPlayers((prev) => prev.map((p) => (p.id === victim.id ? { ...p, isAlive: false } : p)));
        setMurderedPlayer(victim);
        soundFx.playSnakeHiss();
        addCastleLog(`🩸 TURRET MURDER! The Traitors assassinated ${victim.name} in cold blood.`);
      }
    }

    setDayNumber((prev) => prev + 1);
    setPhase('mission');
    checkWinCondition();
  };

  const checkWinCondition = () => {
    const alive = players.filter((p) => p.isAlive);
    const traitors = alive.filter((p) => p.role === 'Traitor');
    const faithful = alive.filter((p) => p.role === 'Loyalist');

    if (traitors.length === 0) {
      setPhase('gameover');
      useCelebrationStore.getState().triggerVictory({
        gameTitle: 'Castle of Betrayal',
        winnerName: 'The Faithful',
        winnerAvatar: '🏰',
        coinsAwarded: 300,
        xpAwarded: 350,
        reason: 'All Traitors have been discovered and banished! The Faithful claim the silver pot!',
      });
      addLogToCastle('🎉 THE FAITHFUL WIN! Every Traitor has been rooted out of Highland Castle!');
    } else if (traitors.length >= faithful.length) {
      setPhase('gameover');
      useCelebrationStore.getState().triggerVictory({
        gameTitle: 'Castle of Betrayal',
        winnerName: 'The Traitors',
        winnerAvatar: '🗡️',
        coinsAwarded: 350,
        xpAwarded: 400,
        reason: 'The Traitors seized majority control of the Castle and claimed the grand pot!',
      });
      addLogToCastle('🩸 THE TRAITORS SEIZED THE CASTLE! They outnumber the Faithful and steal the pot!');
    }
  };

  const addLogToCastle = (msg: string) => {
    setCastleLog((prev) => [msg, ...prev.slice(0, 19)]);
  };

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="traitors"
        gameTitle="The Traitors: Highland Castle"
        gameIcon="🗡️"
        minPlayers={4}
        maxPlayers={12}
        onStart={startMatchFromRoom}
      />
    );
  }

  const you = players[0];

  return (
    <div
      style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <VoiceRoomBar gameTitle="The Traitors: Highland Castle" turnRestricted={phase === 'roundtable'} />

      {/* Atmospheric Castle Top Bar */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 22px',
          background: 'linear-gradient(135deg, rgba(20, 10, 30, 0.9) 0%, rgba(9, 6, 16, 0.95) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '18px',
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
          ⚙️ Castle Lobby ({room.roomCode})
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
            <span>🗡️</span>
            <span>The Traitors • Highland Castle</span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '2px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <span>Day {dayNumber}</span>
            <span>•</span>
            <span>
              Prize Pot: <strong style={{ color: '#fbbf24' }}>${potSize.toLocaleString()}</strong>
            </span>
            <span>•</span>
            <span>
              Role:{' '}
              <strong style={{ color: you?.role === 'Traitor' ? '#f43f5e' : '#38bdf8' }}>
                {you?.role.toUpperCase()}
              </strong>
            </span>
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
          🔄 Restart Siege
        </button>
      </div>

      {/* Main Castle Stage Area */}
      <div
        className="glass-panel"
        style={{
          background: 'radial-gradient(ellipse at top, #1a0f2e 0%, #080512 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85)',
        }}
      >
        {/* Phase 1: Day Mission */}
        {phase === 'mission' && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <span style={{ fontSize: '50px' }}>🏰⚔️💰</span>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '26px', fontWeight: 900 }}>
                Day {dayNumber}: Highland Loch Expedition
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '14.5px', maxWidth: '540px', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                Venture into the foggy highlands to haul silver chests and unlock ancient relics from the Armoury chamber!
              </p>
            </div>

            <div
              className="glass-card"
              style={{
                padding: '20px 48px',
                textAlign: 'center',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                background: 'rgba(10, 6, 20, 0.7)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>
                CURRENT HIGHLAND PRIZE POT
              </span>
              <div style={{ fontSize: '42px', fontWeight: 900, color: '#fbbf24', marginTop: '4px', textShadow: '0 0 25px rgba(245, 158, 11, 0.5)' }}>
                ${potSize.toLocaleString()}
              </div>
            </div>

            <button
              onClick={completeDayMission}
              className="btn-primary-glow"
              style={{
                padding: '16px 42px',
                fontSize: '15px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              }}
            >
              Complete Challenge & Unlock Armoury 🛡️
            </button>
          </div>
        )}

        {/* Phase 2: Armoury Artifacts */}
        {phase === 'armory' && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <span style={{ fontSize: '50px' }}>🛡️🗝️🗡️</span>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '26px', fontWeight: 900 }}>
                The Castle Armoury Chamber
              </h3>
              <p style={{ color: '#fbbf24', fontSize: '14px', maxWidth: '500px', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                {mysteryTwist || 'Two relics of sovereign power await: The Sacred Shield of Immunity and The Golden Dagger (2x Vote)!'}
              </p>
            </div>

            <button
              onClick={drawArmoryArtifact}
              className="btn-primary-glow"
              style={{
                padding: '16px 38px',
                fontSize: '15px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
              }}
            >
              Draw Artifacts & Enter Roundtable 🏛️
            </button>
          </div>
        )}

        {/* Phase 3: Roundtable Turn-Gated Discussion */}
        {phase === 'roundtable' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  marginBottom: '8px',
                }}
              >
                <span>🎙️</span>
                <span style={{ color: '#fca5a5', fontSize: '12px', fontWeight: 800 }}>
                  TURN-GATED SPEAKING FLOOR (Clock: {speechTimer}s)
                </span>
              </div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '24px', fontWeight: 900 }}>
                {currentSpeaker?.name} has the Floor
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                Only the spotlighted guest may speak. Declare your defense or expose deceit!
              </p>
            </div>

            {/* Speaking Spotlight Card */}
            <div
              className="glass-panel"
              style={{
                background: 'rgba(20, 14, 38, 0.85)',
                border: '2px solid #38bdf8',
                borderRadius: '20px',
                padding: '24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 0 35px rgba(56, 189, 248, 0.25)',
              }}
            >
              <div style={{ fontSize: '42px' }}>{currentSpeaker?.avatar}</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>
                {currentSpeaker?.name}
              </div>

              {/* Status Artifacts */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {currentSpeaker?.hasShield && (
                  <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>
                    🛡️ Protected by Shield
                  </span>
                )}
                {currentSpeaker?.hasDagger && (
                  <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid #f59e0b', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>
                    🗡️ Holds Golden Dagger (2x Vote)
                  </span>
                )}
              </div>

              <div style={{ fontSize: '36px', fontWeight: 900, color: speechTimer <= 5 ? '#ef4444' : '#38bdf8', fontFamily: 'ui-monospace, monospace' }}>
                {speechTimer}s
              </div>

              <button
                onClick={passSpeakingTurn}
                className="btn-primary-glow"
                style={{
                  padding: '10px 26px',
                  fontSize: '13px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                }}
              >
                Pass Floor to Next Guest →
              </button>
            </div>
          </div>
        )}

        {/* Phase 4: Voting Verdict */}
        {phase === 'verdict' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '24px', fontWeight: 900 }}>
                ⚖️ The Sacred Slate: Cast Your Banishment Vote
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                Inscribe an associate's name on your slate. Golden Dagger votes count DOUBLE!
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
              }}
            >
              {livePlayers.map((p) => (
                <div
                  key={p.id}
                  className="glass-card"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    border: p.id === you?.id ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '26px' }}>{p.avatar}</span>
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '14px' }}>{p.name}</strong>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                        {p.hasShield && <span title="Protected by Shield">🛡️</span>}
                        {p.hasDagger && <span title="Holds Golden Dagger (2x Vote)">🗡️</span>}
                      </div>
                    </div>
                  </div>

                  {p.id !== you?.id ? (
                    <button
                      onClick={() => castRoundtableVote(p.id)}
                      className="btn-primary-glow"
                      style={{
                        padding: '9px',
                        fontSize: '12.5px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                      }}
                    >
                      Banish {p.name.split(' ')[0]} ⚖️
                    </button>
                  ) : (
                    <span style={{ fontSize: '11.5px', color: '#64748b', textAlign: 'center' }}>(Your Slate)</span>
                  )}
                </div>
              ))}
            </div>

            {banishedPlayer && (
              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button
                  onClick={() => setPhase('night')}
                  className="btn-primary-glow"
                  style={{
                    padding: '14px 38px',
                    fontSize: '15px',
                    background: 'linear-gradient(135deg, #831843 0%, #9f1239 100%)',
                  }}
                >
                  Night Descends upon the Turret... (Proceed) 🌙
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase 5: Midnight Turret Murder */}
        {phase === 'night' && (
          <div
            style={{
              textAlign: 'center',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <span style={{ fontSize: '50px' }}>🌙🗡️🩸</span>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '26px', fontWeight: 900 }}>
              Midnight Turret Assassination
            </h3>

            {you?.role === 'Traitor' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <p style={{ color: '#fca5a5', fontSize: '14px', maxWidth: '480px', margin: 0 }}>
                  You are a hooded Traitor! Select which Faithful to assassinate in their bedchamber. Beware if they possess the Shield!
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {livePlayers.filter((p) => p.role === 'Loyalist' && p.id !== you?.id).map((cand) => (
                    <button
                      key={cand.id}
                      onClick={() => executeNightMurder(cand.id)}
                      className="btn-primary-glow"
                      style={{
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                        fontSize: '13px',
                      }}
                    >
                      Murder {cand.name} {cand.hasShield ? '🛡️' : ''}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: '#94a3b8', fontSize: '14.5px', maxWidth: '500px', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  You are asleep in your castle bedchamber. In the secret turret, the hooded Traitors deliver their death warrant...
                </p>
                <button
                  onClick={() => executeNightMurder()}
                  className="btn-primary-glow"
                  style={{
                    padding: '14px 34px',
                    fontSize: '15px',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                  }}
                >
                  Wake Up at Breakfast ☀️
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase 6: Game Over */}
        {phase === 'gameover' && (
          <div
            style={{
              textAlign: 'center',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <span style={{ fontSize: '60px' }}>🏰👑</span>
            <h3 style={{ margin: 0, fontSize: '28px', color: '#ffffff', fontWeight: 900 }}>
              Tournament Concluded
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0 }}>
              The final Highland Silver Pot of <strong style={{ color: '#fbbf24' }}>${potSize.toLocaleString()}</strong> has been claimed!
            </p>
            <button
              onClick={startMatchFromRoom}
              className="btn-primary-glow"
              style={{
                padding: '16px 40px',
                fontSize: '15px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              }}
            >
              Convene Another Highland Tournament 🗡️
            </button>
          </div>
        )}

        {/* Castle Chronicle Feed */}
        <div
          className="glass-card"
          style={{
            padding: '14px 18px',
            fontSize: '12px',
            color: '#94a3b8',
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        >
          <strong
            style={{
              color: '#f43f5e',
              display: 'block',
              marginBottom: '8px',
              fontSize: '11px',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
            }}
          >
            📜 Highland Castle Chronicle:
          </strong>
          {castleLog.map((c, i) => (
            <div
              key={i}
              style={{
                padding: '3px 0',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
