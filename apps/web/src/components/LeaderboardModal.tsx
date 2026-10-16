import React, { useState } from 'react';
import { useTrophyStore, LeaderboardEntry, Trophy } from '../trophyStore';
import { useUserStore, getApiBaseUrl } from '../userStore';
import { soundFx } from '../soundEffects';

const TOP_TYCOONS: LeaderboardEntry[] = [
  { rank: 1, username: 'Aarav Titan 👑', avatar: '🦁', title: 'Grand Mogul', value: '$84,500', badge: 'VIP' },
  { rank: 2, username: 'Elena Vance', avatar: '👑', title: 'Manhattan Tycoon', value: '$62,100', badge: 'PRO' },
  { rank: 3, username: 'Vikram Apex', avatar: '🏎️', title: 'High Roller', value: '$49,800', badge: 'PRO' },
  { rank: 4, username: 'Sarah Connor', avatar: '🐱', title: 'Property Broker', value: '$38,200' },
  { rank: 5, username: 'Kenji Sato', avatar: '🤖', title: 'District Builder', value: '$29,400' },
];

const TOP_STREAKS: LeaderboardEntry[] = [
  { rank: 1, username: 'Pooja Star ✨', avatar: '🦄', title: 'Streak Titan', value: '42 Days 🔥', badge: 'VIP' },
  { rank: 2, username: 'Kabir Boss', avatar: '⚡', title: 'Daily Champion', value: '28 Days 🔥', badge: 'PRO' },
  { rank: 3, username: 'Chloe Bennett', avatar: '🐱', title: 'Night Owl', value: '21 Days 🔥' },
  { rank: 4, username: 'Rohan Apex', avatar: '🚀', title: 'Arcade Regular', value: '18 Days 🔥' },
  { rank: 5, username: 'Dev Patel', avatar: '🐼', title: 'Weekend Roller', value: '14 Days 🔥' },
];

