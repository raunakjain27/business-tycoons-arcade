import React, { useState } from 'react';
import { useUserStore } from '../userStore';
import { useGameStore } from '../store';

export const CustomFriendsModal: React.FC = () => {
  const { user, showCustomFriendsModal, setShowCustomFriendsModal, updateFriendNames } = useUserStore();
  const { setBoardKey } = useGameStore();
  const [names, setNames] = useState<string[]>(user.friendNames || []);

  if (!showCustomFriendsModal) return null;

  const handleNameChange = (index: number, val: string) => {
    const updated = [...names];
    updated[index] = val;
    setNames(updated);
  };

  const handleSaveAndPlay = () => {
    updateFriendNames(names);
    setBoardKey('customfriends');
    setShowCustomFriendsModal(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 8, 20, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '16px',
      }}
      onClick={() => setShowCustomFriendsModal(false)}
    >
      <div
        style={{
          backgroundColor: '#1e1430',
          borderRadius: '16px',
          border: '1px solid rgba(236, 72, 153, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 50px rgba(236, 72, 153, 0.35)',
          maxWidth: '580px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: '#2b1642',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '26px' }}>🔞</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f472b6' }}>
                  Custom 18+ Friends Board
                </h3>
                <span style={{ backgroundColor: '#f59e0b', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                  VIP
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                Add your friends' names below! Buy, sell, and trade your friends on the board.
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowCustomFriendsModal(false)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        {/* Friends Input Grid */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0, lineHeight: 1.4 }}>
            Customize up to 22 property tiles with names of your friends, squad members, or celebrities:
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '10px',
            }}
          >
            {names.map((name, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa' }}>
                  Property #{i + 1}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => handleNameChange(i, e.target.value)}
                  placeholder={`Friend ${i + 1}`}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '6px 10px',
                    outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#2b1642',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            onClick={handleSaveAndPlay}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
            }}
          >
            Save & Play Custom Friends Board
          </button>
          <button
            onClick={() => setShowCustomFriendsModal(false)}
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
