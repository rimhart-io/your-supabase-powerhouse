import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import sClick from "@/assets/audio/click.mp3";
import sClickSoft from "@/assets/audio/click_soft.mp3";
import sPackTear from "@/assets/audio/pack_tear.mp3";
import sPackBurst from "@/assets/audio/pack_burst.mp3";
import sCardFlip from "@/assets/audio/card_flip.mp3";
import sUpgrade from "@/assets/audio/upgrade.mp3";
import sRedeem from "@/assets/audio/redeem.mp3";
import sVictory from "@/assets/audio/victory.mp3";
import sDefeat from "@/assets/audio/defeat.mp3";
import sHit from "@/assets/audio/hit.mp3";
import sHitFire from "@/assets/audio/hit_fire.mp3";
import sHitWater from "@/assets/audio/hit_water.mp3";
import sHitElectric from "@/assets/audio/hit_electric.mp3";
import sHitGrass from "@/assets/audio/hit_grass.mp3";
import sHitPsychic from "@/assets/audio/hit_psychic.mp3";
import sHitDragon from "@/assets/audio/hit_dragon.mp3";
import sHitNormal from "@/assets/audio/hit_normal.mp3";
import sHitIce from "@/assets/audio/hit_ice.mp3";
import sHitRock from "@/assets/audio/hit_rock.mp3";
import sSwoosh from "@/assets/audio/swoosh.mp3";
import sSuperEff from "@/assets/audio/super_effective.mp3";
import sNotEff from "@/assets/audio/not_effective.mp3";
import sFaint from "@/assets/audio/faint.mp3";
import sCrit from "@/assets/audio/crit.mp3";
import sWind from "@/assets/audio/wind_ambient.mp3";

import mDashboard from "@/assets/audio/music_dashboard.mp3";
import mBattle from "@/assets/audio/music_battle.mp3";
import mPack from "@/assets/audio/music_pack.mp3";
import mTraining from "@/assets/audio/music_training.mp3";

export const SFX = {
  click: sClick,
  clickSoft: sClickSoft,
  packTear: sPackTear,
  packBurst: sPackBurst,
  cardFlip: sCardFlip,
  upgrade: sUpgrade,
  redeem: sRedeem,
  victory: sVictory,
  defeat: sDefeat,
  hit: sHit,
  hitFire: sHitFire,
  hitWater: sHitWater,
  hitElectric: sHitElectric,
  hitGrass: sHitGrass,
  hitPsychic: sHitPsychic,
  hitDragon: sHitDragon,
  hitNormal: sHitNormal,
  hitIce: sHitIce,
  hitRock: sHitRock,
  swoosh: sSwoosh,
  superEffective: sSuperEff,
  notEffective: sNotEff,
  faint: sFaint,
  crit: sCrit,
} as const;

export const MUSIC = {
  dashboard: mDashboard,
  battle: mBattle,
  pack: mPack,
  training: mTraining,
} as const;

export type SfxKey = keyof typeof SFX;
export type MusicKey = keyof typeof MUSIC;

/** Map a Pokémon move type to its hit SFX key. */
export function sfxForType(type: string): SfxKey {
  switch (type) {
    case "fire": return "hitFire";
    case "water": return "hitWater";
    case "ice": return "hitIce";
    case "electric": return "hitElectric";
    case "grass":
    case "bug":
    case "poison": return "hitGrass";
    case "psychic":
    case "ghost":
    case "fairy":
    case "dark": return "hitPsychic";
    case "dragon":
    case "fighting":
    case "steel": return "hitDragon";
    case "rock":
    case "ground": return "hitRock";
    default: return "hitNormal";
  }
}

type AudioCtx = {
  play: (key: SfxKey, volume?: number) => void;
  setMusic: (key: MusicKey | null) => void;
  muted: boolean;
  musicMuted: boolean;
  toggleMuted: () => void;
  toggleMusic: () => void;
};

const Ctx = createContext<AudioCtx | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const sfxCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const musicEl = useRef<HTMLAudioElement | null>(null);
  const currentMusic = useRef<MusicKey | null>(null);

  // Load prefs
  useEffect(() => {
    try {
      setMuted(localStorage.getItem("pc_muted") === "1");
      setMusicMuted(localStorage.getItem("pc_music_muted") === "1");
    } catch {}
  }, []);

  // Unlock audio after first user gesture (browser autoplay policy)
  useEffect(() => {
    const unlock = () => {
      setUnlocked(true);
      if (musicEl.current && !musicMuted) {
        musicEl.current.play().catch(() => {});
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [musicMuted]);

  const play = (key: SfxKey, volume = 0.6) => {
    if (muted) return;
    const src = SFX[key];
    let a = sfxCache.current.get(src);
    if (!a) {
      a = new Audio(src);
      a.preload = "auto";
      sfxCache.current.set(src, a);
    }
    try {
      a.currentTime = 0;
      a.volume = volume;
      void a.play();
    } catch {}
  };

  const setMusic = (key: MusicKey | null) => {
    if (currentMusic.current === key) return;
    currentMusic.current = key;
    if (!musicEl.current) {
      musicEl.current = new Audio();
      musicEl.current.loop = true;
      musicEl.current.volume = 0.25;
    }
    const el = musicEl.current;
    if (!key) {
      el.pause();
      return;
    }
    el.src = MUSIC[key];
    if (!musicMuted && unlocked) {
      el.play().catch(() => {});
    }
  };

  const toggleMuted = () => {
    setMuted(m => {
      const v = !m;
      try { localStorage.setItem("pc_muted", v ? "1" : "0"); } catch {}
      return v;
    });
  };
  const toggleMusic = () => {
    setMusicMuted(m => {
      const v = !m;
      try { localStorage.setItem("pc_music_muted", v ? "1" : "0"); } catch {}
      if (musicEl.current) {
        if (v) musicEl.current.pause();
        else if (unlocked) musicEl.current.play().catch(() => {});
      }
      return v;
    });
  };

  // Global click sound on buttons / links
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const el = t.closest("button, a, [role=button]") as HTMLElement | null;
      if (!el) return;
      if (el.dataset.noSound === "true") return;
      if ((el as HTMLButtonElement).disabled) return;
      play("click", 0.35);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  const value = useMemo(() => ({ play, setMusic, muted, musicMuted, toggleMuted, toggleMusic }), [muted, musicMuted, unlocked]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudio() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAudio must be used within AudioProvider");
  return c;
}

/** Convenience hook: set the background music for the current page. */
export function usePageMusic(key: MusicKey | null) {
  const { setMusic } = useAudio();
  useEffect(() => {
    setMusic(key);
  }, [key, setMusic]);
}
