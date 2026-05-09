import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/AppHeader";
import { PokemonCardView } from "@/components/PokemonCard";
import type { PokemonCard } from "@/lib/pokemon";
import { rowToCard, type CardRow } from "@/lib/card-mapper";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/gallery")({
  head: () => ({ meta: [{ title: "Gallery — PokéClash" }] }),
  component: Gallery,
});

const RARITIES = ["all", "common", "rare", "epic", "legendary"] as const;

const SELL_PRICE: Record<string, number> = {
  common: 25,
  rare: 100,
  epic: 300,
  legendary: 800,
};

function Gallery() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [cards, setCards] = useState<(PokemonCard & { id: string })[]>([]);
  const [filter, setFilter] = useState<(typeof RARITIES)[number]>("all");
  const [pending, setPending] = useState<(PokemonCard & { id: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  const load = () => {
    if (!user) return;
    supabase.from("cards").select("*").eq("owner_id", user.id).order("obtained_at", { ascending: false }).then(({ data }) => {
      setCards(((data as CardRow[] | null) ?? []).map(rowToCard));
    });
  };
  useEffect(load, [user]);

  const filtered = filter === "all" ? cards : cards.filter(c => c.rarity === filter);

  const sellCard = async () => {
    if (!pending || !user || !profile || busy) return;
    setBusy(true);
    const price = SELL_PRICE[pending.rarity] ?? 25;
    const { error: dErr } = await supabase.from("cards").delete().eq("id", pending.id).eq("owner_id", user.id);
    if (dErr) { setBusy(false); toast.error(dErr.message); return; }
    const { error: pErr } = await supabase.from("profiles").update({ coins: profile.coins + price }).eq("id", user.id);
    if (pErr) { setBusy(false); toast.error(pErr.message); return; }
    // Also remove this card from any loadout it's in
    const { data: lo } = await supabase.from("loadouts").select("card_ids").eq("user_id", user.id).maybeSingle();
    if (lo?.card_ids?.includes(pending.id)) {
      await supabase.from("loadouts").update({ card_ids: lo.card_ids.filter((id: string) => id !== pending.id) }).eq("user_id", user.id);
    }
    toast.success(`Sold ${pending.name} for ${price} coins`);
    setPending(null);
    setBusy(false);
    await refreshProfile();
    load();
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black">Card gallery</h1>
            <p className="text-muted-foreground">{cards.length} cards · {new Set(cards.map(c => c.pokemon_id)).size} unique · tap a card to sell</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {RARITIES.map(r => (
              <button key={r} onClick={() => setFilter(r)}
                className={`px-3 py-1.5 rounded-full text-xs uppercase font-bold border ${filter === r ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No cards yet. Open a pack from the shop!</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
            {filtered.map(c => (
              <div key={c.id} className="flex flex-col items-center gap-2">
                <PokemonCardView card={c} size="sm" onClick={() => setPending(c)} />
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-40 text-xs font-bold"
                  onClick={() => setPending(c)}
                >
                  Sell · {SELL_PRICE[c.rarity] ?? 25} <Coins className="h-3 w-3 ml-1 text-[var(--rarity-legendary)]" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="capitalize">Sell {pending?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll receive <span className="font-bold text-[var(--rarity-legendary)]">{pending ? SELL_PRICE[pending.rarity] ?? 25 : 0} coins</span>.
              This card will be permanently removed from your collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={sellCard} disabled={busy}>
              {busy ? "Selling…" : "Sell"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
