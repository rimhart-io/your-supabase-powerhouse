import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Sparkles, Swords, Package } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PokéClash — Collect, Battle, Conquer" },
      { name: "description", content: "Open packs, collect real Pokémon cards, and battle AI trainers in PokéClash." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.65 0.22 280 / 0.4), transparent 50%), radial-gradient(circle at 80% 70%, oklch(0.72 0.19 50 / 0.3), transparent 50%)" }}
      />
      <header className="relative max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 font-black tracking-tight text-sm sm:text-base">
          <Sparkles className="h-5 w-5 text-primary" />
          POKÉCLASH
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/login">Login</Link></Button>
          <Button asChild size="sm"><Link to="/signup">Sign up</Link></Button>
        </div>
      </header>

      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 pb-16 sm:pb-24 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[0.95] tracking-tight">
            Tear open packs.<br/>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-gold)" }}>Battle legends.</span>
          </h1>
          <p className="mt-5 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-md">
            Collect real Pokémon as cinematic cards, build a 3-card loadout, and outsmart AI trainers in turn-based battles.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/signup">Claim free pack</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/login">I have an account</Link></Button>
          </div>
          <div className="mt-8 sm:mt-10 flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Package className="h-4 w-4 text-primary"/>Cinematic packs</div>
            <div className="flex items-center gap-2"><Swords className="h-4 w-4 text-primary"/>Turn-based AI battles</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative h-[280px] sm:h-[420px] order-first md:order-last">
          {[150, 6, 25].map((id, i) => (
            <motion.img
              key={id}
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`}
              alt=""
              className="absolute w-40 h-40 sm:w-64 sm:h-64 object-contain drop-shadow-2xl"
              style={{ left: `${i * 20}%`, top: `${i * 15}%`, zIndex: i }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </motion.div>
      </section>
    </main>
  );
}
