import { motion } from "framer-motion";
import type { PokemonCard as Card } from "@/lib/pokemon";
import { TYPE_COLORS } from "@/lib/pokemon";
import { cn } from "@/lib/utils";

const RARITY_RING: Record<string, string> = {
  common: "ring-[var(--rarity-common)]",
  rare: "ring-[var(--rarity-rare)] shadow-[0_0_25px_-5px_var(--rarity-rare)]",
  epic: "ring-[var(--rarity-epic)] shadow-[0_0_30px_-5px_var(--rarity-epic)]",
  legendary: "ring-[var(--rarity-legendary)] shadow-[0_0_45px_-5px_var(--rarity-legendary)]",
};

interface Props {
  card: Card;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function PokemonCardView({ card, size = "md", onClick, selected, className }: Props) {
  const dims =
    size === "sm" ? "w-40 h-56" : size === "lg" ? "w-72 h-[26rem]" : "w-56 h-80";
  const primary = card.types[0] ?? "normal";
  const bg = TYPE_COLORS[primary];
  const isHolo = card.rarity !== "common";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -6, rotateX: 4, rotateY: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative rounded-2xl ring-2 overflow-hidden text-left transition-all",
        "bg-card font-sans",
        dims,
        RARITY_RING[card.rarity],
        selected && "outline outline-4 outline-primary",
        className
      )}
      style={{
        background: `radial-gradient(circle at 30% 0%, ${bg} 0%, oklch(0.18 0.05 265) 70%)`,
      }}
    >
      {isHolo && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
          style={{ background: "var(--gradient-holo)" }}
        />
      )}
      <div className="relative h-full p-3 flex flex-col">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/70">
              {card.rarity}
            </div>
            <div className="font-bold capitalize text-white text-sm leading-tight">
              {card.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-white/70">HP</div>
            <div className="font-black text-white text-lg leading-none">{card.hp}</div>
          </div>
        </div>

        <div className="my-2 flex-1 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
          <img
            src={card.image_url}
            alt={card.name}
            className="max-h-full max-w-full object-contain drop-shadow-[0_8px_15px_rgba(0,0,0,0.5)]"
            loading="lazy"
          />
        </div>

        <div className="flex gap-1 mb-1">
          {card.types.map((t) => (
            <span
              key={t}
              className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: TYPE_COLORS[t] }}
            >
              {t}
            </span>
          ))}
        </div>

        {size !== "sm" && (
          <div className="space-y-1">
            {card.moves.map((m) => (
              <div
                key={m.name}
                className="flex justify-between items-center text-[10px] bg-black/30 rounded px-2 py-1"
              >
                <span className="capitalize text-white/90 truncate mr-2">{m.name}</span>
                <span className="font-bold text-white">{m.power}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between text-[9px] text-white/70 mt-1 pt-1 border-t border-white/15">
          <span>ATK {card.attack}</span>
          <span>DEF {card.defense}</span>
          <span>SPD {card.speed}</span>
        </div>
      </div>
    </motion.button>
  );
}