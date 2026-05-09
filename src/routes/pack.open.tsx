import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { generatePack, type PokemonCard, RARITY_WEIGHTS } from "@/lib/pokemon";
import { cardToInsert } from "@/lib/card-mapper";
import { PokemonCardView } from "@/components/PokemonCard";
import { Button } from "@/components/ui/button";
import { GameTopBar } from "@/components/GameTopBar";
import { PageBackground } from "@/components/PageBackground";
import bgPack from "@/assets/bg-pack.jpg";
import { usePageMusic, useAudio } from "@/lib/audio";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import cardBack from "@/assets/card-back.png";
import packStarter from "@/assets/pack-starter.png";
import packStandard from "@/assets/pack-standard.png";
import packPremium from "@/assets/pack-premium.png";
import packLegendary from "@/assets/pack-legendary.png";

const PACK_IMAGES: Record<string, string> = {
  starter: packStarter,
  standard: packStandard,
  premium: packPremium,
  legendary: packLegendary,
};

export const Route = createFileRoute("/pack/open")({
  head: () => ({ meta: [{ title: "Open pack — PokéClash" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    type: (s.type as string) ?? "starter",
  }),
  component: PackOpen,
});

const PACK_WEIGHTS: Record<string, typeof RARITY_WEIGHTS> = {
  starter: RARITY_WEIGHTS,
  standard: RARITY_WEIGHTS,
  premium: { common: 40, rare: 35, epic: 20, legendary: 5 },
  legendary: { common: 0, rare: 30, epic: 50, legendary: 20 },
};

const PACK_THEMES: Record<string, { grad: string; ring: string; emoji: string; subtitle: string }> = {
  starter:   { grad: "linear-gradient(160deg, oklch(0.55 0.20 230), oklch(0.40 0.18 290))", ring: "oklch(0.78 0.18 230)", emoji: "✦", subtitle: "Trainer's First Pack" },
  standard:  { grad: "linear-gradient(160deg, oklch(0.55 0.20 230), oklch(0.40 0.18 290))", ring: "oklch(0.78 0.18 230)", emoji: "⚡", subtitle: "Standard Booster" },
  premium:   { grad: "linear-gradient(160deg, oklch(0.65 0.24 320), oklch(0.45 0.22 350))", ring: "oklch(0.85 0.20 330)", emoji: "🌌", subtitle: "Premium Booster" },
  legendary: { grad: "linear-gradient(160deg, oklch(0.80 0.20 85), oklch(0.55 0.22 35))",   ring: "oklch(0.90 0.20 90)",  emoji: "👑", subtitle: "Legendary Booster" },
};

function PackOpen() {
  const { type } = Route.useSearch();
  const { user, profile, refreshProfile, loading } = useAuth();
  usePageMusic("pack");
  const { play } = useAudio();
  const nav = useNavigate();
  const [stage, setStage] = useState<"idle" | "shake" | "burst" | "reveal">("idle");
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [flipped, setFlipped] = useState<boolean[]>([]);

  const theme = PACK_THEMES[type] ?? PACK_THEMES.standard;

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  const tear = async () => {
    if (!user) return;
    setStage("shake");
    play("packTear", 0.7);
    try {
      const pack = await generatePack(PACK_WEIGHTS[type] ?? RARITY_WEIGHTS, 3);
      const rows = pack.map(c => cardToInsert(c, user.id));
      const { error } = await supabase.from("cards").insert(rows);
      if (error) throw error;
      if (type === "starter" && profile && !profile.starter_claimed) {
        await supabase.from("profiles").update({ starter_claimed: true }).eq("id", user.id);
      }
      await refreshProfile();
      setCards(pack);
      setFlipped(pack.map(() => false));
      setTimeout(() => { setStage("burst"); play("packBurst", 0.8); }, 1100);
      setTimeout(() => setStage("reveal"), 2000);
    } catch (e) {
      toast.error((e as Error).message);
      setStage("idle");
    }
  };

  // Auto-flip cards in sequence as they land — no manual tap needed.
  useEffect(() => {
    if (stage !== "reveal" || cards.length === 0) return;
    cards.forEach((_, i) => {
      const delay = i * 250 + 700; // matches entry stagger + a beat
      setTimeout(() => {
        setFlipped(f => f.map((v, idx) => idx === i ? true : v));
        play("cardFlip", 0.6);
      }, delay);
    });
  }, [stage, cards]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <PageBackground src={bgPack} dim={0.6} />
      <GameTopBar title="Pack" />
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10 relative">
        <h1 className="text-2xl sm:text-4xl font-black mb-1 capitalize bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{type} pack</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">{theme.subtitle}</p>

        <div className="relative min-h-[420px] sm:h-[520px] flex items-center justify-center">
          {/* radial glow */}
          {(stage === "shake" || stage === "burst") && (
            <motion.div className="absolute inset-0 m-auto w-[600px] h-[600px] rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${theme.ring}66, transparent 60%)` }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: stage === "burst" ? 1 : 0.6, scale: stage === "burst" ? 1.4 : 1 }}
              transition={{ duration: 0.8 }} />
          )}

          {(stage === "idle" || stage === "shake") && (
            <motion.button
              onClick={tear}
              disabled={stage !== "idle"}
              whileHover={stage === "idle" ? { scale: 1.05, rotate: 1 } : {}}
              whileTap={{ scale: 0.97 }}
              animate={stage === "shake" ? { x: [0, -8, 8, -6, 6, -4, 4, 0], y: [0, -3, 3, 0], rotate: [0, -2, 2, 0] } : { y: [0, -8, 0] }}
              transition={stage === "shake" ? { duration: 0.9, repeat: 1 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-60 h-[22rem] sm:w-72 sm:h-[26rem] rounded-3xl overflow-hidden"
              style={{ filter: `drop-shadow(0 30px 60px ${theme.ring}) drop-shadow(0 0 40px ${theme.ring})` }}
            >
              <img src={PACK_IMAGES[type] ?? PACK_IMAGES.standard} alt={`${type} pack`} className="w-full h-full object-contain select-none pointer-events-none" draggable={false} />
              {/* holo sweep */}
              <motion.div className="absolute inset-0 mix-blend-overlay opacity-60 pointer-events-none"
                style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)", backgroundSize: "200% 100%" }}
                animate={{ backgroundPosition: ["200% 0%", "-100% 0%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }} />
              <div className="absolute bottom-2 inset-x-0 text-center text-[11px] uppercase tracking-widest font-bold text-white/90 drop-shadow">
                {stage === "idle" ? "Tap to tear open" : "Tearing…"}
              </div>
            </motion.button>
          )}

          {stage === "burst" && (
            <div className="relative w-60 h-[22rem] sm:w-72 sm:h-[26rem]">
              {/* top half flying away */}
              <motion.div initial={{ y: 0, rotate: 0, opacity: 1 }} animate={{ y: -300, rotate: -35, x: -150, opacity: 0 }} transition={{ duration: 0.9, ease: "easeIn" }}
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 48%, 0 52%)" }}>
                <img src={PACK_IMAGES[type] ?? PACK_IMAGES.standard} alt="" className="w-full h-full object-contain" />
              </motion.div>
              <motion.div initial={{ y: 0, rotate: 0, opacity: 1 }} animate={{ y: 300, rotate: 30, x: 150, opacity: 0 }} transition={{ duration: 0.9, ease: "easeIn" }}
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: "polygon(0 52%, 100% 48%, 100% 100%, 0 100%)" }}>
                <img src={PACK_IMAGES[type] ?? PACK_IMAGES.standard} alt="" className="w-full h-full object-contain" />
              </motion.div>
              {/* sparkles */}
              {[...Array(40)].map((_, i) => (
                <motion.div key={i} className="absolute w-2 h-2 rounded-full"
                  style={{ top: "50%", left: "50%", background: theme.ring, boxShadow: `0 0 8px ${theme.ring}` }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: (Math.random()-0.5)*600, y: (Math.random()-0.5)*600, opacity: 0, scale: 0 }}
                  transition={{ duration: 1.1, delay: 0.05 + i * 0.01 }} />
              ))}
              {/* Light pillar */}
              <motion.div className="absolute inset-x-0 top-1/2 h-3 bg-white blur-md"
                initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1.5, 0], opacity: [0, 1, 0] }} transition={{ duration: 0.8 }} />
            </div>
          )}

          {stage === "reveal" && (
            <div className="flex flex-wrap gap-3 sm:gap-6 justify-center perspective-[1200px] py-4">
              {cards.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 200, opacity: 0, rotateZ: -30 }}
                  animate={{ y: 0, opacity: 1, rotateZ: 0 }}
                  transition={{ delay: i * 0.25, duration: 0.6, type: "spring" }}
                  onAnimationComplete={() => setRevealed(r => Math.max(r, i + 1))}
                  className="relative"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <motion.div
                    animate={{ rotateY: flipped[i] ? 0 : 180 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    style={{ transformStyle: "preserve-3d" }}
                    className="relative w-40 h-56 sm:w-56 sm:h-80"
                  >
                    {/* back */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-2xl"
                      style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
                      <img src={cardBack} alt="PokéClash card back" className="w-full h-full object-cover" />
                    </div>
                    {/* front */}
                    <div className="absolute inset-0 flex items-center justify-center" style={{ backfaceVisibility: "hidden" }}>
                      <PokemonCardView card={c} size="sm" />
                    </div>
                  </motion.div>

                </motion.div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {stage === "reveal" && revealed >= cards.length && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex justify-center gap-3 mt-12">
              
              <Button onClick={() => nav({ to: "/gallery" })}>View gallery</Button>
              <Button variant="outline" onClick={() => nav({ to: "/dashboard" })}>Back to home</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
