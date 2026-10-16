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
    stopPropagation: () => void;
    preventDefault: () => void;
  }
}

declare module 'react' {
  export const StrictMode: any;
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prev: T) => T)) => void];
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
    stopPropagation: () => void;
    preventDefault: () => void;
  }  export interface MouseEvent<T = any> {
    stopPropagation: () => void;
    preventDefault: () => void;
  }
  export interface KeyboardEvent<T = any> {
    key: string;
    stopPropagation: () => void;
    preventDefault: () => void;
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

export { KeyboardEvent, TransitionEvent, PointerEvent, TouchEvent, WheelEvent };

  const React: {
    StrictMode: any;
    useState: typeof useState;
    useEffect: typeof useEffect;
    useRef: typeof useRef;
    useMemo: typeof useMemo;
    useCallback: typeof useCallback;
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
