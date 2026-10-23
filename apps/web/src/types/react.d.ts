/* eslint-disable @typescript-eslint/no-explicit-any */
// Generated type shims for content packages
// These types are re-exported from the content package
// and mirrored here so the monorepo typeshed stays self-contained.
// Do not edit by hand; regenerate from packages/content if the schema changes.

export type { BoardDef, DistrictDef, TileDef, TileType, TileState, PlayerState, Phase, MarketKind, MarketState, TradeBundle, TradeOffer, AuctionState, RuleSet, GameState, Action, GameEvent, ErrorCode } from './generated';

export const defaultBoard: BoardDef;
export const events: GameEvent[];
export const boardsData: { [key: string]: BoardDef };

/* eslint-disable @typescript-eslint/no-explicit-any */
// Minimal React type shims for standalone bundle build
// Mirrors the real @types/react surface so the app can be type-checked
// without pulling in the full community types package.

declare module 'react' {
  export const StrictMode: any;
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prev: T) => T) | T) => void];
  // Allow untyped useState calls for incremental migration.
  export function useState<T>(): [T | undefined, (newState: T | ((prev: T | undefined) => T) | T | undefined) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useRef<T>(initialValue: T | null): { current: T | null };
  export function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;

  export interface CSSProperties {
    [key: string]: any;
  }
  export type FC<P = {}> = (props: P) => any;
  export type ReactNode = any;
  export type ReactElement = any;
  export interface ChangeEvent<T = any> {
    target: T & { value: string; checked?: boolean };
  }
  export interface MouseEvent<T = any> {
    currentTarget: any;
    target: any;
    stopPropagation: () => void;
    preventDefault: () => void;
  }
  export interface KeyboardEvent<T = any> {
    key: string;
    code: string;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    currentTarget: EventTarget & T;
    stopPropagation: () => void;
    preventDefault: () => void;
  }
  export class KeyboardEvent<T = any> {
    type: string;
    target: EventTarget | null;
    currentTarget: EventTarget & T;
    key: string;
    code: string;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    preventDefault(): void;
    stopPropagation(): void;
  }
  export type FormEvent<T = any> = any;
  export interface TransitionEvent<T = any> {
    stopPropagation: () => void;
    preventDefault: () => void;
  }
  export interface PointerEvent<T = any> {
    stopPropagation: () => void;
    preventDefault: () => void;
  }
  export interface TouchEvent<T = any> {
    stopPropagation: () => void;
    preventDefault: () => void;
  }
  export interface WheelEvent<T = any> {
    stopPropagation: () => void;
    preventDefault: () => void;
  }

  export class Component<P = {}, S = {}> {
    props: P;
    state: S;
    setState(state: Partial<S> | ((prevState: S, props: P) => Partial<S>), callback?: () => void): void;
    render(): any;
  }
  export interface ErrorInfo {
    componentStack?: string;
  }

  const React: {
    StrictMode: any;
    useState: typeof useState;
    useEffect: typeof useEffect;
    useRef: typeof useRef;
    useMemo: typeof useMemo;
    useCallback: typeof useCallback;
    Component: typeof Component;
    createElement: any;
  };
  export default React;
}

declare module 'react-dom/client' {
  export interface Root {
    render(children: any): void;
    unmount(): void;
  }
  export function createRoot(container: any): Root;
  const ReactDOM: {
    createRoot: typeof createRoot;
  };
  export default ReactDOM;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export const Fragment: any;
}

declare module 'react/jsx-dev-runtime' {
  export function jsxDEV(type: any, props: any, key?: any, isStatic?: boolean, source?: any, self?: any): any;
  export const Fragment: any;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_BUILD_MODE: string;
  readonly VITE_SERVER_URL: string;
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_POSTHOG_HOST: string;
  readonly VITE_PUBLIC_POSTHOG_KEY: string;
  readonly VITE_PUBLIC_POSTHOG_HOST: string;
  readonly VITE_SENTRY_DSN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  namespace React {
    interface CSSProperties {
      [key: string]: any;
    }
    type FC<P = {}> = (props: P) => any;
    type ReactNode = any;
    type ReactElement = any;
    interface ChangeEvent<T = any> {
      target: T & { value: string; checked?: boolean };
    }
    interface MouseEvent<T = any> {
      currentTarget: any;
      target: any;
      stopPropagation: () => void;
      preventDefault: () => void;
    }
    interface KeyboardEvent<T = any> {
      key: string;
      stopPropagation: () => void;
      preventDefault: () => void;
    }
    type FormEvent<T = any> = any;
    interface TransitionEvent<T = any> {
      stopPropagation: () => void;
      preventDefault: () => void;
    }
    interface PointerEvent<T = any> {
      stopPropagation: () => void;
      preventDefault: () => void;
    }
    interface TouchEvent<T = any> {
      stopPropagation: () => void;
      preventDefault: () => void;
    }
    interface WheelEvent<T = any> {
      stopPropagation: () => void;
      preventDefault: () => void;
    }
  }

  namespace JSX {
    interface Element {
      type: any;
      props: any;
      key: any;
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
