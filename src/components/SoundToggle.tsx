import { useAudio } from "@/lib/audio";
import { Volume2, VolumeX, Music, Music2 } from "lucide-react";

export function SoundToggle() {
  const { muted, musicMuted, toggleMuted, toggleMusic } = useAudio();
  return (
    <div className="fixed bottom-3 right-3 z-40 flex gap-2">
      <button
        onClick={toggleMusic}
        data-no-sound="true"
        aria-label={musicMuted ? "Unmute music" : "Mute music"}
        className="game-glass-dark h-10 w-10 rounded-full grid place-items-center text-white shadow-lg active:scale-95 transition"
      >
        {musicMuted ? <Music2 className="h-5 w-5 opacity-50" /> : <Music className="h-5 w-5" />}
      </button>
      <button
        onClick={toggleMuted}
        data-no-sound="true"
        aria-label={muted ? "Unmute SFX" : "Mute SFX"}
        className="game-glass-dark h-10 w-10 rounded-full grid place-items-center text-white shadow-lg active:scale-95 transition"
      >
        {muted ? <VolumeX className="h-5 w-5 opacity-50" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </div>
  );
}
