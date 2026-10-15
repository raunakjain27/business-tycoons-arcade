import React, { useState, useEffect } from 'react';
import { useHubStore } from '../hubStore';
import { useGameRoomStore } from '../gameRoomStore';
import { useVoiceStore } from '../voiceStore';
import { GameRoomLobby } from '../components/GameRoomLobby';
import { VoiceRoomBar } from '../components/VoiceRoomBar';

interface TraitorPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  role: 'Loyalist' | 'Traitor';
  isAlive: boolean;
  hasShield: boolean;      // 🛡️ Immune to night murder
  hasDagger: boolean;      // 🗡️ Holds double-weight vote at roundtable
  hasClueSecret: boolean;  // 📜 Secret discovery from mission
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
  const [speechTimer, setSpeechTimer] = useState(20); // 20s speaking clock
  const [murderedPlayer, setMurderedPlayer] = useState<TraitorPlayer | null>(null);
  const [banishedPlayer, setBanishedPlayer] = useState<TraitorPlayer | null>(null);
  const [recruitmentOffered, setRecruitmentOffered] = useState<boolean>(false);
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

    // Truly unbiased and uniformly random Traitor assignment
    // Pick 2 random distinct indices
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

  // Day Mission: Silver Challenge
  const completeDayMission = () => {
    const earned = Math.floor(Math.random() * 8000) + 7000;
    setPotSize((prev) => prev + earned);

    const twists = [
      '⚡ The Armoury doors have opened! One secret Shield and one Dagger are hidden!',
      '🗝️ Mission Discovery: A secret parchment was unearthed in the crypt!',
      '🔥 Golden Challenge Complete: +$' + earned.toLocaleString() + ' added to the Grand Prize Pot!',
    ];
    const pickedTwist = twists[Math.floor(Math.random() * twists.length)];
    setMysteryTwist(pickedTwist);
    addCastleLog(`🏰 Castle Mission Complete! ${pickedTwist}`);
    setPhase('armory');
  };

  // Armory Discovery (Shield and Dagger distribution)
  const drawArmoryArtifact = () => {
    const liveFaithful = players.filter((p) => p.isAlive);
    const shieldRecipient = liveFaithful[Math.floor(Math.random() * liveFaithful.length)];
    const daggerRecipient = liveFaithful[Math.floor(Math.random() * liveFaithful.length)];

    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        hasShield: p.id === shieldRecipient.id,
        hasDagger: p.id === daggerRecipient.id,
      }))
    );

    addCastleLog(`🛡️ The Sacred Shield was won by ${shieldRecipient.name}! (Protected tonight)`);
    if (daggerRecipient.id !== shieldRecipient.id) {
      addCastleLog(`🗡️ The Golden Dagger was claimed by ${daggerRecipient.name}! (Double vote power)`);
    }

    startRoundtableFloor();
  };

  // Start Roundtable Discussion with TURN-GATED MIC
  const startRoundtableFloor = () => {
    setPhase('roundtable');
    setRoundtableSpeakerIdx(0);
    setSpeechTimer(20);

    const live = players.filter((p) => p.isAlive);
    if (live.length > 0) {
      setTurnSpeaker(live[0].id);
      addCastleLog(`🎙️ Roundtable floor opens! ${live[0].name} has the speaking floor for 20s.`);
    }
  };

  // Countdown clock for Roundtable speaking turn
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'roundtable' && speechTimer > 0) {
      timer = setInterval(() => {
        setSpeechTimer((prev) => prev - 1);
      }, 1000);
    } else if (phase === 'roundtable' && speechTimer === 0) {
      passSpeakingTurn();
    }
    return () => clearInterval(timer);
  }, [phase, speechTimer, roundtableSpeakerIdx]);

  const passSpeakingTurn = () => {
    const live = players.filter((p) => p.isAlive);
    const nextIdx = roundtableSpeakerIdx + 1;

    if (nextIdx < live.length) {
      setRoundtableSpeakerIdx(nextIdx);
      setSpeechTimer(20);
      setTurnSpeaker(live[nextIdx].id);
      addCastleLog(`🎙️ Speaking floor passed to ${live[nextIdx].name} (20s).`);
    } else {
      // All players had their speaking turn! Move to voting verdict
      setTurnSpeaker(null);
      setPhase('verdict');
      addCastleLog(`⚖️ Discussion closed. The Sacred Chalk slate voting begins!`);
    }
  };

  // Cast Banishment Vote
  const castRoundtableVote = (targetId: string) => {
    const live = players.filter((p) => p.isAlive);
    const voteMap: Record<string, number> = {};
    live.forEach((p) => (voteMap[p.id] = 0));

    // Player vote (if player has dagger, vote counts x2)
    const you = live.find((p) => p.id === 'player-1');
    const playerWeight = you?.hasDagger ? 2 : 1;
    voteMap[targetId] = (voteMap[targetId] || 0) + playerWeight;

    // Bot votes
    live.filter((p) => p.isBot).forEach((bot) => {
      const candidates = live.filter((cand) => cand.id !== bot.id);
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const weight = bot.hasDagger ? 2 : 1;
      voteMap[chosen.id] = (voteMap[chosen.id] || 0) + weight;
    });

    let maxVotes = -1;
    let banishedId = targetId;
    for (const [id, count] of Object.entries(voteMap)) {
      if (count > maxVotes) {
        maxVotes = count;
        banishedId = id;
      }
    }

    const victim = players.find((p) => p.id === banishedId)!;
    setBanishedPlayer(victim);

    setPlayers((prev) =>
      prev.map((p) => (p.id === banishedId ? { ...p, isAlive: false, votes: voteMap[p.id] || 0 } : { ...p, votes: voteMap[p.id] || 0 }))
    );

    addCastleLog(`⚖️ The Roundtable has banished ${victim.name}! They step to the Circle of Truth...`);
    addCastleLog(`🔥 ${victim.name} reveals: "I am a ${victim.role.toUpperCase()}!"`);

    // Check if Traitors are down to 1 (Twist: Seduce/Recruit a Faithful!)
    const remainingTraitors = players.filter((p) => p.isAlive && p.id !== banishedId && p.role === 'Traitor');
    if (remainingTraitors.length === 1 && !recruitmentOffered) {
      setRecruitmentOffered(true);
      addCastleLog(`🔮 Dark Omen: A single Traitor remains. An ultimatum of RECRUITMENT will be delivered tonight!`);
    }

    checkGameOver();
  };

  // Midnight Murder Phase (Checks Shield!)
  const executeNightMurder = (targetId?: string) => {
    const liveFaithful = players.filter((p) => p.isAlive && p.role === 'Loyalist');
    if (liveFaithful.length === 0) {
      checkGameOver();
      return;
    }

    let victimId = targetId;
    if (!victimId) {
      const target = liveFaithful[Math.floor(Math.random() * liveFaithful.length)];
      victimId = target.id;
    }

    const victim = players.find((p) => p.id === victimId)!;

    // SHIELD CHECK!
    if (victim.hasShield) {
      addCastleLog(`🛡️ MIRACLE! The Traitors struck in the night, but ${victim.name}'s SHIELD deflected the murder! NO ONE DIED!`);
      setMurderedPlayer(null);
    } else {
      setMurderedPlayer(victim);
      setPlayers((prev) =>
        prev.map((p) => (p.id === victimId ? { ...p, isAlive: false } : p))
      );
      addCastleLog(`🗡️ Murder at midnight! ${victim.name} was slain by the Traitors!`);
    }

    // Reset daily shields & daggers
    setPlayers((prev) => prev.map((p) => ({ ...p, hasShield: false, hasDagger: false })));
    setDayNumber((prev) => prev + 1);
    setPhase('mission');

    checkGameOver();
  };

  const checkGameOver = () => {
    const live = players.filter((p) => p.isAlive);
    const liveTraitors = live.filter((p) => p.role === 'Traitor');
    const liveFaithful = live.filter((p) => p.role === 'Loyalist');

    if (liveTraitors.length === 0) {
      addCastleLog('🏆 TRIUMPH! ALL TRAITORS BANISHED! The Faithful win the grand pot of $' + potSize.toLocaleString() + '!');
      setPhase('gameover');
    } else if (liveTraitors.length >= liveFaithful.length) {
      addCastleLog('💀 TREACHERY! Traitors have seized control of the castle and stolen the entire prize pot!');
      setPhase('gameover');
    }
  };

  if (inLobby) {
    return (
      <GameRoomLobby
        gameId="traitors"
        gameTitle="The Traitors: Highland Castle"
        gameIcon="🗡️"
        minPlayers={4}
        maxPlayers={12}
        bannerGradient="linear-gradient(135deg, #831843 0%, #1e1b4b 100%)"
        onStart={startMatchFromRoom}
      />
    );
  }

  const you = players[0];
  const livePlayers = players.filter((p) => p.isAlive);
  const currentSpeaker = livePlayers[roundtableSpeakerIdx];

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Voice Room Bar (Turn-Gated in Roundtable!) */}
      <VoiceRoomBar gameTitle="The Traitors" turnRestricted={phase === 'roundtable'} />

      {/* Atmospheric Castle Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f0b1a 100%)',
          backdropFilter: 'blur(12px)',
          padding: '16px 24px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          flexWrap: 'wrap',
          gap: '12px',
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
          ⚙️ Castle Lobby ({room.roomCode})
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <span>🗡️</span> The Traitors: Highland Castle
          </h2>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Day {dayNumber} | Pot: <strong style={{ color: '#f59e0b' }}>${potSize.toLocaleString()}</strong> | Role:{' '}
            <strong style={{ color: you?.role === 'Traitor' ? '#f43f5e' : '#38bdf8' }}>
              {you?.role.toUpperCase()}
            </strong>
          </span>
        </div>

        <button
          onClick={startMatchFromRoom}
          style={{
            background: 'linear-gradient(135deg, #831843 0%, #9f1239 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '12px',
            boxShadow: '0 4px 15px rgba(131,24,67,0.5)',
          }}
        >
          Restart Match
        </button>
      </div>

      {/* Main Castle Stage Area */}
      <div
        style={{
          background: 'radial-gradient(ellipse at top, #1e1435 0%, #080511 100%)',
          borderRadius: '24px',
          border: '2px solid rgba(255,255,255,0.12)',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: '0 30px 70px rgba(0,0,0,0.85)',
          position: 'relative',
        }}
      >
        {/* Phase 1: Day Mission */}
        {phase === 'mission' && (
          <div style={{ textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '52px', animation: 'bounce 0.8s infinite alternate' }}>🏰☀️⚔️</span>
            <div>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '26px', fontWeight: 900 }}>
                Day {dayNumber}: Highland Loch Mission
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '520px', margin: '8px 0 0 0' }}>
                Cooperate across the foggy loch to build the treasure chest and claim artifacts from the ancient armoury!
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '20px 48px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
                CURRENT PRIZE POT
              </span>
              <div style={{ fontSize: '42px', fontWeight: 900, color: '#f59e0b', textShadow: '0 0 30px rgba(245, 158, 11, 0.6)' }}>
                ${potSize.toLocaleString()}
              </div>
            </div>

            <button
              onClick={completeDayMission}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                padding: '16px 40px',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 900,
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
              }}
            >
              Complete Challenge & Unlock Armoury 🛡️
            </button>
          </div>
        )}

        {/* Phase 2: Armoury Artifacts */}
        {phase === 'armory' && (
          <div style={{ textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '50px' }}>🛡️🗝️🗡️</span>
            <div>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '26px' }}>The Armoury Chamber</h3>
              <p style={{ color: '#fde047', fontSize: '14px', maxWidth: '480px', margin: '8px 0 0 0' }}>
                {mysteryTwist || 'Two relics of power are locked inside: The Sacred Shield and Golden Dagger!'}
              </p>
            </div>

            <button
              onClick={drawArmoryArtifact}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#1e1b4b',
                padding: '16px 36px',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 900,
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)',
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
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  marginBottom: '10px',
                }}
              >
                <span>🎙️</span>
                <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 800 }}>
                  TURN-GATED SPEAKING FLOOR (Clock: {speechTimer}s)
                </span>
              </div>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '24px' }}>
                {currentSpeaker?.name} has the Floor
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                Only the spotlighted player can speak. State your defense or cast suspicions!
              </p>
            </div>

            {/* Speaking Spotlight Card */}
            <div
              style={{
                background: 'rgba(124, 58, 237, 0.25)',
                border: '2px solid #a855f7',
                borderRadius: '20px',
                padding: '24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)',
              }}
            >
              <div style={{ fontSize: '42px' }}>{currentSpeaker?.avatar}</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#f8fafc' }}>
                {currentSpeaker?.name}
              </div>

              {/* Status artifacts badges */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {currentSpeaker?.hasShield && (
                  <span style={{ background: '#10b98133', color: '#6ee7b7', border: '1px solid #10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                    🛡️ Protected by Shield
                  </span>
                )}
                {currentSpeaker?.hasDagger && (
                  <span style={{ background: '#f59e0b33', color: '#fcd34d', border: '1px solid #f59e0b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                    🗡️ Holds Golden Dagger (2x Vote)
                  </span>
                )}
              </div>

              <div style={{ fontSize: '32px', fontWeight: 900, color: speechTimer <= 5 ? '#ef4444' : '#38bdf8' }}>
                {speechTimer}s
              </div>

              <button
                onClick={passSpeakingTurn}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
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
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '24px' }}>
                ⚖️ The Sacred Chalk Slate: Cast Your Banishment Vote
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                Write a player's name on your slate. Golden Dagger votes count DOUBLE!
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {livePlayers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: p.id === you?.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '26px' }}>{p.avatar}</span>
                    <div>
                      <strong style={{ color: '#f8fafc', fontSize: '14px' }}>{p.name}</strong>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                        {p.hasShield && <span>🛡️</span>}
                        {p.hasDagger && <span>🗡️</span>}
                      </div>
                    </div>
                  </div>

                  {p.id !== you?.id ? (
                    <button
                      onClick={() => castRoundtableVote(p.id)}
                      style={{
                        background: 'linear-gradient(135deg, #831843 0%, #9f1239 100%)',
                        color: '#fff',
                        padding: '10px',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(131,24,67,0.4)',
                      }}
                    >
                      Banish {p.name.split(' ')[0]}
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>(Your Slate)</span>
                  )}
                </div>
              ))}
            </div>

            {banishedPlayer && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  onClick={() => setPhase('night')}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                    color: '#fff',
                    padding: '14px 36px',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 900,
                    fontSize: '15px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(236,72,153,0.4)',
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
          <div style={{ textAlign: 'center', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '52px', animation: 'pulse 1.5s infinite' }}>🌙🗡️🩸</span>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '26px' }}>Midnight Turret Murder</h3>

            {you?.role === 'Traitor' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <p style={{ color: '#fca5a5', fontSize: '15px', maxWidth: '460px', margin: 0 }}>
                  You are a Traitor! Select which Faithful to assassinate in their chambers. Beware if they possess the Shield!
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {livePlayers.filter((p) => p.role === 'Loyalist' && p.id !== you?.id).map((cand) => (
                    <button
                      key={cand.id}
                      onClick={() => executeNightMurder(cand.id)}
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        padding: '12px 20px',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 6px 18px rgba(239,68,68,0.4)',
                      }}
                    >
                      Murder {cand.name} {cand.hasShield ? '🛡️' : ''}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '480px', margin: '0 0 16px 0' }}>
                  You are asleep in your castle bedchamber. In the secret turret, the hooded Traitors deliver their death warrant...
                </p>
                <button
                  onClick={() => executeNightMurder()}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff',
                    padding: '14px 32px',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(239,68,68,0.4)',
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
          <div style={{ textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '64px' }}>🏰👑</span>
            <h3 style={{ margin: 0, fontSize: '28px', color: '#f8fafc' }}>Championship Concluded</h3>
            <p style={{ color: '#94a3b8', fontSize: '16px' }}>
              Final Silver Pot of <strong style={{ color: '#f59e0b' }}>${potSize.toLocaleString()}</strong> has been claimed!
            </p>
            <button
              onClick={startMatchFromRoom}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                color: '#fff',
                padding: '16px 40px',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 900,
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Play Another Castle Mystery 🗡️
            </button>
          </div>
        )}

        {/* Chronicle Feed */}
        <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '18px', padding: '16px', fontSize: '12px', color: '#94a3b8', maxHeight: '140px', overflowY: 'auto' }}>
          <strong style={{ color: '#f43f5e', display: 'block', marginBottom: '8px' }}>Castle Chronicles:</strong>
          {castleLog.map((c, i) => (
            <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              {c}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
