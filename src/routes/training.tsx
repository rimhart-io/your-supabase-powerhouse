import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { GameTopBar } from "@/components/GameTopBar";
import { PageBackground } from "@/components/PageBackground";
import bgTraining from "@/assets/bg-training.jpg";
import { Button } from "@/components/ui/button";
import { usePageMusic, useAudio } from "@/lib/audio";
import { rowToCard, type CardRow } from "@/lib/card-mapper";
import type { PokemonCard, EVs } from "@/lib/pokemon";
import { Coins, Dumbbell, Sparkles, Heart, Flame, Trophy, Target, Lock, Gem } from "lucide-react";

const EVOLUTION_STONE_KEY = "evolution_stone";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/training")({
  head: () => ({ meta: [{ title: "Training — PokéClash" }] }),
  component: TrainingPage,
});

const FOCUSES = [
  { key: "hp", label: "Endurance", desc: "+EV HP", icon: "❤️" },
  { key: "attack", label: "Power", desc: "+EV Attack", icon: "💪" },
  { key: "defense", label: "Guard", desc: "+EV Defense", icon: "🛡️" },
  { key: "sp_atk", label: "Focus", desc: "+EV Sp.Atk", icon: "🔮" },
  { key: "sp_def", label: "Resolve", desc: "+EV Sp.Def", icon: "✨" },
  { key: "speed", label: "Agility", desc: "+EV Speed", icon: "⚡" },
] as const;

type FocusKey = typeof FOCUSES[number]["key"];

const COST = 30; // coins per session
const EV_GAIN = 4;
const XP_GAIN = 25;
const FRIEND_GAIN = 3;
const EV_TOTAL_CAP = 510;
const EV_PER_STAT_CAP = 252;

function TrainingPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  usePageMusic("training");
  const { play } = useAudio();
  const nav = useNavigate();
  const [cards, setCards] = useState<(PokemonCard & { id: string })[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusKey>("attack");
  const [busy, setBusy] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [stoneQty, setStoneQty] = useState(0);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  const load = async () => {
    if (!user) return;
    const [{ data }, { data: invRow }] = await Promise.all([
      supabase.from("cards").select("*").eq("owner_id", user.id).order("level", { ascending: false }),
      supabase.from("inventory").select("qty").eq("user_id", user.id).eq("item_key", EVOLUTION_STONE_KEY).maybeSingle(),
    ]);
    setCards(((data as CardRow[] | null) ?? []).map(rowToCard));
    setStoneQty((invRow as { qty: number } | null)?.qty ?? 0);
  };
  useEffect(() => { load(); }, [user]);

  const useStone = async () => {
    if (!user || !card || busy) return;
    if (stoneQty <= 0) { toast.error("No Evolution Stones"); return; }
    setBusy(true);
    setAnimating(true);
    const maxedEvs: EVs = { hp: 252, attack: 252, defense: 252, sp_atk: 252, sp_def: 252, speed: 252 };
    const { error: cErr } = await supabase.from("cards").update({
      evs: maxedEvs as unknown as never,
      level: 50,
      xp: 0,
      friendship: 255,
      training_count: (card.training_count ?? 0) + 1,
    }).eq("id", card.id);
    if (cErr) { setBusy(false); setAnimating(false); toast.error(cErr.message); return; }
    if (stoneQty === 1) {
      await supabase.from("inventory").delete().eq("user_id", user.id).eq("item_key", EVOLUTION_STONE_KEY);
    } else {
      await supabase.from("inventory").update({ qty: stoneQty - 1 }).eq("user_id", user.id).eq("item_key", EVOLUTION_STONE_KEY);
    }
    setTimeout(async () => {
      await load();
      setAnimating(false);
      setBusy(false);
      toast.success(`${card.name} is fully evolved!`);
    }, 1100);
  };

  const card = cards.find(c => c.id === selected);

  const train = async () => {
    if (!user || !profile || !card || busy) return;
    if (profile.coins < COST) { toast.error("Not enough coins"); return; }
    const evs: EVs = card.evs ?? { hp: 0, attack: 0, defense: 0, sp_atk: 0, sp_def: 0, speed: 0 };
    const total = Object.values(evs).reduce((a, b) => a + b, 0);
    if (evs[focus] >= EV_PER_STAT_CAP) { toast.error("Stat cap reached"); return; }
    if (total >= EV_TOTAL_CAP) { toast.error("Total EV cap reached"); return; }

    setBusy(true);
    setAnimating(true);

    const newEvs: EVs = { ...evs, [focus]: Math.min(EV_PER_STAT_CAP, evs[focus] + EV_GAIN) };
    let newXp = (card.xp ?? 0) + XP_GAIN;
    let newLevel = card.level ?? 5;
    while (newLevel < 50 && newXp >= newLevel * newLevel * 4) {
      newXp -= newLevel * newLevel * 4;
      newLevel++;
    }
    const newFriendship = Math.min(255, (card.friendship ?? 50) + FRIEND_GAIN);
    const newTraining = (card.training_count ?? 0) + 1;

    await Promise.all([
      supabase.from("cards").update({
        evs: newEvs as unknown as never,
        xp: newXp, level: newLevel,
        friendship: newFriendship,
        training_count: newTraining,
      }).eq("id", card.id),
      supabase.from("profiles").update({ coins: profile.coins - COST }).eq("id", user.id),
      supabase.from("training_sessions").insert({
        user_id: user.id, card_id: card.id, focus,
        xp_gained: XP_GAIN, ev_gained: EV_GAIN, coins_spent: COST,
      }),
    ]);

    setTimeout(async () => {
      await refreshProfile();
      await load();
      setAnimating(false);
      setBusy(false);
      toast.success(`+${EV_GAIN} EV ${focus} · +${XP_GAIN} XP`);
    }, 1100);
  };

  if (!user || !profile) return null;

  const evs: EVs = card?.evs ?? { hp:0,attack:0,defense:0,sp_atk:0,sp_def:0,speed:0 };
  const totalEv = Object.values(evs).reduce((a,b)=>a+b,0);
  const xpNeeded = card ? (card.level ?? 5) * (card.level ?? 5) * 4 : 0;
  const xpInLevel = card?.xp ?? 0;
  const xpPct = card ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 0;
  const focusCapped = card ? evs[focus] >= EV_PER_STAT_CAP : false;
  const totalCapped = totalEv >= EV_TOTAL_CAP;
  const cantAfford = profile.coins < COST;

  return (
    <div className="min-h-screen relative">
      <PageBackground src={bgTraining} dim={0.7} />
      <GameTopBar title="Training" />
      {/* Ambient gym backdrop */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle at 20% 10%, oklch(0.7 0.25 30) 0%, transparent 40%), radial-gradient(circle at 85% 90%, oklch(0.65 0.25 250) 0%, transparent 45%)" }} />

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Hero banner */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 mb-6
          bg-[linear-gradient(135deg,oklch(0.22_0.05_280)_0%,oklch(0.18_0.04_290)_50%,oklch(0.25_0.08_30)_100%)]
          shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0 opacity-30 mix-blend-overlay"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.04) 12px 13px)" }} />
          <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full blur-3xl opacity-30 bg-orange-500" />
          <div className="absolute -left-10 -top-10 w-72 h-72 rounded-full blur-3xl opacity-30 bg-indigo-500" />
          <div className="relative p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center
                bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-[0_0_30px_rgba(255,150,40,0.45)] border border-white/30">
                <Dumbbell className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/80 font-bold">PokéClash Gym</div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Training Grounds</h1>
                <p className="text-xs sm:text-sm text-white/70 max-w-md">Drill stats, level up, and bond with your team. Every gain is saved permanently to that Pokémon.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white font-black tabular-nums">
              <Coins className="h-4 w-4 text-amber-300" /> {profile.coins}
            </div>
          </div>
          {/* Stats strip */}
          <div className="relative grid grid-cols-3 sm:grid-cols-3 gap-px bg-white/10 border-t border-white/10">
            <StatStrip icon={<Trophy className="h-3.5 w-3.5"/>} label="Sessions" value={String(card?.training_count ?? 0)} />
            <StatStrip icon={<Target className="h-3.5 w-3.5"/>} label="Cost / drill" value={`${COST}c`} />
            <StatStrip icon={<Sparkles className="h-3.5 w-3.5"/>} label="Reward" value={`+${EV_GAIN} EV · +${XP_GAIN} XP`} />
          </div>
        </section>

        <div className="grid lg:grid-cols-[1fr_400px] gap-5">
          {/* Roster */}
          <section className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Pick a trainee</div>
              <div className="text-[10px] text-muted-foreground">{cards.length} Pokémon</div>
            </div>
            {cards.length === 0 ? (
              <div className="text-muted-foreground text-sm py-12 text-center">
                <div className="text-4xl mb-2">🎒</div>
                No Pokémon yet. Open a pack first.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cards.map(c => {
                  const cEvs = c.evs ?? { hp:0,attack:0,defense:0,sp_atk:0,sp_def:0,speed:0 };
                  const tot = Object.values(cEvs).reduce((a,b)=>a+b,0);
                  const evPct = (tot / EV_TOTAL_CAP) * 100;
                  const isSelected = selected === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c.id)}
                      className={cn(
                        "relative rounded-2xl p-3 text-left transition-all overflow-hidden border-2 group",
                        "bg-gradient-to-br from-secondary/80 to-card hover:-translate-y-0.5 hover:shadow-lg",
                        isSelected ? "border-primary ring-2 ring-primary/50 shadow-[0_0_25px_rgba(120,80,255,0.3)]" : "border-border hover:border-primary/40"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                          Active
                        </div>
                      )}
                      <div className="relative h-20 flex items-center justify-center">
                        <div className="absolute inset-x-2 bottom-1 h-3 rounded-full bg-black/40 blur-md" />
                        <img src={c.image_url} alt="" className="relative w-20 h-20 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform"/>
                      </div>
                      <div className="font-bold capitalize text-sm truncate mt-1">{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">L{c.level}</span>
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Heart className="h-2.5 w-2.5 text-rose-400"/>{c.friendship ?? 50}</span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-black/40 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${evPct}%`, background: "linear-gradient(90deg, oklch(0.7 0.2 30), oklch(0.75 0.2 60))" }} />
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">EV {tot}/{EV_TOTAL_CAP}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Training panel */}
          <aside className="rounded-2xl border border-border bg-card/80 backdrop-blur p-4 lg:sticky lg:top-20 self-start space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Live session</div>
              {card && <div className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Saved
              </div>}
            </div>
            {!card ? (
              <div className="text-muted-foreground text-sm py-14 text-center">
                <div className="text-4xl mb-2 opacity-60">🥋</div>
                Select a Pokémon to begin a drill.
              </div>
            ) : (
              <>
                {/* Training arena */}
                <div className="relative h-48 rounded-2xl overflow-hidden border border-white/10"
                  style={{ background: "radial-gradient(ellipse at 50% 100%, oklch(0.55 0.22 35) 0%, transparent 65%), radial-gradient(circle at 50% 30%, oklch(0.4 0.15 280), transparent 70%), linear-gradient(160deg, oklch(0.18 0.05 285), oklch(0.12 0.03 290))" }}>
                  {/* Floor lines */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 opacity-40"
                    style={{ backgroundImage: "linear-gradient(180deg, transparent, rgba(255,255,255,0.08))" }} />
                  <div className="absolute inset-x-0 bottom-4 h-px bg-white/15" />
                  {/* Energy ring */}
                  <motion.div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-32 h-8 rounded-[50%] border border-amber-300/40"
                    animate={{ scale: animating ? [1, 1.4, 1] : 1, opacity: animating ? [0.7, 0.1, 0.7] : 0.4 }}
                    transition={{ duration: 0.9, repeat: animating ? Infinity : 0 }} />
                  <motion.img
                    key={card.id + (animating ? "-anim" : "")}
                    src={card.image_url}
                    alt=""
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
                    animate={animating ? { y: [-4, -16, -4, -16, -4], rotate: [0, -6, 6, -6, 0] } : { y: [-4, 0, -4] }}
                    transition={animating ? { duration: 1 } : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {animating && (
                    <>
                      {[...Array(14)].map((_, i) => (
                        <motion.div key={i}
                          className="absolute w-1.5 h-1.5 rounded-full"
                          style={{ left: "50%", top: "60%", background: i % 2 ? "oklch(0.85 0.22 60)" : "oklch(0.75 0.2 280)", boxShadow: "0 0 8px currentColor" }}
                          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                          animate={{ x: (Math.random()-0.5)*220, y: -20 - Math.random()*150, opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.95, delay: i * 0.04 }}
                        />
                      ))}
                    </>
                  )}
                  <div className="absolute top-2 left-2 text-[9px] uppercase tracking-widest text-white/60 font-bold">Drill arena</div>
                </div>

                {/* Identity + level XP */}
                <div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="font-black capitalize text-lg leading-tight">{card.name}</div>
                    <div className="text-[10px] text-muted-foreground">{card.training_count ?? 0} sessions</div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">Lv {card.level}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
                      <motion.div className="h-full rounded-full"
                        animate={{ width: `${xpPct}%` }}
                        style={{ background: "linear-gradient(90deg, oklch(0.7 0.18 145), oklch(0.85 0.2 130))" }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground tabular-nums">{xpInLevel}/{xpNeeded}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Heart className="h-3 w-3 text-rose-400" />
                    <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${((card.friendship ?? 50)/255)*100}%`, background: "linear-gradient(90deg, oklch(0.7 0.2 10), oklch(0.78 0.18 350))" }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground tabular-nums">{card.friendship ?? 50}/255</span>
                  </div>
                </div>

                {/* EV total */}
                <div className="rounded-xl bg-black/30 p-2.5 border border-white/5">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="uppercase tracking-widest text-muted-foreground font-bold">Total EVs</span>
                    <span className="tabular-nums font-black">{totalEv} / {EV_TOTAL_CAP}</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(totalEv/EV_TOTAL_CAP)*100}%`, background: "linear-gradient(90deg, oklch(0.7 0.2 30), oklch(0.78 0.22 60))" }} />
                  </div>
                </div>

                {/* Focus selector — premium cards with bars */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">Choose focus</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FOCUSES.map(f => {
                      const cur = card.evs?.[f.key] ?? 0;
                      const pct = (cur / EV_PER_STAT_CAP) * 100;
                      const isFocus = focus === f.key;
                      const capped = cur >= EV_PER_STAT_CAP;
                      return (
                        <button
                          key={f.key}
                          onClick={() => setFocus(f.key)}
                          disabled={capped}
                          className={cn("relative rounded-xl p-2 text-center border-2 transition overflow-hidden",
                            isFocus ? "border-primary bg-primary/15 shadow-[0_0_20px_rgba(120,80,255,0.25)]" : "border-border bg-secondary/50 hover:border-primary/50",
                            capped && "opacity-50 cursor-not-allowed")}
                          title={f.desc}
                        >
                          {capped && <Lock className="absolute top-1 right-1 h-2.5 w-2.5 text-muted-foreground" />}
                          <div className="text-base leading-none">{f.icon}</div>
                          <div className="font-black text-[10px] mt-0.5 leading-tight">{f.label}</div>
                          <div className="text-[8px] text-muted-foreground tabular-nums">{cur}/{EV_PER_STAT_CAP}</div>
                          <div className="mt-1 h-0.5 rounded-full bg-black/40 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isFocus ? "var(--primary)" : "oklch(0.6 0.15 280)" }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Train button */}
                <Button
                  onClick={train}
                  disabled={busy || focusCapped || totalCapped || cantAfford}
                  className={cn("w-full h-12 text-base font-black tracking-wide relative overflow-hidden group",
                    "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 text-black shadow-[0_8px_25px_-8px_rgba(255,140,40,0.6)]")}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)" }} />
                  <Flame className="h-5 w-5 mr-1.5"/>
                  {busy ? "Drilling…" : totalCapped ? "EV cap reached" : focusCapped ? "Stat capped" : cantAfford ? "Need more coins" : `Begin Drill · ${COST}c`}
                </Button>
                <div className="text-[10px] text-muted-foreground text-center">
                  +{EV_GAIN} EV · +{XP_GAIN} XP · +{FRIEND_GAIN} friendship · saved to your card
                </div>

                {/* Evolution Stone */}
                <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-rose-500/10 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Gem className="h-4 w-4 text-amber-400" />
                    <span className="font-black text-sm">Evolution Stone</span>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-black/30 font-bold">x{stoneQty}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Instantly max all EVs, level, and friendship for the selected Pokémon.</p>
                  <Button
                    onClick={useStone}
                    disabled={busy || stoneQty <= 0}
                    className="w-full h-9 text-xs font-black bg-gradient-to-r from-amber-500 to-rose-500 text-black hover:from-amber-400 hover:to-rose-400"
                  >
                    <Gem className="h-3.5 w-3.5 mr-1" />
                    {stoneQty <= 0 ? "Buy one in the Shop" : `Use Evolution Stone (x${stoneQty})`}
                  </Button>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function StatStrip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-black/20 px-3 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/60 font-bold">{icon}{label}</div>
      <div className="text-xs font-black text-white tabular-nums truncate">{value}</div>
    </div>
  );
}
