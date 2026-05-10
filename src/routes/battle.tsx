import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { GameTopBar } from "@/components/GameTopBar";
import { Button } from "@/components/ui/button";
import { usePageMusic, useAudio, usePageAmbient, sfxForType } from "@/lib/audio";
import { generatePack, TYPE_COLORS, type PokemonCard } from "@/lib/pokemon";
import { rowToCard, type CardRow } from "@/lib/card-mapper";
import {
  newBattle, startBattle, executeAction, postAction, tickRound, defaultEnemyAI,
  type BattleState, type Fighter, type BattleAction,
} from "@/lib/battle-engine";
import { cn } from "@/lib/utils";
import { Shield, Swords, FlaskConical, Repeat, Heart, Zap, Crosshair, Sparkles } from "lucide-react";
import arenaLava from "@/assets/arena-lava.png";
import arenaMeadow from "@/assets/arena-meadow.png";
import { MoveFx, TYPE_ICON, type MoveFxData } from "@/components/MoveFx";
import { effectiveness } from "@/lib/pokemon";

export const Route = createFileRoute("/battle")({
  head: () => ({ meta: [{ title: "Battle — PokéClash" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    stage: typeof s.stage === "number" ? s.stage : undefined,
  }),
  component: BattlePage,
});

type ActionTab = "fight" | "tactics" | "items" | "switch";
type Turn = "player" | "enemy";

interface InvRow { item_key: string; qty: number }
interface ItemDef { key: string; name: string; description: string; icon: string }

function BattlePage() {
  const { stage: stageParam } = Route.useSearch();
  const { user, profile, refreshProfile, loading } = useAuth();
  usePageMusic("battle");
  usePageAmbient(null);
  const { play } = useAudio();
  const nav = useNavigate();
  const [phase, setPhase] = useState<"loading" | "ready" | "matchmaking" | "fight" | "end">("loading");
  const [state, setState] = useState<BattleState | null>(null);
  const [busy, setBusy] = useState(false);
  const [fx, setFx] = useState<{ side: "p" | "e" | null; kind: "hit" | "heal" | "buff" | null }>({ side: null, kind: null });
  const [mfx, setMfx] = useState<MoveFxData | null>(null);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [xpGained, setXpGained] = useState<{ id: string; xp: number; name: string }[]>([]);
  const [tab, setTab] = useState<ActionTab>("fight");
  const [inv, setInv] = useState<Record<string, number>>({});
  const [catalog, setCatalog] = useState<ItemDef[]>([]);
  const [turn, setTurn] = useState<Turn>("player");
  const [rounds, setRounds] = useState({ player: 0, enemy: 0 });
  const [opponent, setOpponent] = useState<{ name: string; avatarId: number; rank: string } | null>(null);
  const [mmStep, setMmStep] = useState(0);
  const playerCardsRef = useRef<(PokemonCard & { id: string })[]>([]);

  const arena = (stageParam ?? 0) >= 7 ? arenaLava : arenaMeadow;

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: l }, { data: iv }, { data: cat }] = await Promise.all([
        supabase.from("loadouts").select("card_ids").eq("user_id", user.id).maybeSingle(),
        supabase.from("inventory").select("item_key, qty").eq("user_id", user.id),
        supabase.from("items_catalog").select("key, name, description, icon"),
      ]);
      const map: Record<string, number> = {};
      for (const r of (iv as InvRow[] | null) ?? []) map[r.item_key] = r.qty;
      setInv(map);
      setCatalog((cat as ItemDef[] | null) ?? []);
      const ids = (l?.card_ids as string[] | undefined) ?? [];
      if (ids.length !== 3) { setPhase("ready"); return; }
      const { data: c } = await supabase.from("cards").select("*").in("id", ids);
      const rows = (c as CardRow[] | null) ?? [];
      if (rows.length !== 3) { setPhase("ready"); return; }
      const playerCards = rows.map(rowToCard);
      playerCardsRef.current = playerCards;

      const stage = stageParam ?? 1;
      const enemyLevel = Math.min(50, 5 + stage * 3);
      const weights = stage >= 8
        ? { common: 10, rare: 30, epic: 40, legendary: 20 }
        : stage >= 4
        ? { common: 30, rare: 40, epic: 25, legendary: 5 }
        : { common: 60, rare: 25, epic: 12, legendary: 3 };
      const enemyCards = (await generatePack(weights, 3)).map(c => ({ ...c, level: enemyLevel }));
      const s = newBattle(playerCards, enemyCards);
      startBattle(s);
      setState({ ...s });
      setOpponent(makeOpponent(stage));
      setPhase("ready");
    })();
  }, [user, stageParam]);

  // Fake matchmaking sequence
  useEffect(() => {
    if (phase !== "matchmaking") return;
    setMmStep(0);
    const t1 = setTimeout(() => setMmStep(1), 700);
    const t2 = setTimeout(() => setMmStep(2), 1600);
    const t3 = setTimeout(() => setMmStep(3), 2400);
    const t4 = setTimeout(() => setPhase("fight"), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [phase]);

  const flashFx = (next: BattleState, prevPHp: number, prevEHp: number) => {
    const newPHp = next.player.team[next.player.active].currentHp;
    const newEHp = next.enemy.team[next.enemy.active].currentHp;
    if (newEHp < prevEHp) { setFx({ side: "e", kind: "hit" }); setTimeout(() => setFx({ side: null, kind: null }), 500); }
    else if (newPHp < prevPHp) { setFx({ side: "p", kind: "hit" }); setTimeout(() => setFx({ side: null, kind: null }), 500); }
    else if (newPHp > prevPHp) { setFx({ side: "p", kind: "heal" }); setTimeout(() => setFx({ side: null, kind: null }), 500); }
  };

  const act = async (action: BattleAction) => {
    if (!state || busy || phase !== "fight" || turn !== "player") return;
    setBusy(true);

    // PLAYER acts first
    const prevPHp = state.player.team[state.player.active].currentHp;
    const prevEHp = state.enemy.team[state.enemy.active].currentHp;

    // Trigger move FX on the foe before applying — so animation plays during turn
    if (action.kind === "move") {
      const m = state.player.team[state.player.active].card.moves[action.index];
      const eff = effectiveness(m.type, state.enemy.team[state.enemy.active].card.types);
      const effLabel = eff === 0 ? "no" : eff > 1 ? "weak" : eff < 1 ? "resisted" : null;
      setMfx({ side: "e", type: m.type, name: m.name, effLabel });
      setTimeout(() => setMfx(null), 850);
      play("swoosh", 0.4);
      setTimeout(() => {
        play(sfxForType(m.type), 0.6);
        if (eff > 1) play("superEffective", 0.55);
        else if (eff > 0 && eff < 1) play("notEffective", 0.5);
      }, 220);
    }

    const next: BattleState = JSON.parse(JSON.stringify(state));
    executeAction(next, "player", action);
    postAction(next);
    flashFx(next, prevPHp, prevEHp);

    // Track who knocked out whom for round counter
    const enemyKO = !state.enemy.team[state.enemy.active].fainted && next.enemy.team.every(t => t.fainted || t.id !== state.enemy.team[state.enemy.active].id ? t.fainted : false);
    const enemyJustFainted = state.enemy.team[state.enemy.active].currentHp > 0 && next.enemy.team[state.enemy.active]?.fainted;
    if (enemyJustFainted) {
      setRounds(r => ({ ...r, player: r.player + 1 }));
      setTimeout(() => play("faint", 0.6), 400);
    }

    setState(next);

    if (action.kind === "item" && user) {
      const cur = inv[action.itemKey] ?? 0;
      const nextQty = cur - 1;
      setInv(i => ({ ...i, [action.itemKey]: Math.max(0, nextQty) }));
      if (nextQty <= 0) await supabase.from("inventory").delete().eq("user_id", user.id).eq("item_key", action.itemKey);
      else await supabase.from("inventory").update({ qty: nextQty }).eq("user_id", user.id).eq("item_key", action.itemKey);
    }
    setTab("fight");

    if (next.ended) { setTimeout(() => finish(next), 700); return; }

    // Hand the turn to the enemy
    setTurn("enemy");
    setTimeout(() => {
      setState(curr => {
        if (!curr) return curr;
        const prevP = curr.player.team[curr.player.active].currentHp;
        const prevE = curr.enemy.team[curr.enemy.active].currentHp;
        const after: BattleState = JSON.parse(JSON.stringify(curr));
        const enemyAction = defaultEnemyAI(after);
        if (enemyAction.kind === "move") {
          const em = curr.enemy.team[curr.enemy.active].card.moves[enemyAction.index];
          const eff = effectiveness(em.type, curr.player.team[curr.player.active].card.types);
          const effLabel = eff === 0 ? "no" : eff > 1 ? "weak" : eff < 1 ? "resisted" : null;
          setMfx({ side: "p", type: em.type, name: em.name, effLabel });
          setTimeout(() => setMfx(null), 850);
          play("swoosh", 0.4);
          setTimeout(() => {
            play(sfxForType(em.type), 0.6);
            if (eff > 1) play("superEffective", 0.55);
            else if (eff > 0 && eff < 1) play("notEffective", 0.5);
          }, 220);
        }
        executeAction(after, "enemy", enemyAction);
        postAction(after);
        const playerJustFainted = curr.player.team[curr.player.active].currentHp > 0 && after.player.team[curr.player.active]?.fainted;
        if (playerJustFainted) {
          setRounds(r => ({ ...r, enemy: r.enemy + 1 }));
          setTimeout(() => play("faint", 0.6), 400);
        }
        // End-of-round chip / weather only after both sides moved
        tickRound(after);
        flashFx(after, prevP, prevE);
        if (after.ended) setTimeout(() => finish(after), 700);
        return after;
      });
      setTurn("player");
      setBusy(false);
    }, 1100);
    void enemyKO;
  };

  const finish = async (final: BattleState) => {
    if (!user || !profile) { setPhase("end"); return; }
    const won = final.winner === "player";
    play(won ? "victory" : "defeat", 0.7);
    const stage = stageParam ?? 1;
    const baseCoins = won ? 60 + stage * 15 : 12;
    const remainingHpPct = won
      ? final.player.team.reduce((s, t) => s + t.currentHp / t.maxHp, 0) / 3
      : 0;
    const coins = Math.round(baseCoins * (1 + remainingHpPct * 0.5));
    setCoinsEarned(coins);

    const xpEach = won ? 30 + stage * 10 : 8;
    const xpReport: { id: string; xp: number; name: string }[] = [];
    for (const f of final.player.team) {
      if (f.fainted && !won) continue;
      const card = playerCardsRef.current.find(c => c.pokemon_id === f.card.pokemon_id);
      if (!card) continue;
      let newXp = (card.xp ?? 0) + xpEach;
      let newLevel = card.level ?? 5;
      while (newLevel < 50 && newXp >= newLevel * newLevel * 4) {
        newXp -= newLevel * newLevel * 4; newLevel++;
      }
      await supabase.from("cards").update({ xp: newXp, level: newLevel }).eq("id", card.id);
      xpReport.push({ id: card.id, xp: xpEach, name: card.name });
    }
    setXpGained(xpReport);

    const profileUpdate = {
      coins: profile.coins + coins,
      wins: won ? profile.wins + 1 : profile.wins,
      losses: won ? profile.losses : profile.losses + 1,
      campaign_progress: won && stageParam && stage > profile.campaign_progress ? stage : profile.campaign_progress,
    };
    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
    await supabase.from("battles").insert({
      user_id: user.id,
      result: won ? "win" : "loss",
      coins_earned: coins,
      xp_earned: xpEach,
      opponent_name: stageParam ? `Trainer Stage ${stage}` : "Wild Trainer",
      player_team: final.player.team.map(stripFighter) as never,
      opponent_team: final.enemy.team.map(stripFighter) as never,
    });
    await refreshProfile();
    setPhase("end");
  };

  if (phase === "loading") {
    return <div className="min-h-screen"><GameTopBar title="Battle" /><main className="p-10 text-center">Loading…</main></div>;
  }

  if (phase === "ready" && !state) {
    return (
      <div className="min-h-screen">
        <GameTopBar title="Battle" />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-black mb-3">No loadout yet</h1>
          <p className="text-muted-foreground mb-6">Pick 3 cards in your loadout before battling.</p>
          <Button asChild><Link to="/loadout">Build loadout</Link></Button>
        </main>
      </div>
    );
  }

  if (!state) return null;
  const player = state.player.team;
  const enemy = state.enemy.team;
  const active = player[state.player.active];
  const foe = enemy[state.enemy.active];

  return (
    <div className="min-h-screen">
      <GameTopBar title="Battle" />
      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
        {phase === "ready" && (
          <div className="text-center my-10">
            <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Ready to battle</h1>
            <p className="text-muted-foreground mb-6">
              {stageParam ? `Campaign · Stage ${stageParam}` : "A wild trainer challenges you!"}
            </p>
            <Button size="lg" onClick={() => setPhase("matchmaking")} className="animate-pulse-glow">Start Battle</Button>
          </div>
        )}

        {phase === "matchmaking" && (
          <Matchmaking
            step={mmStep}
            me={{ name: profile?.username ?? "Trainer", avatarId: profile?.avatar_id ?? 25 }}
            foe={opponent ?? { name: "???", avatarId: 1, rank: "Trainer" }}
          />
        )}

        {(phase === "fight" || phase === "end") && (
          <div className="space-y-3">
            {/* Identity bar — your profile on top, opponent on the right */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
              <ProfileChip
                name={profile?.username ?? "You"}
                avatarId={profile?.avatar_id ?? 25}
                subtitle="You"
                accent="primary"
                turnActive={turn === "player"}
              />
              <div className="text-center select-none">
                <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Round</div>
                <div className="font-black text-base sm:text-lg leading-none tabular-nums">
                  <span className="text-primary">{rounds.player}</span>
                  <span className="opacity-40 mx-1.5">vs</span>
                  <span className="text-destructive">{rounds.enemy}</span>
                </div>
              </div>
              <ProfileChip
                name={opponent?.name ?? "Foe"}
                avatarId={opponent?.avatarId ?? 1}
                subtitle={opponent?.rank ?? "Foe"}
                accent="destructive"
                align="right"
                turnActive={turn === "enemy"}
              />
            </div>

            {/* Modern HP plates side by side */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <FighterPlate f={active} align="left" />
              <FighterPlate f={foe} align="right" />
            </div>

            {/* Status row */}
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex gap-1 items-center">{player.map(p => <BallChip key={p.id} f={p} />)}</div>
              <div className="flex gap-1.5 text-muted-foreground">
                {state.weather && <span className="px-2 py-0.5 rounded-full bg-secondary uppercase tracking-widest font-bold">☁ {state.weather}</span>}
                <span className="px-2 py-0.5 rounded-full bg-secondary uppercase tracking-widest font-bold">T{state.turn}</span>
              </div>
              <div className="flex gap-1 items-center">{enemy.map(e => <BallChip key={e.id} f={e} />)}</div>
            </div>

            {/* Arena */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-border h-[240px] sm:h-[320px] md:h-[360px] shadow-[var(--shadow-card)]"
              style={{ backgroundImage: `url(${arena})`, backgroundSize: "cover", backgroundPosition: "center" }}>
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

              {/* Foe (top-left, same size as player) */}
              <motion.img
                key={foe.id + (fx.side === "e" ? "h" : "")}
                src={foe.card.image_url}
                alt=""
                className={cn("absolute left-[8%] sm:left-[12%] top-3 sm:top-6 w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] scale-x-[-1]",
                  foe.fainted && "opacity-0 transition-opacity duration-700",
                  fx.side === "e" && fx.kind === "hit" && "animate-shake",
                  foe.defending && "ring-4 ring-blue-400/60 rounded-full")}
                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: foe.fainted ? 0 : 1 }}
              />

              {/* Player (bottom-right, same size as foe) */}
              <motion.img
                key={active.id + (fx.side === "p" ? "h" : "")}
                src={active.card.image_url}
                alt=""
                className={cn("absolute right-[8%] sm:right-[12%] bottom-2 sm:bottom-4 w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]",
                  active.fainted && "opacity-0 transition-opacity duration-700",
                  fx.side === "p" && fx.kind === "hit" && "animate-shake",
                  active.defending && "ring-4 ring-blue-400/60 rounded-full")}
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: active.fainted ? 0 : 1 }}
              />

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-white/70">
                VS
              </div>

              {/* Move animation overlay */}
              <MoveFx data={mfx} />
            </div>

            {/* Action panel */}
            {phase === "fight" && (
              <div className="grid lg:grid-cols-[1fr_300px] gap-3">
                <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-3">
                  {/* Tabs */}
                  <div className="flex gap-1 mb-3 bg-secondary rounded-xl p-1">
                    <TabBtn active={tab==="fight"} onClick={() => setTab("fight")} icon={<Swords className="h-4 w-4"/>}>Moves</TabBtn>
                    <TabBtn active={tab==="tactics"} onClick={() => setTab("tactics")} icon={<Shield className="h-4 w-4"/>}>Tactics</TabBtn>
                    <TabBtn active={tab==="items"} onClick={() => setTab("items")} icon={<FlaskConical className="h-4 w-4"/>}>Items</TabBtn>
                    <TabBtn active={tab==="switch"} onClick={() => setTab("switch")} icon={<Repeat className="h-4 w-4"/>}>Switch</TabBtn>
                  </div>

                  {tab === "fight" && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {active.card.moves.map((m, i) => {
                        const disabled = busy || active.movePP[i] <= 0;
                        const ppPct = (active.movePP[i] / m.pp) * 100;
                        return (
                          <motion.button
                            key={i}
                            disabled={disabled}
                            whileHover={disabled ? {} : { y: -2, scale: 1.015 }}
                            whileTap={disabled ? {} : { scale: 0.97 }}
                            onClick={() => act({ kind: "move", index: i })}
                            className="relative rounded-xl px-2 py-1.5 text-left overflow-hidden border border-white/15 shadow-[0_2px_0_rgba(0,0,0,0.35),0_4px_10px_rgba(0,0,0,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              background: `linear-gradient(160deg, ${TYPE_COLORS[m.type]} 0%, color-mix(in oklab, ${TYPE_COLORS[m.type]} 55%, black) 100%)`,
                            }}
                          >
                            <div className="pointer-events-none absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/15 blur-xl" />
                            <div className="flex items-center gap-1.5">
                              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center text-base border border-white/30">
                                {TYPE_ICON[m.type] ?? "✦"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-black capitalize text-[12px] leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] truncate">
                                  {m.name}
                                </div>
                                <div className="text-[8px] uppercase font-bold tracking-wider text-white/80 truncate">
                                  {m.type} · {m.category}
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-white/95">
                              <span className="flex items-center gap-0.5"><Swords className="h-2.5 w-2.5" />{m.power || "—"}</span>
                              <span className="flex items-center gap-0.5"><Crosshair className="h-2.5 w-2.5" />{m.accuracy}</span>
                              <span className="flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" />{active.movePP[i]}/{m.pp}</span>
                            </div>
                            <div className="mt-0.5 h-0.5 rounded-full bg-black/30 overflow-hidden">
                              <div className="h-full bg-white/80" style={{ width: `${ppPct}%` }} />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {tab === "tactics" && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground leading-snug">Spend a turn on a tactical stance instead of attacking. Read the matchup and pick your edge.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => act({ kind: "defend" })} disabled={busy}
                          className="rounded-xl border-2 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 p-3 text-left transition disabled:opacity-40">
                          <div className="flex items-center gap-1.5 font-black text-sm"><Shield className="h-4 w-4 text-blue-400"/>Brace</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Halve incoming damage this turn. Great vs heavy hits.</div>
                        </button>
                        <button onClick={() => act({ kind: "charge" })} disabled={busy || active.charging}
                          className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 p-3 text-left transition disabled:opacity-40">
                          <div className="flex items-center gap-1.5 font-black text-sm"><Zap className="h-4 w-4 text-amber-400"/>Charge</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Skip this turn — next move hits 1.5× and never misses.</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {tab === "items" && (() => {
                    // Categorize known battle-usable item keys
                    const SELF_HEAL = new Set(["potion", "super_potion"]);
                    const FOE_TARGET = new Set(["smoke_bomb","poison_vial","burn_flask","paralyze_spray","sleep_powder"]);
                    const SELF_BUFF  = new Set(["x_attack","x_defense","x_speed","ether","power_pill","focus_tonic","iron_barrier"]);
                    const HELD_ONLY  = new Set(["leftovers","life_orb","choice_band","choice_specs","choice_scarf","sitrus_berry","focus_sash"]);
                    const ownedKeys = Object.keys(inv).filter(k => (inv[k] ?? 0) > 0);
                    if (ownedKeys.length === 0) {
                      return (
                        <div className="text-sm text-muted-foreground py-3 text-center">
                          You have no items. Buy some from the <Link to="/items" className="underline text-primary">Item shop</Link>.
                        </div>
                      );
                    }
                    const renderRow = (key: string, accent: string, badge: string) => {
                      const def = catalog.find(c => c.key === key);
                      const name = def?.name ?? key;
                      const desc = def?.description ?? "";
                      const icon = def?.icon ?? "🎒";
                      const qty = inv[key] ?? 0;
                      return (
                        <button key={key}
                          onClick={() => act({ kind: "item", itemKey: key })}
                          disabled={busy || (SELF_HEAL.has(key) && active.fainted) || (SELF_BUFF.has(key) && active.fainted)}
                          className={cn("w-full text-left rounded-xl border-2 p-2.5 flex items-center gap-2.5 transition disabled:opacity-40 hover:border-primary", accent)}>
                          <div className="text-2xl flex-shrink-0">{icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs truncate">{name}</span>
                              <span className={cn("text-[8px] uppercase font-black px-1.5 py-0.5 rounded tracking-wider", badge)}>{SELF_HEAL.has(key) ? "Heal" : FOE_TARGET.has(key) ? "On Foe" : "Self"}</span>
                              <span className="ml-auto text-[10px] text-muted-foreground">x{qty}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground leading-snug">{desc}</div>
                          </div>
                        </button>
                      );
                    };
                    const heals = ownedKeys.filter(k => SELF_HEAL.has(k));
                    const buffs = ownedKeys.filter(k => SELF_BUFF.has(k));
                    const offensive = ownedKeys.filter(k => FOE_TARGET.has(k));
                    const reviveQty = inv["revive"] ?? 0;
                    const held = ownedKeys.filter(k => HELD_ONLY.has(k));
                    return (
                      <div className="space-y-2 max-h-72 overflow-auto pr-1">
                        {offensive.length > 0 && <div className="text-[9px] uppercase tracking-widest text-destructive/80 font-black pl-0.5">Throw at foe</div>}
                        {offensive.map(k => renderRow(k, "border-destructive/40 bg-destructive/5", "bg-destructive/30 text-destructive-foreground"))}
                        {buffs.length > 0 && <div className="text-[9px] uppercase tracking-widest text-amber-400/90 font-black pl-0.5 pt-1">Empower yourself</div>}
                        {buffs.map(k => renderRow(k, "border-amber-500/40 bg-amber-500/5", "bg-amber-500/30 text-amber-100"))}
                        {heals.length > 0 && <div className="text-[9px] uppercase tracking-widest text-emerald-400/90 font-black pl-0.5 pt-1">Restore</div>}
                        {heals.map(k => renderRow(k, "border-emerald-500/40 bg-emerald-500/5", "bg-emerald-500/30 text-emerald-100"))}
                        {reviveQty > 0 && (
                          <div className="rounded-xl border-2 border-fuchsia-500/40 bg-fuchsia-500/5 p-2.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="text-2xl">✨</div>
                              <div className="flex-1">
                                <div className="font-bold text-xs">Revive <span className="text-muted-foreground">x{reviveQty}</span></div>
                                <div className="text-[10px] text-muted-foreground">Pick a fainted ally to revive at 50% HP.</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {player.map((p, i) => (
                                <Button key={p.id} variant="outline" size="sm"
                                  disabled={busy || !p.fainted}
                                  onClick={() => act({ kind: "item", itemKey: "revive", targetIdx: i })}>
                                  ✨ {p.card.name.slice(0, 6)}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {held.length > 0 && (
                          <div className="pt-1 border-t border-border/40">
                            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-black pl-0.5 mb-1">Held items (equip from shop)</div>
                            {held.map(k => {
                              const def = catalog.find(c => c.key === k);
                              return (
                                <div key={k} className="rounded-lg border border-border/40 p-2 flex items-center gap-2 opacity-70 mb-1">
                                  <div className="text-lg">{def?.icon ?? "🎒"}</div>
                                  <div className="text-[11px] flex-1 truncate">{def?.name ?? k} <span className="text-muted-foreground">x{inv[k]}</span></div>
                                  <Link to="/items" className="text-[10px] underline text-primary">Equip</Link>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {tab === "switch" && (
                    <div className="grid grid-cols-3 gap-2">
                      {player.map((p, i) => (
                        <button key={p.id}
                          disabled={p.fainted || i === state.player.active || busy}
                          onClick={() => act({ kind: "switch", index: i })}
                          className="rounded-xl border-2 border-border p-2 hover:border-primary disabled:opacity-30 transition">
                          <img src={p.card.image_url} alt="" className="w-16 h-16 mx-auto object-contain"/>
                          <div className="font-bold text-xs capitalize truncate">{p.card.name}</div>
                          <div className="w-full h-1 bg-black/40 rounded-full mt-1 overflow-hidden">
                            <div className="h-full" style={{ width: `${(p.currentHp/p.maxHp)*100}%`, background: "oklch(0.7 0.18 145)" }}/>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-card/80 backdrop-blur border border-border p-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Battle log</div>
                  <div className="space-y-1 max-h-40 lg:max-h-72 overflow-auto pr-1 text-xs">
                    {state.log.slice(0, 20).map((l, i) => (
                      <div key={i} className={cn(i === 0 ? "text-foreground font-semibold" : "text-muted-foreground")}>{l}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {phase === "end" && state.winner && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-card rounded-2xl p-8 max-w-sm w-full text-center border border-border">
                <h2 className="text-4xl font-black mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{state.winner === "player" ? "Victory!" : "Defeat"}</h2>
                <p className="text-muted-foreground mb-2">+{coinsEarned} coins</p>
                {xpGained.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-4 space-y-0.5">
                    {xpGained.map(x => <div key={x.id}>{x.name} +{x.xp} XP</div>)}
                  </div>
                )}
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button onClick={() => nav({ to: "/campaign" })}>Campaign</Button>
                  <Button variant="outline" onClick={() => window.location.reload()}>Rematch</Button>
                  <Button variant="outline" onClick={() => nav({ to: "/dashboard" })}>Home</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function stripFighter(f: Fighter) {
  return {
    pokemon_id: f.card.pokemon_id, name: f.card.name, types: f.card.types,
    level: f.level, hp: f.currentHp, maxHp: f.maxHp,
  };
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg py-2 px-1 text-[11px] sm:text-xs font-bold transition",
        active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
      {icon}<span className="truncate">{children}</span>
    </button>
  );
}

function ItemBtn({ label, desc, icon, qty, onClick, disabled }: { label: string; desc: string; icon: string; qty: number; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full text-left rounded-xl border-2 border-border p-3 hover:border-primary disabled:opacity-40 disabled:hover:border-border flex items-center gap-3 transition">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <div className="font-bold text-sm">{label} <span className="text-xs text-muted-foreground font-normal">x{qty}</span></div>
        <div className="text-[10px] text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

function BallChip({ f }: { f: Fighter }) {
  return (
    <div className={cn("w-3 h-3 rounded-full border-2 border-white",
      f.fainted ? "bg-gray-700 border-gray-600" : f.currentHp / f.maxHp < 0.3 ? "bg-red-500" : f.currentHp / f.maxHp < 0.6 ? "bg-yellow-400" : "bg-green-400")}/>
  );
}

function FighterPlate({ f, align = "left" }: { f: Fighter; align?: "left" | "right" }) {
  const pct = (f.currentHp / f.maxHp) * 100;
  const hpColor = pct > 50 ? "oklch(0.78 0.18 145)" : pct > 20 ? "oklch(0.82 0.19 75)" : "oklch(0.68 0.24 25)";
  return (
    <div
      className={cn(
        "relative rounded-2xl p-2.5 sm:p-3 text-white overflow-hidden border border-white/10",
        "bg-[linear-gradient(135deg,rgba(15,15,30,0.85),rgba(30,30,55,0.7))] backdrop-blur-xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_-8px_rgba(0,0,0,0.6)]",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: `radial-gradient(circle at ${align === "right" ? "85%" : "15%"} 0%, ${hpColor}, transparent 60%)` }} />
      <div className={cn("relative flex items-center justify-between gap-2", align === "right" && "flex-row-reverse")}>
        <div className="min-w-0">
          <div className="font-black capitalize text-[13px] sm:text-sm leading-none truncate drop-shadow">{f.card.name}</div>
          <div className={cn("flex gap-1 mt-1.5", align === "right" && "justify-end")}>
            {f.card.types.map(t => (
              <span key={t} className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded text-white tracking-wider" style={{ background: TYPE_COLORS[t] }}>{t}</span>
            ))}
            {f.status && <span className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded bg-purple-700"><Heart className="h-2.5 w-2.5 inline mr-0.5"/>{f.status}</span>}
            {f.defending && <span className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded bg-blue-600">Brace</span>}
            {f.charging && <span className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-500 text-black">⚡Charge</span>}
            {(f.damageMult ?? 1) > 1 && <span className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-600">×{f.damageMult}</span>}
            {f.mustCrit && <span className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded bg-orange-600">CRIT!</span>}
            {(f.barrierTurns ?? 0) > 0 && <span className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded bg-cyan-600">🪨{f.barrierTurns}</span>}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg px-2 py-1 border border-white/15">
          <span className="text-[8px] uppercase opacity-70 tracking-widest leading-none">Lv</span>
          <span className="font-black text-sm leading-none tabular-nums">{f.level}</span>
        </div>
      </div>
      <div className="relative mt-2">
        <div className="h-2.5 sm:h-3 bg-black/55 rounded-full overflow-hidden border border-white/10 shadow-inner">
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            style={{
              background: `linear-gradient(90deg, ${hpColor}, color-mix(in oklab, ${hpColor} 60%, white))`,
              boxShadow: `0 0 12px ${hpColor}`,
            }}
          />
        </div>
        <div className={cn("mt-1 flex items-center gap-1 text-[10px] font-bold tabular-nums", align === "right" ? "justify-end" : "justify-start")}>
          <span className="opacity-70 uppercase tracking-widest text-[8px]">HP</span>
          <span>{f.currentHp}<span className="opacity-50">/{f.maxHp}</span></span>
        </div>
      </div>
    </div>
  );
}

const RANDOM_NAMES = [
  "AshK", "RedX", "BlueAce", "MistyM", "BrockSolid", "CynthiaQ", "SteelWill",
  "ShadowFox", "ThunderJay", "PixelPunk", "NovaStorm", "EmberKid", "FrostByte",
  "RogueSlash", "Volt9", "DragonHeir", "Skyler", "ZenMode", "Arcadia", "Rin",
  "Kaito", "Yuki", "MochaBean", "PhoenixZ", "Zeph", "Onyx7", "Lyra", "Kairos",
];
const RANKS = ["Rookie", "Trainer", "Ace", "Veteran", "Champion", "Elite"];

function makeOpponent(stage: number): { name: string; avatarId: number; rank: string } {
  const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] + Math.floor(Math.random() * 99);
  const avatarPool = [25, 6, 9, 3, 150, 144, 145, 146, 130, 149, 94, 65, 38, 26, 59, 134, 135, 136, 248, 282];
  const avatarId = avatarPool[Math.floor(Math.random() * avatarPool.length)];
  const rankIdx = Math.min(RANKS.length - 1, Math.floor((stage ?? 1) / 2));
  return { name, avatarId, rank: RANKS[rankIdx] };
}

function ProfileChip({
  name, avatarId, subtitle, accent, align = "left", turnActive,
}: {
  name: string; avatarId: number; subtitle: string;
  accent: "primary" | "destructive"; align?: "left" | "right"; turnActive?: boolean;
}) {
  const ringCls = accent === "primary" ? "ring-primary/60" : "ring-destructive/60";
  const dotCls = accent === "primary" ? "bg-primary" : "bg-destructive";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-white/10 p-1.5 sm:p-2 backdrop-blur-md transition",
        "bg-[linear-gradient(135deg,rgba(20,20,40,0.7),rgba(15,15,30,0.55))]",
        turnActive && cn("ring-2", ringCls),
        align === "right" && "flex-row-reverse text-right"
      )}
    >
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${avatarId}.png`}
            alt=""
            className="w-full h-full object-contain"
          />
        </div>
        {turnActive && (
          <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background animate-pulse", dotCls)} />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground leading-none">{subtitle}</div>
        <div className="font-black text-xs sm:text-sm leading-tight truncate">{name}</div>
      </div>
    </div>
  );
}

function Matchmaking({
  step, me, foe,
}: {
  step: number;
  me: { name: string; avatarId: number };
  foe: { name: string; avatarId: number; rank: string };
}) {
  const labels = ["Searching for opponent…", "Pinging arena…", "Opponent found!", "Entering arena…"];
  return (
    <div className="my-8 sm:my-14">
      <div className="text-center mb-6">
        <div className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground">Matchmaking</div>
        <h2 className="text-2xl sm:text-3xl font-black mt-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {labels[Math.min(step, labels.length - 1)]}
        </h2>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 max-w-2xl mx-auto">
        <MMSlot name={me.name} avatarId={me.avatarId} side="left" revealed />
        <div className="text-2xl sm:text-4xl font-black text-muted-foreground">VS</div>
        <MMSlot name={step >= 2 ? foe.name : "?????"} avatarId={step >= 2 ? foe.avatarId : 0} side="right" revealed={step >= 2} />
      </div>
      <div className="mt-6 max-w-md mx-auto">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (step + 1) * 28)}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <div className="text-[10px] uppercase tracking-widest text-center text-muted-foreground mt-2">
          {step >= 2 ? `${foe.rank} · Live match` : "Looking for a fair match…"}
        </div>
      </div>
    </div>
  );
}

function MMSlot({ name, avatarId, side, revealed }: { name: string; avatarId: number; side: "left" | "right"; revealed: boolean }) {
  return (
    <motion.div
      key={name + String(revealed)}
      initial={{ x: side === "left" ? -40 : 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn("flex flex-col items-center text-center", side === "right" && "order-1")}
    >
      <div className={cn(
        "relative w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 overflow-hidden",
        revealed ? "border-primary/60 shadow-[0_0_30px_-4px_hsl(var(--primary))]" : "border-border animate-pulse"
      )}>
        {revealed ? (
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${avatarId || 1}.png`}
            alt=""
            className="w-full h-full object-contain bg-secondary"
          />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center text-3xl sm:text-5xl font-black text-muted-foreground">?</div>
        )}
      </div>
      <div className="mt-2 font-black text-sm sm:text-base truncate max-w-[8rem] sm:max-w-[10rem]">{name}</div>
    </motion.div>
  );
}
