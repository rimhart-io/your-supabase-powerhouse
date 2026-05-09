import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  Swords, Package, Backpack, LayoutGrid, Dumbbell, Trophy, LogOut, Sparkles, Coins,
} from "lucide-react";
import gameBg from "@/assets/game-bg.png";

const sb = supabase as unknown as { from: (t: string) => any };

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Home — PokéClash" }] }),
  component: Dash,
});

function Dash() {
  const { user, profile, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [counts, setCounts] = useState({ total: 0, unique: 0 });
  const [frameValue, setFrameValue] = useState<string | null>(null);
  const [badgeValue, setBadgeValue] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
    if (!loading && user && !profile?.username) nav({ to: "/onboarding" });
  }, [user, profile, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("cards").select("pokemon_id").eq("owner_id", user.id).then(({ data }) => {
      if (!data) return;
      setCounts({ total: data.length, unique: new Set(data.map(d => d.pokemon_id)).size });
    });
  }, [user]);

  useEffect(() => {
    const keys = [profile?.equipped_frame, profile?.equipped_badge].filter(Boolean) as string[];
    if (keys.length === 0) { setFrameValue(null); setBadgeValue(null); return; }
    sb.from("cosmetics_catalog").select("key,type,value").in("key", keys).then(({ data }: { data: { key: string; type: string; value: string }[] | null }) => {
      const f = data?.find(d => d.type === "frame" && d.key === profile?.equipped_frame);
      const b = data?.find(d => d.type === "badge" && d.key === profile?.equipped_badge);
      setFrameValue(f?.value ?? null);
      setBadgeValue(b?.value ?? null);
    });
  }, [profile?.equipped_frame, profile?.equipped_badge]);

  if (!user || !profile) return null;

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        backgroundImage: `url(${gameBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Subtle dark vignette for legibility */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/10 via-transparent to-black/40" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* TOP BAR */}
        <div className="px-3 pt-3 sm:px-6 sm:pt-5">
          <div className="flex items-start justify-between gap-3 max-w-5xl mx-auto w-full">
            {/* Profile pill — top left */}
            <Link to="/gallery" className="game-glass-dark rounded-2xl pl-1.5 pr-3 py-1.5 flex items-center gap-2 max-w-[60vw]">
              <div
                className="rounded-xl p-[2px] shrink-0"
                style={frameValue ? { background: frameValue } : { background: "rgba(255,255,255,0.25)" }}
              >
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${profile.avatar_id ?? 25}.png`}
                  alt=""
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-black/30 p-0.5"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-white/70 leading-tight">Trainer</div>
                <div className="font-black text-white truncate flex items-center gap-1 text-sm sm:text-base">
                  <span className="truncate">{profile.username}</span>
                  {badgeValue && <span>{badgeValue}</span>}
                </div>
              </div>
            </Link>

            {/* Coins — top right */}
            <Link to="/shop" className="game-glass-dark rounded-2xl pl-1.5 pr-3 py-1.5 flex items-center gap-2 shrink-0">
              <span className="h-9 w-9 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 grid place-items-center shadow-inner ring-2 ring-amber-200/50">
                <Coins className="h-5 w-5 text-amber-900" />
              </span>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/70 leading-tight">Coins</div>
                <div className="font-black text-white text-sm sm:text-base leading-tight">{profile.coins}</div>
              </div>
            </Link>
          </div>

          {/* Brand title */}
          <div className="mt-4 sm:mt-6 flex justify-center">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 game-glass-dark rounded-full px-3 py-1 text-white/90 text-[10px] uppercase tracking-[0.25em]">
                <Sparkles className="h-3 w-3" /> Trainer World
              </div>
              <h1 className="mt-2 text-4xl sm:text-6xl font-black text-white text-stroke tracking-wide">
                POKÉCLASH
              </h1>
            </div>
          </div>
        </div>

        {/* Spacer pushes buttons to bottom */}
        <div className="flex-1" />

        {/* MID — quick stats floating */}
        <div className="px-4 sm:px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-3 gap-2 mb-4">
            <MiniStat label="Cards" value={counts.total} />
            <MiniStat label="Unique" value={counts.unique} />
            <MiniStat label="W · L" value={`${profile.wins}·${profile.losses}`} />
          </div>
        </div>

        {/* BOTTOM ACTION CLUSTER */}
        <div className="px-3 pb-6 sm:px-6 sm:pb-10">
          <div className="max-w-5xl mx-auto">
            {/* Hero battle button */}
            <Link to="/battle" className="game-btn game-btn-red w-full py-4 text-lg sm:text-xl mb-3">
              <div className="flex items-center gap-2">
                <Swords className="h-6 w-6" />
                <span>QUICK BATTLE</span>
              </div>
              <span className="text-xs font-semibold opacity-90">Random trainer · earn coins</span>
            </Link>

            {/* Side-by-side action grid: 3 left, 3 right on mobile -> 6 cols on desktop */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              <ActionBtn to="/training" color="green" icon={<Dumbbell className="h-6 w-6" />} label="Training" />
              <ActionBtn to="/campaign" color="amber" icon={<Trophy className="h-6 w-6" />} label="Campaign" />
              <ActionBtn to="/loadout" color="cyan" icon={<LayoutGrid className="h-6 w-6" />} label="Loadout" />
              <ActionBtn to="/shop" color="violet" icon={<Package className="h-6 w-6" />} label="Shop" />
              <ActionBtn to="/items" color="blue" icon={<Backpack className="h-6 w-6" />} label="Items" />
              <ActionBtn to="/gallery" color="red" icon={<LayoutGrid className="h-6 w-6" />} label="Gallery" />
            </div>

            {/* Sign out — small, bottom */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={async () => { await signOut(); nav({ to: "/" }); }}
                className="game-glass-dark rounded-full px-3 py-1.5 text-white/80 text-xs font-semibold flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="game-glass-dark rounded-xl px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/70">{label}</div>
      <div className="font-black text-white text-base sm:text-lg leading-tight">{value}</div>
    </div>
  );
}

function ActionBtn({ to, color, icon, label }: { to: string; color: "red" | "blue" | "green" | "amber" | "violet" | "cyan"; icon: React.ReactNode; label: string }) {
  const cls = `game-btn game-btn-${color} w-full text-xs sm:text-sm`;
  return (
    <Link to={to} className={cls}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
