// Audio system removed to keep the project lightweight.
// This module remains as a no-op shim so existing imports keep working.
import { createContext, useContext, useMemo, type ReactNode } from "react";

export type SfxKey = string;
export type MusicKey = string;

export function sfxForType(_type: string): SfxKey {
  return "noop";
}

type AudioCtx = {
  play: (key?: SfxKey, volume?: number) => void;
  setMusic: (key?: MusicKey | null) => void;
  setAmbient: (src?: string | null, volume?: number) => void;
  muted: boolean;
  musicMuted: boolean;
  toggleMuted: () => void;
  toggleMusic: () => void;
};

const noop = () => {};
const Ctx = createContext<AudioCtx>({
  play: noop,
  setMusic: noop,
  setAmbient: noop,
  muted: true,
  musicMuted: true,
  toggleMuted: noop,
  toggleMusic: noop,
});

export function AudioProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AudioCtx>(() => ({
    play: noop, setMusic: noop, setAmbient: noop,
    muted: true, musicMuted: true, toggleMuted: noop, toggleMusic: noop,
  }), []);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudio() {
  return useContext(Ctx);
}

export function usePageMusic(_key?: MusicKey | null) {}
export function usePageAmbient(_src?: string | null, _volume?: number) {}
