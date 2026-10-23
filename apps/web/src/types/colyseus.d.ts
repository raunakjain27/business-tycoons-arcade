// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type any = any;

declare module 'colyseus' {
  export type Client = any;
  export interface Room<T = any> {
    id: string;
    onJoin?(options: any): void;
    onLeave?(client: Client, consented?: boolean): void;
    onAuth?(connection: Client, options: any): Promise<any>;
    onDispose?(): void;
    setup?(): void;
    onCreate?(options: any): void;
    onMessage?(client: Client, message: any, type?: string): void;
    public: boolean;
    maxClients?: number;
    autoDispose?: boolean;
    clock?: { now(): number };
  }
  export interface ClientState<T = any> {
    sessionId: string;
    playerId: string;
  }
  export interface MatchMaker {
    create(expr: string, transport?: any): Client;
  }
  export const schemas: {
    Schema: new () => any;
    type(field: string, options: Record<string, any>): any;
    id(field: string, options?: Record<string, any>): any;
  };
  export const matchMaker: MatchMaker;
  const colyseus: {
    Client: any;
    Room: typeof Room;
    ClientState: typeof ClientState;
    matchMaker: MatchMaker;
    schemas: typeof schemas;
  };
  export default colyseus;
}

export {};

// Allow remaining ambient declarations without @typescript-eslint suppression noise
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type any = any;
