import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/AppHeader";
import { RedeemCodeForm } from "@/components/RedeemCodeForm";
import { Package, Swords, LayoutGrid, Coins, Trophy, Backpack, Dumbbell } from "lucide-react";

const sb = supabase as unknown as { from: (t: string) => any };

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PokéClash" }] }),
  component: Dash,
});

function Dash() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [counts, setCounts] = useState({ total: 0, unique: 0 });
  const [reload, setReload] = useState(0);
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
  }, [user, reload]);

  // Resolve the equipped cosmetic asset values (gradient string / emoji)
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
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <div
            className="rounded-2xl p-[3px] shrink-0"
            style={frameValue ? { background: frameValue } : { background: "transparent" }}
          >
            <img
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${profile.avatar_id ?? 25}.png`}
              alt=""
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-secondary p-1"
            />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm text-muted-foreground">Welcome back, trainer</div>
            <h1 className="text-2xl sm:text-3xl font-black truncate flex items-center gap-2">
              <span className="truncate">{profile.username}</span>
              {badgeValue && <span className="text-2xl sm:text-3xl">{badgeValue}</span>}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
          <Stat icon={<Coins className="h-5 w-5"/>} label="Coins" value={profile.coins} />
          <Stat icon={<LayoutGrid className="h-5 w-5"/>} label="Cards owned" value={counts.total} />
          <Stat icon={<LayoutGrid className="h-5 w-5"/>} label="Unique" value={counts.unique} />
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <ActionCard to="/shop" icon={<Package className="h-7 w-7"/>} title="Open packs" desc="Spend coins on packs to grow your roster." />
          <ActionCard to="/items" icon={<Backpack className="h-7 w-7"/>} title="Items" desc="Buy & equip held items for your Pokémon." />
          <ActionCard to="/loadout" icon={<LayoutGrid className="h-7 w-7"/>} title="Build loadout" desc="Pick 3 cards for battle." />
          <ActionCard to="/training" icon={<Dumbbell className="h-7 w-7"/>} title="Training" desc="Drill EVs, XP, & friendship — saved permanently." />
          <ActionCard to="/campaign" icon={<Trophy className="h-7 w-7"/>} title="Campaign" desc="Climb 12 trainer stages for big rewards." />
          <ActionCard to="/battle" icon={<Swords className="h-7 w-7"/>} title="Quick battle" desc="Random trainer · earn coins & XP." primary />
        </div>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-card border border-border p-5">
            <div className="text-xs uppercase text-muted-foreground">Battle record</div>
            <div className="text-2xl font-black">{profile.wins}W · {profile.losses}L</div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-5">
            <div className="text-xs uppercase text-muted-foreground">Campaign progress</div>
            <div className="text-2xl font-black">Stage {profile.campaign_progress}/12</div>
          </div>
        </div>

        <div className="mt-6">
          <RedeemCodeForm onRedeemed={() => setReload(r => r + 1)} />
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 sm:p-5">
      <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-[11px] sm:text-sm">{icon}<span className="truncate">{label}</span></div>
      <div className="text-xl sm:text-3xl font-black mt-1">{value}</div>
    </div>
  );
}

function ActionCard({ to, icon, title, desc, primary }: { to: string; icon: React.ReactNode; title: string; desc: string; primary?: boolean }) {
  return (
    <Link to={to} className={`group rounded-2xl p-6 border transition-all hover:-translate-y-1 ${primary ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
      <div className="mb-3">{icon}</div>
      <div className="font-bold text-lg">{title}</div>
      <div className={`text-sm ${primary ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{desc}</div>
    </Link>
  );
}