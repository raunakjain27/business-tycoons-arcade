import React, { useState, useRef, useEffect } from 'react';
import { useChatStore, QUICK_SHOUTOUTS } from '../chatStore';
import { useUserStore } from '../userStore';
import { useGameStore } from '../store';
import { soundFx } from '../soundEffects';

export const ChatDrawer: React.FC = () => {
  const { isOpen, unreadCount, messages, toggleChat, closeChat, sendMessage } = useChatStore();
  const { user } = useUserStore();
  const { myPlayerId, gameState } = useGameStore();

  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myPlayer = gameState?.players[myPlayerId];
  const senderInfo = {
    id: myPlayerId,
    name: myPlayer?.name || user?.username || 'Operator',
    avatar: myPlayer?.tokenId ? '👑' : user?.selectedAvatar || '⚡',
    color: '#00f0ff',
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    soundFx.playClick();
    sendMessage(inputVal.trim(), false, senderInfo);
    setInputVal('');
  };

  const handleShoutout = (shoutout: string) => {
    soundFx.playClick();
    sendMessage(shoutout, true, senderInfo);
  };

  return (
    <>
      {/* 1. Floating Comms Launcher Trigger Button (Bottom-Right) */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9998,
        }}
      >
        <button
          onClick={() => {
            soundFx.playClick();
            toggleChat();
          }}
          className={`arcade-btn ${isOpen ? 'arcade-btn-magenta' : 'arcade-btn-cyan'}`}
          style={{
            padding: '10px 18px',
            fontSize: '12px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 240, 255, 0.3)',
            fontFamily: 'Orbitron, sans-serif',
            letterSpacing: '0.8px',
          }}
        >
          <span>💬</span>
          <span>{isOpen ? 'CLOSE COMMS' : 'ARENA COMMS'}</span>
          {unreadCount > 0 && !isOpen && (
            <span
              style={{
                backgroundColor: '#ff0077',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 900,
                padding: '2px 6px',
                borderRadius: '9999px',
                boxShadow: '0 0 10px #ff0077',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. Slide-Up Cyber Chat Console */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '72px',
            right: '20px',
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            height: '480px',
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: '#0a0f1d',
            borderRadius: '20px',
            border: '1.5px solid rgba(0, 240, 255, 0.4)',
            boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 240, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
            animation: 'fadeIn 0.18s ease-out',
          }}
        >
          <div className="marquee-glow-top" />

          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: 'rgba(14, 20, 38, 0.95)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚡</span>
              <div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 900,
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#ffffff',
                    letterSpacing: '0.5px',
                  }}
                >
                  TACTICAL COMMS LINK
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#00ff88',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  ● ENCRYPTED ARENA BROADCAST
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                soundFx.playClick();
                closeChat();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick Tactical Shoutouts Bar */}
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(6, 10, 22, 0.95)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {QUICK_SHOUTOUTS.map((shoutout) => (
              <button
                key={shoutout}
                onClick={() => handleShoutout(shoutout)}
                className="arcade-btn arcade-btn-secondary"
                style={{
                  padding: '4px 8px',
                  fontSize: '10.5px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {shoutout}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxSizing: 'border-box',
            }}
          >
            {messages.map((msg) => {
              const isMe = msg.senderId === myPlayerId;
              if (msg.isSystem) {
                return (
                  <div
                    key={msg.id}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'rgba(0, 240, 255, 0.08)',
                      border: '1px solid rgba(0, 240, 255, 0.2)',
                      fontSize: '11px',
                      color: '#67e8f9',
                      textAlign: 'center',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    ⚡ {msg.text}
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    gap: '2px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#94a3b8' }}>
                    <span>{msg.senderAvatar}</span>
                    <strong style={{ color: msg.senderColor }}>{msg.senderName}</strong>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      backgroundColor: isMe ? 'rgba(0, 240, 255, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                      border: isMe ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      lineHeight: 1.35,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(14, 20, 38, 0.98)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              placeholder="Transmit tactical message..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="arcade-btn arcade-btn-primary"
              style={{ padding: '8px 14px', fontSize: '11px', whiteSpace: 'nowrap' }}
            >
              SEND ▶
            </button>
          </form>
        </div>
      )}
    </>
  );
};
