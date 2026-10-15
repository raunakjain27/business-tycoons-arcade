import { useCallback, useEffect, useRef, useState } from 'react';
import { soundFx } from './soundEffects';

// Single shared mute flag for the whole app experience.
//kept in localStorage so the user's choice survives reloads.
const SOUND_MUTE_KEY = 'cornerstone_sound_muted';

function readMute() {
  try {
    return localStorage.getItem(SOUND_MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMute(muted: boolean) {
  try {
    localStorage.setItem(SOUND_MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ignore storage errors
  }
}

export function useSoundMute() {
  const [muted, setMuted] = useState(readMute);

  useEffect(() => {
    soundFx.setMuted(muted);
  }, [muted]);

  const toggle = useCallback(() => {
    const next = !muted;
    setMuted(next);
    writeMute(next);
  }, [muted]);

  return { muted, toggleMute: toggle, isMuted: muted };
}

type SoundFn = () => void;

export function useSound() {
  const mutedRef = useRef(readMute);
  const latestRef = useRef(mutedRef.current);

  // Keep ref in sync with hook state internally.
  useEffect(() => {
    mutedRef.current = latestRef.current;
  }, []);

  const play = useCallback(
    (fn: SoundFn) => {
      if (mutedRef.current) return;
      try {
        fn();
      } catch {
        // swallow sound engine errors; they must never break a game session
      }
    },
    [],
  );

  const bind = useCallback(
    (event: { play?: SoundFn; playSpecial?: SoundFn; playVictory?: SoundFn }) => {
      if (!event) return;
      if (event.play) play(event.play);
      if (event.playSpecial) play(event.playSpecial);
      if (event.playVictory) play(event.playVictory);
    },
    [play],
  );

  return {
    muted: mutedRef.current,
    play,
    playDice: () => play(soundFx.playDiceRoll.bind(soundFx)),
    playCardFlip: () => play(soundFx.playCardFlip.bind(soundFx)),
    playCardSpecial: () => play(soundFx.playCardSpecial.bind(soundFx)),
    playCashRegister: () => play(soundFx.playCashRegister.bind(soundFx)),
    playTraitorGong: () => play(soundFx.playTraitorGong.bind(soundFx)),
    playSnakeHiss: () => play(soundFx.playSnakeHiss.bind(soundFx)),
    playLadderClimb: () => play(soundFx.playLadderClimb.bind(soundFx)),
    playTokenCut: () => play(soundFx.playTokenCut.bind(soundFx)),
    playVictory: () => play(soundFx.playVictory.bind(soundFx)),
  };
}

export const needsUserGestureForAudio = (): boolean => {
  if (typeof window === 'undefined') return true;
  const ctx = window.AudioContext;
  if (!ctx) return true;
  const s = new ctx();
  const suspended = s.state === 'suspended';
  s.close().catch(() => {});
  return suspended;
};
