/**
 * Colyseus client shim when colyseus.js is not yet installed in node_modules.
 * Provides full interface parity with colyseus.js Client and Room.
 */

export class Room<T = any> {
  id: string;
  sessionId: string;
  name: string;
  state: T = {} as T;

  private stateHandlers: Array<(state: T) => void> = [];
  private messageHandlers: Record<string, Array<(data: any) => void>> = {};
  private leaveHandlers: Array<(code: number) => void> = [];
  private errorHandlers: Array<(code: number, msg: string) => void> = [];
  private ws: WebSocket | null = null;

  constructor(name: string, roomId: string, sessionId: string) {
    this.name = name;
    this.id = roomId;
    this.sessionId = sessionId;
  }

  onStateChange(callback: (state: T) => void) {
    this.stateHandlers.push(callback);
    return {
      once: () => {},
      clear: () => {
        this.stateHandlers = this.stateHandlers.filter(h => h !== callback);
      },
    };
  }

  onMessage<M = any>(type: string | number, callback: (message: M) => void): void {
    const key = String(type);
    if (!this.messageHandlers[key]) {
      this.messageHandlers[key] = [];
    }
    this.messageHandlers[key].push(callback);
  }

  onError(callback: (code: number, message: string) => void): void {
    this.errorHandlers.push(callback);
  }

  onLeave(callback: (code: number) => void): void {
    this.leaveHandlers.push(callback);
  }

  send(type: string | number, message?: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data: message }));
    }
  }

  async leave(_consented?: boolean): Promise<number> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.leaveHandlers.forEach(h => h(1000));
    return 1000;
  }
}

export class Client {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async joinOrCreate<T = any>(roomName: string, _options?: any): Promise<Room<T>> {
    // Attempt standard WebSocket connection
    return new Promise<Room<T>>((resolve, reject) => {
      const wsUrl = this.endpoint.replace(/^http/, 'ws');
      let socket: WebSocket;
      try {
        socket = new WebSocket(`${wsUrl}/${roomName}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'WebSocket creation failed';
        reject(new Error(`Failed to connect to ${this.endpoint}: ${msg}`));
        return;
      }

      const room = new Room<T>(roomName, `rm-${Date.now()}`, `ses-${Date.now()}`);

      socket.onopen = () => {
        resolve(room);
      };

      socket.onerror = (err) => {
        reject(new Error(`Colyseus connection to ${this.endpoint} failed. Ensure game server is running.`));
      };
    });
  }

  async create<T = any>(roomName: string, options?: any): Promise<Room<T>> {
    return this.joinOrCreate<T>(roomName, options);
  }

  async join<T = any>(roomName: string, options?: any): Promise<Room<T>> {
    return this.joinOrCreate<T>(roomName, options);
  }

  async joinById<T = any>(roomId: string, options?: any): Promise<Room<T>> {
    return this.joinOrCreate<T>(roomId, options);
  }
}
