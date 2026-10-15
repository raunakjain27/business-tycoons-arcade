declare module 'colyseus.js' {
  export class Room<State = any> {
    id: string;
    sessionId: string;
    name: string;
    state: State;
    onStateChange: {
      (callback: (state: State) => void): { once: () => void; clear: () => void };
      once: (callback: (state: State) => void) => void;
    };
    onMessage: <T = any>(type: string | number, callback: (message: T) => void) => void;
    onError: (callback: (code: number, message: string) => void) => void;
    onLeave: (callback: (code: number) => void) => void;
    send: (type: string | number, message?: any) => void;
    leave: (consented?: boolean) => Promise<number>;
  }

  export class Client {
    constructor(endpoint: string);
    joinOrCreate<T = any>(roomName: string, options?: any): Promise<Room<T>>;
    create<T = any>(roomName: string, options?: any): Promise<Room<T>>;
    join<T = any>(roomName: string, options?: any): Promise<Room<T>>;
    joinById<T = any>(roomId: string, options?: any): Promise<Room<T>>;
  }
}