export const LeaderboardModal: React.FC = () => {
  const {
    showLeaderboardModal,
    activeTab,
    trophies,
    setShowLeaderboardModal,
    setActiveTab,
    claimTrophyReward,
  } = useTrophyStore();
  const { user } = useUserStore();
  const [boardType, setBoardType] = useState<'wealth' | 'streak'>('wealth');
  const [liveTycoons, setLiveTycoons] = useState<LeaderboardEntry[]>(TOP_TYCOONS);
  const [liveStreaks, setLiveStreaks] = useState<LeaderboardEntry[]>(TOP_STREAKS);

  React.useEffect(() => {
    if (!showLeaderboardModal) return;
    const apiUrl = getApiBaseUrl();
    fetch(`${apiUrl}/api/leaderboard`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.byCoins && Array.isArray(data.byCoins) && data.byCoins.length > 0) {
          const formattedCoins: LeaderboardEntry[] = data.byCoins.map((u: any, idx: number) => ({
            rank: idx + 1,
            username: u.handle || 'Player',
            avatar: u.avatarId || '👑',
            title: u.isVip ? 'VIP Tycoon' : `Level ${u.level || 1} Mogul`,
            value: `$${(u.coins || 0).toLocaleString()}`,
            badge: u.isVip ? 'VIP' : undefined,
            isCurrentUser: u.id === user.id,
          }));
          setLiveTycoons(formattedCoins);
        }
        if (data?.byStreak && Array.isArray(data.byStreak) && data.byStreak.length > 0) {
          const formattedStreaks: LeaderboardEntry[] = data.byStreak.map((u: any, idx: number) => ({
            rank: idx + 1,
            username: u.handle || 'Player',
            avatar: u.avatarId || '👑',
            title: 'Streak Master',
            value: `${u.dailyStreak || 1} Days 🔥`,
            badge: u.isVip ? 'VIP' : undefined,
            isCurrentUser: u.id === user.id,
          }));
          setLiveStreaks(formattedStreaks);
        }
      })
      .catch(() => {});
  }, [showLeaderboardModal, user.id]);

  if (!showLeaderboardModal) return null;

  const currentBoard = boardType === 'wealth' ? liveTycoons : liveStreaks;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 220,
        backgroundColor: 'rgba(5, 3, 10, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={() => setShowLeaderboardModal(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          background: 'linear-gradient(145deg, #1c172d 0%, #100b1d 100%)',
          borderRadius: '24px',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🏆</span>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#f8fafc' }}>
                Hall of Fame & Trophy Room
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Compete on global leaderboards & unlock achievement badges
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowLeaderboardModal(false)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#cbd5e1',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Primary Tabs: Leaderboard vs Trophies */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(15, 11, 26, 0.5)',
            padding: '0 24px',
          }}
        >
          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('leaderboard');
            }}
            style={{
              padding: '14px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'leaderboard' ? '3px solid #f59e0b' : '3px solid transparent',
              color: activeTab === 'leaderboard' ? '#fbbf24' : '#94a3b8',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🥇</span>
            <span>Global Leaderboard</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('trophies');
            }}
            style={{
              padding: '14px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'trophies' ? '3px solid #ec4899' : '3px solid transparent',
              color: activeTab === 'trophies' ? '#f472b6' : '#94a3b8',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🎖️</span>
            <span>Trophy Room ({trophies.filter((t) => t.unlocked).length}/12)</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'leaderboard' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Filter Sub-Pills */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setBoardType('wealth')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    border: boardType === 'wealth' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: boardType === 'wealth' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: boardType === 'wealth' ? '#fbbf24' : '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  💰 Top Tycoon Wealth
                </button>
                <button
                  onClick={() => setBoardType('streak')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    border: boardType === 'streak' ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: boardType === 'streak' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: boardType === 'streak' ? '#f43f5e' : '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  🔥 Longest Streaks
                </button>
              </div>

              {/* Roster Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentBoard.map((entry) => (
                  <div
                    key={entry.rank}
                    style={{
                      background:
                        entry.rank === 1
                          ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(255, 255, 255, 0.03) 100%)'
                          : entry.rank === 2
                          ? 'rgba(148, 163, 184, 0.1)'
                          : entry.rank === 3
                          ? 'rgba(180, 83, 9, 0.1)'
                          : 'rgba(255, 255, 255, 0.03)',
                      border:
                        entry.rank === 1
                          ? '1px solid rgba(245, 158, 11, 0.4)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                    }}
                  >
                    {/* Rank */}
                    <span
                      style={{
                        width: '28px',
                        fontSize: '15px',
                        fontWeight: 900,
                        textAlign: 'center',
                        color:
                          entry.rank === 1 ? '#fbbf24' : entry.rank === 2 ? '#cbd5e1' : entry.rank === 3 ? '#d97706' : '#94a3b8',
                      }}
                    >
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </span>

                    {/* Avatar */}
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      {entry.avatar}
                    </div>

                    {/* Username & Title */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                          {entry.username}
                        </span>
                        {entry.badge && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 900,
                              background: entry.badge === 'VIP' ? '#f59e0b' : '#7c3aed',
                              color: entry.badge === 'VIP' ? '#000' : '#fff',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {entry.badge}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{entry.title}</span>
                    </div>

                    {/* Score / Value */}
                    <span style={{ fontSize: '15px', fontWeight: 900, color: '#fbbf24' }}>
                      {entry.value}
                    </span>
                  </div>
                ))}

                {/* Current Player Rank Banner */}
                <div
                  style={{
                    marginTop: '8px',
                    background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.25) 0%, rgba(236, 72, 153, 0.25) 100%)',
                    border: '1.5px solid #a855f7',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <span style={{ width: '28px', fontSize: '13px', fontWeight: 900, color: '#a78bfa' }}>
                    #7
                  </span>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}
                  >
                    {user.avatar || '👑'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                        {user.username} (You)
                      </span>
                      {user.isVip && (
                        <span style={{ fontSize: '9px', background: '#f59e0b', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: 900 }}>
                          VIP
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      Level {user.level} • {user.gamesWon} Games Won
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#fbbf24' }}>
                    {boardType === 'wealth' ? '$24,150' : `${user.dailyStreak} Days 🔥`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Trophy Room Grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {trophies.map((trophy: Trophy) => (
                <div
                  key={trophy.id}
                  style={{
                    background: trophy.unlocked ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    border: trophy.unlocked
                      ? trophy.claimed
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : '1.5px solid #f59e0b'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    opacity: trophy.unlocked ? 1 : 0.6,
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: trophy.unlocked ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: trophy.unlocked ? '1px solid #f59e0b' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      flexShrink: 0,
                    }}
                  >
                    {trophy.unlocked ? trophy.icon : '🔒'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 2px', color: trophy.unlocked ? '#f8fafc' : '#94a3b8' }}>
                        {trophy.title}
                      </h4>
                      <span style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 700 }}>
                        {trophy.game}
                      </span>
                    </div>

                    <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '0 0 10px', lineHeight: 1.4 }}>
                      {trophy.desc}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 800 }}>
                        +{trophy.rewardCoins} 🪙 • +{trophy.rewardXp} 🌟
                      </span>

                      {trophy.unlocked ? (
                        trophy.claimed ? (
                          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                            ✓ Claimed
                          </span>
                        ) : (
                          <button
                            onClick={() => claimTrophyReward(trophy.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                            }}
                          >
                            Claim 🎁
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Locked</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
