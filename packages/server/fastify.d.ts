// Type declarations for Fastify to resolve namespace issues
declare module 'fastify' {
  export interface FastifyRequest {
    headers: Record<string, string | undefined>;
    params: Record<string, string>;
    query: Record<string, string | undefined>;
    body: unknown;
    method: string;
    url: string;
    routeOptions?: { url: string };
  }

  export interface FastifyReply {
    code(statusCode: number): FastifyReply;
    header(name: string, value: string): FastifyReply;
    hasHeader(name: string): boolean;
    send(data: unknown): FastifyReply;
    status(statusCode: number): FastifyReply;
  }

  export interface FastifyInstance {
    server: { on(event: string, handler: () => void): void };
    addHook(hook: string, handler: (request: FastifyRequest, reply: FastifyReply) => void | Promise<void>): void;
    setErrorHandler(handler: (error: unknown, request: FastifyRequest, reply: FastifyReply) => void): void;
    setNotFoundHandler(handler: (request: FastifyRequest, reply: FastifyReply) => void): void;
    get<T = unknown>(url: string, handler: (request: FastifyRequest, reply: FastifyReply) => T | Promise<T>): void;
    post<T = unknown>(url: string, handler: (request: FastifyRequest, reply: FastifyReply) => T | Promise<T>): void;
    listen(options: { port: number; host: string }): Promise<void>;
    close(): Promise<void>;
    log: {
      error(err: unknown): void;
    };
  }

  export function fastify(options?: { logger?: boolean; bodyLimit?: number }): FastifyInstance;
  export default fastify;
}
