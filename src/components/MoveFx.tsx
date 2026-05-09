import { motion, AnimatePresence } from "framer-motion";
import { TYPE_COLORS } from "@/lib/pokemon";

export const TYPE_ICON: Record<string, string> = {
  normal: "✦", fire: "🔥", water: "💧", electric: "⚡", grass: "🌿",
  ice: "❄️", fighting: "👊", poison: "☠️", ground: "🪨", flying: "💨",
  psychic: "🌀", bug: "🐛", rock: "🗿", ghost: "👻", dragon: "🐉",
  dark: "🌑", steel: "⚙️", fairy: "✨",
};

export interface MoveFxData {
  side: "p" | "e";   // target side that the FX appears on
  type: string;
  name: string;
  effLabel?: "weak" | "resisted" | "no" | null;
}

// Burst animation: a colored radial flash + 10 emoji particles flying outward
export function MoveFx({ data }: { data: MoveFxData | null }) {
  return (
    <AnimatePresence>
      {data && (
        <motion.div
          key={data.side + data.type + data.name + Math.random()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={`absolute pointer-events-none ${
            data.side === "e"
              ? "left-[8%] sm:left-[12%] top-3 sm:top-6 w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56"
              : "right-[8%] sm:right-[12%] bottom-2 sm:bottom-4 w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56"
          }`}
        >
          {/* Move name banner */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-white font-black text-sm sm:text-lg uppercase tracking-wider drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
          >
            {data.name}
            {data.effLabel === "weak" && (
              <span className="ml-1 text-orange-300 text-[10px] sm:text-xs">{TYPE_ICON[data.type]} WEAK!</span>
            )}
            {data.effLabel === "resisted" && (
              <span className="ml-1 text-blue-300 text-[10px] sm:text-xs">RESISTED</span>
            )}
            {data.effLabel === "no" && (
              <span className="ml-1 text-gray-300 text-[10px] sm:text-xs">NO EFFECT</span>
            )}
          </motion.div>

          {/* Radial flash */}
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ scale: 0.4, opacity: 0.9 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              background: `radial-gradient(circle, ${TYPE_COLORS[data.type]} 0%, transparent 70%)`,
              filter: "blur(8px)",
            }}
          />

          {/* Particle burst */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 70 + Math.random() * 50;
            return (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 text-2xl sm:text-3xl"
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  scale: 1.2,
                  opacity: [0, 1, 1, 0],
                  rotate: Math.random() * 360,
                }}
                transition={{ duration: 0.85, ease: "easeOut" }}
                style={{ filter: `drop-shadow(0 0 6px ${TYPE_COLORS[data.type]})` }}
              >
                {TYPE_ICON[data.type] ?? "✦"}
              </motion.div>
            );
          })}

          {/* Center pulse icon */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl"
            initial={{ scale: 0, rotate: -45, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1], rotate: 0, opacity: [0, 1, 0] }}
            transition={{ duration: 0.8 }}
            style={{ filter: `drop-shadow(0 0 14px ${TYPE_COLORS[data.type]})` }}
          >
            {TYPE_ICON[data.type] ?? "✦"}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
