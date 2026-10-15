import { Client, Room } from 'colyseus.js';
import type { GameState, Action, GameEvent } from '../../../packages/engine/types';

export interface ColyseusCallbacks {
  onStateChange: (state: GameState) => void;
  onEvents: (events: GameEvent[]) => void;
  onError: (error: { code: string; message?: string }) => void;
  onGameOver: (winner: string) => void;
  onDisconnect: () => void;
}

export class ColyseusConnection {
  private client: Client | null = null;
  private room: Room<GameState> | null = null;
  private callbacks: ColyseusCallbacks | null = null;

  async connect(
    serverUrl: string,
    roomName: string,
    options: { name: string; roleId?: string | null; tokenId?: string; boardKey?: string },
    callbacks: ColyseusCallbacks
  ): Promise<{ roomId: string; sessionId: string }> {
    this.callbacks = callbacks;
    this.client = new Client(serverUrl);

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

  sendAction(action: Action): void {
    if (!this.room) {
      throw new Error('Not connected to a game room');
    }
    this.room.send('action', action);
  }

  disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.client = null;
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
