import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { GameTopBar } from "@/components/GameTopBar";
import { PageBackground } from "@/components/PageBackground";
import bgShop from "@/assets/bg-shop.jpg";
import { Button } from "@/components/ui/button";
import { Coins, Gem } from "lucide-react";
import { CosmeticsSection } from "@/components/CosmeticsSection";
import { RedeemCodeForm } from "@/components/RedeemCodeForm";
import packPremium from "@/assets/pack-premium.webp";
import packLegendary from "@/assets/pack-legendary.webp";

const EVOLUTION_STONE_PRICE = 40000;
const EVOLUTION_STONE_KEY = "evolution_stone";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop — PokéClash" }] }),
  component: Shop,
});

const PACKS = [
  { type: "premium", name: "Premium Pack", price: 250, desc: "3 cards · better rares", img: packPremium, glow: "oklch(0.85 0.20 330)" },
  { type: "legendary", name: "Legendary Pack", price: 500, desc: "3 cards · epics + legendaries", img: packLegendary, glow: "oklch(0.90 0.20 60)" },
];

function Shop() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [stoneQty, setStoneQty] = useState(0);
  const [buyingStone, setBuyingStone] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("inventory").select("qty").eq("user_id", user.id).eq("item_key", EVOLUTION_STONE_KEY).maybeSingle()
      .then(({ data }) => setStoneQty((data as { qty: number } | null)?.qty ?? 0));
  }, [user, profile?.coins]);

  const buyStone = async () => {
    if (!user || !profile || buyingStone) return;
    if (profile.coins < EVOLUTION_STONE_PRICE) { toast.error("Not enough coins"); return; }
    setBuyingStone(true);
    const { error: pErr } = await supabase.from("profiles").update({ coins: profile.coins - EVOLUTION_STONE_PRICE }).eq("id", user.id);
    if (pErr) { setBuyingStone(false); toast.error(pErr.message); return; }
    const cur = stoneQty;
    const upErr = cur > 0
      ? (await supabase.from("inventory").update({ qty: cur + 1 }).eq("user_id", user.id).eq("item_key", EVOLUTION_STONE_KEY)).error
      : (await supabase.from("inventory").insert({ user_id: user.id, item_key: EVOLUTION_STONE_KEY, qty: 1 })).error;
    if (upErr) { toast.error(upErr.message); }
    await refreshProfile();
    setStoneQty(cur + 1);
    setBuyingStone(false);
    toast.success("Evolution Stone acquired!");
  };

  const buy = async (type: string, price: number) => {
    if (!user || !profile) return;
    if (profile.coins < price) { toast.error("Not enough coins"); return; }
    const { error } = await supabase.from("profiles").update({ coins: profile.coins - price }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    nav({ to: "/pack/open", search: { type } });
  };

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen">
      <PageBackground src={bgShop} dim={0.65} />
      <GameTopBar title="Shop" />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-black">Pack shop</h1>
            <p className="text-muted-foreground">Spend coins to expand your roster.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary font-bold">
            <Coins className="h-4 w-4 text-[var(--rarity-legendary)]" /> {profile.coins}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PACKS.map(p => (
            <div key={p.type} className="rounded-2xl border border-border overflow-hidden bg-card flex flex-col">
              <div className="h-56 relative flex items-center justify-center bg-gradient-to-b from-background/40 to-background overflow-hidden">
                <div className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 60%, ${p.glow}, transparent 65%)` }} />
                <img src={p.img} alt={`${p.name} art`} loading="lazy" className="relative h-52 w-auto object-contain drop-shadow-2xl transition-transform duration-300 hover:-translate-y-1 hover:scale-105" />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="font-black text-lg">{p.name}</div>
                <div className="text-sm text-muted-foreground mb-4">{p.desc}</div>
                <Button
                  className="mt-auto"
                  disabled={profile.coins < p.price}
                  onClick={() => buy(p.type, p.price)}
                >
                  Buy · {p.price} <Coins className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-2xl overflow-hidden border border-amber-500/40 bg-card relative">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle at 20% 30%, oklch(0.75 0.2 60), transparent 60%), radial-gradient(circle at 80% 70%, oklch(0.6 0.25 320), transparent 60%)" }} />
          <div className="relative p-6 flex items-center gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500 text-black shadow-[0_0_30px_rgba(255,150,40,0.5)]">
              <Gem className="h-10 w-10" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black">Evolution Stone</h2>
                {stoneQty > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary font-bold">x{stoneQty}</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                A legendary catalyst. Use it in Training to instantly max out any Pokémon's EVs, level, and friendship.
              </p>
            </div>
            <Button
              className="bg-gradient-to-r from-amber-500 to-rose-500 text-black font-black hover:from-amber-400 hover:to-rose-400"
              onClick={buyStone}
              disabled={buyingStone || profile.coins < EVOLUTION_STONE_PRICE}
            >
              Buy · {EVOLUTION_STONE_PRICE.toLocaleString()} <Coins className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </section>

        <section className="mt-6 max-w-xl">
          <RedeemCodeForm />
        </section>

        <div className="mt-10">
          <CosmeticsSection />
        </div>
      </main>
    </div>
  );
}