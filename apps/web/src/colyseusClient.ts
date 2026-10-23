import { Client } from 'colyseus.js';
import type { GameState, Action, GameEvent } from '../../../packages/engine/types';

export type ColyseusClient = Client;
export type ColyseusRoom<T = unknown> = import('colyseus.js').Room<T>;

export interface ColyseusCallbacks {
  onStateChange: (state: GameState) => void;
  onEvents: (events: GameEvent[]) => void;
  onError: (error: { code: string; message?: string }) => void;
  onGameOver: (winner: string) => void;
  onDisconnect: () => void;
}

interface SessionState {
  roomId: string;
  sessionId: string;
  sessionToken: string | null;
}

export class ColyseusConnection {
  private client: Client | null = null;
  private room: Room<GameState> | null = null;
  private callbacks: ColyseusCallbacks | null = null;
  private currentSession: SessionState | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private serverUrl: string = 'ws://localhost:2567';

  async connect(
    serverUrl: string,
    roomName: string,
    options: { name: string; roleId?: string | null; tokenId?: string; boardKey?: string; rules?: Record<string, unknown>; sessionToken?: string },
    callbacks: ColyseusCallbacks
  ): Promise<{ roomId: string; sessionId: string }> {
    this.callbacks = callbacks;
    this.currentSession = null;
    this.serverUrl = serverUrl;      this.client = new Client(serverUrl);

    try {
      // Connect to or create room
      const room = await this.client.joinOrCreate<GameState>(roomName, options);
      this.room = room;

      room.onStateChange((state: GameState) => {
        this.callbacks?.onStateChange(state);
      });

      room.onMessage('events', (events: GameEvent[]) => {
        this.callbacks?.onEvents(events);
      });

      room.onMessage('error', (error: { code: string; message?: string }) => {
        this.callbacks?.onError(error);
      });

      room.onMessage('gameOver', (data: { winner: string }) => {
        this.callbacks?.onGameOver(data.winner);
      });

      room.onLeave(() => {
        this.callbacks?.onDisconnect();
        if (this.currentSession) {
          this.currentSession = {
            ...this.currentSession,
            roomId: this.currentSession.roomId,
            sessionId: room.sessionId,
            sessionToken: this.currentSession.sessionToken,
          };
        }
        this.scheduleReconnect(roomName, options, callbacks);
      });

      this.currentSession = {
        roomId: room.id,
        sessionId: room.sessionId,
        sessionToken: null,
      };

      // Capture session token once the server issues it
      room.onMessage('session', (data: { playerId: string; sessionToken: string }) => {
        if (this.currentSession && data.sessionToken) {
          this.currentSession = {
            ...this.currentSession,
            sessionToken: data.sessionToken,
          };
        }
      });

      return {
        roomId: room.id,
        sessionId: room.sessionId,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to Colyseus server';
      throw new Error(msg);
    }
  }

  private scheduleReconnect(
    roomName: string,
    options: { name: string; roleId?: string | null; tokenId?: string; boardKey?: string; rules?: Record<string, unknown>; sessionToken?: string },
    callbacks: ColyseusCallbacks
  ): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const attempts = this.currentSession ? [this.currentSession.sessionToken] : [];
    const interval = 1500;
    let attempt = 0;

    const tryRejoin = async () => {
      if (!this.client) {
        this.client = new Client(this.serverUrl);
      }

      try {
        const reconnectOptions = { ...options };
        if (attempts[attempt]) {
          reconnectOptions.sessionToken = attempts[attempt] ?? undefined;
        }

        const room = await this.client.joinOrCreate<GameState>(roomName, reconnectOptions);
        this.room = room;

        // Wire up the same listeners on the new room
        room.onStateChange((state: GameState) => {
          this.callbacks?.onStateChange(state);
        });

        room.onMessage('events', (events: GameEvent[]) => {
          this.callbacks?.onEvents(events);
        });

        room.onMessage('error', (error: { code: string; message?: string }) => {
          this.callbacks?.onError(error);
        });

        room.onMessage('gameOver', (data: { winner: string }) => {
          this.callbacks?.onGameOver(data.winner);
        });

        room.onMessage('session', (data: { playerId: string; sessionToken: string }) => {
          if (this.currentSession && data.sessionToken) {
            this.currentSession = {
              ...this.currentSession,
              sessionToken: data.sessionToken,
            };
          }
        });

        room.onLeave(() => {
          this.callbacks?.onDisconnect();
          this.scheduleReconnect(roomName, options, callbacks);
        });

        this.currentSession = {
          roomId: room.id,
          sessionId: room.sessionId,
          sessionToken: null,
        };

        this.reconnectTimer = null;
        const sessionId = room.sessionId;
        const roomId = room.id;
        this.callbacks?.onStateChange((() => {
          const fresh = {} as GameState;
          return fresh;
        })() as GameState);
      } catch (err) {
        attempt++;
        if (attempt < 8) {
          this.reconnectTimer = setTimeout(tryRejoin, interval * Math.pow(1.5, attempt));
        }
      }
    };

    this.reconnectTimer = setTimeout(tryRejoin, interval);
  }

  sendAction(action: Action): void {
    if (!this.room) {
      throw new Error('Not connected to a game room');
    }
    this.room.send('action', action);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.client = null;
    this.currentSession = null;
  }

  isConnected(): boolean {
    return this.room !== null;
  }

  getSessionId(): string | null {
    return this.room?.sessionId ?? null;
  }

  getRoomId(): string | null {
    return this.room?.id ?? null;
  }
}

export const colyseusConnection = new ColyseusConnection();

// Expose session token for UI reconnect indicators.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(colyseusConnection as any).getSessionToken = () => colyseusConnection.getSessionId();
